// Dates in running text, proposed as ISO values for TEI date attributes. The
// parser finds the date part of a selection and reads it as an exact or
// partial date (YYYY, YYYY-MM, YYYY-MM-DD), a range or a window; anything else
// is left to the user. German, English and French forms are read, as the
// letters of an edition mix them. A date the text leaves incomplete, such as
// „am 10.“, „8.Oktober“, „27.6.44“ or „im Herbst“, is completed from the date
// of the document when one is given, and reported as inferred. Nothing here
// knows an edition.

const MONTHS = {
  januar: 1, jänner: 1, jaenner: 1, jan: 1, january: 1, janvier: 1, janv: 1,
  februar: 2, feber: 2, feb: 2, febr: 2, february: 2, février: 2, fevrier: 2, févr: 2,
  märz: 3, maerz: 3, mär: 3, mrz: 3, march: 3, mar: 3, mars: 3,
  april: 4, apr: 4, avril: 4,
  mai: 5, may: 5,
  juni: 6, jun: 6, june: 6, juin: 6,
  juli: 7, jul: 7, july: 7, juillet: 7,
  august: 8, aug: 8, août: 8, aout: 8,
  september: 9, sept: 9, sep: 9, septembre: 9,
  oktober: 10, okt: 10, october: 10, oct: 10, octob: 10, octobre: 10,
  november: 11, nov: 11, novembre: 11,
  dezember: 12, dez: 12, december: 12, dec: 12, décembre: 12, decembre: 12, déc: 12,
};
const ROMANS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
/** Meteorological months of the seasons; winter runs into the next year. */
const SEASONS = {
  frühling: 3, frühjahr: 3, spring: 3, printemps: 3,
  sommer: 6, summer: 6, été: 6,
  herbst: 9, autumn: 9, fall: 9, automne: 9,
  winter: 12, hiver: 12,
};
const RELATIVE = { vorgestern: -2, gestern: -1, heute: 0, morgen: 1, übermorgen: 2, yesterday: -1, today: 0, tomorrow: 1, hier: -1, aujourd: 0, demain: 1 };

const alternatives = (/** @type {object} */ table) => Object.keys(table).sort((a, b) => b.length - a.length).join("|");
const MONTH = `(${alternatives(MONTHS)})\\.?(?![\\p{L}])`;
const ROMAN = `(${alternatives(ROMANS)})(?![\\p{L}])\\.?`;
const SEASON = `(?<![\\p{L}])(${alternatives(SEASONS)})(?![\\p{L}])`;
const YEAR = "(\\d{4})(?!\\d)";
const SHORT_YEAR = "(?<!\\d)(\\d{2})(?![\\d.])";
const DAY = "(?<!\\d)(\\d{1,2})\\.";
/** A day before a month name: with a dot, an ordinal ending or nothing. */
const DAY_NAMED = "(?<![\\d.])(\\d{1,2})(?:st|nd|rd|th|er)?\\.?";
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
 * @typedef {{ form: "when", when: string } | { form: "range", from: string, to: string } | { form: "span", notBefore: string, notAfter: string }} DateValue
 * @typedef {DateValue & { inferred?: boolean }} ReadDate
 * @typedef {ReadDate & { at: { from: number, to: number } }} ParsedDate the value, whether it was completed from the document date, and where its text stands in the input
 * @typedef {{ year: number, month?: number, day?: number }} DateContext the date of the document
 */

const low = (/** @type {string} */ s) => s.toLowerCase();
const month = (/** @type {string} */ s) => MONTHS[/** @type {keyof typeof MONTHS} */ (low(s))];
const roman = (/** @type {string} */ s) => ROMANS[/** @type {keyof typeof ROMANS} */ (low(s))];
/** @param {string} value @returns {ReadDate | null} */
const when = (value) => (value ? { form: "when", when: value } : null);
/** @param {string} from @param {string} to @returns {ReadDate | null} */
const range = (from, to) => (from && to && from <= to ? { form: "range", from, to } : null);
/** @param {ReadDate | null} value */
const inferred = (value) => value && { ...value, inferred: true };

/** A two-digit year in the century of the document. @param {string} yy @param {DateContext} ctx */
const century = (yy, ctx) => Math.floor(ctx.year / 100) * 100 + Number(yy);

/** The window of a season of a year. @param {string} name @param {number} y @returns {ReadDate | null} */
function season(name, y) {
  const first = SEASONS[/** @type {keyof typeof SEASONS} */ (low(name))];
  const lastYear = first === 12 ? y + 1 : y;
  const last = first === 12 ? 2 : first + 2;
  return { form: "span", notBefore: iso(y, first), notAfter: iso(lastYear, last) };
}

/**
 * Patterns in the order they are tried, each turning a match into a value.
 * The forms with their year come first; the forms that need the document date
 * follow and are skipped without one.
 * @type {[RegExp, (m: RegExpExecArray, ctx: DateContext | null) => ReadDate | null | undefined][]}
 * a reader returns undefined when it needs a document date it was not given
 */
const RULES = [
  // 4.–6. Mai 1935
  [new RegExp(`${DAY}${DASH}${DAY}\\s*${MONTH}\\s*${YEAR}`, "iu"), (m) => range(iso(+m[4], month(m[3]), +m[1]), iso(+m[4], month(m[3]), +m[2]))],
  // 1924–1926
  [new RegExp(`(?<!\\d)${YEAR}${DASH}${YEAR}`, "u"), (m) => range(iso(+m[1]), iso(+m[2]))],
  // 1935-01-04
  [/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/u, (m) => when(iso(+m[1], +m[2], +m[3]))],
  // 4. Januar 1935, 4.Januar 1935, 3 Juni 1936, 29th June, 1934, 10 Juillet 1939
  [new RegExp(`${DAY_NAMED}\\s*(?:of\\s+|de\\s+)?${MONTH},?\\s*${YEAR}`, "iu"), (m) => when(iso(+m[3], month(m[2]), +m[1]))],
  // June 6th. 1944, October 31, 1938
  [new RegExp(`(?<![\\p{L}])${MONTH}\\s*(\\d{1,2})(?:st|nd|rd|th)?\\.?,?\\s*${YEAR}`, "iu"), (m) => when(iso(+m[3], month(m[1]), +m[2]))],
  // 18.VI.1930, 15. III 1940
  [new RegExp(`${DAY}\\s*${ROMAN}\\s*${YEAR}`, "iu"), (m) => when(iso(+m[3], roman(m[2]), +m[1]))],
  // 4.1.1935, 04.01.1935
  [new RegExp(`${DAY}\\s*(\\d{1,2})\\.\\s*${YEAR}`, "u"), (m) => when(iso(+m[3], +m[2], +m[1]))],
  // Spring 1944, Herbst 1935
  [new RegExp(`${SEASON}\\s*${YEAR}`, "iu"), (m) => season(m[1], +m[2])],
  // Mai 1924
  [new RegExp(`(?<![\\p{L}])${MONTH}\\s*${YEAR}`, "iu"), (m) => when(iso(+m[2], month(m[1])))],
  // 1935
  [new RegExp(`(?<!\\d)${YEAR}`, "u"), (m) => when(iso(+m[1]))],
  // 27.6.44, 6.I.36, 5. Februar 25, 23/11. 16: the century of the document
  [new RegExp(`${DAY}\\s*(\\d{1,2})\\.\\s*${SHORT_YEAR}`, "u"), (m, ctx) => !ctx ? undefined : inferred(when(iso(century(m[3], ctx), +m[2], +m[1])))],
  [new RegExp(`${DAY}\\s*${ROMAN}\\s*${SHORT_YEAR}`, "iu"), (m, ctx) => !ctx ? undefined : inferred(when(iso(century(m[3], ctx), roman(m[2]), +m[1])))],
  [new RegExp(`${DAY_NAMED}\\s*${MONTH}\\s*${SHORT_YEAR}`, "iu"), (m, ctx) => !ctx ? undefined : inferred(when(iso(century(m[3], ctx), month(m[2]), +m[1])))],
  [/(?<!\d)(\d{1,2})\/(\d{1,2})\.?\s*(\d{2})(?![\d.])/u, (m, ctx) => !ctx ? undefined : inferred(when(iso(century(m[3], ctx), +m[2], +m[1])))],
  // vom 5. ds. (dieses Monats): the month of the document
  [new RegExp(`${DAY}\\s*ds\\.`, "iu"), (m, ctx) => (ctx?.month ? inferred(when(iso(ctx.year, ctx.month, +m[1]))) : undefined)],
  // 8.Oktober, du 6 Juillet, 25. II, 27.9.: the year of the document
  [new RegExp(`${DAY_NAMED}\\s*${MONTH}`, "iu"), (m, ctx) => !ctx ? undefined : inferred(when(iso(ctx.year, month(m[2]), +m[1])))],
  [new RegExp(`${DAY}\\s*${ROMAN}`, "iu"), (m, ctx) => !ctx ? undefined : inferred(when(iso(ctx.year, roman(m[2]), +m[1])))],
  [new RegExp(`${DAY}\\s*(\\d{1,2})\\.(?!\\s*\\d)`, "u"), (m, ctx) => !ctx ? undefined : inferred(when(iso(ctx.year, +m[2], +m[1])))],
  // im Herbst, über den Winter
  [new RegExp(SEASON, "iu"), (m, ctx) => !ctx ? undefined : inferred(season(m[1], ctx.year))],
  // in Februar, im Jänner
  [new RegExp(`(?<![\\p{L}])${MONTH}`, "iu"), (m, ctx) => !ctx ? undefined : inferred(when(iso(ctx.year, month(m[1]))))],
  // gestern, heute: only from a document dated to the day
  [new RegExp(`(?<![\\p{L}])(${alternatives(RELATIVE)})(?![\\p{L}])`, "iu"), (m, ctx) => {
    if (!ctx?.day || !ctx.month) return undefined;
    const d = new Date(Date.UTC(ctx.year, ctx.month - 1, ctx.day + RELATIVE[/** @type {keyof typeof RELATIVE} */ (low(m[1]))]));
    return inferred(when(iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())));
  }],
  // am 10., den 10: a selection that is a day alone, in the month of the document
  [/^\s*(?:am|den|vom|le|du)?\s*(\d{1,2})\.?\s*$/iu, (m, ctx) => (ctx?.month ? inferred(when(iso(ctx.year, ctx.month, +m[1]))) : undefined)],
];

/**
 * The document date as a context for incomplete dates, from an ISO value.
 * @param {string | null | undefined} value e.g. 1935-01-04
 * @returns {DateContext | null}
 */
export function dateContext(value) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value ?? "");
  return m ? { year: +m[1], ...(m[2] && { month: +m[2] }), ...(m[3] && { day: +m[3] }) } : null;
}

/**
 * The first date in a text, with the position of its words, or null when
 * there is none or the first recognised form is no real date. Markup in the
 * text, such as a line break inside the selection, is read as space.
 * @param {string} text
 * @param {DateContext | null} [ctx] the date of the document, for incomplete dates
 * @returns {ParsedDate | null}
 */
export function parseDate(text, ctx = null) {
  const plain = text.replace(/<[^>]*>/g, (tag) => " ".repeat(tag.length));
  for (const [pattern, read] of RULES) {
    const m = pattern.exec(plain);
    if (!m) continue;
    const value = read(m, ctx);
    // A form that needs the document date is passed over without one.
    if (value === undefined) continue;
    // A form that is recognised but impossible, such as 31.2.1935, proposes
    // nothing rather than a coarser value.
    return value && { ...value, at: { from: m.index, to: m.index + m[0].length } };
  }
  return null;
}
