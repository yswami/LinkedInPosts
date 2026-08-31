#!/usr/bin/env node

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require("playwright");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function inspectPage(page, url, label) {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().includes("ERR_FILE_NOT_FOUND")) errors.push(message.text());
  });
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
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await inspectPage(page, pathToFileURL(path.join(root, "index.html")).href, `lab ${viewport.width}px`);
      assert(await page.locator("#score").textContent() === "0%", "Ambiguous preset should start at 0%");
      await page.locator("#load-clarified").click();
      assert(await page.locator("#score").textContent() === "100%", "Clarified preset should reach 100%");
      assert(await page.locator("#contract").isVisible(), "Clarified work contract should be visible");
      assert((await page.locator("#result-status").textContent()).includes("CONTROLLED ASSISTANCE"), "Expected controlled-assistance status");
      await context.close();
    }

    const storyContext = await browser.newContext({ viewport: { width: 1080, height: 1350 } });
    const storyPage = await storyContext.newPage();
    await inspectPage(storyPage, pathToFileURL(path.join(root, "day1-story.html")).href + "?capture=1", "story");
    await storyPage.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
    await storyPage.evaluate(() => window.storyAnimation.renderAt(26.4));
    const visibleScenes = await storyPage.locator(".scene").evaluateAll(items => items.filter(item => Number(getComputedStyle(item).opacity) > 0.01).length);
    assert(visibleScenes >= 1 && visibleScenes <= 2, `Unexpected visible scene count: ${visibleScenes}`);
    assert(await storyPage.locator(".role-actor").count() === 3, "The play should include three human role characters");
    await storyPage.evaluate(() => window.storyAnimation.renderAt(34));
    assert(await storyPage.locator('[data-decision="clarify"]').evaluate(item => item.classList.contains("is-selected")), "Capture mode should auto-select the missing-rule choice");
    await storyContext.close();

    const interactiveContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const interactivePage = await interactiveContext.newPage();
    await inspectPage(interactivePage, pathToFileURL(path.join(root, "day1-story.html")).href, "interactive story");
    await interactivePage.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
    await interactivePage.evaluate(() => window.storyAnimation.renderAt(window.storyAnimation.decisionTime));
    await interactivePage.locator('[data-decision="clarify"]').click();
    assert((await interactivePage.locator("#decision-feedback").textContent()).includes("Exactly"), "The interactive choice should explain the safe move");
    await interactiveContext.close();
  } finally {
    await browser.close();
  }

  console.log("Day 1 lab and story checks passed.");
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
