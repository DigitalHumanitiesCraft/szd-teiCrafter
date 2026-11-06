// The simulated colleague's edit: the first deletion marker in o_szd.504 becomes
// a del element. Exit code 2 when it has been resolved already.
// Usage, inside the colleague's clone: node kollegin-streichung.cjs

const fs = require("node:fs");

const file = "docs/data/korrespondenzen/o_szd.504.tei.xml";
const marker = "~~Aus Villa Igiea mir~~";
const text = fs.readFileSync(file, "utf8");
if (!text.includes(marker)) {
  console.log("Die Streichung ist schon aufgelöst, die Kollegin hat nichts zu tun.");
  process.exit(2);
}
fs.writeFileSync(file, text.replace(marker, "<del>Aus Villa Igiea mir</del>"));
