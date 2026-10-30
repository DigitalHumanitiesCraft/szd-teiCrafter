// The XML code editor: CodeMirror 6 from the vendored bundle, configured for
// TEI work. Diagnostics come from outside (well-formedness, schema), so the
// editor only displays them and never runs a check of its own.

import {
  autocompletion,
  bracketMatching,
  closeBrackets,
  closeBracketsKeymap,
  Compartment,
  Decoration,
  completionKeymap,
  defaultKeymap,
  drawSelection,
  EditorState,
  EditorView,
  foldGutter,
  foldKeymap,
  HighlightStyle,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSelectionMatches,
  highlightSpecialChars,
  history,
  historyKeymap,
  indentOnInput,
  indentWithTab,
  keymap,
  lineNumbers,
  lintGutter,
  RangeSetBuilder,
  searchKeymap,
  setDiagnostics,
  syntaxHighlighting,
  tags,
  ViewPlugin,
  xml,
} from "../vendor/codemirror/codemirror.js";

const highlight = HighlightStyle.define([
  { tag: tags.tagName, color: "var(--blue)", fontWeight: "600" },
  { tag: tags.angleBracket, color: "var(--hl-punct)" },
  { tag: tags.attributeName, color: "var(--orange)" },
  { tag: tags.attributeValue, color: "var(--hl-value)" },
  { tag: [tags.character, tags.special(tags.string)], color: "var(--orange)", fontWeight: "600" },
  { tag: [tags.comment, tags.blockComment], color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: [tags.processingInstruction, tags.documentMeta], color: "var(--hl-comment)" },
]);

// CodeMirror injects its base styles unlayered, so they beat the app's layered
// CSS; colours inside the editor therefore come through its own theme.
const chrome = EditorView.theme({
  "&": { color: "var(--text)", backgroundColor: "var(--surface)" },
  ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.5" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--muted)", borderRight: "1px solid var(--line)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "color-mix(in oklch, var(--blue) 9%, transparent)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--text)" },
  // The drawn selection layer carries the colour; its selector matches the base
  // theme's specificity, which would otherwise keep its own lavender. The native
  // selection stays invisible, so the text keeps its highlighting colours.
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklch, var(--blue) 38%, transparent)",
    borderRadius: "2px",
  },
  ".cm-line ::selection, .cm-line::selection": { backgroundColor: "transparent", color: "inherit" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in oklch, var(--orange) 22%, transparent)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--blue) 20%, transparent)", outline: "none" },
  ".cm-tooltip, .cm-panels": { backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--blue)", color: "var(--bg)" },
  ".cm-panels input, .cm-panels button": { color: "var(--text)" },

  // The text view (js/textview.js): a reading measure in a text face, markup
  // drawn as underlines and badges. Line decorations use padding, because
  // CodeMirror measures line heights without margins.
  "&.cm-textview .cm-content": {
    fontFamily: "var(--font-text)",
    fontSize: "1.12em",
    lineHeight: "1.6",
    maxWidth: "70ch",
    marginInline: "auto",
    paddingBlock: "1.25rem 3rem",
    paddingInline: "1.25rem",
  },
  "&.cm-textview .cm-line": { paddingInline: "0" },
  ".tv-block-start": { paddingTop: "0.75em" },
  // Widgets stay inline: CodeMirror puts buffers beside a widget, which would
  // add an empty line after a block. The page line draws its own hairline.
  ".tv-page-line": {
    paddingTop: "0.9em",
    paddingBottom: "0.2em",
    textAlign: "center",
    background: "linear-gradient(var(--line), var(--line)) no-repeat 0 calc(50% + 0.35em) / 100% 1px",
  },
  ".tv-page": {
    paddingInline: "0.75em",
    fontFamily: "var(--font-ui)",
    fontSize: "0.78rem",
    color: "var(--muted)",
    backgroundColor: "var(--surface)",
    cursor: "pointer",
  },
  ".tv-head": { fontFamily: "var(--font-ui)", fontSize: "0.8rem", fontStyle: "italic", color: "var(--muted)" },
  ".tv-break": { display: "block" },
  ".tv-mark": { textUnderlineOffset: "0.22em", textDecorationThickness: "2px" },
  ".tv-el-persName": { textDecorationLine: "underline", textDecorationColor: "var(--blue)" },
  ".tv-el-placeName": { textDecorationLine: "underline", textDecorationStyle: "double", textDecorationColor: "var(--blue)", textDecorationThickness: "1px" },
  ".tv-el-date": { textDecorationLine: "underline", textDecorationColor: "var(--muted)", textDecorationThickness: "1px" },
  ".tv-unlinked": { textDecorationColor: "var(--muted)" },
  ".tv-el-del": { textDecorationLine: "line-through", textDecorationThickness: "1px" },
  ".tv-el-add": { position: "relative", top: "-0.45em", fontSize: "0.85em" },
  ".tv-el-unclear": { textDecorationLine: "underline", textDecorationStyle: "dotted", textDecorationColor: "var(--text)" },
  // Orange always means still open in the text view.
  ".tv-open": {
    textDecorationLine: "underline",
    textDecorationStyle: "dashed",
    textDecorationColor: "var(--orange)",
    textDecorationThickness: "2px",
    textUnderlineOffset: "0.22em",
    backgroundColor: "color-mix(in oklch, var(--orange) 10%, transparent)",
  },
  ".tv-open-remark": { fontStyle: "italic" },
  ".tv-badge": {
    display: "inline-block",
    marginInline: "0.15em",
    paddingInline: "0.35em",
    borderRadius: "999px",
    border: "1px solid var(--orange)",
    color: "var(--orange)",
    fontFamily: "var(--font-ui)",
    fontSize: "0.75em",
    fontWeight: "600",
    lineHeight: "1.4",
    verticalAlign: "0.1em",
  },
});

// Wrapped continuation lines hang two columns under the start of their own
// line's content, so nested markup keeps its shape when a long line wraps.
// The first visual line keeps its place (padding and negative indent cancel).
const lineIndent = new Map();
/** @param {number} columns */
function indentDecoration(columns) {
  if (!lineIndent.has(columns)) {
    const hang = columns + 2;
    lineIndent.set(columns, Decoration.line({ attributes: { style: `padding-left: calc(${hang}ch + 6px); text-indent: -${hang}ch` } }));
  }
  return lineIndent.get(columns);
}
/** @param {EditorView} view */
function hangingDecorations(view) {
  const builder = new RangeSetBuilder();
  const tab = view.state.tabSize;
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to; ) {
      const line = view.state.doc.lineAt(pos);
      const lead = /^[ 	]*/.exec(line.text)[0];
      const columns = [...lead].reduce((n, c) => n + (c === "	" ? tab : 1), 0);
      builder.add(line.from, line.from, indentDecoration(columns));
      pos = line.to + 1;
    }
  }
  return builder.finish();
}
const hangingIndent = ViewPlugin.fromClass(
  class {
    /** @param {EditorView} view */
    constructor(view) {
      this.decorations = hangingDecorations(view);
    }
    /** @param {import("../vendor/codemirror/codemirror.js").ViewUpdate} u */
    update(u) {
      if (u.docChanged || u.viewportChanged) this.decorations = hangingDecorations(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

// German interface strings for search, folding and diagnostics.
const germanPhrases = EditorState.phrases.of({
  Find: "Suchen",
  Replace: "Ersetzen",
  next: "weiter",
  previous: "zurück",
  all: "alle",
  "match case": "Groß/klein",
  "by word": "ganzes Wort",
  regexp: "regulärer Ausdruck",
  replace: "ersetzen",
  "replace all": "alle ersetzen",
  close: "schließen",
  "current match": "aktueller Treffer",
  "on line": "in Zeile",
  "replaced match on line $": "Treffer in Zeile $ ersetzt",
  "replaced $ matches": "$ Treffer ersetzt",
  "Go to line": "Gehe zu Zeile",
  go: "los",
  "Folded lines": "Eingeklappte Zeilen",
  "Unfold line": "Zeile ausklappen",
  "Fold line": "Zeile einklappen",
  Diagnostics: "Befunde",
  "No diagnostics": "Keine Befunde",
});

const ZOOM_STEPS = [70, 80, 90, 100, 110, 125, 140, 160, 180, 200];

// CodeMirror splits inserted text only at the configured separator, so an LF
// pasted into a CRLF document, or a CR into an LF one, would stay inside a line
// as a bare character and be saved that way. Inserted line breaks therefore
// take the document's separator. Undo and redo restore earlier text as it was,
// including the line ends of a file opened with mixed endings.
export const sameLineBreaks = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.isUserEvent("undo") || tr.isUserEvent("redo")) return tr;
  const separator = tr.startState.lineBreak;
  /** @type {{ from: number, to: number, insert: string }[]} */
  const fixes = [];
  tr.changes.iterChanges((_fromA, _toA, fromB, _toB, inserted) => {
    const lines = [...inserted.iterLines()];
    let pos = fromB;
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/\r\n|\r|\n/g)) {
        const at = pos + (m.index ?? 0);
        // In an LF document a CR before a real break is the rest of a CRLF.
        const trailing = separator === "\n" && m[0] === "\r" && at + 1 === pos + line.length && i < lines.length - 1;
        fixes.push({ from: at, to: at + m[0].length, insert: trailing ? "" : separator });
      }
      pos += line.length + 1;
    });
  });
  return fixes.length ? [tr, { changes: fixes, sequential: true }] : tr;
});

/**
 * Line endings of a text: the separator the editor uses is the majority, and
 * the counts tell whether the file mixes them.
 * @param {string} text
 */
export function lineEndings(text) {
  const crlf = text.match(/\r\n/g)?.length ?? 0;
  const lf = (text.match(/\n/g)?.length ?? 0) - crlf;
  const cr = text.match(/\r(?!\n)/g)?.length ?? 0;
  return { separator: crlf > lf ? "\r\n" : "\n", crlf, lf, cr, mixed: [crlf, lf, cr].filter(Boolean).length > 1 };
}

/** What the XML view shows besides the text: gutters, the active line and the hanging indent. */
const xmlChrome = [lineNumbers(), foldGutter(), lintGutter(), highlightActiveLineGutter(), highlightActiveLine(), hangingIndent];

/**
 * @typedef {{ message: string, line: number, column: number, severity?: "error" | "warning" }} Problem
 * @param {HTMLElement} parent
 * @param {{ elements: any[], keys: { key: string, run: () => boolean }[], onChange: (text: string) => void, onCaret: (offset: number) => void, onZoom: (percent: number) => void, onScroll: () => void, onPointerSelect: () => void }} options
 */
export function createEditor(parent, { elements, keys, onChange, onCaret, onZoom, onScroll, onPointerSelect }) {
  const wrapping = new Compartment();
  const fontSize = new Compartment();
  // XML chrome or the text view; both work on the same state and history.
  const presentation = new Compartment();
  /** @type {any} */
  let shown = xmlChrome;
  let zoom = 100;
  // Letters are prose, so long lines wrap by default and nothing hides at the right edge.
  let wrapped = true;

  const sizeTheme = (/** @type {number} */ percent) =>
    EditorView.theme({ "&": { fontSize: `${(0.9 * percent) / 100}rem` } });

  /**
   * A fresh state per document, so undo history and diagnostics never reach
   * across documents; the view settings carry over.
   * @param {string} doc @param {string} separator
   */
  const stateFor = (doc, separator) =>
    EditorState.create({
      doc,
      extensions: [
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        syntaxHighlighting(highlight),
        chrome,
        germanPhrases,
        xml({ elements, autoCloseTags: true }),
        EditorState.tabSize.of(2),
        // The document keeps the line endings of the opened file, so saving changes
        // no byte the user did not edit, whatever platform the file came from.
        EditorState.lineSeparator.of(separator),
        sameLineBreaks,
        // A line break of the minority kind in a mixed file stays inside a
        // line; it is drawn as a marked placeholder instead of breaking it.
        highlightSpecialChars({ specialChars: /[\r\n]/g }),
        wrapping.of(wrapped ? EditorView.lineWrapping : []),
        fontSize.of(sizeTheme(zoom)),
        // Application commands first, so they win over defaults with the same key.
        keymap.of(keys),
        presentation.of(shown),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({ "aria-label": "TEI-Quelltext", spellcheck: "false" }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.sliceDoc());
          if (u.selectionSet || u.docChanged) onCaret(u.state.selection.main.head);
        }),
        // Ctrl + mouse wheel zooms the code only, not the page.
        EditorView.domEventHandlers({
          // The action menu follows a selection made with the pointer, not
          // every selection change (search, undo, keyboard movement).
          mouseup() {
            setTimeout(onPointerSelect, 0);
            return false;
          },
          wheel(event) {
            if (!event.ctrlKey) return false;
            event.preventDefault();
            api.zoomBy(event.deltaY < 0 ? 1 : -1);
            return true;
          },
        }),
      ],
    });

  const view = new EditorView({ parent, state: stateFor("", "\n") });

  // Scroll events do not bubble, so they are taken from the scroll container.
  view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

  /**
   * Maps the line and column of a parser or the conflict scan to a document
   * position. Both count CRLF, CR and LF each as one break, while a break of
   * the minority kind in a mixed file sits inside an editor line, so lines are
   * counted in the text rather than taken from the editor.
   * @param {number} line @param {number} column @param {number[]} [starts] from lineStarts()
   */
  const posOf = (line, column, starts = lineStarts()) => {
    const i = Math.min(Math.max(line, 1), starts.length) - 1;
    const end = i + 1 < starts.length ? starts[i + 1] : view.state.doc.length;
    const text = view.state.doc.sliceString(starts[i], end);
    const breakLength = /(\r\n|\r|\n)$/.exec(text)?.[0].length ?? 0;
    return Math.min(end - breakLength, starts[i] + Math.max(column - 1, 0));
  };
  /** Document positions where each line begins, counted as XML counts lines. */
  const lineStarts = () => {
    const starts = [0];
    for (const m of view.state.doc.toString().matchAll(/\r\n|\r|\n/g)) starts.push((m.index ?? 0) + m[0].length);
    return starts;
  };

  const api = {
    view,
    // sliceDoc joins lines with the configured separator; doc.toString() would
    // always use LF. Positions below are document positions, in which a line
    // break counts as one character whatever the separator.
    get text() {
      return view.state.sliceDoc();
    },
    /** @param {number} from @param {number} to */
    slice(from, to) {
      return view.state.sliceDoc(from, to);
    },
    /** The text with LF breaks, whose string offsets equal document positions. */
    docText() {
      return view.state.doc.toString();
    },
    /** @param {number} from @param {number} to */
    select(from, to) {
      // The head sits at the start, so the start of the selection is what scrolls into view.
      view.dispatch({ selection: { anchor: to, head: from }, effects: EditorView.scrollIntoView(from, { y: "center", x: "nearest", xMargin: 48 }) });
      view.focus();
    },
    /** Screen rectangle of the selection start, or null when it is scrolled out. */
    selectionCoords() {
      const { from, to } = view.state.selection.main;
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to) ?? start;
      const box = view.scrollDOM.getBoundingClientRect();
      if (!start || start.bottom < box.top || start.top > box.bottom) return null;
      return { left: start.left, top: start.top, bottom: end.bottom };
    },
    /**
     * Shows another document in a fresh state: undo cannot bring back the
     * previous document under the new one's name. The separator is the
     * majority line ending, and every line ending stays as it is in the text.
     * @param {string} text
     * @returns {ReturnType<typeof lineEndings>}
     */
    setText(text) {
      const endings = lineEndings(text);
      view.setState(stateFor(text, endings.separator));
      view.scrollDOM.scrollTop = 0;
      return endings;
    },
    /** @param {Problem[]} problems */
    setProblems(problems) {
      const starts = lineStarts();
      const diagnostics = problems
        .filter((p) => p.line > 0)
        .map((p) => {
          const from = posOf(p.line, p.column, starts);
          const line = view.state.doc.lineAt(from);
          // Underline to the end of the line when the position is a point.
          const to = from < line.to ? line.to : Math.min(from + 1, view.state.doc.length);
          return { from, to, severity: p.severity ?? "error", message: p.message };
        });
      view.dispatch(setDiagnostics(view.state, diagnostics));
    },
    /** @param {number} line @param {number} column */
    jumpTo(line, column) {
      const pos = posOf(line, column);
      view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
      view.focus();
    },
    selection() {
      const { from, to } = view.state.selection.main;
      return { from, to, text: view.state.sliceDoc(from, to) };
    },
    /** @param {number} from @param {number} to @param {string} insert */
    replace(from, to, insert) {
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
      view.focus();
    },
    /** @param {number} direction +1 larger, -1 smaller, 0 reset */
    zoomBy(direction) {
      const i = ZOOM_STEPS.indexOf(zoom);
      zoom = direction === 0 ? 100 : ZOOM_STEPS[Math.min(Math.max(i + direction, 0), ZOOM_STEPS.length - 1)];
      view.dispatch({ effects: fontSize.reconfigure(sizeTheme(zoom)) });
      onZoom(zoom);
    },
    get state() {
      return view.state;
    },
    /**
     * Shows the XML chrome (null) or another presentation such as the text
     * view, on the same state: text, selection and undo history stay.
     * @param {any} extension
     */
    present(extension) {
      shown = extension ?? xmlChrome;
      view.dispatch({ effects: presentation.reconfigure(shown) });
    },
    /** @param {import("../vendor/codemirror/codemirror.js").TransactionSpec} spec */
    dispatch(spec) {
      view.dispatch(spec);
    },
    /** The document position at the top of the visible text. */
    topPos() {
      const box = view.scrollDOM.getBoundingClientRect();
      return view.posAtCoords({ x: box.left + box.width / 2, y: box.top + 8 }, false);
    },
    /** Scrolls the caret to the middle of the pane. */
    reveal() {
      view.dispatch({ effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" }) });
    },
    /** @param {number} pos */
    coordsAt(pos) {
      return view.coordsAtPos(pos);
    },
    toggleWrap() {
      wrapped = !wrapped;
      view.dispatch({ effects: wrapping.reconfigure(wrapped ? EditorView.lineWrapping : []) });
      return wrapped;
    },
    focus() {
      view.focus();
    },
  };
  return api;
}
