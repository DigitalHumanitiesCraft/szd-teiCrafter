// Schema validation against TEI All (RelaxNG) with the vendored libxml2-wasm.
// Runtime and compiled schema load on first use and are cached afterwards.
// Runs on the main thread; a worker is the upgrade path for large documents.

const SCHEMA_URL = "schemas/tei-p5-4.11.0/tei_all.rng";

/** @typedef {{ message: string, line: number, column: number }} Diagnostic */

/** @type {Promise<{ validator: any, XmlDocument: any }> | null} */
let ready = null;

function load() {
  ready ??= (async () => {
    const [runtime, schemaText] = await Promise.all([
      import("../vendor/libxml2-wasm/lib/index.mjs"),
      fetch(SCHEMA_URL).then((r) => {
        if (!r.ok) throw new Error(`Schema nicht geladen (Status ${r.status}).`);
        return r.text();
      }),
    ]);
    const schemaDoc = runtime.XmlDocument.fromString(schemaText);
    return { validator: runtime.RelaxNGValidator.fromDoc(schemaDoc), XmlDocument: runtime.XmlDocument };
  })();
  ready.catch(() => {
    ready = null;
  });
  return ready;
}

/**
 * @param {string} xml a well-formed document
 * @returns {Promise<Diagnostic[]>} empty when valid
 */
export async function validateTeiAll(xml) {
  const { validator, XmlDocument } = await load();
  const doc = XmlDocument.fromString(xml);
  try {
    validator.validate(doc);
    return [];
  } catch (error) {
    const details = Array.isArray(/** @type {any} */ (error)?.details) ? /** @type {any} */ (error).details : [];
    if (!details.length) return [{ message: String(error), line: 0, column: 0 }];
    return details.map((/** @type {any} */ d) => ({
      message: String(d.message ?? "").trim(),
      line: Number(d.line ?? 0),
      column: Number(d.col ?? 0),
    }));
  } finally {
    doc.dispose();
  }
}
