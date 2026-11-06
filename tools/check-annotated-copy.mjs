// Checks an annotated working copy against the original in docs/data/
// and against the editor, the same yardstick for every way of annotating.
//
//   node tools/check-annotated-copy.mjs <annotated file> [more files]
//
// Needs the editor served on BASE_URL (default http://127.0.0.1:8000/).
// Prints one JSON object per file:
//   preserved   removing persName/placeName/orgName/date tags gives the original
//   header      everything before <text is unchanged
//   wellFormed, valid, state   what the editor shows after loading the file
//   marks       count per element, and how many of them lack @ref or a date value

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = new URL("../", import.meta.url);
const { chromium } = await import(pathToFileURL(join(REPO.pathname.replace(/^\/(\w:)/, "$1"), "test/node_modules/playwright/index.mjs")).href);
const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000/";
// The editor starts empty; the checks open the example letter through ?doc=.
const START_URL = new URL("?doc=data/o_szd.1222.tei.xml", BASE_URL).href;
const MARKUP = /<\/?(?:persName|placeName|orgName|date)\b[^>]*>/g;

function originalOf(/** @type {string} */ name) {
  const data = new URL("docs/data/", REPO);
  for (const dir of ["", ...readdirSync(data, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name + "/")]) {
    const file = new URL(dir + name, data);
    if (existsSync(file)) return readFileSync(file, "utf8");
  }
  throw new Error(`no original for ${name} in data/`);
}

function marksOf(/** @type {string} */ xml) {
  const body = xml.slice(xml.indexOf("<text"));
  const marks = {};
  for (const m of body.matchAll(/<(persName|placeName|orgName|date)\b([^>]*)>/g)) {
    const entry = (marks[m[1]] ??= { count: 0, open: 0 });
    entry.count++;
    const linked = m[1] === "date" ? /\b(?:when|from|to|notBefore|notAfter)="[^"]+"/.test(m[2]) : /\bref="[^"]+"/.test(m[2]);
    if (!linked) entry.open++;
  }
  return marks;
}

const browser = await chromium.launch();
for (const path of process.argv.slice(2)) {
  const text = readFileSync(path, "utf8");
  const original = originalOf(basename(path));
  const stripped = text.replace(MARKUP, "");
  const reference = original.replace(MARKUP, "");
  let firstDiff = -1;
  if (stripped !== reference) {
    firstDiff = [...stripped].findIndex((c, i) => c !== reference[i]);
    if (firstDiff === -1) firstDiff = Math.min(stripped.length, reference.length);
  }
  const row = {
    file: basename(path),
    preserved: stripped === reference,
    ...(firstDiff >= 0 && { firstDiff: stripped.slice(Math.max(0, firstDiff - 40), firstDiff + 40) }),
    header: text.slice(0, text.indexOf("<text")) === original.slice(0, original.indexOf("<text")),
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route("**/data/o_szd.1222.tei.xml", (r) => r.fulfill({ body: text, contentType: "application/xml" }));
  await ctx.route("**/gams.uni-graz.at/**", (r) => r.abort());
  const page = await ctx.newPage();
  try {
    await page.goto(START_URL);
    await page.waitForFunction(() => document.getElementById("doc-meta").textContent.length > 0 && document.getElementById("wf-label").textContent !== "", null, { timeout: 60000 });
    row.wellFormed = await page.textContent("#wf-label");
    await page.click("#valid-button");
    await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 120000 });
    row.valid = await page.textContent("#valid-label");
    row.state = `${await page.textContent("#doc-state-label")} | ${(await page.textContent("#doc-state-detail")).trim()}`;
  } catch (err) {
    row.error = String(err).slice(0, 200);
  }
  row.marks = marksOf(text);
  console.log(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
