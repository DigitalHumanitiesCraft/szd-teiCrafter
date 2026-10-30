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
 * @param {{ date: string, note: string }} change
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function acceptanceEdits(text, { date, note }) {
  const change = `<change when="${date}" status="approved">${note}</change>`;
  // Only markup counts: comments and the like are blanked, offsets stay.
  const markup = blank(text, nonMarkup(text));
  // Attribute-aware, so a ">" inside a quoted value does not end the tag.
  const open = /<revisionDesc(?=[\s/>])((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/.exec(markup);
  if (open) {
    const attrs = text.slice(open.index + "<revisionDesc".length, open.index + "<revisionDesc".length + open[1].length);
    const status = /(\s)status\s*=\s*(?:"[^"]*"|'[^']*')/;
    const approved = status.test(attrs) ? attrs.replace(status, '$1status="approved"') : `${attrs.trimEnd()} status="approved"`;
    const indent = /[ \t]*$/.exec(text.slice(0, open.index))?.[0] ?? "";
    // An empty <revisionDesc/> becomes an element holding the change.
    if (open[2]) {
      return [{ from: open.index, to: open.index + open[0].length, insert: `<revisionDesc${approved.trimEnd()}>\n${indent}  ${change}\n${indent}</revisionDesc>` }];
    }
    const close = markup.indexOf("</revisionDesc>", open.index);
    if (close < 0) return [];
    const list = markup.lastIndexOf("</listChange>", close);
    const at = list > open.index ? list : close;
    const before = /[ \t]*$/.exec(text.slice(0, at))?.[0] ?? "";
    return [
      { from: at, to: at, insert: `  ${change}\n${before}` },
      { from: open.index, to: open.index + open[0].length, insert: `<revisionDesc${approved}>` },
    ];
  }
  const end = markup.indexOf("</teiHeader>");
  if (end < 0) return [];
  const lineStart = text.lastIndexOf("\n", end) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
  return [{ from: lineStart, to: lineStart, insert: `${indent}  <revisionDesc status="approved">\n${indent}    ${change}\n${indent}  </revisionDesc>\n` }];
}
