// Turns an annotated working copy into a proposal file (knowledge/data.md,
// Proposal files), so annotations an agent wrote directly into TEI can be
// reviewed one by one in the editor like proposals (ADR-016).
//
// Run: node tools/proposals-from-copy.mjs <annotated copy> [--producer "llm-agent, model"] [--out file]
//
// The original is found by file name under data/. The copy may differ from it
// only by inserted persName, placeName, orgName and date tags; anything else
// stops the script, since a proposal must not carry a changed transcription.

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const ELEMENTS = /^<(\/?)(persName|placeName|orgName|date)\b([^>]*?)(\/?)>/;
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const producer = option("--producer") ?? "llm-agent";
const out = option("--out");
const [copyPath] = args;
if (!copyPath) throw new Error("Usage: node tools/proposals-from-copy.mjs <annotated copy> [--producer text] [--out file]");

const data = new URL("../data/", import.meta.url);
const name = basename(copyPath);
const dir = ["", ...readdirSync(data, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => `${d.name}/`)].find((d) => existsSync(new URL(d + name, data)));
if (dir === undefined) throw new Error(`No original for ${name} under data/`);
const lf = (/** @type {string} */ s) => s.replace(/\r\n?/g, "\n");
const original = lf(readFileSync(new URL(dir + name, data), "utf8"));
const copy = lf(readFileSync(copyPath, "utf8"));

/** @type {{ element: string, attrs: string, from: number }[]} */
const open = [];
const proposals = [];
let at = 0;
for (let i = 0; i < copy.length; ) {
  const tag = copy[i] === "<" ? ELEMENTS.exec(copy.slice(i, i + 2000)) : null;
  // A tag the original has at this point is transcription, not annotation.
  if (tag && !original.startsWith(tag[0], at)) {
    const [whole, closing, element, attrs] = tag;
    if (closing) {
      const start = open.pop();
      if (!start || start.element !== element) throw new Error(`Unbalanced </${element}> at copy offset ${i}`);
      const attributes = Object.fromEntries([...start.attrs.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2].replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&amp;/g, "&")]));
      proposals.push({
        id: `${name.replace(/\.tei\.xml$/, "")}#p${String(proposals.length + 1).padStart(3, "0")}`,
        text: original.slice(start.from, at),
        offset: { from: start.from, to: at },
        context: { before: original.slice(Math.max(0, start.from - 30), start.from), after: original.slice(at, at + 30) },
        element,
        attributes,
        status: attributes.ref || element === "date" ? "proposed" : "proposed-open",
      });
    } else open.push({ element, attrs, from: at });
    i += whole.length;
    continue;
  }
  if (copy[i] !== original[at]) throw new Error(`The copy differs from the original at copy offset ${i}: ${JSON.stringify(copy.slice(i, i + 40))}`);
  i++;
  at++;
}
if (at !== original.length || open.length) throw new Error("The copy ends before the original or leaves an element open.");

const [kind, ...model] = producer.split(",").map((s) => s.trim());
const file = {
  format: "teicrafter-proposals/0.2",
  document: name.replace(/\.tei\.xml$/, ""),
  producer: { kind, ...(model.length && { model: model.join(", ") }) },
  derivedFrom: name,
  proposals: proposals.sort((a, b) => a.offset.from - b.offset.from),
};
const target = out ?? copyPath.replace(/\.tei\.xml$/, ".vorschlaege.json");
writeFileSync(target, `${JSON.stringify(file, null, 2)}\n`);
console.log(`${proposals.length} proposals written to ${target}`);
