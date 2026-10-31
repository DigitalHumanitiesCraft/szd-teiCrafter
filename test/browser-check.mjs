// End-to-end check of the editing task in a real browser: open the example
// letter, annotate persons with GND ids, validate, save, and compare the saved
// bytes with the original; then the document list, the working state with
// acceptance, and every document of the working set. Needs the app served at
// BASE_URL and network access to GAMS (facsimile) and lobid-gnd (person
// search). See knowledge/testing.md.

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8000/";
const ORIGINAL = readFileSync(new URL("../data/o_szd.1222.tei.xml", import.meta.url), "utf8");
const INDEX = JSON.parse(readFileSync(new URL("../data/index.json", import.meta.url), "utf8"));
const ALL_DOCS = INDEX.collections.flatMap((c) => c.documents);
const REICHNER = ALL_DOCS.find((d) => d.objectId === "o_szd.1750");
const REICHNER_TEXT = readFileSync(new URL(`../${REICHNER.path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const lf = (text) => text.replace(/\r\n/g, "\n");
const ACTIONS_TEXT = readFileSync(new URL("../data/actions.json", import.meta.url), "utf8");
const ACTIONS = JSON.parse(ACTIONS_TEXT).actions;
const results = [];
// A run that throws still shows the checks it reached.
process.on("exit", (code) => code && !results.printed && console.log(results.join("\n")));
const check =(name, ok, detail = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
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

// The document list is generated; a stale data/index.json would show wrong
// titles, pages or states.
{
  const { buildIndex, INDEX_FILE } = await import("../tools/build-document-index.mjs");
  const stored = readFileSync(INDEX_FILE, "utf8").replace(/\r\n/g, "\n");
  check("data/index.json is in step with the files (node tools/build-document-index.mjs)", (await buildIndex()) === stored);
}

// Acceptance edits on header variants the browser runs cannot load, and the
// other pure functions, are asserted in test/unit/ (node --test).

const browser = await chromium.launch();

// The editor's text as saving would write it, read from the CodeMirror view.
const editorText = (page) =>
  page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    return EditorView.findFromDOM(document.querySelector(".cm-editor")).state.sliceDoc();
  });
// A paste as the clipboard delivers it, through CodeMirror's own paste handling.
const paste = (page, text) =>
  page.evaluate((t) => {
    const data = new DataTransfer();
    data.setData("text/plain", t);
    document.querySelector(".cm-content").dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
const bareLf = (text) => (text.match(/(^|[^\r])\n/g) ?? []).length;

async function open(contextOptions, initScript, initArg) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, ...contextOptions });
  // The longest stall of the main thread since the last reset, from a 50 ms heartbeat.
  await ctx.addInitScript(() => {
    window.__maxStall = 0;
    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      window.__maxStall = Math.max(window.__maxStall, now - last - 50);
      last = now;
    }, 50);
  });
  if (initScript) await ctx.addInitScript(initScript, initArg);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(BASE_URL);
  try {
    await page.waitForFunction(() => document.getElementById("page-label").textContent.includes("von"), null, { timeout: 30000 });
  } catch (err) {
    // Name what the page shows, so a slow GAMS answer is told apart from an editor fault.
    const shown = await page.evaluate(() => ["iiif-status", "xml-status"].map((id) => `${id}: ${document.getElementById(id)?.textContent ?? ""}`).join(" | "));
    throw new Error(`The facsimile did not load within 30 s (${shown}; ${errors.join(" | ")})`, { cause: err });
  }
  await page.waitForTimeout(1500);
  return { page, errors };
}

// The badge's words as read: label, then the detail after the separator that
// css/app.css draws.
const docState = (page) =>
  page.evaluate(() => [document.getElementById("doc-state-label").textContent, document.getElementById("doc-state-detail").textContent].filter(Boolean).join(" | "));
const unsavedDot = (page) =>
  page.evaluate(() => {
    const save = document.getElementById("tei-save");
    return save.hasAttribute("data-unsaved") && getComputedStyle(save, "::before").content !== "none";
  });
async function validate(page) {
  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  return label(page, "#valid-label");
}

// Screenshots of a state in both schemes at the wide and the narrow working
// width; afterwards the page returns to the given scheme at 1440 x 900.
async function shotAll(page, name, scheme) {
  if (!SHOTS_DIR) return;
  for (const colorScheme of ["dark", "light"]) {
    await page.emulateMedia({ colorScheme });
    for (const [width, height] of [[1440, 900], [900, 800]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(500);
      await shot(page, `${name}-${colorScheme}-${width}`);
    }
  }
  await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
}

// Real pointer double-click on a word in the editor, after scrolling its line
// into the rendered viewport (CodeMirror renders only visible lines).
async function doubleClickWord(page, lineText, word) {
  const line = page.locator(".cm-line", { hasText: lineText }).first();
  // A scroll still pending from the last edit would undo the reset below, and
  // CodeMirror renders the new viewport only after the scroll event.
  await page.waitForTimeout(150);
  await page.evaluate(() => (document.querySelector(".cm-scroller").scrollTop = 0));
  await page.waitForTimeout(150);
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
  const caretLine = await page.locator(".cm-activeLine").textContent();
  check("caret starts at the first page break", caretLine.trim().startsWith("<pb "), caretLine.trim());
  check("working state names the open spots", (await docState(page)) === "In Bearbeitung | 7 offene Stellen", await docState(page));
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
  check("preview shows the index reference", (await label(page, "#person-preview")) === '<persName ref="#SZDPER.2188">Reichner</persName>');
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

  await page.evaluate(() => (window.__maxStall = 0));
  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  check("valid against TEI All", (await label(page, "#valid-label")) === "TEI-konform", await label(page, "#xml-status"));
  {
    const stall = Math.round(await page.evaluate(() => window.__maxStall));
    check("the first validation of the session leaves the editor responsive", stall < 500, `${stall} ms longest stall`);
  }
  check("a valid result names the fallback schema", (await label(page, "#xml-status")).includes("Rückfallschema"), await label(page, "#xml-status"));
  check("annotations mark the document unsaved", (await label(page, "#save-state")) === "Ungespeicherte Änderungen");
  check("the save button carries the unsaved dot", await unsavedDot(page));
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
  const expected = ORIGINAL.replace("Herr Reichner", 'Herr <persName ref="#SZDPER.2188">Reichner</persName>').replace(
    "Herr Relgis",
    'Herr <persName ref="http://d-nb.info/gnd/1057079499">Relgis</persName>',
  );
  check("saved file is the original plus exactly the two annotations", saved === expected);
  // The browser may still ask where to put the download or cancel it, so the
  // text stays unsaved and says why.
  check(
    "a download keeps the unsaved dot and says arrival is not confirmed",
    (await label(page, "#save-state")) === "Als Download übergeben, Ankunft nicht bestätigt" &&
      (await unsavedDot(page)) &&
      (await label(page, "#xml-status")).startsWith("o_szd.1222.tei.xml wurde dem Browser als Download übergeben."),
    await label(page, "#save-state"),
  );
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.waitForTimeout(400);
  check("an edit after validating asks to validate again", (await label(page, "#valid-label")) === "Neu validieren");
  check("an edit after a download is unsaved work again", (await label(page, "#save-state")) === "Ungespeicherte Änderungen");
  const [again] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Control+s")]);
  check("Ctrl+S saves", (await again.suggestedFilename()) === "o_szd.1222.tei.xml" && (await label(page, "#save-state")) === "Als Download übergeben, Ankunft nicht bestätigt");
  await page.keyboard.press("Backspace");

  // The menu checks the selection again when an action runs, since it may
  // have changed after the menu opened.
  await doubleClickWord(page, "Liebe Frau Meingast", "Meingast");
  await page.keyboard.press("Control+.");
  const beforeMenu = await editorText(page);
  await page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
    const { head } = view.state.selection.main;
    // Back into the line above, so the selection takes in the opening <p>;
    // an <lb/> alone may be spanned.
    view.dispatch({ selection: { anchor: view.state.doc.line(view.state.doc.lineAt(head).number - 1).from, head } });
  });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check(
    "an action on a selection that gained markup is refused",
    !(await page.isVisible("#person-dialog")) && (await editorText(page)) === beforeMenu && (await label(page, "#xml-status")).startsWith("Die Markierung enthält Markup"),
    await label(page, "#xml-status"),
  );

  // A second question while one is open is answered as dismissed and leaves the first in place.
  const second = await page.evaluate(async () => {
    const { ask } = await import("./js/ui.js");
    ask({ title: "Erste Frage", text: "", choices: [{ value: "", label: "Abbrechen" }] });
    // Bounded, so a second question that never resolves fails instead of hanging the run.
    const answer = await Promise.race([ask({ title: "Zweite Frage", text: "", choices: [{ value: "x", label: "X" }] }), new Promise((resolve) => setTimeout(() => resolve("pending"), 1000))]);
    const title = document.getElementById("ask-title").textContent;
    document.getElementById("ask-dialog").close();
    return { answer, title };
  });
  check("ask is not reentrant", second.answer === "" && second.title === "Erste Frage", JSON.stringify(second));

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

  // The fallback file input is cleared after each choice, so choosing the same file again opens it again.
  const reichner = new URL(`../${REICHNER.path}`, import.meta.url);
  await page.setInputFiles("#tei-file", fileURLToPath(reichner));
  await page.waitForFunction(() => document.getElementById("doc-meta").textContent.startsWith("o_szd.1750.tei.xml"), null, { timeout: 10000 });
  check("the file input is cleared after opening", (await page.inputValue("#tei-file")) === "");
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
  {
    const saved = await label(page, "#xml-status");
    check("status confirms the in-place save and names the state", saved.startsWith("Gespeichert in o_szd.1222.tei.xml.") && saved.includes("Stand: In Bearbeitung"), saved);
  }
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
  const { stripMarker, wrap } = await import("../js/actions.js");
  let expected = ORIGINAL;
  for (;;) {
    const spots = ACTIONS.filter((a) => a.resolves)
      .flatMap((a) => [...expected.matchAll(new RegExp(a.resolves.marker, "g"))].map((m) => ({ a, from: m.index, text: m[0] })))
      .sort((x, y) => x.from - y.from || y.text.length - x.text.length);
    if (!spots.length) break;
    const { a, from, text } = spots[0];
    expected = `${expected.slice(0, from)}${wrap(a, stripMarker(a, text))}${expected.slice(from + text.length)}`;
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

/** Opens a document from the list by its object id; the list closes on the way. */
async function chooseDocument(page, objectId) {
  await page.click("#docs-button");
  await page.fill("#docs-query", objectId);
  const meta = new RegExp(`^${objectId.replace(".", "\\.")} \\|`);
  await page.locator(".doc-item").filter({ has: page.locator("span", { hasText: meta }) }).click();
}

// Run 6: the document list, the hanging indent, and the working state from
// validation through acceptance to an edit after it.
{
  const { page, errors } = await open({ colorScheme: "dark" }, () => {
    delete window.showOpenFilePicker;
    delete window.showSaveFilePicker;
  });
  await shotAll(page, "start", "dark");

  // At the narrow working width long lines wrap and the facsimile pane is about 26rem.
  await page.setViewportSize({ width: 900, height: 800 });
  await page.waitForTimeout(500);
  check("facsimile toolbar on one row at 900 px", (await page.locator(".pane-image .toolbar").first().boundingBox()).height < 50);
  const hang = await page.evaluate(() => {
    const range = document.createRange();
    for (const line of document.querySelectorAll(".cm-line")) {
      const chars = [];
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        for (let i = 0; i < n.data.length; i++) {
          if (!n.data[i].trim()) continue;
          range.setStart(n, i);
          range.setEnd(n, i + 1);
          const r = range.getClientRects()[0];
          if (r) chars.push(r);
        }
      }
      const start = chars[0];
      const continuation = start && chars.find((r) => r.top > start.top + start.height / 2);
      if (continuation) return { line: line.textContent.trim().slice(0, 30), content: Math.round(start.left), continuation: Math.round(continuation.left) };
    }
    return null;
  });
  check("a wrapped line continues right of its content start", !!hang && hang.continuation > hang.content, JSON.stringify(hang));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  await page.click("#docs-button");
  check("document list opens with every document", (await page.isVisible("#docs-dialog")) && (await label(page, "#docs-count")) === `${ALL_DOCS.length} Dokumente`, await label(page, "#docs-count"));
  check("the open document is marked in the list", (await page.locator(".doc-item[aria-current='true']", { hasText: "o_szd.1222" }).count()) === 1);
  await shotAll(page, "docs", "dark");
  await page.fill("#docs-query", "Reichner");
  check("search filters the list", (await page.locator(".doc-item").count()) === 1 && (await label(page, "#docs-count")) === `1 von ${ALL_DOCS.length} Dokumenten`, await label(page, "#docs-count"));
  await page.fill("#docs-query", "");
  await page.click("#docs-collections .chip >> text=Werke");
  const werke = INDEX.collections.find((c) => c.key === "werke").documents.length;
  const headings = await page.locator("#docs-list h3").allTextContents();
  check("a collection chip shows that collection only", (await page.locator(".doc-item").count()) === werke && headings.length === 1 && headings[0].startsWith("Werke"), headings.join(" | "));
  check("the pressed chip keeps the focus", await page.evaluate(() => document.activeElement?.textContent === "Werke"));
  await page.click("#docs-collections .chip >> text=Alle");
  await page.selectOption("#docs-state", "open");
  check("the state filter keeps documents with open spots", (await page.locator(".doc-item").count()) === ALL_DOCS.filter((d) => d.open > 0).length);
  await page.selectOption("#docs-state", "approved");
  check("the state filter for accepted documents", (await page.locator(".doc-item").count()) === ALL_DOCS.filter((d) => d.status === "approved").length);
  await page.selectOption("#docs-state", "");
  await page.click("#docs-dialog .dialog-actions button");

  // Unsaved work is not replaced without a question.
  await page.locator(".cm-content").click();
  await page.keyboard.type(" ");
  await chooseDocument(page, "o_szd.1750");
  await page.waitForTimeout(200);
  check("switching documents with unsaved work asks first", (await page.isVisible("#ask-dialog")) && (await label(page, "#ask-title")) === "Ungespeicherte Änderungen");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("cancelling keeps the open document and its edit", (await label(page, "#doc-title")).startsWith("Brief an Anna Meingast") && (await label(page, "#save-state")) === "Ungespeicherte Änderungen");

  const manifest = page.waitForRequest((r) => r.url().includes("o:szd.1750/sdef:IIIF/getManifest"), { timeout: 30000 }).catch(() => null);
  await chooseDocument(page, "o_szd.1750");
  await page.click("#ask-actions button[value='discard']");
  await page.waitForFunction(() => document.getElementById("doc-meta").textContent.startsWith("o_szd.1750"), null, { timeout: 30000 });
  // The facsimile loads after the text; its page label shows the new page count.
  await page
    .waitForFunction((pages) => document.querySelector("#page-label .page-long")?.textContent === `Seite 1 von ${pages}`, REICHNER.pages, { timeout: 30000 })
    .catch(() => {});
  check(
    "choosing an entry loads that document",
    (await label(page, "#doc-title")) === REICHNER.title && (await label(page, "#doc-meta")).startsWith("o_szd.1750.tei.xml") && (await label(page, "#save-state")) === "",
    await label(page, "#doc-title"),
  );
  check("the facsimile follows the chosen document", !!(await manifest) && (await label(page, "#page-label .page-long")) === `Seite 1 von ${REICHNER.pages}`, await label(page, "#page-label .page-long"));

  check("a document without open spots asks for validation", (await docState(page)) === "In Bearbeitung | noch nicht validiert", await docState(page));
  check("the chosen document is valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));
  check(
    "a valid document without open spots is ready for acceptance",
    (await docState(page)) === "Bereit zur Abnahme" && (await page.isVisible("#accept")) && (await label(page, "#accept")) === "Abnehmen",
    await docState(page),
  );
  await shotAll(page, "ready", "dark");

  // An edit inside the check's debounce interval must not be accepted on the
  // strength of the validation of the earlier text: here an element TEI does
  // not know, inserted and accepted at once.
  const validText = await editorText(page);
  await page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
    const at = view.state.doc.toString().indexOf("<p>") + 3;
    view.dispatch({ changes: { from: at, insert: "<unbekannt/>" } });
    document.getElementById("accept").click();
  });
  await page.waitForTimeout(400);
  check(
    "acceptance inside the debounce interval is refused",
    (await docState(page)) === "In Bearbeitung | noch nicht validiert" && !(await editorText(page)).includes('status="approved"') && (await label(page, "#xml-status")).startsWith("Nicht abgenommen"),
    `${await docState(page)}: ${await label(page, "#xml-status")}`,
  );
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  check(
    "undoing back to the validated text restores its validation",
    (await editorText(page)) === validText && (await label(page, "#valid-label")) === "TEI-konform" && (await docState(page)) === "Bereit zur Abnahme",
    `${await label(page, "#valid-label")}, ${await docState(page)}`,
  );
  // Validating right after typing: the pending check must not discard the
  // result. A space after the root element keeps the document valid.
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.click("#valid-button");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent !== "Prüfe …", null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  check("a validation right after typing stays shown", (await label(page, "#valid-label")) === "TEI-konform", await label(page, "#valid-label"));
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  check("the restored text needs validating again", (await editorText(page)) === validText && (await validate(page)) === "TEI-konform" && (await docState(page)) === "Bereit zur Abnahme", await docState(page));

  await page.click("#accept");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent === "TEI-konform", null, { timeout: 60000 }).catch(() => {});
  check("acceptance shows Abgenommen", (await docState(page)) === "Abgenommen" && (await page.isHidden("#accept")), await docState(page));
  check(
    "acceptance validates the accepted text again",
    (await label(page, "#valid-label")) === "TEI-konform" && (await label(page, "#xml-status")).startsWith("Abgenommen und gültig gegen TEI All"),
    `${await label(page, "#valid-label")}: ${await label(page, "#xml-status")}`,
  );
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#tei-save")]);
  const accepted = lf(readFileSync(await download.path(), "utf8"));
  const block = /[ \t]*<revisionDesc status="approved">\n[ \t]*<change when="\d{4}-\d{2}-\d{2}" status="approved">[^<]+<\/change>\n[ \t]*<\/revisionDesc>\n/;
  check(
    "acceptance adds one revisionDesc with an approving change and nothing else",
    accepted.match(/<revisionDesc\b/g)?.length === 1 && block.test(accepted) && accepted.replace(block, "") === REICHNER_TEXT,
  );
  check("the accepted document stays valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));
  check("validation keeps the accepted state", (await docState(page)) === "Abgenommen", await docState(page));
  await shotAll(page, "accepted", "dark");
  await page.click("#docs-button");
  check("the list shows the accepted state", (await page.getAttribute(".doc-item[aria-current='true'] .doc-state-icon svg", "aria-label")) === "Abgenommen");
  await page.click("#docs-dialog .dialog-actions button");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.waitForTimeout(500);
  check("an edit after acceptance is named", (await docState(page)) === "Abgenommen | seither geändert", await docState(page));
  check("no console errors (document list run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Run 7: a document that already has a revisionDesc gets its status set
// instead of a second revisionDesc, and opens as accepted afterwards.
{
  const fixture = REICHNER_TEXT.replace(/\n([ \t]*)<\/teiHeader>/, (_, indent) =>
    [
      "",
      `${indent}  <revisionDesc status="draft">`,
      `${indent}    <listChange>`,
      `${indent}      <change when="2026-10-01">Import aus szd-htr.</change>`,
      `${indent}    </listChange>`,
      `${indent}  </revisionDesc>`,
      `${indent}</teiHeader>`,
    ].join("\n"),
  );
  const { page, errors } = await open(
    { colorScheme: "light" },
    (text) => {
      window.__writes = [];
      const handle = {
        name: "revision.tei.xml",
        getFile: async () => new File([window.__writes.at(-1) ?? text], "revision.tei.xml", { lastModified: 1761800000000 + window.__writes.length }),
        createWritable: async () => ({ write: async (t) => window.__writes.push(t), close: async () => {} }),
      };
      window.showOpenFilePicker = async () => [handle];
      window.showSaveFilePicker = async () => handle;
    },
    fixture,
  );
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  check("a draft revisionDesc is in progress", (await docState(page)).startsWith("In Bearbeitung"), await docState(page));
  check("the fixture with revisionDesc is valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));
  await page.click("#accept");
  await page.waitForTimeout(300);
  await page.click("#tei-save");
  await page.waitForTimeout(400);
  const written = lf((await page.evaluate(() => window.__writes))[0] ?? "");
  const desc = /<revisionDesc\b[^>]*>[\s\S]*?<\/revisionDesc>/.exec(written)?.[0] ?? "";
  const kept =
    written.match(/<revisionDesc\b/g)?.length === 1 &&
    desc.startsWith('<revisionDesc status="approved">') &&
    desc.match(/<change\b/g)?.length === 2 &&
    /<change when="\d{4}-\d{2}-\d{2}" status="approved">[^<]+<\/change>\n[ \t]*<\/listChange>/.test(desc);
  check("acceptance sets the status of the existing revisionDesc", kept, kept ? "" : JSON.stringify(desc));
  check("the accepted fixture stays valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));
  await page.click("#tei-open");
  await page.waitForTimeout(800);
  check("an accepted file opens as accepted", (await docState(page)) === "Abgenommen" && (await page.isHidden("#accept")), await docState(page));
  check("no console errors (revisionDesc run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Data safety run: saving while another document is chosen, undo across a
// switch, the permission and overwrite order, a failing write, encodings, line
// endings, and state that must not survive a document switch. Stubbed file
// handles serve the files below and log every disk access.
{
  const raw = readFileSync(new URL(`../${REICHNER.path}`, import.meta.url), "utf8");
  const approved = REICHNER_TEXT.replace(/\n([ \t]*)<\/teiHeader>/, (_, indent) =>
    `\n${indent}  <revisionDesc status="approved">\n${indent}    <change when="2026-10-01" status="approved">ok</change>\n${indent}  </revisionDesc>\n${indent}</teiHeader>`,
  );
  // CRLF throughout except the first five breaks, and a bare & that the parser reports.
  const lines = ORIGINAL.split("\n");
  const badLine = lines.findIndex((l) => l.includes("Herr Reichner"));
  lines[badLine] = lines[badLine].replace("Herr Reichner", "Herr & Reichner");
  const mixed = lines.map((l, i) => (i === lines.length - 1 ? l : `${l}${i < 5 ? "\n" : "\r\n"}`)).join("");
  const files = {
    a: { name: "A.tei.xml", text: ORIGINAL },
    bom: { name: "bom.tei.xml", bytes: [0xef, 0xbb, 0xbf, ...Buffer.from(raw, "utf8")] },
    latin: { name: "latin.tei.xml", bytes: [...Buffer.from(ORIGINAL, "latin1")] },
    approved: { name: "approved.tei.xml", text: approved },
    broken: { name: "kaputt.tei.xml", text: ORIGINAL.replace("</TEI>", "") },
    crlf: { name: "crlf.tei.xml", text: REICHNER_TEXT.replace(/\n/g, "\r\n") },
    mixed: { name: "mixed.tei.xml", text: mixed },
  };
  const { page, errors } = await open(
    { colorScheme: "dark" },
    (served) => {
      Object.assign(window, { __writes: [], __log: [], __mtime: 1761800000000, __next: "a", __hold: false, __changeOnCreate: false, __failWrite: false, __granted: false });
      const make = (key) => ({
        name: served[key].name,
        queryPermission: async () => (window.__log.push("query"), window.__granted ? "granted" : "prompt"),
        requestPermission: async () => (window.__log.push("request"), (window.__granted = true), "granted"),
        getFile: async () => {
          window.__log.push("getFile");
          const f = served[key];
          return new File([f.bytes ? new Uint8Array(f.bytes) : f.text], f.name, { lastModified: window.__mtime });
        },
        createWritable: async () => {
          window.__log.push("create");
          if (window.__hold) await new Promise((resolve) => (window.__release = resolve));
          // Another program writes the file while the stream is being opened.
          if (window.__changeOnCreate) {
            window.__changeOnCreate = false;
            window.__mtime += 5000;
          }
          return {
            write: async (data) => {
              if (window.__failWrite) throw new Error("Datenträger voll");
              window.__writes.push({ key, data });
            },
            close: async () => (window.__log.push("close"), (window.__mtime += 1000)),
            abort: async () => window.__log.push("abort"),
          };
        },
      });
      const handles = Object.fromEntries(Object.keys(served).map((k) => [k, make(k)]));
      window.showOpenFilePicker = async () => [handles[window.__next]];
      window.showSaveFilePicker = async () => handles[window.__next];
    },
    files,
  );
  const openFile = async (key) => {
    await page.evaluate((k) => (window.__next = k), key);
    await page.click("#tei-open");
    await page.waitForTimeout(600);
  };
  const writes = () => page.evaluate(() => window.__writes);

  // A save waiting for the disk keeps its document: choosing another one is refused.
  await openFile("a");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.evaluate(() => Object.assign(window, { __hold: true, __log: [] }));
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(200);
  await chooseDocument(page, "o_szd.1750");
  await page.waitForTimeout(300);
  check(
    "choosing a document while saving is refused",
    !(await page.isVisible("#ask-dialog")) && (await label(page, "#doc-meta")).startsWith("A.tei.xml") && (await label(page, "#xml-status")).startsWith("A.tei.xml wird gerade gespeichert"),
    await label(page, "#xml-status"),
  );
  await page.evaluate(() => {
    window.__hold = false;
    window.__release();
  });
  await page.waitForTimeout(400);
  const first = await writes();
  check(
    "the held save completes into its own file",
    first.length === 1 && first[0].key === "a" && first[0].data === `${ORIGINAL} ` && (await label(page, "#xml-status")).startsWith("Gespeichert in A.tei.xml.") && (await label(page, "#save-state")) === "",
    await label(page, "#xml-status"),
  );
  const log = await page.evaluate(() => window.__log);
  check("permission comes before the disk comparison, which comes before writing", log.slice(0, 5).join(",") === "query,request,getFile,create,getFile", log.join(","));

  // Undo after switching documents cannot bring back the previous document.
  await chooseDocument(page, "o_szd.1750");
  await page.waitForFunction(() => document.getElementById("doc-meta").textContent.startsWith("o_szd.1750"), null, { timeout: 10000 });
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  check("undo after a switch keeps the new document", (await editorText(page)) === raw && (await label(page, "#save-state")) === "" && (await label(page, "#doc-title")) === REICHNER.title);
  await page.keyboard.type("x");
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(400);
  check("undo still works within the new document", (await editorText(page)) === raw && (await label(page, "#save-state")) === "");

  // The file changes while the stream is opened: nothing is written, and the user is asked.
  await openFile("a");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.evaluate(() => Object.assign(window, { __changeOnCreate: true, __log: [] }));
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  check(
    "a change between comparison and writing aborts the stream and asks",
    (await page.isVisible("#ask-dialog")) && (await label(page, "#ask-title")) === "Datei auf der Festplatte geändert" && (await page.evaluate(() => window.__log.includes("abort"))) && (await writes()).length === 1,
    (await page.evaluate(() => window.__log)).join(","),
  );
  await page.click("#ask-actions button[value='overwrite']");
  await page.waitForTimeout(400);
  check("overwriting then writes the editor text", (await writes()).length === 2 && (await label(page, "#save-state")) === "");

  // A failing write aborts the stream and keeps the work unsaved.
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await page.evaluate(() => Object.assign(window, { __failWrite: true, __log: [] }));
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  check(
    "a failing write aborts the stream and keeps the text unsaved",
    (await page.evaluate(() => window.__log.includes("abort"))) && (await label(page, "#xml-status")).startsWith("Speichern fehlgeschlagen") && (await label(page, "#save-state")) === "Ungespeicherte Änderungen",
    await label(page, "#xml-status"),
  );
  await page.evaluate(() => (window.__failWrite = false));
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);

  // A byte order mark is kept and only UTF-8 opens.
  await openFile("bom");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  const bomWrite = (await writes()).at(-1);
  check("a file with a byte order mark is saved byte-exact", bomWrite.key === "bom" && bomWrite.data === `﻿${raw}` && (await editorText(page)) === raw);
  await openFile("latin");
  check(
    "a file that is not UTF-8 is refused and the open document stays",
    (await label(page, "#xml-status")).startsWith("Nicht geöffnet: latin.tei.xml ist kein gültiges UTF-8") && (await label(page, "#doc-meta")).startsWith("bom.tei.xml"),
    await label(page, "#xml-status"),
  );

  // Title and state of an accepted document do not survive a malformed one.
  await openFile("approved");
  check("the approved fixture opens as accepted", (await docState(page)) === "Abgenommen", await docState(page));
  await openFile("broken");
  check(
    "a malformed document after an accepted one shows its own name and state",
    (await label(page, "#doc-title")) === "kaputt.tei.xml" && (await docState(page)) === "In Bearbeitung | nicht wohlgeformt",
    `${await label(page, "#doc-title")}, ${await docState(page)}`,
  );
  check(
    "nor does the facsimile of the previous document",
    (await page.inputValue("#iiif-url")) === "" && (await label(page, "#page-label")) === "" && (await page.isDisabled("#page-next")),
    await label(page, "#page-label"),
  );
  await shot(page, "broken-dark");

  // CRLF: acceptance and a multi-line paste insert CRLF, never a bare LF.
  await openFile("crlf");
  check("the CRLF letter is valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));
  await page.click("#accept");
  await page.waitForFunction(() => document.getElementById("valid-label").textContent === "TEI-konform", null, { timeout: 60000 }).catch(() => {});
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  const acceptedWrite = (await writes()).at(-1)?.data ?? "";
  check(
    "a save right after acceptance keeps it, in CRLF",
    bareLf(acceptedWrite) === 0 && acceptedWrite.includes('<revisionDesc status="approved">\r\n'),
    `${bareLf(acceptedWrite)} bare LF`,
  );
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await paste(page, "\neins\nzwei\ndrei");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  const crlfWrite = (await writes()).at(-1)?.data ?? "";
  check(
    "a save after a later edit withdraws the acceptance and keeps CRLF throughout",
    bareLf(crlfWrite) === 0 &&
      crlfWrite.includes('<revisionDesc status="draft">\r\n') &&
      crlfWrite.endsWith("\r\neins\r\nzwei\r\ndrei") &&
      (await label(page, "#xml-status")).includes("Die Abnahme ist zurückgenommen"),
    `${bareLf(crlfWrite)} bare LF, ${await label(page, "#xml-status")}`,
  );

  // Mixed line endings: named on opening, error lines counted as the parser counts them, saved unchanged.
  await openFile("mixed");
  check("mixed line endings are named on opening", (await label(page, "#xml-status")).startsWith("mixed.tei.xml mischt Zeilenenden: "), await label(page, "#xml-status"));
  check("the error line is the parser's line", (await label(page, "#wf-label")) === `Fehler Zeile ${badLine + 1}`, await label(page, "#wf-label"));
  await page.click("#wf-button");
  await page.waitForTimeout(200);
  check("the error jump lands on that line", (await page.locator(".cm-activeLine").textContent()).includes("Herr & Reichner"), await page.locator(".cm-activeLine").textContent());
  await shot(page, "mixed-dark");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  check("an unedited file with mixed line endings is saved byte-identical", (await writes()).at(-1)?.data === mixed);

  // Open work without an encoding rule: counted, selected by F8, named in the menu, and Enter does nothing.
  const gaps = ALL_DOCS.find((d) => d.objectId === "o_szd.1267");
  await chooseDocument(page, gaps.objectId);
  await page.waitForFunction(() => document.getElementById("doc-meta").textContent.startsWith("o_szd.1267"), null, { timeout: 10000 });
  check("gaps count as open work", (await label(page, "#work-label")) === `${gaps.open} offene Stellen` && gaps.open > 0, await label(page, "#work-label"));
  check("the counter names every kind of open work", (await page.getAttribute("#work-button", "data-tip")).includes("Lücke, HTR-Kommentar"), await page.getAttribute("#work-button", "data-tip"));
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("F8");
  await page.waitForTimeout(300);
  const before = await editorText(page);
  check(
    "F8 selects a gap and the menu says its rule is open",
    (await label(page, "#actions-quote")).startsWith("„[...") &&
      (await page.isVisible("#actions-note")) &&
      (await label(page, "#actions-note")).startsWith("Lücke: Die Kodierungsregel ist noch offen") &&
      (await page.locator("#actions [data-suggested]").count()) === 0 &&
      (await page.evaluate(() => document.activeElement?.id === "actions")),
    await label(page, "#actions-note"),
  );
  await shot(page, "gap-note-dark");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("Enter on a kind without action changes nothing", (await editorText(page)) === before && !(await page.isVisible("#person-dialog")));
  await page.keyboard.press("Escape");
  check("no console errors (data safety run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Text view run: the same document with the markup hidden. Annotating in it,
// undo across the switch, the refusal of edits that cut markup, the card of a
// marked passage, Enter as a new line, the layout by <lb/>, CRLF, a malformed
// document, and the place and date actions. Saved bytes are compared with the
// original plus exactly the expected edits.
const lobidPlaces = {
  member: [
    { gndIdentifier: "4005728-8", preferredName: "Berlin", type: ["PlaceOrGeographicName"], geographicAreaCode: [{ label: "Deutschland" }], sameAs: [{ id: "https://sws.geonames.org/2950159" }] },
    { gndIdentifier: "1234567-1", preferredName: "Berlin-Mitte", type: ["PlaceOrGeographicName"] },
  ],
};
/** Selects a passage of the document by its text, as a pointer selection would. */
const selectText = (page, needle, offset = 0, length = needle.length) =>
  page.evaluate(
    async ([n, o, l]) => {
      const { EditorView } = await import("./vendor/codemirror/codemirror.js");
      const view = EditorView.findFromDOM(document.querySelector(".cm-editor"));
      const at = view.state.doc.toString().indexOf(n) + o;
      view.dispatch({ selection: { anchor: at, head: at + l }, scrollIntoView: true });
      view.focus();
    },
    [needle, offset, length],
  );
const caretAt = (page, needle, offset = 0) => selectText(page, needle, offset, 0);
const selection = (page) =>
  page.evaluate(async () => {
    const { EditorView } = await import("./vendor/codemirror/codemirror.js");
    const { from, to } = EditorView.findFromDOM(document.querySelector(".cm-editor")).state.selection.main;
    return { from, to };
  });
const pressed = (page, id) => page.getAttribute(`#${id}`, "aria-pressed").then((v) => v === "true");
const shownText = (page) => page.evaluate(() => document.querySelector(".cm-content").innerText);
{
  const noLb = ORIGINAL.replace(/<lb\/>/g, "");
  const files = {
    a: { name: "A.tei.xml", text: ORIGINAL },
    crlf: { name: "crlf.tei.xml", text: ORIGINAL.replace(/\n/g, "\r\n") },
    nolb: { name: "nolb.tei.xml", text: noLb },
    broken: { name: "kaputt.tei.xml", text: ORIGINAL.replace("</TEI>", "") },
  };
  const { page, errors } = await open(
    { colorScheme: "light" },
    (served) => {
      Object.assign(window, { __writes: [], __next: "a" });
      const make = (key) => ({
        name: served[key].name,
        getFile: async () => new File([served[key].text], served[key].name, { lastModified: 1761800000000 + window.__writes.length }),
        createWritable: async () => ({ write: async (data) => window.__writes.push({ key, data }), close: async () => {} }),
      });
      const handles = Object.fromEntries(Object.keys(served).map((k) => [k, make(k)]));
      window.showOpenFilePicker = async () => [handles[window.__next]];
      window.showSaveFilePicker = async () => handles[window.__next];
    },
    files,
  );
  await page.route("https://lobid.org/gnd/search**", (route) => route.fulfill({ json: route.request().url().includes("PlaceOrGeographicName") ? lobidPlaces : LOBID_FIXTURE }));
  const openFile = async (key) => {
    await page.evaluate((k) => (window.__next = k), key);
    await page.click("#tei-open");
    await page.waitForTimeout(700);
  };
  const lastWrite = () => page.evaluate(() => window.__writes.at(-1)?.data ?? "");

  check("the XML view opens first", (await pressed(page, "view-xml")) && !(await pressed(page, "view-text")) && (await page.locator(".cm-textview").count()) === 0);
  check("the view switch explains both views", (await page.getAttribute("#view-switch", "data-tip")).startsWith("XML zeigt den TEI-Quelltext"));
  await openFile("a");
  await doubleClickWord(page, "Herr Reichner", "Reichner");
  const before = await selection(page);
  await page.click("#view-text");
  await page.waitForTimeout(400);
  const visible = await shownText(page);
  check(
    "the text view hides header, tags and line numbers",
    (await page.locator(".cm-textview").count()) === 1 && !visible.includes("<") && !visible.includes("Machine-generated") && (await page.locator(".cm-lineNumbers").count()) === 0,
  );
  check("a letter with <lb/> opens in lines", (await pressed(page, "layout-lines")) && visible.includes("Vor allem erinnere ich daran, dass ich am 10. mit dem Conte\n"), JSON.stringify(visible.slice(0, 200)));
  check("page breaks show as dividers", (await page.locator(".tv-page", { hasText: "Seite 1" }).count()) === 1);
  check("the selection survives the switch", JSON.stringify(await selection(page)) === JSON.stringify(before), JSON.stringify([before, await selection(page)]));
  check("the toolbar stays one row in the text view", (await page.locator(".pane-text .toolbar").first().boundingBox()).height < 50);
  await shot(page, "text-lines-light");

  // A pointer selection across paragraphs is ordinary reading: no menu, no
  // message. Asking for the menu explains it calmly in the words of the view.
  // A selection across a line break alone may be annotated, see below.
  const wordPoint = (word) =>
    page.locator(".cm-line", { hasText: word }).first().evaluate((el, w) => {
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
  await page.locator(".cm-line", { hasText: "Liebe Frau" }).first().scrollIntoViewIfNeeded();
  const [p1, p2] = [await wordPoint("Meingast"), await wordPoint("allem")];
  const statusBefore = await label(page, "#xml-status");
  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  check(
    "a pointer selection across paragraphs opens no menu and no message",
    (await page.isHidden("#actions")) && (await label(page, "#xml-status")) === statusBefore && (await page.getAttribute("#xml-status", "data-state")) !== "error",
    await label(page, "#xml-status"),
  );
  await page.keyboard.press("Control+.");
  await page.waitForTimeout(200);
  check(
    "asking for the menu there explains it calmly in the words of the text view",
    (await label(page, "#xml-status")).startsWith("Die Auswahl reicht über einen Absatz oder eine Auszeichnung hinaus.") && (await page.getAttribute("#xml-status", "data-state")) === "",
    await label(page, "#xml-status"),
  );
  check("the refused menu takes the next letter with its actions disabled", (await page.isVisible("#actions")) && (await page.locator("#actions [data-action='person']").isDisabled()));
  await page.keyboard.press("p");
  await page.keyboard.press("Escape");

  // Annotating a person in the text view writes the same markup as in XML.
  await doubleClickWord(page, "Herr Reichner", "Reichner");
  await page.keyboard.press("Control+.");
  await page.keyboard.press("Enter");
  await page.waitForSelector("#register-results .result", { timeout: 20000 });
  await page.locator("#register-results .result", { hasText: "SZDPER.2188" }).click();
  await page.click("#person-apply");
  await page.waitForTimeout(400);
  const person = 'Herr <persName ref="#SZDPER.2188">Reichner</persName>';
  const annotated = ORIGINAL.replace("Herr Reichner", person);
  check("a person annotated in the text view is the same markup", (await editorText(page)) === annotated);
  check("the person shows underlined in blue", (await page.locator(".tv-el-persName", { hasText: "Reichner" }).count()) === 1);

  // Undo and redo reach across the switch: one document, one history.
  await page.click("#view-xml");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  const undone = (await editorText(page)) === ORIGINAL;
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(300);
  check("undo across the switch takes back the text-view edit, redo restores it", undone && (await editorText(page)) === annotated);
  await page.click("#view-text");
  await page.waitForTimeout(300);

  // An edit that would cut hidden markup is refused and says why.
  await caretAt(page, person, 5);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(200);
  check(
    "deleting into hidden markup is refused with a reason",
    (await editorText(page)) === annotated &&
      (await label(page, "#xml-status")) === "Hier liegt eine Auszeichnung; zum Entfernen die Markierung öffnen." &&
      (await page.getAttribute("#xml-status", "data-state")) === "",
    await label(page, "#xml-status"),
  );
  // Typed markup characters become text, so the document stays well-formed.
  await caretAt(page, "Hotel Westminster", 5);
  await page.keyboard.type("<&");
  await page.waitForTimeout(400);
  check(
    "typed < and & become references and the document stays well-formed",
    (await editorText(page)).includes("Hotel&lt;&amp; Westminster") && (await shownText(page)).includes("Hotel<& Westminster") && (await label(page, "#wf-label")) === "Wohlgeformt",
  );
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);

  // Enter on a marked passage opens its card; Escape returns to the text.
  await caretAt(page, "Reichner</persName>", 3);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  check(
    "Enter on a mark opens its card with the identity",
    (await page.isVisible("#mark-card")) && (await label(page, "#mark-card-title")) === "Person" && (await label(page, "#mark-card-detail")).includes("SZDPER.2188") && (await page.evaluate(() => document.activeElement?.id === "mark-card-change")),
    await label(page, "#mark-card-detail"),
  );
  await shot(page, "text-card-light");
  await page.keyboard.press("Escape");
  check("Escape closes the card and returns to the text", !(await page.isVisible("#mark-card")) && (await page.evaluate(() => document.activeElement?.classList.contains("cm-content"))));
  await caretAt(page, "Reichner</persName>", 3);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.click("#mark-card-remove");
  await page.waitForTimeout(300);
  const removed = (await editorText(page)) === ORIGINAL;
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);
  check("Entfernen unwraps the passage in one undoable step", removed && (await editorText(page)) === annotated);

  // Enter elsewhere starts a new transcription line.
  await caretAt(page, "Ihr\n", 0);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check("Enter in the text starts a new line with <lb/>", (await editorText(page)).includes("Mit besten Grüssen \n        <lb/>Ihr"));
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(300);

  // F8 works in the text view and its action applies to the hidden source.
  await caretAt(page, person, person.length);
  await page.keyboard.press("F8");
  await page.waitForTimeout(300);
  const suggested = await page.evaluate(() => document.activeElement?.dataset.action);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const afterF8 = annotated.replace("{wenn ich ihm meine Bücher gebe}", "<add>wenn ich ihm meine Bücher gebe</add>");
  check("F8 in the text view selects the next spot and Enter applies its action", suggested === "add" && (await editorText(page)) === afterF8, suggested);
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  check("saving after annotating in the text view is byte-exact", (await lastWrite()) === afterF8);

  // Places: without an identifier as not yet linked, with one from the GND.
  await doubleClickWord(page, "Hotel Westminster", "Nizza");
  await page.waitForTimeout(200);
  await page.click("#actions [data-action='place']");
  await page.waitForTimeout(200);
  check("the place dialog previews a placeName without reference", (await label(page, "#place-preview")) === "<placeName>Nizza</placeName>" && (await page.isVisible("#place-unlinked")));
  await page.click("#place-apply");
  await page.waitForTimeout(300);
  check("a place without identifier is marked without @ref", (await editorText(page)).includes("<placeName>Nizza</placeName>, den"));
  await caretAt(page, "Nizza</placeName>", 2);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("its card says not yet linked", (await label(page, "#mark-card-title")) === "Ort" && (await label(page, "#mark-card-detail")) === "noch nicht verknüpft");
  await page.keyboard.press("Escape");
  await doubleClickWord(page, "Berlin N.W.21", "Berlin");
  await page.keyboard.press("Control+.");
  await page.keyboard.press("o");
  await page.waitForTimeout(200);
  await page.click("#place-search");
  await page.waitForSelector("#place-results .result", { timeout: 10000 });
  await page.locator("#place-results .result", { hasText: "4005728-8" }).click();
  check("a GND place fills the preview with its GeoNames link", (await label(page, "#place-preview")) === '<placeName ref="http://d-nb.info/gnd/4005728-8 http://www.geonames.org/2950159">Berlin</placeName>');
  await shot(page, "place-dialog-light");
  await page.click("#place-apply");
  await page.waitForTimeout(300);

  // An organisation from the SZD index is referenced by the GND of its entry.
  await selectText(page, "Viking Press", 0, "Viking Press".length);
  await page.keyboard.press("Control+.");
  await page.keyboard.press("g");
  await page.waitForSelector("#register-results .result", { timeout: 5000 });
  check(
    "the organisation dialog offers the index entry first",
    (await label(page, "#person-kind")) === "Organisation" && (await page.locator("#register-results .result").first().textContent()).includes("SZDORG.61"),
    await page.locator("#register-results .result").first().textContent(),
  );
  await page.locator("#register-results .result").first().click();
  check("its preview uses the GND of the entry", (await label(page, "#person-preview")) === '<orgName ref="http://d-nb.info/gnd/10102943-3">Viking Press</orgName>', await label(page, "#person-preview"));
  await page.click("#person-apply");
  await page.waitForTimeout(300);

  // A name broken across lines becomes one element holding the <lb/>, here
  // marked without a reference, which leaves it an open spot.
  const brokenFrom = ORIGINAL.indexOf("H~~amb~~[?]");
  await selectText(page, "H~~amb~~[?]", 0, ORIGINAL.indexOf("Goetzfried") + "Goetzfried".length - brokenFrom);
  await page.keyboard.press("Control+.");
  await page.keyboard.press("p");
  await page.waitForTimeout(300);
  check("a selection across a line break opens the person dialog with the plain name", (await label(page, "#person-text")) === "Hamb Goetzfried", await label(page, "#person-text"));
  await page.click("#person-unlinked");
  await page.waitForTimeout(300);
  check("the broken name is marked as one person without reference", (await page.locator(".tv-el-persName", { hasText: "Goetzfried" }).count()) >= 1);

  // A date with words around it is trimmed to the date and given an ISO value.
  await selectText(page, "Nizza</placeName>, den 4.Januar 1935.", "Nizza</placeName>, ".length, "den 4.Januar 1935.".length);
  await page.keyboard.press("Control+.");
  await page.keyboard.press("d");
  await page.waitForTimeout(300);
  check(
    "the date dialog proposes the ISO value and the trimmed date part",
    (await page.inputValue("#date-when")) === "1935-01-04" && (await page.isChecked("#date-trim")) && (await label(page, "#date-part")) === "4.Januar 1935" && (await label(page, "#date-preview")) === '<date when="1935-01-04">4.Januar 1935</date>',
    await label(page, "#date-preview"),
  );
  await shot(page, "date-dialog-light");
  await page.fill("#date-when", "1935-13");
  await page.click("#date-apply");
  check("an invalid date is not written", (await page.isVisible("#date-dialog")) && (await label(page, "#date-status")).includes("kein Datum"));
  await page.fill("#date-when", "1935-01-04");
  await page.click("#date-apply");
  await page.waitForTimeout(300);
  // An incomplete date is completed from the letter's date and marked inferred.
  await selectText(page, "am 10. mit", 3, 3);
  await page.keyboard.press("Control+.");
  await page.keyboard.press("d");
  await page.waitForTimeout(300);
  check(
    "„10.“ is proposed from the letter date as inferred",
    (await page.inputValue("#date-when")) === "1935-01-10" && (await page.isChecked("#date-cert")) && (await label(page, "#date-preview")) === '<date when="1935-01-10" cert="low">10.</date>',
    await label(page, "#date-preview"),
  );
  await page.click("#date-apply");
  await page.waitForTimeout(300);
  const placesAndDate = afterF8
    .replace("Westminster                                Nizza, den 4.Januar 1935.", 'Westminster                                <placeName>Nizza</placeName>, den <date when="1935-01-04">4.Januar 1935</date>.')
    .replace("Berlin N.W.21", '<placeName ref="http://d-nb.info/gnd/4005728-8 http://www.geonames.org/2950159">Berlin</placeName> N.W.21')
    .replace("die Viking Press,", 'die <orgName ref="http://d-nb.info/gnd/10102943-3">Viking Press</orgName>,')
    .replace("am 10. mit", 'am <date when="1935-01-10" cert="low">10.</date> mit')
    .replace("H~~amb~~[?]\n        <lb/>Goetzfried", "<persName>H~~amb~~[?]\n        <lb/>Goetzfried</persName>");
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  check("places, the organisation and the date are saved as exactly these elements", (await lastWrite()) === placesAndDate);
  check("the places and the date are valid against TEI All", (await validate(page)) === "TEI-konform", await label(page, "#xml-status"));

  // The layout follows the document, and a choice is remembered for its kind.
  await openFile("nolb");
  check("a document without <lb/> opens in flowing text", (await pressed(page, "view-text")) && (await pressed(page, "layout-flow")));
  await shot(page, "text-flow-light");
  await page.click("#layout-lines");
  await openFile("a");
  check("a letter with <lb/> still opens in lines", await pressed(page, "layout-lines"));
  await page.click("#layout-flow");
  await openFile("a");
  check("the chosen layout is remembered for documents with <lb/>", await pressed(page, "layout-flow"));
  await page.click("#layout-lines");

  // CRLF: an action in the text view inserts no bare LF and saves byte-exact.
  await openFile("crlf");
  await caretAt(page, "Herr Reichner", 0);
  await page.keyboard.press("F8");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+s");
  await page.waitForTimeout(400);
  const crlfSaved = await lastWrite();
  check(
    "a CRLF letter annotated in the text view keeps CRLF",
    crlfSaved === files.crlf.text.replace("{wenn ich ihm meine Bücher gebe}", "<add>wenn ich ihm meine Bücher gebe</add>") && bareLf(crlfSaved) === 0,
  );

  // A malformed document cannot enter the text view and says why.
  await openFile("broken");
  check("a malformed document opens in XML", await pressed(page, "view-xml"));
  // aria-disabled keeps the button reachable, so clicking it explains the refusal.
  await page.click("#view-text", { force: true });
  await page.waitForTimeout(200);
  check(
    "it refuses the text view with the reason",
    (await pressed(page, "view-xml")) && (await label(page, "#xml-status")).startsWith("Die Textansicht braucht ein wohlgeformtes Dokument.") && (await page.getAttribute("#view-text", "aria-disabled")) === "true",
    await label(page, "#xml-status"),
  );
  // The choice of the text view is remembered for the next visit.
  await openFile("a");
  await page.click("#view-text");
  const again = await page.context().newPage();
  await again.goto(BASE_URL);
  await again.waitForFunction(() => document.getElementById("page-label").textContent.includes("von"), null, { timeout: 30000 });
  await again.waitForTimeout(500);
  check("the text view is remembered per browser", (await again.getAttribute("#view-text", "aria-pressed")) === "true");
  await again.emulateMedia({ colorScheme: "dark" });
  await again.waitForTimeout(300);
  await shot(again, "text-lines-dark");
  await again.setViewportSize({ width: 900, height: 800 });
  await again.waitForTimeout(400);
  check("the text toolbar stays one row at 900 px", (await again.locator(".pane-text .toolbar").first().boundingBox()).height < 50);
  await shot(again, "text-lines-dark-900");
  await again.close();
  check("no console errors (text view run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Action registry run: the settings view, switching an action off and on,
// saving the registry in place byte-stable, and refusing an action whose
// element the schema does not know.
{
  const { page, errors } = await open({ colorScheme: "light" }, (registry) => {
    window.__registry = [];
    const file = {
      name: "actions.json",
      getFile: async () => new File([window.__registry.at(-1) ?? registry], "actions.json"),
      createWritable: async () => ({ write: async (t) => window.__registry.push(t), close: async () => {} }),
    };
    const data = { name: "data", getFileHandle: async (n) => (n === "actions.json" ? file : Promise.reject(new Error("missing"))) };
    const root = { name: "szd-teiCrafter", getDirectoryHandle: async (n) => (n === "data" ? data : Promise.reject(new Error("missing"))) };
    window.showDirectoryPicker = async () => root;
  }, ACTIONS_TEXT);
  check("the menu offers every action of the registry", (await page.locator("#actions-items button").count()) === ACTIONS.length);
  await page.click("#actions-button");
  check("the settings list every action", (await page.locator(".action-row").count()) === ACTIONS.length);
  await shot(page, "actions-settings-light");
  await page.click("#actions-folder");
  await page.waitForTimeout(200);
  await page.locator(".action-row", { has: page.locator("input[aria-label='Bezeichnung von del']") }).locator("input[type='checkbox']").uncheck();
  check("switching an action off removes it from the menu", (await page.locator("#actions-items [data-action='del']").count()) === 0);
  await page.click("#actions-save");
  await page.waitForTimeout(300);
  const written = await page.evaluate(() => window.__registry.at(-1) ?? "");
  const diffLines = written.split("\n").filter((l, i) => l !== ACTIONS_TEXT.split("\n")[i]);
  check("the saved registry differs only in that switch", JSON.stringify(diffLines) === JSON.stringify(['      "enabled": false']), JSON.stringify(diffLines));
  await page.click("#actions-dialog button[type='submit']");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+Home");
  for (let i = 0; i < 4 && !(await label(page, "#actions-quote")).startsWith("„~~"); i++) {
    await page.keyboard.press("F8");
    await page.waitForTimeout(200);
  }
  check("a marker of a switched-off action names the switch", (await label(page, "#actions-note")).includes("unter „Aktionen“ ausgeschaltet"), await label(page, "#actions-note"));
  await page.keyboard.press("Escape");
  await page.click("#actions-button");
  await page.locator(".action-row", { has: page.locator("input[aria-label='Bezeichnung von del']") }).locator("input[type='checkbox']").check();
  await page.click("#actions-save");
  await page.waitForTimeout(300);
  check("switched on again, the registry is saved byte-identical", (await page.evaluate(() => window.__registry.at(-1))) === ACTIONS_TEXT);
  await page.click("#actions-dialog button[type='submit']");
  check("no console errors (registry run)", errors.length === 0, errors.slice(0, 3).join(" | "));

  // An action whose element the schema does not know is refused at load.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const extra = JSON.parse(ACTIONS_TEXT);
  extra.actions.push({ ...extra.actions[3], id: "foo", key: "f", label: "Unbekannt", element: "foobar" });
  await ctx.route("**/data/actions.json", (route) => route.fulfill({ body: JSON.stringify(extra), contentType: "application/json" }));
  const other = await ctx.newPage();
  await other.goto(BASE_URL);
  await other.waitForTimeout(2500);
  await other.click("#actions-button");
  check(
    "an action with an unknown element is refused at load with the reason",
    (await other.locator(".action-refused", { hasText: "Das Schema kennt kein Element <foobar>." }).count()) === 1 && (await other.locator("#actions-items [data-action='foo']").count()) === 0,
  );
  await ctx.close();
}

// Documents dialog: counts per collection, state icons with names, the
// collection setup explained in place, the search selected on reopening.
{
  const { page, errors } = await open({ colorScheme: "light" });
  await page.click("#docs-button");
  const heading = await label(page, "#docs-list h3 .docs-progress");
  const first = INDEX.collections[0].documents;
  check(
    "each collection names its documents, accepted and open ones",
    heading === `${first.length} Dokumente | ${first.filter((d) => d.status === "approved").length} abgenommen | ${first.filter((d) => d.open > 0).length} mit offenen Stellen`,
    heading,
  );
  const openDoc = ALL_DOCS.find((d) => d.open > 0);
  check(
    "a document with open spots shows them as a named icon",
    (await page.locator(".doc-item", { hasText: openDoc.objectId }).locator(`svg[aria-label='${openDoc.open === 1 ? "1 offene Stelle" : `${openDoc.open} offene Stellen`}']`).count()) === 1,
  );
  check("the add chip defines a collection", (await page.getAttribute("#docs-add", "data-tip")).startsWith("Collection: "));
  await page.click("#docs-add");
  check("it explains how a collection is set up", (await page.isVisible("#docs-setup")) && (await label(page, "#docs-setup")).includes("node tools/build-document-index.mjs"));
  await shot(page, "docs-dialog-light");
  await page.fill("#docs-query", "Brief");
  await page.keyboard.press("Escape");
  check("Escape closes the list", !(await page.isVisible("#docs-dialog")));
  await page.click("#docs-button");
  check(
    "reopening selects the last search",
    await page.evaluate(() => {
      const q = document.getElementById("docs-query");
      return document.activeElement === q && q.selectionStart === 0 && q.selectionEnd === q.value.length && q.value === "Brief";
    }),
  );
  await page.keyboard.press("Escape");
  check("the badge and counter explain their terms", (await page.getAttribute("#doc-state", "data-tip")).startsWith("Arbeitsstand: ") && (await page.getAttribute("#work-button", "data-tip")).startsWith("Offene Stelle: "));
  check("no console errors (documents dialog run)", errors.length === 0, errors.slice(0, 3).join(" | "));
}

// Run 8: every document of the working set loads from the list, well-formed
// and without console errors. Load time runs from the click to the first frame
// after the checked text is shown; typing time covers ten keystrokes.
const timings = [];
{
  const { page, errors } = await open({ colorScheme: "light" });
  const frame = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  const problems = [];
  // The open document cannot be chosen again, so the default comes last.
  for (const d of [...ALL_DOCS.slice(1), ALL_DOCS[0]]) {
    const before = errors.length;
    const file = d.path.split("/").pop();
    const started = Date.now();
    await chooseDocument(page, d.objectId);
    await page.waitForFunction((meta) => document.getElementById("doc-meta").textContent.startsWith(meta), `${file} |`, { timeout: 30000 });
    await frame();
    const load = Date.now() - started;
    const typed = Date.now();
    await page.keyboard.type("abcdefghij");
    await frame();
    const typing = Date.now() - typed;
    for (let i = 0; i < 5 && (await label(page, "#save-state")); i++) await page.keyboard.press("Control+z");
    await page.waitForTimeout(350);
    const wf = await label(page, "#wf-label");
    const title = (await label(page, "#doc-title")).replace(/\s+/g, " ");
    timings.push({ id: d.objectId, kb: Math.round(Buffer.byteLength(readFileSync(new URL(`../${d.path}`, import.meta.url))) / 1024), load, typing });
    if (wf !== "Wohlgeformt" || errors.length > before || (await label(page, "#save-state")) || title !== d.title) {
      problems.push(`${d.objectId}: ${wf}, ${errors.slice(before).join(" ") || "no errors"}, title "${title}"`);
    }
  }
  check(`all ${ALL_DOCS.length} documents load well-formed without console errors`, problems.length === 0, problems.slice(0, 4).join(" | "));
  const slow = timings.filter((t) => t.load > 3000);
  check("no document takes more than 3 s to load", slow.length === 0, slow.map((t) => `${t.id} ${t.load} ms`).join(", "));
}

console.log(results.join("\n"));
results.printed = true;
await browser.close();
const largest = [...timings].sort((a, b) => b.kb - a.kb).slice(0, 5);
console.log(`\nLoad and typing times, largest documents: ${largest.map((t) => `${t.id} ${t.kb} KB ${t.load}/${t.typing} ms`).join(", ")}`);
console.log(`Slowest load: ${timings.reduce((a, b) => (b.load > a.load ? b : a), { load: 0 }).id ?? "-"}, median ${[...timings].sort((a, b) => a.load - b.load)[Math.floor(timings.length / 2)]?.load} ms`);
process.exitCode = results.some((r) => r.startsWith("FAIL")) ? 1 : 0;
