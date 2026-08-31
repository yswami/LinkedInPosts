#!/usr/bin/env node

"use strict";
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require("playwright");
function assert(condition, message) { if (!condition) throw new Error(message); }
async function inspectPage(page, url, label) {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("ERR_FILE_NOT_FOUND")) errors.push(message.text()); });
  await page.goto(url, { waitUntil: "load" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 1, `${label} has ${overflow}px horizontal overflow`);
  assert(errors.length === 0, `${label} browser errors:\n${errors.join("\n")}`);
}
async function main() {
  const root = path.resolve(__dirname, "..");
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
      const context = await browser.newContext({ viewport }); const page = await context.newPage();
      await inspectPage(page, pathToFileURL(path.join(root, "day2.html")).href, `Day 2 lab ${viewport.width}px`);
      assert(await page.locator("#score").textContent() === "0%", "RACI-only preset should start at 0% decision completeness");
      assert(await page.locator(".dual-score > div").first().locator("strong").textContent() === "100%", "Participation map should remain 100%");
      await page.locator("#load-contract").click();
      assert(await page.locator("#score").textContent() === "100%", "Decision-contract preset should reach 100%");
      assert(await page.locator("#decision-ledger").isVisible(), "Illustrative decision contract should appear");
      assert((await page.locator("#result-status").textContent()).includes("READY TO TEST"), "Expected ready-to-test result");
      await context.close();
    }
    const storyContext = await browser.newContext({ viewport: { width: 1080, height: 1350 } }); const storyPage = await storyContext.newPage();
    await inspectPage(storyPage, pathToFileURL(path.join(root, "day2-story.html")).href + "?capture=1", "Day 2 capture story");
    await storyPage.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
    await storyPage.evaluate(() => window.storyAnimation.renderAt(36.9));
    assert(await storyPage.locator('[data-decision="contract"]').evaluate(item => item.classList.contains("is-selected")), "Capture mode should select the decision contract");
    assert(await storyPage.locator(".raci-cast-row > div").count() === 4, "The RACI scene should name four roles");
    await storyContext.close();
    const interactiveContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); const interactivePage = await interactiveContext.newPage();
    await inspectPage(interactivePage, pathToFileURL(path.join(root, "day2-story.html")).href, "Day 2 interactive story");
    await interactivePage.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
    await interactivePage.evaluate(() => window.storyAnimation.renderAt(window.storyAnimation.decisionTime));
    await interactivePage.locator('[data-decision="contract"]').click();
    assert((await interactivePage.locator("#decision-feedback").textContent()).includes("Exactly"), "The interactive choice should explain the decision contract");
    await interactiveContext.close();
  } finally { await browser.close(); }
  console.log("Day 2 lab and story checks passed.");
}
main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
