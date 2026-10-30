// The text view: the same CodeMirror state as the XML view, with the markup
// hidden. One document, one undo history, byte-exact saving: nothing is
// converted, the view only decides what is drawn. Tags become invisible atomic
// ranges, structure becomes layout (blocks, line breaks, page dividers),
// marked passages become styled spans, and open spots stay visible as open.
// Edits that would cut hidden markup are refused. The module knows TEI
// conventions through its configuration only, never an edition.

import { Decoration, EditorSelection, EditorState, EditorView, keymap, Prec, RangeSet, StateField, WidgetType } from "../vendor/codemirror/codemirror.js";

/**
 * @typedef {{
 *   root: string, lineBreak: string, pageBreak: string, blocks: string[],
 *   marks: Record<string, string>,
 *   badges: { pattern: string, text: string, tip: string }[],
 * }} TextViewConfig the part of the source configuration this module reads
 * @typedef {{
 *   openWork: (text: string) => { from: number, to: number, key: string }[],
 *   onRefuse: (message: string) => void,
 *   onPage: (pos: number) => void,
 *   onMarkKey: (mark: Mark) => void,
 * }} TextViewHooks how the view reaches the application
 * @typedef {{ name: string, attrs: string, openFrom: number, openTo: number, closeFrom: number, closeTo: number }} Mark
 * A marked passage: the element, its attribute text and the positions of its tags.
 * @typedef {{ deco: import("../vendor/codemirror/codemirror.js").DecorationSet, atomic: RangeSet<any>, hidden: { from: number, to: number }[], marks: Mark[], root: { from: number, to: number } | null }} Built
 */

export const REFUSED = "Hier liegt eine Auszeichnung; zum Entfernen die Markierung öffnen.";
const REFUSED_OUTSIDE = "Außerhalb des Haupttexts lässt sich in der Textansicht nichts ändern. Die XML-Ansicht zeigt den ganzen Quelltext.";

// Tags, comments, processing instructions, CDATA and text. Attribute values
// may hold ">" in either quote; a lone "<" is text, as a broken document has it.
const TOKEN = /<!--[\s\S]*?(?:-->|$)|<\?[\s\S]*?(?:\?>|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<(\/?)([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|[^<]+|</g;
// A whitespace run holding a line break is layout of the source, not text.
const LAYOUT = /[ \t\r\n]*\n[ \t\r\n]*/g;
const ENTITY = /&(#x[0-9a-fA-F]+|#\d+|[A-Za-z][\w.-]*);/g;
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

class Label extends WidgetType {
  /** @param {string} text @param {string} cls @param {string} [tip] @param {(() => void) | null} [onClick] */
  constructor(text, cls, tip = "", onClick = null) {
    super();
    this.text = text;
    this.cls = cls;
    this.tip = tip;
    this.onClick = onClick;
  }
  /** @param {Label} other */
  eq(other) {
    return other.text === this.text && other.cls === this.cls && other.tip === this.tip && !!other.onClick === !!this.onClick;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = this.cls;
    el.textContent = this.text;
    if (this.tip) el.title = this.tip;
    if (this.onClick) {
      const run = this.onClick;
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        run();
      });
    }
    return el;
  }
  /** @param {Event} e */
  ignoreEvent(e) {
    return !!this.onClick && e.type === "mousedown";
  }
}

/** @param {string} ref */
function decodeEntity(ref) {
  if (ref.startsWith("#x")) return String.fromCodePoint(Number.parseInt(ref.slice(2), 16));
  if (ref.startsWith("#")) return String.fromCodePoint(Number(ref.slice(1)));
  return NAMED[/** @type {keyof typeof NAMED} */ (ref)] ?? `&${ref};`;
}

/** The value of an attribute in an attribute text, or "". @param {string} attrs @param {string} name */
export const attributeOf = (attrs, name) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs)?.slice(1).find((v) => v !== undefined) ?? "";

/** Whether the shown part of a text carries explicit line breaks, which decides the default layout. @param {string} text @param {TextViewConfig} config */
export function hasLineBreaks(text, config) {
  const at = new RegExp(`<${config.root}[\\s>]`).exec(text)?.index ?? 0;
  return new RegExp(`<${config.lineBreak}[\\s/>]`).test(text.slice(at));
}

/**
 * Decorations, hidden ranges and marks of a document in a layout.
 * @param {EditorState} state @param {TextViewConfig} config @param {TextViewHooks} hooks @param {"lines" | "flow"} layout
 * @returns {Built}
 */
function build(state, config, hooks, layout) {
  const text = state.doc.toString();
  /** @type {import("../vendor/codemirror/codemirror.js").Range<Decoration>[]} */
  const decos = [];
  /** @type {{ from: number, to: number }[]} */
  const hidden = [];
  /** @type {Mark[]} */
  const marks = [];
  const hide = (/** @type {number} */ from, /** @type {number} */ to, /** @type {WidgetType | null} */ widget = null) => {
    if (to <= from && !widget) return;
    decos.push(Decoration.replace(widget ? { widget } : {}).range(from, to));
    hidden.push({ from, to });
  };
  const lineClass = (/** @type {number} */ pos, /** @type {string} */ cls) => decos.push(Decoration.line({ class: cls }).range(pos));

  const tokens = [...text.matchAll(TOKEN)];
  const rootOpen = tokens.find((t) => t[2] === config.root && !t[1]);
  let depth = 0;
  const rootClose = rootOpen
    ? tokens.find((t) => {
        if ((t.index ?? 0) <= (rootOpen.index ?? 0) || t[2] !== config.root) return false;
        if (!t[1] && !t[4]) depth++;
        else if (t[1]) return depth-- === 0;
        return false;
      })
    : undefined;
  if (!rootOpen || rootOpen[4]) {
    hide(0, text.length, new Label(`Kein <${config.root}> gefunden; die XML-Ansicht zeigt den Quelltext.`, "tv-head"));
    return finish(decos, hidden, marks, null);
  }
  const start = (rootOpen.index ?? 0) + rootOpen[0].length;
  const end = rootClose ? (rootClose.index ?? text.length) : text.length;

  // The run of hidden things between two visible pieces of text.
  /** @type {{ from: number, to: number, tags: RegExpMatchArray[], layout: boolean } | null} */
  let gap = { from: 0, to: start, tags: [], layout: false };
  let lastVisible = "";
  let first = true;
  /** @type {{ name: string, attrs: string, openFrom: number, openTo: number }[]} */
  const stack = [];

  /** Keeps a source line break inside a gap; the rest of the gap is hidden. */
  const flush = (/** @type {boolean} */ atStart) => {
    if (!gap) return;
    const g = gap;
    gap = null;
    const newlines = [];
    for (let i = g.from; i < g.to; i++) if (text.charCodeAt(i) === 10) newlines.push(i);
    const pages = g.tags.filter((t) => t[2] === config.pageBreak && !t[1]);
    const block = atStart || g.tags.some((t) => config.blocks.includes(/** @type {string} */ (t[2])));
    const lb = g.tags.some((t) => t[2] === config.lineBreak && !t[1]);
    /** @type {{ at: number, line: string }[]} kept line breaks with the class of the line after them */
    const keep = [];
    /** @type {{ from: number, to: number, widget: WidgetType }[]} */
    const widgets = [];
    if (pages.length) {
      let cursor = g.from;
      for (const pb of pages) {
        const at = pb.index ?? 0;
        const before = newlines.filter((n) => n >= cursor && n < at).at(-1);
        if (before !== undefined) keep.push({ at: before, line: "tv-page-line" });
        const n = attributeOf(pb[3], "n");
        widgets.push({ from: at, to: at + pb[0].length, widget: new Label(n ? `Seite ${n}` : "Seite", "tv-page", "Seitenumbruch. Klick zeigt die Seite im Faksimile; die Attribute stehen in der XML-Ansicht.", () => hooks.onPage(at)) });
        cursor = at + pb[0].length;
      }
      const after = newlines.filter((n) => n >= cursor).at(-1);
      if (after !== undefined) keep.push({ at: after, line: "tv-block-start" });
    } else if (block || (lb && layout === "lines")) {
      const last = newlines.at(-1);
      if (last !== undefined) keep.push({ at: last, line: block ? "tv-block-start" : "" });
      else widgets.push({ from: g.from, to: g.to, widget: new Label("", "tv-break") });
    } else if (lb || g.layout) {
      // A word divided at the line end keeps its hyphen and joins the next line.
      widgets.push({ from: g.from, to: g.to, widget: new Label(lb && /[-¬]$/.test(lastVisible) ? "" : " ", "tv-space") });
    }
    if (atStart && g.to > g.from) {
      // The header gives way to a quiet note on its own line.
      const first = keep[0]?.at ?? g.to;
      widgets.unshift({ from: 0, to: Math.min(first, start), widget: new Label("Kopfdaten und Faksimile-Liste stehen in der XML-Ansicht.", "tv-head") });
    }
    // Hide everything in the gap except the kept breaks, with widgets in their place.
    const cuts = [...keep.map((k) => ({ from: k.at, to: k.at + 1, widget: null })), ...widgets].sort((a, b) => a.from - b.from);
    let at = g.from;
    for (const c of cuts) {
      if (c.from > at) hide(at, c.from);
      if (c.widget) hide(c.from, c.to, c.widget);
      at = Math.max(at, c.to);
    }
    if (g.to > at) hide(at, g.to);
    for (const k of keep) if (k.line) lineClass(k.at + 1, k.line);
  };

  /** @param {number} from @param {number} to */
  const visible = (from, to) => {
    flush(first);
    first = false;
    // Character references show as their character.
    for (const m of text.slice(from, to).matchAll(ENTITY)) {
      const at = from + (m.index ?? 0);
      hide(at, at + m[0].length, new Label(decodeEntity(m[1]), "tv-entity"));
    }
    lastVisible = text.slice(Math.max(from, to - 1), to);
  };
  /** @param {number} from @param {number} to @param {RegExpMatchArray | null} tag */
  const hidePiece = (from, to, tag, layoutSpace = false) => {
    gap ??= { from, to, tags: [], layout: false };
    gap.to = to;
    if (tag) gap.tags.push(tag);
    if (layoutSpace) gap.layout = true;
  };

  for (const t of tokens) {
    const from = t.index ?? 0;
    const to = from + t[0].length;
    if (to <= start || from >= end) continue;
    if (t[2]) {
      hidePiece(from, to, t);
      const name = t[2];
      if (!(name in config.marks)) continue;
      if (!t[1] && !t[4]) stack.push({ name, attrs: t[3], openFrom: from, openTo: to });
      else if (t[1]) {
        const i = stack.findLastIndex((s) => s.name === name);
        if (i >= 0) {
          const open = stack.splice(i)[0];
          marks.push({ ...open, closeFrom: from, closeTo: to });
        }
      }
      continue;
    }
    if (t[0].startsWith("<") && t[0].length > 1) {
      hidePiece(from, to, null);
      continue;
    }
    // Text: layout whitespace joins the gap, the rest is visible.
    let at = from;
    for (const m of t[0].matchAll(LAYOUT)) {
      const s = from + (m.index ?? 0);
      if (s > at) visible(at, s);
      hidePiece(s, s + m[0].length, null, true);
      at = s + m[0].length;
    }
    if (to > at) visible(at, to);
  }
  // The end of the shown part to the end of the document.
  if (gap) {
    gap.to = text.length;
    const g = gap;
    gap = null;
    hide(g.from, g.to);
  } else hide(end, text.length);

  for (const m of marks) {
    if (m.closeFrom <= m.openTo) continue;
    const unlinked = (m.name === "persName" || m.name === "placeName") && !attributeOf(m.attrs, "ref");
    decos.push(Decoration.mark({ class: `tv-mark tv-el-${m.name}${unlinked ? " tv-unlinked" : ""}`, attributes: { "data-el": m.name } }).range(m.openTo, m.closeFrom));
  }
  // Open spots: orange, with badges in place of their marker where configured.
  const badges = config.badges.map((b) => ({ ...b, re: new RegExp(b.pattern, "g") }));
  const isHidden = (/** @type {number} */ a, /** @type {number} */ b) => hidden.some((h) => h.from < b && h.to > a);
  for (const spot of hooks.openWork(text)) {
    if (spot.from < start || spot.to > end) continue;
    decos.push(Decoration.mark({ class: `tv-open tv-open-${spot.key}` }).range(spot.from, spot.to));
    for (const b of badges) {
      for (const m of text.slice(spot.from, spot.to).matchAll(b.re)) {
        const a = spot.from + (m.index ?? 0);
        if (!isHidden(a, a + m[0].length)) hide(a, a + m[0].length, new Label(b.text, "tv-badge", b.tip));
      }
    }
  }
  return finish(decos, hidden, marks, { from: start, to: end });
}

/** @param {any[]} decos @param {{ from: number, to: number }[]} hidden @param {Mark[]} marks @param {{ from: number, to: number } | null} root */
function finish(decos, hidden, marks, root) {
  const replaced = hidden.filter((h) => h.to > h.from).sort((a, b) => a.from - b.from);
  return {
    deco: Decoration.set(decos, true),
    atomic: RangeSet.of(replaced.map((h) => Decoration.replace({}).range(h.from, h.to)), true),
    hidden: replaced,
    marks,
    root,
  };
}

/**
 * Whether deleting a range keeps the markup whole: no hidden range is cut,
 * and the tags inside form complete elements.
 * @param {string} slice @param {number} from @param {number} to @param {Built} built
 */
function deletionKeepsMarkup(slice, from, to, built) {
  if (built.hidden.some((h) => (h.from < from && h.to > from) || (h.from < to && h.to > to))) return false;
  const stack = [];
  for (const t of slice.matchAll(TOKEN)) {
    if (!t[2]) {
      if (t[0] === "<") return false;
      continue;
    }
    if (t[4]) continue;
    if (!t[1]) stack.push(t[2]);
    else if (stack.pop() !== t[2]) return false;
  }
  return stack.length === 0;
}

/** A source slice as plain text: tags dropped, references resolved, source indentation gone. @param {string} text */
export const plainText = (text) =>
  text
    .replace(/<[^>]*>/g, "")
    .replace(LAYOUT, "\n")
    .replace(ENTITY, (_, ref) => decodeEntity(ref))
    .trim();

const escapeText = (/** @type {string} */ s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The text view as an editor extension in one layout, with the functions the
 * application needs to work with it.
 * @param {TextViewConfig} config @param {TextViewHooks} hooks @param {"lines" | "flow"} layout
 */
export function textView(config, hooks, layout) {
  const field = StateField.define({
    create: (state) => build(state, config, hooks, layout),
    update: (value, tr) => (tr.docChanged ? build(tr.state, config, hooks, layout) : value),
    provide: (f) => [EditorView.decorations.from(f, (v) => v.deco), EditorView.atomicRanges.of((view) => view.state.field(f).atomic)],
  });

  const info = (/** @type {EditorState} */ state) => state.field(field, false) ?? null;

  /** The innermost marked passage around a position. @param {EditorState} state @param {number} pos */
  const markAt = (state, pos) => {
    const built = info(state);
    if (!built) return null;
    return built.marks.filter((m) => m.openTo <= pos && pos <= m.closeFrom).sort((a, b) => b.openTo - a.openTo)[0] ?? null;
  };

  // Typing and pasting insert text, never markup, and nothing that would cut
  // hidden markup or reach outside the shown part. Annotation actions, undo
  // and the application's own edits carry no such user event and pass.
  const guard = EditorState.transactionFilter.of((tr) => {
    const built = info(tr.startState);
    if (!built) return tr;
    if (!tr.docChanged) {
      // A caret at the start of a hidden line start (indentation and <lb/>)
      // belongs after it, where typing continues the line's text.
      if (!tr.selection || tr.selection.ranges.length !== 1 || !tr.selection.main.empty) return tr;
      const pos = tr.selection.main.head;
      const h = built.hidden.find((x) => x.from === pos && tr.startState.doc.lineAt(pos).from === pos);
      return h ? [tr, { selection: EditorSelection.cursor(h.to), sequential: true }] : tr;
    }
    if (!(tr.isUserEvent("input") || tr.isUserEvent("delete") || tr.isUserEvent("move"))) return tr;
    let refusal = "";
    /** @type {{ from: number, to: number, insert: string }[]} */
    const changes = [];
    let escaped = false;
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      if (refusal) return;
      const root = built.root;
      if (!root || fromA < root.from || toA > root.to) {
        refusal = REFUSED_OUTSIDE;
        return;
      }
      if (toA > fromA && !deletionKeepsMarkup(tr.startState.sliceDoc(fromA, toA), fromA, toA, built)) {
        refusal = REFUSED;
        return;
      }
      if (fromA === toA && built.hidden.some((h) => h.from < fromA && fromA < h.to)) {
        refusal = REFUSED;
        return;
      }
      const raw = inserted.toString();
      // Dragging a passage with its markup would turn the tags into text.
      if (tr.isUserEvent("move") && /[<>&]/.test(raw)) {
        refusal = REFUSED;
        return;
      }
      const safe = tr.isUserEvent("input.linebreak") ? raw : escapeText(raw);
      if (safe !== raw) escaped = true;
      changes.push({ from: fromA, to: toA, insert: safe });
    });
    if (refusal) {
      queueMicrotask(() => hooks.onRefuse(refusal));
      return [];
    }
    if (!escaped) return tr;
    // The caret goes after the last insertion, counted in the new document.
    let shift = 0;
    for (const c of changes.slice(0, -1)) shift += c.insert.length - (c.to - c.from);
    const last = /** @type {{ from: number, to: number, insert: string }} */ (changes.at(-1));
    return { changes, selection: EditorSelection.cursor(last.from + shift + last.insert.length), userEvent: "input.type", scrollIntoView: true };
  });

  /** Enter on a marked passage opens its card; elsewhere it starts a new line of the transcription. */
  const enter = (/** @type {EditorView} */ view) => {
    const { state } = view;
    const sel = state.selection.main;
    const mark = sel.empty ? markAt(state, sel.head) : null;
    if (mark) {
      hooks.onMarkKey(mark);
      return true;
    }
    const line = state.doc.lineAt(sel.from);
    const indent = /^[ \t]*/.exec(line.text)?.[0] ?? "";
    const insert = `${state.lineBreak}${indent}<${config.lineBreak}/>`;
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert }, selection: { anchor: sel.from + insert.length }, userEvent: "input.linebreak", scrollIntoView: true });
    return true;
  };

  return {
    extension: [
      field,
      guard,
      Prec.high(keymap.of([{ key: "Enter", run: enter }])),
      EditorView.lineWrapping,
      // Copying gives the text as read, without tags and source indentation.
      EditorView.clipboardOutputFilter.of((text) => plainText(text)),
      EditorView.editorAttributes.of({ class: `cm-textview cm-textview-${layout}` }),
      EditorView.contentAttributes.of({ "aria-label": "Text ohne Auszeichnungen" }),
    ],
    info,
    markAt,
    /** The first position after a hidden range around pos, so a caret lands in visible text. @param {EditorState} state @param {number} pos */
    visiblePos(state, pos) {
      const h = info(state)?.hidden.find((x) => x.from < pos && pos < x.to) ?? info(state)?.hidden.find((x) => x.from === 0 && pos === 0);
      return h ? h.to : pos;
    },
  };
}
