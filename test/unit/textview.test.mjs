// The text view on a CodeMirror state without a page: what it hides, what
// it keeps as line breaks, and which edits its guard lets through.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadActions } from "../../js/actions.js";
import { sameLineBreaks } from "../../js/editor.js";
import { openWorkFor, source } from "../../js/source.js";
import { openSpots } from "../../js/state.js";
import { hasLineBreaks, plainText, REFUSED, textView } from "../../js/textview.js";
import { EditorState, history } from "../../vendor/codemirror/codemirror.js";

const LETTER = readFileSync(new URL("../../data/o_szd.1222.tei.xml", import.meta.url), "utf8");
const openWork = openWorkFor(loadActions(JSON.parse(readFileSync(new URL("../../data/actions.json", import.meta.url), "utf8"))));
const refusals = [];
const hooks = { openWork: (/** @type {string} */ t) => openSpots(t, openWork), onRefuse: (/** @type {string} */ m) => refusals.push(m), onPage: () => {}, onMarkKey: () => {} };

/** A state as the editor builds it in the text view. @param {string} doc @param {"lines" | "flow"} layout */
function stateWith(doc, layout = "lines", separator = "\n") {
  const tv = textView(source.textView, hooks, layout);
  return { tv, state: EditorState.create({ doc, extensions: [EditorState.lineSeparator.of(separator), sameLineBreaks, history(), tv.extension] }) };
}

/** The text a reader sees: visible characters, with kept source breaks as line ends. */
function shown(/** @type {EditorState} */ state, /** @type {ReturnType<typeof textView>} */ tv) {
  const built = /** @type {any} */ (tv.info(state));
  let out = "";
  let at = 0;
  for (const h of built.hidden) {
    out += state.doc.sliceString(at, h.from);
    at = h.to;
  }
  return out + state.doc.sliceString(at);
}

test("the layout defaults to lines where the shown text has <lb/>", () => {
  assert.ok(hasLineBreaks(LETTER, source.textView));
  assert.ok(!hasLineBreaks(LETTER.replace(/<lb\/>/g, ""), source.textView));
});

test("lines layout shows one transcription line per line, without header or tags", () => {
  const { state, tv } = stateWith(LETTER, "lines");
  const lines = shown(state, tv).split("\n");
  assert.ok(!shown(state, tv).includes("<"), "no markup is visible");
  assert.ok(!shown(state, tv).includes("Machine-generated"), "the header is hidden");
  assert.ok(lines.includes("Vor allem erinnere ich daran, dass ich am 10. mit dem Conte"), lines.slice(0, 8).join(" / "));
  assert.ok(lines.includes("di Savoia nach New York fahre. Drüben ist meine Adresse selbst-"));
});

test("flowing layout joins the lines of a paragraph", () => {
  const { state, tv } = stateWith(LETTER, "flow");
  const text = shown(state, tv);
  assert.ok(text.includes("Vor allem erinnere ich daran, dass ich am 10. mit dem Conte"), "first line of the paragraph");
  assert.ok(!text.split("\n").includes("di Savoia nach New York fahre. Drüben ist meine Adresse selbst-"), "the second line no longer stands alone");
});

test("typing escapes markup characters and stays byte-exact otherwise", () => {
  const { state } = stateWith(LETTER);
  const at = LETTER.indexOf("Hotel Westminster");
  const next = state.update({ changes: { from: at, insert: "a<b & c" }, userEvent: "input.type" }).state;
  assert.equal(next.sliceDoc(), `${LETTER.slice(0, at)}a&lt;b &amp; c${LETTER.slice(at)}`);
});

test("deleting across hidden markup that would cut an element is refused", () => {
  refusals.length = 0;
  const doc = LETTER.replace("Herr Reichner", 'Herr <persName ref="x">Reichner</persName>');
  const { state } = stateWith(doc);
  const from = doc.indexOf("Herr <persName");
  const to = doc.indexOf("Reich</") >= 0 ? 0 : doc.indexOf("Reichner") + 3;
  const after = state.update({ changes: { from, to }, userEvent: "delete.selection" }).state;
  assert.equal(after.sliceDoc(), doc, "nothing deleted");
  return new Promise((resolve) =>
    queueMicrotask(() => {
      assert.deepEqual(refusals, [REFUSED]);
      resolve(undefined);
    }),
  );
});

test("deleting a whole element and an <lb/> with its line passes", () => {
  const doc = LETTER.replace("Herr Reichner", 'Herr <persName ref="x">Reichner</persName>');
  const { state } = stateWith(doc);
  const from = doc.indexOf("<persName");
  const to = doc.indexOf("</persName>") + "</persName>".length;
  assert.equal(state.update({ changes: { from, to }, userEvent: "delete.selection" }).state.sliceDoc(), doc.slice(0, from) + doc.slice(to));
  const lb = doc.indexOf("<lb/>di Savoia");
  const lineStart = doc.lastIndexOf("\n", lb) + 1;
  const joined = state.update({ changes: { from: lineStart, to: lb + 5 }, userEvent: "delete.backward" }).state.sliceDoc();
  assert.equal(joined, doc.slice(0, lineStart) + doc.slice(lb + 5));
});

test("edits outside the shown text are refused, programmatic ones pass", () => {
  const { state } = stateWith(LETTER);
  const title = LETTER.indexOf("Brief an");
  assert.equal(state.update({ changes: { from: title, insert: "x" }, userEvent: "input.type" }).state.sliceDoc(), LETTER);
  assert.notEqual(state.update({ changes: { from: title, insert: "x" } }).state.sliceDoc(), LETTER);
});

test("Enter writes a line break element in the document's line ending", () => {
  const crlf = LETTER.replace(/\n/g, "\r\n");
  const { state } = stateWith(crlf, "lines", "\r\n");
  const at = LETTER.indexOf("Westminster") + "Westminster".length;
  const tr = state.update({ changes: { from: at, insert: `${state.lineBreak}        <lb/>` }, userEvent: "input.linebreak" });
  const out = tr.state.sliceDoc();
  assert.ok(out.includes("Hotel Westminster\r\n        <lb/> "), "the break and the element follow the word");
  assert.equal((out.match(/(^|[^\r])\n/g) ?? []).length, 0, "no bare LF");
});

test("copying from the text view gives plain text", () => {
  assert.equal(plainText('<lb/>Herr <persName ref="x">Reichner</persName> &amp; Co.\n        <lb/>weiter'), "Herr Reichner & Co.\nweiter");
});
