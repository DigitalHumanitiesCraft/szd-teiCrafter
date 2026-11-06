// Proposals of an outside producer: reading a proposal file against the
// example letter, the refusals at that trust boundary, the declarations an
// acceptance adds, and how an edit withdraws a proposal.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { EditorState } from "../../docs/vendor/codemirror/codemirror.js";
import { loadActions } from "../../docs/js/actions.js";
import { declarationEdits, dropProposal, proposalField, readProposals, setProposals } from "../../docs/js/proposals.js";
import { source } from "../../docs/js/source.js";

const LETTER = readFileSync(new URL("../../docs/data/o_szd.1222.tei.xml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const actions = loadActions(JSON.parse(readFileSync(new URL("../../docs/data/actions.json", import.meta.url), "utf8")));
const read = (/** @type {any[]} */ proposals, document = "o_szd.1222") => readProposals({ document, proposals }, LETTER, { documentId: "o_szd.1222", actions });

test("proposals are placed at their offsets, by context or by occurrence", () => {
  const at = LETTER.indexOf("Reichner");
  const { placed, stale } = read([
    { id: "a", text: "Reichner", offset: { from: at, to: at + 8 }, element: "persName", attributes: { ref: "#SZDPER.2188" } },
    { id: "b", text: "New York", context: { before: "Press, ", after: ", 18" }, element: "placeName", attributes: {} },
    { id: "c", text: "Fuchs", offset: { from: 5, to: 10 }, element: "persName" },
    { id: "d", text: "nirgends im Brief", element: "persName" },
  ]);
  assert.deepEqual(placed.map((p) => `${p.id}:${LETTER.slice(p.from, p.to)}`).sort(), ["a:Reichner", "b:New York", "c:Fuchs"]);
  assert.ok(placed.every((p, i) => i === 0 || placed[i - 1].from < p.from), "in document order");
  assert.equal(LETTER.slice(placed.find((p) => p.id === "b").from - 7, placed.find((p) => p.id === "b").from), "Press, ");
  assert.deepEqual(stale.map((s) => s.id), ["d"]);
});

test("a name across a line break is placed, a passage across other markup is not", () => {
  const broken = LETTER.slice(LETTER.indexOf("H~~amb~~"), LETTER.indexOf("Goetzfried") + "Goetzfried".length);
  const { placed, stale } = read([
    { id: "lb", text: broken, element: "persName" },
    { id: "p", text: "Meingast!\n      </p>", element: "persName" },
    { id: "header", text: "Anna Meingast", element: "persName" },
  ]);
  assert.deepEqual(placed.map((p) => p.id), ["lb"]);
  assert.deepEqual(stale.map((s) => s.id).sort(), ["header", "p"]);
});

test("a proposal file may not claim a review, and must belong to the document", () => {
  const { placed, refused } = read([
    { id: "1", text: "Fuchs", element: "persName", status: "accepted" },
    { id: "2", text: "Fuchs", element: "persName", attributes: { resp: "#resp-editor-review" } },
    { id: "3", text: "Fuchs", element: "persName", reviewer: "x" },
    { id: "4", text: "Fuchs", element: "script" },
    { id: "5", text: "Fuchs", element: "persName", attributes: { onclick: "x" } },
    { id: "6", text: "Fuchs", element: "persName", status: "proposed-open" },
  ]);
  assert.deepEqual(refused.map((r) => r.id), ["1", "2", "3", "4", "5"]);
  assert.deepEqual(placed.map((p) => p.id), ["6"]);
  assert.throws(() => read([], "o_szd.1750"), /gehören zu o_szd.1750/);
  assert.throws(() => readProposals({}, LETTER, { documentId: "", actions }), /keine Vorschlagsdatei/);
});

test("accepting declares the roles once, on lines of their own in titleStmt", () => {
  const { producer, reviewer } = source.review;
  const edits = declarationEdits(LETTER, [producer, reviewer]);
  assert.equal(edits.length, 1);
  const after = LETTER.slice(0, edits[0].from) + edits[0].insert + LETTER.slice(edits[0].to);
  assert.match(after, /<\/title>\n        <respStmt xml:id="resp-agent-annotation">.*<\/respStmt>\n        <respStmt xml:id="resp-editor-review">.*<\/respStmt>\n      <\/titleStmt>/);
  assert.deepEqual(declarationEdits(after, [producer, reviewer]), []);
});

test("an edit inside a proposal withdraws it, an edit elsewhere moves it", () => {
  const at = LETTER.indexOf("Reichner");
  let state = EditorState.create({ doc: LETTER, extensions: [proposalField] });
  const p = { id: "a", from: at, to: at + 8, element: "persName", attributes: {}, text: "Reichner", basis: [], doubt: "" };
  const q = { ...p, id: "b", from: LETTER.indexOf("Fuchs"), to: LETTER.indexOf("Fuchs") + 5, text: "Fuchs" };
  state = state.update({ effects: setProposals.of([p, q]) }).state;
  state = state.update({ changes: { from: 0, insert: "<!-- -->" } }).state;
  assert.deepEqual(state.field(proposalField).map((x) => state.doc.sliceString(x.from, x.to)), ["Reichner", "Fuchs"]);
  const now = state.field(proposalField)[0];
  state = state.update({ changes: { from: now.from + 2, to: now.from + 3, insert: "X" } }).state;
  assert.deepEqual(state.field(proposalField).map((x) => x.id), ["b"]);
  state = state.update({ effects: dropProposal.of("b") }).state;
  assert.deepEqual(state.field(proposalField), []);
});
