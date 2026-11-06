// The action registry, its check against the schema, and the date parser of
// the date action, each without a browser.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkAgainstSchema, lineBreakPattern, loadActions, markerDetectors, serializeRegistry, stripMarker, withAttributes, wrap } from "../../docs/js/actions.js";
import { dateContext, isIsoDate, parseDate } from "../../docs/js/dates.js";
import { schemaChecker } from "../../docs/js/schema.js";
import { source } from "../../docs/js/source.js";

const FILE = new URL("../../docs/data/actions.json", import.meta.url);
const text = readFileSync(FILE, "utf8");
const registry = JSON.parse(text);
const byId = (/** @type {string} */ id) => registry.actions.find((/** @type {any} */ a) => a.id === id);
const problem = schemaChecker(readFileSync(new URL(`../../docs/${source.schemas.at(-1).url}`, import.meta.url), "utf8"));

test("the registry loads, and the schema knows every action", () => {
  const actions = checkAgainstSchema(loadActions(registry), problem);
  assert.deepEqual(
    actions.map((a) => `${a.id}:${a.element}:${a.refused}`),
    ["person:persName:", "place:placeName:", "organisation:orgName:", "date:date:", "del:del:", "unclear:unclear:", "add:add:"],
  );
});

test("an element or attribute the schema does not know is refused with a reason", () => {
  const extra = [
    { ...byId("del"), id: "foo", key: "f", element: "foobar" },
    { ...byId("del"), id: "bar", key: "b", attributes: [{ name: "bogus" }] },
  ];
  const actions = checkAgainstSchema(loadActions({ actions: [...registry.actions, ...extra] }), problem);
  assert.equal(actions.find((a) => a.id === "foo")?.refused, "Das Schema kennt kein Element <foobar>.");
  assert.equal(actions.find((a) => a.id === "bar")?.refused, "Das Schema erlaubt an <del> kein @bogus.");
});

test("malformed entries, duplicate ids and keys are refused, not thrown", () => {
  const actions = loadActions({
    actions: [
      { ...byId("del"), element: "a b" },
      { ...byId("del") },
      { ...byId("unclear"), key: "s" },
      { ...byId("unclear"), dialog: "macro" },
    ],
  });
  assert.match(actions[0].refused, /XML-Name/);
  assert.equal(actions[1].refused, "");
  assert.match(actions[2].refused, /Taste s/);
  assert.match(actions[3].refused, /Dialog „macro“/);
});

test("an unchanged registry is written back byte-identical, a toggle changes one value", () => {
  const actions = loadActions(registry);
  assert.equal(serializeRegistry(registry.$comment, actions), text);
  actions[3].enabled = false;
  const toggled = serializeRegistry(registry.$comment, actions);
  const changed = toggled.split("\n").filter((l, i) => l !== text.split("\n")[i]);
  assert.deepEqual(changed, ['      "enabled": false']);
  assert.equal(serializeRegistry(registry.$comment, actions, "\r\n").split("\r\n").length, toggled.split("\n").length);
});

test("markers are declarative patterns: detection, stripping and wrapping", () => {
  const actions = loadActions(registry);
  const del = /** @type {any} */ (actions.find((a) => a.id === "del"));
  assert.equal(stripMarker(del, "~~amb~~"), "amb");
  assert.equal(stripMarker(del, "Wort"), "Wort");
  assert.equal(wrap(del, stripMarker(del, "~~amb~~")), "<del>amb</del>");
  const unclear = /** @type {any} */ (actions.find((a) => a.id === "unclear"));
  assert.equal(stripMarker(unclear, "H~~amb~~[?]"), "H~~amb~~");
  // A switched-off action still counts its markers, but offers no action.
  del.enabled = false;
  const detector = markerDetectors(actions).find((d) => d.key === "del");
  assert.deepEqual(detector?.find("a ~~b~~ c"), [{ from: 2, to: 7 }]);
  assert.equal(detector?.action, undefined);
});

test("attributes are set, replaced and removed on an opening tag", () => {
  assert.equal(withAttributes('<persName ref="a">', { ref: "b" }), '<persName ref="b">');
  assert.equal(withAttributes("<placeName>", { ref: "http://d-nb.info/gnd/1" }), '<placeName ref="http://d-nb.info/gnd/1">');
  assert.equal(withAttributes("<date when='1935' type=\"x\">", { when: null, from: "1935", to: "1936" }), '<date type="x" from="1935" to="1936">');
  assert.equal(withAttributes("<date>", { when: 'a"<b' }), '<date when="a&quot;&lt;b">');
});

test("dates in German text become ISO values", () => {
  const cases = {
    "4.Januar 1935": { form: "when", when: "1935-01-04" },
    "4. Januar 1935": { form: "when", when: "1935-01-04" },
    "Mai 1924": { form: "when", when: "1924-05" },
    1935: { form: "when", when: "1935" },
    "4.1.1935": { form: "when", when: "1935-01-04" },
    "1924–1926": { form: "range", from: "1924", to: "1926" },
    "4.–6. Mai 1935": { form: "range", from: "1935-05-04", to: "1935-05-06" },
  };
  for (const [input, expected] of Object.entries(cases)) {
    const { at, ...value } = /** @type {any} */ (parseDate(String(input)));
    assert.deepEqual(value, expected, input);
  }
});

test("the date part of a selection with words around it is located", () => {
  const sel = "Nizza, den 4.Januar 1935.";
  const parsed = /** @type {any} */ (parseDate(sel));
  assert.equal(sel.slice(parsed.at.from, parsed.at.to), "4.Januar 1935");
});

test("no date, and an impossible one, propose nothing", () => {
  assert.equal(parseDate("Hotel Westminster"), null);
  assert.equal(parseDate("31.2.1935"), null);
  assert.equal(parseDate("Maier"), null);
});

test("only ISO dates that exist pass", () => {
  for (const ok of ["1935", "1935-01", "1935-01-04", "1936-02-29"]) assert.ok(isIsoDate(ok), ok);
  for (const bad of ["35", "1935-13", "1935-02-29", "1935-1-4", "4.1.1935", ""]) assert.ok(!isIsoDate(bad), bad);
});

test("dates of the working set in German, English, French and Roman forms", () => {
  const value = (/** @type {string} */ t, /** @type {any} */ ctx = null) => {
    const p = parseDate(t, ctx);
    return p && (p.form === "when" ? p.when : p.form === "range" ? `${p.from}/${p.to}` : `${p.notBefore}..${p.notAfter}`) + (p.inferred ? " inferred" : "");
  };
  // Forms with their year, from the bodies of the working set.
  assert.equal(value("3 Juni 1936"), "1936-06-03");
  assert.equal(value("10 Juillet 1939"), "1939-07-10");
  assert.equal(value("June 6th. 1944"), "1944-06-06");
  assert.equal(value("October 31, 1938"), "1938-10-31");
  assert.equal(value("29th June, 1934"), "1934-06-29");
  assert.equal(value("18.VI.1930"), "1930-06-18");
  assert.equal(value("1906-11-23"), "1906-11-23");
  assert.equal(value("Spring 1944"), "1944-03..1944-05");
  assert.equal(value("1.-10. März\n        <lb/>1938"), "1938-03-01/1938-03-10");
  // Incomplete forms need the document date and are reported as inferred.
  const letter = dateContext("1935-01-04");
  assert.equal(value("am 10."), null);
  assert.equal(value("am 10.", letter), "1935-01-10 inferred");
  assert.equal(value("8.Oktober", letter), "1935-10-08 inferred");
  assert.equal(value("27.6.44", dateContext("1944-06-27")), "1944-06-27 inferred");
  assert.equal(value("6.I.36", dateContext("1936")), "1936-01-06 inferred");
  assert.equal(value("im Herbst", letter), "1935-09..1935-11 inferred");
  assert.equal(value("über den Winter", letter), "1935-12..1936-02 inferred");
  assert.equal(value("gestern", letter), "1935-01-03 inferred");
  assert.equal(value("gestern", dateContext("1935")), null);
  assert.equal(value("vom 5. ds.", dateContext("1938-03-02")), "1938-03-05 inferred");
});

test("the document date comes from the title, and „o. D.“ names none", () => {
  const doc = (/** @type {string} */ title) => `<TEI><teiHeader><fileDesc><titleStmt><title>${title}</title></titleStmt></fileDesc></teiHeader></TEI>`;
  assert.equal(source.documentDate(doc("Brief an Anna Meingast vom 4. Januar 1935, SZ-SAM/B7.52")), "1935-01-04");
  assert.equal(source.documentDate(doc("Postkarte, 1906-11-23, Palermo")), "1906-11-23");
  assert.equal(source.documentDate(doc('Deckblatt "Copyr. Bureau Korresp. 1939", o. D.')), null);
});

test("a passage may span line breaks with or without attributes, and nothing else", () => {
  const strip = (/** @type {string} */ t) => t.replace(lineBreakPattern("lb"), "");
  assert.equal(strip('H~~amb~~[?]\n        <lb/>Goetzfried'), "H~~amb~~[?]\n        Goetzfried");
  assert.equal(strip('Goetz-\n<lb n="12" break="no"/>fried'), "Goetz-\nfried");
  assert.equal(strip("a<lbx/>b<p/>"), "a<lbx/>b<p/>");
});
