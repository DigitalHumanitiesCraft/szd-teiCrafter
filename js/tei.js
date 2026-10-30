// Generic TEI reading: well-formedness, header facts and page breaks. Nothing
// here knows about a particular source; source specifics live in source.js.

const TEI_NS = "http://www.tei-c.org/ns/1.0";

/**
 * @param {string} text
 * @returns {{ doc: Document | null, error: string | null }}
 */
export function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const err = doc.querySelector("parsererror");
  // Chromium wraps the message in boilerplate and puts it in a child <div>;
  // Firefox puts it directly in the parsererror element.
  if (err) {
    const message = (err.querySelector("div") ?? err).textContent ?? "";
    return { doc: null, error: message.trim().split("\n")[0] };
  }
  return { doc, error: null };
}

/**
 * @param {Document} doc
 * @returns {{ title: string, idnos: Record<string, string>, pageCount: number }}
 */
export function documentFacts(doc) {
  const title = doc.getElementsByTagNameNS(TEI_NS, "title")[0]?.textContent.trim() ?? "";
  /** @type {Record<string, string>} */
  const idnos = {};
  for (const el of doc.getElementsByTagNameNS(TEI_NS, "idno")) {
    idnos[el.getAttribute("type") ?? ""] = el.textContent.trim();
  }
  const pageCount = doc.getElementsByTagNameNS(TEI_NS, "pb").length;
  return { title, idnos, pageCount };
}

/**
 * Page index (0-based) of a caret offset in the raw source: the number of
 * <pb> tags before it, minus one. Works on text, so it also follows the caret
 * while the document is temporarily not well-formed.
 * @param {string} text
 * @param {number} offset
 */
export function pageAtOffset(text, offset) {
  const matches = text.slice(0, offset).match(/<pb[\s/>]/g);
  return Math.max(0, (matches?.length ?? 0) - 1);
}
