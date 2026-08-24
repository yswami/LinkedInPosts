#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawnSync } = require("child_process");

function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) {
    return require(process.env.PLAYWRIGHT_MODULE);
  }
  return require("playwright");
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, "series.html");
  const outputPath = path.resolve(process.argv[2] || path.join(root, "media", "synthetic-persona-series-60s.mp4"));
  const coverPath = path.resolve(process.argv[3] || path.join(root, "media", "synthetic-persona-series-cover.jpg"));
  const frameRate = parseNumber(process.env.SERIES_FPS, 15);
  const width = parseNumber(process.env.SERIES_WIDTH, 1080);
  const height = parseNumber(process.env.SERIES_HEIGHT, 1350);
  const duration = 60;
  const totalFrames = Math.round(frameRate * duration);
  const framesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "synthetic-persona-series-"));
  const { chromium } = loadPlaywright();
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(coverPath), { recursive: true });

  console.log(`Rendering ${totalFrames} frames at ${width}x${height} and ${frameRate} fps`);
  console.log(`Temporary frames: ${framesDirectory}`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--hide-scrollbars", "--force-device-scale-factor=1"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: "no-preference"
    });
    const page = await context.newPage();
    const sourceURL = pathToFileURL(htmlPath);
    sourceURL.searchParams.set("capture", "1");
    sourceURL.searchParams.set("autoplay", "0");
    await page.goto(sourceURL.href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");

    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });

    for (let frame = 0; frame < totalFrames; frame += 1) {
      const time = frame / frameRate;
      await page.evaluate(value => window.seriesAnimation.renderAt(value), time);
      const framePath = path.join(framesDirectory, `${String(frame).padStart(5, "0")}.jpg`);
      await page.screenshot({ path: framePath, type: "jpeg", quality: 92, animations: "disabled" });

      if (frame % Math.round(frameRate * 5) === 0) {
        console.log(`Rendered ${Math.round(time)} seconds`);
      }
    }

    await page.evaluate(() => window.seriesAnimation.renderAt(2.25));
    await page.screenshot({ path: coverPath, type: "jpeg", quality: 94, animations: "disabled" });
    await context.close();

    if (errors.length) {
      throw new Error(`Browser errors:\n${errors.join("\n")}`);
    }
  } finally {
    await browser.close();
  }

  console.log("Encoding H.264 MP4");
  const encoder = spawnSync(
    "swift",
    [
      path.join(__dirname, "encode-series-frames.swift"),
      framesDirectory,
      outputPath,
      String(frameRate),
      String(width),
      String(height)
    ],
    { stdio: "inherit" }
  );

  if (encoder.status !== 0) {
    throw new Error(`Swift video encoder exited with status ${encoder.status}`);
  }

  fs.rmSync(framesDirectory, { recursive: true, force: true });
  console.log(`Video: ${outputPath}`);
  console.log(`Cover: ${coverPath}`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
