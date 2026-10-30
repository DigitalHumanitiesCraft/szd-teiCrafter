import { resolveIiif } from "./iiif.js";
import { source } from "./source.js";
import { documentFacts, pageAtOffset, parseXml } from "./tei.js";
import { createViewer } from "./viewer.js";

const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

const editor = /** @type {HTMLTextAreaElement} */ ($("tei-source"));
const xmlStatus = $("xml-status");
const iiifStatus = $("iiif-status");
const iiifInput = /** @type {HTMLInputElement} */ ($("iiif-url"));
const pageLabel = $("page-label");

let fileName = source.defaultDocument.split("/").pop() ?? "dokument.tei.xml";
/** @type {string[]} */
let pageLabels = [];

const viewer = createViewer($("viewer"), (index, count) => {
  const label = pageLabels[index] ?? String(index + 1);
  pageLabel.textContent = `Seite ${label} von ${count}`;
  $("page-prev").disabled = index === 0;
  $("page-next").disabled = index === count - 1;
});
viewer.onError((message) => setStatus(iiifStatus, "error", message));

/** @param {HTMLElement} el @param {"ok" | "error" | ""} state @param {string} message */
function setStatus(el, state, message) {
  el.dataset.state = state;
  el.textContent = message;
}

/** Re-reads the source after each edit; facts update only while well-formed. */
function checkSource() {
  const { doc, error } = parseXml(editor.value);
  if (!doc) {
    setStatus(xmlStatus, "error", `Nicht wohlgeformt: ${error}`);
    return null;
  }
  const facts = documentFacts(doc);
  setStatus(xmlStatus, "ok", "Wohlgeformt");
  $("doc-title").textContent = facts.title || "teiCrafter SZD";
  $("doc-meta").textContent = [facts.idnos.objectId, source.name].filter(Boolean).join(" | ");
  return facts;
}

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
