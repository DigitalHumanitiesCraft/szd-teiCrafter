// Measures how the editor behaves with growing documents, the source of the
// size limits in knowledge/specification.md (NFR-05). The largest work of the
// working set is repeated inside its body up to each size and served in place
// of the start document, so nothing is written to disk.
//
// Run with the server up:  node size-check.mjs [sizes in MB, default 0.3 1 5 20]
// Prints one row per size: the check after each typing pause (parse and open
// work), validation with the schema already prepared, switching to the text
// view, and the JS heap. The first row also reports the schema preparation.

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000/";
// The editor starts empty; the checks open the example letter through ?doc=.
const START_URL = new URL("?doc=data/o_szd.1222.tei.xml", BASE_URL).href;
const SOURCE = readFileSync(new URL("../docs/data/werke/o_szd.273.tei.xml", import.meta.url), "utf8");
const sizes = (process.argv.length > 2 ? process.argv.slice(2) : ["0.3", "1", "5", "20"]).map(Number);

/** The source with its body repeated until the text reaches about `mb` megabytes. */
function documentOf(/** @type {number} */ mb) {
  const start = SOURCE.indexOf("<body>") + "<body>".length;
  const end = SOURCE.indexOf("</body>");
  const inner = SOURCE.slice(start, end);
  const copies = Math.max(1, Math.round((mb * 1e6 - (SOURCE.length - inner.length)) / inner.length));
  return SOURCE.slice(0, start) + inner.repeat(copies) + SOURCE.slice(end);
}

const browser = await chromium.launch();
let first = true;
for (const mb of sizes) {
  const text = documentOf(mb);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    window.__maxStall = 0;
    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      window.__maxStall = Math.max(window.__maxStall, now - last - 50);
      last = now;
    }, 50);
  });
  await ctx.route("**/data/o_szd.1222.tei.xml", (r) => r.fulfill({ body: text, contentType: "application/xml" }));
  // The facsimile is not part of the measurement.
  await ctx.route("**/gams.uni-graz.at/**", (r) => r.abort());
  const page = await ctx.newPage();
  const row = { MB: (text.length / 1e6).toFixed(1) };
  try {
    await page.goto(START_URL);
    await page.waitForFunction(() => document.getElementById("doc-meta").textContent.length > 0 && document.getElementById("wf-label").textContent === "Wohlgeformt", null, { timeout: 300000 });
    const validate = async () => {
      const t = Date.now();
      await page.evaluate(() => (window.__maxStall = 0));
      await page.click("#valid-button");
      await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 300000 });
      return { s: ((Date.now() - t) / 1000).toFixed(1), stall: Math.round(await page.evaluate(() => window.__maxStall)) };
    };
    const prepared = await validate();
    if (first) row["schema preparation s"] = prepared.s;
    const again = await validate();
    row["validation s"] = again.s;
    row["validation stall ms"] = again.stall;
    Object.assign(
      row,
      await page.evaluate(async (doc) => {
        const { parseXml } = await import("./js/tei.js");
        const { openSpots } = await import("./js/state.js");
        const { openWorkFor } = await import("./js/source.js");
        const { loadActions } = await import("./js/actions.js");
        const work = openWorkFor(loadActions(await (await fetch("./data/actions.json")).json()));
        const t0 = performance.now();
        parseXml(doc);
        const t1 = performance.now();
        openSpots(doc, work);
        const t2 = performance.now();
        return { "check after typing ms": Math.round(t2 - t0), "of it parse ms": Math.round(t1 - t0) };
      }, text),
    );
    await page.evaluate(() => (window.__maxStall = 0));
    await page.click("#view-text");
    await page.waitForTimeout(500);
    row["text view switch ms"] = Math.round(await page.evaluate(() => window.__maxStall));
    row["heap MB"] = await page.evaluate(() => Math.round(/** @type {any} */ (performance).memory.usedJSHeapSize / 1e6));
  } catch (err) {
    row.error = String(err).slice(0, 160);
  }
  first = false;
  console.log(JSON.stringify(row));
  await ctx.close();
}
await browser.close();
