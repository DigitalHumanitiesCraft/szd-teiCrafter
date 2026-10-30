// Person search in the GND through lobid-gnd (keyless, CORS-enabled). The
// lookup is user-triggered while editing; nothing is fetched on page load.

/**
 * @typedef {{ id: string, name: string, dates: string, info: string }} GndPerson
 * @param {string} query
 * @returns {Promise<GndPerson[]>}
 */
export async function searchPersons(query) {
  const url = `https://lobid.org/gnd/search?q=${encodeURIComponent(query)}&filter=type:Person&format=json&size=8`;
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error("Die GND-Suche (lobid.org) ist nicht erreichbar.");
  }
  if (!response.ok) throw new Error(`Die GND-Suche antwortet mit Status ${response.status}.`);
  const json = await response.json();
  return (json.member ?? []).map((/** @type {any} */ m) => ({
    id: String(m.gndIdentifier ?? ""),
    name: String(m.preferredName ?? ""),
    dates: [m.dateOfBirth?.[0], m.dateOfDeath?.[0]].filter(Boolean).join("–"),
    info: [m.biographicalOrHistoricalInformation?.[0], m.professionOrOccupation?.[0]?.label]
      .filter(Boolean)
      .join(" | "),
  }));
}

/** GND identifiers: digits with an optional check character or hyphenated form. */
export const isGndId = (/** @type {string} */ value) => /^[0-9X-]{6,12}$/i.test(value.trim());
