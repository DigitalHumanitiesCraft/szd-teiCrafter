// Builds data/index.json, the document list the editor offers, from the
// working set (tools/working-set.json) and each TEI file: title, pages, open
// HTR markers and the working state of revisionDesc (ADR-011). The editor
// reads this list instead of every file, so it stays fast with many documents.
// Run from the repository root after imports and commits:
//   node tools/build-document-index.mjs

import { readFile, writeFile } from "node:fs/promises";
import { source } from "../js/source.js";

const COLLECTIONS = {
  korrespondenzen: "Korrespondenzen",
  lebensdokumente: "Lebensdokumente",
  werke: "Werke",
  aufsatzablage: "Aufsatzablage",
};

const set = JSON.parse(await readFile("tools/working-set.json", "utf8"));
const collections = Object.entries(COLLECTIONS).map(([key, label]) => ({ key, label, documents: [] }));

for (const d of set.documents) {
  const collection = collections.find((c) => c.key === d.collection);
  if (!collection) throw new Error(`Unknown collection ${d.collection} for ${d.objectId}`);
  const path = d.target ?? `data/${d.collection}/${d.objectId}.tei.xml`;
  const xml = await readFile(path, "utf8");
  // The first title is the document title of the szd-htr conversion.
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(xml)?.[1].replace(/\s+/g, " ").trim() ?? d.objectId;
  const status = /<revisionDesc\b[^>]*\bstatus="([^"]*)"/.exec(xml)?.[1] ?? "draft";
  const open = source.wraps.reduce((n, w) => n + (xml.match(w.marker)?.length ?? 0), 0);
  const pages = xml.match(/<pb\b/g)?.length ?? 0;
  collection.documents.push({ path, objectId: d.objectId, title, pages, open, status });
}

await writeFile("data/index.json", `${JSON.stringify({ collections }, null, 2)}\n`);
console.log(`data/index.json: ${collections.map((c) => `${c.key} ${c.documents.length}`).join(", ")}`);
