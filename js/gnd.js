import { fold } from "./register.js";

// GND search through lobid-gnd (keyless, CORS-enabled) for persons and
// places. The lookup is user-triggered while editing; nothing is fetched on
// page load.

/**
 * @typedef {{ id: string, name: string, dates: string, info: string }} GndPerson
 * @param {string} query
 * @returns {Promise<GndPerson[]>}
 */
export const searchPersons = (query) => searchGnd(query, "Person");

/**
 * @param {string} query
 * @param {string} type a lobid-gnd entity type such as Person or PlaceOrGeographicName
 * @returns {Promise<GndPerson[]>}
 */
export async function searchGnd(query, type) {
  if (!/^[A-Za-z]+$/.test(type)) throw new Error(`Unbekannter GND-Typ ${type}.`);
  const url = `https://lobid.org/gnd/search?q=${encodeURIComponent(query)}&filter=type:${type}&format=json&size=20`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Die GND-Suche (lobid.org) ist nicht erreichbar.");
  }
  if (!response.ok) throw new Error(`Die GND-Suche antwortet mit Status ${response.status}.`);
  const json = await response.json();
  // lobid also matches on relations and biography, so persons whose names
  // carry every query word come first, and the rest only when none does.
  const words = fold(query).split(/[^a-z0-9-]+/).filter(Boolean);
  const members = (json.member ?? []).map((/** @type {any} */ m) => {
    const names = fold([m.preferredName, ...(m.variantName ?? [])].join(" "));
    return { m, hits: words.filter((w) => names.includes(w)).length };
  });
  const best = Math.max(0, ...members.map((x) => x.hits));
  return members
    .filter((x) => x.hits === best)
    .slice(0, 8)
    .map(({ m }) => ({
      id: String(m.gndIdentifier ?? ""),
      name: String(m.preferredName ?? ""),
      dates: [m.dateOfBirth?.[0], m.dateOfDeath?.[0]].filter(Boolean).join("–"),
      info: [m.biographicalOrHistoricalInformation?.[0], m.professionOrOccupation?.[0]?.label ?? m.geographicAreaCode?.[0]?.label]
        .filter(Boolean)
        .join(" | "),
    }));
}

/** GND identifiers: digits with an optional check character, plain or after a hyphen. */
export const isGndId = (/** @type {string} */ value) => /^\d{6,11}(?:-?[\dX])?$/i.test(value.trim());
