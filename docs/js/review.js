// Review of outside proposals (ADR-016): loading a proposal file for the open
// document, the card of a proposal with its basis and doubt, and the
// decisions accept, change and reject. Each decision goes into a review log
// the person can save beside the proposal file; the proposals themselves live
// in the editor state (js/proposals.js).

import { dropProposal, proposalField, readProposals, setProposals } from "./proposals.js";
import { $ } from "./ui.js";

/**
 * @typedef {import("./proposals.js").Proposal} Proposal
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   documentId: () => string,
 *   actions: () => import("./actions.js").LoadedAction[],
 *   lineBreak: string,
 *   describe: (p: Proposal) => Promise<{ title: string, detail: string }>,
 *   accept: (p: Proposal) => boolean,
 *   change: (p: Proposal) => void,
 *   report: (state: "" | "ok" | "error", message: string) => void,
 *   onDecided: () => void,
 *   next: () => void,
 * }} options `accept` writes the markup and says whether it could, `change`
 * opens the action's dialog on the passage, `onDecided` refreshes counters and
 * state, `next` moves on to the next proposal
 */
export function createReview({ editor, documentId, actions, lineBreak, describe, accept, change, report, onDecided, next }) {
  const card = $("proposal-card");
  /** @type {Proposal | null} */
  let shown = null;
  let generation = 0;
  let loaded = { file: "", producer: "", document: "" };
  /** @type {{ id: string, decision: "accepted" | "rejected" | "edited", at: string }[]} */
  let log = [];
  /** Ids pending after the last look, to notice proposals an edit withdrew. */
  let known = new Set();

  const pending = () => /** @type {Proposal[]} */ (editor.state.field(proposalField, false) ?? []);
  const byId = (/** @type {string} */ id) => pending().find((p) => p.id === id) ?? null;

  /** @param {string} id @param {"accepted" | "rejected" | "edited"} decision */
  function record(id, decision) {
    log.push({ id, decision, at: new Date().toISOString() });
    known.delete(id);
    $("proposals-log").hidden = false;
  }

  /** @param {File} file */
  async function load(file) {
    let json;
    try {
      json = JSON.parse(await file.text());
    } catch {
      report("error", `${file.name} ist keine lesbare JSON-Datei.`);
      return;
    }
    try {
      const read = readProposals(json, editor.docText(), { documentId: documentId(), actions: actions(), lineBreak });
      editor.dispatch({ effects: setProposals.of(read.placed) });
      loaded = { file: file.name, producer: read.producer, document: documentId() };
      log = [];
      known = new Set(read.placed.map((p) => p.id));
      $("proposals-log").hidden = true;
      const notes = [read.placed.length === 1 ? "1 Vorschlag geladen" : `${read.placed.length} Vorschläge geladen`];
      if (read.stale.length) notes.push(`${read.stale.length} nicht mehr an ihrer Stelle und ausgelassen`);
      if (read.refused.length) notes.push(`${read.refused.length} abgewiesen, etwa ${read.refused[0].id}: ${read.refused[0].why}`);
      report(read.placed.length ? "ok" : "error", `${notes.join(", ")}. F8 führt durch die Vorschläge und offenen Stellen.`);
      onDecided();
    } catch (err) {
      report("error", err instanceof Error ? err.message : String(err));
    }
  }

  /** @param {Proposal} p @param {boolean} withFocus */
  async function open(p, withFocus) {
    const asked = ++generation;
    const facts = await describe(p);
    if (asked !== generation) return;
    shown = p;
    $("proposal-card-label").textContent = `KI-Vorschlag, ungeprüft${loaded.producer ? ` (${loaded.producer})` : ""}`;
    $("proposal-card-title").textContent = facts.title;
    $("proposal-card-detail").textContent = facts.detail;
    $("proposal-card-detail").toggleAttribute("data-unlinked", !p.attributes.ref && p.element !== "date");
    const list = $("proposal-card-basis");
    list.replaceChildren(
      ...p.basis.map((b) => {
        const li = document.createElement("li");
        const words = [b.label, b.id].filter(Boolean).join(", ");
        // The basis comes from the producer's file, so a link is offered only
        // for a web address and its text is never read as markup.
        if (typeof b.source === "string" && /^https?:\/\//.test(b.source)) {
          const a = document.createElement("a");
          a.href = b.source;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = words || b.source;
          li.append(`${b.kind}: `, a);
        } else li.textContent = `${b.kind}${words ? `: ${words}` : ""}`;
        return li;
      }),
    );
    list.hidden = !p.basis.length;
    $("proposal-card-doubt").textContent = p.doubt ? `Zweifel: ${p.doubt}` : "";
    $("proposal-card-doubt").hidden = !p.doubt;
    card.hidden = false;
    const at = editor.coordsAt(p.from);
    if (!at) {
      card.hidden = true;
      return;
    }
    const width = card.offsetWidth || 300;
    card.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
    const below = at.bottom + 8;
    card.style.top = `${below + card.offsetHeight < window.innerHeight - 8 ? below : Math.max(8, at.top - card.offsetHeight - 8)}px`;
    if (withFocus) $("proposal-accept").focus();
  }

  function close(refocus = false) {
    generation++;
    shown = null;
    card.hidden = true;
    if (refocus) editor.focus();
  }

  /** The shown proposal as it stands now, or null when an edit withdrew it meanwhile. */
  function current() {
    const p = shown && byId(shown.id);
    if (!p) {
      close(true);
      report("", "Der Vorschlag ist durch eine Bearbeitung entfallen.");
    }
    return p;
  }

  $("proposal-accept").addEventListener("click", () => {
    const p = current();
    if (!p) return;
    // The edit that accepts withdraws the proposal as well; it must not be
    // logged as edited first.
    known.delete(p.id);
    if (!accept(p)) {
      known.add(p.id);
      report("error", "Der Vorschlag passt nicht mehr zum Text und wurde nicht übernommen.");
      return;
    }
    record(p.id, "accepted");
    close(true);
    onDecided();
    next();
  });
  const reject = () => {
    const p = current();
    if (!p) return;
    editor.dispatch({ effects: dropProposal.of(p.id) });
    record(p.id, "rejected");
    close(true);
    onDecided();
    next();
  };
  $("proposal-reject").addEventListener("click", reject);
  $("proposal-change").addEventListener("click", () => {
    const p = current();
    if (!p) return;
    close();
    // What the dialog writes is the person's own annotation; the edit then
    // withdraws the proposal and the log records it as edited.
    change(p);
  });
  card.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Delete") {
      e.preventDefault();
      reject();
    }
  });

  editor.view.contentDOM.addEventListener("click", (/** @type {MouseEvent} */ e) => {
    const el = /** @type {HTMLElement} */ (e.target).closest?.("[data-proposal]");
    const p = el && byId(el.getAttribute("data-proposal") ?? "");
    if (p) open(p, false);
  });

  $("proposals-button").addEventListener("click", () => $("proposals-file").click());
  $("proposals-file").addEventListener("change", () => {
    const input = /** @type {HTMLInputElement} */ ($("proposals-file"));
    const file = input.files?.[0];
    input.value = "";
    if (file) load(file);
  });
  $("proposals-log").addEventListener("click", () => {
    const text = `${JSON.stringify({ document: loaded.document, proposals: loaded.file, producer: loaded.producer, decisions: log }, null, 2)}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${loaded.document || "dokument"}.pruefung.json`;
    a.click();
    // Revoked later, since some browsers read the URL after the click returns.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  });

  return {
    open,
    close,
    pending,
    /** Notes proposals an edit withdrew; called after each change of the text. */
    sync() {
      const now = new Set(pending().map((p) => p.id));
      for (const id of known) if (!now.has(id)) record(id, "edited");
      known = now;
      if (shown && !now.has(shown.id)) close();
    },
    /** Forgets the proposals of a document that is no longer open. */
    reset() {
      close();
      loaded = { file: "", producer: "", document: "" };
      log = [];
      known = new Set();
      $("proposals-log").hidden = true;
    },
  };
}
