// The changes since opening or saving, as a line comparison before a commit.

import { hunks, jumpLine, lineDiff } from "./diff.js";
import { $ } from "./ui.js";

/** @type {Record<string, [string, string]>} sign and its spoken word per line kind */
const SIGN = { same: ["", ""], del: ["−", "entfernt"], add: ["+", "hinzugefügt"] };

/**
 * @param {{ before: string, after: string, since: string, jumpTo: (line: number) => void }} options
 * `since` names the event `before` stems from, "Öffnen" or "Speichern".
 */
export function showChanges({ before, after, since, jumpTo }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("diff-dialog"));
  const lines = lineDiff(before, after);
  const groups = hunks(lines);
  const removed = lines.filter((l) => l.kind === "del").length;
  const added = lines.filter((l) => l.kind === "add").length;
  $("diff-title").textContent = `Änderungen seit dem ${since}`;
  $("diff-summary").textContent = groups.length
    ? `${removed} ${removed === 1 ? "Zeile" : "Zeilen"} entfernt, ${added} hinzugefügt, an ${groups.length} ${groups.length === 1 ? "Stelle" : "Stellen"}.`
    : `Keine Änderungen seit dem ${since}.`;
  const body = $("diff-body");
  body.replaceChildren();
  for (const group of groups) {
    const section = document.createElement("section");
    const line = jumpLine(group);
    const jump = Object.assign(document.createElement("button"), { type: "button", className: "link", textContent: `Zeile ${line}` });
    jump.addEventListener("click", () => {
      dialog.close();
      jumpTo(line);
    });
    section.append(jump);
    for (const l of group) {
      const row = document.createElement("div");
      row.className = "diff-row";
      row.dataset.kind = l.kind;
      const [mark, word] = SIGN[l.kind];
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
  dialog.showModal();
}
