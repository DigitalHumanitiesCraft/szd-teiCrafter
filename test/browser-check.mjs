// End-to-end check of the editing task in a real browser: open the example
// letter, annotate persons with GND ids, validate, save, and compare the saved
// bytes with the original. Needs the app served at BASE_URL and network access
// to GAMS (facsimile) and lobid-gnd (person search). See knowledge/testing.md.

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000/";
const ORIGINAL = readFileSync(new URL("../data/o_szd.1222.tei.xml", import.meta.url), "utf8");
const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
const label = (page, sel) => page.textContent(sel).then((s) => s.trim());

// Screenshots of the changed states are written only when SHOTS_DIR is set.
const SHOTS_DIR = process.env.SHOTS_DIR;
if (SHOTS_DIR) mkdirSync(SHOTS_DIR, { recursive: true });
const shot = (page, name) => SHOTS_DIR && page.screenshot({ path: join(SHOTS_DIR, `${name}.png`) });

// The line comparison itself, independent of the interface.
{
  const { lineDiff, conflictMarkers } = await import("../js/diff.js");
  const marks = (d) => d.map((l) => `${l.kind === "same" ? " " : l.kind === "del" ? "-" : "+"}${l.text}`).join(",");
  check("line diff finds replaced, removed and added lines", marks(lineDiff("a\nb\nc\nd\ne", "a\nB\nc\ne\nf")) === " a,-b,+B, c,-d, e,+f");
  check("line diff of equal texts has no changes", lineDiff("x\r\ny", "x\r\ny").every((l) => l.kind === "same"));
  check("conflict markers found with their lines", JSON.stringify(conflictMarkers("a\n<<<<<<< HEAD\nb\n=======\nc\n>>>>>>> x\n")) === '[{"line":2,"kind":"start"},{"line":4,"kind":"middle"},{"line":6,"kind":"end"}]');
}

const browser = await chromium.launch();

async function open(contextOptions, initScript, initArg) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...contextOptions });
  if (initScript) await ctx.addInitScript(initScript, initArg);
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

// The drawn selection carries the theme's blue mix, and the native selection
// is transparent and keeps the token's colour, so selected markup stays legible.
async function checkSelection(page, scheme) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Home");
  for (let i = 0; i < 6; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.background = "color-mix(in oklch, var(--blue) 38%, transparent)";
    probe.style.color = "var(--blue)";
    document.body.append(probe);
    const expected = getComputedStyle(probe).backgroundColor;
    const blue = getComputedStyle(probe).color;
    probe.remove();
    const layer = document.querySelector(".cm-selectionBackground");
    const sel = getSelection();
    const token = [...document.querySelectorAll(".cm-line span")].find((s) => sel.containsNode(s, true) && getComputedStyle(s).color === blue);
    return {
      background: layer && getComputedStyle(layer).backgroundColor,
      expected,
      token: token?.textContent,
      selected: token && getComputedStyle(token, "::selection").color,
      nativeBackground: token && getComputedStyle(token, "::selection").backgroundColor,
      blue,
    };
  });
  check(`selection background is the blue mix (${scheme})`, r.background === r.expected, `${r.background} vs ${r.expected}`);
  check(
    `selected element name keeps its colour (${scheme})`,
    !!r.token && r.selected === r.blue && r.nativeBackground === "rgba(0, 0, 0, 0)",
    `${r.token}: ${r.selected} on ${r.nativeBackground}`,
  );
  await page.keyboard.press("Control+Home");
}

// lobid answers with persons matching the query only in relations or
// biography as well; a fixed answer makes the ranking checkable.
const LOBID_FIXTURE = {
  member: [
    { gndIdentifier: "1001", preferredName: "Böing, Itai", biographicalOrHistoricalInformation: ["Briefpartner von Eugen Wolbe"] },
    { gndIdentifier: "1002", preferredName: "Wolber, Eugen", dateOfBirth: ["1880"] },
    { gndIdentifier: "1003", preferredName: "Thoma, Hans", variantName: ["Thoma, J."], biographicalOrHistoricalInformation: ["Verleger, kannte Eugen Wolbe"] },
    { gndIdentifier: "1004", preferredName: "Wolbe, Eugen", dateOfBirth: ["1873"], dateOfDeath: ["1938"] },
  ],
};

// Run 1: download path, as in browsers without the File System Access API.
{
  const { page, errors } = await open({ colorScheme: "dark" }, () => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
  check("line numbers shown", (await page.locator(".cm-lineNumbers .cm-gutterElement").count()) > 20);
  check("page fits the viewport", (await page.evaluate(() => document.documentElement.scrollHeight)) <= 900);
  check("long lines wrap by default", (await page.getAttribute("#wrap-toggle", "aria-pressed")) === "true");
  check("no unsaved mark at start", (await label(page, "#save-state")) === "");
  check("action menu hidden without selection", await page.isHidden("#actions"));
  check("open spots counted", /^\d+ offene Stellen?$/.test(await label(page, "#work-label")), await label(page, "#work-label"));
  const rowHeight = async (sel) => (await page.locator(sel).first().boundingBox()).height;
  check("text toolbar on one row at half width", (await rowHeight(".pane-text .toolbar")) < 50);
  check("facsimile toolbar on one row at half width", (await rowHeight(".pane-image .toolbar")) < 50);
  check("viewer's own buttons replaced", (await page.locator("#viewer [title='Zoom in']").count()) === 0);
  check("image source hidden at start", await page.isHidden("#iiif-url"));
  await page.click("#source-toggle");
  check("image source opens on demand", await page.isVisible("#iiif-url"));
  await page.click("#source-toggle");
  check("image source closes again", await page.isHidden("#iiif-url"));
  await checkSelection(page, "dark");

  await doubleClickWord(page, "Herr Reichner", "Reichner");
  await page.waitForTimeout(300);
  check("action menu appears at the selection", await page.isVisible("#actions"));
  check("a capitalised name without markers suggests Person", (await page.locator("#actions [data-action='person'][data-suggested]").count()) === 1);
  await page.click("#actions [data-action='person']");
  await page.waitForSelector("#register-results .result", { timeout: 20000 });
  check("dialog opens with the selection as query", (await page.inputValue("#person-query")) === "Reichner");
  const hit = page.locator("#register-results .result", { hasText: "SZDPER.2188" });
  check("person index lists the publisher with his GND", (await hit.count()) === 1 && (await hit.textContent()).includes("116402873"));
  await page.click("#person-search");
  await page.waitForSelector("#person-results .result", { timeout: 20000 });
  check("GND search on request lists him too", (await page.locator("#person-results .result", { hasText: "116402873" }).count()) === 1);
  await hit.click();
  check("preview shows the index reference", (await label(page, "#person-preview")) === '<persName ref="https://gams.uni-graz.at/o:szd.personen#SZDPER.2188">Reichner</persName>');
  await page.click("#person-apply");
  await page.waitForTimeout(600);
  check("still well-formed", (await label(page, "#wf-label")) === "Wohlgeformt");

  // Keyboard path: Ctrl+. opens the menu with focus, Enter takes Person.
  await doubleClickWord(page, "Herr Relgis", "Relgis");
  await page.keyboard.press("Control+.");
  check("Ctrl+. focuses the menu", await page.evaluate(() => document.activeElement?.dataset.action === "person"));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await page.fill("#person-gnd", "1057079499");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  check("manual GND id applied in the holdings' form", (await page.locator(".cm-line", { hasText: 'http://d-nb.info/gnd/1057079499">Relgis</persName>' }).count()) === 1);

  // A form of address in the selection is ignored by the search.
  await doubleClickWord(page, "Liebe Frau Meingast", "Frau");
  await page.keyboard.press("Shift+Control+ArrowRight");
  await page.waitForTimeout(300);
  await page.click("#actions [data-action='person']");
  await page.waitForSelector("#register-results .result", { timeout: 20000 });
  check("'Frau' is dropped from the query", (await page.inputValue("#person-query")) === "Meingast");
  check("the addressee is the first index hit", (await page.locator("#register-results .result").first().textContent()).includes("SZDPER.1575"));
  await page.click("#person-cancel");

  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  check("valid against TEI All", (await label(page, "#valid-label")) === "TEI-konform", await label(page, "#xml-status"));
  check("annotations mark the document unsaved", (await label(page, "#save-state")) === "Ungespeicherte Änderungen");
  await page.click("#diff-button");
  check(
    "changes view lists the two annotated lines as replaced",
    (await page.locator("#diff-body .diff-row[data-kind='del']").count()) === 2 &&
      (await page.locator("#diff-body .diff-row[data-kind='add']", { hasText: "SZDPER.2188" }).count()) === 1 &&
      (await page.locator("#diff-body .diff-row[data-kind='add']", { hasText: "gnd/1057079499" }).count()) === 1,
    await label(page, "#diff-summary"),
  );
  await shot(page, "diff-dark");
  await page.keyboard.press("Escape");
  check("Escape closes the changes view", !(await page.isVisible("#diff-dialog")));

  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  const saved = readFileSync(await download.path(), "utf8");
  const expected = ORIGINAL.replace("Herr Reichner", 'Herr <persName ref="https://gams.uni-graz.at/o:szd.personen#SZDPER.2188">Reichner</persName>').replace(
    "Herr Relgis",
    'Herr <persName ref="http://d-nb.info/gnd/1057079499">Relgis</persName>',
  );
  check("saved file is the original plus exactly the two annotations", saved === expected);
  check("saving clears the unsaved mark", (await label(page, "#save-state")) === "");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.waitForTimeout(400);
  check("an edit after validating asks to validate again", (await label(page, "#valid-label")) === "Neu validieren");
  const [again] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Control+s")]);
  check("Ctrl+S saves", (await again.suggestedFilename()) === "o_szd.1222.tei.xml" && (await label(page, "#save-state")) === "");
  await page.keyboard.press("Backspace");

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
    // Modification time on the stubbed disk; writing advances it like a real file.
    window.__mtime = 1761800000000;
    const handle = {
      name: "o_szd.1222.tei.xml",
      getFile: async () => new File([await (await fetch("data/o_szd.1222.tei.xml")).text()], "o_szd.1222.tei.xml", { lastModified: window.__mtime }),
      createWritable: async () => ({ write: async (t) => window.__writes.push(t), close: async () => (window.__mtime += 1000) }),
    };
    window.showOpenFilePicker = async () => [handle];
    window.showSaveFilePicker = async () => handle;
  });
  await page.route("https://lobid.org/gnd/search**", (route) => route.fulfill({ json: LOBID_FIXTURE }));
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  await checkSelection(page, "light");
  await doubleClickWord(page, "Herrn Fuchs", "Fuchs");
  await page.waitForTimeout(300);
  await page.click("#actions [data-action='person']");
  await page.waitForTimeout(1200);
  await page.fill("#person-query", "Eugen Wolbe");
  await page.click("#person-search");
  await page.waitForSelector("#person-results .result", { timeout: 10000 });
  const gndNames = await page.locator("#person-results .result strong").allTextContents();
  check("GND hits are limited to name matches", gndNames.join(" | ") === "Wolber, Eugen | Wolbe, Eugen", gndNames.join(" | "));
  await page.click("#person-apply");
  check("applying without a choice asks for one", (await label(page, "#person-status")).startsWith("Bitte einen Treffer wählen"));
  await page.fill("#person-gnd", "1234567");
  check("a valid identifier clears that request", (await label(page, "#person-status")) === "");
  await page.click("#person-apply");
  await page.waitForTimeout(300);
  await page.click("#diff-button");
  check("changes view names one replaced line", (await label(page, "#diff-summary")) === "1 Zeile entfernt, 1 hinzugefügt, an 1 Stelle.", await label(page, "#diff-summary"));
  check(
    "changes view shows the old and the annotated line",
    (await page.locator("#diff-body .diff-row[data-kind='del']", { hasText: "Herrn Fuchs" }).count()) === 1 &&
      (await page.locator("#diff-body .diff-row[data-kind='add']", { hasText: 'gnd/1234567">Fuchs</persName>' }).count()) === 1,
  );
  await shot(page, "diff-light");
  await page.click("#diff-body .link");
  check("a line link closes the view and returns to the text", !(await page.isVisible("#diff-dialog")) && (await page.evaluate(() => document.activeElement?.classList.contains("cm-content"))));
  await page.click("#tei-save");
  await page.waitForTimeout(500);
  const writes = await page.evaluate(() => window.__writes);
  check("in-place save writes once into the opened file", writes.length === 1 && writes[0].includes('gnd/1234567">Fuchs</persName>'));
  check("status confirms the in-place save", (await label(page, "#xml-status")) === "Gespeichert in o_szd.1222.tei.xml.");
  await page.click("#diff-button");
  check("after saving the view compares with the saved text", (await label(page, "#diff-summary")) === "Keine Änderungen seit dem Speichern.");
  await page.keyboard.press("Escape");

  // Opening another file with unsaved work asks first, and cancelling keeps the text.
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.click("#tei-open");
  await page.waitForTimeout(200);
  check("opening with unsaved work asks first", (await page.isVisible("#ask-dialog")) && (await label(page, "#ask-title")) === "Ungespeicherte Änderungen");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("cancelling keeps the unsaved text", (await label(page, "#save-state")) === "Ungespeicherte Änderungen");

  // The file changes on disk, for instance through a pull, before the next save.
  await page.evaluate(() => (window.__mtime += 60000));
  await page.click("#tei-save");
  await page.waitForTimeout(300);
  check(
    "a file changed on disk asks before it is overwritten",
    (await page.isVisible("#ask-dialog")) && (await label(page, "#ask-title")) === "Datei auf der Festplatte geändert" && (await page.evaluate(() => window.__writes.length)) === 1,
  );
  await shot(page, "overwrite-light");
  await page.click("#ask-actions button[value='']");
  await page.waitForTimeout(200);
  check(
    "cancelling writes nothing and keeps the editor text",
    (await page.evaluate(() => window.__writes.length)) === 1 && (await label(page, "#save-state")) === "Ungespeicherte Änderungen" && (await label(page, "#xml-status")).startsWith("Nicht gespeichert"),
  );
  await page.click("#tei-save");
  await page.waitForTimeout(200);
  await page.click("#ask-actions button[value='overwrite']");
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__writes);
  check("overwriting after confirmation writes the editor text", after.length === 2 && after[1].endsWith(" ") && (await label(page, "#save-state")) === "");
  await page.click("#tei-save");
  await page.waitForTimeout(300);
  check("the next save writes without asking again", (await page.evaluate(() => window.__writes.length)) === 3 && !(await page.isVisible("#ask-dialog")));
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
        return new File([text], "crlf.tei.xml", { lastModified: 1761800000000 });
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

// Run 4: work through every HTR marker with F8 and Enter, then compare the
// saved file with the original transformed by the same rules, earliest marker
// first, so the check proves that the interface applied exactly these edits.
{
  const { source } = await import("../js/source.js");
  let expected = ORIGINAL;
  for (;;) {
    const spots = source.wraps
      .flatMap((w) => [...expected.matchAll(w.marker)].map((m) => ({ w, from: m.index, text: m[0] })))
      .sort((a, b) => a.from - b.from || b.text.length - a.text.length);
    if (!spots.length) break;
    const { w, from, text } = spots[0];
    expected = `${expected.slice(0, from)}<${w.element}>${w.strip(text)}</${w.element}>${expected.slice(from + text.length)}`;
  }

  const { page, errors } = await open({}, () => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
  const initial = await label(page, "#work-label");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Home");
  let steps = 0;
  while ((await label(page, "#work-label")) !== "Keine offenen Stellen" && steps < 20) {
    await page.keyboard.press("F8");
    await page.waitForTimeout(150);
    if (steps === 0) {
      const suggested = await page.evaluate(() => document.activeElement?.dataset.action);
      check("F8 selects a marker and focuses its suggested action", ["del", "unclear", "add"].includes(suggested), suggested);
      const quote = await label(page, "#actions-quote");
      check("the menu quotes the selected text in full", quote.startsWith("„") && quote.includes("[?]"), quote);
      const visible = await page.evaluate(() => {
        const r = document.querySelector(".cm-selectionBackground")?.getBoundingClientRect();
        const s = document.querySelector(".cm-scroller").getBoundingClientRect();
        return !!r && r.left >= s.left && r.right <= s.right;
      });
      check("the selected marker is fully visible", visible);
    }
    await page.keyboard.press("Enter");
    await page.waitForTimeout(450);
    steps++;
  }
  check("all open spots resolved by F8 and Enter", (await label(page, "#work-label")) === "Keine offenen Stellen", `${initial}, ${steps} steps`);
  await page.keyboard.press("F8");
  await page.waitForTimeout(200);
  check("F8 without open spots says so", (await label(page, "#xml-status")) === "Keine offenen Stellen mehr.");
  check("still well-formed after marker edits", (await label(page, "#wf-label")) === "Wohlgeformt");
  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  check("valid against TEI All after marker edits", (await label(page, "#valid-label")) === "TEI-konform", await label(page, "#xml-status"));
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  const saved = readFileSync(await download.path(), "utf8");
  check("saved file equals the rule-transformed original", saved === expected, `${saved.length} vs ${expected.length}`);

  await page.click("#img-in");
  await page.click("#img-fit");
  check("no console errors (marker run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Run 5: a file with Git conflict markers is explained and can be resolved.
{
  const lines = ORIGINAL.split("\n");
  const at = lines.findIndex((l) => l.includes("Herr Reichner"));
  const theirs = lines[at].replace("Herr Reichner", "Herrn Reichner");
  const conflicted = [...lines.slice(0, at), "<<<<<<< HEAD", lines[at], "=======", theirs, ">>>>>>> origin/main", ...lines.slice(at + 1)].join("\n");
  const resolved = [...lines.slice(0, at), theirs, ...lines.slice(at + 1)].join("\n");
  const { page, errors } = await open(
    { colorScheme: "dark" },
    (text) => {
      window.__writes = [];
      const handle = {
        name: "konflikt.tei.xml",
        getFile: async () => new File([text], "konflikt.tei.xml", { lastModified: 1761800000000 }),
        createWritable: async () => ({ write: async (t) => window.__writes.push(t), close: async () => {} }),
      };
      window.showOpenFilePicker = async () => [handle];
      window.showSaveFilePicker = async () => handle;
    },
    conflicted,
  );
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  const first = at + 1;
  check("conflict named on the check button", (await label(page, "#wf-label")) === `Git-Konflikt Zeile ${first}`, await label(page, "#wf-label"));
  check("status explains the conflict from its first line", (await label(page, "#xml-status")).startsWith(`Git-Konflikt ab Zeile ${first}:`));
  check("each marker line is listed with a link", (await page.locator("#xml-status button.link").allTextContents()).join(",") === `Zeile ${first},Zeile ${first + 2},Zeile ${first + 4}`);
  await page.click("#xml-status button.link");
  await page.waitForTimeout(200);
  check("conflict markers underlined", (await page.locator(".cm-lintRange-error").count()) >= 1);
  await page.waitForTimeout(200);
  await shot(page, "conflict-dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForTimeout(200);
  await shot(page, "conflict-light");
  // Keep the other version: delete the start marker, the own version and the separator, then the end marker.
  for (let i = 0; i < 3; i++) await page.keyboard.press("Control+Shift+K");
  await page.waitForTimeout(500);
  check("the remaining marker is still listed", (await page.locator("#xml-status button.link").allTextContents()).join(",") === `Zeile ${first + 1}`);
  await page.click("#xml-status button.link");
  await page.keyboard.press("Control+Shift+K");
  await page.waitForTimeout(500);
  check("resolving the conflict makes the document well-formed", (await label(page, "#wf-label")) === "Wohlgeformt");
  await page.click("#tei-save");
  await page.waitForTimeout(400);
  const [written] = await page.evaluate(() => window.__writes);
  check("the resolved file keeps exactly the chosen version", written === resolved, `${written?.length} vs ${resolved.length}`);
  check("no console errors (conflict run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

console.log(results.join("\n"));
await browser.close();
process.exitCode = results.some((r) => r.startsWith("FAIL")) ? 1 : 0;
