// Composition root: creates editor, viewer and dialogs, connects them, and
// keeps the checks and the working state of the open document.

import { showChanges } from "./changes.js";
import { conflictMarkers } from "./diff.js";
import { createDocumentList } from "./docs.js";
import { createEditor } from "./editor.js";
import { createFiles } from "./files.js";
import { resolveIiif } from "./iiif.js";
import { createActionMenu } from "./menu.js";
import { createPersonDialog } from "./person.js";
import { source } from "./source.js";
import { attachSplit } from "./split.js";
import { acceptanceEdits, openSpots, workingState } from "./state.js";
import { documentFacts, pageAtOffset, parseXml } from "./tei.js";
import { $, setStatus } from "./ui.js";
import { validateTeiAll } from "./validate.js";
import { createViewer } from "./viewer.js";

const xmlStatus = $("xml-status");
const iiifStatus = $("iiif-status");
const iiifInput = /** @type {HTMLInputElement} */ ($("iiif-url"));
const wfButton = $("wf-button");
const validButton = $("valid-button");
const workButton = $("work-button");
// The counter names what this edition counts as open work.
workButton.dataset.tip = `${source.openWork}: ${source.wraps.map((w) => w.label).join(", ")}. F8 springt zur nächsten.`;

/** @type {string[]} */
let pageLabels = [];
/** @type {import("./tei.js").XmlError | null} */
let xmlError = null;
let checkTimer = 0;
let validatedOnce = false;
/** revisionDesc/@status of the last well-formed parse (ADR-011). */
let docStatus = "";
/** The text at acceptance, so a later edit shows as a change after acceptance. */
let acceptedText = /** @type {string | null} */ (null);

const editor = createEditor($("editor"), {
  elements: source.elements,
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
  onScroll: () => menu.follow(),
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

const openPersonDialog = createPersonDialog({ editor, person: source.person, onStale: (message) => report("error", message) });

const menu = createActionMenu({
  editor,
  wraps: source.wraps,
  onPerson: openPersonDialog,
  onNext: nextOpenSpot,
  report: (message) => report("error", message),
});

createDocumentList({
  index: source.documents,
  current: () => ({ path: files.path, open: openSpots(editor.docText(), source.wraps).length, status: docStatus }),
  async choose(path) {
    if (await files.mayDiscard()) files.load(path);
  },
});

/**
 * Sets a check button's state, icon and short label; the full message stays
 * in the status area below the editor.
 * @param {HTMLElement} button @param {"ok" | "error" | "stale" | "busy"} state @param {string} label
 * @param {string} [idleIcon]
 */
function setCheck(button, state, label, idleIcon = "#i-ok") {
  button.dataset.state = state;
  button.querySelector(".label").textContent = label;
  const icon = state === "ok" ? "#i-ok" : state === "error" ? "#i-error" : idleIcon;
  button.querySelector("use").setAttribute("href", icon);
}

// Checks

/** The file name is known even when the document cannot be parsed. */
function showMeta() {
  $("doc-meta").textContent = [files.name, source.name].filter(Boolean).join(" | ");
}

/** Re-reads the source after each edit; facts update only while well-formed. */
function checkSource() {
  const { doc, error } = parseXml(editor.text);
  xmlError = error;
  // Any edit makes an earlier validation result stale, and the label says so.
  setCheck(validButton, "stale", validatedOnce ? "Neu validieren" : "Validieren", "#i-validate");
  validButton.toggleAttribute("data-was-checked", validatedOnce);
  updateOpenWork();
  showMeta();
  const conflicts = conflictMarkers(editor.text);
  if (conflicts.length) {
    showConflicts(conflicts);
    updateDocState();
    return null;
  }
  if (!doc) {
    setCheck(wfButton, "error", error?.line ? `Fehler Zeile ${error.line}` : "Nicht wohlgeformt");
    const problem = { message: `Nicht wohlgeformt: ${error?.message}`, line: error?.line ?? 0, column: error?.column ?? 0 };
    showMessages([problem]);
    editor.setProblems([problem]);
    updateDocState();
    return null;
  }
  setCheck(wfButton, "ok", "Wohlgeformt");
  showMessages([]);
  editor.setProblems([]);
  const facts = documentFacts(doc);
  $("doc-title").textContent = facts.title || source.product;
  docStatus = doc.getElementsByTagNameNS("*", "revisionDesc")[0]?.getAttribute("status") ?? "";
  updateDocState();
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
      b.addEventListener("click", () => editor.jumpTo(item.line, item.column));
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

validButton.addEventListener("click", async () => {
  if (!checkSource()) {
    setCheck(validButton, "error", "Nicht prüfbar");
    return;
  }
  const text = editor.text;
  setCheck(validButton, "busy", "Prüfe …", "#i-validate");
  validButton.disabled = true;
  try {
    const problems = await validateTeiAll(text);
    if (editor.text !== text) return; // edited meanwhile; result no longer applies
    validatedOnce = true;
    validButton.removeAttribute("data-was-checked");
    if (problems.length) {
      setCheck(validButton, "error", `${problems.length} Schemafehler`);
      showMessages(problems);
      editor.setProblems(problems);
    } else {
      setCheck(validButton, "ok", "TEI-konform");
      showMessages([], "Gültig gegen TEI All (P5 4.11.0).");
    }
    updateDocState();
  } catch (err) {
    setCheck(validButton, "error", "Prüfung fehlgeschlagen");
    showMessages([{ message: err instanceof Error ? err.message : String(err), line: 0, column: 0 }]);
  } finally {
    validButton.disabled = false;
  }
});

// Working state and acceptance. Saving stays possible in every state (ADR-008).

function updateDocState() {
  const { state, label, detail } = workingState({
    wellFormed: !xmlError,
    valid: validButton.dataset.state === "ok",
    open: openSpots(editor.docText(), source.wraps).length,
    status: docStatus,
    changedSinceAcceptance: acceptedText !== null && editor.text !== acceptedText,
  });
  $("doc-state").dataset.state = state;
  $("doc-state-label").textContent = label;
  $("doc-state-detail").textContent = detail;
  $("accept").hidden = state !== "ready";
}

// Who accepted is left to the editorial rules of S4.
$("accept").addEventListener("click", () => {
  const edits = acceptanceEdits(editor.docText(), { date: new Date().toISOString().slice(0, 10), note: `Abgenommen im ${source.product}.` });
  if (!edits.length) {
    report("error", "Nicht abgenommen: Das Dokument hat keinen teiHeader, in dem die Abnahme stehen könnte.");
    return;
  }
  for (const e of edits) editor.replace(e.from, e.to, e.insert);
  clearTimeout(checkTimer);
  checkSource();
  acceptedText = editor.text;
  updateDocState();
  report("ok", "Abgenommen. Speichern hält die Abnahme in der Datei fest.");
});

// Open work: the HTR markers still in the text, worked through with F8.

function updateOpenWork() {
  const count = openSpots(editor.docText(), source.wraps).length;
  if (count) setCheck(workButton, "stale", count === 1 ? "1 offene Stelle" : `${count} offene Stellen`, "#i-task");
  else setCheck(workButton, "ok", "Keine offenen Stellen");
}

/** Selects the next marker after the caret, wrapping around, and offers its action. */
function nextOpenSpot() {
  const spots = openSpots(editor.docText(), source.wraps);
  if (!spots.length) {
    report("ok", "Keine offenen Stellen mehr.");
    return true;
  }
  const { from } = editor.selection();
  const next = spots.find((s) => s.from > from) ?? spots[0];
  editor.select(next.from, next.to);
  menu.open(true);
  return true;
}

workButton.addEventListener("click", nextOpenSpot);
document.addEventListener("keydown", (e) => {
  if (e.key === "F8" && !e.defaultPrevented && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    nextOpenSpot();
  }
});

// Opening a document

function documentOpened() {
  // The check below covers the new text; the one the edit scheduled is redundant.
  clearTimeout(checkTimer);
  validatedOnce = false;
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
  const manifest = facts && source.manifestFor(facts.idnos);
  if (manifest) {
    iiifInput.value = manifest;
    loadImages(manifest);
  } else {
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
