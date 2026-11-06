// Probe: what the mark card in the text view says about the annotated
// o_szd.1222 (place with GND and GeoNames, date with @cert, orgName, an
// unlinked person), and what "Ändern" on the place would write. Nothing is saved.
import { readFileSync } from "node:fs";
import { chromium, BASE_URL, OUT, editorText } from "./lib.mjs";

const text = readFileSync(`${OUT}o_szd.1222.tei.xml`, "utf8");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route("**/data/o_szd.1222.tei.xml", (r) => r.fulfill({ body: text, contentType: "application/xml" }));
const page = await ctx.newPage();
await page.goto(BASE_URL);
await page.waitForFunction(() => document.getElementById("wf-label").textContent !== "", null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.click("#view-text");
await page.waitForTimeout(600);
for (const word of ["Nizza", "10.", "Viking Press", "Fuchs", "Kultusgemeinde"]) {
  const el = page.locator(".tv-mark", { hasText: word }).first();
  if (!(await el.count())) {
    console.log(word, "-> no .tv-mark");
    continue;
  }
  await el.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await el.hover();
  await page.waitForTimeout(700);
  const card = await page.evaluate(() => ["mark-card-title", "mark-card-detail", "mark-card-note"].map((i) => document.getElementById(i).textContent).join(" | "));
  console.log(word, "->", card, "| class:", await el.getAttribute("class"));
  if (word === "Nizza") {
    await page.screenshot({ path: `${OUT}shots/probe-karte-nizza.png` });
    await page.click("#mark-card-change");
    await page.waitForTimeout(400);
    console.log("place dialog on change: id field =", JSON.stringify(await page.inputValue("#place-id")), "preview =", await page.textContent("#place-preview"));
    await page.fill("#place-id", "4075416-9");
    await page.click("#place-apply");
    await page.waitForTimeout(400);
    const t = await editorText(page);
    console.log("after Ändern:", t.match(/<placeName[^>]*>Nizza/)[0]);
  }
}
await browser.close();
