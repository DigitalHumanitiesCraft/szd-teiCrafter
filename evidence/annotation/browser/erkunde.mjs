// Look-up pass: opens the person and place dialogs on a selection and types
// the queries an editor would try, recording register, GND and place hits.
// Applies nothing; the decisions are taken from this record.

import { writeFileSync } from "node:fs";
import { chromium, openEditor, selectByMouse, menuAction, personLookup, placeLookup, shot, OUT, press } from "./lib.mjs";

const persons = process.argv[2]?.split("|").filter(Boolean) ?? [];
const places = process.argv[3]?.split("|").filter(Boolean) ?? [];
const outName = process.argv[4] ?? "erkundung.json";

const browser = await chromium.launch();
const { page } = await openEditor(browser);
const record = { persons: {}, places: {} };
await selectByMouse(page, "Liebe Frau Meingast", "Meingast");
await menuAction(page, "p");
await shot(page, "erkunde-person-dialog");
for (const q of persons) record.persons[q] = await personLookup(page, q, { gnd: true });
await shot(page, "erkunde-person-last");
await press(page, "Escape");
await selectByMouse(page, "Hotel Westminster", "Nizza");
await menuAction(page, "o");
for (const q of places) record.places[q] = await placeLookup(page, q);
await shot(page, "erkunde-place-last");
await press(page, "Escape");
writeFileSync(`${OUT}${outName}`, JSON.stringify(record, null, 1));
console.log(JSON.stringify(record, null, 1));
await browser.close();
