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
  const labURL = pathToFileURL(path.join(root, "day3.html")).href;
  const storyURL = pathToFileURL(path.join(root, "day3-story.html")).href;
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
        status: document.getElementById("decision-status").textContent,
        completeness: document.getElementById("completeness").textContent,
        alert: document.getElementById("alert-text").textContent
      }));
      assert(initial.bodyWidth <= initial.viewportWidth + 1, `${viewport.name}: Day 3 lab horizontal overflow`);
      assert(initial.status === "FALSE PRECISION", `${viewport.name}: point-estimate preset is incorrect`);
      assert(initial.completeness === "0 / 4", `${viewport.name}: initial completeness is incorrect`);
      assert(initial.alert.includes("exactly $8.0M"), `${viewport.name}: initial alert copy is incorrect`);

      await page.locator("#vague-preset").click();
      const vague = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        completeness: document.getElementById("completeness").textContent,
        alert: document.getElementById("alert-text").textContent
      }));
      assert(vague.status === "VAGUE", `${viewport.name}: vague preset is incorrect`);
      assert(vague.completeness === "0 / 4", `${viewport.name}: vague completeness is incorrect`);

      await page.locator("#ready-preset").click();
      const ready = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        completeness: document.getElementById("completeness").textContent,
        confidence: document.getElementById("confidence-value").textContent,
        alert: document.getElementById("alert-text").textContent
      }));
      assert(ready.status === "DECISION-READY", `${viewport.name}: decision-ready preset is incorrect`);
      assert(ready.completeness === "4 / 4", `${viewport.name}: decision-ready completeness is incorrect`);
      assert(ready.confidence === "Medium", `${viewport.name}: confidence disclosure is incorrect`);
      assert(ready.alert.includes("$85.0M–$92.0M"), `${viewport.name}: scenario range is missing`);
      assert(ready.alert.includes("Finance review is required by Friday"), `${viewport.name}: next decision is missing`);
      assert(errors.length === 0, `${viewport.name}: Day 3 lab browser errors: ${errors.join("; ")}`);

      await page.goto(storyURL, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
      await page.locator("#series-audio").evaluate(audio => {
        if (audio.readyState >= 1) return;
        return new Promise(resolve => audio.addEventListener("loadedmetadata", resolve, { once: true }));
      });
      const story = await page.evaluate(() => {
        const stage = document.getElementById("animation-stage").getBoundingClientRect();
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          ratio: stage.width / stage.height,
          audioDuration: document.getElementById("series-audio").duration,
          hasTranscript: Boolean(document.getElementById("transcript"))
        };
      });
      assert(story.bodyWidth <= story.viewportWidth + 1, `${viewport.name}: Day 3 story horizontal overflow`);
      assert(Math.abs(story.ratio - 0.8) < 0.01, `${viewport.name}: Day 3 story stage is not 4:5`);
      assert(Math.abs(story.audioDuration - 60) < 0.15, `${viewport.name}: Day 3 browser audio is not 60 seconds`);
      assert(story.hasTranscript, `${viewport.name}: Day 3 transcript missing`);

      results.push({ name: viewport.name, initial, vague, ready, story });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${storyURL}?capture=1`, { waitUntil: "load" });
    const capture = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(capture.width === 1080 && capture.height === 1350, "capture: Day 3 stage is not 1080x1350");
    assert(capture.scrollWidth === 1080 && capture.scrollHeight === 1350, "capture: Day 3 page overflows frame");
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
