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
  const labURL = pathToFileURL(path.join(root, "index.html")).href;
  const storyURL = pathToFileURL(path.join(root, "day1-story.html")).href;
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
      const labMetrics = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        title: document.getElementById("decision-title").textContent,
        status: document.getElementById("decision-status").textContent,
        eacRange: document.getElementById("eac-range").textContent,
        varianceRange: document.getElementById("variance-range").textContent
      }));
      assert(labMetrics.bodyWidth <= labMetrics.viewportWidth + 1, `${viewport.name}: lab horizontal overflow`);
      assert(labMetrics.status === "VALIDATE DATA", `${viewport.name}: initial decision is incorrect`);
      assert(labMetrics.eacRange === "$88.0M–$95.4M", `${viewport.name}: initial EAC range is incorrect`);
      assert(labMetrics.varianceRange === "+$8.0M–+$15.4M", `${viewport.name}: initial variance range is incorrect`);

      await page.locator("#reconcile").click();
      const reconciled = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        eacRange: document.getElementById("eac-range").textContent,
        readiness: document.getElementById("readiness-count").textContent
      }));
      assert(reconciled.status === "VALIDATED SIGNAL", `${viewport.name}: reconciled status is incorrect`);
      assert(reconciled.eacRange === "$88.2M", `${viewport.name}: reconciled EAC is incorrect`);
      assert(reconciled.readiness === "4 of 4 resolved", `${viewport.name}: readiness count is incorrect`);
      assert(errors.length === 0, `${viewport.name}: lab browser errors: ${errors.join("; ")}`);

      await page.goto(storyURL, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
      await page.locator("#series-audio").evaluate(audio => {
        if (audio.readyState >= 1) return;
        return new Promise(resolve => audio.addEventListener("loadedmetadata", resolve, { once: true }));
      });
      const storyMetrics = await page.evaluate(() => {
        const stage = document.getElementById("animation-stage").getBoundingClientRect();
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          ratio: stage.width / stage.height,
          audioDuration: document.getElementById("series-audio").duration,
          hasTranscript: Boolean(document.getElementById("transcript"))
        };
      });
      assert(storyMetrics.bodyWidth <= storyMetrics.viewportWidth + 1, `${viewport.name}: story horizontal overflow`);
      assert(Math.abs(storyMetrics.ratio - 0.8) < 0.01, `${viewport.name}: story stage is not 4:5`);
      assert(Math.abs(storyMetrics.audioDuration - 60) < 0.15, `${viewport.name}: browser audio is not 60 seconds`);
      assert(storyMetrics.hasTranscript, `${viewport.name}: transcript missing`);

      results.push({ name: viewport.name, lab: labMetrics, reconciled, story: storyMetrics });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${storyURL}?capture=1`, { waitUntil: "load" });
    const capture = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(capture.width === 1080 && capture.height === 1350, "capture: stage is not 1080x1350");
    assert(capture.scrollWidth === 1080 && capture.scrollHeight === 1350, "capture: page overflows frame");
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
