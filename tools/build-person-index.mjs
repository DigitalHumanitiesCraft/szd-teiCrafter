// Builds data/register/szd-persons.json from the person index of Stefan Zweig
// Digital (GAMS object o:szd.personen, CC BY 4.0), so the editor searches a
// small prebuilt list instead of parsing the TEI at runtime.
//
// Run: node tools/build-person-index.mjs   (needs network access to GAMS)
//
// The index TEI has a flat, regular <person> structure; a regular expression
// per entry is enough here. A schema change upstream shows up as entries
// without a name, which the script reports instead of writing them.

import { mkdirSync, writeFileSync } from "node:fs";
import { fold } from "../js/register.js";

const SOURCE = "https://gams.uni-graz.at/o:szd.personen/TEI_SOURCE";
const OUT = new URL("../data/register/szd-persons.json", import.meta.url);

const text = (s) => (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`);
const tei = await response.text();

const persons = [];
const unnamed = [];
const withoutId = [];
for (const m of tei.matchAll(/<person\b([^>]*)>([\s\S]*?)<\/person>/g)) {
  const [, attrs, body] = m;
  const id = attrs.match(/xml:id="([^"]+)"/)?.[1];
  if (!id) {
    withoutId.push(text(body).slice(0, 40));
    continue;
  }
  const surname = decode(text(body.match(/<surname[^>]*>([\s\S]*?)<\/surname>/)?.[1]));
  const forename = decode(text(body.match(/<forename[^>]*>([\s\S]*?)<\/forename>/)?.[1]));
  const plain = decode(text(body.match(/<persName[^>]*>([\s\S]*?)<\/persName>/)?.[1]));
  const name = surname ? [surname, forename].filter(Boolean).join(", ") : plain;
  if (!name) {
    unnamed.push(id);
    continue;
  }
  const gnd = body.match(/<persName[^>]*\sref="[^"]*gnd\/([0-9X-]+)"/i)?.[1] ?? "";
  const birth = body.match(/<birth[^>]*when="([^"]+)"/)?.[1] ?? "";
  const death = body.match(/<death[^>]*when="([^"]+)"/)?.[1] ?? "";
  const variants = decode(text(body.match(/<note[^>]*type="variants"[^>]*>([\s\S]*?)<\/note>/)?.[1]));
  persons.push({
    id,
    name,
    gnd,
    dates: [birth, death].filter(Boolean).join("–"),
    search: fold([name, forename && surname ? `${forename} ${surname}` : "", variants].join(" ")),
  });
}

if (!persons.length) throw new Error("No persons found; the index structure may have changed.");
mkdirSync(new URL(".", OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ source: SOURCE, licence: "CC BY 4.0", retrieved: new Date().toISOString().slice(0, 10), persons }, null, 0)}\n`,
);
console.log(`${persons.length} persons written to ${OUT.pathname}`);
if (unnamed.length) console.log(`Skipped without a name: ${unnamed.join(", ")}`);
if (withoutId.length) console.log(`Skipped without xml:id: ${withoutId.length}, e.g. ${withoutId.slice(0, 3).join(" | ")}`);
