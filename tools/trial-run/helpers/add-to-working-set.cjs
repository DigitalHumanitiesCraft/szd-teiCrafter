// Adds one document to tools/working-set.json as a line of its own before the end
// of the document list, so the Git comparison shows exactly that line.
// Usage: node working-set-eintrag.cjs <working-set.json> <objectId> <collection> <reason>

const fs = require("node:fs");

const [file, objectId, collection, reason] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const list = JSON.parse(text);
if (list.documents.some((d) => d.objectId === objectId)) {
  console.log(`${objectId} steht schon in der Liste.`);
  process.exit(0);
}
const end = text.lastIndexOf("\n  ]");
if (end < 0) throw new Error("Ende der Dokumentliste nicht gefunden.");
const line = `    { "objectId": ${JSON.stringify(objectId)}, "collection": ${JSON.stringify(collection)}, "reason": ${JSON.stringify(reason)} }`;
const next = `${text.slice(0, end)},\n${line}${text.slice(end)}`;
JSON.parse(next);
fs.writeFileSync(file, next);
console.log(`${objectId} in tools/working-set.json eingetragen.`);
