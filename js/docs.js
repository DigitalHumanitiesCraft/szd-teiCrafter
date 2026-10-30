// The documents of the repository by collection, from a prebuilt index
// (tools/build-document-index.mjs). The list carries title, pages, open spots
// and working state per document, so it stays usable with many documents
// without reading every file. A document loaded from the list is saved by
// download or to a chosen file; opening it from the local clone with the open
// button saves it in place.

import { fold } from "./register.js";
import { $, arrowNavigation } from "./ui.js";

/** @typedef {{ path: string, objectId: string, title: string, pages: number, open: number, status: string }} DocEntry */

const STATE_LABEL = { approved: "Abgenommen", draft: "In Bearbeitung" };

/**
 * @param {{
 *   index: string,
 *   current: () => { path: string, open: number, status: string },
 *   choose: (path: string) => void,
 * }} options `current` describes the open document, `choose` opens another one
 */
export function createDocumentList({ index, current, choose }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("docs-dialog"));
  const query = /** @type {HTMLInputElement} */ ($("docs-query"));
  /** @type {{ key: string, label: string, documents: DocEntry[] }[]} */
  let collections = [];
  let collectionFilter = "";

  /** Keeps the list entry of the open document in step with the editor. */
  function syncCurrentEntry() {
    const now = current();
    const entry = collections.flatMap((c) => c.documents).find((d) => d.path === now.path);
    if (!entry) return;
    entry.open = now.open;
    entry.status = now.status || "draft";
  }

  /** @param {DocEntry} d @param {string} currentPath */
  function renderEntry(d, currentPath) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "result doc-item" });
    if (d.path === currentPath) b.setAttribute("aria-current", "true");
    const meta = [d.objectId, d.pages === 1 ? "1 Seite" : `${d.pages} Seiten`, d.open ? `${d.open} offen` : ""].filter(Boolean).join(" | ");
    const tag = Object.assign(document.createElement("em"), { className: "doc-tag", textContent: STATE_LABEL[d.status] ?? d.status });
    tag.dataset.state = d.status;
    b.append(Object.assign(document.createElement("strong"), { textContent: d.title }), Object.assign(document.createElement("span"), { textContent: meta }), tag);
    b.addEventListener("click", () => {
      dialog.close();
      if (d.path !== currentPath) choose(d.path);
    });
    const li = document.createElement("li");
    li.append(b);
    return li;
  }

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
        const hay = fold(`${d.title} ${d.objectId}`);
        if (!words.every((w) => hay.includes(w))) return false;
        if (state === "open") return d.open > 0;
        return !state || d.status === state;
      });
      if (!docs.length) continue;
      shown += docs.length;
      const approved = c.documents.filter((d) => d.status === "approved").length;
      const heading = Object.assign(document.createElement("h3"), { className: "results-heading" });
      heading.append(c.label, Object.assign(document.createElement("span"), { className: "docs-progress", textContent: `${approved} von ${c.documents.length} abgenommen` }));
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
    for (const [key, label] of [["", "Alle"], ...collections.map((c) => [c.key, c.label])]) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "chip", textContent: label });
      b.setAttribute("aria-pressed", String(key === collectionFilter));
      b.addEventListener("click", () => {
        collectionFilter = key;
        renderCollectionChips();
        renderDocs();
        // The pressed chip was replaced; focus goes to its successor.
        /** @type {HTMLElement | null} */ (box.querySelector("[aria-pressed='true']"))?.focus();
      });
      box.append(b);
    }
  }

  $("docs-button").addEventListener("click", () => {
    syncCurrentEntry();
    renderCollectionChips();
    renderDocs();
    dialog.showModal();
    query.focus();
  });
  query.addEventListener("input", renderDocs);
  $("docs-state").addEventListener("change", renderDocs);
  arrowNavigation(dialog, ".doc-item", query);

  fetch(index)
    .then((r) => (r.ok ? r.json() : { collections: [] }))
    .then((data) => {
      collections = data.collections ?? [];
      $("docs-button").hidden = !collections.length;
    })
    .catch(() => ($("docs-button").hidden = true));
}
