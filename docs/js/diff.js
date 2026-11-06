// Line-level comparison of two versions of a document, and recognition of the
// conflict markers Git leaves in a file when two versions of a passage meet.

/**
 * @typedef {{ kind: "same" | "del" | "add", a: number, b: number, text: string }} DiffLine
 * `a` and `b` are 1-based line numbers in the old and new text, 0 where the
 * line does not exist on that side.
 */

/**
 * Longest common subsequence on lines, after trimming the common start and end.
 * @param {string} before @param {string} after
 * @returns {DiffLine[]}
 */
export function lineDiff(before, after) {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  /** @type {DiffLine[]} */
  const out = [];
  for (let i = 0; i < start; i++) out.push({ kind: "same", a: i + 1, b: i + 1, text: a[i] });
  const n = endA - start;
  const m = endB - start;
  const del = (/** @type {number} */ i) => out.push({ kind: "del", a: start + i + 1, b: 0, text: a[start + i] });
  const add = (/** @type {number} */ j) => out.push({ kind: "add", a: 0, b: start + j + 1, text: b[start + j] });
  if (n * m > 4_000_000) {
    // Deliberate shortcut: the table is quadratic, so beyond letter size the
    // changed middle is shown as one replaced block. Upgrade path: Myers diff.
    for (let i = 0; i < n; i++) del(i);
    for (let j = 0; j < m; j++) add(j);
  } else {
    const w = m + 1;
    const t = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        t[i * w + j] = a[start + i] === b[start + j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        out.push({ kind: "same", a: start + i + 1, b: start + j + 1, text: a[start + i] });
        i++;
        j++;
      } else if (i < n && (j === m || t[(i + 1) * w + j] >= t[i * w + j + 1])) {
        del(i++);
      } else {
        add(j++);
      }
    }
  }
  for (let k = 0; k < a.length - endA; k++) out.push({ kind: "same", a: endA + k + 1, b: endB + k + 1, text: a[endA + k] });
  return out;
}

/**
 * Groups changed lines with a few lines of context around them.
 * @param {DiffLine[]} lines @param {number} [context]
 * @returns {DiffLine[][]}
 */
export function hunks(lines, context = 2) {
  /** @type {DiffLine[][]} */
  const groups = [];
  let end = -1;
  lines.forEach((line, k) => {
    if (line.kind === "same") return;
    const from = Math.max(0, k - context);
    const to = Math.min(lines.length, k + context + 1);
    if (groups.length && from <= end) {
      groups[groups.length - 1].push(...lines.slice(end, to));
    } else {
      groups.push(lines.slice(from, to));
    }
    end = Math.max(end, to);
  });
  return groups;
}

/**
 * The line of the current text a group of changes points to: the first
 * changed line, and for a removed line the line that now stands in its place.
 * @param {DiffLine[]} group
 */
export function jumpLine(group) {
  const first = Math.max(0, group.findIndex((l) => l.kind !== "same"));
  const after = group.slice(first).find((l) => l.b);
  if (after) return after.b;
  return (group.slice(0, first).findLast((l) => l.b)?.b ?? 0) + 1;
}

/**
 * Git conflict marker lines, in document order. Start and end take Git's form,
 * seven signs followed by a space and a label or by the line end, and count on
 * their own, so a marker left over from a partial resolution is still found.
 * A separator line "=======" counts only inside an open conflict, since such a
 * line is ordinary text elsewhere.
 * @param {string} text
 * @returns {{ line: number, kind: "start" | "middle" | "end" }[]}
 */
export function conflictMarkers(text) {
  /** @type {{ line: number, kind: "start" | "middle" | "end" }[]} */
  const found = [];
  let inside = false;
  text.split(/\r\n|\r|\n/).forEach((l, i) => {
    if (/^<{7}(?: |$)/.test(l)) {
      found.push({ line: i + 1, kind: "start" });
      inside = true;
    } else if (inside && /^={7}$/.test(l)) {
      found.push({ line: i + 1, kind: "middle" });
    } else if (/^>{7}(?: |$)/.test(l)) {
      found.push({ line: i + 1, kind: "end" });
      inside = false;
    }
  });
  return found;
}
