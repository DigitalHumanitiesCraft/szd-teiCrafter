// Probe: what typing an element by hand in the XML view produces
// (autocompletion, closeBrackets, autoCloseTags). Nothing is saved.
import { chromium, openEditor, clickAt, type, press, editorText, shot } from "./lib.mjs";

const browser = await chromium.launch();
const { page } = await openEditor(browser);
const around = async (needle) => {
  const t = await editorText(page);
  const i = t.indexOf(needle);
  return JSON.stringify(t.slice(Math.max(0, i - 60), i + 80));
};
await clickAt(page, "die Viking Press", "Viking", 0);
await type(page, '<orgName ref="x">');
console.log("after open tag:", await around("Viking Press"));
await shot(page, "probe-open-tag");
await press(page, "Delete", 10);
console.log("after deleting auto close:", await around("Viking Press"));
await press(page, "ArrowRight", 12);
await type(page, "</");
console.log("after typing </:", await around("Viking Press"));
await shot(page, "probe-close-tag");
// attribute typing before '>'
await clickAt(page, "Nizza, den 4.Januar", "Nizza", 0);
await type(page, '<date cert="low">');
console.log("date probe:", await around("Nizza, den"));
await browser.close();
