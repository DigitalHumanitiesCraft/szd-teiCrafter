// Reading and writing bytes: only UTF-8 opens, and a byte order mark survives
// the round trip byte for byte.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeXml, encodeXml, guardedWrite } from "../../js/files.js";

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

/** A file handle whose state is a version number; `onCreate` may change it while the stream opens. */
function disk({ version = 1, failWrite = false, onCreate = () => {} } = {}) {
  const log = [];
  const handle = {
    version,
    content: "alt",
    createWritable: async () => {
      log.push("create");
      onCreate(handle);
      return {
        write: async (/** @type {string} */ data) => {
          if (failWrite) throw new Error("voll");
          handle.pending = data;
        },
        close: async () => {
          handle.content = handle.pending;
          handle.version++;
          log.push("close");
        },
        abort: async () => log.push("abort"),
      };
    },
  };
  return { handle, log, stamp: async (/** @type {any} */ h) => h.version };
}

test("an unchanged file is written without asking", async () => {
  const { handle, log, stamp } = disk();
  let asked = 0;
  const written = await guardedWrite(handle, "neu", { expected: 1, stamp, confirm: async () => (asked++, handle) });
  assert.equal(written, handle);
  assert.equal(handle.content, "neu");
  assert.equal(asked, 0);
  assert.deepEqual(log, ["create", "close"]);
});

test("a file changed on disk is kept when the user cancels", async () => {
  const { handle, log, stamp } = disk({ version: 2 });
  const written = await guardedWrite(handle, "neu", { expected: 1, stamp, confirm: async () => null });
  assert.equal(written, null);
  assert.equal(handle.content, "alt");
  assert.deepEqual(log, []);
});

test("a change while the stream opens aborts it and asks again", async () => {
  let changes = 1;
  const { handle, log, stamp } = disk({ onCreate: (h) => changes-- > 0 && h.version++ });
  let asked = 0;
  const written = await guardedWrite(handle, "neu", { expected: 1, stamp, confirm: async (h) => (asked++, h) });
  assert.equal(written, handle);
  assert.equal(asked, 1);
  assert.deepEqual(log, ["create", "abort", "create", "close"]);
});

test("a failed write aborts the stream and leaves the file as it was", async () => {
  const { handle, log, stamp } = disk({ failWrite: true });
  await assert.rejects(guardedWrite(handle, "neu", { expected: 1, stamp, confirm: async (h) => h }));
  assert.equal(handle.content, "alt");
  assert.deepEqual(log, ["create", "abort"]);
});

test("a newly chosen file is written without comparison", async () => {
  const { handle, stamp } = disk({ version: 9 });
  const other = disk();
  const written = await guardedWrite(handle, "neu", { expected: 1, stamp, confirm: async () => other.handle });
  assert.equal(written, other.handle);
  assert.equal(other.handle.content, "neu");
  assert.equal(handle.content, "alt");
});
