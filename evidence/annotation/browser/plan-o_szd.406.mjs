// Decisions for o_szd.406, from the look-up pass (erk-2.json) and lobid-gnd
// records read outside the editor (GeoNames sameAs, bodies). Pages 2 and 3
// carry the same text; the copy on page 3 (nth 1) is done first, so the
// line count of the copy on page 2 does not shift when markup breaks a key.
const DUS = { query: "Düsseldorf", hit: "4013255-9", geonames: "2934246" };
const SBG = { query: "Salzburg", hit: "4076982-3", geonames: "2766824" };
const page = (nth) => [
  { kind: "org", line: "Rheinrestaurant Schnellenburg", text: "Rheinrestaurant Schnellenburg", nth },
  { kind: "person", line: "Fernruf 301 20", text: "Franz Herriger", gnd: true, nth },
  { kind: "place", line: "Fernruf 301 20", text: "Düsseldorf", ...DUS, nth, refNth: nth },
  { kind: "person", line: "Hans Morth", text: "Hans Morth", gnd: nth === 1, nth },
  { kind: "personTyped", line: "Irene Spiess, W.", text: "W.", nth },
  { kind: "person", line: "Irene Spiess", text: "Irene Spiess", gnd: nth === 1, nth },
  { kind: "person", line: "Hiede ell Vries", text: "Hiede ell Vries", gnd: nth === 1, nth },
  { kind: "person", line: "Margot Engel", text: "Margot Engel", gnd: nth === 1, nth },
  { kind: "personTyped", line: "H. [?] [?] [?]", text: "H.", nth },
  { kind: "person", line: "Stephan Zweig", text: "Stephan Zweig", query: "Stefan Zweig", hit: "SZDPER.1560", nth },
  { kind: "place", line: "Salzburg", text: "Salzburg", ...SBG, nth, refNth: nth },
];
export const plan = [
  { kind: "place", line: "18.VI.1930", text: "Düsseldorf", ...DUS },
  { kind: "date", line: "18.VI.1930", text: "18.VI.1930", when: "1930-06-18", untrim: true, shot: "date" },
  ...page(1),
  ...page(0),
];
