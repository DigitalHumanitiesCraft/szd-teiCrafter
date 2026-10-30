// Pure working-state functions: acceptance edits on the header variants that
// occur or could occur, and the open-work detectors of the source configuration.

import assert from "node:assert/strict";
import { test } from "node:test";
import { source } from "../../js/source.js";
import { acceptanceEdits, openSpots } from "../../js/state.js";

const CHANGE = { date: "2026-10-30", note: "ok" };
const APPROVING = '<change when="2026-10-30" status="approved">ok</change>';

/** Applies the edits in the given order, as the editor does. @param {string} text */
function accept(text) {
  let out = text;
  for (const e of acceptanceEdits(text, CHANGE)) out = `${out.slice(0, e.from)}${e.insert}${out.slice(e.to)}`;
  return out;
}
const header = (/** @type {string} */ inner) => `<TEI>\n  <teiHeader>\n${inner}  </teiHeader>\n  <text/>\n</TEI>`;

test("acceptance fills an empty revisionDesc", () => {
  assert.equal(
    accept(header('    <revisionDesc status="draft"/>\n')),
    header(`    <revisionDesc status="approved">\n      ${APPROVING}\n    </revisionDesc>\n`),
  );
});

test("acceptance adds the change inside an existing listChange", () => {
  const before = header('    <revisionDesc status="draft">\n      <listChange>\n        <change when="2026-10-01">Import</change>\n      </listChange>\n    </revisionDesc>\n');
  const after = header(`    <revisionDesc status="approved">\n      <listChange>\n        <change when="2026-10-01">Import</change>\n        ${APPROVING}\n      </listChange>\n    </revisionDesc>\n`);
  assert.equal(accept(before), after);
});

test("acceptance adds a revisionDesc when there is none", () => {
  assert.equal(
    accept(header("    <fileDesc/>\n")),
    header(`    <fileDesc/>\n    <revisionDesc status="approved">\n      ${APPROVING}\n    </revisionDesc>\n`),
  );
});

test("acceptance replaces a single-quoted status instead of adding a second one", () => {
  const out = accept(header("    <revisionDesc status='draft'>\n      <change when=\"2026-10-01\">Import</change>\n    </revisionDesc>\n"));
  assert.match(out, /<revisionDesc status="approved">/);
  assert.equal(out.match(/status=/g)?.length, 2, out);
});

test("acceptance keeps a > inside an attribute value within the tag", () => {
  const out = accept(header('    <revisionDesc n="a>b" status="draft">\n      <change when="2026-10-01">Import</change>\n    </revisionDesc>\n'));
  assert.ok(out.includes('<revisionDesc n="a>b" status="approved">'), out);
  assert.ok(out.includes(`      ${APPROVING}\n    </revisionDesc>`), out);
});

test("acceptance ignores a commented-out revisionDesc", () => {
  const before = header('    <!-- <revisionDesc status="draft"><change>alt</change></revisionDesc> -->\n    <revisionDesc status="draft">\n      <change when="2026-10-01">Import</change>\n    </revisionDesc>\n');
  const out = accept(before);
  assert.ok(out.startsWith(header("").slice(0, 20)) && out.includes('<!-- <revisionDesc status="draft"><change>alt</change></revisionDesc> -->'), out);
  assert.ok(out.includes(`<revisionDesc status="approved">\n      <change when="2026-10-01">Import</change>\n      ${APPROVING}\n    </revisionDesc>`), out);
});

test("acceptance with only a commented-out revisionDesc adds a real one", () => {
  const out = accept(header('    <!-- <revisionDesc status="draft"/> -->\n'));
  assert.ok(out.includes('<!-- <revisionDesc status="draft"/> -->'), out);
  assert.ok(out.includes(`    <revisionDesc status="approved">\n      ${APPROVING}\n    </revisionDesc>\n  </teiHeader>`), out);
});

test("acceptance without a header changes nothing", () => {
  assert.deepEqual(acceptanceEdits("<TEI><text/></TEI>", CHANGE), []);
});

const kinds = (/** @type {string} */ text) => openSpots(text, source.openWork).map((s) => `${s.key}:${text.slice(s.from, s.to)}`);
const doc = (/** @type {string} */ body) => `<TEI><teiHeader><title>Briefregister [I] [?]</title></teiHeader><text><body><p>${body}</p></body></text></TEI>`;

test("open work finds the wrap markers as before", () => {
  assert.deepEqual(kinds(doc("ein ~~Wort~~ und Name[?] und {Zusatz}")), ["del:~~Wort~~", "unclear:Name[?]", "add:{Zusatz}"]);
});

test("open work finds a standalone [?] and [?3?], but not one attached to a word twice", () => {
  assert.deepEqual(kinds(doc("<lb/>[?] Kopf [?3?] art[?]")), ["unsure:[?]", "unsure:[?3?]", "unclear:art[?]"]);
});

test("open work finds gaps with and without a length", () => {
  assert.deepEqual(kinds(doc("vor [...] und [...5...] nach")), ["gap:[...]", "gap:[...5...]"]);
});

test("open work finds bracketed HTR remarks", () => {
  assert.deepEqual(kinds(doc("<lb/>[Randnotiz links:] Text <lb/>Stefan Zweig [Unterschrift unleserlich]")), [
    "remark:[Randnotiz links:]",
    "remark:[Unterschrift unleserlich]",
  ]);
});

test("open work leaves supplied letters, numbers, the header and comments alone", () => {
  assert.deepEqual(kinds(doc("G[ro]d Hotel [3500] [I] <!-- [Randnotiz links:] [?] -->")), []);
});
