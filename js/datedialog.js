// Date dialog: proposes ISO values for a marked date, in one of three forms,
// an exact or partial date (@when), a range (@from, @to) or an uncertain span
// (@notBefore, @notAfter). The user confirms or edits; only ISO values are
// written. A selection with words before or after the date is offered
// trimmed to the date part.

import { isIsoDate, parseDate } from "./dates.js";
import { wrap } from "./actions.js";
import { $, setStatus } from "./ui.js";

const FIELDS = { when: ["when"], range: ["from", "to"], span: ["notBefore", "notAfter"] };
const ALL = ["when", "from", "to", "notBefore", "notAfter"];

/**
 * @param {{ editor: ReturnType<typeof import("./editor.js").createEditor>, onStale: (message: string) => void }} options
 * @returns {(sel: { from: number, to: number, text: string }, action: import("./actions.js").Action, current?: { attrs: Record<string, string>, apply: (attrs: Record<string, string | null>) => void }) => void}
 * opens the dialog for a selection; with `current` it edits the attributes of an existing date
 */
export function createDateDialog({ editor, onStale }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("date-dialog"));
  const status = $("date-status");
  const input = (/** @type {string} */ name) => /** @type {HTMLInputElement} */ ($(`date-${name}`));
  let pending = { from: 0, to: 0, text: "" };
  let part = { from: 0, to: 0 };
  /** @type {import("./actions.js").Action | null} */
  let action = null;
  /** @type {((attrs: Record<string, string | null>) => void) | null} */
  let change = null;

  const form = () => /** @type {keyof typeof FIELDS} */ (/** @type {HTMLInputElement} */ (dialog.querySelector("input[name='date-form']:checked")).value);
  const trimmed = () => !$("date-trim-row").hidden && /** @type {HTMLInputElement} */ ($("date-trim")).checked;
  /** The text the element will hold, and where it stands. */
  const target = () => (trimmed() ? { from: pending.from + part.from, to: pending.from + part.to } : { from: pending.from, to: pending.to });

  /** The attributes of the chosen form, or the reason they cannot be written. */
  function chosen() {
    /** @type {Record<string, string>} */
    const attrs = {};
    for (const name of FIELDS[form()]) {
      const value = input(name).value.trim();
      if (value && !isIsoDate(value)) return { error: `@${name}: „${value}“ ist kein Datum der Form JJJJ, JJJJ-MM oder JJJJ-MM-TT.` };
      if (value) attrs[name] = value;
    }
    const names = Object.keys(attrs);
    if (!names.length) return { error: "Bitte ein Datum eintragen, etwa 1935-01-04, 1935-01 oder 1935." };
    const [a, b] = FIELDS[form()].map((n) => attrs[n]);
    if (a && b && a > b) return { error: "Das Ende liegt vor dem Anfang." };
    return { attrs };
  }

  function update() {
    for (const box of dialog.querySelectorAll("[data-form]")) /** @type {HTMLElement} */ (box).hidden = box.getAttribute("data-form") !== form();
    const result = chosen();
    const { from, to } = target();
    if ("error" in result) {
      $("date-preview").textContent = "";
      setStatus(status, input(FIELDS[form()][0]).value || form() !== "when" ? "error" : "", result.error ?? "");
      return;
    }
    setStatus(status, "", "");
    $("date-preview").textContent = action ? wrap(action, editor.slice(from, to), result.attrs) : "";
  }

  dialog.addEventListener("input", update);
  dialog.addEventListener("change", update);
  $("date-cancel").addEventListener("click", () => dialog.close());
  $("date-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
    const result = chosen();
    if ("error" in result) {
      e.preventDefault();
      setStatus(status, "error", result.error ?? "");
      return;
    }
    if (change) {
      /** @type {Record<string, string | null>} */
      const attrs = Object.fromEntries(ALL.map((n) => [n, result.attrs?.[n] ?? null]));
      change(attrs);
      return;
    }
    if (editor.slice(pending.from, pending.to) !== pending.text || !action) {
      onStale("Der markierte Text hat sich verändert; bitte erneut markieren.");
      return;
    }
    const { from, to } = target();
    editor.replace(from, to, wrap(action, editor.slice(from, to), result.attrs));
  });
  dialog.addEventListener("close", () => editor.focus());

  return (sel, dateAction, current) => {
    pending = sel;
    action = dateAction;
    change = current?.apply ?? null;
    $("date-text").textContent = sel.text;
    $("date-apply").textContent = current ? "Ändern" : "Auszeichnen";
    for (const n of ALL) input(n).value = "";
    let chosenForm = "when";
    if (current) {
      for (const n of ALL) input(n).value = current.attrs[n] ?? "";
      chosenForm = current.attrs.from || current.attrs.to ? "range" : current.attrs.notBefore || current.attrs.notAfter ? "span" : "when";
      $("date-trim-row").hidden = true;
    } else {
      const parsed = parseDate(sel.text);
      part = parsed ? parsed.at : { from: 0, to: sel.text.length };
      if (parsed?.form === "range") {
        input("from").value = parsed.from;
        input("to").value = parsed.to;
        chosenForm = "range";
      } else if (parsed) input("when").value = parsed.when;
      // Words around the date, as in „Nizza, den 4.Januar 1935.“, stay outside by default.
      const around = !!parsed && (part.from > 0 || part.to < sel.text.length);
      $("date-trim-row").hidden = !around;
      $("date-part").textContent = parsed ? sel.text.slice(part.from, part.to) : "";
      /** @type {HTMLInputElement} */ ($("date-trim")).checked = around;
    }
    /** @type {HTMLInputElement} */ (dialog.querySelector(`input[name='date-form'][value='${chosenForm}']`)).checked = true;
    setStatus(status, "", "");
    update();
    dialog.showModal();
    input(FIELDS[/** @type {keyof typeof FIELDS} */ (chosenForm)][0]).focus();
  };
}
