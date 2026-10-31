// Date dialog: proposes ISO values for a marked date, in one of three forms,
// an exact or partial date (@when), a range (@from, @to) or an uncertain span
// (@notBefore, @notAfter). The user confirms or edits; only ISO values are
// written. A date inferred rather than read, such as „am 10.“ dated from the
// letter, is marked @cert="low" where the action declares @cert. A selection
// with words before or after the date is offered trimmed to the date part.

import { dateContext, isIsoDate, parseDate } from "./dates.js";
import { wrap } from "./actions.js";
import { $, setStatus } from "./ui.js";

const FIELDS = { when: ["when"], range: ["from", "to"], span: ["notBefore", "notAfter"] };
const ALL = Object.values(FIELDS).flat();

/**
 * @param {{ editor: ReturnType<typeof import("./editor.js").createEditor>, onStale: (message: string) => void, documentDate?: () => string | null }} options
 * `documentDate` gives the ISO date of the open document, from which an
 * incomplete date is completed and proposed as inferred
 * @returns {(sel: { from: number, to: number, text: string }, action: import("./actions.js").Action, current?: { attrs: Record<string, string>, apply: (attrs: Record<string, string | null>) => void }) => void}
 * opens the dialog for a selection; with `current` it edits the attributes of an existing date
 */
export function createDateDialog({ editor, onStale, documentDate }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("date-dialog"));
  const status = $("date-status");
  const input = (/** @type {string} */ name) => /** @type {HTMLInputElement} */ ($(`date-${name}`));
  let pending = { from: 0, to: 0, text: "" };
  let part = { from: 0, to: 0 };
  /** @type {import("./actions.js").Action | null} */
  let action = null;
  /** @type {((attrs: Record<string, string | null>) => void) | null} */
  let change = null;
  let partialNote = "";

  const cert = /** @type {HTMLInputElement} */ ($("date-cert"));
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
    if (!$("date-cert-row").hidden && cert.checked) attrs.cert = "low";
    const [a, b] = FIELDS[form()].map((n) => attrs[n]);
    // Compared at their common precision, so 1935-05 to 1935 counts as one year.
    const common = Math.min(a?.length ?? 0, b?.length ?? 0);
    if (a && b && a.slice(0, common) > b.slice(0, common)) return { error: "Das Ende liegt vor dem Anfang." };
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
    setStatus(status, "", partialNote);
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
      if (!$("date-cert-row").hidden) attrs.cert = result.attrs?.cert ?? null;
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
    partialNote = "";
    $("date-cert-row").hidden = !dateAction.attributes.some((a) => a.name === "cert");
    cert.checked = current?.attrs.cert === "low";
    let chosenForm = "when";
    if (current) {
      for (const n of ALL) input(n).value = current.attrs[n] ?? "";
      chosenForm = current.attrs.from || current.attrs.to ? "range" : current.attrs.notBefore || current.attrs.notAfter ? "span" : "when";
      $("date-trim-row").hidden = true;
    } else {
      const parsed = parseDate(sel.text, dateContext(documentDate?.()));
      part = parsed ? parsed.at : { from: 0, to: sel.text.length };
      if (parsed?.form === "range") {
        input("from").value = parsed.from;
        input("to").value = parsed.to;
        chosenForm = "range";
      } else if (parsed?.form === "span") {
        input("notBefore").value = parsed.notBefore;
        input("notAfter").value = parsed.notAfter;
        chosenForm = "span";
      } else if (parsed) input("when").value = parsed.when;
      if (parsed?.inferred) cert.checked = true;
      const around = !!parsed && (part.from > 0 || part.to < sel.text.length);
      // Words around the date, as in „Nizza, den 4.Januar 1935.“, stay outside
      // by default; digits or numerals left outside mean the date was read only
      // in part, as „1 4 СЕН 1928“ read as 1928, so nothing is trimmed unasked.
      const rest = sel.text.slice(0, part.from) + sel.text.slice(part.to);
      const partial = around && /\d|(?<![\p{L}])[IVX]{1,4}(?![\p{L}])/u.test(rest.replace(/<[^>]*>/g, ""));
      $("date-trim-row").hidden = !around;
      $("date-part").textContent = parsed ? sel.text.slice(part.from, part.to) : "";
      /** @type {HTMLInputElement} */ ($("date-trim")).checked = around && !partial;
      partialNote = partial ? `Nur „${sel.text.slice(part.from, part.to)}“ wurde als Datum erkannt. Bitte den Wert prüfen.` : "";
    }
    /** @type {HTMLInputElement} */ (dialog.querySelector(`input[name='date-form'][value='${chosenForm}']`)).checked = true;
    setStatus(status, "", "");
    update();
    dialog.showModal();
    input(FIELDS[/** @type {keyof typeof FIELDS} */ (chosenForm)][0]).focus();
  };
}
