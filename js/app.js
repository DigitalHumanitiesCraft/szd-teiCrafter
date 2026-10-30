import { attachHighlight } from "./highlight.js";
import { resolveIiif } from "./iiif.js";
import { source } from "./source.js";
import { attachSplit } from "./split.js";
import { documentFacts, offsetOf, pageAtOffset, parseXml } from "./tei.js";
import { validateTeiAll } from "./validate.js";
import { createViewer } from "./viewer.js";

const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

const editor = /** @type {HTMLTextAreaElement} */ ($("tei-source"));
const xmlStatus = $("xml-status");
const iiifStatus = $("iiif-status");
const iiifInput = /** @type {HTMLInputElement} */ ($("iiif-url"));
const pageLabel = $("page-label");
const wfButton = $("wf-button");
const validButton = $("valid-button");

let fileName = source.defaultDocument.split("/").pop() ?? "dokument.tei.xml";
/** @type {string[]} */
let pageLabels = [];
/** @type {import("./tei.js").XmlError | null} */
let xmlError = null;

const renderHighlight = attachHighlight(editor, $("tei-highlight"));

const viewer = createViewer($("viewer"), (index, count) => {
  const label = pageLabels[index] ?? String(index + 1);
  pageLabel.textContent = `Seite ${label} von ${count}`;
  $("page-prev").disabled = index === 0;
  $("page-next").disabled = index === count - 1;
});
viewer.onError((message) => setStatus(iiifStatus, "error", message));

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
 */
function setCheck(button, state, label) {
  button.dataset.state = state;
  button.querySelector("span").textContent = label;
  const icon = state === "ok" ? "#i-ok" : state === "error" ? "#i-error" : button === wfButton ? "#i-ok" : "#i-validate";
  button.querySelector("use").setAttribute("href", icon);
}

/** @param {number} line @param {number} column */
function jumpTo(line, column) {
  const offset = offsetOf(editor.value, line, column);
  editor.focus();
  editor.setSelectionRange(offset, offset);
  // Scroll the line into the middle of the textarea.
  const lineHeight = Number.parseFloat(getComputedStyle(editor).lineHeight) || 20;
  editor.scrollTop = Math.max(0, (line - 1) * lineHeight - editor.clientHeight / 2);
  followCaret();
}

/** Re-reads the source after each edit; facts update only while well-formed. */
function checkSource() {
  const { doc, error } = parseXml(editor.value);
  xmlError = error;
  // Any edit makes an earlier validation result stale.
  setCheck(validButton, "stale", "Validieren");
  if (!doc) {
    setCheck(wfButton, "error", error?.line ? `Fehler Zeile ${error.line}` : "Nicht wohlgeformt");
    showMessages([{ message: `Nicht wohlgeformt: ${error?.message}`, line: error?.line ?? 0, column: error?.column ?? 0 }]);
    return null;
  }
  setCheck(wfButton, "ok", "Wohlgeformt");
  showMessages([]);
  const facts = documentFacts(doc);
  $("doc-title").textContent = facts.title || "teiCrafter SZD";
  $("doc-meta").textContent = [facts.idnos.objectId, source.name].filter(Boolean).join(" | ");
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
      b.addEventListener("click", () => jumpTo(item.line, item.column));
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
  if (xmlError?.line) jumpTo(xmlError.line, xmlError.column);
});

validButton.addEventListener("click", async () => {
  if (!checkSource()) {
    setCheck(validButton, "error", "Nicht prüfbar");
    return;
  }
  const text = editor.value;
  setCheck(validButton, "busy", "Prüfe …");
  validButton.disabled = true;
  try {
    const problems = await validateTeiAll(text);
    if (editor.value !== text) return; // edited meanwhile; result no longer applies
    if (problems.length) {
      setCheck(validButton, "error", `${problems.length} Schemafehler`);
      showMessages(problems);
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
  }
}

/** @param {string} text */
function openText(text) {
  editor.value = text;
  editor.setSelectionRange(0, 0);
  editor.scrollTop = 0;
  renderHighlight();
  const facts = checkSource();
  const manifest = facts && source.manifestFor(facts.idnos);
  if (manifest) {
    iiifInput.value = manifest;
    loadImages(manifest);
  }
}

// The facsimile follows the caret: the page is the last <pb> before it.
function followCaret() {
  viewer.show(pageAtOffset(editor.value, editor.selectionStart));
}

let debounce = 0;
editor.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = window.setTimeout(checkSource, 300);
});
editor.addEventListener("keyup", followCaret);
editor.addEventListener("click", followCaret);

$("iiif-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
  e.preventDefault();
  loadImages(iiifInput.value.trim());
});
$("page-prev").addEventListener("click", () => viewer.show(viewer.index - 1));
$("page-next").addEventListener("click", () => viewer.show(viewer.index + 1));
$("rot-left").addEventListener("click", () => viewer.rotate(-90));
$("rot-right").addEventListener("click", () => viewer.rotate(90));

$("tei-file").addEventListener("change", async (/** @type {Event} */ e) => {
  const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
  if (!file) return;
  fileName = file.name;
  openText(await file.text());
});

// Download is the save path in every browser; in-place writing via the File
// System Access API is a later enhancement behind a capability check.
$("tei-save").addEventListener("click", () => {
  const blob = new Blob([editor.value], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
});

fetch(source.defaultDocument)
  .then((r) => {
    if (!r.ok) throw new Error(`Status ${r.status}`);
    return r.text();
  })
  .then(openText)
  .catch((err) => setStatus(xmlStatus, "error", `Beispieldokument nicht geladen: ${err.message}`));
