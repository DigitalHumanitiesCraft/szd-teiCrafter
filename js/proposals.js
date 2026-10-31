// Proposals of an outside producer such as an LLM agent (ADR-015, ADR-016):
// read from a proposal file, anchored in the open document, shown over their
// passages without changing the text, and decided one by one. Nothing is
// written for a proposal until a person accepts it; accepting writes the
// markup with the producer and the review named in @resp. Nothing here knows
// an edition: the actions and the declarations come from the caller.

import { Decoration, EditorView, StateEffect, StateField } from "../vendor/codemirror/codemirror.js";
import { lineBreakPattern } from "./actions.js";

/**
 * @typedef {{ kind: string, id?: string, label?: string, source?: string }} Basis
 * @typedef {{ id: string, from: number, to: number, element: string, attributes: Record<string, string>, text: string, basis: Basis[], doubt: string }} Proposal
 * @typedef {{ id: string, xml: string }} Declaration a respStmt the markup points to
 */

/** Replaces the proposals of the document. */
export const setProposals = StateEffect.define();
/** Drops one proposal by its id, as a rejection does. */
export const dropProposal = StateEffect.define();

/**
 * The pending proposals of the open document. Positions follow the edits; an
 * edit inside or across a passage withdraws its proposal, which no longer
 * describes the text, and so does accepting it, which rewrites the passage.
 */
export const proposalField = StateField.define({
  create: () => /** @type {Proposal[]} */ ([]),
  update(list, tr) {
    let next = list;
    if (tr.docChanged) {
      next = list.flatMap((p) => {
        let touched = false;
        tr.changes.iterChangedRanges((fromA, toA) => {
          if (fromA < p.to && toA > p.from) touched = true;
        });
        return touched ? [] : [{ ...p, from: tr.changes.mapPos(p.from, 1), to: tr.changes.mapPos(p.to, -1) }];
      });
    }
    for (const e of tr.effects) {
      if (e.is(setProposals)) next = /** @type {Proposal[]} */ (e.value);
      if (e.is(dropProposal)) next = next.filter((p) => p.id !== e.value);
    }
    return next;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (list) =>
      Decoration.set(
        list.map((p) => Decoration.mark({ class: "cm-proposal", attributes: { "data-proposal": p.id } }).range(p.from, p.to)),
        true,
      ),
    ),
});

/** A proposal may name its producer's state, never a review: that is the person's act. */
const PENDING = new Set(["proposed", "proposed-open", "propose", "needs_expert"]);

/**
 * Why a raw proposal cannot be used, or "".
 * @param {any} raw
 * @param {{ element: string, attributes: { name: string }[] }[]} actions
 */
function refusal(raw, actions) {
  if (!raw || typeof raw !== "object") return "kein Eintrag";
  if (typeof raw.text !== "string" || !raw.text.trim()) return "ohne Text";
  const state = raw.verdict ?? raw.status;
  if (state !== undefined && !PENDING.has(state)) return `Zustand „${state}“: Annehmen ist der Prüfung vorbehalten`;
  if ("reviewer" in raw || "review" in raw || "accepted" in raw) return "enthält eine Prüfung, die der Prüfung vorbehalten ist";
  const action = actions.find((a) => a.element === raw.element);
  if (!action) return `kein Element mit Aktion: ${raw.element}`;
  const attrs = raw.attributes ?? {};
  if (typeof attrs !== "object") return "Attribute unlesbar";
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "resp") return "@resp setzt der Editor beim Annehmen";
    if (!action.attributes.some((a) => a.name === name)) return `@${name} gehört nicht zur Aktion für <${raw.element}>`;
    if (typeof value !== "string") return `@${name} ist kein Text`;
  }
  return "";
}

/**
 * Where a proposal stands in the text: at its offsets when the text there is
 * still the proposed one, else at the occurrence whose context matches best,
 * else at its numbered occurrence. A passage inside a tag, outside the body or
 * across markup other than line breaks cannot be marked and is not placed.
 * @param {any} raw @param {string} text with line breaks as \n
 * @param {RegExp} crossable markup a passage may span
 * @returns {{ from: number, to: number } | null}
 */
function anchor(raw, text, crossable) {
  const lf = (/** @type {unknown} */ s) => (typeof s === "string" ? s.replace(/\r\n?/g, "\n") : "");
  const wanted = lf(raw.text);
  const offsets = raw.offset ?? raw.range;
  let from = -1;
  if (offsets && text.slice(offsets.from, offsets.from + wanted.length) === wanted) from = offsets.from;
  else {
    const found = [];
    for (let i = text.indexOf(wanted); i >= 0; i = text.indexOf(wanted, i + 1)) found.push(i);
    const before = lf(raw.context?.before);
    const after = lf(raw.context?.after);
    const score = (/** @type {number} */ i) =>
      Number(!!before && text.slice(Math.max(0, i - before.length), i) === before) + Number(!!after && text.slice(i + wanted.length, i + wanted.length + after.length) === after);
    const best = Math.max(0, ...found.map(score));
    const candidates = best ? found.filter((i) => score(i) === best) : found;
    const nth = Number.isInteger(raw.occurrence) ? raw.occurrence - 1 : 0;
    from = candidates.length === 1 ? candidates[0] : best ? candidates[0] : found[nth] ?? -1;
  }
  if (from < 0) return null;
  const to = from + wanted.length;
  const body = text.indexOf("<body");
  if (body < 0 || from < body) return null;
  if (/[<>]/.test(wanted.replace(crossable, ""))) return null;
  const head = text.slice(Math.max(0, from - 4000), from);
  if (head.lastIndexOf("<") > head.lastIndexOf(">")) return null;
  return { from, to };
}

/**
 * Reads a proposal file for the open document.
 * @param {any} json the parsed file
 * @param {string} text the document with line breaks as \n, whose positions are the editor's
 * @param {{ documentId: string, actions: { element: string, attributes: { name: string }[] }[], lineBreak?: string }} options
 * @returns {{ placed: Proposal[], stale: { id: string, text: string }[], refused: { id: string, why: string }[], producer: string }}
 */
export function readProposals(json, text, { documentId, actions, lineBreak = "lb" }) {
  if (!json || typeof json !== "object" || !Array.isArray(json.proposals)) throw new Error("Das ist keine Vorschlagsdatei: Es fehlt die Liste „proposals“.");
  if (json.document && documentId && json.document !== documentId) throw new Error(`Die Vorschläge gehören zu ${json.document}, geöffnet ist ${documentId}.`);
  const crossable = lineBreakPattern(lineBreak);
  /** @type {Proposal[]} */
  const placed = [];
  const stale = [];
  const refused = [];
  for (const [i, raw] of json.proposals.entries()) {
    const id = String(raw?.id ?? `#${i + 1}`);
    if (raw?.verdict === "reject") continue;
    const why = refusal(raw, actions);
    if (why) {
      refused.push({ id, why });
      continue;
    }
    const at = anchor(raw, text, crossable);
    // Two proposals on overlapping passages cannot both become markup.
    if (!at || placed.some((p) => p.from < at.to && at.from < p.to)) {
      stale.push({ id, text: String(raw.text) });
      continue;
    }
    placed.push({
      id,
      ...at,
      element: raw.element,
      attributes: { ...(raw.attributes ?? {}) },
      text: text.slice(at.from, at.to),
      basis: Array.isArray(raw.basis) ? raw.basis.filter((b) => b && typeof b === "object") : [],
      doubt: typeof raw.doubt === "string" ? raw.doubt : "",
    });
  }
  const producer = json.producer ?? json.run ?? {};
  return {
    placed: placed.sort((a, b) => a.from - b.from),
    stale,
    refused,
    producer: [producer.kind, producer.model].filter((s) => typeof s === "string" && s).join(", "),
  };
}

/**
 * The edits that declare the given respStmt elements in titleStmt where the
 * document lacks them, each on a line of its own before </titleStmt>.
 * @param {string} text with line breaks as \n
 * @param {Declaration[]} declarations
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function declarationEdits(text, declarations) {
  const missing = declarations.filter((d) => !new RegExp(`xml:id\\s*=\\s*["']${d.id.replace(/[.]/g, "\\.")}["']`).test(text));
  const end = text.indexOf("</titleStmt>");
  if (!missing.length || end < 0) return [];
  const lineStart = text.lastIndexOf("\n", end) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
  const lines = missing.map((d) => `${indent}  ${d.xml}\n`).join("");
  if (/^[ \t]*$/.test(text.slice(lineStart, end))) return [{ from: lineStart, to: lineStart, insert: lines }];
  return [{ from: end, to: end, insert: `\n${lines}${indent}` }];
}
