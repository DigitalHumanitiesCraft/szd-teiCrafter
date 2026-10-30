// Re-exports the CodeMirror 6 surface teiCrafter SZD uses, bundled into one ES
// module so the app runs without a build step. Rebuild: see README.md here.
export { EditorState, Compartment, EditorSelection, RangeSetBuilder } from "@codemirror/state";
export {
  EditorView,
  Decoration,
  ViewPlugin,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
} from "@codemirror/view";
export { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
export {
  syntaxHighlighting,
  HighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
} from "@codemirror/language";
export { searchKeymap, highlightSelectionMatches, search } from "@codemirror/search";
export { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
export { linter, lintGutter, setDiagnostics, lintKeymap } from "@codemirror/lint";
export { xml } from "@codemirror/lang-xml";
export { tags } from "@lezer/highlight";
