#!/usr/bin/env node

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) {
    return require(process.env.PLAYWRIGHT_MODULE);
  }
  return require("playwright");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const sourceURL = pathToFileURL(path.join(root, "series.html")).href;
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
      page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(sourceURL, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");
      await page.locator("#series-audio").evaluate(audio => {
        if (audio.readyState >= 1) return;
        return new Promise(resolve => audio.addEventListener("loadedmetadata", resolve, { once: true }));
      });
      const metrics = await page.evaluate(() => {
        const stage = document.getElementById("animation-stage").getBoundingClientRect();
        const audio = document.getElementById("series-audio");
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: window.innerWidth,
          stageWidth: stage.width,
          stageHeight: stage.height,
          hasTranscript: Boolean(document.getElementById("transcript")),
          hasControls: Boolean(document.getElementById("play-toggle") && document.getElementById("scrubber")),
          audioDuration: audio.duration
        };
      });

      assert(metrics.bodyWidth <= metrics.viewportWidth + 1, `${viewport.name}: horizontal overflow detected`);
      assert(Math.abs(metrics.stageWidth / metrics.stageHeight - 0.8) < 0.01, `${viewport.name}: stage is not 4:5`);
      assert(metrics.hasTranscript, `${viewport.name}: accessible transcript missing`);
      assert(metrics.hasControls, `${viewport.name}: playback controls missing`);
      assert(Math.abs(metrics.audioDuration - 60) < 0.1, `${viewport.name}: synchronized audio is not 60 seconds`);
      assert(errors.length === 0, `${viewport.name}: browser errors: ${errors.join("; ")}`);

      if (viewport.name === "mobile") {
        await page.locator("#play-toggle").click();
        await page.waitForTimeout(320);
        const audioPosition = await page.locator("#series-audio").evaluate(audio => audio.currentTime);
        await page.locator("#play-toggle").click();
        const pausedAt = await page.locator("#scrubber").inputValue();
        assert(Number(pausedAt) > 0, "mobile: play/pause did not advance the animation");
        assert(audioPosition > 0, "mobile: synchronized audio did not advance");

        await page.locator("#scrubber").fill("28");
        await page.locator("#scrubber").dispatchEvent("input");
        const atlasOpacity = await page.locator(".scene-atlas").evaluate(element => Number(element.style.opacity));
        const scrubbedAudioPosition = await page.locator("#series-audio").evaluate(audio => audio.currentTime);
        assert(atlasOpacity > 0.9, "mobile: scrubbing did not reveal the Project Atlas scene");
        assert(Math.abs(scrubbedAudioPosition - 28) < 0.2, "mobile: audio did not follow the scrubber");
      }

      results.push({ name: viewport.name, ...metrics });
      await context.close();
    }

    const captureContext = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    const capturePage = await captureContext.newPage();
    await capturePage.goto(`${sourceURL}?capture=1`, { waitUntil: "load" });
    const captureMetrics = await capturePage.evaluate(() => {
      const stage = document.getElementById("animation-stage").getBoundingClientRect();
      return { width: stage.width, height: stage.height, scrollWidth: document.body.scrollWidth, scrollHeight: document.body.scrollHeight };
    });
    assert(captureMetrics.width === 1080 && captureMetrics.height === 1350, "capture: stage dimensions are not 1080x1350");
    assert(captureMetrics.scrollWidth === 1080 && captureMetrics.scrollHeight === 1350, "capture: page overflows the video frame");
    results.push({ name: "capture", ...captureMetrics });
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
