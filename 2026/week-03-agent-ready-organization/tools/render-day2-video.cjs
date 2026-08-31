#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawnSync } = require("child_process");
const { chromium } = process.env.PLAYWRIGHT_MODULE ? require(process.env.PLAYWRIGHT_MODULE) : require("playwright");

function positiveNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : fallback; }

async function main() {
  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, "day2-story.html");
  const outputPath = path.resolve(process.argv[2] || path.join(root, "media", "agent-ready-organization-day2-silent.mp4"));
  const coverPath = path.resolve(process.argv[3] || path.join(root, "media", "agent-ready-organization-day2-cover.jpg"));
  const frameRate = positiveNumber(process.env.SERIES_FPS, 15);
  const width = positiveNumber(process.env.SERIES_WIDTH, 1080);
  const height = positiveNumber(process.env.SERIES_HEIGHT, 1350);
  const duration = 71;
  const totalFrames = Math.round(frameRate * duration);
  const coverOnly = process.env.COVER_ONLY === "1";
  const coverTime = positiveNumber(process.env.SERIES_COVER_TIME, 30.4);
  const framesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ready-day2-"));
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(coverPath), { recursive: true });
  console.log(`Rendering ${totalFrames} frames at ${width}x${height} and ${frameRate} fps`);

  const browser = await chromium.launch({ executablePath, headless: true, args: ["--hide-scrollbars", "--force-device-scale-factor=1"] });
  try {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("console", message => { if (message.type() === "error" && !message.text().includes("ERR_FILE_NOT_FOUND")) errors.push(message.text()); });
    const sourceURL = pathToFileURL(htmlPath); sourceURL.searchParams.set("capture", "1");
    await page.goto(sourceURL.href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.animationReady === "true");

    if (!coverOnly) {
      for (let frame = 0; frame < totalFrames; frame += 1) {
        const time = frame / frameRate;
        await page.evaluate(value => window.storyAnimation.renderAt(value), time);
        await page.locator("#animation-stage").screenshot({ path: path.join(framesDirectory, `${String(frame).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92, animations: "disabled" });
        if (frame % Math.round(frameRate * 10) === 0) console.log(`Rendered ${Math.round(time)} seconds`);
      }
    }

    await page.evaluate(value => window.storyAnimation.renderAt(value), coverTime);
    await page.locator("#animation-stage").screenshot({ path: coverPath, type: "jpeg", quality: 94, animations: "disabled" });
    await context.close();
    if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);
  } finally { await browser.close(); }

  if (!coverOnly) {
    const encoder = spawnSync("ffmpeg", ["-y", "-framerate", String(frameRate), "-i", path.join(framesDirectory, "%05d.jpg"), "-vf", `scale=${width}:${height}:flags=lanczos,setsar=1`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(frameRate), outputPath], { stdio: "inherit" });
    if (encoder.status !== 0) throw new Error(`ffmpeg video encoder exited with status ${encoder.status}`);
  }
  fs.rmSync(framesDirectory, { recursive: true, force: true });
  if (!coverOnly) console.log(`Silent video: ${outputPath}`);
  console.log(`Cover: ${coverPath}`);
}

main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
