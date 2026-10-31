// The annotation actions as data: a registry file (data/actions.json in this
// derivation) names per action the element it writes, its attributes, the
// dialog it opens, the views that offer it and the HTR marker it resolves.
// This module reads, checks and writes that registry and holds no edition
// knowledge; patterns arrive as strings and are compiled here.

/**
 * @typedef {{ name: string, required?: boolean, values?: string[] }} ActionAttribute
 * @typedef {{ kind: string, label: string, marker: string }} Resolves
 * @typedef {{
 *   id: string, label: string, key: string, icon: string | null, element: string,
 *   attributes: ActionAttribute[], dialog: "none" | "person" | "organisation" | "place" | "date",
 *   lookup: { register?: boolean, gnd?: string } | null, views: ("xml" | "text")[],
 *   suggest: string | null, resolves: Resolves | null, enabled: boolean,
 * }} Action
 * @typedef {{ $comment?: string, actions: Action[] }} Registry
 * @typedef {Action & { refused: string }} LoadedAction an action with the reason it is not offered, "" when it is
 */

const NAME = /^[A-Za-z_][\w.-]*$/;
const DIALOGS = ["none", "person", "organisation", "place", "date"];
const VIEWS = ["xml", "text"];

/**
 * Why an action cannot be used as written, or "". The registry is edited by
 * hand and in the settings view, so every value that later enters markup or a
 * regular expression is checked here, at the trust boundary.
 * @param {any} a
 */
export function actionProblem(a) {
  if (!a || typeof a !== "object") return "Der Eintrag ist kein Objekt.";
  if (typeof a.id !== "string" || !/^[a-z][\w-]*$/.test(a.id)) return "Die Kennung (id) fehlt oder enthält unzulässige Zeichen.";
  if (typeof a.label !== "string" || !a.label.trim()) return "Die Bezeichnung (label) fehlt.";
  if (typeof a.key !== "string" || !/^[a-z]$/.test(a.key)) return "Die Taste (key) muss ein einzelner Kleinbuchstabe sein.";
  if (typeof a.element !== "string" || !NAME.test(a.element)) return "Der Elementname fehlt oder ist kein XML-Name.";
  if (!Array.isArray(a.attributes)) return "Die Attributliste (attributes) fehlt.";
  for (const attr of a.attributes) {
    if (typeof attr?.name !== "string" || !NAME.test(attr.name)) return "Ein Attributname ist kein XML-Name.";
    if (attr.values !== undefined && !(Array.isArray(attr.values) && attr.values.every((v) => typeof v === "string" && !/[<>&"]/.test(v)))) {
      return `Die Werte von @${attr.name} sind keine Liste einfacher Zeichenketten.`;
    }
  }
  if (!DIALOGS.includes(a.dialog)) return `Der Dialog „${a.dialog}“ ist unbekannt, erlaubt sind ${DIALOGS.join(", ")}.`;
  if (!Array.isArray(a.views) || !a.views.length || !a.views.every((v) => VIEWS.includes(v))) return "Die Ansichten (views) müssen xml, text oder beide sein.";
  if (typeof a.enabled !== "boolean") return "Der Schalter (enabled) muss true oder false sein.";
  if (a.suggest !== null && a.suggest !== undefined && !compiles(a.suggest, "u")) return "Das Vorschlagsmuster (suggest) ist kein gültiger regulärer Ausdruck.";
  if (a.resolves) {
    const r = a.resolves;
    if (typeof r.kind !== "string" || typeof r.label !== "string" || typeof r.marker !== "string") return "resolves braucht kind, label und marker.";
    if (!compiles(r.marker, "")) return "Das Markermuster (marker) ist kein gültiger regulärer Ausdruck.";
    if (!/\((?!\?)/.test(r.marker)) return "Das Markermuster braucht eine Gruppe für den Inhalt, der beim Auszeichnen bleibt.";
  }
  return "";
}

/** @param {string} pattern @param {string} flags */
function compiles(pattern, flags) {
  try {
    new RegExp(pattern, flags);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a registry. Malformed entries stay in the list with their reason,
 * so the settings view can show what was refused, and duplicate ids or keys
 * refuse the later entry.
 * @param {any} json
 * @returns {LoadedAction[]}
 */
export function loadActions(json) {
  const list = Array.isArray(json?.actions) ? json.actions : [];
  const ids = new Set();
  const keys = new Set();
  return list.map((/** @type {any} */ a) => {
    let refused = actionProblem(a);
    if (!refused && ids.has(a.id)) refused = `Die Kennung ${a.id} ist doppelt.`;
    if (!refused && keys.has(a.key)) refused = `Die Taste ${a.key} ist schon vergeben.`;
    if (!refused) {
      ids.add(a.id);
      keys.add(a.key);
    }
    return { ...a, refused };
  });
}

/**
 * Refuses actions whose element or attributes the schema does not know.
 * @param {LoadedAction[]} actions
 * @param {(element: string, attributes: string[]) => string} problem from js/schema.js
 */
export function checkAgainstSchema(actions, problem) {
  for (const a of actions) {
    if (a.refused) continue;
    a.refused = problem(a.element, a.attributes.map((x) => x.name));
  }
  return actions;
}

/** Actions the menu offers in a view: switched on, not refused. @param {LoadedAction[]} actions @param {"xml" | "text"} view */
export const offered = (actions, view) => actions.filter((a) => a.enabled && !a.refused && a.views.includes(view));

/**
 * The open-work detectors of the markers the actions resolve. Every marker
 * counts, whether its action is switched on or not, because the marker stays
 * open work in the text; `action` names the action only while it is usable.
 * @param {LoadedAction[]} actions
 * @returns {import("./state.js").Detector[]}
 */
export function markerDetectors(actions) {
  return actions
    .filter((a) => a.resolves && !actionProblem(a))
    .map((a) => {
      const pattern = new RegExp(/** @type {Resolves} */ (a.resolves).marker, "g");
      return {
        key: /** @type {Resolves} */ (a.resolves).kind,
        label: /** @type {Resolves} */ (a.resolves).label,
        find: (/** @type {string} */ text) => [...text.matchAll(pattern)].map((m) => ({ from: m.index ?? 0, to: (m.index ?? 0) + m[0].length })),
        action: a.enabled && !a.refused ? a.id : undefined,
      };
    });
}

/**
 * The selection without the marker syntax of the action, when the selection
 * is exactly one marker; otherwise unchanged.
 * @param {Action} a @param {string} text
 */
export function stripMarker(a, text) {
  if (!a.resolves) return text;
  const m = new RegExp(`^(?:${a.resolves.marker})$`).exec(text);
  return m ? (m[1] ?? text) : text;
}

/** Whether the selection suggests this action: it is one of its markers, or matches its suggest pattern. @param {Action} a @param {string} text */
export function suggests(a, text) {
  if (a.resolves) return stripMarker(a, text) !== text;
  return !!a.suggest && new RegExp(a.suggest, "u").test(text.trim());
}

/** @param {string} value */
export const escapeAttribute = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * The element of an action around a text, with the given attributes in order.
 * @param {Action} a @param {string} text already XML text @param {Record<string, string>} [attrs]
 */
export function wrap(a, text, attrs = {}) {
  const list = Object.entries(attrs)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => ` ${k}="${escapeAttribute(v)}"`)
    .join("");
  return `<${a.element}${list}>${text}</${a.element}>`;
}

/**
 * An opening tag with attributes set, replaced or removed (null), keeping the
 * others and their quoting.
 * @param {string} tag e.g. <persName ref="x" type='y'>
 * @param {Record<string, string | null>} changes
 */
export function withAttributes(tag, changes) {
  let out = tag;
  for (const [name, value] of Object.entries(changes)) {
    const re = new RegExp(`\\s${name.replace(/[.]/g, "\\.")}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
    if (value === null) out = out.replace(re, "");
    else if (re.test(out)) out = out.replace(re, ` ${name}="${escapeAttribute(value)}"`);
    else out = out.replace(/\s*(\/?)>$/, ` ${name}="${escapeAttribute(value)}"$1>`);
  }
  return out;
}

/**
 * Element suggestions for the code editor from the actions, merged with the
 * structural elements of the source configuration.
 * @param {LoadedAction[]} actions @param {any[]} structural
 */
export function elementSuggestions(actions, structural) {
  const fromActions = actions
    .filter((a) => !a.refused)
    .map((a) => ({ name: a.element, attributes: a.attributes.map((x) => (x.values ? { name: x.name, values: x.values } : x.name)) }));
  const names = new Set(fromActions.map((e) => e.name));
  return [...fromActions, ...structural.filter((e) => !names.has(e.name))];
}

/**
 * The registry as written to disk: two-space JSON with a final line break,
 * in the line ending the file had, without the load-time fields. Loading and
 * writing an unchanged registry yields the same bytes.
 * @param {string | undefined} comment @param {LoadedAction[]} actions @param {string} lineBreak
 */
export function serializeRegistry(comment, actions, lineBreak = "\n") {
  const plain = actions.map(({ refused, ...a }) => a);
  const json = JSON.stringify(comment === undefined ? { actions: plain } : { $comment: comment, actions: plain }, null, 2);
  return `${json}\n`.replace(/\n/g, lineBreak);
}
