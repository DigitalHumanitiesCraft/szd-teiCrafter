// Phase 3 of the hybrid run: the review in the editor. Opens the applied copy
// under the document's own path (a route serves it as the file on the server,
// as pruefe.mjs does for the start document), then walks it as a reviewer:
// the card of every mark in the text view, F8 through the open spots, the
// validation. With a corrections file it then applies the review's changes
// through the card (Ändern, Entfernen) or by typing in the XML view, shows
// the changes view and saves the download as <id>.tei.xml.
//
//   node pruefen.mjs o_szd.1786            reading pass only
//   node pruefen.mjs o_szd.1786 korrigieren  reading pass, corrections, save
//
// page.evaluate only reads the editor text and sets a caret or selection.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL("C:/Users/Chrisi/Documents/GitHub/szd-teiCrafter/test/node_modules/playwright/index.mjs").href);
const BASE_URL = "http://127.0.0.1:8000/";
const HERE = new URL("./", import.meta.url);
const file = (name) => new URL(name, HERE).pathname.slice(1);
const [id, mode] = process.argv.slice(2);
const set = JSON.parse(readFileSync(file(`${id}.vorschlaege.json`), "utf8"));
const applied = readFileSync(file(`${id}.angewendet.tei.xml`), "utf8");
const corrections = mode === "korrigieren" && existsSync(file(`${id}.korrekturen.json`)) ? JSON.parse(readFileSync(file(`${id}.korrekturen.json`), "utf8")) : [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => {
  delete window.showOpenFilePicker;
  delete window.showSaveFilePicker;
});
await ctx.route(`**/${set.source.path}`, (r) => r.fulfill({ body: applied, contentType: "application/xml" }));
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE_URL);
await page.waitForFunction(() => document.getElementById("doc-meta").textContent.length > 0, null, { timeout: 60000 });
if (id !== "o_szd.1222") {
  await page.click("#docs-button");
  await page.fill("#docs-query", id);
  await page.locator(".doc-item").filter({ has: page.locator("span", { hasText: new RegExp(`^${id.replace(".", "\\.")} \\|`) }) }).click();
}
await page.waitForFunction((n) => document.getElementById("doc-meta").textContent.startsWith(n), id, { timeout: 60000 });
// The facsimile, for the screenshots; a slow GAMS answer does not stop the review.
await page.waitForFunction(() => document.getElementById("page-label").textContent.includes("von"), null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(800);

const docText = () =>
  page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    return EditorView.findFromDOM(document.querySelector(".cm-editor")).state.doc.toString();
  });
const select = (from, to) =>
  page.evaluate(
    async ([f, t]) => {
      const { EditorView } = await import("./vendor/codemirror/codemirror.js");
      const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
      view.dispatch({ selection: { anchor: f, head: t }, scrollIntoView: true });
      view.focus();
    },
    [from, to],
  );
const label = (sel) => page.textContent(sel).then((t) => (t ?? "").trim());
const lineOf = (text, pos) => text.slice(0, pos).split("\n").length;

/** Marks of the four elements in the body, in document order. */
function marksIn(text) {
  const body = text.indexOf("<body");
  return [...text.matchAll(/<(persName|placeName|orgName|date)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
    .filter((m) => m.index > body)
    .map((m) => ({ element: m[1], attrs: m[2].trim(), inner: m[3], openTo: m.index + m[0].indexOf(">") + 1, line: lineOf(text, m.index) }));
}

const report = { cards: [], f8: [], checks: {}, corrections: [] };

// 1. Cards in the text view.
await page.click("#view-text");
await page.waitForTimeout(400);
let text = await docText();
let k = 0;
for (const m of marksIn(text)) {
  await select(m.openTo + 1, m.openTo + 1);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const visible = await page.isVisible("#mark-card");
  const card = visible
    ? { title: await label("#mark-card-title"), detail: await label("#mark-card-detail"), note: await label("#mark-card-note"), change: await page.isVisible("#mark-card-change") }
    : { title: null, detail: "keine Karte" };
  report.cards.push({ line: m.line, element: m.element, inner: m.inner.replace(/\n\s*<lb\/>/g, " | "), attrs: m.attrs, ...card });
  if (visible && k++ < 2) await page.screenshot({ path: file(`${id}-karte-${m.element}.png`) });
  if (visible) await page.keyboard.press("Escape");
  else {
    // Enter on a passage without a card starts a new line; take it back.
    if ((await docText()) !== text) await page.keyboard.press("Control+z");
  }
  await page.waitForTimeout(80);
}
if ((await docText()) !== text) throw new Error("the reading pass changed the text");
await page.screenshot({ path: file(`${id}-textansicht.png`) });

// 2. F8 through the open spots, from the start of the body.
await select(text.indexOf("<body"), text.indexOf("<body"));
const seen = new Set();
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("F8");
  await page.waitForTimeout(200);
  const sel = await page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    const { from, to } = EditorView.findFromDOM(document.querySelector(".cm-editor")).state.selection.main;
    return { from, to };
  });
  if (seen.has(sel.from)) break;
  seen.add(sel.from);
  report.f8.push({
    line: lineOf(text, sel.from),
    selected: text.slice(sel.from, sel.to),
    note: (await page.isVisible("#actions-note")) ? await label("#actions-note") : "",
    suggested: await page.evaluate(() => document.querySelector("#actions [data-suggested]")?.dataset.action ?? null),
  });
  if (i === 0) await page.screenshot({ path: file(`${id}-f8.png`) });
  await page.keyboard.press("Escape");
}
report.checks.openWorkBefore = await label("#work-label");

// 3. Corrections of the review.
await page.click("#view-xml");
await page.waitForTimeout(300);
for (const c of corrections) {
  const entry = { ...c };
  try {
    text = await docText();
    const at = text.indexOf(c.find);
    if (at < 0 || text.indexOf(c.find, at + 1) >= 0) throw new Error("anchor not unique");
    if (c.how === "card-remove" || c.how === "card-change-person" || c.how === "card-change-place" || c.how === "card-change-date") {
      // The card lives in the text view.
      await page.click("#view-text");
      await page.waitForTimeout(300);
      const caret = at + c.find.indexOf(">") + 2;
      await select(caret, caret);
      await page.keyboard.press("Enter");
      await page.waitForSelector("#mark-card:not([hidden])", { timeout: 3000 });
      if (c.how === "card-remove") await page.click("#mark-card-remove");
      else {
        await page.click("#mark-card-change");
        if (c.how === "card-change-person") {
          await page.waitForSelector("#person-dialog[open]");
          await page.fill("#person-gnd", c.value);
          entry.preview = await label("#person-preview");
          await page.press("#person-gnd", "Enter");
        } else if (c.how === "card-change-place") {
          await page.waitForSelector("#place-dialog[open]");
          await page.fill("#place-id", c.value);
          entry.preview = await label("#place-preview");
          await page.click("#place-apply");
        } else {
          await page.waitForSelector("#date-dialog[open]");
          await page.check(`input[name='date-form'][value='${c.form}']`);
          for (const [name, v] of Object.entries(c.values)) await page.fill(`#date-${name}`, v);
          entry.preview = await label("#date-preview");
          await page.click("#date-apply");
        }
      }
      await page.waitForTimeout(300);
      await page.click("#view-xml");
      await page.waitForTimeout(300);
    } else if (c.how === "type-replace") {
      // Retyping an attribute value in the XML view: select the old value, type the new one.
      const v = at + c.find.indexOf(c.old);
      await select(v, v + c.old.length);
      if (c.value === "") await page.keyboard.press("Delete");
      else await page.keyboard.insertText(c.value);
      await page.keyboard.press("Escape");
    } else if (c.how === "menu-person") {
      // A proposal the application run left out, applied again through the menu.
      const from = at + c.find.indexOf(c.target);
      await select(from, from + c.target.length);
      await page.waitForTimeout(600);
      await page.keyboard.press("Control+.");
      await page.waitForSelector("#actions:not([hidden])", { timeout: 3000 });
      await page.keyboard.press("p");
      await page.waitForSelector("#person-dialog[open]");
      await page.fill("#person-gnd", c.value);
      entry.preview = await label("#person-preview");
      await page.press("#person-gnd", "Enter");
      await page.waitForSelector("#person-dialog[open]", { state: "detached" });
    } else if (c.how === "type-wrap") {
      // Typed in the XML view: closing tag first, so the start offset holds.
      const from = at + c.find.indexOf(c.target);
      await select(from + c.target.length, from + c.target.length);
      await page.keyboard.insertText(c.close);
      await select(from, from);
      await page.keyboard.insertText(c.open);
      await page.keyboard.press("Escape");
    }
    // The text of a following typed step is taken after this one.
    for (const t of c.then ?? []) {
      const now = await docText();
      const a = now.indexOf(t.find);
      if (a < 0) throw new Error(`then: anchor missing ${t.find}`);
      const v = a + t.find.indexOf(t.old);
      await select(v, v + t.old.length);
      await page.keyboard.insertText(t.value);
      await page.keyboard.press("Escape");
    }
    const after = await docText();
    entry.result = c.expect ? after.includes(c.expect) : null;
    if (c.expect && !entry.result) throw new Error(`expected text missing: ${c.expect}`);
  } catch (err) {
    entry.error = String(err).slice(0, 300);
  }
  console.log(entry.error ? "ERR" : "ok ", c.proposal, c.how, entry.error ?? "");
  report.corrections.push(entry);
}

// 4. Validation, changes view, saving.
await page.click("#valid-button");
await page.waitForFunction(() => !["Prüfe …", ""].includes(document.getElementById("valid-label").textContent), null, { timeout: 120000 });
report.checks.wellFormed = await label("#wf-label");
report.checks.valid = await label("#valid-label");
report.checks.validStatus = await label("#xml-status");
report.checks.openWork = await label("#work-label");
report.checks.state = `${await label("#doc-state-label")} | ${await label("#doc-state-detail")}`;
await page.click("#diff-button");
report.checks.diff = await label("#diff-summary");
report.checks.diffRows = await page.locator("#diff-body .diff-row[data-kind='add']").allTextContents();
await page.screenshot({ path: file(`${id}-pruefung-aenderungen.png`) });
await page.keyboard.press("Escape");
await page.screenshot({ path: file(`${id}-pruefung-ende.png`) });
if (mode === "korrigieren") {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  report.checks.downloadName = download.suggestedFilename();
  copyFileSync(await download.path(), file(`${id}.tei.xml`));
}
report.errors = errors;
writeFileSync(file(`${id}.pruefung${mode === "korrigieren" ? "-korrektur" : ""}.json`), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.checks, null, 1));
await browser.close();
