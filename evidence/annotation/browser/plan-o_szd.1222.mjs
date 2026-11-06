// Decisions for o_szd.1222, from the look-up pass (erk-1222.json, erk-2.json)
// and lobid-gnd records read outside the editor (GeoNames sameAs, bodies).
const GND = "http://d-nb.info/gnd/";
export const plan = [
  { kind: "place", line: "Hotel Westminster", text: "Nizza", query: "Nizza", hit: "4075416-9", geonames: "2990440" },
  { kind: "date", line: "Hotel Westminster", text: "4.Januar 1935", when: "1935-01-04" },
  { kind: "person", line: "Liebe Frau Meingast", text: "Meingast", hit: "SZDPER.1575" },
  { kind: "date", line: "dass ich am 10. mit", text: "10.", when: "1935-01-10", cert: "low", certLine: "dass ich am" },
  { kind: "place", line: "di Savoia nach", text: "New York", query: "New York, NY", hit: "4042011-5", geonames: "5128581" },
  { kind: "org", line: "verständlich die", text: "Viking Press", ref: `${GND}10102943-3` },
  { kind: "place", line: "18 East, 48th", text: "New York", query: "New York, NY", hit: "4042011-5", geonames: "5128581" },
  { kind: "place", line: "Telegrammadresse", text: "New York", query: "New York, NY", hit: "4042011-5", geonames: "5128581" },
  { kind: "place", line: "zur Zeit in", text: "Amerika", query: "USA", hit: "4078704-7", geonames: "6252001" },
  { kind: "person", line: "Professor Dr. Eugen", text: "Eugen Wolbe", query: "Eugen Wolbe", gnd: true, hit: "117458201" },
  { kind: "place", line: "Dortmunderstr", text: "Berlin", query: "Berlin", hit: "4005728-8", geonames: "2950157" },
  { kind: "personTyped", line: "wenn ich es noch nicht geschrieben", text: "H~~amb~~[?]", endLine: "bei Professor Lob", endText: "Goetzfried" },
  { kind: "person", line: "bei Professor Lob", text: "Lob", query: "Lob", gnd: true },
  { kind: "place", line: "Avenue Primrose", text: "Nice", query: "Nizza", hit: "4075416-9", geonames: "2990440" },
  { kind: "org", line: "Den Brief an die", text: "Kultusgemeinde" },
  { kind: "org", line: "dann den Betrag per", text: "Postsparkasse", ref: `${GND}2029439-6` },
  { kind: "person", line: "was vorgeht. Herr", text: "Reichner", hit: "SZDPER.2188" },
  { kind: "person", line: "dass er Herrn", text: "Fuchs", gnd: true, shot: "fuchs" },
  { kind: "date", line: "Herbst erscheinen", text: "Herbst", span: ["1935-09", "1935-11"], cert: "low", certLine: "erscheinen. Ich werde" },
  { kind: "person", line: "Stefan[?]", text: "Stefan[?]", query: "Stefan Zweig", hit: "SZDPER.1560" },
  { kind: "date", line: "alles in Februar", text: "Februar", when: "1935-02", cert: "low", certLine: "Wir besprechen dann" },
  { kind: "person", line: "Herr Relgis habe", text: "Relgis", hit: "SZDPER.1153" },
];
