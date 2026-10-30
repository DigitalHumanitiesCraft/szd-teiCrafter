// Thin wrapper around the vendored OpenSeadragon, one page at a time.

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
    showNavigator: true,
    navigatorPosition: "BOTTOM_RIGHT",
    gestureSettingsMouse: { clickToZoom: false },
    crossOriginPolicy: "Anonymous",
  });

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
    /** @param {(message: string) => void} handler */
    onError(handler) {
      viewer.addHandler("open-failed", (/** @type {any} */ e) => handler(String(e.message ?? "Bild konnte nicht geöffnet werden.")));
    },
  };
}
