// Source-specific configuration for Stefan Zweig Digital. A derivation for
// another edition replaces this file and data/actions.json; the generic
// modules stay untouched.

import { markerDetectors } from "./actions.js";
import { parseDate } from "./dates.js";
import { matchesOf } from "./state.js";

// Reference forms of the Stefan Zweig Digital holdings: persons point to the
// person index as "#SZDPER.n", because the GAMS RDF transform appends @ref to
// the index URI (szd-TORDF.xsl of SZD-split); GND URIs use http as in the
// holdings.
const GND_PREFIX = "http://d-nb.info/gnd/";
const GEONAMES_PREFIX = "http://www.geonames.org/";
const ORGANISATION_INDEX = "https://gams.uni-graz.at/o:szd.organisation#";

export const source = {
  name: "Stefan Zweig Digital",
  /** Product name for the title fallback, the acceptance note and browser storage. */
  product: "teiCrafter SZD",
  storageKey: "teicrafter-szd",
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
   * The date of a document, from which the date dialog completes incomplete
   * dates (knowledge/annotation.md): the converter writes it into the title,
   * „vom 4. Januar 1935“ or „1906-11-23“, and „o. D.“ (ohne Datum) names none.
   * @param {string} xml
   * @returns {string | null} an ISO value
   */
  documentDate(xml) {
    const title = /<titleStmt\b[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/.exec(xml)?.[1].replace(/<[^>]*>/g, "") ?? "";
    if (!title || /\bo\.\s*D\./.test(title)) return null;
    const date = parseDate(title);
    return date?.form === "when" && !date.inferred ? date.when : null;
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
  /**
   * The schemas, strictest first (ADR-014). The editor validates against the
   * first one that loads. The project schema is the RELAX NG generated from
   * the ODD of SZD-split, pinned here once it exists (ADR-010); TEI All is
   * the fallback, which constrains little and compiles slowly.
   * @type {import("./validate.js").SchemaEntry[]}
   */
  schemas: [{ url: "schemas/tei-p5-4.11.0/tei_all.rng", label: "TEI All (P5 4.11.0)", fallback: true }],

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
    registerRef: (id) => `#${id}`,
    /** GND URIs carry the check character in upper case. @param {string} id */
    gndRef: (id) => `${GND_PREFIX}${id.trim().toUpperCase()}`,
    /** @param {string} value */
    isRegisterId: (value) => /^SZDPER\.\d+$/.test(value.trim()),
    /**
     * The register id of a reference, or "". The full URI that earlier
     * versions of the editor wrote is still read. @param {string} ref
     */
    registerIdOf: (ref) => /^(?:https:\/\/gams\.uni-graz\.at\/o:szd\.personen)?#(SZDPER\.\d+)$/.exec(ref.trim())?.[1] ?? "",
    /** The GND id of a reference, or "". @param {string} ref */
    gndOf: (ref) => (ref.startsWith(GND_PREFIX) ? ref.slice(GND_PREFIX.length) : ""),
    /** The marked text without line breaks and HTR marker syntax, as a search query. @param {string} text */
    nameOf: (text) => text.replace(/<[^>]*>/g, " ").replace(/~~|\[\?\]|[{}]/g, "").replace(/\s+/g, " ").trim(),
    title: "Person",
    gndType: "Person",
    /** What a register hit puts into the identifier field. @param {{ id: string }} entry */
    choiceOf: (entry) => entry.id,
  },

  /**
   * Organisation annotation: the SZD organisation index, written as the GND
   * of its entry like the holdings, or as the index URI for a body without a
   * GND (SZD-split knowledge/collections.md); the GND for bodies outside it.
   */
  organisation: {
    register: "data/register/szd-organisations.json",
    registerLabel: "SZD-Organisationsindex",
    idExample: "SZDORG.42",
    ignore: ["der", "die", "das", "dem", "den", "des"],
    /** @param {string} id e.g. SZDORG.42 */
    registerRef: (id) => `${ORGANISATION_INDEX}${id}`,
    /** @param {string} id */
    gndRef: (id) => `${GND_PREFIX}${id.trim().toUpperCase()}`,
    /** @param {string} value */
    isRegisterId: (value) => /^SZDORG\.\d+$/.test(value.trim()),
    /** @param {string} ref */
    registerIdOf: (ref) => (ref.startsWith(ORGANISATION_INDEX) ? ref.slice(ORGANISATION_INDEX.length) : ""),
    /** @param {string} ref */
    gndOf: (ref) => (ref.startsWith(GND_PREFIX) ? ref.slice(GND_PREFIX.length) : ""),
    /** @param {string} text */
    nameOf: (text) => text.replace(/<[^>]*>/g, " ").replace(/~~|\[\?\]|[{}]/g, "").replace(/\s+/g, " ").trim(),
    title: "Organisation",
    gndType: "CorporateBody",
    /** An entry with a GND is referenced by it. @param {{ id: string, gnd: string }} entry */
    choiceOf: (entry) => entry.gnd || entry.id,
  },

  /**
   * The pseudonymous editor (ADR-018): a short code chosen per browser, never
   * a real name, declared in titleStmt and named in one change per day.
   */
  editorRecord: {
    /** @param {string} code */
    id: (code) => `editor-${code}`,
    /** @param {string} code */
    xml: (code) => `<respStmt xml:id="editor-${code}"><resp>Edited in teiCrafter SZD under a pseudonym</resp><name>${code}</name></respStmt>`,
    note: "Bearbeitet im teiCrafter SZD.",
  },

  /**
   * Review of outside proposals (js/proposals.js, knowledge/annotation.md):
   * the roles an accepted proposal names in @resp, declared in titleStmt on
   * its first acceptance, and the identifier a proposal file must name.
   */
  review: {
    producer: {
      id: "resp-agent-annotation",
      xml: '<respStmt xml:id="resp-agent-annotation"><resp>Annotation proposed by an LLM agent under the annotation rules of teiCrafter SZD; run record in the proposal file</resp><name>LLM agent</name></respStmt>',
    },
    reviewer: {
      id: "resp-editor-review",
      xml: '<respStmt xml:id="resp-editor-review"><resp>Proposal reviewed and accepted in teiCrafter SZD</resp><name>Editorial review</name></respStmt>',
    },
    /** @param {Record<string, string>} idnos */
    documentId: (idnos) => idnos.objectId ?? "",
  },

  /**
   * Places (knowledge/annotation.md): placeName with the GND and, where its
   * record links one, GeoNames in one @ref, separated by a space. GeoNames is
   * read from the GND record's sameAs, since its own API needs a registered
   * user name; a place without a GND record may carry GeoNames alone.
   */
  place: {
    /** @param {string} gnd @param {string} geonames either may be "" */
    ref: (gnd, geonames) =>
      [gnd && `${GND_PREFIX}${gnd.trim().toUpperCase()}`, geonames && `${GEONAMES_PREFIX}${geonames.trim()}`].filter(Boolean).join(" "),
    /** The GND id of a reference, or "". @param {string} ref */
    gndOf: (ref) => ref.split(/\s+/).find((r) => r.startsWith(GND_PREFIX))?.slice(GND_PREFIX.length) ?? "",
    /** The GeoNames id of a reference, or "". @param {string} ref */
    geonamesOf: (ref) => /geonames\.org\/(\d+)/.exec(ref)?.[1] ?? "",
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
    marks: { persName: "Person", placeName: "Ort", orgName: "Organisation", date: "Datum", del: "Streichung", add: "Ergänzung", unclear: "Unsicher" },
    /** Elements that point to an authority with @ref; without it they show as not yet linked. */
    linked: ["persName", "placeName", "orgName"],
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
  return [...markers, ...unresolved, stray, unlinked];
}

/**
 * Marks still without their authority or value (knowledge/annotation.md): a
 * linked element without @ref, a date without an ISO value. They block
 * acceptance like the HTR markers, and F8 opens their card to link them.
 * @type {import("./state.js").Detector}
 */
const unlinked = {
  key: "unlinked",
  label: "Noch nicht verknüpft",
  find(text) {
    const names = [...source.textView.linked, "date"].join("|");
    const ranges = [];
    for (const m of text.matchAll(new RegExp(`<(${names})(?=[\\s>/])([^>]*?)(/?)>`, "g"))) {
      if (m[3]) continue;
      const linked = m[1] === "date" ? /\s(?:when|from|to|notBefore|notAfter)="[^"]+"/.test(m[2]) : /\sref="\s*\S[^"]*"/.test(m[2]);
      if (linked) continue;
      const from = (m.index ?? 0) + m[0].length;
      const close = text.indexOf(`</${m[1]}>`, from);
      if (close >= 0) ranges.push({ from, to: close });
    }
    return ranges;
  },
};
