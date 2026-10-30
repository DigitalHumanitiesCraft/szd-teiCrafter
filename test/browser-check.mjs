// End-to-end check of the editing task in a real browser: open the example
// letter, annotate persons with GND ids, validate, save, and compare the saved
// bytes with the original. Needs the app served at BASE_URL and network access
// to GAMS (facsimile) and lobid-gnd (person search). See knowledge/testing.md.

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000/";
const ORIGINAL = readFileSync(new URL("../data/o_szd.1222.tei.xml", import.meta.url), "utf8");
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
const label = (page, sel) => page.textContent(sel).then((s) => s.trim());

const browser = await chromium.launch();

async function open(contextOptions, initScript) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...contextOptions });
  if (initScript) await ctx.addInitScript(initScript);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById("page-label").textContent.includes("von"), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  return { page, errors };
}

// Real pointer double-click on a word in the editor, after scrolling its line
// into the rendered viewport (CodeMirror renders only visible lines).
async function doubleClickWord(page, lineText, word) {
  const line = page.locator(".cm-line", { hasText: lineText }).first();
  await page.evaluate(() => (document.querySelector(".cm-scroller").scrollTop = 0));
  for (let i = 0; i < 40 && !(await line.count()); i++) {
    await page.evaluate(() => (document.querySelector(".cm-scroller").scrollTop += 300));
    await page.waitForTimeout(50);
  }
  await line.scrollIntoViewIfNeeded();
  const point = await line.evaluate((el, w) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent.indexOf(w);
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + w.length);
      const b = r.getBoundingClientRect();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    return null;
  }, word);
  await page.mouse.dblclick(point.x, point.y);
  await page.waitForTimeout(300);
}

// Run 1: download path, as in browsers without the File System Access API.
{
  const { page, errors } = await open({ colorScheme: "dark" }, () => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
  check("line numbers shown", (await page.locator(".cm-lineNumbers .cm-gutterElement").count()) > 20);
  check("person button disabled without selection", await page.isDisabled("#person-button"));
  check("hint explains why", (await label(page, "#selection-hint")).startsWith("Zum Annotieren"));

  await doubleClickWord(page, "Herr Reichner", "Reichner");
  check("person button enabled with selection", !(await page.isDisabled("#person-button")));
  await page.click("#person-button");
  await page.waitForSelector("#person-results .result", { timeout: 20000 });
  check("dialog opens with the selection as query", (await page.inputValue("#person-query")) === "Reichner");
  const hit = page.locator("#person-results .result", { hasText: "116402873" });
  check("GND search lists the publisher", (await hit.count()) === 1);
  await hit.click();
  check("preview shows the markup", (await label(page, "#person-preview")) === '<persName ref="https://d-nb.info/gnd/116402873">Reichner</persName>');
  await page.click("#person-apply");
  await page.waitForTimeout(600);
  check("still well-formed", (await label(page, "#wf-label")) === "Wohlgeformt");

  await doubleClickWord(page, "Herr Relgis", "Relgis");
  await page.click("#person-button");
  await page.waitForTimeout(1500);
  await page.fill("#person-gnd", "1057079499");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  check("manual GND id applied", (await page.locator(".cm-line", { hasText: 'gnd/1057079499">Relgis</persName>' }).count()) === 1);

  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  check("valid against TEI All", (await label(page, "#valid-label")) === "TEI-konform", await label(page, "#xml-status"));

  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  const saved = readFileSync(await download.path(), "utf8");
  const expected = ORIGINAL.replace("Herr Reichner", 'Herr <persName ref="https://d-nb.info/gnd/116402873">Reichner</persName>').replace(
    "Herr Relgis",
    'Herr <persName ref="https://d-nb.info/gnd/1057079499">Relgis</persName>',
  );
  check("saved file is the original plus exactly the two annotations", saved === expected);

  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("<pers");
  await page.waitForTimeout(600);
  check("autocomplete offers persName", (await page.locator(".cm-tooltip-autocomplete", { hasText: "persName" }).count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  check("malformed text underlined", (await page.locator(".cm-lintRange-error").count()) >= 1);
  check("check button names the error line", (await label(page, "#wf-label")).startsWith("Fehler Zeile"));
  for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");

  const before = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector(".cm-editor")).fontSize));
  await page.click("#zoom-in");
  const after = await page.evaluate(() => Number.parseFloat(getComputedStyle(document.querySelector(".cm-editor")).fontSize));
  check("code zoom enlarges the code", after > before);

  const box = await page.locator("#splitter").boundingBox();
  await page.mouse.move(box.x + 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(1435, box.y + 200, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  check("dragging the split to the edge hides the facsimile", !(await page.isVisible("#image-pane")) && (await page.isVisible("#facs-show")));
  await page.click("#facs-show");
  check("edge button brings it back", await page.isVisible("#image-pane"));
  check("no console errors (download run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Run 2: in-place save through a stubbed File System Access handle.
{
  const { page, errors } = await open({ colorScheme: "light" }, () => {
    window.__writes = [];
    const handle = {
      name: "o_szd.1222.tei.xml",
      getFile: async () => new File([await (await fetch("data/o_szd.1222.tei.xml")).text()], "o_szd.1222.tei.xml"),
      createWritable: async () => ({ write: async (t) => window.__writes.push(t), close: async () => {} }),
    };
    window.showOpenFilePicker = async () => [handle];
    window.showSaveFilePicker = async () => handle;
  });
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  await doubleClickWord(page, "Herrn Fuchs", "Fuchs");
  await page.click("#person-button");
  await page.waitForTimeout(1200);
  await page.fill("#person-gnd", "1234567");
  await page.click("#person-apply");
  await page.click("#tei-save");
  await page.waitForTimeout(500);
  const writes = await page.evaluate(() => window.__writes);
  check("in-place save writes once into the opened file", writes.length === 1 && writes[0].includes('gnd/1234567">Fuchs</persName>'));
  check("status confirms the in-place save", (await label(page, "#xml-status")) === "Gespeichert in o_szd.1222.tei.xml.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  check("no horizontal scroll at 390px", !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  check("no console errors (in-place run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Run 3: a file with CRLF line endings keeps them when saved.
{
  const { page, errors } = await open({}, () => {
    window.__writes = [];
    const handle = {
      name: "crlf.tei.xml",
      getFile: async () => {
        const text = (await (await fetch("data/o_szd.1222.tei.xml")).text()).replace(/\r?\n/g, "\r\n");
        return new File([text], "crlf.tei.xml");
      },
      createWritable: async () => ({ write: async (t) => window.__writes.push(t), close: async () => {} }),
    };
    window.showOpenFilePicker = async () => [handle];
    window.showSaveFilePicker = async () => handle;
  });
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  await page.click("#tei-save");
  await page.waitForTimeout(500);
  const [written] = await page.evaluate(() => window.__writes);
  const crlf = ORIGINAL.replace(/\r?\n/g, "\r\n");
  check("CRLF file saved unchanged", written === crlf, `${written?.length} vs ${crlf.length}`);
  check("no console errors (CRLF run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

console.log(results.join("\n"));
await browser.close();
process.exitCode = results.some((r) => r.startsWith("FAIL")) ? 1 : 0;
