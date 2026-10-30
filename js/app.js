// Composition root: loads the action registry, creates editor, viewer and
// dialogs, connects them, and keeps the checks, the working state and the
// view (XML or text) of the open document.

import { checkAgainstSchema, elementSuggestions, loadActions, offered, withAttributes, wrap } from "./actions.js";
import { showChanges } from "./changes.js";
import { concepts } from "./concepts.js";
import { createDateDialog } from "./datedialog.js";
import { conflictMarkers } from "./diff.js";
import { createDocumentList } from "./docs.js";
import { createEditor } from "./editor.js";
import { createFiles } from "./files.js";
import { resolveIiif } from "./iiif.js";
import { createMarkCard } from "./markcard.js";
import { createActionMenu } from "./menu.js";
import { createPersonDialog } from "./person.js";
import { createPlaceDialog } from "./place.js";
import { registerEntry } from "./register.js";
import { schemaChecker } from "./schema.js";
import { createSettings } from "./settings.js";
import { openWorkFor, source } from "./source.js";
import { attachSplit } from "./split.js";
import { acceptanceEdits, openSpots, workingState } from "./state.js";
import { documentFacts, pageAtOffset, parseXml } from "./tei.js";
import { attributeOf, hasLineBreaks, textView } from "./textview.js";
import { $, setStatus } from "./ui.js";
import { validateTeiAll } from "./validate.js";
import { createViewer } from "./viewer.js";

const xmlStatus = $("xml-status");
const iiifStatus = $("iiif-status");
const iiifInput = /** @type {HTMLInputElement} */ ($("iiif-url"));
const wfButton = $("wf-button");
const validButton = $("valid-button");
const workButton = $("work-button");

// Per-browser conveniences; blocked storage only loses the preference.
const remembered = (/** @type {string} */ key) => {
  try {
    return localStorage.getItem(`${source.storageKey}:${key}`);
  } catch {
    return null;
  }
};
const remember = (/** @type {string} */ key, /** @type {string} */ value) => {
  try {
    localStorage.setItem(`${source.storageKey}:${key}`, value);
  } catch {
    // Not persisted; the choice holds for this session.
  }
};

// The action registry

/** @type {import("./actions.js").LoadedAction[]} */
let actions = [];
/** @type {import("./state.js").Detector[]} */
let openWork = openWorkFor([]);

/** Reads data/actions.json and refuses the actions the schema does not know. */
async function loadRegistry() {
  const text = await fetch(source.actions).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Status ${r.status}`))));
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`${source.actions} ist kein gültiges JSON: ${err instanceof Error ? err.message : err}`);
  }
  const loaded = loadActions(json);
  try {
    const rng = await fetch(source.schema).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Status ${r.status}`))));
    checkAgainstSchema(loaded, schemaChecker(rng));
  } catch (err) {
    for (const a of loaded) a.refused ||= `Das Schema ${source.schemaLabel} ist nicht geladen (${err instanceof Error ? err.message : err}), daher bleibt die Aktion aus.`;
  }
  return { text, actions: loaded, comment: json.$comment };
}

/** Hands an edited or loaded registry to menu, counter and tooltips. @param {import("./actions.js").LoadedAction[]} list */
function applyActions(list) {
  actions = list;
  openWork = openWorkFor(list);
  // The counter names what this edition counts as open work.
  workButton.dataset.tip = `${concepts.openSpot} Hier: ${openWork.map((d) => d.label).join(", ")}. F8 springt zur nächsten.`;
  const refused = list.filter((a) => a.refused);
  $("actions-button").dataset.tip = refused.length ? `${concepts.action} ${refused.length === 1 ? "Eine Aktion ist" : `${refused.length} Aktionen sind`} nicht geladen.` : concepts.action;
  $("actions-button").toggleAttribute("data-refused", refused.length > 0);
  if (editorReady) {
    menu.setActions(offered(actions, mode));
    clearTimeout(checkTimer);
    checkSource();
  }
}

let editorReady = false;
const settings = createSettings({ path: source.actions, load: loadRegistry, onChange: applyActions });
$("actions-intro").textContent = `${concepts.action} Ausgeschaltete Aktionen fehlen im Menü, ihre HTR-Marker zählen weiter als offene Stellen. Geprüft gegen ${source.schemaLabel}.`;
try {
  await settings.init();
} catch (err) {
  applyActions([]);
  setStatus(xmlStatus, "error", `Aktionen nicht geladen: ${err instanceof Error ? err.message : err}`);
}

/** @type {string[]} */
let pageLabels = [];
/** @type {import("./tei.js").XmlError | null} */
let xmlError = null;
let checkTimer = 0;
/**
 * The last schema validation with the exact text it ran on.
 * @type {{ text: string, problems: { message: string, line: number, column: number }[] } | null}
 */
let validation = null;
/** Counts opened documents, so a validation finishing later is not applied to another one. */
let opened = 0;
const VALID_SUMMARY = "Gültig gegen TEI All (P5 4.11.0).";
/** revisionDesc/@status of the last well-formed parse (ADR-011). */
let docStatus = "";
/** The text at acceptance, so a later edit shows as a change after acceptance. */
let acceptedText = /** @type {string | null} */ (null);
/** The presentation of the text pane, and the text view while it is shown. */
let mode = /** @type {"xml" | "text"} */ ("xml");
let layout = /** @type {"lines" | "flow"} */ ("lines");
/** @type {ReturnType<typeof textView> | null} */
let tv = null;
let scrollFrame = 0;

const editor = createEditor($("editor"), {
  elements: elementSuggestions(actions, source.elements),
  keys: [
    { key: "Mod-.", run: () => menu.open(true) },
    { key: "F8", run: () => nextOpenSpot() },
    { key: "Mod-s", run: () => (files.save(), true) },
  ],
  onChange() {
    clearTimeout(checkTimer);
    checkTimer = window.setTimeout(checkSource, 300);
    files.updateMark();
  },
  onCaret(offset) {
    const before = editor.slice(0, offset);
    viewer.show(pageAtOffset(before, before.length));
    menu.hideWithoutSelection();
  },
  onPointerSelect: () => menu.open(false),
  onZoom(percent) {
    $("zoom-reset").textContent = `${percent} %`;
  },
  onScroll() {
    menu.follow();
    if (mode !== "text") return;
    // In the text view the facsimile also follows the page in view, unless
    // the caret is visible, whose page it already shows.
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const box = editor.view.scrollDOM.getBoundingClientRect();
      const caret = editor.coordsAt(editor.selection().from);
      if (caret && caret.top >= box.top && caret.bottom <= box.bottom) return;
      const top = editor.topPos();
      if (top !== null) viewer.show(pageAtOffset(editor.slice(0, top), top));
    });
  },
});

const viewer = createViewer($("viewer"), (index, count) => {
  const label = pageLabels[index] ?? String(index + 1);
  // The short form stands in for the sentence in a narrow pane (css/app.css).
  const short = Object.assign(document.createElement("span"), { className: "page-short", textContent: `${label}/${count}` });
  short.setAttribute("aria-hidden", "true");
  $("page-label").replaceChildren(Object.assign(document.createElement("span"), { className: "page-long", textContent: `Seite ${label} von ${count}` }), short);
  $("page-prev").disabled = index === 0;
  $("page-next").disabled = index === count - 1;
});
viewer.onError((message) => {
  setStatus(iiifStatus, "error", message);
  toggleSource(true);
});

attachSplit({ workspace: $("workspace"), splitter: $("splitter"), hide: $("facs-hide"), show: $("facs-show"), storageKey: `${source.storageKey}:split` });

const report = (/** @type {"ok" | "error"} */ state, /** @type {string} */ message) => setStatus(xmlStatus, state, message);
const stale = (/** @type {string} */ message) => report("error", message);

const files = createFiles({
  editor,
  fallbackName: source.defaultDocument.split("/").pop() ?? "dokument.tei.xml",
  report,
  onOpened: documentOpened,
  // Run the pending check now, so it cannot overwrite the save confirmation.
  beforeSave() {
    clearTimeout(checkTimer);
    checkSource();
  },
  onSaved: showMeta,
});

const actionFor = (/** @type {string} */ dialog) => actions.find((a) => a.dialog === dialog && !a.refused);
const openPersonDialog = createPersonDialog({
  editor,
  person: source.person,
  markup: (text, ref) => {
    const a = actionFor("person");
    return a ? wrap(a, text, { ref }) : text;
  },
  onStale: stale,
});
const openPlaceDialog = createPlaceDialog({ editor, place: source.place, nameOf: source.person.nameOf, onStale: stale });
const openDateDialog = createDateDialog({ editor, onStale: stale });

const menu = createActionMenu({
  editor,
  onDialog(action, sel) {
    if (action.dialog === "person") openPersonDialog(sel);
    else if (action.dialog === "place") openPlaceDialog(sel, action);
    else if (action.dialog === "date") openDateDialog(sel, action);
  },
  onNext: nextOpenSpot,
  // A selection that cannot be annotated endangers nothing, so the tone is neutral.
  report: (message) => setStatus(xmlStatus, "", message),
  markupNote: () =>
    mode === "text"
      ? "Die Auswahl reicht über eine Zeile oder eine Auszeichnung hinaus. Bitte innerhalb einer Zeile und außerhalb bestehender Auszeichnungen markieren."
      : "Die Markierung enthält Markup. Nur reinen Text markieren.",
});
menu.setActions(offered(actions, mode));
editorReady = true;

createDocumentList({
  index: source.documents,
  collections: source.collections,
  current: () => ({ path: files.path, open: openSpots(editor.docText(), openWork).length, status: docStatus, ready: updateDocState().state === "ready" }),
  async choose(path) {
    if (await files.mayDiscard()) files.load(path);
  },
});

/**
 * Sets a check button's state, icon and short label; the full message stays
 * in the status area below the editor. The label is also the tooltip, so the
 * buttons stay distinguishable when a narrow pane shows only their icons.
 * @param {HTMLElement} button @param {"ok" | "error" | "stale" | "busy"} state @param {string} label
 * @param {string} [idleIcon]
 */
function setCheck(button, state, label, idleIcon = "#i-ok") {
  button.dataset.state = state;
  button.querySelector(".label").textContent = label;
  if (button !== workButton) button.dataset.tip = label;
  const icon = state === "ok" ? "#i-ok" : state === "error" ? "#i-error" : idleIcon;
  button.querySelector("use").setAttribute("href", icon);
}

// Checks

/** The file name is known even when the document cannot be parsed. */
function showMeta() {
  $("doc-meta").textContent = [files.name, source.name].filter(Boolean).join(" | ");
}

/** Whether the last validation ran on exactly the text in the editor. */
const validated = () => validation !== null && validation.text === editor.text;

/**
 * Re-reads the source after each edit; facts update only while well-formed.
 * A validation result applies to the exact text it ran on: an edit makes it
 * stale, and undoing back to that text brings it back.
 */
function checkSource() {
  const { doc, error } = parseXml(editor.text);
  xmlError = error;
  if (validation && validated()) {
    const count = validation.problems.length;
    setCheck(validButton, count ? "error" : "ok", count ? `${count} Schemafehler` : "TEI-konform");
  } else {
    setCheck(validButton, "stale", validation ? "Neu validieren" : "Validieren", "#i-validate");
  }
  validButton.toggleAttribute("data-was-checked", !!validation && !validated());
  updateOpenWork();
  showMeta();
  const conflicts = conflictMarkers(editor.text);
  if (conflicts.length) {
    showConflicts(conflicts);
    updateDocState();
    updateViewSwitch();
    return null;
  }
  if (!doc) {
    setCheck(wfButton, "error", error?.line ? `Fehler Zeile ${error.line}` : "Nicht wohlgeformt");
    const problem = { message: `Nicht wohlgeformt: ${error?.message}`, line: error?.line ?? 0, column: error?.column ?? 0 };
    showMessages([problem]);
    editor.setProblems([problem]);
    updateDocState();
    updateViewSwitch();
    return null;
  }
  setCheck(wfButton, "ok", "Wohlgeformt");
  if (validation && validated()) {
    showMessages(validation.problems, validation.problems.length ? "" : VALID_SUMMARY);
    editor.setProblems(validation.problems);
  } else {
    showMessages([]);
    editor.setProblems([]);
  }
  const facts = documentFacts(doc);
  $("doc-title").textContent = facts.title || files.name;
  docStatus = doc.getElementsByTagNameNS("*", "revisionDesc")[0]?.getAttribute("status") ?? "";
  updateDocState();
  updateViewSwitch();
  return facts;
}

/**
 * Lists messages below the editor; each one with a position jumps there.
 * @param {{ message: string, line: number, column: number }[]} items
 * @param {string} [summary]
 */
function showMessages(items, summary = "") {
  xmlStatus.replaceChildren();
  xmlStatus.dataset.state = items.length ? "error" : summary ? "ok" : "";
  if (summary) xmlStatus.append(Object.assign(document.createElement("p"), { textContent: summary }));
  if (!items.length) return;
  const list = document.createElement("ul");
  for (const item of items.slice(0, 20)) {
    const li = document.createElement("li");
    if (item.line) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "link", textContent: `Zeile ${item.line}` });
      b.addEventListener("click", () => {
        // Line numbers belong to the source, so the jump shows it.
        if (mode === "text") setView("xml");
        editor.jumpTo(item.line, item.column);
      });
      li.append(b, ` ${item.message}`);
    } else {
      li.textContent = item.message;
    }
    list.append(li);
  }
  if (items.length > 20) list.append(Object.assign(document.createElement("li"), { textContent: `… und ${items.length - 20} weitere` }));
  xmlStatus.append(list);
}

const CONFLICT_PARTS = {
  start: "Beginn eines Git-Konflikts, darunter die eigene Fassung",
  middle: "Trennlinie, darunter die andere Fassung",
  end: "Ende des Git-Konflikts",
};

/**
 * Git conflict markers make the document malformed, but the parser would name
 * them as a cryptic syntax error, so they are explained as two versions instead.
 * @param {{ line: number, kind: "start" | "middle" | "end" }[]} conflicts
 */
function showConflicts(conflicts) {
  const first = conflicts[0].line;
  xmlError = { message: "Git-Konflikt", line: first, column: 1 };
  setCheck(wfButton, "error", `Git-Konflikt Zeile ${first}`);
  const problems = conflicts.map((c) => ({ message: CONFLICT_PARTS[c.kind], line: c.line, column: 1 }));
  showMessages(
    problems,
    `Git-Konflikt ab Zeile ${first}: Die Datei enthält hier zwei Fassungen derselben Stelle. Eine Fassung behalten oder beide zusammenführen, dann die Markierungszeilen löschen.`,
  );
  editor.setProblems(problems);
}

wfButton.addEventListener("click", () => {
  checkSource();
  if (xmlError?.line) editor.jumpTo(xmlError.line, xmlError.column);
});

/**
 * Validates the text against TEI All and records the result with the exact
 * text it ran on, so checkSource can show it for as long as the text is that.
 * @returns {Promise<boolean>} whether the editor text is now known to be valid
 */
async function runValidation() {
  clearTimeout(checkTimer);
  if (!checkSource()) {
    setCheck(validButton, "error", "Nicht prüfbar");
    return false;
  }
  const text = editor.text;
  const openedAt = opened;
  setCheck(validButton, "busy", "Prüfe …", "#i-validate");
  validButton.disabled = true;
  try {
    const problems = await validateTeiAll(text);
    // A result for a document opened meanwhile would only coincide by text.
    if (openedAt === opened) validation = { text, problems };
  } catch (err) {
    setCheck(validButton, "error", "Prüfung fehlgeschlagen");
    showMessages([{ message: err instanceof Error ? err.message : String(err), line: 0, column: 0 }]);
    return false;
  } finally {
    validButton.disabled = false;
  }
  clearTimeout(checkTimer);
  checkSource();
  return validated() && !validation?.problems.length;
}

validButton.addEventListener("click", runValidation);

// Working state and acceptance. Saving stays possible in every state (ADR-008).

$("doc-state").dataset.tip = `${concepts.workingState} ${concepts.acceptance}`;

function updateDocState() {
  const facts = workingState({
    wellFormed: !xmlError,
    valid: validated() && !validation?.problems.length,
    open: openSpots(editor.docText(), openWork).length,
    status: docStatus,
    changedSinceAcceptance: acceptedText !== null && editor.text !== acceptedText,
  });
  $("doc-state").dataset.state = facts.state;
  $("doc-state-label").textContent = facts.label;
  $("doc-state-detail").textContent = facts.detail;
  $("accept").hidden = facts.state !== "ready";
  return facts;
}

// Who accepted is left to the editorial rules of S4.
$("accept").addEventListener("click", async () => {
  // The pending check runs first: an edit inside the debounce interval must
  // not be accepted on the strength of a validation of the earlier text.
  clearTimeout(checkTimer);
  checkSource();
  const before = updateDocState();
  if (before.state !== "ready") {
    report("error", `Nicht abgenommen: ${before.label}${before.detail ? `, ${before.detail}` : ""}.`);
    return;
  }
  const edits = acceptanceEdits(editor.docText(), { date: new Date().toISOString().slice(0, 10), note: `Abgenommen im ${source.product}.` });
  if (!edits.length) {
    report("error", "Nicht abgenommen: Das Dokument hat keinen teiHeader, in dem die Abnahme stehen könnte.");
    return;
  }
  for (const e of edits) editor.replace(e.from, e.to, e.insert);
  clearTimeout(checkTimer);
  checkSource();
  // The edits count only if the parsed document now carries the status.
  if (docStatus !== "approved") {
    report("error", "Die Abnahme ist im revisionDesc nicht angekommen. Bitte den teiHeader prüfen; Strg+Z nimmt die Änderung zurück.");
    return;
  }
  acceptedText = editor.text;
  updateDocState();
  report("ok", "Abgenommen. Speichern hält die Abnahme in der Datei fest.");
  // Only the header changed; validating again shows the accepted text as valid.
  if (await runValidation()) report("ok", "Abgenommen und gültig gegen TEI All. Speichern hält die Abnahme in der Datei fest.");
});

// Open work: what the detectors find, worked through with F8.

function updateOpenWork() {
  const count = openSpots(editor.docText(), openWork).length;
  if (count) setCheck(workButton, "stale", count === 1 ? "1 offene Stelle" : `${count} offene Stellen`, "#i-task");
  else setCheck(workButton, "ok", "Keine offenen Stellen");
}

/** What the menu says for a kind of open work without a usable action. @param {import("./state.js").Detector | undefined} kind */
function openRuleNote(kind) {
  const action = actions.find((a) => a.resolves?.kind === kind?.key);
  if (action?.refused) return `${kind?.label}: Die Aktion ${action.label} ist nicht geladen. ${action.refused} F8 springt weiter.`;
  if (action && !action.enabled) return `${kind?.label}: Die Aktion ${action.label} ist unter „Aktionen“ ausgeschaltet. F8 springt weiter.`;
  if (action && !action.views.includes(mode)) return `${kind?.label}: Die Aktion ${action.label} steht in dieser Ansicht nicht zur Verfügung. F8 springt weiter.`;
  return `${kind?.label}: Die Kodierungsregel ist noch offen, daher gibt es hier noch keine Aktion. F8 springt weiter.`;
}

/**
 * Selects the next open spot after the caret, wrapping around, and offers its
 * action; a kind without one is named in the menu instead.
 */
function nextOpenSpot() {
  const spots = openSpots(editor.docText(), openWork);
  if (!spots.length) {
    report("ok", "Keine offenen Stellen mehr.");
    return true;
  }
  const { from } = editor.selection();
  const next = spots.find((s) => s.from > from) ?? spots[0];
  editor.select(next.from, next.to);
  const kind = openWork.find((d) => d.key === next.key);
  const usable = kind?.action && offered(actions, mode).some((a) => a.id === kind.action);
  menu.open(true, usable ? "" : openRuleNote(kind));
  return true;
}

workButton.addEventListener("click", nextOpenSpot);
document.addEventListener("keydown", (e) => {
  if (e.key === "F8" && !e.defaultPrevented && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    nextOpenSpot();
  }
});

// The text view: the same document with the markup hidden (js/textview.js).

const card = createMarkCard({
  editor,
  markAt: (pos) => tv?.markAt(editor.state, pos) ?? null,
  async describe(mark) {
    const ref = attributeOf(mark.attrs, "ref");
    const action = actions.find((a) => a.element === mark.name && !a.refused);
    const known = new Set(action?.attributes.map((a) => a.name) ?? []);
    const extra = [...mark.attrs.matchAll(/([\w:.-]+)\s*=/g)].map((m) => m[1]).filter((n) => !known.has(n));
    let detail = "";
    let unlinked = false;
    if (mark.name === "persName" || mark.name === "placeName") {
      const id = mark.name === "persName" ? source.person.registerIdOf(ref) : "";
      const gnd = (mark.name === "persName" ? source.person : source.place).gndOf(ref);
      if (!ref) {
        detail = "noch nicht verknüpft";
        unlinked = true;
      } else if (id) {
        const entry = await registerEntry(source.person.register, id).catch(() => null);
        detail = [entry?.name, entry?.dates, id].filter(Boolean).join(" | ");
      } else detail = gnd ? `GND ${gnd}` : ref;
    } else if (mark.name === "date") {
      detail = ["when", "from", "to", "notBefore", "notAfter"]
        .map((n) => [n, attributeOf(mark.attrs, n)])
        .filter(([, v]) => v)
        .map(([n, v]) => `@${n} ${v}`)
        .join(" | ");
      unlinked = !detail;
      detail ||= "ohne Datumswert";
    }
    return {
      title: source.textView.marks[/** @type {keyof typeof source.textView.marks} */ (mark.name)] ?? mark.name,
      detail,
      note: extra.length ? `Weitere Attribute (${extra.map((n) => `@${n}`).join(", ")}) stehen in der XML-Ansicht.` : "",
      unlinked,
      changeable: !!action && action.dialog !== "none",
    };
  },
  onChange(mark) {
    const action = actions.find((a) => a.element === mark.name && !a.refused);
    if (!action) return;
    const tag = editor.slice(mark.openFrom, mark.openTo);
    const sel = { from: mark.openTo, to: mark.closeFrom, text: editor.slice(mark.openTo, mark.closeFrom) };
    /** Sets attributes on the opening tag, if it is still where it was. @param {Record<string, string | null>} changes */
    const change = (changes) => {
      if (editor.slice(mark.openFrom, mark.openTo) !== tag) {
        stale("Die Auszeichnung hat sich verändert; bitte erneut öffnen.");
        return;
      }
      editor.replace(mark.openFrom, mark.openTo, withAttributes(tag, changes));
    };
    if (action.dialog === "person") openPersonDialog(sel, (ref) => change({ ref }));
    else if (action.dialog === "place") openPlaceDialog(sel, action, (ref) => change({ ref: ref || null }));
    else if (action.dialog === "date") {
      const attrs = Object.fromEntries(["when", "from", "to", "notBefore", "notAfter"].map((n) => [n, attributeOf(mark.attrs, n)]));
      openDateDialog(sel, action, { attrs, apply: change });
    }
  },
});

const hooks = {
  openWork: (/** @type {string} */ text) => openSpots(text, openWork),
  // The refused edit did not happen, so the explanation is calm, not an error.
  onRefuse: (/** @type {string} */ message) => setStatus(xmlStatus, "", message),
  // A page divider turns the facsimile to its page.
  onPage: (/** @type {number} */ pos) => viewer.show(pageAtOffset(editor.slice(0, pos + 4), pos + 4)),
  onMarkKey: (/** @type {import("./textview.js").Mark} */ mark) => card.openWithFocus(mark),
};

/** The layout a document opens in: the remembered choice for its kind, else lines where it marks line breaks. */
function layoutFor(/** @type {string} */ text) {
  const kind = hasLineBreaks(text, source.textView) ? "lb" : "plain";
  const stored = remembered(`layout:${kind}`);
  return stored === "lines" || stored === "flow" ? stored : kind === "lb" ? "lines" : "flow";
}

/**
 * Switches between XML and text on the same state; text, selection and undo
 * history stay. A malformed document cannot enter the text view.
 * @param {"xml" | "text"} next @param {{ remember?: boolean, layout?: "lines" | "flow" }} [options]
 */
function setView(next, { remember: keep = true, layout: chosen } = {}) {
  if (next === "text" && xmlError) {
    report("error", textRefusal());
    return false;
  }
  card.close();
  mode = next;
  if (next === "text") {
    layout = chosen ?? layoutFor(editor.text);
    tv = textView(source.textView, hooks, layout);
    editor.present(tv.extension);
    // A caret inside hidden markup moves to the visible text after it.
    const { from, to } = editor.selection();
    const head = tv.visiblePos(editor.state, from);
    if (head !== from) editor.dispatch({ selection: { anchor: head } });
    else if (to !== from) editor.dispatch({ selection: { anchor: to, head: from } });
  } else {
    tv = null;
    editor.present(null);
  }
  editor.reveal();
  if (keep) remember("view", next);
  $("view-xml").setAttribute("aria-pressed", String(next === "xml"));
  $("view-text").setAttribute("aria-pressed", String(next === "text"));
  $("layout-switch").hidden = next !== "text";
  $("layout-lines").setAttribute("aria-pressed", String(layout === "lines"));
  $("layout-flow").setAttribute("aria-pressed", String(layout === "flow"));
  $("wrap-toggle").hidden = next === "text";
  menu.setActions(offered(actions, mode));
  return true;
}

const textRefusal = () =>
  `Die Textansicht braucht ein wohlgeformtes Dokument. ${xmlError?.message === "Git-Konflikt" ? "Erst den Git-Konflikt auflösen" : `Erst den Fehler${xmlError?.line ? ` in Zeile ${xmlError.line}` : ""} beheben`}, dann umschalten.`;

/** Keeps the text button's availability in step with well-formedness. */
function updateViewSwitch() {
  const blocked = !!xmlError;
  $("view-text").setAttribute("aria-disabled", String(blocked));
  $("view-switch").dataset.tip = blocked ? `${concepts.views} ${textRefusal()}` : concepts.views;
  // A document that turns malformed in the text view (undo, a jump from the
  // problem list) is shown as XML, where the error can be fixed.
  if (blocked && mode === "text") {
    setView("xml", { remember: false });
    report("error", `Zur XML-Ansicht gewechselt: ${textRefusal()}`);
  }
}

$("view-xml").addEventListener("click", () => setView("xml"));
$("view-text").addEventListener("click", () => setView("text"));
$("layout-switch").dataset.tip = concepts.layout;
for (const [id, value] of /** @type {const} */ ([["layout-lines", "lines"], ["layout-flow", "flow"]])) {
  $(id).addEventListener("click", () => {
    remember(`layout:${hasLineBreaks(editor.text, source.textView) ? "lb" : "plain"}`, value);
    setView("text", { layout: value });
  });
}

// Opening a document

function documentOpened() {
  // The check below covers the new text; the one the edit scheduled is redundant.
  clearTimeout(checkTimer);
  opened++;
  validation = null;
  // Title and state of the previous document must not survive a new one that
  // is not well-formed; the parse below sets them when it can.
  docStatus = "";
  $("doc-title").textContent = files.name;
  acceptedText = null;
  const facts = checkSource();
  if (docStatus === "approved") {
    acceptedText = editor.text;
    updateDocState();
  }
  // Work happens in the text, so the caret starts at its first page break.
  const lines = editor.docText().split("\n");
  const start = lines.findIndex((l) => /<pb\b/.test(l));
  const body = lines.findIndex((l) => /<body\b/.test(l));
  if (start >= 0 || body >= 0) editor.jumpTo((start >= 0 ? start : body) + 1, 1);
  // XML opens first; the text view returns where it was chosen before.
  const wanted = mode === "text" || remembered("view") === "text" ? "text" : "xml";
  if (wanted === "text" && !xmlError) setView("text", { remember: false });
  else if (mode === "text") setView("xml", { remember: false });
  const manifest = facts && source.manifestFor(facts.idnos);
  if (manifest) {
    iiifInput.value = manifest;
    loadImages(manifest);
  } else {
    // The facsimile of the previous document must not stand beside this one.
    pageLabels = [];
    viewer.clear();
    iiifInput.value = "";
    $("page-label").replaceChildren();
    $("page-prev").disabled = true;
    $("page-next").disabled = true;
    toggleSource(true);
  }
}

// Facsimile

/** @param {string} url */
async function loadImages(url) {
  setStatus(iiifStatus, "", "Lade …");
  try {
    const resolved = await resolveIiif(url);
    if (!resolved.pages.length) throw new Error("Das Manifest enthält keine Bilder.");
    pageLabels = resolved.pages.map((p) => p.label);
    viewer.load(resolved.pages);
    setStatus(iiifStatus, "", "");
    toggleSource(false);
  } catch (err) {
    setStatus(iiifStatus, "error", err instanceof Error ? err.message : String(err));
    toggleSource(true);
  }
}

/**
 * The image source field takes the place of the view controls in the same
 * row, so the toolbar never grows a second line; its button opens and closes it.
 * @param {boolean} [open]
 */
function toggleSource(open) {
  const form = $("iiif-form");
  const show = open ?? form.hidden;
  form.hidden = !show;
  $("view-tools").hidden = show;
  $("source-toggle").setAttribute("aria-expanded", String(show));
  if (show && open === undefined) iiifInput.focus();
}

$("source-toggle").addEventListener("click", () => toggleSource());
iiifInput.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
  if (e.key !== "Escape") return;
  e.preventDefault();
  toggleSource(false);
  $("source-toggle").focus();
});
$("iiif-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
  e.preventDefault();
  loadImages(iiifInput.value.trim());
});
$("page-prev").addEventListener("click", () => viewer.show(viewer.index - 1));
$("page-next").addEventListener("click", () => viewer.show(viewer.index + 1));
$("img-in").addEventListener("click", () => viewer.zoom(1.4));
$("img-out").addEventListener("click", () => viewer.zoom(1 / 1.4));
$("img-fit").addEventListener("click", () => viewer.fit());
$("rot-left").addEventListener("click", () => viewer.rotate(-90));
$("rot-right").addEventListener("click", () => viewer.rotate(90));

// Editor view

$("zoom-in").addEventListener("click", () => editor.zoomBy(1));
$("zoom-out").addEventListener("click", () => editor.zoomBy(-1));
$("zoom-reset").addEventListener("click", () => editor.zoomBy(0));
$("wrap-toggle").addEventListener("click", () => {
  $("wrap-toggle").setAttribute("aria-pressed", String(editor.toggleWrap()));
});
$("diff-button").addEventListener("click", () =>
  showChanges({ before: files.savedText, after: editor.text, since: files.savedBy, jumpTo: (line) => editor.jumpTo(line, 1) }),
);

files.load(source.defaultDocument);
