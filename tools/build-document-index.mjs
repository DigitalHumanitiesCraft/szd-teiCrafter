// Builds data/index.json, the document list the editor offers, from the
// working set (tools/working-set.json) and the title of each TEI file.
// Run from the repository root: node tools/build-document-index.mjs

import { readFile, writeFile } from "node:fs/promises";

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
  collection.documents.push({ path, objectId: d.objectId, title });
}

await writeFile("data/index.json", `${JSON.stringify({ collections }, null, 2)}\n`);
console.log(`data/index.json: ${collections.map((c) => `${c.key} ${c.documents.length}`).join(", ")}`);
