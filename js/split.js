// Resizable split between text and facsimile. Dragging the separator to the
// right edge hides the facsimile; an edge button brings it back. The width is
// remembered per browser as a convenience only.

const KEY = "teicrafter-szd:split";
const MIN = 20; // smallest facsimile share in percent while visible
const HIDE_AT = 8; // dropping below this share hides the facsimile
const STEP = 5;

/**
 * @param {{ workspace: HTMLElement, splitter: HTMLElement, hide: HTMLElement, show: HTMLElement }} els
 */
export function attachSplit({ workspace, splitter, hide, show }) {
  let share = 50;
  try {
    const stored = Number(localStorage.getItem(KEY));
    if (stored >= MIN && stored <= 100 - MIN) share = stored;
  } catch {
    // Storage blocked: keep the default.
  }

  /** @param {number} next */
  const setShare = (next) => {
    share = Math.min(100 - MIN, Math.max(MIN, next));
    workspace.style.setProperty("--facs-share", `${share}%`);
    splitter.setAttribute("aria-valuenow", String(Math.round(share)));
    try {
      localStorage.setItem(KEY, String(share));
    } catch {
      // Not persisted; the split still works for this session.
    }
  };

  /** @param {boolean} hidden @param {boolean} [moveFocus] */
  const setHidden = (hidden, moveFocus = true) => {
    workspace.dataset.facs = hidden ? "hidden" : "shown";
    show.hidden = !hidden;
    splitter.setAttribute("aria-valuenow", hidden ? "0" : String(Math.round(share)));
    // The focused control disappears, so focus moves to its counterpart.
    if (moveFocus) (hidden ? show : splitter).focus({ preventScroll: true });
  };

  splitter.addEventListener("pointerdown", (e) => {
    splitter.setPointerCapture(e.pointerId);
    workspace.dataset.dragging = "true";
  });
  splitter.addEventListener("pointermove", (e) => {
    if (!splitter.hasPointerCapture(e.pointerId)) return;
    const box = workspace.getBoundingClientRect();
    const right = ((box.right - e.clientX) / box.width) * 100;
    if (right < HIDE_AT) return;
    setShare(right);
  });
  splitter.addEventListener("pointerup", (e) => {
    const box = workspace.getBoundingClientRect();
    delete workspace.dataset.dragging;
    if (((box.right - e.clientX) / box.width) * 100 < HIDE_AT) setHidden(true);
  });
  splitter.addEventListener("keydown", (e) => {
    const moves = { ArrowLeft: STEP, ArrowRight: -STEP, Home: 100, End: -100 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const delta = moves[/** @type {keyof typeof moves} */ (e.key)];
    if (e.key === "End" || (delta < 0 && share <= MIN)) setHidden(true);
    else setShare(share + delta);
  });
  hide.addEventListener("click", () => setHidden(true));
  show.addEventListener("click", () => setHidden(false));

  setShare(share);
  setHidden(false, false);
}
