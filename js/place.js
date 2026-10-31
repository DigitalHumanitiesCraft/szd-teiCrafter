// Place dialog: a marked place becomes a placeName, linked to the GND when an
// identifier is chosen and left as „noch nicht verknüpft“ otherwise. The GND
// is asked only on request and only where the action configures a lookup.

import { isGndId, searchGnd } from "./gnd.js";
import { $, arrowNavigation, renderResults, setStatus } from "./ui.js";

/**
 * @param {{
 *   editor: ReturnType<typeof import("./editor.js").createEditor>,
 *   place: typeof import("./source.js").source.place,
 *   nameOf: (text: string) => string,
 *   markup: (action: import("./actions.js").Action, text: string, ref: string) => string,
 *   onStale: (message: string) => void,
 * }} options `nameOf` turns the selection into a search query, `markup`
 * writes the element of the place action
 * @returns {(sel: { from: number, to: number, text: string }, action: import("./actions.js").Action, apply?: (ref: string) => void) => void}
 * opens the dialog for a selection with the place action; with `apply` it
 * changes the reference of an existing placeName
 */
export function createPlaceDialog({ editor, place, nameOf, markup: write, onStale }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("place-dialog"));
  const query = /** @type {HTMLInputElement} */ ($("place-query"));
  const idInput = /** @type {HTMLInputElement} */ ($("place-id"));
  const status = $("place-status");
  let pending = { from: 0, to: 0, text: "" };
  /** @type {import("./actions.js").Action | null} */
  let action = null;
  /** @type {((ref: string) => void) | null} */
  let change = null;
  /** Counts dialog openings and closings, so a late answer for another place is dropped. */
  let session = 0;

  /** The reference for the typed or chosen identifier; "" for none, null for an invalid one. */
  function chosenRef() {
    const id = idInput.value.trim();
    if (!id) return "";
    return isGndId(id) ? place.gndRef(id) : null;
  }

  const markup = (/** @type {string} */ ref) => (action ? write(action, pending.text, ref) : "");

  function updatePreview() {
    const ref = chosenRef();
    if (ref === null) {
      $("place-preview").textContent = "";
      setStatus(status, "error", "Das ist keine GND-Kennung. Das Feld leer lassen markiert den Ort ohne Verknüpfung.");
      return;
    }
    if (status.dataset.state === "error") setStatus(status, "", "");
    $("place-preview").textContent = markup(ref);
    $("place-unlinked").hidden = !!ref;
  }

  async function runSearch() {
    const type = action?.lookup?.gnd;
    if (!type || !query.value.trim()) return;
    setStatus(status, "", "Suche in der GND …");
    const asked = session;
    try {
      const hits = await searchGnd(query.value.trim(), type);
      if (asked !== session) return;
      setStatus(status, "", hits.length ? "" : "Keine GND-Treffer. Suchbegriff ändern, eine Kennung eingeben oder ohne Verknüpfung markieren.");
      const list = $("place-results");
      renderResults(
        list,
        list,
        hits.map((h) => ({ id: h.id, title: h.name, meta: [h.info, `GND ${h.id}`].filter(Boolean).join(" | ") })),
        (id) => {
          idInput.value = id;
          updatePreview();
          $("place-apply").focus();
        },
      );
    } catch (err) {
      setStatus(status, "error", err instanceof Error ? err.message : String(err));
    }
  }

  query.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    runSearch();
  });
  $("place-search").addEventListener("click", runSearch);
  arrowNavigation(dialog, ".result", query);
  idInput.addEventListener("input", updatePreview);
  $("place-cancel").addEventListener("click", () => dialog.close());
  $("place-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
    const ref = chosenRef();
    if (ref === null) {
      e.preventDefault();
      updatePreview();
      return;
    }
    if (change) {
      change(ref);
      return;
    }
    if (editor.slice(pending.from, pending.to) !== pending.text) {
      onStale("Der markierte Text hat sich verändert; bitte erneut markieren.");
      return;
    }
    editor.replace(pending.from, pending.to, markup(ref));
  });
  dialog.addEventListener("close", () => {
    session++;
    editor.focus();
  });

  return (sel, placeAction, apply) => {
    session++;
    pending = sel;
    action = placeAction;
    change = apply ?? null;
    $("place-text").textContent = sel.text;
    $("place-apply").textContent = apply ? "Ändern" : "Markieren";
    const lookup = !!placeAction.lookup?.gnd;
    $("place-lookup").hidden = !lookup;
    query.value = nameOf(sel.text);
    idInput.value = "";
    $("place-results").replaceChildren();
    setStatus(status, "", "");
    updatePreview();
    dialog.showModal();
    (lookup ? query : idInput).focus();
  };
}
