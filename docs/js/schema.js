// What a RELAX NG schema in XML syntax allows, read from its text: which
// elements exist and which attributes each carries, including those it takes
// from attribute classes. Enough to refuse an action that would write markup
// the schema rejects, before anyone uses it; validation proper stays with
// js/validate.js. Works on text, so Node can run it as well.

/**
 * @param {string} rng the schema text, e.g. TEI All as tei_all.rng
 * @returns {(element: string, attributes: string[]) => string} the reason an element with these attributes is unknown, or ""
 */
export function schemaChecker(rng) {
  /** @type {Map<string, string>} */
  const defines = new Map();
  /** @type {Map<string, string>} */
  const elements = new Map();
  for (const m of rng.matchAll(/<define\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/define>/g)) {
    // A combined define adds to an earlier one of the same name.
    defines.set(m[1], (defines.get(m[1]) ?? "") + m[2]);
    const el = /^\s*<element\s+name="([^"]+)"/.exec(m[2]);
    if (el) elements.set(el[1], (elements.get(el[1]) ?? "") + m[2]);
  }

  /** @type {Map<string, Set<string>>} */
  const cache = new Map();
  /** Attribute names of a definition body, following the attribute classes it references. @param {string} body */
  function attributesOf(body, seen = new Set()) {
    const names = new Set([...body.matchAll(/<attribute\s+name="([^"]+)"/g)].map((m) => m[1]));
    for (const ref of body.matchAll(/<ref\s+name="(att\.[^"]+)"/g)) {
      if (seen.has(ref[1])) continue;
      seen.add(ref[1]);
      for (const n of attributesOf(defines.get(ref[1]) ?? "", seen)) names.add(n);
    }
    return names;
  }

  return (element, attributes) => {
    const body = elements.get(element);
    if (body === undefined) return `Das Schema kennt kein Element <${element}>.`;
    if (!cache.has(element)) cache.set(element, attributesOf(body));
    const known = /** @type {Set<string>} */ (cache.get(element));
    const unknown = attributes.filter((a) => !known.has(a));
    return unknown.length ? `Das Schema erlaubt an <${element}> kein ${unknown.map((a) => `@${a}`).join(", ")}.` : "";
  };
}
