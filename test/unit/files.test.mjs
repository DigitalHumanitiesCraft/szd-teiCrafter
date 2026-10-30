// Reading and writing bytes: only UTF-8 opens, and a byte order mark survives
// the round trip byte for byte.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeXml, encodeXml } from "../../js/files.js";

const utf8 = (/** @type {string} */ s) => new TextEncoder().encode(s);
const XML = '<?xml version="1.0" encoding="UTF-8"?>\r\n<TEI>Grüße, Zweig</TEI>\n';

test("a file with a UTF-8 byte order mark is saved with it, byte-exact", () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...utf8(XML)]);
  const { text, bom } = decodeXml(bytes.buffer, "a.xml");
  assert.equal(bom, true);
  assert.equal(text, XML);
  assert.deepEqual(utf8(encodeXml(text, bom)), bytes);
});

test("a file without a byte order mark gains none", () => {
  const bytes = utf8(XML);
  const { text, bom } = decodeXml(bytes, "a.xml");
  assert.equal(bom, false);
  assert.deepEqual(utf8(encodeXml(text, bom)), bytes);
});

test("bytes that are not UTF-8 are refused, not replaced", () => {
  // "Grüße" in Windows-1252
  const latin = new Uint8Array([...utf8("<TEI>Gr"), 0xfc, 0xdf, ...utf8("e</TEI>")]);
  assert.throws(() => decodeXml(latin, "a.xml"), /kein gültiges UTF-8/);
});

test("an XML declaration naming another encoding is refused", () => {
  assert.throws(() => decodeXml(utf8('<?xml version="1.0" encoding="ISO-8859-1"?><TEI/>'), "a.xml"), /erklärt die Kodierung ISO-8859-1/);
  assert.equal(decodeXml(utf8("<?xml version='1.0' encoding='utf-8'?><TEI/>"), "a.xml").bom, false);
});

test("UTF-16 is refused", () => {
  assert.throws(() => decodeXml(new Uint8Array([0xff, 0xfe, 0x3c, 0x00]), "a.xml"), /UTF-16/);
});
