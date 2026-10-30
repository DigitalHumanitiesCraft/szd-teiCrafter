// The XML code editor: CodeMirror 6 from the vendored bundle, configured for
// TEI work. Diagnostics come from outside (well-formedness, schema), so the
// editor only displays them and never runs a check of its own.

import {
  autocompletion,
  bracketMatching,
  closeBrackets,
  closeBracketsKeymap,
  Compartment,
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
  history,
  historyKeymap,
  indentOnInput,
  indentWithTab,
  keymap,
  lineNumbers,
  lintGutter,
  searchKeymap,
  setDiagnostics,
  syntaxHighlighting,
  tags,
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
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--blue) 30%, transparent)",
  },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in oklch, var(--orange) 22%, transparent)" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--blue) 20%, transparent)", outline: "none" },
  ".cm-tooltip, .cm-panels": { backgroundColor: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--blue)", color: "var(--bg)" },
  ".cm-panels input, .cm-panels button": { color: "var(--text)" },
});

const ZOOM_STEPS =[70, 80, 90, 100, 110, 125, 140, 160, 180, 200];

/**
 * @typedef {{ message: string, line: number, column: number, severity?: "error" | "warning" }} Problem
 * @param {HTMLElement} parent
 * @param {{ elements: any[], keys: { key: string, run: () => boolean }[], onChange: (text: string) => void, onCaret: (offset: number) => void, onZoom: (percent: number) => void, onScroll: () => void }} options
 */
export function createEditor(parent, { elements, keys, onChange, onCaret, onZoom, onScroll }) {
  const wrapping = new Compartment();
  const fontSize = new Compartment();
  // The document keeps the line endings of the opened file, so saving changes
  // no byte the user did not edit, whatever platform the file came from.
  const lineEnding = new Compartment();
  let zoom = 100;
  let wrapped = false;

  const sizeTheme = (/** @type {number} */ percent) =>
    EditorView.theme({ "&": { fontSize: `${(0.9 * percent) / 100}rem` } });

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        lineNumbers(),
        foldGutter(),
        lintGutter(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        syntaxHighlighting(highlight),
        chrome,
        xml({ elements, autoCloseTags: true }),
        EditorState.tabSize.of(2),
        lineEnding.of(EditorState.lineSeparator.of("\n")),
        wrapping.of([]),
        fontSize.of(sizeTheme(zoom)),
        // Application commands first, so they win over defaults with the same key.
        keymap.of(keys),
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
          wheel(event) {
            if (!event.ctrlKey) return false;
            event.preventDefault();
            api.zoomBy(event.deltaY < 0 ? 1 : -1);
            return true;
          },
        }),
      ],
    }),
  });

  // Scroll events do not bubble, so they are taken from the scroll container.
  view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

  /** @param {number} line @param {number} column */
  const posOf =(line, column) => {
    const doc = view.state.doc;
    const l = doc.line(Math.min(Math.max(line, 1), doc.lines));
    return Math.min(l.to, l.from + Math.max(column - 1, 0));
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
      view.dispatch({ selection: { anchor: from, head: to }, effects: EditorView.scrollIntoView(from, { y: "center" }) });
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
    /** @param {string} text */
    setText(text) {
      const separator = text.includes("\r\n") ? "\r\n" : "\n";
      view.dispatch({ effects: lineEnding.reconfigure(EditorState.lineSeparator.of(separator)) });
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, selection: { anchor: 0 } });
      view.scrollDOM.scrollTop = 0;
    },
    /** @param {Problem[]} problems */
    setProblems(problems) {
      const diagnostics = problems
        .filter((p) => p.line > 0)
        .map((p) => {
          const from = posOf(p.line, p.column);
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
