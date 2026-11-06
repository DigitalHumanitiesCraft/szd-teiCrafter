// Phase 1 of the hybrid run: turns the agent's annotation decisions into one
// proposal file per document (<id>.vorschlaege.json), anchored by line,
// occurrence, offsets and context in the unchanged original, so an editor can
// import them and refuse any proposal whose anchor no longer matches.
//
//   node baue-vorschlaege.mjs
//
// Reads the originals from szd-teiCrafter/data (read-only) and the person
// index for labels; writes only into this folder.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const REPO = "C:/Users/Chrisi/Documents/GitHub/szd-teiCrafter/";
const persons = new Map(JSON.parse(readFileSync(REPO + "data/register/szd-persons.json", "utf8")).persons.map((p) => [p.id, p]));

const GND = "http://d-nb.info/gnd/";
const GEO = "http://www.geonames.org/";

// Reference builders and their basis records.
const reg = (id, doubt) => ({ element: "persName", attributes: { ref: `#${id}` }, basis: [{ kind: "register", id, label: `${persons.get(id).name}${persons.get(id).dates ? ` (${persons.get(id).dates})` : ""}` }], doubt });
const pgnd = (id, label, doubt) => ({ element: "persName", attributes: { ref: GND + id }, basis: [{ kind: "gnd", id, label, source: `https://lobid.org/gnd/${id}.json` }], doubt });
const pnone = (doubt) => ({ element: "persName", attributes: {}, basis: [{ kind: "none", label: "nicht identifiziert" }], doubt });
const place = (gnd, geo, label, doubt) => ({
  element: "placeName",
  attributes: { ref: geo ? `${GND}${gnd} ${GEO}${geo}` : GND + gnd },
  basis: [{ kind: "gnd", id: gnd, label, source: `https://lobid.org/gnd/${gnd}.json`, ...(geo ? { geonames: `https://sws.geonames.org/${geo}`, geonamesFrom: "sameAs of the GND record" } : { geonames: null }) }],
  doubt,
});
const org = (gnd, label, szdorg, doubt) => ({
  element: "orgName",
  attributes: { ref: GND + gnd },
  basis: [
    ...(szdorg ? [{ kind: "orgIndex", id: szdorg, label, source: "https://gams.uni-graz.at/o:szd.organisation/TEI_SOURCE" }] : []),
    { kind: "gnd", id: gnd, label, source: `https://lobid.org/gnd/${gnd}.json` },
  ],
  doubt,
});
const date = (attrs, how, doubt) => ({
  element: "date",
  attributes: attrs,
  basis: [{ kind: attrs.cert === "low" ? "inference" : "text", label: how }],
  doubt,
});

// Places used more than once.
const WIEN = () => place("4066009-6", "2761367", "Wien");
const ZUERICH = () => place("4068038-1", "2657896", "Zürich");
const LONDON = () => place("4074335-4", "2643743", "London");
const OLTEN = () => place("4043506-4", "2659297", "Olten");
const NIZZA = (d) => place("4075416-9", "2990440", "Nizza", d);
const NEWYORK = (d) => place("4042011-5", "5128581", "New York, NY", d);
const VEREIN = (d) => org("2021755-9", "Schweizerisches Vereinssortiment (Firma), Olten", "SZDORG.41", d);
const REICHNER_V = (d) => org("10119809-7", "Herbert-Reichner-Verlag", "SZDORG.24", d);
const WEISFLOG_H = (d) =>
  reg("SZDPER.2226", d ?? "Der Index führt bei SZDPER.2226 die GND 116402873, die zu Herbert Reichner gehört; vermutlich ein Indexfehler. Kandidat in der GND: Weisflog, Heinrich-Julius (1872–1939), Zürcher Jurist, 1051890500.");
const WEISFLOG_W = () => pgnd("1214668852", "Weisflog, Werner (1905), Jurist", "GND-Satz ohne Ort; Zuordnung nur über Name, Beruf und Zeit plausibel.");
const ZWEIG = () => reg("SZDPER.1560");

/**
 * Each entry: [line, text, element spec] or [line, text, spec, occurrence].
 * `text` is the passage as written; a passage running over a line break is
 * given as [end of the line, start of the next line] and anchored with the
 * <lb/> between them.
 */
const DOCS = {
  "o_szd.1222": {
    path: "data/o_szd.1222.tei.xml",
    letterDate: "1935-01-04",
    entries: [
      [36, "Hotel Westminster", org("1259093344", "Hôtel Westminster, Nizza", null, "Hotel als Firma ausgelegt; Briefkopfangabe, nicht Teil des Fließtexts.")],
      [36, "Nizza", NIZZA()],
      [36, "4.Januar 1935", date({ when: "1935-01-04" }, "Datumszeile")],
      [39, "Meingast", reg("SZDPER.1575")],
      [42, "10.", date({ when: "1935-01-10", cert: "low" }, "Tag ohne Monat, Monat und Jahr aus dem Briefdatum 1935-01-04")],
      [43, "New York", NEWYORK()],
      [44, "Viking Press", org("10102943-3", "Viking Press, New York", "SZDORG.61")],
      [44, "New York", NEWYORK()],
      [47, "New York", NEWYORK("Teil der Telegrammadresse „Vikpress New York“; als Ortsnennung markiert.")],
      [50, "Amerika", place("4078704-7", "6252001", "USA", "„Amerika“ meint hier die USA (Reiseziel New York); alternativ GND 4001670-5 Amerika (Kontinent, ohne GeoNames).")],
      [56, "Eugen Wolbe", pgnd("117458201", "Wolbe, Eugen (1873–1938), Historiker, Lehrer, Publizist, Wirkungsort Berlin")],
      [56, "Berlin", place("4005728-8", "2950157", "Berlin")],
      [57, ["H~~amb~~[?]", "Goetzfried"], pnone("Vorname unsicher gelesen (H~~amb~~[?]); weder im Index noch in der GND identifizierbar.")],
      [58, "Lob", pnone("„Professor Lob“ in Nizza; weder im Index noch in der GND gefunden.")],
      [58, "Nice", NIZZA()],
      [59, "Kultusgemeinde", org("123152-2", "Israelitische Kultusgemeinde Wien", null, "Welche Kultusgemeinde gemeint ist, sagt der Text nicht; Wien aus dem Wohnort der Sekretärin erschlossen, Salzburg ist möglich.")],
      [61, "Postsparkasse", org("2001451-X", "Österreichische Postsparkasse", null, "Österreichische Postsparkasse aus dem Kontext (Zahlung durch die Wiener Sekretärin) erschlossen.")],
      [65, "Reichner", reg("SZDPER.2188")],
      [68, "Fuchs", pnone("Im Index stehen Fuchs, Rudolf (SZDPER.439) und Fuchs, Emil (SZDPER.2122); der Text („postenlos“, Aufnahme in den Verlag) entscheidet nicht.")],
      [74, "Herbst", date({ notBefore: "1935-09", notAfter: "1935-11", cert: "low" }, "Jahreszeit, Jahr aus dem Briefdatum; Herbst als September bis November", "Die Regeln nennen Jahreszeiten nicht; Fenster gewählt.")],
      [91, "Stefan[?]", ZWEIG()],
      [95, "Februar", date({ when: "1935-02", cert: "low" }, "Monat ohne Jahr, Jahr aus dem Briefdatum")],
      [99, "Relgis", reg("SZDPER.1153")],
    ],
    notMarked: [
      [42, "Conte di Savoia", "Schiffsname; die Regeln kennen keine Schiffe."],
      [44, "18 East, 48th Street", "Straßenadresse; Straßen sind keine Orte im Sinn der Regeln."],
      [47, "Vikpress", "Telegrammkennung des Verlags, kein Name einer Körperschaft im Text."],
      [55, "Erasmus", "Werktitel (Buch), Werke sind eine spätere Stufe."],
      [56, "Dortmunderstr.11", "Straßenadresse."],
      [58, "La Margolaine, Avenue Primrose", "Villen- und Straßenname."],
      [68, "Verlag", "Gattungswort, kein Name."],
      [80, "Maria Stuart", "Werktitel (Buch), nicht die Person."],
      [84, "Maria Stuart", "Werktitel (Buch), nicht die Person."],
      [100, "Lesung durch den Geist", "Werktitel (vermutlich HTR-Fehler für „Heilung durch den Geist“)."],
    ],
  },
  "o_szd.1786": {
    path: "data/korrespondenzen/o_szd.1786.tei.xml",
    letterDate: "1938-05-10",
    entries: [
      [48, "H. WEISFLOG", WEISFLOG_H()],
      [50, "WERNER WEISFLOG", WEISFLOG_W()],
      [53, "ARNOLD HAUSER", pnone("In der GND nur Hauser, Arnold (1902) ohne Angaben (1089411294); der Kunsthistoriker 118547011 ist ein anderer.")],
      [55, "ZURICH", ZUERICH()],
      [58, "Weisflog", WEISFLOG_H("Teil der Telegrammadresse „Dr. Weisflog, Zürich“; dieselbe Indexfrage wie bei H. WEISFLOG.")],
      [58, "Zürich", ZUERICH()],
      [62, "ZURICH", ZUERICH()],
      [62, "10. Mai 1938", date({ when: "1938-05-10" }, "Datumszeile")],
      [66, "Stefan Z w e i g", ZWEIG()],
      [68, "L o n d o n", LONDON()],
      [69, "E n g l a n d", place("4014770-8", "6269131", "England")],
      [72, "Herbert Reichner", reg("SZDPER.2188")],
      [73, "Zürich", ZUERICH()],
      [75, "4.", date({ when: "1938-05-04", cert: "low" }, "„vom 4. und 5. ds.“: Tag dieses Monats, Monat und Jahr aus dem Briefdatum")],
      [75, "5. ds.", date({ when: "1938-05-05", cert: "low" }, "„ds.“ = dieses Monats, aus dem Briefdatum")],
      [77, "5. ds.", date({ when: "1938-05-05", cert: "low" }, "„ds.“ = dieses Monats, aus dem Briefdatum")],
      [81, "5. ds.", date({ when: "1938-05-05", cert: "low" }, "„ds.“ = dieses Monats, aus dem Briefdatum")],
      [91, "20. April a.c.", date({ when: "1938-04-20", cert: "low" }, "„a.c.“ = anno currente, Jahr aus dem Briefdatum")],
      [96, "England", place("4014770-8", "6269131", "England")],
      [97, "Werner D.Stauffacher", reg("SZDPER.2206")],
      [110, "Herbert Reichner", reg("SZDPER.2188")],
      [111, "Verlag Herbert Reichner", REICHNER_V("Zitierte Firmenbezeichnung; die eingeschlossene Personennennung wird nicht eigens markiert.")],
      [111, "Wien", WIEN()],
      [117, "Herbert Reichner", reg("SZDPER.2188")],
      [119, "Leipzig", place("4035206-7", "2879139", "Leipzig")],
      [119, "Wien", WIEN()],
      [119, "Zürich", ZUERICH()],
      [120, "Wien", WIEN()],
      [121, "1935", date({ when: "1935" }, "Jahreszahl")],
      [122, "Werner D.Stauffacher", reg("SZDPER.2206")],
      [126, "Schweiz", place("4053881-3", "2658434", "Schweiz")],
      [136, "Schweizerische Vereins-Sortiment", VEREIN()],
      [136, "Olten", OLTEN()],
      [142, "H. WEISFLOG", WEISFLOG_H()],
      [142, "WERNER WEISFLOG", WEISFLOG_W()],
      [143, "ZÜRICH", ZUERICH()],
      [144, "10. Mai 1938", date({ when: "1938-05-10" }, "Folgeblattkopf")],
      [144, "Stefan Zweig", ZWEIG()],
      [144, "London", LONDON()],
      [153, "Josef Geiringer", reg("SZDPER.1891")],
      [165, "Wien", WIEN()],
      [171, "Zürich", ZUERICH(), 1],
      [171, "Zürich", ZUERICH(), 2],
      [177, "Zürich", ZUERICH()],
      [180, "Zürich", ZUERICH()],
      [184, "Wien", WIEN()],
      [187, "London", LONDON()],
      [192, "Wien", WIEN()],
      [201, "Olten", OLTEN()],
      [202, "deutschen Reiches", place("2008993-4", null, "Deutsches Reich", "Flektierte Nennung mit Adjektiv; das GND-Land Deutsches Reich hat keinen GeoNames-Link.")],
      [203, ["Schweizerischen Vereins-Sorti-", "ment"], VEREIN()],
      [204, "Olten", OLTEN()],
      [207, ["Schwei-", "zerischen Vereins-Sortiment"], VEREIN()],
      [215, "Olten", OLTEN()],
      [217, "Herbert Reichner-Verlages", REICHNER_V("Kompositum mit Personenname; als Körperschaft markiert.")],
      [223, "H. WEISFLOG", WEISFLOG_H()],
      [223, "WERNER WEISFLOG", WEISFLOG_W()],
      [224, "ZÜRICH", ZUERICH()],
      [225, "10. Mai 1938", date({ when: "1938-05-10" }, "Folgeblattkopf")],
      [225, "Stefan Zweig", ZWEIG()],
      [225, "London", LONDON()],
      [236, ["Schweizerischen", "Vereins-Sortiment"], VEREIN()],
      [243, "Home Office", org("35565-3", "Großbritannien. Home Office", "SZDORG.23")],
      [244, "London", LONDON()],
      [250, "1. März 1938", date({ when: "1938-03-01" }, "Datum im Text")],
      [251, ["1.-10. März", "1938"], date({ from: "1938-03-01", to: "1938-03-10" }, "Zeitraum im Text")],
      [258, "Olten", OLTEN()],
      [260, "Olten", OLTEN()],
      [261, ["Schweizerische Vereins-Sorti-", "ment"], VEREIN()],
      [277, "Gestapo", org("4757614-5", "Deutsches Reich. Geheime Staatspolizei. Staatspolizeileitstelle Wien", null, "„Gestapo in Wien“ als Wiener Leitstelle gelesen; alternativ 2029665-4 Deutsches Reich. Geheime Staatspolizei.")],
      [277, "Wien", WIEN()],
      [298, "H. Weisflog", WEISFLOG_H()],
    ],
    notMarked: [
      [56, "Talacker No. 48", "Straßenadresse."],
      [67, "Hallam Street", "Straßenadresse."],
      [73, "St. Peter-strasse 18", "Straßenadresse."],
      [120, "Zürcher", "Adjektiv."],
      [123, "Schweizerische Handelsregister", "Öffentliches Register, keine handelnde Körperschaft."],
      [124, "Schweizerischen Handelsamtsblatt", "Periodikum, Werkstufe."],
      [152, "Wiener", "Adjektiv."],
      [171, "Peterstrasse 18", "Straßenadresse."],
      [191, "Schweizerischen Handelsregister", "Öffentliches Register, keine handelnde Körperschaft."],
      [196, "Wiener-Niederlassung", "Adjektivisches Kompositum."],
      [230, "zürcherischen Strafgesetzbuche", "Gesetz, Adjektiv."],
      [244, "hiesigen Gesandtschaft", "Gattungsbezeichnung ohne Namen."],
      [254, "Castellio gegen Calvin", "Werktitel."],
      [274, "Wiener Niederlassung", "Adjektiv."],
      [282, "schweizerisch-englischen Auslieferungsvertrage", "Vertrag, Adjektiv."],
    ],
  },
  "o_szd.1079": {
    path: "data/korrespondenzen/o_szd.1079.tei.xml",
    letterDate: "1901-05-22",
    entries: [
      [51, "Max Fleischer", reg("SZDPER.403")],
      [55, "Komotau", place("63291-0", "3077685", "Chomutov (Komotau)")],
      [56, "Böhmen", place("4007467-5", null, "Böhmen", "GND-Satz ohne GeoNames-Link.")],
      [60, "STEFAN ZWEIG", ZWEIG()],
      [64, "Fleischer", reg("SZDPER.403")],
      [69, "Donath", reg("SZDPER.1860", "Index-Eintrag Donath, Adolph ohne Lebensdaten; Zuordnung über den Wiener Dichterkreis um 1901 erschlossen.")],
      [74, "Donath", reg("SZDPER.1860", "wie Zeile 69")],
      [75, "Karlsbad", place("4029705-6", "3073803", "Karlsbad")],
      [77, "Marienbad", place("4037541-9", "3071024", "Marienbad")],
      [79, "Karlsbad", place("4029705-6", "3073803", "Karlsbad")],
      [83, ["Franz", "Evers"], reg("SZDPER.373")],
      [92, "Wien", WIEN()],
      [100, "Schuster &amp; Löffler", org("5325296-2", "Schuster & Loeffler (Berlin)")],
      [101, ["dieser", "Woche"], date({ notBefore: "1901-05-20", notAfter: "1901-05-26", cert: "low" }, "„im Laufe dieser Woche“: Woche des Briefdatums 1901-05-22 (Mittwoch), Montag bis Sonntag", "Briefdatum nur aus dem Titel im Header; die Woche als Fenster gewählt.")],
      [107, "Stefan Zweig", ZWEIG()],
      [113, "Schuster &amp; Löffler", org("5325296-2", "Schuster & Loeffler (Berlin)", null, "Seite 5 wiederholt Seite 4 wörtlich (vermutlich doppelte Transkription); gleich behandelt.")],
      [114, ["dieser", "Woche"], date({ notBefore: "1901-05-20", notAfter: "1901-05-26", cert: "low" }, "wie Zeile 101", "Wiederholung von Seite 4.")],
      [120, "Stefan Zweig", ZWEIG()],
    ],
    notMarked: [
      [48, "Wohlgeboren", "Anrede."],
      [69, "Residenzblatt", "Periodikum, Werkstufe."],
      [76, "nach fahren", "Ortsname fehlt in der Transkription."],
      [77, "16 Jahre", "Dauer."],
      [84, "Stimmen der Gegenwart", "Periodikum, Werkstufe."],
      [99, "nächstens", "Unbestimmte Zeitangabe ohne erschließbaren Wert."],
    ],
  },
};

for (const [id, doc] of Object.entries(DOCS)) {
  const original = readFileSync(REPO + doc.path, "utf8");
  const lines = original.split("\n");
  const lineStart = (n) => lines.slice(0, n - 1).reduce((s, l) => s + l.length + 1, 0);
  const proposals = doc.entries.map(([line, text, spec, occurrence = 1], i) => {
    let from;
    let written;
    if (Array.isArray(text)) {
      const [head, tail] = text;
      const l = lines[line - 1];
      if (!l.trimEnd().endsWith(head)) throw new Error(`${id}:${line} does not end with ${head}`);
      const next = lines[line];
      const m = /^(\s*<lb\/>)/.exec(next);
      if (!m || !next.slice(m[1].length).startsWith(tail)) throw new Error(`${id}:${line + 1} does not start with ${tail}`);
      from = lineStart(line) + l.trimEnd().length - head.length;
      written = original.slice(from, lineStart(line + 1) + m[1].length + tail.length);
    } else {
      const l = lines[line - 1];
      let at = -1;
      for (let k = 0; k < occurrence; k++) at = l.indexOf(text, at + 1);
      if (at < 0) throw new Error(`${id}:${line} has no ${text} #${occurrence}`);
      from = lineStart(line) + at;
      written = text;
    }
    const to = from + written.length;
    if (original.slice(from, to) !== written) throw new Error(`${id}:${line} offset mismatch`);
    return {
      id: `${id}#v${String(i + 1).padStart(3, "0")}`,
      line,
      text: written,
      shown: written.replace(/\n\s*<lb\/>/g, " | "),
      occurrence,
      offset: { from, to },
      context: { before: original.slice(Math.max(0, from - 24), from), after: original.slice(to, to + 24) },
      element: spec.element,
      attributes: spec.attributes,
      basis: spec.basis,
      doubt: spec.doubt ?? null,
      status: Object.keys(spec.attributes).some((k) => k !== "cert") ? "proposed" : "proposed-open",
    };
  });
  // Overlaps would make proposals mutually exclusive; the format forbids them.
  const sorted = [...proposals].sort((a, b) => a.offset.from - b.offset.from);
  for (let k = 1; k < sorted.length; k++) if (sorted[k].offset.from < sorted[k - 1].offset.to) throw new Error(`overlap ${sorted[k].id}`);
  const out = {
    format: "teicrafter-proposals/0.1",
    document: id,
    source: { path: doc.path, sha256: createHash("sha256").update(original).digest("hex"), lineEnding: "LF", offsets: "UTF-16 code units in the file as read, LF line breaks" },
    producer: { kind: "llm-agent", model: "claude-opus-5-5", revised: false, created: "2026-10-31", rules: "szd-teiCrafter/knowledge/annotation.md" },
    letterDate: { value: doc.letterDate, basis: "teiHeader/titleStmt/title" },
    proposals,
    notMarked: doc.notMarked.map(([line, text, reason]) => ({ line, text, reason })),
  };
  writeFileSync(new URL(`${id}.vorschlaege.json`, import.meta.url), JSON.stringify(out, null, 2) + "\n");
  console.log(id, proposals.length, "proposals,", out.notMarked.length, "not marked");
}
