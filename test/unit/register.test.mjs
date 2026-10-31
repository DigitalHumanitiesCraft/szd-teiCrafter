// The person register search on the real person index, with fetch answered
// from the file, since Node's fetch does not read file URLs.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { searchRegister } from "../../js/register.js";

const INDEX = readFileSync(new URL("../../data/register/szd-persons.json", import.meta.url), "utf8");
globalThis.fetch = /** @type {any} */ (async () => new Response(INDEX, { status: 200 }));

test("names beginning with the query come first", async () => {
  const hits = await searchRegister("persons.json", "Fuchs");
  assert.ok(hits.length > 0);
  assert.match(hits[0].name, /^Fuchs/);
  const firstOther = hits.findIndex((p) => !/^Fuchs/.test(p.name));
  const lastFuchs = hits.findLastIndex((p) => /^Fuchs/.test(p.name));
  assert.ok(firstOther === -1 || firstOther > lastFuchs, "no other name before a Fuchs");
});

test("forms of address are ignored", async () => {
  const hits = await searchRegister("persons.json", "Herr Fuchs", ["Herr"]);
  assert.match(hits[0].name, /^Fuchs/);
});

test("person references use the form of the holdings and read the older full URI", async () => {
  const { source } = await import("../../js/source.js");
  assert.equal(source.person.registerRef("SZDPER.2188"), "#SZDPER.2188");
  assert.equal(source.person.registerIdOf("#SZDPER.2188"), "SZDPER.2188");
  assert.equal(source.person.registerIdOf("https://gams.uni-graz.at/o:szd.personen#SZDPER.2188"), "SZDPER.2188");
  assert.equal(source.person.registerIdOf("http://d-nb.info/gnd/118636758"), "");
});

test("place references hold the GND and GeoNames, organisations their index URI or GND", async () => {
  const { source } = await import("../../js/source.js");
  const ref = source.place.ref("4066009-6", "2761367");
  assert.equal(ref, "http://d-nb.info/gnd/4066009-6 http://www.geonames.org/2761367");
  assert.equal(source.place.gndOf(ref), "4066009-6");
  assert.equal(source.place.geonamesOf(ref), "2761367");
  assert.equal(source.place.ref("", "2761367"), "http://www.geonames.org/2761367");
  assert.equal(source.organisation.registerRef("SZDORG.2"), "https://gams.uni-graz.at/o:szd.organisation#SZDORG.2");
  assert.equal(source.organisation.choiceOf({ id: "SZDORG.61", gnd: "10102943-3" }), "10102943-3");
  assert.equal(source.organisation.choiceOf({ id: "SZDORG.9", gnd: "" }), "SZDORG.9");
});
