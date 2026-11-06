// Builds docs/data/register/szd-organisations.json from the organisation index of
// Stefan Zweig Digital (GAMS object o:szd.organisation, CC BY 4.0), the
// counterpart of tools/build-person-index.mjs.
//
// Run: node tools/build-organisation-index.mjs   (needs network access to GAMS)

import { mkdirSync, writeFileSync } from "node:fs";
import { fold } from "../docs/js/register.js";

const SOURCE = "https://gams.uni-graz.at/o:szd.organisation/TEI_SOURCE";
const OUT = new URL("../docs/data/register/szd-organisations.json", import.meta.url);

const text = (s) => (s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE} answered ${response.status}`);
const tei = await response.text();

const entries = [];
const unnamed = [];
for (const m of tei.matchAll(/<org\b([^>]*)>([\s\S]*?)<\/org>/g)) {
  const [, attrs, body] = m;
  const id = attrs.match(/xml:id="([^"]+)"/)?.[1];
  if (!id) continue;
  const names = [...body.matchAll(/<orgName([^>]*)>([\s\S]*?)<\/orgName>/g)];
  const main = names.find((n) => !/type="variant"/.test(n[1]));
  const name = decode(text(main?.[2]));
  if (!name) {
    unnamed.push(id);
    continue;
  }
  const gnd = main?.[1].match(/ref="[^"]*gnd\/([0-9X-]+)"/i)?.[1] ?? "";
  const place = [body.match(/<settlement[^>]*>([\s\S]*?)<\/settlement>/)?.[1], body.match(/<country[^>]*>([\s\S]*?)<\/country>/)?.[1]]
    .map((s) => decode(text(s)))
    .filter(Boolean)
    .join(", ");
  const variants = names.filter((n) => n !== main).map((n) => decode(text(n[2])));
  entries.push({ id, name, gnd, dates: place, search: fold([name, ...variants].join(" ")) });
}

if (!entries.length) throw new Error("No organisations found; the index structure may have changed.");
mkdirSync(new URL(".", OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify({ source: SOURCE, licence: "CC BY 4.0", retrieved: new Date().toISOString().slice(0, 10), entries }, null, 0)}\n`,
);
console.log(`${entries.length} organisations written to ${OUT.pathname}`);
if (unnamed.length) console.log(`Skipped without a name: ${unnamed.join(", ")}`);
