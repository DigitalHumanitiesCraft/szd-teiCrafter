// Schema validation against a RelaxNG schema with the vendored libxml2-wasm.
// The source configuration names the schema; runtime and compiled schema load
// on first use and are cached per schema afterwards.
// Runs on the main thread; a worker is the upgrade path for large documents.

/** @typedef {{ message: string, line: number, column: number }} Diagnostic */

/** @type {Map<string, Promise<{ validator: any, XmlDocument: any }>>} */
const compiled = new Map();

/** @param {string} schemaUrl */
function load(schemaUrl) {
  let ready = compiled.get(schemaUrl);
  if (ready) return ready;
  ready = (async () => {
    const [runtime, schemaText] = await Promise.all([
      import("../vendor/libxml2-wasm/lib/index.mjs"),
      fetch(schemaUrl).then((r) => {
        if (!r.ok) throw new Error(`Schema nicht geladen (Status ${r.status}).`);
        return r.text();
      }),
    ]);
    const schemaDoc = runtime.XmlDocument.fromString(schemaText);
    return { validator: runtime.RelaxNGValidator.fromDoc(schemaDoc), XmlDocument: runtime.XmlDocument };
  })();
  ready.catch(() => compiled.delete(schemaUrl));
  compiled.set(schemaUrl, ready);
  return ready;
}

/**
 * @param {string} xml a well-formed document @param {string} schemaUrl a RelaxNG schema
 * @returns {Promise<Diagnostic[]>} empty when valid
 */
export async function validate(xml, schemaUrl) {
  const { validator, XmlDocument } = await load(schemaUrl);
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
