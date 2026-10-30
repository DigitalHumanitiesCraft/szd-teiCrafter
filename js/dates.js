// Dates in German running text, proposed as ISO values for TEI date
// attributes. The parser finds the date part of a selection and reads it as
// an exact or partial date (YYYY, YYYY-MM, YYYY-MM-DD) or as a range of years
// or days; anything else is left to the user. Nothing here knows an edition.

const MONTHS = {
  januar: 1, jänner: 1, jaenner: 1, jan: 1,
  februar: 2, feber: 2, feb: 2,
  märz: 3, maerz: 3, mär: 3, mrz: 3,
  april: 4, apr: 4,
  mai: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12,
};
const MONTH = `(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|")})\\.?(?![\\p{L}])`;
const YEAR = "(\\d{4})(?!\\d)";
const DAY = "(?<!\\d)(\\d{1,2})\\.";
const DASH = "\\s*(?:[-–—]|bis)\\s*";

const pad = (/** @type {number} */ n) => String(n).padStart(2, "0");
const daysIn = (/** @type {number} */ y, /** @type {number} */ m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Whether a value is an ISO date TEI accepts in @when and its kin: a year,
 * a year and month, or a full date that exists in the calendar.
 * @param {string} value
 */
export function isIsoDate(value) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2] ?? 1), Number(m[3] ?? 1)];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysIn(y, mo);
}

/** @param {number} y @param {number} [m] @param {number} [d] */
function iso(y, m, d) {
  const value = d ? `${y}-${pad(/** @type {number} */ (m))}-${pad(d)}` : m ? `${y}-${pad(m)}` : String(y);
  return isIsoDate(value) ? value : "";
}

/**
 * @typedef {{ form: "when", when: string } | { form: "range", from: string, to: string }} DateValue
 * @typedef {DateValue & { at: { from: number, to: number } }} ParsedDate the value and where its text stands in the input
 */

/** Patterns in the order they are tried, each turning a match into a value. */
const RULES = /** @type {[RegExp, (m: RegExpExecArray) => DateValue | null][]} */ ([
  // 4.–6. Mai 1935
  [new RegExp(`${DAY}${DASH}${DAY}\\s*${MONTH}\\s*${YEAR}`, "iu"), (m) => range(iso(+m[4], MONTHS[low(m[3])], +m[1]), iso(+m[4], MONTHS[low(m[3])], +m[2]))],
  // 1924–1926
  [new RegExp(`(?<!\\d)${YEAR}${DASH}${YEAR}`, "u"), (m) => range(iso(+m[1]), iso(+m[2]))],
  // 4. Januar 1935, 4.Januar 1935
  [new RegExp(`${DAY}\\s*${MONTH}\\s*${YEAR}`, "iu"), (m) => when(iso(+m[3], MONTHS[low(m[2])], +m[1]))],
  // 4.1.1935, 04.01.1935
  [new RegExp(`${DAY}\\s*(\\d{1,2})\\.\\s*${YEAR}`, "u"), (m) => when(iso(+m[3], +m[2], +m[1]))],
  // Mai 1924
  [new RegExp(`(?<![\\p{L}])${MONTH}\\s*${YEAR}`, "iu"), (m) => when(iso(+m[2], MONTHS[low(m[1])]))],
  // 1935
  [new RegExp(`(?<!\\d)${YEAR}`, "u"), (m) => when(iso(+m[1]))],
]);

const low = (/** @type {string} */ s) => /** @type {keyof typeof MONTHS} */ (s.toLowerCase());
/** @param {string} value @returns {DateValue | null} */
const when = (value) => (value ? { form: "when", when: value } : null);
/** @param {string} from @param {string} to @returns {DateValue | null} */
const range = (from, to) => (from && to && from <= to ? { form: "range", from, to } : null);

/**
 * The first date in a text, with the position of its words, or null when
 * there is none or the first recognised form is no real date.
 * @param {string} text
 * @returns {ParsedDate | null}
 */
export function parseDate(text) {
  for (const [pattern, read] of RULES) {
    const m = pattern.exec(text);
    if (!m) continue;
    // A form that is recognised but impossible, such as 31.2.1935, proposes
    // nothing rather than the year alone.
    const value = read(m);
    return value && { ...value, at: { from: m.index, to: m.index + m[0].length } };
  }
  return null;
}
