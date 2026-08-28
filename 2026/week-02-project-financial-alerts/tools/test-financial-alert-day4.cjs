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
  const labURL = pathToFileURL(path.join(root, "day4.html")).href;
  const storyURL = pathToFileURL(path.join(root, "day4-story.html")).href;
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
        netEac: document.getElementById("net-eac").textContent,
        assessment: document.getElementById("assessment-text").textContent
      }));
      assert(initial.bodyWidth <= initial.viewportWidth + 1, `${viewport.name}: Day 4 lab horizontal overflow`);
      assert(initial.status === "LOCAL OPTIMUM", `${viewport.name}: project-only preset is incorrect`);
      assert(initial.netEac === "–$4.0M*", `${viewport.name}: initial local EAC impact is incorrect`);
      assert(initial.assessment.includes("Meridian EAC improves"), `${viewport.name}: initial assessment is incorrect`);

      await page.locator("#dependency-preset").click();
      const dependency = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        netEac: document.getElementById("net-eac").textContent,
        assessment: document.getElementById("assessment-text").textContent
      }));
      assert(dependency.status === "TRADE-OFF VISIBLE", `${viewport.name}: direct-dependency preset is incorrect`);
      assert(dependency.netEac === "–$1.5M", `${viewport.name}: net portfolio EAC is incorrect`);
      assert(dependency.assessment.includes("Beacon EAC rises"), `${viewport.name}: Beacon impact is missing`);

      await page.locator("#portfolio-preset").click();
      const portfolio = await page.evaluate(() => ({
        status: document.getElementById("decision-status").textContent,
        netEac: document.getElementById("net-eac").textContent,
        cash: document.getElementById("cash-impact").textContent,
        assessment: document.getElementById("assessment-text").textContent
      }));
      assert(portfolio.status === "PORTFOLIO REVIEW READY", `${viewport.name}: portfolio preset is incorrect`);
      assert(portfolio.netEac === "–$1.5M", `${viewport.name}: portfolio net EAC changed unexpectedly`);
      assert(portfolio.cash === "$12M next quarter", `${viewport.name}: cash-timing effect is missing`);
      assert(portfolio.assessment.includes("phased-scope option"), `${viewport.name}: alternative is missing`);
      assert(portfolio.assessment.includes("do not reallocate resources automatically"), `${viewport.name}: approval boundary is missing`);
      assert(errors.length === 0, `${viewport.name}: Day 4 lab browser errors: ${errors.join("; ")}`);

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
      assert(story.bodyWidth <= story.viewportWidth + 1, `${viewport.name}: Day 4 story horizontal overflow`);
      assert(Math.abs(story.ratio - 0.8) < 0.01, `${viewport.name}: Day 4 story stage is not 4:5`);
      assert(Math.abs(story.audioDuration - 60) < 0.15, `${viewport.name}: Day 4 browser audio is not 60 seconds`);
      assert(story.hasTranscript, `${viewport.name}: Day 4 transcript missing`);

      results.push({ name: viewport.name, initial, dependency, portfolio, story });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${storyURL}?capture=1`, { waitUntil: "load" });
    const capture = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(capture.width === 1080 && capture.height === 1350, "capture: Day 4 stage is not 1080x1350");
    assert(capture.scrollWidth === 1080 && capture.scrollHeight === 1350, "capture: Day 4 page overflows frame");
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
