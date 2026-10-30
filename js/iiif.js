// Generic IIIF resolution: turns a user-supplied URL into OpenSeadragon tile
// sources. Accepts Presentation manifests (v2 and v3), Image API info.json or
// service base URLs, and plain image URLs.

/**
 * @typedef {{ label: string, tileSource: string | object }} Page
 * @typedef {{ label: string, pages: Page[] }} Resolved
 */

/**
 * @param {string} url
 * @returns {Promise<Resolved>}
 */
export async function resolveIiif(url) {
  let response;
  try {
    response = await fetch(url, { headers: { Accept: "application/ld+json, application/json, */*" } });
  } catch {
    throw new Error("Die Adresse ist nicht erreichbar oder erlaubt keinen Zugriff aus dem Browser (CORS).");
  }
  if (!response.ok) throw new Error(`Der Server antwortet mit Status ${response.status}.`);

  const type = response.headers.get("Content-Type") ?? "";
  if (type.startsWith("image/")) {
    return { label: url, pages: [{ label: "1", tileSource: { type: "image", url } }] };
  }

  let json;
  try {
    json = await response.json();
  } catch {
    // A service base URL without /info.json answers with something else.
    if (!url.endsWith("/info.json")) return resolveIiif(`${url.replace(/\/$/, "")}/info.json`);
    throw new Error("Die Antwort ist weder ein Bild noch IIIF-JSON.");
  }

  if (isImageService(json)) return { label: url, pages: [{ label: "1", tileSource: json }] };
  if (Array.isArray(json.sequences)) return fromManifestV2(json);
  if (Array.isArray(json.items)) return fromManifestV3(json);
  throw new Error("Das JSON ist weder ein IIIF-Manifest noch eine info.json.");
}

/** @param {any} json */
function isImageService(json) {
  const ctx = [json["@context"]].flat().join(" ");
  return ctx.includes("iiif.io/api/image") || json.protocol === "http://iiif.io/api/image";
}

/** @param {any} value */
function text(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return text(value[0]);
  if (value && typeof value === "object") {
    if ("@value" in value) return String(value["@value"]);
    const first = Object.values(value)[0];
    return text(first);
  }
  return "";
}

/** @param {any} service @param {any} resourceId */
function tileSourceFor(service, resourceId) {
  const svc = [service].flat().find(Boolean);
  const id = svc?.["@id"] ?? svc?.id;
  if (id) return `${String(id).replace(/\/$/, "")}/info.json`;
  return { type: "image", url: resourceId };
}

/** @param {any} manifest @returns {Resolved} */
function fromManifestV2(manifest) {
  const canvases = manifest.sequences[0]?.canvases ?? [];
  const pages = canvases.map((/** @type {any} */ canvas, /** @type {number} */ i) => {
    const res = canvas.images?.[0]?.resource ?? {};
    return { label: text(canvas.label) || String(i + 1), tileSource: tileSourceFor(res.service, res["@id"]) };
  });
  return { label: text(manifest.label), pages };
}

/** @param {any} manifest @returns {Resolved} */
function fromManifestV3(manifest) {
  const pages = manifest.items.map((/** @type {any} */ canvas, /** @type {number} */ i) => {
    const body = [canvas.items?.[0]?.items?.[0]?.body].flat()[0] ?? {};
    return { label: text(canvas.label) || String(i + 1), tileSource: tileSourceFor(body.service, body.id) };
  });
  return { label: text(manifest.label), pages };
}
