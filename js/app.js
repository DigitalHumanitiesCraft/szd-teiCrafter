import { conflictMarkers, hunks, lineDiff } from "./diff.js";
import { createEditor } from "./editor.js";
import { isGndId, searchPersons } from "./gnd.js";
import { resolveIiif } from "./iiif.js";
import { cleanQuery, searchRegister } from "./register.js";
import { source } from "./source.js";
import { attachSplit } from "./split.js";
import { documentFacts, pageAtOffset, parseXml } from "./tei.js";
import { validateTeiAll } from "./validate.js";
import { createViewer } from "./viewer.js";

const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

const xmlStatus = $("xml-status");
const iiifStatus = $("iiif-status");
const iiifInput = /** @type {HTMLInputElement} */ ($("iiif-url"));
const pageLabel = $("page-label");
const wfButton = $("wf-button");
const validButton = $("valid-button");
const workButton = $("work-button");
const menu = $("actions");

let fileName = source.defaultDocument.split("/").pop() ?? "dokument.tei.xml";
/** File handle when the document was opened through the File System Access API. */
let fileHandle = /** @type {any} */ (null);
/** @type {string[]} */
let pageLabels = [];
/** @type {import("./tei.js").XmlError | null} */
let xmlError = null;
let checkTimer = 0;
/** The text as last opened or saved; any difference is unsaved work. */
let savedText = "";
/** Whether savedText comes from opening or from saving, for the comparison title. */
let savedBy = "Öffnen";
/** lastModified of the opened file on disk at open or last save, null without a handle. */
let diskModified = /** @type {number | null} */ (null);
let validatedOnce = false;
/** revisionDesc/@status of the last well-formed parse (ADR-011). */
let docStatus = "";
/** The text at acceptance, so a later edit shows as a change after acceptance. */
let acceptedText = /** @type {string | null} */ (null);

const editor = createEditor($("editor"), {
  elements: source.elements,
  keys: [
    { key: "Mod-.", run: () => openMenu(true) },
    { key: "F8", run: () => nextOpenSpot() },
    { key: "Mod-s", run: () => (save(), true) },
  ],
  onChange() {
    clearTimeout(checkTimer);
    checkTimer = window.setTimeout(checkSource, 300);
    updateSaveState();
  },
  onCaret(offset) {
    const before = editor.slice(0, offset);
    viewer.show(pageAtOffset(before, before.length));
    if (!editor.selection().text && !menu.contains(document.activeElement)) menu.hidden = true;
  },
  onPointerSelect() {
    openMenu(false);
  },
  onZoom(percent) {
    $("zoom-reset").textContent = `${percent} %`;
  },
  onScroll() {
    if (!menu.hidden) positionMenu();
  },
});

const viewer = createViewer($("viewer"), (index, count) => {
  const label = pageLabels[index] ?? String(index + 1);
  pageLabel.textContent = `Seite ${label} von ${count}`;
  $("page-prev").disabled = index === 0;
  $("page-next").disabled = index === count - 1;
});
viewer.onError((message) => {
  setStatus(iiifStatus, "error", message);
  toggleSource(true);
});

attachSplit({ workspace: $("workspace"), splitter: $("splitter"), hide: $("facs-hide"), show: $("facs-show") });

/** @param {HTMLElement} el @param {"ok" | "error" | ""} state @param {string} message */
function setStatus(el, state, message) {
  el.dataset.state = state;
  el.textContent = message;
}

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

/** Re-reads the source after each edit; facts update only while well-formed. */
function checkSource() {
  const { doc, error } = parseXml(editor.text);
  xmlError = error;
  // Any edit makes an earlier validation result stale, and the label says so.
  setCheck(validButton, "stale", validatedOnce ? "Neu validieren" : "Validieren", "#i-validate");
  validButton.toggleAttribute("data-was-checked", validatedOnce);
  updateOpenWork();
  // The file name is known even when the document cannot be parsed.
  $("doc-meta").textContent = [fileName, source.name].filter(Boolean).join(" | ");
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
  $("doc-title").textContent = facts.title || "teiCrafter SZD";
  docStatus = doc.getElementsByTagNameNS("*", "revisionDesc")[0]?.getAttribute("status") ?? "";
  updateDocState();
  return facts;
}

// Working state (ADR-006, ADR-008, ADR-011): from not well-formed through open
// spots and validation to accepted. Saving stays possible in every state.

function updateDocState() {
  const open = openSpots().length;
  const wellFormed = !xmlError;
  const valid = validButton.dataset.state === "ok";
  /** @type {[string, string, string]} state, label, detail */
  let view;
  if (docStatus === "approved" && wellFormed) {
    view = acceptedText === null || editor.text === acceptedText
      ? ["approved", "Abgenommen", ""]
      : ["changed", "Abgenommen", "seither geändert"];
  } else if (!wellFormed) {
    view = ["error", "In Bearbeitung", "nicht wohlgeformt"];
  } else if (open) {
    view = ["draft", "In Bearbeitung", open === 1 ? "1 offene Stelle" : `${open} offene Stellen`];
  } else if (!valid) {
    view = ["draft", "In Bearbeitung", "noch nicht validiert"];
  } else {
    view = ["ready", "Bereit zur Abnahme", ""];
  }
  const [state, label, detail] = view;
  $("doc-state").dataset.state = state;
  $("doc-state-label").textContent = label;
  $("doc-state-detail").textContent = detail;
  $("accept").hidden = state !== "ready";
}

/**
 * Records the acceptance in the TEI: revisionDesc/@status="approved" and a
 * change with the date. Who accepted is left to the editorial rules of S4.
 */
function accept() {
  const date = new Date().toISOString().slice(0, 10);
  const change = `<change when="${date}" status="approved">Abgenommen im teiCrafter SZD.</change>`;
  const text = editor.docText();
  const open = /<revisionDesc\b[^>]*>/.exec(text);
  if (open) {
    const close = text.indexOf("</revisionDesc>", open.index);
    const list = text.lastIndexOf("</listChange>", close);
    const at = list > open.index ? list : close;
    if (at < 0) return;
    const indent = /[ \t]*$/.exec(text.slice(0, at))?.[0] ?? "";
    editor.replace(at, at, `  ${change}\n${indent}`);
    const tag = open[0].includes("status=")
      ? open[0].replace(/status="[^"]*"/, 'status="approved"')
      : open[0].replace(/<revisionDesc\b/, '<revisionDesc status="approved"');
    editor.replace(open.index, open.index + open[0].length, tag);
  } else {
    const end = text.indexOf("</teiHeader>");
    if (end < 0) return;
    const lineStart = text.lastIndexOf("\n", end) + 1;
    const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
    editor.replace(lineStart, lineStart, `${indent}  <revisionDesc status="approved">\n${indent}    ${change}\n${indent}  </revisionDesc>\n`);
  }
  clearTimeout(checkTimer);
  checkSource();
  acceptedText = editor.text;
  updateDocState();
  setStatus(xmlStatus, "ok", "Abgenommen. Speichern hält die Abnahme in der Datei fest.");
}

$("accept").addEventListener("click", accept);

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
      const b = document.createElement("button");
      b.type = "button";
      b.className = "link";
      b.textContent = `Zeile ${item.line}`;
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

// Open work: the HTR markers still in the text, in document order.

function openSpots() {
  const text = editor.docText();
  /** @type {{ from: number, to: number, key: string }[]} */
  const spots = [];
  for (const wrap of source.wraps) {
    for (const m of text.matchAll(wrap.marker)) spots.push({ from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, key: wrap.key });
  }
  return spots.sort((a, b) => a.from - b.from || b.to - a.to);
}

function updateOpenWork() {
  const count = openSpots().length;
  if (count) setCheck(workButton, "stale", count === 1 ? "1 offene Stelle" : `${count} offene Stellen`, "#i-task");
  else setCheck(workButton, "ok", "Keine offenen Stellen");
}

/** Selects the next marker after the caret, wrapping around, and offers its action. */
function nextOpenSpot() {
  const spots = openSpots();
  if (!spots.length) {
    setStatus(xmlStatus, "ok", "Keine offenen Stellen mehr.");
    return true;
  }
  const { from } = editor.selection();
  const next = spots.find((s) => s.from > from) ?? spots[0];
  editor.select(next.from, next.to);
  openMenu(true);
  return true;
}

workButton.addEventListener("click", nextOpenSpot);
document.addEventListener("keydown", (e) => {
  if (e.key === "F8" && !e.defaultPrevented && !document.querySelector("dialog[open]")) {
    e.preventDefault();
    nextOpenSpot();
  }
});

// Actions at the selection

function selectionProblem() {
  const { text } = editor.selection();
  if (!text.trim()) return "empty";
  if (/[<>]/.test(text)) return "Die Markierung enthält Markup. Nur reinen Text markieren.";
  return "";
}

/** The wrap whose marker syntax the selection carries, else person for a capitalised selection. */
function suggestedAction() {
  const { text } = editor.selection();
  return source.wraps.find((w) => w.strip(text) !== text)?.key ?? (/^\p{Lu}/u.test(text.trim()) ? "person" : null);
}

function positionMenu() {
  const at = editor.selectionCoords();
  if (!at) {
    menu.hidden = true;
    return;
  }
  const width = menu.offsetWidth || 320;
  menu.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
  // Below the selected line, or above it when there is no room below.
  const below = at.bottom + 6;
  menu.style.top = `${below + menu.offsetHeight < window.innerHeight - 8 ? below : Math.max(8, at.top - menu.offsetHeight - 6)}px`;
}

/** @param {boolean} withFocus true when opened from the keyboard */
function openMenu(withFocus) {
  const problem = selectionProblem();
  if (problem === "empty" || (problem && !withFocus)) {
    if (!menu.contains(document.activeElement)) menu.hidden = true;
    if (problem && problem !== "empty") setStatus(xmlStatus, "error", problem);
    return !!problem;
  }
  if (problem) {
    setStatus(xmlStatus, "error", problem);
    return true;
  }
  const suggested = suggestedAction();
  // The marked text is quoted in the menu, so the judgement is made on what is
  // actually selected even where the menu covers part of the line.
  const { text } = editor.selection();
  $("actions-quote").textContent = `„${text.length > 90 ? `${text.slice(0, 87)}…` : text}“`;
  const items = /** @type {HTMLButtonElement[]} */ ([...menu.querySelectorAll("button")]);
  for (const b of items) b.toggleAttribute("data-suggested", b.dataset.action === suggested);
  menu.hidden = false;
  positionMenu();
  if (withFocus) (items.find((b) => b.dataset.action === suggested) ?? items[0]).focus();
  return true;
}

function closeMenu(refocus = true) {
  menu.hidden = true;
  if (refocus) editor.focus();
}

/** @param {string} action */
function runAction(action) {
  const sel = editor.selection();
  closeMenu(action !== "person");
  if (action === "person") {
    openPersonDialog(sel);
    return;
  }
  const wrap = source.wraps.find((w) => w.key === action);
  if (!wrap) return;
  editor.replace(sel.from, sel.to, `<${wrap.element}>${wrap.strip(sel.text)}</${wrap.element}>`);
}

// Keep the editor selection when a menu item is pressed with the mouse.
menu.addEventListener("mousedown", (/** @type {MouseEvent} */ e) => e.preventDefault());
menu.addEventListener("click", (/** @type {MouseEvent} */ e) => {
  const b = /** @type {HTMLElement} */ (e.target).closest("button");
  if (b) runAction(b.dataset.action);
});
menu.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
  const items = /** @type {HTMLButtonElement[]} */ ([...menu.querySelectorAll("button")]);
  const i = items.indexOf(/** @type {any} */ (document.activeElement));
  if (e.key === "Escape") {
    e.preventDefault();
    closeMenu();
  } else if (["ArrowRight", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    items[(i + 1) % items.length].focus();
  } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
    items[(i - 1 + items.length) % items.length].focus();
  } else if (e.key === "F8") {
    e.preventDefault();
    e.stopPropagation();
    nextOpenSpot();
  }
});

// Person dialog: the source's person register first, the GND second.

const dialog = /** @type {HTMLDialogElement} */ ($("person-dialog"));
const refInput = /** @type {HTMLInputElement} */ ($("person-gnd"));
let pending = { from: 0, to: 0, text: "" };
let registerTimer = 0;

/** The reference the typed or chosen identifier stands for, or "". */
function chosenRef() {
  const id = refInput.value.trim();
  if (source.person.isRegisterId(id)) return source.person.registerRef(id);
  if (isGndId(id)) return source.person.gndRef(id);
  return "";
}

function updatePreview() {
  const ref = chosenRef();
  // A valid choice answers an earlier "please choose" message.
  if (ref && $("person-status").dataset.state === "error") setStatus($("person-status"), "", "");
  $("person-preview").textContent = ref ? source.person.markup(pending.text, ref) : "";
}

/**
 * @param {HTMLElement} list
 * @param {{ id: string, title: string, meta: string }[]} items
 */
function renderResults(list, items) {
  list.replaceChildren();
  for (const item of items) {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "result";
    b.dataset.id = item.id;
    b.append(
      Object.assign(document.createElement("strong"), { textContent: item.title }),
      Object.assign(document.createElement("span"), { textContent: item.meta }),
    );
    b.addEventListener("click", () => {
      refInput.value = item.id;
      for (const other of dialog.querySelectorAll(".result")) other.removeAttribute("aria-pressed");
      b.setAttribute("aria-pressed", "true");
      updatePreview();
      // The next Enter applies the choice.
      $("person-apply").focus();
    });
    li.append(b);
    list.append(li);
  }
}

async function runRegisterSearch() {
  const query = $("person-query").value;
  try {
    const hits = await searchRegister(source.person.register, query, source.person.ignore);
    $("register-heading").textContent = `${source.person.registerLabel}${hits.length ? "" : ": keine Treffer"}`;
    renderResults(
      $("register-results"),
      hits.map((p) => ({ id: p.id, title: p.name, meta: [p.dates, p.gnd && `GND ${p.gnd}`, p.id].filter(Boolean).join(" | ") })),
    );
  } catch (err) {
    setStatus($("person-status"), "error", err instanceof Error ? err.message : String(err));
  }
}

async function runGndSearch() {
  const query = cleanQuery($("person-query").value, source.person.ignore);
  if (!query) return;
  $("gnd-heading").hidden = false;
  setStatus($("person-status"), "", "Suche in der GND …");
  try {
    const persons = await searchPersons(query);
    setStatus($("person-status"), "", persons.length ? "" : "Keine GND-Treffer. Suchbegriff ändern oder Kennung direkt eingeben.");
    renderResults(
      $("person-results"),
      persons.map((p) => ({ id: p.id, title: p.name, meta: [p.dates, p.info, `GND ${p.id}`].filter(Boolean).join(" | ") })),
    );
  } catch (err) {
    setStatus($("person-status"), "error", err instanceof Error ? err.message : String(err));
  }
}

/** @param {{ from: number, to: number, text: string }} sel */
function openPersonDialog(sel) {
  pending = sel;
  $("person-text").textContent = sel.text;
  // HTR marker syntax and forms of address are no part of a name.
  const name = sel.text.replace(/~~|\[\?\]|[{}]/g, "").trim();
  $("person-query").value = cleanQuery(name, source.person.ignore) || name;
  refInput.value = "";
  $("person-results").replaceChildren();
  $("gnd-heading").hidden = true;
  setStatus($("person-status"), "", "");
  updatePreview();
  dialog.showModal();
  runRegisterSearch();
}

// Typing searches the register at once; the GND is asked on request, since
// it is a network service and the register covers the edition's persons.
$("person-query").addEventListener("input", () => {
  clearTimeout(registerTimer);
  registerTimer = window.setTimeout(runRegisterSearch, 150);
});
$("person-search").addEventListener("click", runGndSearch);
$("person-query").addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runGndSearch();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    /** @type {HTMLElement | null} */ (dialog.querySelector(".result"))?.focus();
  }
});
// Arrow keys move through both result lists as one.
dialog.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
  const current = /** @type {HTMLElement} */ (e.target);
  if (!current.classList?.contains("result") || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
  e.preventDefault();
  const all = /** @type {HTMLElement[]} */ ([...dialog.querySelectorAll(".result")]);
  const i = all.indexOf(current);
  if (e.key === "ArrowUp" && i === 0) $("person-query").focus();
  else all[Math.min(Math.max(i + (e.key === "ArrowDown" ? 1 : -1), 0), all.length - 1)].focus();
});
refInput.addEventListener("input", updatePreview);
$("person-cancel").addEventListener("click", () => dialog.close());
$("person-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
  const ref = chosenRef();
  if (!ref) {
    e.preventDefault();
    setStatus($("person-status"), "error", "Bitte einen Treffer wählen oder eine Kennung eingeben, etwa SZDPER.2188 oder eine GND-ID.");
    return;
  }
  // The document may have changed while the dialog was open; only apply if the
  // marked text is still where it was.
  if (editor.slice(pending.from, pending.to) !== pending.text) {
    setStatus(xmlStatus, "error", "Der markierte Text hat sich verändert; bitte erneut markieren.");
    return;
  }
  editor.replace(pending.from, pending.to, source.person.markup(pending.text, ref));
});
dialog.addEventListener("close", () => editor.focus());

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
  } catch (err) {
    setStatus(iiifStatus, "error", err instanceof Error ? err.message : String(err));
    toggleSource(true);
  }
}

/** @param {boolean} [open] */
function toggleSource(open) {
  const form = $("iiif-form");
  const show = open ?? form.hidden;
  form.hidden = !show;
  $("source-toggle").setAttribute("aria-expanded", String(show));
  if (show && open === undefined) iiifInput.focus();
}

$("source-toggle").addEventListener("click", () => toggleSource());
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

// Changes since opening or saving, as a line comparison before a commit.

const diffDialog = /** @type {HTMLDialogElement} */ ($("diff-dialog"));

function showChanges() {
  const lines = lineDiff(savedText, editor.text);
  const groups = hunks(lines);
  const removed = lines.filter((l) => l.kind === "del").length;
  const added = lines.filter((l) => l.kind === "add").length;
  $("diff-title").textContent = `Änderungen seit dem ${savedBy}`;
  $("diff-summary").textContent = groups.length
    ? `${removed} ${removed === 1 ? "Zeile" : "Zeilen"} entfernt, ${added} hinzugefügt, an ${groups.length} ${groups.length === 1 ? "Stelle" : "Stellen"}.`
    : `Keine Änderungen seit dem ${savedBy}.`;
  /** @type {Record<string, [string, string]>} */
  const sign = { same: ["", ""], del: ["−", "entfernt"], add: ["+", "hinzugefügt"] };
  const body = $("diff-body");
  body.replaceChildren();
  for (const group of groups) {
    const section = document.createElement("section");
    const at = group.find((l) => l.kind !== "same") ?? group[0];
    // The jump goes to the current text; a removed line points to where it stood.
    const line = at.b || (group.filter((l) => l.b && l.a < at.a).pop()?.b ?? 0) + 1;
    const jump = Object.assign(document.createElement("button"), { type: "button", className: "link", textContent: `Zeile ${line}` });
    jump.addEventListener("click", () => {
      diffDialog.close();
      editor.jumpTo(line, 1);
    });
    section.append(jump);
    for (const l of group) {
      const row = document.createElement("div");
      row.className = "diff-row";
      row.dataset.kind = l.kind;
      const [mark, word] = sign[l.kind];
      const signEl = Object.assign(document.createElement("span"), { className: "diff-sign", textContent: mark });
      signEl.setAttribute("aria-hidden", "true");
      row.append(
        Object.assign(document.createElement("span"), { className: "diff-no", textContent: l.a ? String(l.a) : "" }),
        Object.assign(document.createElement("span"), { className: "diff-no", textContent: l.b ? String(l.b) : "" }),
        signEl,
        Object.assign(document.createElement("span"), { className: "diff-text", textContent: l.text }),
      );
      if (word) row.prepend(Object.assign(document.createElement("span"), { className: "visually-hidden", textContent: `${word}: ` }));
      section.append(row);
    }
    body.append(section);
  }
  diffDialog.showModal();
}

$("diff-button").addEventListener("click", showChanges);

/**
 * Asks a question in a modal dialog and resolves to the value of the chosen
 * button, or "" when it is dismissed with Escape. The first choice is the
 * safe one and receives the focus.
 * @param {{ title: string, text: string, choices: { value: string, label: string, primary?: boolean }[] }} question
 * @returns {Promise<string>}
 */
function ask({ title, text, choices }) {
  const box = /** @type {HTMLDialogElement} */ ($("ask-dialog"));
  $("ask-title").textContent = title;
  $("ask-text").textContent = text;
  $("ask-actions").replaceChildren(
    ...choices.map((c) => Object.assign(document.createElement("button"), { type: "submit", value: c.value, textContent: c.label, className: c.primary ? "primary" : "" })),
  );
  box.returnValue = "";
  box.showModal();
  /** @type {HTMLElement} */ (box.querySelector("button")).focus();
  return new Promise((resolve) => box.addEventListener("close", () => resolve(box.returnValue), { once: true }));
}

// Opening and saving. Where the File System Access API exists, a file opened
// from a local clone of the data repository is saved back in place, ready to
// commit; elsewhere the input element opens and a download saves.

/** Shows whether the text differs from what was last opened or saved. */
function updateSaveState() {
  $("save-state").textContent = editor.text === savedText ? "" : "Ungespeicherte Änderungen";
}

/** @param {string} text */
function openText(text) {
  editor.setText(text);
  savedText = editor.text;
  savedBy = "Öffnen";
  validatedOnce = false;
  updateSaveState();
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

const canWriteInPlace = "showOpenFilePicker" in window;
const XML_TYPES = [{ description: "TEI/XML", accept: { "application/xml": [".xml"] } }];

/** Asks before replacing unsaved work with another document. */
async function mayDiscard() {
  if (editor.text === savedText) return true;
  const choice = await ask({
    title: "Ungespeicherte Änderungen",
    text: `${fileName} enthält Änderungen, die noch nicht gespeichert sind. Beim Öffnen einer anderen Datei gehen sie verloren.`,
    choices: [
      { value: "", label: "Abbrechen" },
      { value: "discard", label: "Verwerfen und öffnen" },
    ],
  });
  return choice === "discard";
}

$("tei-open").addEventListener("click", async () => {
  if (!(await mayDiscard())) return;
  if (!canWriteInPlace) {
    $("tei-file").click();
    return;
  }
  try {
    const [handle] = await /** @type {any} */ (window).showOpenFilePicker({ types: XML_TYPES });
    const file = await handle.getFile();
    fileHandle = handle;
    fileName = file.name;
    diskModified = file.lastModified;
    openText(await file.text());
    showUnlisted();
  } catch (err) {
    if (/** @type {any} */ (err)?.name !== "AbortError") setStatus(xmlStatus, "error", `Öffnen fehlgeschlagen: ${err}`);
  }
});
$("tei-file").addEventListener("change", async (/** @type {Event} */ e) => {
  const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
  if (!file) return;
  fileHandle = null;
  diskModified = null;
  fileName = file.name;
  openText(await file.text());
  showUnlisted();
});

/**
 * Before writing in place, the file on disk is compared with the state seen
 * at opening or last saving, since a pull or another program may have changed
 * it. Resolves to the handle to write to, or null when the user keeps the file.
 * @param {any} handle
 */
async function confirmTarget(handle) {
  if (diskModified === null) return handle;
  let current = Number.NaN;
  try {
    current = (await handle.getFile()).lastModified;
  } catch {
    // Moved or deleted on disk; asking is the safe answer.
  }
  if (current === diskModified) return handle;
  const changed = Number.isNaN(current)
    ? `${handle.name} ist auf der Festplatte nicht mehr lesbar, vielleicht verschoben oder gelöscht.`
    : `${handle.name} wurde seit dem ${savedBy} auf der Festplatte geändert, zuletzt am ${new Date(current).toLocaleString("de-AT")}, etwa durch einen Git-Pull.`;
  const choice = await ask({
    title: "Datei auf der Festplatte geändert",
    text: `${changed} Überschreiben ersetzt diese Fassung durch den Text im Editor. Der Text im Editor bleibt in jedem Fall erhalten.`,
    choices: [
      { value: "", label: "Abbrechen" },
      { value: "copy", label: "Als neue Datei speichern" },
      { value: "overwrite", label: "Überschreiben", primary: true },
    ],
  });
  if (choice === "overwrite") return handle;
  if (choice === "copy") return /** @type {any} */ (window).showSaveFilePicker({ suggestedName: handle.name, types: XML_TYPES });
  return null;
}

let saving = false;

async function save() {
  // A second Ctrl+S while the question is open must not ask twice.
  if (saving) return;
  saving = true;
  try {
    await saveNow();
  } finally {
    saving = false;
  }
}

async function saveNow() {
  // Run the pending check now, so it cannot overwrite the save confirmation.
  clearTimeout(checkTimer);
  checkSource();
  if (canWriteInPlace) {
    try {
      const target = fileHandle
        ? await confirmTarget(fileHandle)
        : await /** @type {any} */ (window).showSaveFilePicker({ suggestedName: fileName, types: XML_TYPES });
      if (!target) {
        setStatus(xmlStatus, "error", "Nicht gespeichert. Der Text im Editor ist unverändert erhalten.");
        return;
      }
      const text = editor.text;
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      fileHandle = target;
      fileName = fileHandle.name;
      diskModified = (await fileHandle.getFile()).lastModified;
      savedText = text;
      savedBy = "Speichern";
      updateSaveState();
      setStatus(xmlStatus, "ok", `Gespeichert in ${fileName}.`);
      $("doc-meta").textContent = [fileName, source.name].join(" | ");
    } catch (err) {
      if (/** @type {any} */ (err)?.name !== "AbortError") setStatus(xmlStatus, "error", `Speichern fehlgeschlagen: ${err}`);
    }
    return;
  }
  const text = editor.text;
  const blob = new Blob([text], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  savedText = text;
  savedBy = "Speichern";
  updateSaveState();
  setStatus(xmlStatus, "ok", `Als ${fileName} heruntergeladen.`);
}

$("tei-save").addEventListener("click", save);
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.defaultPrevented) {
    e.preventDefault();
    save();
  }
});
// The browser asks before a tab with unsaved work is closed or reloaded.
window.addEventListener("beforeunload", (e) => {
  if (editor.text !== savedText) e.preventDefault();
});

// Documents of the repository, by collection. A document loaded from the list
// is saved by download or to a chosen file; opening it from the local clone
// with the open button saves it in place.

const picker = /** @type {HTMLSelectElement} */ ($("doc-pick"));

/** @param {string} path */
async function loadDocument(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    const text = await r.text();
    fileHandle = null;
    diskModified = null;
    fileName = path.split("/").pop() ?? fileName;
    openText(text);
    picker.value = path;
  } catch (err) {
    setStatus(xmlStatus, "error", `Dokument nicht geladen: ${err instanceof Error ? err.message : err}`);
  }
}

/** A file opened from disk is no entry of the list, so the list shows none. */
function showUnlisted() {
  picker.value = "";
  picker.dataset.current = "";
}

picker.addEventListener("change", async () => {
  const path = picker.value;
  if (!(await mayDiscard())) {
    picker.value = picker.dataset.current ?? "";
    return;
  }
  picker.dataset.current = path;
  loadDocument(path);
});

fetch(source.documents)
  .then((r) => (r.ok ? r.json() : { collections: [] }))
  .then((/** @type {{ collections: { label: string, documents: { path: string, objectId: string, title: string }[] }[] }} */ index) => {
    for (const c of index.collections) {
      const group = Object.assign(document.createElement("optgroup"), { label: c.label });
      for (const d of c.documents) group.append(new Option(d.title, d.path));
      picker.append(group);
    }
    picker.value = source.defaultDocument;
    picker.dataset.current = source.defaultDocument;
  })
  .catch(() => (picker.hidden = true));

loadDocument(source.defaultDocument);
