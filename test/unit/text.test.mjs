// Line endings, conflict markers and the small validators, each without a browser.

import assert from "node:assert/strict";
import { test } from "node:test";
import { conflictMarkers, hunks, jumpLine, lineDiff } from "../../js/diff.js";
import { lineEndings, sameLineBreaks } from "../../js/editor.js";
import { isGndId } from "../../js/gnd.js";
import { labelText } from "../../js/iiif.js";
import { documentPath } from "../../tools/build-document-index.mjs";
import { EditorState, history, historyKeymap } from "../../vendor/codemirror/codemirror.js";

test("the separator is the majority line ending, and mixing is reported", () => {
  assert.deepEqual(lineEndings("a\r\nb\nc\r\nd"), { separator: "\r\n", crlf: 2, lf: 1, cr: 0, mixed: true });
  assert.deepEqual(lineEndings("a\nb\r\nc\nd"), { separator: "\n", crlf: 1, lf: 2, cr: 0, mixed: true });
  assert.equal(lineEndings("a\nb\n").mixed, false);
});

/** A state as the editor builds it, with the given separator. @param {string} doc @param {string} separator */
const stateWith = (doc, separator) => EditorState.create({ doc, extensions: [EditorState.lineSeparator.of(separator), sameLineBreaks, history()] });
const bareLf = (/** @type {string} */ t) => (t.match(/(^|[^\r])\n/g) ?? []).length;

test("inserted LF breaks become CRLF in a CRLF document", () => {
  let state = stateWith("a\r\nb", "\r\n");
  state = state.update({ changes: { from: 1, insert: "\nx\ny\n" } }).state;
  assert.equal(state.sliceDoc(), "a\r\nx\r\ny\r\n\r\nb");
  assert.equal(bareLf(state.sliceDoc()), 0);
  state = state.update(state.replaceSelection("p\rq")).state;
  assert.ok(!/\r(?!\n)/.test(state.sliceDoc()), JSON.stringify(state.sliceDoc()));
});

test("inserted CRLF breaks become LF in an LF document", () => {
  const state = stateWith("a\nb", "\n").update({ changes: { from: 1, insert: "\r\nx\r\n" } }).state;
  assert.equal(state.sliceDoc(), "a\nx\n\nb");
});

test("undo restores a mixed file's own line ends unchanged", () => {
  const mixed = "a\r\nb\nc\r\nd";
  let state = stateWith(mixed, "\r\n");
  state = state.update({ changes: { from: 0, to: state.doc.length, insert: "" }, userEvent: "delete" }).state;
  const undo = historyKeymap.find((k) => k.key === "Mod-z")?.run;
  undo?.(/** @type {any} */ ({ state, dispatch: (/** @type {any} */ tr) => (state = tr.state) }));
  assert.equal(state.sliceDoc(), mixed);
});

test("a separator line counts only inside an open conflict", () => {
  assert.deepEqual(conflictMarkers("Titel\n=======\nText\n"), []);
  assert.deepEqual(conflictMarkers("<<<<<<< HEAD\na\n=======\nb\n>>>>>>> origin/main\n=======\n").map((c) => `${c.line}${c.kind}`), ["1start", "3middle", "5end"]);
  assert.deepEqual(conflictMarkers("a\n>>>>>>> origin/main\n").map((c) => c.kind), ["end"]);
  assert.deepEqual(conflictMarkers("<<<<<<<< acht\n>>>>>>>x\n"), []);
});

test("GND ids need digits", () => {
  for (const id of ["116402873", "1057079499", "4062901-6", "118540238X", "1234567"]) assert.ok(isGndId(id), id);
  for (const id of ["------", "XXXXXX", "1-2-3-4", "12345"]) assert.ok(!isGndId(id), id);
});

test("a self-nesting manifest label ends instead of overflowing the stack", () => {
  const label = /** @type {any} */ ({});
  label.de = [label];
  assert.equal(labelText(label), "");
  assert.equal(labelText({ de: ["Seite 1"] }), "Seite 1");
});

test("the document index accepts only TEI files under data/", () => {
  assert.equal(documentPath({ objectId: "o_szd.1", collection: "werke" }), "data/werke/o_szd.1.tei.xml");
  assert.throws(() => documentPath({ objectId: "o_szd.1", collection: "werke", target: "data/../x.tei.xml" }));
  assert.throws(() => documentPath({ objectId: "o_szd.1", collection: "werke", target: "js/app.js" }));
  assert.throws(() => documentPath({ objectId: "../o", collection: "werke" }));
});

test("the comparison jumps to the changed line of the current text", () => {
  const before = "a\nb\nc\nd\ne\nf";
  const [changed] = hunks(lineDiff(before, "a\nb\nc\nd\nE\nf"));
  assert.equal(jumpLine(changed), 5);
  const [removed] = hunks(lineDiff(before, "a\nb\nc\nd\nf"));
  assert.equal(jumpLine(removed), 5, "a removed line points to the line now in its place");
  const [added] = hunks(lineDiff(before, "a\nb\nX\nc\nd\ne\nf"));
  assert.equal(jumpLine(added), 3);
  const [atEnd] = hunks(lineDiff(before, "a\nb\nc\nd\ne"));
  assert.equal(jumpLine(atEnd), 6);
});
