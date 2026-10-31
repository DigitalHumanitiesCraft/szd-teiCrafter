// The settings view „Aktionen“: the action registry as a list, each entry
// switched on or off, with its label and letter key, and refused entries with
// their reason. Changes apply to the menu at once. Saving writes the registry
// file in place when the repository folder was opened, with the guarantees of
// document saving (permission first, the disk compared before and after the
// stream opens, an aborted stream on failure), and downloads it otherwise.

import { serializeRegistry } from "./actions.js";
import { guardedWrite, mayWrite } from "./files.js";
import { $, ask, setStatus } from "./ui.js";

/**
 * @param {{
 *   path: string,
 *   load: () => Promise<{ text: string, actions: import("./actions.js").LoadedAction[], comment?: string }>,
 *   onChange: (actions: import("./actions.js").LoadedAction[]) => void,
 * }} options `path` is the registry's path in the repository, `load` reads
 * and checks it, `onChange` hands the edited list to the menu
 */
export function createSettings({ path, load, onChange }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("actions-dialog"));
  const status = $("actions-status");
  /** @type {import("./actions.js").LoadedAction[]} */
  let actions = [];
  let comment = /** @type {string | undefined} */ (undefined);
  /** The registry text as loaded or last saved; what the disk is compared with. */
  let savedText = "";
  let lineBreak = "\n";
  /** The repository folder, once chosen; the registry is written into it. */
  let folder = /** @type {any} */ (null);
  const canPickFolder = "showDirectoryPicker" in globalThis;
  $("actions-folder").hidden = !canPickFolder;

  const current = () => serializeRegistry(comment, actions, lineBreak);

  /** Why the edited registry cannot be saved, or "". */
  function problem() {
    const keys = new Map();
    for (const a of actions) {
      if (!a.label.trim()) return `${a.id}: Die Bezeichnung fehlt.`;
      if (!/^[a-z]$/.test(a.key)) return `${a.label}: Die Taste muss ein einzelner Kleinbuchstabe sein.`;
      if (keys.has(a.key)) return `${a.label}: Die Taste ${a.key} hat schon ${keys.get(a.key)}.`;
      keys.set(a.key, a.label);
    }
    return "";
  }

  function updateState() {
    const reason = problem();
    const dirty = current() !== savedText;
    /** @type {HTMLButtonElement} */ ($("actions-save")).disabled = !!reason || !dirty;
    $("actions-save-reason").textContent = reason || (dirty ? "Ungespeicherte Änderungen an den Aktionen." : "");
    $("actions-save-reason").dataset.state = reason ? "error" : "";
    $("actions-save").textContent = folder ? `In ${path} speichern` : "Als Datei herunterladen";
  }

  function render() {
    const list = $("actions-list");
    list.replaceChildren();
    for (const a of actions) {
      const li = Object.assign(document.createElement("li"), { className: "action-row" });
      const on = Object.assign(document.createElement("input"), { type: "checkbox", checked: a.enabled && !a.refused, disabled: !!a.refused });
      on.setAttribute("aria-label", `${a.label} anbieten`);
      on.addEventListener("change", () => {
        a.enabled = on.checked;
        changed();
      });
      const label = Object.assign(document.createElement("input"), { type: "text", value: a.label, className: "action-label" });
      label.setAttribute("aria-label", `Bezeichnung von ${a.id}`);
      label.addEventListener("input", () => {
        a.label = label.value;
        changed();
      });
      const key = Object.assign(document.createElement("input"), { type: "text", value: a.key, maxLength: 1, className: "action-key" });
      key.setAttribute("aria-label", `Taste von ${a.id}`);
      key.addEventListener("input", () => {
        a.key = key.value.toLowerCase();
        changed();
      });
      const facts = [
        a.dialog === "none" ? "ohne Dialog" : `Dialog ${a.dialog}`,
        a.views.map((v) => (v === "xml" ? "XML" : "Text")).join(" und "),
        a.resolves ? `löst ${a.resolves.marker.length > 24 ? a.resolves.label : a.resolves.marker}` : "",
      ].filter(Boolean);
      const what = Object.assign(document.createElement("span"), { className: "action-facts" });
      what.append(Object.assign(document.createElement("code"), { textContent: `<${a.element}>` }), ` ${facts.join(" | ")}`);
      li.append(on, label, key, what);
      if (a.refused) li.append(Object.assign(document.createElement("p"), { className: "action-refused", textContent: `Nicht geladen: ${a.refused}` }));
      list.append(li);
    }
    updateState();
  }

  function changed() {
    onChange(actions);
    updateState();
  }

  /** Writes into the registry file of the chosen folder, asking before overwriting a changed file. */
  async function writeInPlace(/** @type {string} */ text) {
    let dir = folder;
    const parts = path.split("/");
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
    const target = await dir.getFileHandle(/** @type {string} */ (parts.at(-1)));
    if (!(await mayWrite(target))) return "Nicht gespeichert: Der Browser hat das Schreiben nicht erlaubt.";
    // The registry is small, so its content is the state compared.
    const written = await guardedWrite(target, text, {
      expected: savedText,
      stamp: async (/** @type {any} */ t) => (await t.getFile()).text(),
      confirm: async (/** @type {any} */ t) => {
        const choice = await ask({
          title: "Aktionen auf der Festplatte geändert",
          text: `${path} wurde seit dem Laden geändert, etwa durch einen Git-Pull. Überschreiben ersetzt diese Fassung durch die Aktionen im Editor.`,
          choices: [
            { value: "", label: "Abbrechen" },
            { value: "overwrite", label: "Überschreiben", primary: true },
          ],
        });
        return choice === "overwrite" ? t : null;
      },
    });
    return written ? "" : "Nicht gespeichert. Die Aktionen im Editor bleiben erhalten.";
  }

  async function save() {
    if (problem()) return;
    const text = current();
    if (!folder) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = /** @type {string} */ (path.split("/").at(-1));
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus(status, "ok", `Als Download übergeben. Die Datei ersetzt ${path} im Repository.`);
      return;
    }
    try {
      const refusal = await writeInPlace(text);
      if (refusal) {
        setStatus(status, "error", refusal);
        return;
      }
      savedText = text;
      setStatus(status, "ok", `Gespeichert in ${path}.`);
      updateState();
    } catch (err) {
      setStatus(status, "error", `Speichern fehlgeschlagen: ${err}`);
    }
  }

  $("actions-folder").addEventListener("click", async () => {
    try {
      const picked = await /** @type {any} */ (window).showDirectoryPicker({ mode: "readwrite" });
      let dir = picked;
      const parts = path.split("/");
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
      await dir.getFileHandle(/** @type {string} */ (parts.at(-1)));
      folder = picked;
      setStatus(status, "ok", `Repository-Ordner ${picked.name} gewählt; Speichern schreibt ${path}.`);
      updateState();
    } catch (err) {
      if (/** @type {any} */ (err)?.name === "AbortError") return;
      setStatus(status, "error", `Dieser Ordner enthält kein ${path}. Bitte den Ordner des Repositorys wählen.`);
    }
  });
  $("actions-save").addEventListener("click", save);
  $("actions-button").addEventListener("click", () => {
    render();
    setStatus(status, "", "");
    dialog.showModal();
  });

  return {
    /** Reads the registry; the actions go to the menu through onChange. */
    async init() {
      const loaded = await load();
      actions = loaded.actions;
      comment = loaded.comment;
      savedText = loaded.text;
      lineBreak = /\r\n/.test(loaded.text) ? "\r\n" : "\n";
      onChange(actions);
      return actions;
    },
  };
}
