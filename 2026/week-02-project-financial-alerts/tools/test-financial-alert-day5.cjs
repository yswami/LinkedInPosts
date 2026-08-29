#!/usr/bin/env node

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  return require("playwright");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const labURL = pathToFileURL(path.join(root, "day5.html")).href;
  const storyURL = pathToFileURL(path.join(root, "day5-story.html")).href;
  const { chromium } = loadPlaywright();
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const browser = await chromium.launch({ executablePath, headless: true });
  const results = [];

  try {
    for (const viewport of [
      { width: 390, height: 844, name: "mobile" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 1440, height: 1100, name: "desktop" }
    ]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(String(error)));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });

      await page.goto(labURL, { waitUntil: "load" });
      const initial = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        gate: document.getElementById("gate-number").textContent,
        result: document.querySelector("#gate-result strong").textContent,
        status: document.getElementById("authority-status").textContent,
        authority: document.getElementById("authority-text").textContent
      }));
      assert(initial.bodyWidth <= initial.viewportWidth + 1, `${viewport.name}: Day 5 lab horizontal overflow`);
      assert(initial.gate === "Gate 1", `${viewport.name}: initial gate is incorrect`);
      assert(initial.result.includes("VALIDATED SIGNAL"), `${viewport.name}: validation result missing`);
      assert(initial.status === "PREPARE FOR APPROVAL", `${viewport.name}: advisory boundary is incorrect`);
      assert(initial.authority.includes("prepare an approval packet"), `${viewport.name}: advisory authority statement is incomplete`);

      for (let gate = 2; gate <= 5; gate += 1) {
        await page.locator(`#gate-tab-${gate}`).click();
        const value = await page.locator("#gate-number").textContent();
        assert(value === `Gate ${gate}`, `${viewport.name}: gate ${gate} did not render`);
      }
      const finalGate = await page.locator("#gate-result strong").textContent();
      assert(finalGate.includes("PREPARE FOR APPROVAL"), `${viewport.name}: final-gate outcome missing`);

      await page.locator("#unsafe-preset").click();
      const unsafe = await page.evaluate(() => ({
        status: document.getElementById("authority-status").textContent,
        text: document.getElementById("authority-text").textContent
      }));
      assert(unsafe.status === "STOP EXECUTION", `${viewport.name}: unsafe preset did not stop`);
      assert(unsafe.text.includes("authorized portfolio approval is missing"), `${viewport.name}: missing approval is not explained`);

      await page.locator("#governed-preset").click();
      const governed = await page.evaluate(() => ({
        status: document.getElementById("authority-status").textContent,
        text: document.getElementById("authority-text").textContent
      }));
      assert(governed.status === "GOVERNED EXECUTION", `${viewport.name}: governed preset is incorrect`);
      assert(governed.text.includes("Revalidate immediately before commit"), `${viewport.name}: transaction revalidation missing`);
      assert(governed.text.includes("approved project, amount, resource, date, and time limits"), `${viewport.name}: execution scope missing`);
      assert(errors.length === 0, `${viewport.name}: Day 5 lab browser errors: ${errors.join("; ")}`);

      await page.goto(storyURL, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
      const story = await page.evaluate(() => {
        const stage = document.getElementById("animation-stage").getBoundingClientRect();
        window.seriesAnimation.renderAt(58);
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          ratio: stage.width / stage.height,
          hasTranscript: Boolean(document.getElementById("transcript")),
          takeaway: document.querySelector(".finale-takeaway").textContent
        };
      });
      assert(story.bodyWidth <= story.viewportWidth + 1, `${viewport.name}: Day 5 story horizontal overflow`);
      assert(Math.abs(story.ratio - 0.8) < 0.01, `${viewport.name}: Day 5 story stage is not 4:5`);
      assert(story.hasTranscript, `${viewport.name}: Day 5 transcript missing`);
      assert(story.takeaway.includes("one action at a time"), `${viewport.name}: finale takeaway missing`);
      results.push({ name: viewport.name, initial, unsafe, governed, story });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${storyURL}?capture=1`, { waitUntil: "load" });
    await capturePage.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
    const capture = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(capture.width === 1080 && capture.height === 1350, "capture: Day 5 stage is not 1080x1350");
    assert(capture.scrollWidth === 1080 && capture.scrollHeight === 1350, "capture: Day 5 page overflows frame");
    results.push({ name: "capture", capture });
    await captureContext.close();
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
