import { createEditor } from "./editor.js";
import { isGndId, searchPersons } from "./gnd.js";
import { resolveIiif } from "./iiif.js";
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
let menuTimer = 0;

const editor = createEditor($("editor"), {
  elements: source.elements,
  keys: [
    { key: "Mod-.", run: () => openMenu(true) },
    { key: "F8", run: () => nextOpenSpot() },
  ],
  onChange() {
    clearTimeout(checkTimer);
    checkTimer = window.setTimeout(checkSource, 300);
  },
  onCaret(offset) {
    const before = editor.slice(0, offset);
    viewer.show(pageAtOffset(before, before.length));
    clearTimeout(menuTimer);
    menuTimer = window.setTimeout(() => openMenu(false), 150);
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
  // Any edit makes an earlier validation result stale.
  setCheck(validButton, "stale", "Validieren", "#i-validate");
  updateOpenWork();
  if (!doc) {
    setCheck(wfButton, "error", error?.line ? `Fehler Zeile ${error.line}` : "Nicht wohlgeformt");
    const problem = { message: `Nicht wohlgeformt: ${error?.message}`, line: error?.line ?? 0, column: error?.column ?? 0 };
    showMessages([problem]);
    editor.setProblems([problem]);
    return null;
  }
  setCheck(wfButton, "ok", "Wohlgeformt");
  showMessages([]);
  editor.setProblems([]);
  const facts = documentFacts(doc);
  $("doc-title").textContent = facts.title || "teiCrafter SZD";
  $("doc-meta").textContent = [fileName, source.name].filter(Boolean).join(" | ");
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
    if (problems.length) {
      setCheck(validButton, "error", `${problems.length} Schemafehler`);
      showMessages(problems);
      editor.setProblems(problems);
    } else {
      setCheck(validButton, "ok", "TEI-konform");
      showMessages([], "Gültig gegen TEI All (P5 4.11.0).");
    }
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
  if (!spots.length) return true;
  const { from } = editor.selection();
  const next = spots.find((s) => s.from > from) ?? spots[0];
  editor.select(next.from, next.to);
  openMenu(true);
  return true;
}

workButton.addEventListener("click", nextOpenSpot);
document.addEventListener("keydown", (e) => {
  if (e.key === "F8" && !e.defaultPrevented && !$("person-dialog").open) {
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

/** The wrap whose marker syntax the whole selection carries, if any. */
function suggestedAction() {
  const { text } = editor.selection();
  return source.wraps.find((w) => w.strip(text) !== text)?.key ?? null;
}

function positionMenu() {
  const at = editor.selectionCoords();
  if (!at) {
    menu.hidden = true;
    return;
  }
  const width = menu.offsetWidth || 320;
  menu.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
  menu.style.top = `${Math.min(at.bottom + 6, window.innerHeight - menu.offsetHeight - 8)}px`;
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

// Person dialog

const dialog = /** @type {HTMLDialogElement} */ ($("person-dialog"));
const gndInput = /** @type {HTMLInputElement} */ ($("person-gnd"));
let pending = { from: 0, to: 0, text: "" };

function updatePreview() {
  const id = gndInput.value.trim();
  $("person-preview").textContent = isGndId(id) ? source.person.markup(pending.text, id) : "";
}

async function runPersonSearch() {
  const query = $("person-query").value.trim();
  const list = $("person-results");
  list.replaceChildren();
  if (!query) return;
  setStatus($("person-status"), "", "Suche in der GND …");
  try {
    const persons = await searchPersons(query);
    setStatus($("person-status"), "", persons.length ? "" : "Keine Treffer. Suchbegriff ändern oder GND-ID direkt eingeben.");
    for (const p of persons) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "result";
      const name = Object.assign(document.createElement("strong"), { textContent: p.name });
      const meta = Object.assign(document.createElement("span"), { textContent: [p.dates, p.info, `GND ${p.id}`].filter(Boolean).join(" | ") });
      b.append(name, meta);
      b.addEventListener("click", () => {
        gndInput.value = p.id;
        for (const other of list.querySelectorAll(".result")) other.removeAttribute("aria-pressed");
        b.setAttribute("aria-pressed", "true");
        updatePreview();
      });
      li.append(b);
      list.append(li);
    }
  } catch (err) {
    setStatus($("person-status"), "error", err instanceof Error ? err.message : String(err));
  }
}

/** @param {{ from: number, to: number, text: string }} sel */
function openPersonDialog(sel) {
  pending = sel;
  $("person-text").textContent = sel.text;
  $("person-query").value = sel.text.trim();
  gndInput.value = "";
  updatePreview();
  dialog.showModal();
  runPersonSearch();
}

$("person-search").addEventListener("click", runPersonSearch);
$("person-query").addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runPersonSearch();
  }
});
gndInput.addEventListener("input", updatePreview);
$("person-cancel").addEventListener("click", () => dialog.close());
$("person-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
  const id = gndInput.value.trim();
  if (!isGndId(id)) {
    e.preventDefault();
    setStatus($("person-status"), "error", "Bitte einen Treffer wählen oder eine gültige GND-ID eingeben.");
    return;
  }
  // The document may have changed while the dialog was open; only apply if the
  // marked text is still where it was.
  if (editor.slice(pending.from, pending.to) !== pending.text) {
    setStatus(xmlStatus, "error", "Der markierte Text hat sich verändert; bitte erneut markieren.");
    return;
  }
  editor.replace(pending.from, pending.to, source.person.markup(pending.text, id));
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

// Opening and saving. Where the File System Access API exists, a file opened
// from a local clone of the data repository is saved back in place, ready to
// commit; elsewhere the input element opens and a download saves.

/** @param {string} text */
function openText(text) {
  editor.setText(text);
  const facts = checkSource();
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

$("tei-open").addEventListener("click", async () => {
  if (!canWriteInPlace) {
    $("tei-file").click();
    return;
  }
  try {
    const [handle] = await /** @type {any} */ (window).showOpenFilePicker({ types: XML_TYPES });
    const file = await handle.getFile();
    fileHandle = handle;
    fileName = file.name;
    openText(await file.text());
  } catch (err) {
    if (/** @type {any} */ (err)?.name !== "AbortError") setStatus(xmlStatus, "error", `Öffnen fehlgeschlagen: ${err}`);
  }
});
$("tei-file").addEventListener("change", async (/** @type {Event} */ e) => {
  const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
  if (!file) return;
  fileHandle = null;
  fileName = file.name;
  openText(await file.text());
});

$("tei-save").addEventListener("click", async () => {
  // Run the pending check now, so it cannot overwrite the save confirmation.
  clearTimeout(checkTimer);
  checkSource();
  const text = editor.text;
  if (canWriteInPlace) {
    try {
      fileHandle ??= await /** @type {any} */ (window).showSaveFilePicker({ suggestedName: fileName, types: XML_TYPES });
      const writable = await fileHandle.createWritable();
      await writable.write(text);
      await writable.close();
      fileName = fileHandle.name;
      setStatus(xmlStatus, "ok", `Gespeichert in ${fileName}.`);
      $("doc-meta").textContent = [fileName, source.name].join(" | ");
      return;
    } catch (err) {
      if (/** @type {any} */ (err)?.name === "AbortError") return;
      setStatus(xmlStatus, "error", `Speichern fehlgeschlagen: ${err}`);
      return;
    }
  }
  const blob = new Blob([text], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus(xmlStatus, "ok", `Als ${fileName} heruntergeladen.`);
});

fetch(source.defaultDocument)
  .then((r) => {
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return r.text();
  })
  .then(openText)
  .catch((err) => setStatus(xmlStatus, "error", `Beispieldokument nicht geladen: ${err.message}`));
