// The card of a marked passage in the text view: what the passage is, its
// identity where it has one, and the actions „Ändern“ and „Entfernen“. It
// appears on hover and, with the focus, on Enter; Escape returns to the text.

import { attributeOf } from "./textview.js";
import { $ } from "./ui.js";

/**
 * What the card says about a marked passage, from the action that writes its
 * element: the identity of a linked person, organisation or place, the values of a date, and
 * the attributes the card does not show.
 * @param {import("./textview.js").Mark} mark
 * @param {import("./actions.js").LoadedAction | undefined} action
 * @param {{ fallbackTitle: string, identify: (dialog: "person" | "organisation" | "place", ref: string) => Promise<string> }} options
 */
export async function describeMark(mark, action, { fallbackTitle, identify }) {
  const shown = new Set(action?.attributes.map((a) => a.name) ?? []);
  const extra = [...mark.attrs.matchAll(/([\w:.-]+)\s*=/g)].map((m) => m[1]).filter((n) => !shown.has(n));
  let detail = "";
  let unlinked = false;
  if (action?.dialog === "person" || action?.dialog === "organisation" || action?.dialog === "place") {
    const ref = attributeOf(mark.attrs, "ref");
    unlinked = !ref;
    detail = ref ? await identify(action.dialog, ref) : "noch nicht verknüpft";
  } else if (action?.dialog === "date") {
    detail = [...shown]
      .map((n) => [n, attributeOf(mark.attrs, n)])
      .filter(([, v]) => v)
      .map(([n, v]) => `@${n} ${v}`)
      .join(" | ");
    // Certainty qualifies a value and is none itself.
    unlinked = ![...shown].some((n) => n !== "cert" && attributeOf(mark.attrs, n));
    if (unlinked) detail = ["ohne Datumswert", detail].filter(Boolean).join(" | ");
  }
  return {
    title: action?.label || fallbackTitle,
    detail,
    note: extra.length ? `Weitere Attribute (${extra.map((n) => `@${n}`).join(", ")}) stehen in der XML-Ansicht.` : "",
    unlinked,
    changeable: !!action && action.dialog !== "none",
  };
}

/**
 * @typedef {import("./textview.js").Mark} Mark
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   markAt: (pos: number) => Mark | null,
 *   describe: (mark: Mark) => Promise<{ title: string, detail: string, note: string, unlinked: boolean, changeable: boolean }>,
 *   onChange: (mark: Mark) => void,
 * }} options
 */
export function createMarkCard({ editor, markAt, describe, onChange }) {
  const card = $("mark-card");
  /** @type {Mark | null} */
  let shown = null;
  let hideTimer = 0;
  let generation = 0;

  /** @param {Mark} mark @param {boolean} withFocus */
  async function open(mark, withFocus) {
    clearTimeout(hideTimer);
    const asked = ++generation;
    const facts = await describe(mark);
    if (asked !== generation) return;
    shown = mark;
    $("mark-card-title").textContent = facts.title;
    $("mark-card-detail").textContent = facts.detail;
    $("mark-card-detail").toggleAttribute("data-unlinked", facts.unlinked);
    $("mark-card-note").textContent = facts.note;
    $("mark-card-note").hidden = !facts.note;
    $("mark-card-change").hidden = !facts.changeable;
    card.hidden = false;
    const at = editor.coordsAt(mark.openTo);
    if (!at) {
      card.hidden = true;
      return;
    }
    const width = card.offsetWidth || 280;
    card.style.left = `${Math.max(8, Math.min(at.left, window.innerWidth - width - 8))}px`;
    const below = at.bottom + 8;
    card.style.top = `${below + card.offsetHeight < window.innerHeight - 8 ? below : Math.max(8, at.top - card.offsetHeight - 8)}px`;
    if (withFocus) /** @type {HTMLElement} */ (card.querySelector("button:not([hidden])"))?.focus();
  }

  function close(refocus = false) {
    generation++;
    shown = null;
    card.hidden = true;
    if (refocus) editor.focus();
  }

  const content = editor.view.contentDOM;
  content.addEventListener("mouseover", (/** @type {MouseEvent} */ e) => {
    const el = /** @type {HTMLElement} */ (e.target).closest?.(".tv-mark");
    if (!el || card.contains(document.activeElement)) return;
    const mark = markAt(editor.view.posAtDOM(el, 0));
    if (mark && mark.openFrom !== shown?.openFrom) open(mark, false);
  });
  const later = () => {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (!card.matches(":hover") && !card.contains(document.activeElement)) close();
    }, 350);
  };
  content.addEventListener("mouseout", (/** @type {MouseEvent} */ e) => {
    if (/** @type {HTMLElement} */ (e.target).closest?.(".tv-mark")) later();
  });
  card.addEventListener("mouseleave", later);
  card.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  });
  card.addEventListener("focusout", (/** @type {FocusEvent} */ e) => {
    if (!card.contains(/** @type {Node | null} */ (e.relatedTarget))) later();
  });

  $("mark-card-change").addEventListener("click", () => {
    const mark = shown;
    close();
    if (mark) onChange(mark);
  });
  $("mark-card-remove").addEventListener("click", () => {
    const mark = shown;
    close(true);
    if (!mark) return;
    // The positions are those of the moment the card opened; a mark that is
    // no longer where it was is left alone rather than cut.
    const now = markAt(mark.openTo);
    if (!now || now.name !== mark.name || now.openFrom !== mark.openFrom || now.closeTo !== mark.closeTo) return;
    // Unwrapping removes both tags in one step, so one undo restores them.
    editor.dispatch({
      changes: [
        { from: mark.closeFrom, to: mark.closeTo, insert: "" },
        { from: mark.openFrom, to: mark.openTo, insert: "" },
      ],
    });
  });

  return {
    /** Opens the card of a mark with the focus on its first action. @param {Mark} mark */
    openWithFocus: (mark) => open(mark, true),
    close,
  };
}
