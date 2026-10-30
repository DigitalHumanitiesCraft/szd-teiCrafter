// Source-specific configuration for Stefan Zweig Digital. A derivation for
// another edition replaces this file; the generic modules stay untouched.

// Reference forms of the Stefan Zweig Digital holdings: persons point to the
// entry of the person index with a fragment, because a reference without it
// never reaches the person view; GND URIs use http as in the holdings.
const PERSON_INDEX = "https://gams.uni-graz.at/o:szd.personen#";
const GND_PREFIX = "http://d-nb.info/gnd/";

export const source = {
  name: "Stefan Zweig Digital",
  /** Product name for the title fallback, the acceptance note and browser storage. */
  product: "teiCrafter SZD",
  storageKey: "teicrafter-szd",
  defaultDocument: "data/o_szd.1222.tei.xml",
  /** The document list by collection, built by tools/build-document-index.mjs. */
  documents: "data/index.json",

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

  /**
   * Person annotation: the SZD person index first, the GND for persons not
   * in it. `ignore` lists words of address that a marked name often carries.
   */
  person: {
    register: "data/register/szd-persons.json",
    registerLabel: "SZD-Personenindex",
    /** An identifier of the register, named as an example in messages. */
    idExample: "SZDPER.2188",
    ignore: ["Frau", "Fräulein", "Herr", "Herrn", "Dr", "Doktor", "Professor", "Prof"],
    /** @param {string} id e.g. SZDPER.2188 */
    registerRef: (id) => `${PERSON_INDEX}${id}`,
    /** @param {string} id */
    gndRef: (id) => `${GND_PREFIX}${id}`,
    /** @param {string} value */
    isRegisterId: (value) => /^SZDPER\.\d+$/.test(value.trim()),
    /** The marked text without HTR marker syntax, as a search query. @param {string} text */
    nameOf: (text) => text.replace(/~~|\[\?\]|[{}]/g, "").trim(),
    /** @param {string} text @param {string} ref */
    markup: (text, ref) => `<persName ref="${ref}">${text}</persName>`,
  },

  /**
   * What counts as open work in this edition. Each derivation defines its own
   * queue; here it is the HTR markers the wraps below resolve.
   */
  openWork: "Nicht aufgelöste HTR-Marker",

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
