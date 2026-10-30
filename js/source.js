// Source-specific configuration for Stefan Zweig Digital. A derivation for
// another edition replaces this file; the generic modules stay untouched.

const GND_PREFIX = "https://d-nb.info/gnd/";

export const source = {
  name: "Stefan Zweig Digital",
  defaultDocument: "data/o_szd.1222.tei.xml",

  /**
   * GAMS serves a IIIF Presentation manifest per SZD object. The TEI carries
   * the object id as idno[@type="objectId"] in the form o_szd.NNNN.
   * @param {Record<string, string>} idnos
   * @returns {string | null}
   */
  manifestFor(idnos) {
    const id = idnos.objectId;
    if (!id || !/^o_szd\.\d+$/.test(id)) return null;
    return `https://gams.uni-graz.at/${id.replace("_", ":")}/sdef:IIIF/getManifest`;
  },

  /**
   * Element suggestions in the editor: the small set the letter work needs,
   * not the whole of TEI. Typing "<" offers these.
   */
  elements: [
    { name: "persName", attributes: ["ref"] },
    { name: "placeName", attributes: ["ref"] },
    { name: "add", attributes: [{ name: "place", values: ["above", "below", "margin", "inline"] }, "hand"] },
    { name: "del", attributes: [{ name: "rend", values: ["strikethrough", "overwritten", "erased"] }, "hand"] },
    { name: "unclear", attributes: [{ name: "reason", values: ["illegible", "faded", "damage"] }, "cert"] },
    { name: "lb" },
    { name: "pb", attributes: ["n", "facs"] },
    { name: "p" },
  ],

  /** How a person annotation with a GND id is written into the text. */
  person: {
    /** @param {string} text @param {string} gndId */
    markup: (text, gndId) => `<persName ref="${GND_PREFIX}${gndId}">${text}</persName>`,
  },

  /**
   * Wrapping actions on a selection. The szd-htr transcription writes open
   * editorial work as plain-text markers; `marker` finds them in the text,
   * `strip` removes the marker syntax when the selection carries it, so a
   * marked "~~amb~~" becomes <del>amb</del> and an unmarked selection is
   * wrapped as it is.
   */
  wraps: [
    {
      key: "del",
      label: "Streichung",
      element: "del",
      marker: /~~[^~\n<>]+?~~/g,
      strip: (/** @type {string} */ t) => t.replace(/^~~([\s\S]*)~~$/, "$1"),
    },
    {
      key: "unclear",
      label: "Unsicher",
      element: "unclear",
      marker: /[^\s<>[\]{}]+\[\?\]/g,
      strip: (/** @type {string} */ t) => t.replace(/^([\s\S]*)\[\?\]$/, "$1"),
    },
    {
      key: "add",
      label: "Ergänzung",
      element: "add",
      marker: /\{[^{}\n<>]+\}/g,
      strip: (/** @type {string} */ t) => t.replace(/^\{([\s\S]*)\}$/, "$1"),
    },
  ],
};
