// Schema validation for the editor. The work runs in a module worker
// (js/validate-worker.js), so compiling a large schema, which takes seconds for
// TEI All, never blocks typing or the interface. `prepare` compiles the schema
// ahead of the first validation, and the worker keeps it for the session.
// Which schema is used is decided by `chooseSchema` from the source
// configuration: the strictest one that loads, with TEI All as the fallback.

/** @typedef {{ message: string, line: number, column: number }} Diagnostic */
/** @typedef {{ url: string, label: string, fallback?: boolean }} SchemaEntry an entry of source.schemas */

/**
 * The first schema of the list, ordered strictest first, whose file loads,
 * with its RELAX NG text for the check of the action registry.
 * @param {SchemaEntry[]} schemas
 * @returns {Promise<SchemaEntry & { text: string, skipped: string[] }>}
 */
export async function chooseSchema(schemas) {
  const skipped = [];
  for (const entry of schemas) {
    try {
      // Absolute, since the worker would resolve a relative URL against js/.
      const url = new URL(entry.url, document.baseURI).href;
      const r = await fetch(url);
      if (r.ok) return { ...entry, url, text: await r.text(), skipped };
      skipped.push(`${entry.label} (Status ${r.status})`);
    } catch {
      skipped.push(`${entry.label} (nicht erreichbar)`);
    }
  }
  throw new Error(`Kein Schema geladen: ${skipped.join(", ")}.`);
}

export function createValidator() {
  /** @type {Worker | null} */
  let worker = null;
  let serial = 0;
  /** @type {Map<number, { resolve: (p: Diagnostic[]) => void, reject: (e: Error) => void }>} */
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    const w = new Worker(new URL("./validate-worker.js", import.meta.url), { type: "module" });
    w.addEventListener("message", (/** @type {MessageEvent} */ e) => {
      const job = pending.get(e.data.id);
      if (!job) return;
      pending.delete(e.data.id);
      if ("error" in e.data) job.reject(new Error(e.data.error));
      else job.resolve(e.data.problems);
    });
    // A crashed worker fails its jobs and is replaced on the next request.
    w.addEventListener("error", (e) => {
      e.preventDefault();
      w.terminate();
      if (worker === w) worker = null;
      for (const [id, job] of pending) {
        pending.delete(id);
        job.reject(new Error(`Die Prüfung ist abgebrochen: ${e.message || "Fehler im Prüfprozess"}.`));
      }
    });
    worker = w;
    return w;
  }

  return {
    /** Compiles the schema in the background, so the first validation does not wait for it. @param {string} schemaUrl */
    prepare(schemaUrl) {
      ensureWorker().postMessage({ type: "prepare", schemaUrl });
    },
    /**
     * @param {string} xml a well-formed document @param {string} schemaUrl
     * @returns {Promise<Diagnostic[]>} empty when valid
     */
    validate(xml, schemaUrl) {
      const id = ++serial;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ensureWorker().postMessage({ type: "validate", id, xml, schemaUrl });
      });
    },
  };
}
