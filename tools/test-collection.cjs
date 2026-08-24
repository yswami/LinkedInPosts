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
  const rootURL = pathToFileURL(path.join(root, "index.html")).href;
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
      await page.goto(rootURL, { waitUntil: "load" });

      const metrics = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: window.innerWidth,
        weekCards: document.querySelectorAll(".week-card").length,
        weekLinks: Array.from(document.querySelectorAll(".week-card > a")).map(link => link.href)
      }));

      assert(metrics.bodyWidth <= metrics.viewportWidth + 1, `${viewport.name}: root page horizontal overflow`);
      assert(metrics.weekCards === 2, `${viewport.name}: expected two weekly agenda cards`);
      assert(metrics.weekLinks.every(link => link.startsWith("file:")), `${viewport.name}: weekly links do not resolve locally`);
      assert(errors.length === 0, `${viewport.name}: browser errors: ${errors.join("; ")}`);
      results.push({ name: viewport.name, ...metrics });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
