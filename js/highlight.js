// XML syntax colouring for a plain <textarea>: a <pre> behind the transparent
// textarea shows the same text with coloured tokens. Kept dependency-free;
// a real code editor (CodeMirror) is the upgrade path once editing needs
// folding, autocompletion or decorations inside the text.

const TOKEN = new RegExp(
  [
    "(<!--[\\s\\S]*?(?:-->|$))", // 1 comment
    "(<\\?[\\s\\S]*?(?:\\?>|$))", // 2 processing instruction
    "(<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>|$))", // 3 CDATA
    "(<\\/?)([\\w:.-]+)([^>]*?)(\\/?>|$)", // 4-7 tag: open, name, attributes, close
    "(&[\\w#]+;)", // 8 entity
  ].join("|"),
  "g",
);
const ATTRIBUTE = /([\w:.-]+)(\s*=\s*)("[^"]*"?|'[^']*'?)/g;

/** @param {string} s */
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** @param {string} cls @param {string} s */
const span = (cls, s) => (s ? `<span class="${cls}">${esc(s)}</span>` : "");

/** @param {string} attrs */
function attributes(attrs) {
  let out = "";
  let last = 0;
  for (const m of attrs.matchAll(ATTRIBUTE)) {
    out += esc(attrs.slice(last, m.index));
    out += span("x-attr", m[1]) + esc(m[2]) + span("x-value", m[3]);
    last = (m.index ?? 0) + m[0].length;
  }
  return out + esc(attrs.slice(last));
}

/**
 * Escaped HTML for the given XML text; every character of the input appears
 * exactly once in the output, so the overlay stays aligned with the textarea.
 * @param {string} text
 */
export function highlightXml(text) {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    out += esc(text.slice(last, m.index));
    if (m[1]) out += span("x-comment", m[1]);
    else if (m[2] || m[3]) out += span("x-meta", m[2] || m[3]);
    else if (m[4]) out += span("x-punct", m[4]) + span("x-tag", m[5]) + attributes(m[6]) + span("x-punct", m[7]);
    else if (m[8]) out += span("x-entity", m[8]);
    last = (m.index ?? 0) + m[0].length;
  }
  return out + esc(text.slice(last));
}

/**
 * Keeps the overlay in step with the textarea's content and scroll position.
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} pre
 */
export function attachHighlight(textarea, pre) {
  const render = () => {
    // A trailing newline needs one more character, or the last line has no height.
    pre.innerHTML = `${highlightXml(textarea.value)} `;
    sync();
  };
  const sync = () => {
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  };
  textarea.addEventListener("input", render);
  textarea.addEventListener("scroll", sync);
  return render;
}
