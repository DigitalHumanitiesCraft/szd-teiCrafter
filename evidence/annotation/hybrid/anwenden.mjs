// Phase 2 of the hybrid run: applies the proposals of one document through the
// editor's own actions (menu, person, place and date dialogs) and types in the
// XML view what no action covers (orgName, a person without reference, a
// passage over a line break, GeoNames after the GND, @cert on a date).
// page.evaluate is used only to read the editor text and to set a selection
// or caret, as test/browser-check.mjs does; markup enters only by the
// dialogs and by keyboard input.
//
//   node anwenden.mjs o_szd.1786
//
// Writes into this folder: <id>.angewendet.tei.xml (the download after
// applying), <id>.anwendung.json (per proposal: path taken, result) and
// screenshots.

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL("C:/Users/Chrisi/Documents/GitHub/szd-teiCrafter/test/node_modules/playwright/index.mjs").href);
const BASE_URL = "http://127.0.0.1:8000/";
const HERE = new URL("./", import.meta.url);
const id = process.argv[2];
const set = JSON.parse(readFileSync(new URL(`${id}.vorschlaege.json`, HERE), "utf8"));

const esc = (v) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const openTag = (p) => `<${p.element}${Object.entries(p.attributes).map(([k, v]) => ` ${k}="${esc(v)}"`).join("")}>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
// The download path, as in browsers without the File System Access API.
await ctx.addInitScript(() => {
  delete window.showOpenFilePicker;
  delete window.showSaveFilePicker;
});
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
await page.waitForTimeout(1500);
if ((await page.getAttribute("#view-xml", "aria-pressed")) !== "true") await page.click("#view-xml");

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

/** Types text at a position, as keyboard input into the XML view. */
async function typeAt(pos, text) {
  await select(pos, pos);
  await page.keyboard.insertText(text);
  // A completion popup must not take a later Enter.
  await page.keyboard.press("Escape");
}

async function viaMenu(p, key) {
  await select(p.offset.from, p.offset.to);
  await page.keyboard.press("Control+.");
  await page.waitForTimeout(120);
  if (!(await page.isVisible("#actions"))) throw new Error(`menu closed: ${await label("#xml-status")}`);
  await page.keyboard.press(key);
}

const log = [];
const original = await docText();
const shots = new Set();
// From the end, so the offsets of the original still hold for every earlier proposal.
for (const p of [...set.proposals].sort((a, b) => b.offset.from - a.offset.from)) {
  const entry = { id: p.id, line: p.line, text: p.shown, element: p.element, steps: [] };
  try {
    const now = await docText();
    if (now.slice(p.offset.from, p.offset.to) !== p.text) throw new Error("anchor does not match the editor text");
    const multiLine = p.text.includes("\n");
    const ref = p.attributes.ref;
    const dateAttrs = Object.fromEntries(Object.entries(p.attributes).filter(([k]) => k !== "cert"));
    if (p.element === "persName" && ref && !multiLine) {
      entry.path = "menu+person-dialog";
      await viaMenu(p, "p");
      await page.waitForSelector("#person-dialog[open]");
      await page.fill("#person-gnd", ref.startsWith("#") ? ref.slice(1) : ref.replace("http://d-nb.info/gnd/", ""));
      entry.preview = await label("#person-preview");
      entry.registerFirstHit = await page.locator("#register-results .result").first().textContent().catch(() => "");
      if (!shots.has("person")) {
        shots.add("person");
        await page.screenshot({ path: new URL(`${id}-dialog-person.png`, HERE).pathname.slice(1) });
      }
      await page.press("#person-gnd", "Enter");
      await page.waitForSelector("#person-dialog[open]", { state: "detached" });
    } else if (p.element === "placeName" && !multiLine) {
      entry.path = "menu+place-dialog";
      await viaMenu(p, "o");
      await page.waitForSelector("#place-dialog[open]");
      const [gnd, geo] = ref.split(" ");
      await page.fill("#place-id", gnd.replace("http://d-nb.info/gnd/", ""));
      entry.preview = await label("#place-preview");
      if (!shots.has("place")) {
        shots.add("place");
        await page.screenshot({ path: new URL(`${id}-dialog-place.png`, HERE).pathname.slice(1) });
      }
      await page.click("#place-apply");
      await page.waitForSelector("#place-dialog[open]", { state: "detached" });
      if (geo) {
        // The dialog writes the GND only; GeoNames is typed into the @ref.
        entry.steps.push("geonames typed");
        await typeAt(p.offset.from + `<placeName ref="${gnd}`.length, ` ${geo}`);
      }
    } else if (p.element === "date" && !multiLine) {
      entry.path = "menu+date-dialog";
      await viaMenu(p, "d");
      await page.waitForSelector("#date-dialog[open]");
      entry.proposedByDialog = { when: await page.inputValue("#date-when"), from: await page.inputValue("#date-from"), to: await page.inputValue("#date-to") };
      const form = dateAttrs.when ? "when" : dateAttrs.from ? "range" : "span";
      await page.check(`input[name='date-form'][value='${form}']`);
      if (await page.isVisible("#date-trim-row")) {
        entry.steps.push(`trim offered: ${await label("#date-part")}`);
        await page.uncheck("#date-trim");
      }
      for (const name of ["when", "from", "to", "notBefore", "notAfter"]) if (await page.isVisible(`#date-${name}`)) await page.fill(`#date-${name}`, dateAttrs[name] ?? "");
      entry.preview = await label("#date-preview");
      if (!shots.has("date")) {
        shots.add("date");
        await page.screenshot({ path: new URL(`${id}-dialog-date.png`, HERE).pathname.slice(1) });
      }
      await page.click("#date-apply");
      await page.waitForSelector("#date-dialog[open]", { state: "detached" });
      if (p.attributes.cert) {
        // The dialog has no field for @cert; it is typed into the opening tag.
        entry.steps.push("cert typed");
        const tag = `<date${Object.entries(dateAttrs).map(([k, v]) => ` ${k}="${v}"`).join("")}>`;
        await typeAt(p.offset.from + tag.length - 1, ' cert="low"');
      }
    } else {
      entry.path = multiLine ? "typed (over a line break)" : p.element === "orgName" ? "typed (no orgName action)" : "typed (person without reference)";
      await typeAt(p.offset.to, `</${p.element}>`);
      await typeAt(p.offset.from, openTag(p));
    }
    await page.waitForTimeout(150);
    const expected = `${openTag(p)}${p.text}</${p.element}>`;
    const after = await docText();
    entry.written = after.slice(p.offset.from, p.offset.from + expected.length);
    entry.ok = entry.written === expected;
    if (!entry.ok) entry.expected = expected;
  } catch (err) {
    entry.ok = false;
    entry.error = String(err).slice(0, 300);
    // Leave no dialog open for the next proposal.
    for (const d of ["person", "place", "date"]) if (await page.isVisible(`#${d}-dialog[open]`)) await page.click(`#${d}-cancel`);
    await page.keyboard.press("Escape");
  }
  console.log(entry.ok ? "ok " : "ERR", entry.id, entry.path, entry.error ?? "");
  log.push(entry);
}

// The editor's own checks after applying.
await page.click("#wf-button");
await page.click("#valid-button");
await page.waitForFunction(() => !["Prüfe …", ""].includes(document.getElementById("valid-label").textContent), null, { timeout: 120000 });
const checks = {
  wellFormed: await label("#wf-label"),
  valid: await label("#valid-label"),
  openWork: await label("#work-label"),
  state: `${await label("#doc-state-label")} | ${await label("#doc-state-detail")}`,
  status: await label("#xml-status"),
};
await page.click("#diff-button");
checks.diff = await label("#diff-summary");
await page.screenshot({ path: new URL(`${id}-aenderungen.png`, HERE).pathname.slice(1) });
await page.keyboard.press("Escape");
await page.screenshot({ path: new URL(`${id}-nach-anwendung.png`, HERE).pathname.slice(1) });

const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
checks.downloadName = download.suggestedFilename();
copyFileSync(await download.path(), new URL(`${id}.angewendet.tei.xml`, HERE));
checks.saveState = await label("#save-state");
checks.errors = errors;
writeFileSync(new URL(`${id}.anwendung.json`, HERE), JSON.stringify({ checks, log: log.reverse() }, null, 2) + "\n");
console.log(JSON.stringify(checks, null, 1));
console.log(`${log.filter((e) => e.ok).length}/${log.length} applied as proposed`);
await browser.close();
