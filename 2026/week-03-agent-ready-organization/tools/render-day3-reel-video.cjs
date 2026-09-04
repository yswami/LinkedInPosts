#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawn, spawnSync } = require("child_process");

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

async function readDevToolsPort(directory) {
  const portFile = path.join(directory, "DevToolsActivePort");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (fs.existsSync(portFile)) {
      const [port] = fs.readFileSync(portFile, "utf8").trim().split("\n");
      if (port) return Number(port);
    }
    await wait(100);
  }
  throw new Error("Chrome did not expose its local rendering endpoint.");
}

function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 0;
  const pending = new Map();

  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result || {});
  });

  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    }),
    close: () => socket.close(),
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    }
  };
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || "Page evaluation failed.");
  return response.result && response.result.value;
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const htmlPath = path.join(root, process.env.SERIES_HTML || "day3-reel.html");
  const outputPath = path.resolve(process.argv[2] || path.join(root, "local-output", process.env.SERIES_OUTPUT || "agent-ready-organization-day3-reel-silent.mp4"));
  const coverPath = path.resolve(process.argv[3] || path.join(root, "local-output", process.env.SERIES_COVER || "agent-ready-organization-day3-reel-cover.jpg"));
  const frameRate = positiveNumber(process.env.SERIES_FPS, 15);
  const outputWidth = positiveNumber(process.env.SERIES_WIDTH, 1080);
  const outputHeight = positiveNumber(process.env.SERIES_HEIGHT, 1350);
  const duration = 63;
  const totalFrames = Math.round(frameRate * duration);
  const coverOnly = process.env.COVER_ONLY === "1";
  const coverTime = positiveNumber(process.env.SERIES_COVER_TIME, 35.2);
  const framesDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ready-day3-frames-"));
  const chromeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ready-day3-chrome-"));
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const sourceUrl = pathToFileURL(htmlPath); sourceUrl.searchParams.set("capture", "1");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(coverPath), { recursive: true });
  console.log(`Rendering ${totalFrames} frames at ${frameRate} fps`);

  const chrome = spawn(executablePath, [
    "--headless=new", "--hide-scrollbars", "--disable-gpu-sandbox", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${chromeDirectory}`, `--window-size=${outputWidth},${outputHeight}`, sourceUrl.href
  ], { stdio: "ignore" });

  let client;
  try {
    const port = await readDevToolsPort(chromeDirectory);
    let targets = [];
    for (let attempt = 0; attempt < 50; attempt += 1) {
      targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      if (targets.some(target => target.type === "page")) break;
      await wait(100);
    }
    const target = targets.find(item => item.type === "page");
    if (!target) throw new Error("Chrome did not create the reel page.");
    client = createClient(target.webSocketDebuggerUrl);
    await client.ready;
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", { width: outputWidth, height: outputHeight, deviceScaleFactor: 1, mobile: false });

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(client, "document.documentElement.dataset.animationReady === 'true'")) break;
      await wait(50);
    }

    const clip = await evaluate(client, "(() => { const r = document.querySelector('#animation-stage').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}; })()");
    async function capture(time, targetPath, quality) {
      await evaluate(client, `window.storyAnimation.renderAt(${Number(time)})`);
      const shot = await client.send("Page.captureScreenshot", { format: "jpeg", quality, fromSurface: true, captureBeyondViewport: true, clip });
      fs.writeFileSync(targetPath, Buffer.from(shot.data, "base64"));
    }

    if (!coverOnly) {
      for (let frame = 0; frame < totalFrames; frame += 1) {
        const time = frame / frameRate;
        await capture(time, path.join(framesDirectory, `${String(frame).padStart(5, "0")}.jpg`), 92);
        if (frame % Math.round(frameRate * 10) === 0) console.log(`Rendered ${Math.round(time)} seconds`);
      }
    }
    await capture(coverTime, coverPath, 94);
  } finally {
    if (client) client.close();
    chrome.kill("SIGTERM");
    await wait(250);
  }

  if (!coverOnly) {
    const encoder = spawnSync("ffmpeg", ["-y", "-framerate", String(frameRate), "-i", path.join(framesDirectory, "%05d.jpg"), "-vf", `scale=${outputWidth}:${outputHeight}:flags=lanczos,setsar=1`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(frameRate), outputPath], { stdio: "inherit" });
    if (encoder.status !== 0) throw new Error(`ffmpeg video encoder exited with status ${encoder.status}`);
  }

  fs.rmSync(framesDirectory, { recursive: true, force: true });
  fs.rmSync(chromeDirectory, { recursive: true, force: true });
  if (!coverOnly) console.log(`Silent video: ${outputPath}`);
  console.log(`Cover: ${coverPath}`);
}

main().catch(error => { console.error(error.stack || error.message || error); process.exitCode = 1; });
