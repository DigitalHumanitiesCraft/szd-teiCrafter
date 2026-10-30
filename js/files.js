// Opening and saving. Where the File System Access API exists, a file opened
// from a local clone of the data repository is saved back in place, ready to
// commit; elsewhere the input element opens and a download saves. The text as
// last opened or saved is kept, so any difference counts as unsaved work.

import { $, ask } from "./ui.js";

const canWriteInPlace = "showOpenFilePicker" in window;
const XML_TYPES = [{ description: "TEI/XML", accept: { "application/xml": [".xml"] } }];

/**
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   fallbackName: string,
 *   report: (state: "ok" | "error", message: string) => void,
 *   onOpened: () => void,
 *   beforeSave: () => void,
 *   onSaved: () => void,
 * }} options
 */
export function createFiles({ editor, fallbackName, report, onOpened, beforeSave, onSaved }) {
  let name = fallbackName;
  /** Repository path of a document loaded from the server, "" for a file from disk. */
  let path = "";
  /** File handle when the document was opened through the File System Access API. */
  let handle = /** @type {any} */ (null);
  /** lastModified of the opened file on disk at open or last save, null without a handle. */
  let diskModified = /** @type {number | null} */ (null);
  let savedText = "";
  /** Whether savedText comes from opening or from saving, for titles and questions. */
  let savedBy = "Öffnen";
  let saving = false;

  const unsaved = () => editor.text !== savedText;

  /** Shows whether the text differs from what was last opened or saved. */
  function updateMark() {
    const dirty = unsaved();
    $("save-state").textContent = dirty ? "Ungespeicherte Änderungen" : "";
    $("tei-save").toggleAttribute("data-unsaved", dirty);
    $("tei-save").dataset.tip = dirty ? "Ungespeicherte Änderungen speichern (Strg+S)" : "TEI speichern (Strg+S)";
  }

  /**
   * @param {string} text
   * @param {{ name: string, path?: string, handle?: any, modified?: number | null }} from
   */
  function open(text, from) {
    name = from.name;
    path = from.path ?? "";
    handle = from.handle ?? null;
    diskModified = from.modified ?? null;
    editor.setText(text);
    savedText = editor.text;
    savedBy = "Öffnen";
    updateMark();
    onOpened();
  }

  /** Asks before replacing unsaved work with another document. */
  async function mayDiscard() {
    if (!unsaved()) return true;
    const choice = await ask({
      title: "Ungespeicherte Änderungen",
      text: `${name} enthält Änderungen, die noch nicht gespeichert sind. Beim Öffnen einer anderen Datei gehen sie verloren.`,
      choices: [
        { value: "", label: "Abbrechen" },
        { value: "discard", label: "Verwerfen und öffnen" },
      ],
    });
    return choice === "discard";
  }

  /** @param {string} url a document of the repository */
  async function load(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Status ${r.status}`);
      open(await r.text(), { name: url.split("/").pop() ?? name, path: url });
    } catch (err) {
      report("error", `Dokument nicht geladen: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Before writing in place, the file on disk is compared with the state seen
   * at opening or last saving, since a pull or another program may have changed
   * it. Resolves to the handle to write to, or null when the user keeps the file.
   * @param {any} target
   */
  async function confirmTarget(target) {
    if (diskModified === null) return target;
    let current = Number.NaN;
    try {
      current = (await target.getFile()).lastModified;
    } catch {
      // Moved or deleted on disk; asking is the safe answer.
    }
    if (current === diskModified) return target;
    const changed = Number.isNaN(current)
      ? `${target.name} ist auf der Festplatte nicht mehr lesbar, vielleicht verschoben oder gelöscht.`
      : `${target.name} wurde seit dem ${savedBy} auf der Festplatte geändert, zuletzt am ${new Date(current).toLocaleString("de-AT")}, etwa durch einen Git-Pull.`;
    const choice = await ask({
      title: "Datei auf der Festplatte geändert",
      text: `${changed} Überschreiben ersetzt diese Fassung durch den Text im Editor. Der Text im Editor bleibt in jedem Fall erhalten.`,
      choices: [
        { value: "", label: "Abbrechen" },
        { value: "copy", label: "Als neue Datei speichern" },
        { value: "overwrite", label: "Überschreiben", primary: true },
      ],
    });
    if (choice === "overwrite") return target;
    if (choice === "copy") return /** @type {any} */ (window).showSaveFilePicker({ suggestedName: target.name, types: XML_TYPES });
    return null;
  }

  /** @param {string} text */
  function markSaved(text) {
    savedText = text;
    savedBy = "Speichern";
    updateMark();
  }

  async function saveNow() {
    beforeSave();
    if (!canWriteInPlace) {
      const text = editor.text;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/xml" }));
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      markSaved(text);
      report("ok", `Als ${name} heruntergeladen.`);
      return;
    }
    try {
      const target = handle ? await confirmTarget(handle) : await /** @type {any} */ (window).showSaveFilePicker({ suggestedName: name, types: XML_TYPES });
      if (!target) {
        report("error", "Nicht gespeichert. Der Text im Editor ist unverändert erhalten.");
        return;
      }
      const text = editor.text;
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      handle = target;
      name = target.name;
      diskModified = (await target.getFile()).lastModified;
      markSaved(text);
      report("ok", `Gespeichert in ${name}.`);
      onSaved();
    } catch (err) {
      if (/** @type {any} */ (err)?.name !== "AbortError") report("error", `Speichern fehlgeschlagen: ${err}`);
    }
  }

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

  $("tei-open").addEventListener("click", async () => {
    if (!(await mayDiscard())) return;
    if (!canWriteInPlace) {
      $("tei-file").click();
      return;
    }
    try {
      const [picked] = await /** @type {any} */ (window).showOpenFilePicker({ types: XML_TYPES });
      const file = await picked.getFile();
      open(await file.text(), { name: file.name, handle: picked, modified: file.lastModified });
    } catch (err) {
      if (/** @type {any} */ (err)?.name !== "AbortError") report("error", `Öffnen fehlgeschlagen: ${err}`);
    }
  });
  $("tei-file").addEventListener("change", async (/** @type {Event} */ e) => {
    const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
    if (file) open(await file.text(), { name: file.name });
  });
  $("tei-save").addEventListener("click", save);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.defaultPrevented) {
      e.preventDefault();
      save();
    }
  });
  // The browser asks before a tab with unsaved work is closed or reloaded.
  window.addEventListener("beforeunload", (e) => {
    if (unsaved()) e.preventDefault();
  });

  return {
    get name() {
      return name;
    },
    get path() {
      return path;
    },
    get savedText() {
      return savedText;
    },
    get savedBy() {
      return savedBy;
    },
    load,
    mayDiscard,
    save,
    updateMark,
  };
}
