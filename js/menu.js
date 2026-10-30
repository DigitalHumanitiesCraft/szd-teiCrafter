// The action menu at the selection: it quotes the marked text, suggests the
// action whose marker the selection carries, and works by pointer, Ctrl+.,
// arrow keys and each action's letter key. Its items come from the action
// registry (js/actions.js). Actions without a dialog wrap at once; the others
// hand over to their dialog.

import { stripMarker, suggests, wrap } from "./actions.js";
import { $ } from "./ui.js";

/**
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   onDialog: (action: import("./actions.js").LoadedAction, sel: { from: number, to: number, text: string }) => void,
 *   onNext: () => void,
 *   report: (message: string) => void,
 *   markupNote: () => string,
 * }} options `onDialog` opens the dialog an action names, `onNext` selects
 * the next open spot, `report` names a refusal in a calm tone, `markupNote`
 * says in the words of the current view why a selection with markup cannot
 * be annotated
 */
export function createActionMenu({ editor, onDialog, onNext, report, markupNote }) {
  const menu = $("actions");
  const box = $("actions-items");
  /** @type {import("./actions.js").LoadedAction[]} */
  let actions = [];
  /** @type {HTMLButtonElement[]} */
  let items = [];

  /**
   * Shows the given actions as menu items, each with its letter.
   * @param {import("./actions.js").LoadedAction[]} list
   */
  function setActions(list) {
    actions = list;
    items = list.map((a) => {
      const b = Object.assign(document.createElement("button"), { type: "button" });
      b.setAttribute("role", "menuitem");
      b.dataset.action = a.id;
      b.setAttribute("aria-keyshortcuts", a.key);
      if (a.icon) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "icon");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `#i-${a.icon}`);
        svg.append(use);
        b.append(svg);
      }
      const key = Object.assign(document.createElement("kbd"), { textContent: a.key.toUpperCase() });
      key.setAttribute("aria-hidden", "true");
      b.append(a.label, key);
      return b;
    });
    box.replaceChildren(...items);
    $("actions-empty").hidden = items.length > 0;
  }

  function selectionProblem() {
    const { text } = editor.selection();
    if (!text.trim()) return "empty";
    if (/[<>]/.test(text)) return markupNote();
    return "";
  }

  /** The action whose marker the selection carries, else the first whose suggest pattern matches. */
  function suggestedAction() {
    const { text } = editor.selection();
    return actions.find((a) => a.resolves && suggests(a, text))?.id ?? actions.find((a) => !a.resolves && suggests(a, text))?.id ?? null;
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

  /**
   * @param {boolean} withFocus true when opened from the keyboard
   * @param {string} [note] for open work without an action: what the menu
   *   says instead of suggesting one, and the focus rests on the menu itself
   */
  function open(withFocus, note = "") {
    // A late pointer event must not reopen a menu the keyboard is working in,
    // which would drop its note and suggestion.
    if (!withFocus && !menu.hidden && menu.contains(document.activeElement)) return true;
    const problem = selectionProblem();
    // A pointer selection across markup is ordinary while reading; the menu
    // stays closed without a message, which only an explicit request gets.
    if (problem === "empty" || (problem && !withFocus)) {
      if (!menu.contains(document.activeElement)) menu.hidden = true;
      return !!problem;
    }
    if (problem) {
      report(problem);
      return true;
    }
    const suggested = note ? null : suggestedAction();
    // The marked text is quoted in the menu, so the judgement is made on what is
    // actually selected even where the menu covers part of the line.
    const { text } = editor.selection();
    $("actions-quote").textContent = `„${text.length > 90 ? `${text.slice(0, 87)}…` : text}“`;
    $("actions-note").textContent = note;
    $("actions-note").hidden = !note;
    for (const b of items) b.toggleAttribute("data-suggested", b.dataset.action === suggested);
    menu.hidden = false;
    position();
    // Without a suggestion Enter must not apply an arbitrary action, so the
    // menu itself takes the focus; the arrow keys still reach every item.
    if (withFocus) (note || !items.length ? menu : (items.find((b) => b.dataset.action === suggested) ?? items[0])).focus();
    return true;
  }

  function close(refocus = true) {
    menu.hidden = true;
    if (refocus) editor.focus();
  }

  /** @param {string} id */
  function run(id) {
    // The selection may have changed since the menu opened (typing, undo), so
    // the rule that kept markup out of an annotation is applied again here.
    const problem = selectionProblem();
    const action = actions.find((a) => a.id === id);
    if (problem || !action) {
      close();
      if (problem && problem !== "empty") report(problem);
      return;
    }
    const sel = editor.selection();
    close(action.dialog === "none");
    if (action.dialog === "none") editor.replace(sel.from, sel.to, wrap(action, stripMarker(action, sel.text)));
    else onDialog(action, sel);
  }

  // Keep the editor selection when a menu item is pressed with the mouse.
  menu.addEventListener("mousedown", (/** @type {MouseEvent} */ e) => e.preventDefault());
  menu.addEventListener("click", (/** @type {MouseEvent} */ e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button");
    if (b?.dataset.action) run(b.dataset.action);
  });
  menu.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    const i = items.indexOf(/** @type {any} */ (document.activeElement));
    const byKey = !e.ctrlKey && !e.altKey && !e.metaKey && actions.find((a) => a.key === e.key.toLowerCase());
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (byKey) {
      e.preventDefault();
      run(byKey.id);
    } else if (["ArrowRight", "ArrowDown"].includes(e.key) && items.length) {
      e.preventDefault();
      items[(i + 1) % items.length].focus();
    } else if (["ArrowLeft", "ArrowUp"].includes(e.key) && items.length) {
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
    setActions,
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
