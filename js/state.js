// The working state of a document (ADR-006, ADR-008, ADR-011): from not
// well-formed through open spots and validation to accepted. Pure functions on
// text, so the document list tool and the browser check can use them as well.

/**
 * Open editorial work: the matches of the wraps' markers, in document order.
 * @param {string} text @param {{ key: string, marker: RegExp }[]} wraps
 * @returns {{ from: number, to: number, key: string }[]}
 */
export function openSpots(text, wraps) {
  const spots = [];
  for (const wrap of wraps) {
    for (const m of text.matchAll(wrap.marker)) spots.push({ from: m.index ?? 0, to: (m.index ?? 0) + m[0].length, key: wrap.key });
  }
  return spots.sort((a, b) => a.from - b.from || b.to - a.to);
}

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
 * header. Offsets refer to `text` and the edits are ordered from the end, so
 * they can be applied one after another. Empty when the header is missing.
 * @param {string} text with LF line breaks
 * @param {{ date: string, note: string }} change
 * @returns {{ from: number, to: number, insert: string }[]}
 */
export function acceptanceEdits(text, { date, note }) {
  const change = `<change when="${date}" status="approved">${note}</change>`;
  const open = /<revisionDesc\b[^>]*?(\/?)>/.exec(text);
  if (open) {
    const indent = /[ \t]*$/.exec(text.slice(0, open.index))?.[0] ?? "";
    // An empty <revisionDesc/> becomes an element holding the change.
    if (open[1]) {
      const attrs = open[0].slice("<revisionDesc".length, -2).replace(/\s*\bstatus="[^"]*"/, "").trimEnd();
      return [{ from: open.index, to: open.index + open[0].length, insert: `<revisionDesc${attrs} status="approved">\n${indent}  ${change}\n${indent}</revisionDesc>` }];
    }
    const close = text.indexOf("</revisionDesc>", open.index);
    if (close < 0) return [];
    const list = text.lastIndexOf("</listChange>", close);
    const at = list > open.index ? list : close;
    const before = /[ \t]*$/.exec(text.slice(0, at))?.[0] ?? "";
    const tag = /\bstatus="/.test(open[0])
      ? open[0].replace(/\bstatus="[^"]*"/, 'status="approved"')
      : open[0].replace(/<revisionDesc\b/, '<revisionDesc status="approved"');
    return [
      { from: at, to: at, insert: `  ${change}\n${before}` },
      { from: open.index, to: open.index + open[0].length, insert: tag },
    ];
  }
  const end = text.indexOf("</teiHeader>");
  if (end < 0) return [];
  const lineStart = text.lastIndexOf("\n", end) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart))?.[0] ?? "";
  return [{ from: lineStart, to: lineStart, insert: `${indent}  <revisionDesc status="approved">\n${indent}    ${change}\n${indent}  </revisionDesc>\n` }];
}
