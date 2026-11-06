// The working state of a document (ADR-006, ADR-008, ADR-011): from not
// well-formed through open spots and validation to accepted. Pure functions on
// text, so the document list tool and the browser check can use them as well.

/**
 * @typedef {{ key: string, label: string, find: (text: string) => { from: number, to: number }[], action?: string }} Detector
 * A kind of open editorial work: `find` returns its ranges in a text, and
 * `action` names the menu action that resolves it, absent while the edition
 * has no rule for it yet.
 */

/**
 * Comments, CDATA sections and processing instructions, which hold no markup;
 * an unterminated one runs to the end of the text.
 * @param {string} text
 */
function nonMarkup(text) {
  return [...text.matchAll(/<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<\?[\s\S]*?(?:\?>|$)/g)].map((m) => ({
    from: m.index ?? 0,
    to: (m.index ?? 0) + m[0].length,
  }));
}

/**
 * Ranges of a text that hold no transcription: the header and whatever holds
 * no markup. Open work is looked for outside them.
 * @param {string} text
 */
function quietRanges(text) {
  const ranges = nonMarkup(text);
  const markup = blank(text, ranges);
  const header = /<teiHeader(?=[\s>])/.exec(markup);
  if (header) {
    const end = markup.indexOf("</teiHeader>", header.index);
    ranges.push({ from: header.index, to: end < 0 ? text.length : end + "</teiHeader>".length });
  }
  return ranges;
}

/**
 * The text with the given ranges replaced by spaces of the same length, so
 * offsets stay valid while their content can no longer match.
 * @param {string} text @param {{ from: number, to: number }[]} ranges
 */
function blank(text, ranges) {
  const parts = [];
  let at = 0;
  for (const { from, to } of [...ranges].sort((x, y) => x.from - y.from)) {
    if (to <= at) continue;
    parts.push(text.slice(at, Math.max(at, from)), " ".repeat(to - Math.max(at, from)));
    at = to;
  }
  parts.push(text.slice(at));
  return parts.join("");
}

/**
 * Open editorial work: what the detectors find in the transcription, outside
 * header, comments, CDATA and processing instructions, in document order.
 * @param {string} text @param {Detector[]} detectors
 * @returns {{ from: number, to: number, key: string }[]}
 */
export function openSpots(text, detectors) {
  const searched = blank(text, quietRanges(text));
  const spots = [];
  for (const d of detectors) {
    for (const r of d.find(searched)) spots.push({ from: r.from, to: r.to, key: d.key });
  }
  return spots.sort((a, b) => a.from - b.from || b.to - a.to);
}

/**
 * The ranges of a global regular expression's matches, for detectors.
 * @param {RegExp} pattern with the g flag
 * @returns {(text: string) => { from: number, to: number }[]}
 */
export const matchesOf = (pattern) => (text) => [...text.matchAll(pattern)].map((m) => ({ from: m.index ?? 0, to: (m.index ?? 0) + m[0].length }));

/**
 * The badge for the working state. Only "approved" is stored; "ready" is
 * computed, and "changed" marks an accepted document edited since.
 * @param {{ wellFormed: boolean, valid: boolean, open: number, status: string, changedSinceAcceptance: boolean }} facts
 * @returns {{ state: "approved" | "changed" | "error" | "draft" | "ready", label: string, detail: string }}
 */
export function workingState({ wellFormed, valid, open, status, changedSinceAcceptance }) {
  if (status === "approved" && wellFormed) {
    return changedSinceAcceptance
      ? { state: "changed", label: "Abgenommen", detail: "seither geändert" }
      : { state: "approved", label: "Abgenommen", detail: "" };
  }
  if (!wellFormed) return { state: "error", label: "In Bearbeitung", detail: "nicht wohlgeformt" };
  if (open) return { state: "draft", label: "In Bearbeitung", detail: open === 1 ? "1 offene Stelle" : `${open} offene Stellen` };
  if (!valid) return { state: "draft", label: "In Bearbeitung", detail: "noch nicht validiert" };
  return { state: "ready", label: "Bereit zur Abnahme", detail: "" };
}

/**
 * Text edits recording an acceptance: revisionDesc/@status="approved" and a
 * change with the date, either in the existing revisionDesc (inside its
 * listChange if there is one) or in a new revisionDesc at the end of the
 * header. Tags inside comments, CDATA and processing instructions do not
 * count, and attribute values may hold ">" and either quote. Offsets refer
 * to `text` and the edits are ordered from the end, so they can be applied
 * one after another. Empty when the header is missing.
 * @param {string} text with LF line breaks
 * @param {{ date: string, note: string, who?: string }} change who is the
 *   xml:id of the pseudonymous editor, when one is set
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function acceptanceEdits(text, { date, note, who }) {
  const by = who ? ` who="#${who}"` : "";
  return changeEdits(text, `<change when="${date}" status="approved"${by}>${note}</change>`, "approved");
}

/**
 * Text edits recording that a pseudonymous editor worked on the document on a
 * day: one change per editor and day in the revisionDesc, placed as an
 * acceptance is, so saving again on the same day adds nothing. The working
 * state in revisionDesc/@status stays as it is. Empty when the change exists
 * or the header is missing.
 * @param {string} text with LF line breaks
 * @param {{ date: string, who: string, note: string }} change who is an xml:id
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function workChangeEdits(text, { date, who, note }) {
  const markup = blank(text, nonMarkup(text));
  const quoted = (/** @type {string} */ v) => `\\s*=\\s*["']${v.replace(/[.#-]/g, "\\$&")}["']`;
  const same = new RegExp(`<change\\b(?=[^>]*\\bwhen${quoted(date)})(?=[^>]*\\bwho${quoted(`#${who}`)})`);
  if (same.test(markup)) return [];
  return changeEdits(text, `<change when="${date}" who="#${who}">${note}</change>`, null);
}

/**
 * Inserts one change element into the revisionDesc, creating it at the end of
 * the header when it is missing, and sets its status when one is given.
 * @param {string} text @param {string} change @param {string | null} status
 */
function changeEdits(text, change, status) {
  // Only markup counts: comments and the like are blanked, offsets stay.
  const markup = blank(text, nonMarkup(text));
  // Attribute-aware, so a ">" inside a quoted value does not end the tag.
  const open = /<revisionDesc(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/.exec(markup);
  if (open) {
    const attrs = text.slice(open.index + "<revisionDesc".length, open.index + "<revisionDesc".length + open[1].length);
    const pattern = /(\s)status\s*=\s*(?:"[^"]*"|'[^']*')/;
    const withStatus = status === null ? attrs : pattern.test(attrs) ? attrs.replace(pattern, `$1status="${status}"`) : `${attrs.trimEnd()} status="${status}"`;
    const indent = /[ \t]*$/.exec(text.slice(0, open.index))?.[0] ?? "";
    // An empty <revisionDesc/> becomes an element holding the change.
    if (open[2]) {
      return [{ from: open.index, to: open.index + open[0].length, insert: `<revisionDesc${withStatus.trimEnd()}>\n${indent}  ${change}\n${indent}</revisionDesc>` }];
    }
    const close = markup.indexOf("</revisionDesc>", open.index);
    if (close < 0) return [];
    const list = markup.lastIndexOf("</listChange>", close);
    const at = list > open.index ? list : close;
    const before = /[ \t]*$/.exec(text.slice(0, at))?.[0] ?? "";
    const edits = [{ from: at, to: at, insert: `  ${change}\n${before}` }];
    if (withStatus !== attrs) edits.push({ from: open.index, to: open.index + open[0].length, insert: `<revisionDesc${withStatus}>` });
    return edits;
  }
  const end = markup.indexOf("</teiHeader>");
  if (end < 0) return [];
  const lineStart = text.lastIndexOf("\n", end) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
  const element = `<revisionDesc${status === null ? "" : ` status="${status}"`}>\n${indent}    ${change}\n${indent}  </revisionDesc>`;
  // revisionDesc is the last child of the header, so it goes right before the
  // closing tag, on a line of its own when that tag shares its line with content.
  if (/^[ \t]*$/.test(text.slice(lineStart, end))) return [{ from: lineStart, to: lineStart, insert: `${indent}  ${element}\n` }];
  return [{ from: end, to: end, insert: `\n${indent}  ${element}\n${indent}` }];
}

/** The opening revisionDesc tag outside comments and the like, with its attribute text. @param {string} text */
function revisionDescTag(text) {
  const markup = blank(text, nonMarkup(text));
  const open = /<revisionDesc(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/.exec(markup);
  if (!open) return null;
  const attrsFrom = open.index + "<revisionDesc".length;
  return { attrsFrom, attrs: text.slice(attrsFrom, attrsFrom + open[1].length) };
}

const STATUS = /(\s)status\s*=\s*(?:"([^"]*)"|'([^']*)')/;

/**
 * The stored working state, revisionDesc/@status, read as the editor reads it:
 * comments do not count and either quote works; "" without one. The document
 * index tool uses it, so the list and the editor agree.
 * @param {string} text
 */
export function storedStatus(text) {
  const tag = revisionDescTag(text);
  const m = tag && STATUS.exec(tag.attrs);
  return m ? (m[2] ?? m[3] ?? "") : "";
}

/**
 * The edit that withdraws an acceptance by setting revisionDesc/@status to
 * "draft", so a file changed after its acceptance never claims it. Empty when
 * the stored status is not "approved".
 * @param {string} text
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function withdrawalEdits(text) {
  const tag = revisionDescTag(text);
  const m = tag && STATUS.exec(tag.attrs);
  if (!tag || !m || (m[2] ?? m[3]) !== "approved") return [];
  const from = tag.attrsFrom + (m.index ?? 0);
  return [{ from, to: from + m[0].length, insert: `${m[1]}status="draft"` }];
}
