// Annotates one document through the editor from a plan of steps
// (plan-<id>.mjs): dialogs where the editor has them, typing in the XML view
// where it has none. Logs every step with what the dialogs showed, validates,
// and saves the download into this folder.
//
//   node annotiere.mjs <objectId>

import { writeFileSync } from "node:fs";
import {
  chromium, openEditor, chooseDocument, selectByMouse, clickAt, type, press, menuAction, personLookup, personApply,
  placeLookup, placeApply, dateDialogState, editorText, shot, validate, save, label, counter, OUT,
} from "./lib.mjs";

const id = process.argv[2];
const { plan } = await import(`./plan-${id}.mjs`);
const browser = await chromium.launch();
const { page } = await openEditor(browser);
if (id !== "o_szd.1222") await chooseDocument(page, id);
await shot(page, `${id}-start`);
const log = [];
const t0 = Date.now();

/** Wraps a passage by typing: open tag, remove the auto-inserted close tag, step over the text, type "</". */
async function wrapTyped(s, open, name) {
  if (s.endLine) {
    await clickAt(page, s.line, s.text, 0, s);
    await type(page, open);
    await press(page, "Delete", name.length + 3);
    await clickAt(page, s.endLine, s.endText, s.endText.length, { nth: s.endNth ?? 0 });
  } else {
    await clickAt(page, s.line, s.text, 0, s);
    await type(page, open);
    await press(page, "Delete", name.length + 3);
    await press(page, "ArrowRight", s.text.length);
  }
  const closers = async () => (await editorText(page)).split(`</${name}>`).length;
  const before = await closers();
  await type(page, "</");
  // The editor completes "</" to the open element only where its parser sees
  // one (not across an <lb/>); otherwise the name is typed by hand.
  if ((await closers()) === before) {
    await type(page, `${name}>`);
    closeTypedByHand.push(s.text);
  }
}
const closeTypedByHand = [];

/** Types an attribute value addition at a spot found by its text: caret before character `at` of `needle`. */
async function typeAt(line, needle, at, text, opts = {}) {
  await clickAt(page, line, needle, at, opts);
  await type(page, text);
}

for (const s of plan) {
  const entry = { ...s };
  const before = counter.actions;
  try {
    if (s.kind === "person") {
      await selectByMouse(page, s.line, s.text, s);
      await menuAction(page, "p");
      entry.suggestedQuery = await page.inputValue("#person-query");
      const r = await personLookup(page, s.query, { gnd: !!s.gnd });
      entry.register = r.register.slice(0, 4);
      if (s.gnd) entry.gndHits = r.gnd.slice(0, 4);
      if (s.hit) entry.preview = await personApply(page, { hit: s.hit });
      else {
        // The rule keeps an unidentified person without @ref; the dialog demands one.
        await page.click("#person-apply");
        entry.refusal = await label(page, "#person-status");
        await press(page, "Escape");
        await wrapTyped(s, "<persName>", "persName");
        entry.typed = true;
      }
    } else if (s.kind === "personTyped") {
      await wrapTyped(s, s.ref ? `<persName ref="${s.ref}">` : "<persName>", "persName");
      entry.typed = true;
    } else if (s.kind === "place") {
      await selectByMouse(page, s.line, s.text, s);
      await menuAction(page, "o");
      entry.suggestedQuery = await page.inputValue("#place-query");
      const r = await placeLookup(page, s.query);
      entry.hits = r.hits.slice(0, 3);
      entry.preview = await placeApply(page, { hit: s.hit ? `GND ${s.hit}` : undefined });
      if (s.geonames) {
        // The dialog takes a GND id only; GeoNames is typed into @ref in the XML view.
        await typeAt(s.refLine ?? s.line, `${s.hit}"`, s.hit.length, ` http://www.geonames.org/${s.geonames}`, { nth: s.refNth ?? 0 });
      }
    } else if (s.kind === "placeTyped") {
      await wrapTyped(s, s.ref ? `<placeName ref="${s.ref}">` : "<placeName>", "placeName");
      entry.typed = true;
    } else if (s.kind === "org") {
      await wrapTyped(s, s.ref ? `<orgName ref="${s.ref}">` : "<orgName>", "orgName");
      entry.typed = true;
    } else if (s.kind === "date") {
      await selectByMouse(page, s.line, s.text, s);
      await menuAction(page, "d");
      entry.proposed = await dateDialogState(page);
      if (entry.proposed.trimVisible && s.untrim) {
        // The parser read only a part of the expression (e.g. the year of 18.VI.1930).
        await page.uncheck("#date-trim");
        entry.untrimmed = true;
      }
      if (s.span) {
        await page.check("input[name='date-form'][value='span']");
        await page.fill("#date-notBefore", s.span[0]);
        await page.fill("#date-notAfter", s.span[1]);
      } else if (s.when && entry.proposed.when !== s.when) {
        await page.fill("#date-when", s.when);
        entry.whenTypedInDialog = true;
      }
      entry.preview = await label(page, "#date-preview");
      await page.click("#date-apply");
      await page.waitForTimeout(400);
      if (s.cert) {
        // The dialog has no certainty; @cert is typed before the tag's ">".
        const attrs = s.span ? `notAfter="${s.span[1]}">` : `when="${s.when}">`;
        await typeAt(s.certLine ?? s.line, attrs, attrs.length - 1, ` cert="${s.cert}"`, { nth: s.certNth ?? 0 });
      }
    }
    if (s.shot) await shot(page, `${id}-${s.shot}`);
    entry.ok = true;
  } catch (err) {
    entry.ok = false;
    entry.error = String(err).slice(0, 300);
    await shot(page, `${id}-error-${log.length}`);
    await page.keyboard.press("Escape").catch(() => {});
  }
  entry.actions = counter.actions - before;
  entry.wf = await label(page, "#wf-label");
  log.push(entry);
  console.log(JSON.stringify({ kind: s.kind, text: s.text, ok: entry.ok, error: entry.error, wf: entry.wf, actions: entry.actions }));
}

// The open spots as the editor counts them, and one walk with F8.
const work = await label(page, "#work-label");
writeFileSync(`${OUT}log-${id}.json`, JSON.stringify({ steps: log, actionsLog: counter.log }, null, 1));
if ((await page.getAttribute("#view-text", "aria-disabled")) !== "true") {
  await page.click("#view-text");
  await page.waitForTimeout(600);
  await shot(page, `${id}-textview`);
  await page.click("#view-xml");
  await page.waitForTimeout(300);
}
const valid = await validate(page);
const state = `${await label(page, "#doc-state-label")} | ${await label(page, "#doc-state-detail")}`;
const xmlStatus = await label(page, "#xml-status");
await shot(page, `${id}-validated`);
const suggested = await save(page, `${id}.tei.xml`);
const summary = { id, work, valid, state, xmlStatus: xmlStatus.slice(0, 300), suggested, closeTypedByHand, actions: counter.actions, seconds: Math.round((Date.now() - t0) / 1000) };
console.log(JSON.stringify(summary));
writeFileSync(`${OUT}log-${id}.json`, JSON.stringify({ summary, steps: log, actionsLog: counter.log }, null, 1));
await browser.close();
