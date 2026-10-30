// Person dialog: a marked name becomes a reference to the source's person
// register first and to the GND second. Typing searches the register at once;
// the GND is asked on request, since it is a network service and the register
// covers the edition's persons.

import { isGndId, searchPersons } from "./gnd.js";
import { cleanQuery, searchRegister } from "./register.js";
import { $, arrowNavigation, setStatus } from "./ui.js";

/**
 * @param {{ editor: ReturnType<typeof import("./editor.js").createEditor>, person: typeof import("./source.js").source.person, onStale: (message: string) => void }} options
 * `onStale` reports that the marked text changed while the dialog was open.
 * @returns {(sel: { from: number, to: number, text: string }) => void} opens the dialog for a selection
 */
export function createPersonDialog({ editor, person, onStale }) {
  const dialog = /** @type {HTMLDialogElement} */ ($("person-dialog"));
  const refInput = /** @type {HTMLInputElement} */ ($("person-gnd"));
  const query = /** @type {HTMLInputElement} */ ($("person-query"));
  const status = $("person-status");
  let pending = { from: 0, to: 0, text: "" };
  let registerTimer = 0;

  /** The reference the typed or chosen identifier stands for, or "". */
  function chosenRef() {
    const id = refInput.value.trim();
    if (person.isRegisterId(id)) return person.registerRef(id);
    if (isGndId(id)) return person.gndRef(id);
    return "";
  }

  function updatePreview() {
    const ref = chosenRef();
    // A valid choice answers an earlier "please choose" message.
    if (ref && status.dataset.state === "error") setStatus(status, "", "");
    $("person-preview").textContent = ref ? person.markup(pending.text, ref) : "";
  }

  /** @param {HTMLElement} list @param {{ id: string, title: string, meta: string }[]} items */
  function renderResults(list, items) {
    list.replaceChildren();
    for (const item of items) {
      const b = Object.assign(document.createElement("button"), { type: "button", className: "result" });
      b.dataset.id = item.id;
      b.append(
        Object.assign(document.createElement("strong"), { textContent: item.title }),
        Object.assign(document.createElement("span"), { textContent: item.meta }),
      );
      b.addEventListener("click", () => {
        refInput.value = item.id;
        for (const other of dialog.querySelectorAll(".result")) other.removeAttribute("aria-pressed");
        b.setAttribute("aria-pressed", "true");
        updatePreview();
        // The next Enter applies the choice.
        $("person-apply").focus();
      });
      const li = document.createElement("li");
      li.append(b);
      list.append(li);
    }
  }

  async function runRegisterSearch() {
    try {
      const hits = await searchRegister(person.register, query.value, person.ignore);
      $("register-heading").textContent = `${person.registerLabel}${hits.length ? "" : ": keine Treffer"}`;
      renderResults(
        $("register-results"),
        hits.map((p) => ({ id: p.id, title: p.name, meta: [p.dates, p.gnd && `GND ${p.gnd}`, p.id].filter(Boolean).join(" | ") })),
      );
    } catch (err) {
      setStatus(status, "error", err instanceof Error ? err.message : String(err));
    }
  }

  async function runGndSearch() {
    const cleaned = cleanQuery(query.value, person.ignore);
    if (!cleaned) return;
    $("gnd-heading").hidden = false;
    setStatus(status, "", "Suche in der GND …");
    try {
      const persons = await searchPersons(cleaned);
      setStatus(status, "", persons.length ? "" : "Keine GND-Treffer. Suchbegriff ändern oder Kennung direkt eingeben.");
      renderResults(
        $("person-results"),
        persons.map((p) => ({ id: p.id, title: p.name, meta: [p.dates, p.info, `GND ${p.id}`].filter(Boolean).join(" | ") })),
      );
    } catch (err) {
      setStatus(status, "error", err instanceof Error ? err.message : String(err));
    }
  }

  query.addEventListener("input", () => {
    clearTimeout(registerTimer);
    registerTimer = window.setTimeout(runRegisterSearch, 150);
  });
  query.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    runGndSearch();
  });
  // Both result lists are one list for the arrow keys.
  arrowNavigation(dialog, ".result", query);
  $("person-search").addEventListener("click", runGndSearch);
  refInput.addEventListener("input", updatePreview);
  $("person-cancel").addEventListener("click", () => dialog.close());
  $("person-form").addEventListener("submit", (/** @type {SubmitEvent} */ e) => {
    const ref = chosenRef();
    if (!ref) {
      e.preventDefault();
      setStatus(status, "error", "Bitte einen Treffer wählen oder eine Kennung eingeben, etwa SZDPER.2188 oder eine GND-ID.");
      return;
    }
    // The document may have changed while the dialog was open; only apply if the
    // marked text is still where it was.
    if (editor.slice(pending.from, pending.to) !== pending.text) {
      onStale("Der markierte Text hat sich verändert; bitte erneut markieren.");
      return;
    }
    editor.replace(pending.from, pending.to, person.markup(pending.text, ref));
  });
  dialog.addEventListener("close", () => editor.focus());

  return (sel) => {
    pending = sel;
    $("person-text").textContent = sel.text;
    // Marker syntax and forms of address are no part of a name.
    const name = person.nameOf(sel.text);
    query.value = cleanQuery(name, person.ignore) || name;
    refInput.value = "";
    $("person-results").replaceChildren();
    $("gnd-heading").hidden = true;
    setStatus(status, "", "");
    updatePreview();
    dialog.showModal();
    runRegisterSearch();
  };
}
