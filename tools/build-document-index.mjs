// Builds data/index.json, the document list the editor offers, from the
// working set (tools/working-set.json) and each TEI file, grouped by the
// collections of js/source.js: title, pages, open work as js/source.js and
// data/actions.json define it, and the working state of revisionDesc
// (ADR-011). The editor reads this list instead of every file, so it stays
// fast with many documents.
// Run after imports and commits:
//   node tools/build-document-index.mjs
// The browser check imports buildIndex() and fails when the file is stale.

import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadActions } from "../js/actions.js";
import { openWorkFor, source } from "../js/source.js";
import { openSpots } from "../js/state.js";

const ROOT = new URL("../", import.meta.url);
export const INDEX_FILE = new URL("data/index.json", ROOT);

const OBJECT_ID = /^o_szd\.\d+$/;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Title text as the editor shows it: markup dropped, character references resolved. */
function titleText(/** @type {string} */ xml) {
  return xml
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:#x([0-9a-f]+)|#(\d+)|(\w+));/gi, (ref, hex, dec, name) =>
      hex || dec ? String.fromCodePoint(Number.parseInt(hex ?? dec, hex ? 16 : 10)) : (ENTITIES[name] ?? ref),
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The repository path of a working-set entry. working-set.json builds file
 * paths, so its values are checked as tools/import-working-set.mjs checks them.
 * @param {{ objectId: string, collection: string, target?: string }} d
 */
export function documentPath(d) {
  if (!OBJECT_ID.test(d.objectId)) throw new Error(`Invalid objectId ${d.objectId}`);
  const path = d.target ?? `data/${d.collection}/${d.objectId}.tei.xml`;
  if (!/^data\/[\w./-]+\.tei\.xml$/.test(path) || path.includes("..")) throw new Error(`Target ${path} of ${d.objectId} is not a TEI file under data/`);
  return path;
}

/** The text data/index.json must have for the current working set and files. */
export async function buildIndex() {
  const set = JSON.parse(await readFile(new URL("tools/working-set.json", ROOT), "utf8"));
  const collections = source.collections.map(({ key, label }) => ({ key, label, documents: [] }));
  // Open work as the editor counts it, from the same action registry.
  const openWork = openWorkFor(loadActions(JSON.parse(await readFile(new URL(source.actions, ROOT), "utf8"))));
  for (const d of set.documents) {
    const collection = collections.find((c) => c.key === d.collection);
    if (!collection) throw new Error(`Unknown collection ${d.collection} for ${d.objectId}`);
    const path = documentPath(d);
    const xml = await readFile(new URL(path, ROOT), "utf8");
    // The first title is the document title of the szd-htr conversion.
    const raw = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(xml)?.[1];
    const title = raw ? titleText(raw) : d.objectId;
    const status = /<revisionDesc\b[^>]*\bstatus="([^"]*)"/.exec(xml)?.[1] ?? "draft";
    const open = openSpots(xml, openWork).length;
    const pages = xml.match(/<pb\b/g)?.length ?? 0;
    collection.documents.push({ path, objectId: d.objectId, title, pages, open, status });
  }
  return `${JSON.stringify({ collections }, null, 2)}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const text = await buildIndex();
  await writeFile(INDEX_FILE, text);
  const { collections } = JSON.parse(text);
  console.log(`data/index.json: ${collections.map((c) => `${c.key} ${c.documents.length}`).join(", ")}`);
}
