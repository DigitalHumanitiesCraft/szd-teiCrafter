// Opening and saving. Where the File System Access API exists, a file opened
// from a local clone of the data repository is saved back in place, ready to
// commit; elsewhere the input element opens and a download saves. The text as
// last opened or saved is kept, so any difference counts as unsaved work.
// Files are read as UTF-8 only and a byte order mark is kept, so saving
// changes no byte the user did not edit.

import { $, ask } from "./ui.js";

const XML_TYPES = [{ description: "TEI/XML", accept: { "application/xml": [".xml"] } }];
const BOM = "﻿";

/** Whether files can be written in place; checked per call, so Node can import this module. */
const canWriteInPlace = () => "showOpenFilePicker" in globalThis;

/**
 * Decodes the bytes of an XML file. Only UTF-8 is accepted, with or without a
 * byte order mark, because another encoding would be rewritten as UTF-8 on
 * saving, and invalid bytes would be replaced; both change the file silently.
 * @param {ArrayBuffer | Uint8Array} buffer @param {string} name for messages
 * @returns {{ text: string, bom: boolean }}
 * @throws {Error} with a German message naming why the file is not opened
 */
export function decodeXml(buffer, name) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if ((bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe)) {
    throw new Error(`${name} ist in UTF-16 kodiert. Der Editor öffnet nur UTF-8, damit beim Speichern kein Zeichen verändert wird.`);
  }
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bom ? bytes.subarray(3) : bytes);
  } catch {
    throw new Error(`${name} ist kein gültiges UTF-8, vielleicht Latin-1 oder Windows-1252. Der Editor öffnet nur UTF-8, damit beim Speichern kein Zeichen verändert wird.`);
  }
  const declared = /^<\?xml\s[^>]*?\bencoding\s*=\s*["']([^"']*)["']/.exec(text)?.[1];
  if (declared && !/^utf-?8$/i.test(declared)) {
    throw new Error(`${name} erklärt die Kodierung ${declared}. Der Editor öffnet nur UTF-8, damit beim Speichern kein Zeichen verändert wird.`);
  }
  return { text, bom };
}

/**
 * Write permission is requested before the file on disk is compared, so the
 * permission prompt, which may stay open for a while, cannot fall between
 * the comparison and the writing. Handles without the permission methods
 * (older implementations, test stubs) are taken as writable.
 * @param {any} target
 */
export async function mayWrite(target) {
  if (typeof target.queryPermission !== "function") return true;
  if ((await target.queryPermission({ mode: "readwrite" })) === "granted") return true;
  return (await target.requestPermission({ mode: "readwrite" })) === "granted";
}

/**
 * Writes into a file handle without overwriting a version the user has not
 * seen. `stamp` reads what identifies the file's state on disk (a modification
 * time, the content), `expected` is that state as last seen, or null to skip
 * the comparison. A differing state goes to `confirm`, which resolves to the
 * handle to write to or null to keep the file. The state is read again once
 * the stream is open, since another program may write in between; then
 * nothing is written and the comparison repeats. A failed write aborts the
 * stream, so the file on disk stays as it was. Write permission is the
 * caller's, before this, so a permission prompt cannot fall between the
 * comparison and the writing.
 * @template T
 * @param {any} target
 * @param {string} data
 * @param {{ expected: T | null, stamp: (target: any) => Promise<T>, confirm: (target: any, current: T) => Promise<any> }} guard
 * @returns {Promise<any>} the handle written to, or null when nothing was written
 */
export async function guardedWrite(target, data, { expected, stamp, confirm }) {
  for (;;) {
    let seen = expected;
    if (expected !== null) {
      const current = await stamp(target);
      if (!Object.is(current, expected)) {
        const next = await confirm(target, current);
        if (!next) return null;
        if (next !== target) {
          target = next;
          expected = null;
        }
        seen = expected === null ? null : current;
      }
    }
    const writable = await target.createWritable();
    if (seen !== null && !Object.is(await stamp(target), seen)) {
      await writable.abort?.();
      continue;
    }
    try {
      await writable.write(data);
      await writable.close();
    } catch (err) {
      await writable.abort?.().catch(() => {});
      throw err;
    }
    return target;
  }
}

/** The text as written to disk, with the byte order mark the file had. @param {string} text @param {boolean} bom */
export const encodeXml = (text, bom) => (bom ? BOM + text : text);

/**
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   fallbackName: string,
 *   report: (state: "ok" | "error", message: string) => void,
 *   onOpened: () => void,
 *   beforeSave: () => string,
 *   stateNote: () => string,
 *   onSaved: () => void,
 * }} options `beforeSave` may adjust the text and returns a note for the
 *   confirmation; `stateNote` names the working state of the saved text.
 */
export function createFiles({ editor, fallbackName, report, onOpened, beforeSave, stateNote, onSaved }) {
  let name = fallbackName;
  /** Repository path of a document loaded from the server, "" for a file from disk. */
  let path = "";
  /** File handle when the document was opened through the File System Access API. */
  let handle = /** @type {any} */ (null);
  /** lastModified of the opened file on disk at open or last save, null without a handle. */
  let diskModified = /** @type {number | null} */ (null);
  /** Whether the opened file began with a UTF-8 byte order mark. */
  let bom = false;
  let savedText = "";
  /** Whether savedText comes from opening or from saving, for titles and questions. */
  let savedBy = "Öffnen";
  /** The text last handed to the browser as a download, which may never have arrived. */
  let handedOver = /** @type {string | null} */ (null);
  /** Counts opened documents, so a save that finishes later can tell whether its document is still open. */
  let generation = 0;
  /** Counts document requests from the list, so a slower earlier one cannot open after a later one. */
  let loading = 0;
  let saving = false;

  const unsaved = () => editor.text !== savedText;

  /** Shows whether the text differs from what was last opened or saved. */
  function updateMark() {
    const dirty = unsaved();
    const downloaded = dirty && editor.text === handedOver;
    $("save-state").textContent = downloaded ? "Als Download übergeben, Ankunft nicht bestätigt" : dirty ? "Ungespeicherte Änderungen" : "";
    $("tei-save").toggleAttribute("data-unsaved", dirty);
    $("tei-save").dataset.tip = downloaded
      ? "Als Download übergeben, ob er ankam, ist nicht bestätigt. Erneut herunterladen (Strg+S)"
      : dirty
        ? "Ungespeicherte Änderungen speichern (Strg+S)"
        : "TEI speichern (Strg+S)";
  }

  /** While a save runs, another document must not replace the one being saved. */
  function refuseWhileSaving() {
    if (!saving) return false;
    report("error", `${name} wird gerade gespeichert. Erst danach lässt sich ein anderes Dokument öffnen.`);
    return true;
  }

  /**
   * @param {ArrayBuffer} bytes
   * @param {{ name: string, path?: string, handle?: any, modified?: number | null }} from
   */
  function open(bytes, from) {
    if (refuseWhileSaving()) return;
    let decoded;
    try {
      decoded = decodeXml(bytes, from.name);
    } catch (err) {
      report("error", `Nicht geöffnet: ${err instanceof Error ? err.message : err}`);
      return;
    }
    generation++;
    // A list request still in flight must not replace this document.
    loading++;
    name = from.name;
    path = from.path ?? "";
    handle = from.handle ?? null;
    diskModified = from.modified ?? null;
    bom = decoded.bom;
    handedOver = null;
    const endings = editor.setText(decoded.text);
    savedText = editor.text;
    savedBy = "Öffnen";
    updateMark();
    onOpened();
    if (endings.mixed) {
      const kinds = [
        endings.crlf && `${endings.crlf} mit CRLF`,
        endings.lf && `${endings.lf} mit LF`,
        endings.cr && `${endings.cr} mit CR`,
      ].filter(Boolean);
      report(
        "error",
        `${name} mischt Zeilenenden: ${kinds.join(", ")}. Sie bleiben beim Speichern, wie sie sind; neue Zeilen erhalten ${endings.separator === "\r\n" ? "CRLF" : "LF"}, und abweichende Zeilenenden sind im Text markiert.`,
      );
    }
  }

  /** Asks before replacing unsaved work with another document. */
  async function mayDiscard() {
    if (refuseWhileSaving()) return false;
    if (!unsaved()) return true;
    const downloaded = editor.text === handedOver;
    const choice = await ask({
      title: "Ungespeicherte Änderungen",
      text: downloaded
        ? `${name} wurde als Download übergeben, aber der Editor kann nicht prüfen, ob die Datei angekommen ist. Beim Öffnen einer anderen Datei geht der Text im Editor verloren.`
        : `${name} enthält Änderungen, die noch nicht gespeichert sind. Beim Öffnen einer anderen Datei gehen sie verloren.`,
      choices: [
        { value: "", label: "Abbrechen" },
        { value: "discard", label: "Verwerfen und öffnen" },
      ],
    });
    // The question may have been open while a save started.
    return choice === "discard" && !refuseWhileSaving();
  }

  /** @param {string} url a document of the repository */
  async function load(url) {
    // Only the latest request opens, and text typed while it loads is not
    // replaced without asking again.
    const request = ++loading;
    const before = editor.text;
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Status ${r.status}`);
      const bytes = await r.arrayBuffer();
      if (request !== loading) return;
      if (editor.text !== before && !(await mayDiscard())) return;
      if (request !== loading) return;
      open(bytes, { name: url.split("/").pop() ?? name, path: url });
    } catch (err) {
      report("error", `Dokument nicht geladen: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** @param {any} target */
  async function modifiedOf(target) {
    try {
      return (await target.getFile()).lastModified;
    } catch {
      // Moved or deleted on disk; NaN never equals a time, so asking follows.
      return Number.NaN;
    }
  }

  /**
   * Asks what to do with a file changed on disk since opening or last saving,
   * as after a pull. Resolves to the handle to write to, or null when the user
   * keeps the file.
   * @param {any} target @param {number} current its modification time, NaN when unreadable
   */
  async function confirmChanged(target, current) {
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
    handedOver = null;
    updateMark();
  }

  /**
   * A download is handed to the browser, which may ask where to put it or be
   * cancelled; the editor learns neither. The text therefore stays unsaved, and
   * leaving the page still asks.
   * @param {string} text @param {string} [note] said before the download message
   */
  function download(text, note = "") {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([encodeXml(text, bom)], { type: "application/xml" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    handedOver = text;
    updateMark();
    report("ok", `${note ? `${note} ` : ""}${name} wurde dem Browser als Download übergeben. Ob die Datei ankam, kann der Editor nicht prüfen, daher gilt der Text weiter als ungespeichert.`);
  }

  async function saveNow() {
    const note = beforeSave();
    // Text and document are fixed before the first wait: what is written is
    // what the user saved, and the state below is only updated for that document.
    const text = editor.text;
    const opened = generation;
    if (!canWriteInPlace()) {
      download(text, note);
      return;
    }
    try {
      const target = handle ?? (await /** @type {any} */ (window).showSaveFilePicker({ suggestedName: name, types: XML_TYPES }));
      if (!(await mayWrite(target))) {
        report("error", `Nicht gespeichert: Der Browser hat das Schreiben in ${target.name} nicht erlaubt. Der Text im Editor ist unverändert erhalten.`);
        return;
      }
      // Only the opened file is compared; a newly chosen one has no earlier state.
      const written = await guardedWrite(target, encodeXml(text, bom), {
        expected: diskModified !== null && target === handle ? diskModified : null,
        stamp: modifiedOf,
        confirm: confirmChanged,
      });
      if (!written) {
        report("error", "Nicht gespeichert. Der Text im Editor ist unverändert erhalten.");
        return;
      }
      if (opened === generation) {
        handle = written;
        name = written.name;
        diskModified = await modifiedOf(written);
        markSaved(text);
        report("ok", [`Gespeichert in ${name}.`, note, stateNote()].filter(Boolean).join(" "));
        onSaved();
        return;
      }
      report("ok", `${written.name} wurde gespeichert. Inzwischen ist ein anderes Dokument geöffnet, das davon unberührt bleibt.`);
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
    if (!canWriteInPlace()) {
      $("tei-file").click();
      return;
    }
    try {
      const [picked] = await /** @type {any} */ (window).showOpenFilePicker({ types: XML_TYPES });
      const file = await picked.getFile();
      open(await file.arrayBuffer(), { name: file.name, handle: picked, modified: file.lastModified });
    } catch (err) {
      if (/** @type {any} */ (err)?.name !== "AbortError") report("error", `Öffnen fehlgeschlagen: ${err}`);
    }
  });
  $("tei-file").addEventListener("change", async (/** @type {Event} */ e) => {
    const input = /** @type {HTMLInputElement} */ (e.target);
    const file = input.files?.[0];
    // Cleared, so choosing the same file again fires change again.
    input.value = "";
    if (file) open(await file.arrayBuffer(), { name: file.name });
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
