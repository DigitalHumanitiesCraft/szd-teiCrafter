// The action menu at the selection: it quotes the marked text, suggests the
// action whose marker the selection carries, and works by pointer, Ctrl+. and
// arrow keys. Wrapping actions apply at once; Person hands over to its dialog.

import { $ } from "./ui.js";

/**
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   wraps: typeof import("./source.js").source.wraps,
 *   onPerson: (sel: { from: number, to: number, text: string }) => void,
 *   onNext: () => void,
 *   report: (message: string) => void,
 * }} options `onNext` selects the next open spot, `report` names a refusal
 */
export function createActionMenu({ editor, wraps, onPerson, onNext, report }) {
  const menu = $("actions");
  const items = /** @type {HTMLButtonElement[]} */ ([...menu.querySelectorAll("button")]);

  function selectionProblem() {
    const { text } = editor.selection();
    if (!text.trim()) return "empty";
    if (/[<>]/.test(text)) return "Die Markierung enthält Markup. Nur reinen Text markieren.";
    return "";
  }

  /** The wrap whose marker syntax the selection carries, else person for a capitalised selection. */
  function suggestedAction() {
    const { text } = editor.selection();
    return wraps.find((w) => w.strip(text) !== text)?.key ?? (/^\p{Lu}/u.test(text.trim()) ? "person" : null);
  }

  function position() {
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
  function open(withFocus) {
    const problem = selectionProblem();
    if (problem === "empty" || (problem && !withFocus)) {
      if (!menu.contains(document.activeElement)) menu.hidden = true;
      if (problem && problem !== "empty") report(problem);
      return !!problem;
    }
    if (problem) {
      report(problem);
      return true;
    }
    const suggested = suggestedAction();
    // The marked text is quoted in the menu, so the judgement is made on what is
    // actually selected even where the menu covers part of the line.
    const { text } = editor.selection();
    $("actions-quote").textContent = `„${text.length > 90 ? `${text.slice(0, 87)}…` : text}“`;
    for (const b of items) b.toggleAttribute("data-suggested", b.dataset.action === suggested);
    menu.hidden = false;
    position();
    if (withFocus) (items.find((b) => b.dataset.action === suggested) ?? items[0]).focus();
    return true;
  }

  function close(refocus = true) {
    menu.hidden = true;
    if (refocus) editor.focus();
  }

  /** @param {string} action */
  function run(action) {
    const sel = editor.selection();
    close(action !== "person");
    if (action === "person") {
      onPerson(sel);
      return;
    }
    const wrap = wraps.find((w) => w.key === action);
    if (wrap) editor.replace(sel.from, sel.to, `<${wrap.element}>${wrap.strip(sel.text)}</${wrap.element}>`);
  }

  // Keep the editor selection when a menu item is pressed with the mouse.
  menu.addEventListener("mousedown", (/** @type {MouseEvent} */ e) => e.preventDefault());
  menu.addEventListener("click", (/** @type {MouseEvent} */ e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button");
    if (b?.dataset.action) run(b.dataset.action);
  });
  menu.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    const i = items.indexOf(/** @type {any} */ (document.activeElement));
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (["ArrowRight", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length].focus();
    } else if (e.key === "F8") {
      e.preventDefault();
      e.stopPropagation();
      onNext();
    }
  });

  return {
    open,
    /** Hides the menu once the selection is gone, unless the menu has the focus. */
    hideWithoutSelection() {
      if (!editor.selection().text && !menu.contains(document.activeElement)) menu.hidden = true;
    },
    /** Follows the selection while the editor scrolls. */
    follow() {
      if (!menu.hidden) position();
    },
  };
}
