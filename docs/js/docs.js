// The documents of the repository by collection, from a prebuilt index
// (tools/build-document-index.mjs). The list carries title, pages, open spots
// and working state per document, so it stays usable with many documents
// without reading every file. Collections, their labels and descriptions come
// from the source configuration. A document loaded from the list is saved by
// download or to a chosen file; opening it from the local clone with the open
// button saves it in place.

import { concepts } from "./concepts.js";
import { fold } from "./register.js";
import { $, arrowNavigation } from "./ui.js";

/** @typedef {{ path: string, objectId: string, title: string, pages: number, open: number, status: string }} DocEntry */

/**
 * The state of an entry as icon, accessible name and tooltip. The common case,
 * a draft without open spots, stays quiet; accepted, ready and open stand out.
 * @param {DocEntry & { ready?: boolean }} d
 */
function stateOf(d) {
  if (d.status === "approved") return { key: "approved", icon: "#i-ok", name: "Abgenommen", tip: concepts.acceptance };
  if (d.ready) return { key: "ready", icon: "#i-validate", name: "Bereit zur Abnahme", tip: concepts.workingState };
  if (d.open) return { key: "open", icon: "#i-task", name: d.open === 1 ? "1 offene Stelle" : `${d.open} offene Stellen`, tip: concepts.openSpot };
  return { key: "draft", icon: "#i-draft", name: "In Bearbeitung", tip: concepts.workingState };
}

/**
 * @param {{
 *   index: string,
 *   collections: { key: string, label: string, description: string }[],
 *   current: () => { path: string, open: number, status: string, ready: boolean },
 *   choose: (path: string) => void,
 * }} options `current` describes the open document, `choose` opens another one
 */
export function createDocumentList({ index, collections: configured, current, choose }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("docs-dialog"));
  const query = /** @type {HTMLInputElement} */ ($("docs-query"));
  /** @type {{ key: string, label: string, description: string, documents: (DocEntry & { ready?: boolean })[] }[]} */
  let collections = [];
  let collectionFilter = "";

  /** Keeps the list entry of the open document in step with the editor. */
  function syncCurrentEntry() {
    const now = current();
    for (const d of collections.flatMap((c) => c.documents)) d.ready = false;
    const entry = collections.flatMap((c) => c.documents).find((d) => d.path === now.path);
    if (!entry) return;
    entry.open = now.open;
    entry.status = now.status || "draft";
    entry.ready = now.ready;
  }

  /** @param {string} icon @param {string} name */
  function icon(icon, name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", name);
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", icon);
    svg.append(use);
    return svg;
  }

  /** @param {DocEntry & { ready?: boolean }} d @param {string} currentPath */
  function renderEntry(d, currentPath) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "result doc-item" });
    if (d.path === currentPath) b.setAttribute("aria-current", "true");
    const meta = [d.objectId, d.pages === 1 ? "1 Seite" : `${d.pages} Seiten`].join(" | ");
    const state = stateOf(d);
    const tag = Object.assign(document.createElement("span"), { className: "doc-state-icon" });
    tag.dataset.state = state.key;
    tag.title = `${state.name}. ${state.tip}`;
    tag.append(icon(state.icon, state.name));
    if (state.key === "open") tag.append(Object.assign(document.createElement("span"), { className: "doc-open-count", textContent: String(d.open) }));
    b.append(Object.assign(document.createElement("strong"), { textContent: d.title }), Object.assign(document.createElement("span"), { className: "doc-meta-line", textContent: meta }), tag);
    b.addEventListener("click", () => {
      dialog.close();
      if (d.path !== currentPath) choose(d.path);
    });
    const li = document.createElement("li");
    li.append(b);
    return li;
  }

  /** The count line of a collection: documents, accepted, with open spots. @param {DocEntry[]} docs */
  const countLine = (docs) =>
    [
      docs.length === 1 ? "1 Dokument" : `${docs.length} Dokumente`,
      `${docs.filter((d) => d.status === "approved").length} abgenommen`,
      `${docs.filter((d) => d.open > 0).length} mit offenen Stellen`,
    ].join(" | ");

  function renderDocs() {
    const words = fold(query.value).split(/\s+/).filter(Boolean);
    const state = $("docs-state").value;
    const currentPath = current().path;
    const list = $("docs-list");
    list.replaceChildren();
    let shown = 0;
    let total = 0;
    for (const c of collections) {
      total += c.documents.length;
      if (collectionFilter && c.key !== collectionFilter) continue;
      const docs = c.documents.filter((d) => {
        const hay = fold(`${d.title} ${d.objectId} ${d.shelfmark ?? ""}`);
        if (!words.every((w) => hay.includes(w))) return false;
        if (state === "open") return d.open > 0;
        return !state || d.status === state;
      });
      if (!docs.length) continue;
      shown += docs.length;
      const heading = Object.assign(document.createElement("h3"), { className: "results-heading" });
      const name = Object.assign(document.createElement("span"), { textContent: c.label, title: c.description });
      heading.append(name, Object.assign(document.createElement("span"), { className: "docs-progress", textContent: countLine(c.documents) }));
      const ul = Object.assign(document.createElement("ul"), { className: "results" });
      ul.append(...docs.map((d) => renderEntry(d, currentPath)));
      const section = document.createElement("section");
      section.append(heading, ul);
      list.append(section);
    }
    $("docs-count").textContent = shown === total ? `${total} Dokumente` : `${shown} von ${total} Dokumenten`;
  }

  function renderCollectionChips() {
    const box = $("docs-collections");
    box.replaceChildren();
    for (const c of [{ key: "", label: "Alle", description: "Alle Collections" }, ...collections]) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "chip", textContent: c.label });
      b.setAttribute("aria-pressed", String(c.key === collectionFilter));
      if (c.key) b.title = c.description;
      b.addEventListener("click", () => {
        collectionFilter = c.key;
        renderCollectionChips();
        renderDocs();
        // The pressed chip was replaced; focus goes to its successor.
        /** @type {HTMLElement | null} */ (box.querySelector("[aria-pressed='true']"))?.focus();
      });
      box.append(b);
    }
    // Setting up a collection happens in the repository, so this chip explains how.
    const add = Object.assign(document.createElement("button"), { type: "button", className: "chip chip-add", id: "docs-add" });
    add.dataset.tip = concepts.collection;
    add.setAttribute("aria-expanded", String(!$("docs-setup").hidden));
    add.setAttribute("aria-controls", "docs-setup");
    add.append(Object.assign(document.createElement("span"), { textContent: "+", ariaHidden: "true" }), " Weitere Collections einrichten");
    add.addEventListener("click", () => {
      $("docs-setup").hidden = !$("docs-setup").hidden;
      add.setAttribute("aria-expanded", String(!$("docs-setup").hidden));
    });
    box.append(add);
  }

  $("docs-button").addEventListener("click", () => {
    syncCurrentEntry();
    renderCollectionChips();
    renderDocs();
    dialog.showModal();
    // The last search stays and is selected, so typing replaces it.
    query.focus();
    query.select();
  });
  query.addEventListener("input", renderDocs);
  // Escape closes the list at once; a search field would first clear itself,
  // and the search is kept for the next opening.
  query.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    dialog.close();
  });
  $("docs-state").addEventListener("change", renderDocs);
  arrowNavigation(dialog, ".doc-item", query);

  fetch(index)
    .then((r) => (r.ok ? r.json() : { collections: [] }))
    .then((data) => {
      // The configuration names and explains the collections; the index fills them.
      collections = (data.collections ?? []).map((/** @type {any} */ c) => {
        const known = configured.find((k) => k.key === c.key);
        return { key: c.key, label: known?.label ?? c.label, description: known?.description ?? "", documents: c.documents ?? [] };
      });
      $("docs-button").hidden = !collections.length;
    })
    .catch(() => ($("docs-button").hidden = true));
}
