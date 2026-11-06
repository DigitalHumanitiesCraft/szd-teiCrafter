import { fold } from "./register.js";

// GND search through lobid-gnd (keyless, CORS-enabled) for persons, bodies
// and places. The lookup is user-triggered while editing; nothing is fetched
// on page load.

/**
 * @typedef {{ id: string, name: string, dates: string, info: string, geonames: string }} GndHit
 * `geonames` is the GeoNames id the record links to in sameAs, or "", so a
 * place gets both references without a GeoNames account.
 * @param {string} query
 * @param {string} type a lobid-gnd entity type such as Person, CorporateBody or PlaceOrGeographicName
 * @returns {Promise<GndHit[]>}
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
  // A record named exactly as asked, such as the city for „Nizza“, comes
  // before records that merely contain the words.
  const asked = fold(query).trim();
  const members = (json.member ?? []).map((/** @type {any} */ m) => {
    const all = [m.preferredName, ...(m.variantName ?? [])].map((n) => fold(String(n ?? "")));
    const names = all.join(" ");
    return { m, hits: words.filter((w) => names.includes(w)).length, exact: all.includes(asked) };
  });
  const best = Math.max(0, ...members.map((x) => x.hits));
  return members
    .filter((x) => x.hits === best)
    .sort((a, b) => Number(b.exact) - Number(a.exact))
    .slice(0, 8)
    .map(({ m }) => ({
      id: String(m.gndIdentifier ?? ""),
      name: String(m.preferredName ?? ""),
      dates: [m.dateOfBirth?.[0] ?? m.dateOfEstablishment?.[0], m.dateOfDeath?.[0] ?? m.dateOfTermination?.[0]].filter(Boolean).join("–"),
      info: [m.biographicalOrHistoricalInformation?.[0], m.professionOrOccupation?.[0]?.label ?? m.geographicAreaCode?.[0]?.label]
        .filter(Boolean)
        .join(" | "),
      geonames: geonamesOf(m),
    }));
}

/** The GeoNames id a lobid-gnd record links to, or "". @param {any} record */
export function geonamesOf(record) {
  for (const s of record.sameAs ?? []) {
    const id = /geonames\.org\/(\d+)/.exec(String(s.id ?? s))?.[1];
    if (id) return id;
  }
  return "";
}

/**
 * GND identifiers: digits with a check character, plain or, in the older
 * records of bodies and places, after a hyphen, where the digits may be few
 * (63291-0 Komotau, 35565-3 Home Office).
 */
export const isGndId = (/** @type {string} */ value) => /^(?:\d{1,10}-[\dX]|\d{6,10}[\dX])$/i.test(value.trim());
