// Search in a prebuilt person register (data/register/*.json). Matching is a
// substring test on precomputed folded fields, so no search library is needed.

/** NFD diacritic strip plus German umlaut folding, shared with the build tool. */
export function fold(/** @type {string} */ s) {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** @typedef {{ id: string, name: string, gnd: string, dates: string, search: string }} RegisterPerson */

/** @type {Map<string, Promise<RegisterPerson[]>>} */
const cache = new Map();

/** @param {string} url */
function load(url) {
  if (!cache.has(url)) {
    const request = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Personenregister nicht geladen (Status ${r.status}).`);
      return r.json().then((j) => j.persons);
    });
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return /** @type {Promise<RegisterPerson[]>} */ (cache.get(url));
}

/**
 * Entries containing every query word, surnames starting with the first word first.
 * @param {string} url @param {string} query @param {string[]} ignore words such as forms of address
 * @returns {Promise<RegisterPerson[]>}
 */
export async function searchRegister(url, query, ignore = []) {
  const skip = new Set(ignore.map(fold));
  const words = fold(query)
    .split(/[^a-z0-9-]+/)
    .filter((w) => w && !skip.has(w));
  if (!words.length) return [];
  const persons = await load(url);
  return persons
    .filter((p) => words.every((w) => p.search.includes(w)))
    .sort((a, b) => Number(!fold(b.name).startsWith(words[0])) - Number(!fold(a.name).startsWith(words[0])) || a.name.localeCompare(b.name))
    .slice(0, 8);
}

/** The query without ignored words, for handing on to another search. */
export function cleanQuery(/** @type {string} */ query, /** @type {string[]} */ ignore = []) {
  const skip = new Set(ignore.map(fold));
  return query
    .split(/\s+/)
    .filter((w) => w && !skip.has(fold(w.replace(/[.,]$/, ""))))
    .join(" ");
}
