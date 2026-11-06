// Helpers that drive teiCrafter SZD the way a person at the screen does:
// pointer selections, the annotation menu, the dialogs, typing in the XML
// view, saving by download. Page state is read (editor text, labels) only to
// log and verify; no markup is written through page.evaluate.

import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = "C:/Users/Chrisi/Documents/GitHub/szd-teiCrafter/";
export const { chromium } = await import(pathToFileURL(join(REPO, "test/node_modules/playwright/index.mjs")).href);
export const BASE_URL = "http://127.0.0.1:8000/";
export const OUT = "C:/Users/Chrisi/Documents/GitHub/szd-teiCrafter-probelauf/annotation/browser/";

export const counter = { actions: 0, log: [] };
const act = (what) => {
  counter.actions++;
  counter.log.push(what);
};

export async function openEditor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e)));
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById("doc-meta").textContent.length > 0 && document.getElementById("wf-label").textContent !== "", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

export const label = (page, sel) => page.textContent(sel).then((s) => (s ?? "").trim());

/** The document list, as a person picks a document from it. */
export async function chooseDocument(page, objectId) {
  act(`open document list, search ${objectId}, click entry`);
  await page.click("#docs-button");
  await page.fill("#docs-query", objectId);
  const meta = new RegExp(`^${objectId.replace(".", "\\.")} \\|`);
  await page.locator(".doc-item").filter({ has: page.locator("span", { hasText: meta }) }).click();
  await page.waitForFunction((id) => document.getElementById("doc-meta").textContent.startsWith(id), objectId, { timeout: 30000 });
  await page.waitForTimeout(1500);
}

/** Read-only: the editor text as saving would write it. */
export const editorText = (page) =>
  page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    return EditorView.findFromDOM(document.querySelector(".cm-editor")).state.sliceDoc();
  });
/** Read-only: the current selection. */
export const selectionText = (page) =>
  page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    const s = EditorView.findFromDOM(document.querySelector(".cm-editor")).state;
    const { from, to } = s.selection.main;
    return s.sliceDoc(from, to);
  });

/** Scrolls with the wheel until the n-th line containing `lineText` is rendered, then into view. */
async function findLine(page, lineText, nth = 0) {
  const box = await page.locator(".cm-scroller").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // Start from the top, as a person would scroll down looking for the line.
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, -2000);
  await page.waitForTimeout(150);
  const line = page.locator(".cm-line", { hasText: lineText }).nth(nth);
  for (let i = 0; i < 60 && !(await line.count()); i++) {
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(60);
  }
  if (!(await line.count())) throw new Error(`line not found: ${lineText} #${nth}`);
  await line.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  return line;
}

/** Screen point of a character boundary in a line: before the char at index `at` of the needle (or after its last char). */
async function pointIn(line, needle, at, occurrence = 0) {
  return line.evaluate(
    (el, [n, a, occ]) => {
      const full = el.textContent;
      let idx = -1;
      for (let k = 0, from = 0; k <= occ; k++) {
        idx = full.indexOf(n, from);
        from = idx + 1;
      }
      if (idx < 0) return null;
      let target = idx + a;
      const after = target >= full.length;
      if (after) target = full.length - 1;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let seen = 0;
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (target < seen + t.data.length) {
          const r = document.createRange();
          r.setStart(t, target - seen);
          r.setEnd(t, target - seen + 1);
          const b = r.getClientRects()[0] ?? r.getBoundingClientRect();
          return { x: after ? b.right - 0.5 : b.left + 0.5, y: b.y + b.height / 2 };
        }
        seen += t.data.length;
      }
      return null;
    },
    [needle, at, occurrence],
  );
}

/**
 * Selects `text` inside the n-th line containing `lineText` with a pointer drag.
 * `occurrence` picks the k-th appearance of `text` within that line.
 */
export async function selectByMouse(page, lineText, text, { nth = 0, occurrence = 0 } = {}) {
  act(`select "${text}" with the mouse`);
  const line = await findLine(page, lineText, nth);
  const a = await pointIn(line, text, 0, occurrence);
  const b = await pointIn(line, text, text.length, occurrence);
  if (!a || !b) throw new Error(`text not in line: ${text}`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const got = await selectionText(page);
  if (got !== text) throw new Error(`selection is "${got}", wanted "${text}"`);
}

/** Puts the caret before character `at` of `needle` in the n-th line containing `lineText`, by clicking. */
export async function clickAt(page, lineText, needle, at, { nth = 0, occurrence = 0 } = {}) {
  act(`click into "${needle}" at ${at}`);
  const line = await findLine(page, lineText, nth);
  const p = await pointIn(line, needle, at, occurrence);
  if (!p) throw new Error(`needle not in line: ${needle}`);
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
}

export async function type(page, text) {
  act(`type ${JSON.stringify(text)}`);
  await page.keyboard.type(text, { delay: 5 });
  await page.waitForTimeout(250);
}
export async function press(page, key, times = 1) {
  act(`press ${key}${times > 1 ? ` x${times}` : ""}`);
  for (let i = 0; i < times; i++) await page.keyboard.press(key);
  await page.waitForTimeout(150);
}

/** Opens the menu at the current selection by keyboard (Ctrl+.) and picks an action by its letter. */
export async function menuAction(page, letter) {
  act(`Ctrl+. then ${letter}`);
  await page.keyboard.press("Control+.");
  await page.waitForTimeout(200);
  await page.keyboard.press(letter);
  await page.waitForTimeout(400);
}

/** Person dialog: returns the register hits and, on request, the GND hits for a query. */
export async function personLookup(page, query, { gnd = false } = {}) {
  if (query !== undefined && (await page.inputValue("#person-query")) !== query) {
    act(`type person query "${query}"`);
    await page.fill("#person-query", query);
  }
  await page.waitForTimeout(800);
  const register = await page.locator("#register-results .result").allTextContents();
  let gndHits = [];
  if (gnd) {
    act("click 'Auch in der GND suchen'");
    await page.click("#person-search");
    await page.waitForSelector("#person-results .result, #person-status:not(:empty)", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    gndHits = await page.locator("#person-results .result").allTextContents();
  }
  return { register: register.map(clean), gnd: gndHits.map(clean), status: await label(page, "#person-status") };
}
const clean = (s) => s.replace(/\s+/g, " ").trim();

export async function personApply(page, { hit, id }) {
  if (hit) {
    act(`click hit containing ${hit}`);
    await page.locator("#register-results .result, #person-results .result", { hasText: hit }).first().click();
  } else {
    act(`type id ${id}`);
    await page.fill("#person-gnd", id);
  }
  const preview = await label(page, "#person-preview");
  act("click Annotieren");
  await page.click("#person-apply");
  await page.waitForTimeout(500);
  return preview;
}

export async function placeLookup(page, query) {
  if (query !== undefined && (await page.inputValue("#place-query")) !== query) {
    act(`type place query "${query}"`);
    await page.fill("#place-query", query);
  }
  act("click 'In der GND suchen'");
  await page.click("#place-search");
  await page.waitForSelector("#place-results .result, #place-status:not(:empty)", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return { hits: (await page.locator("#place-results .result").allTextContents()).map(clean), status: await label(page, "#place-status") };
}

export async function placeApply(page, { hit, id }) {
  if (hit) {
    act(`click place hit ${hit}`);
    await page.locator("#place-results .result", { hasText: hit }).first().click();
  } else if (id) {
    act(`type place id ${id}`);
    await page.fill("#place-id", id);
  }
  const preview = await label(page, "#place-preview");
  act("click Markieren");
  await page.click("#place-apply");
  await page.waitForTimeout(500);
  return preview;
}

export async function dateDialogState(page) {
  return {
    when: await page.inputValue("#date-when"),
    trimVisible: await page.isVisible("#date-trim-row"),
    part: await label(page, "#date-part"),
    preview: await label(page, "#date-preview"),
  };
}

export async function shot(page, name) {
  await page.screenshot({ path: `${OUT}shots/${name}.png` });
}

export async function validate(page) {
  act("click validate");
  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 180000 });
  return label(page, "#valid-label");
}

export async function save(page, name) {
  act("click save (download)");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  const suggested = download.suggestedFilename();
  await download.saveAs(`${OUT}${name}`);
  return suggested;
}
