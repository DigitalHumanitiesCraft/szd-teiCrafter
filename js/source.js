// Source-specific configuration for Stefan Zweig Digital. A derivation for
// another edition replaces this file and data/actions.json; the generic
// modules stay untouched.

import { markerDetectors } from "./actions.js";
import { matchesOf } from "./state.js";

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
   * The collections of the holdings, one folder under data/ each (ADR-009).
   * The document list, tools/build-document-index.mjs and
   * tools/import-working-set.mjs read them from here.
   */
  collections: [
    { key: "korrespondenzen", label: "Korrespondenzen", description: "Briefe von und an Stefan Zweig, mit Umschlägen und Beilagen." },
    { key: "lebensdokumente", label: "Lebensdokumente", description: "Verträge, Ausweise, Notizbücher und Register aus Zweigs Leben." },
    { key: "werke", label: "Werke", description: "Manuskripte und Typoskripte seiner Werke, meist mit Personen im standOff." },
    { key: "aufsatzablage", label: "Aufsatzablage", description: "Zweigs Ablage von Aufsätzen und Zeitungsbeiträgen." },
  ],

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
   * Element suggestions in the editor: the structural elements the letter
   * work needs, not the whole of TEI. The elements of the actions are added
   * from the registry. Typing "<" offers these.
   */
  elements: [{ name: "lb" }, { name: "pb", attributes: ["n", "facs"] }, { name: "p" }],

  /**
   * The annotation actions as data (js/actions.js): element, attributes,
   * dialog, views and the HTR marker each resolves. The schema refuses an
   * action whose markup it does not know when the editor loads.
   */
  actions: "data/actions.json",
  schema: "schemas/tei-p5-4.11.0/tei_all.rng",
  schemaLabel: "TEI All (P5 4.11.0)",

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
    /** GND URIs carry the check character in upper case. @param {string} id */
    gndRef: (id) => `${GND_PREFIX}${id.trim().toUpperCase()}`,
    /** @param {string} value */
    isRegisterId: (value) => /^SZDPER\.\d+$/.test(value.trim()),
    /** The register id of a reference, or "". @param {string} ref */
    registerIdOf: (ref) => (ref.startsWith(PERSON_INDEX) ? ref.slice(PERSON_INDEX.length) : ""),
    /** The GND id of a reference, or "". @param {string} ref */
    gndOf: (ref) => (ref.startsWith(GND_PREFIX) ? ref.slice(GND_PREFIX.length) : ""),
    /** The marked text without HTR marker syntax, as a search query. @param {string} text */
    nameOf: (text) => text.replace(/~~|\[\?\]|[{}]/g, "").trim(),
  },

  /**
   * Places: marked as placeName, with a GND reference when one is chosen.
   * Without one the place stays „noch nicht verknüpft“. Which places are
   * marked and how belongs to the editorial rules (S4 in knowledge/plan.md).
   * GeoNames is not configured, because its API needs a registered user name.
   */
  place: {
    /** @param {string} id */
    gndRef: (id) => `${GND_PREFIX}${id.trim().toUpperCase()}`,
    /** The GND id of a reference, or "". @param {string} ref */
    gndOf: (ref) => (ref.startsWith(GND_PREFIX) ? ref.slice(GND_PREFIX.length) : ""),
  },

  /**
   * The text view (js/textview.js): which part of the document it shows, how
   * structure becomes layout, and how open HTR spots look in it.
   */
  textView: {
    root: "body",
    lineBreak: "lb",
    pageBreak: "pb",
    blocks: ["div", "p", "head", "ab", "lg", "l", "list", "item", "opener", "closer", "dateline", "salute", "signed", "postscript", "note", "table", "row", "fw"],
    /** Element labels for the card of a marked passage. */
    marks: { persName: "Person", placeName: "Ort", date: "Datum", del: "Streichung", add: "Ergänzung", unclear: "Unsicher" },
    /** Parts of open spots drawn as a badge instead of their marker text. */
    badges: [
      { pattern: "\\[\\?(?:\\d+\\?)?\\]", text: "?", tip: "Unsicher gelesen, noch offen" },
      { pattern: "\\[\\.\\.\\.(?:\\d+\\.\\.\\.)?\\]", text: "Lücke", tip: "Unlesbare Stelle, noch offen" },
    ],
  },
};

/**
 * Open work without an action yet: HTR output of szd-htr that has no
 * encoding rule (S4 in knowledge/plan.md), so F8 selects it and the menu says
 * so. Brackets count only standing apart from words, so a supplied "G[ro]d" or
 * a numbered "[3500]" is left alone, and the header is not searched.
 * @type {import("./state.js").Detector[]}
 */
const unresolved = [
  {
    // [?] or [?3?] on its own, not attached to a word as the Unsicher marker is.
    key: "unsure",
    label: "Unsicher ohne Wort",
    find: matchesOf(/(?<![^\s<>[\]{}])\[\?(?:\d+\?)?\]/g),
  },
  {
    // [...] and [...5...]: an illegible passage, with the estimated number of characters.
    key: "gap",
    label: "Lücke",
    find: matchesOf(/\[\.\.\.(?:\d+\.\.\.)?\]/g),
  },
  {
    // A remark of the transcription such as [Randnotiz links:] or [Unterschrift unleserlich].
    key: "remark",
    label: "HTR-Kommentar",
    find: matchesOf(/(?<![\p{L}\p{N}])\[\p{L}[^[\]<>\n]{2,}\](?![\p{L}\p{N}])/gu),
  },
];

/**
 * What counts as open work in this edition: the markers the actions of the
 * registry resolve, then the kinds without an action.
 * @param {import("./actions.js").LoadedAction[]} actions
 * @returns {import("./state.js").Detector[]}
 */
export function openWorkFor(actions) {
  const markers = markerDetectors(actions);
  /**
   * Marker syntax the actions do not resolve, such as a deletion running over
   * a line break ("~~a raison<lb/>de nouvelles~~"): each leftover "~~", "{" or
   * "}" counts, so such a document is not ready for acceptance.
   * @type {import("./state.js").Detector}
   */
  const stray = {
    key: "stray",
    label: "HTR-Marker über eine Zeile hinaus",
    find(text) {
      const resolved = markers.flatMap((d) => d.find(text));
      return matchesOf(/~~|[{}]/g)(text).filter((r) => !resolved.some((c) => c.from <= r.from && r.to <= c.to));
    },
  };
  return [...markers, ...unresolved, stray];
}
