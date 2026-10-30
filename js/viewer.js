// Thin wrapper around the vendored OpenSeadragon, one page at a time. The
// viewer's own button set is off; the application toolbar drives it.

/** @typedef {import("./iiif.js").Page} Page */

/**
 * @param {HTMLElement} element
 * @param {(index: number, count: number) => void} onPage
 */
export function createViewer(element, onPage) {
  const OSD = /** @type {any} */ (window).OpenSeadragon;
  /** @type {Page[]} */
  let pages = [];
  let current = 0;

  const viewer = OSD({
    element,
    prefixUrl: "vendor/openseadragon/images/",
    showNavigationControl: false,
    showNavigator: true,
    navigatorPosition: "BOTTOM_RIGHT",
    navigatorSizeRatio: 0.14,
    navigatorAutoFade: true,
    gestureSettingsMouse: { clickToZoom: false },
    crossOriginPolicy: "Anonymous",
  });

  // When the pane width changes (split dragged, window resized), fit the page
  // again; height changes alone keep the user's zoom.
  let lastWidth = element.clientWidth;
  let fitTimer = 0;
  new ResizeObserver(() => {
    if (Math.abs(element.clientWidth - lastWidth) < 8) return;
    lastWidth = element.clientWidth;
    clearTimeout(fitTimer);
    fitTimer = window.setTimeout(() => viewer.viewport?.goHome(true), 150);
  }).observe(element);

  return {
    /** @param {Page[]} next */
    load(next) {
      pages = next;
      current = -1;
      this.show(0);
    },
    /** @param {number} index */
    show(index) {
      if (!pages.length) return;
      const target = Math.min(Math.max(index, 0), pages.length - 1);
      if (target === current) return;
      current = target;
      viewer.open(pages[target].tileSource);
      onPage(target, pages.length);
    },
    get index() {
      return current;
    },
    /** @param {number} degrees positive turns clockwise */
    rotate(degrees) {
      viewer.viewport.setRotation((viewer.viewport.getRotation() + degrees + 360) % 360);
    },
    /** @param {number} factor above 1 zooms in */
    zoom(factor) {
      viewer.viewport.zoomBy(factor);
      viewer.viewport.applyConstraints();
    },
    fit() {
      viewer.viewport.goHome();
    },
    get zoomLevel() {
      return viewer.viewport.getZoom();
    },
    /** @param {(message: string) => void} handler */
    onError(handler) {
      viewer.addHandler("open-failed", (/** @type {any} */ e) => handler(String(e.message ?? "Bild konnte nicht geöffnet werden.")));
    },
  };
}
