// Small interface helpers shared by the dialogs and the composition root.

export const $ = (/** @type {string} */ id) => /** @type {any} */ (document.getElementById(id));

/** @param {HTMLElement} el @param {"ok" | "error" | ""} state @param {string} message */
export function setStatus(el, state, message) {
  el.dataset.state = state;
  el.textContent = message;
}

/**
 * Arrow keys move through the items of a result list, and up from the first
 * item returns to the search field above it.
 * @param {HTMLElement} container @param {string} itemSelector @param {HTMLElement} field
 */
export function arrowNavigation(container, itemSelector, field) {
  field.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    /** @type {HTMLElement | null} */ (container.querySelector(itemSelector))?.focus();
  });
  container.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    const current = /** @type {HTMLElement} */ (e.target);
    if (!current.matches?.(itemSelector) || !["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const all = /** @type {HTMLElement[]} */ ([...container.querySelectorAll(itemSelector)]);
    const i = all.indexOf(current);
    if (e.key === "ArrowUp" && i === 0) field.focus();
    else all[Math.min(Math.max(i + (e.key === "ArrowDown" ? 1 : -1), 0), all.length - 1)].focus();
  });
}

/**
 * Asks a question in a modal dialog and resolves to the value of the chosen
 * button, or "" when it is dismissed with Escape or while another question is
 * open. The first choice is the safe one and receives the focus.
 * @param {{ title: string, text: string, choices: { value: string, label: string, primary?: boolean }[] }} question
 * @returns {Promise<string>}
 */
export function ask({ title, text, choices }) {
  const box = /** @type {HTMLDialogElement} */ ($("ask-dialog"));
  // One question at a time: a second one while the first is open would replace
  // its buttons, so it is answered as dismissed, the safe answer.
  if (box.open) return Promise.resolve("");
  $("ask-title").textContent = title;
  $("ask-text").textContent = text;
  $("ask-actions").replaceChildren(
    ...choices.map((c) => Object.assign(document.createElement("button"), { type: "submit", value: c.value, textContent: c.label, className: c.primary ? "primary" : "" })),
  );
  box.returnValue = "";
  box.showModal();
  /** @type {HTMLElement} */ (box.querySelector("button")).focus();
  return new Promise((resolve) => box.addEventListener("close", () => resolve(box.returnValue), { once: true }));
}

/**
 * Fills a result list with one button per item; choosing one marks it as
 * pressed, unmarks earlier choices within `scope`, and hands its id on.
 * @param {HTMLElement} list @param {HTMLElement} scope
 * @param {{ id: string, title: string, meta: string }[]} items
 * @param {(id: string) => void} onPick
 */
export function renderResults(list, scope, items, onPick) {
  list.replaceChildren();
  for (const item of items) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "result" });
    b.dataset.id = item.id;
    b.append(Object.assign(document.createElement("strong"), { textContent: item.title }), Object.assign(document.createElement("span"), { textContent: item.meta }));
    b.addEventListener("click", () => {
      for (const other of scope.querySelectorAll(".result")) other.removeAttribute("aria-pressed");
      b.setAttribute("aria-pressed", "true");
      onPick(item.id);
    });
    const li = document.createElement("li");
    li.append(b);
    list.append(li);
  }
}
