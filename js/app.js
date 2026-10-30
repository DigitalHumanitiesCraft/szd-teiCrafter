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
let validatedOnce = false;

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
  validatedOnce = false;
  updateSaveState();
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

/**
 * Asks before replacing unsaved work with another document. Deliberate
 * shortcut: the browser's confirm(); a <dialog> with the same two choices is
 * the upgrade path once the project page opens documents too.
 */
function mayDiscard() {
  return editor.text === savedText || window.confirm("Ungespeicherte Änderungen verwerfen?");
}

$("tei-open").addEventListener("click", async () => {
  if (!mayDiscard()) return;
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

async function save() {
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
      savedText = text;
      updateSaveState();
      setStatus(xmlStatus, "ok", `Gespeichert in ${fileName}.`);
      $("doc-meta").textContent = [fileName, source.name].join(" | ");
    } catch (err) {
      if (/** @type {any} */ (err)?.name !== "AbortError") setStatus(xmlStatus, "error", `Speichern fehlgeschlagen: ${err}`);
    }
    return;
  }
  const blob = new Blob([text], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
  savedText = text;
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

fetch(source.defaultDocument)
  .then((r) => {
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return r.text();
  })
  .then(openText)
  .catch((err) => setStatus(xmlStatus, "error", `Beispieldokument nicht geladen: ${err.message}`));
