// Schema validation off the main thread: this module worker owns the
// libxml2-wasm runtime and the compiled schemas, so compiling a large schema
// such as TEI All never freezes the editor. Jobs run one at a time in the
// order they arrive. Messages:
//   { type: "prepare", schemaUrl }            compile ahead of the first use
//   { type: "validate", id, xml, schemaUrl }  answered with { id, problems } or { id, error }

/** @typedef {{ message: string, line: number, column: number }} Diagnostic */

/** @type {Promise<any> | null} */
let runtime = null;
/** @type {Map<string, Promise<any>>} compiled validators per schema URL */
const compiled = new Map();
let queue = Promise.resolve();

const loadRuntime = () => (runtime ??= import("../vendor/libxml2-wasm/lib/index.mjs"));

/** @param {string} schemaUrl */
function validatorFor(schemaUrl) {
  let ready = compiled.get(schemaUrl);
  if (ready) return ready;
  ready = (async () => {
    const [lib, text] = await Promise.all([
      loadRuntime(),
      fetch(schemaUrl).then((r) => {
        if (!r.ok) throw new Error(`Schema nicht geladen (Status ${r.status}).`);
        return r.text();
      }),
    ]);
    return lib.RelaxNGValidator.fromDoc(lib.XmlDocument.fromString(text));
  })();
  // A failed compile is tried again on the next request.
  ready.catch(() => compiled.delete(schemaUrl));
  compiled.set(schemaUrl, ready);
  return ready;
}

/**
 * @param {string} xml a well-formed document @param {string} schemaUrl
 * @returns {Promise<Diagnostic[]>} empty when valid
 */
async function validate(xml, schemaUrl) {
  const validator = await validatorFor(schemaUrl);
  const { XmlDocument } = await loadRuntime();
  const doc = XmlDocument.fromString(xml);
  try {
    validator.validate(doc);
    return [];
  } catch (error) {
    const details = Array.isArray(/** @type {any} */ (error)?.details) ? /** @type {any} */ (error).details : [];
    if (!details.length) return [{ message: String(error), line: 0, column: 0 }];
    return details.map((/** @type {any} */ d) => ({ message: String(d.message ?? "").trim(), line: Number(d.line ?? 0), column: Number(d.col ?? 0) }));
  } finally {
    doc.dispose();
  }
}

self.addEventListener("message", (/** @type {MessageEvent} */ event) => {
  const request = event.data;
  if (request.type === "prepare") {
    queue = queue.then(() => validatorFor(request.schemaUrl).catch(() => {}));
  } else if (request.type === "validate") {
    queue = queue.then(async () => {
      try {
        self.postMessage({ id: request.id, problems: await validate(request.xml, request.schemaUrl) });
      } catch (error) {
        self.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) });
      }
    });
  }
});
