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
  const labURL = pathToFileURL(path.join(root, "day2.html")).href;
  const storyURL = pathToFileURL(path.join(root, "day2-story.html")).href;
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
        residual: document.getElementById("residual-exposure").textContent,
        score: document.getElementById("policy-score").textContent
      }));
      assert(initial.bodyWidth <= initial.viewportWidth + 1, `${viewport.name}: Day 2 lab horizontal overflow`);
      assert(initial.status === "MONITOR", `${viewport.name}: monitoring preset is incorrect`);
      assert(initial.residual === "$0.0M", `${viewport.name}: initial residual exposure is incorrect`);
      assert(initial.score === "0 / 8", `${viewport.name}: initial policy score is incorrect`);

      await page.locator("#review-preset").click();
      const review = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        residual: document.getElementById("residual-exposure").textContent,
        score: document.getElementById("policy-score").textContent
      }));
      assert(review.status === "REVIEW", `${viewport.name}: review preset is incorrect`);
      assert(review.residual === "$3.0M", `${viewport.name}: review residual exposure is incorrect`);
      assert(review.score === "3 / 8", `${viewport.name}: review policy score is incorrect`);

      await page.locator("#escalate-preset").click();
      const escalation = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        residual: document.getElementById("residual-exposure").textContent,
        score: document.getElementById("policy-score").textContent
      }));
      assert(escalation.status === "ESCALATE", `${viewport.name}: escalation preset is incorrect`);
      assert(escalation.residual === "$7.0M", `${viewport.name}: escalation residual exposure is incorrect`);
      assert(escalation.score === "8 / 8", `${viewport.name}: escalation policy score is incorrect`);
      assert(errors.length === 0, `${viewport.name}: Day 2 lab browser errors: ${errors.join("; ")}`);

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
      assert(story.bodyWidth <= story.viewportWidth + 1, `${viewport.name}: Day 2 story horizontal overflow`);
      assert(Math.abs(story.ratio - 0.8) < 0.01, `${viewport.name}: Day 2 story stage is not 4:5`);
      assert(Math.abs(story.audioDuration - 60) < 0.15, `${viewport.name}: Day 2 browser audio is not 60 seconds`);
      assert(story.hasTranscript, `${viewport.name}: Day 2 transcript missing`);

      results.push({ name: viewport.name, initial, review, escalation, story });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${storyURL}?capture=1`, { waitUntil: "load" });
    const capture = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(capture.width === 1080 && capture.height === 1350, "capture: Day 2 stage is not 1080x1350");
    assert(capture.scrollWidth === 1080 && capture.scrollHeight === 1350, "capture: Day 2 page overflows frame");
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
