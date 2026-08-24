#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const timeline = [
  { start: 0.7, text: "Imagine this. Project Atlas is twenty-one days late. AI has a recovery plan." },
  { start: 7.3, text: "Before clicking Apply, ask AI to play your user. A prompt creates a character—not customer evidence." },
  { start: 14.3, text: "Give it context, constraints, an evidence threshold, and a boundary around who can act. Now it can challenge your hypothesis." },
  { start: 23.0, text: "It asks: Can I trace the source? If we move these architects, what else moves? Who approves? The simulation earns value by exposing questions your design must answer." },
  { start: 34.1, text: "Credibility comes from people: observation, recurring patterns, and an evidence trail. Without those, any archetype is assumed." },
  { start: 43.2, text: "OCEAN adds variation. One explores; another demands proof. It changes the voice—not facts, authority, or evidence." },
  { start: 52.1, text: "That is a synthetic persona: a behavioral opponent for your hypothesis. Let it challenge you, then validate with customers." }
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} failed with status ${result.status}\n${output}`);
  }
  return result;
}

function audioDuration(filePath) {
  const result = run("afinfo", [filePath]);
  const match = result.stdout.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
  if (!match) {
    throw new Error(`Could not determine audio duration for ${filePath}`);
  }
  return Number(match[1]);
}

function main() {
  const root = path.resolve(__dirname, "..");
  const outputPath = path.resolve(process.argv[2] || path.join(root, "media", "synthetic-persona-series-60s.mp4"));
  const audioPath = path.resolve(process.argv[3] || path.join(root, "media", "synthetic-persona-series-audio.m4a"));
  const voice = process.env.SERIES_VOICE || "Sandy (English (US))";
  const rate = process.env.SERIES_RATE || "205";
  const workDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "synthetic-persona-audio-"));
  const silentVideo = path.join(workDirectory, "silent-master.mp4");
  const soundbed = path.join(workDirectory, "soundbed.caf");
  fs.copyFileSync(outputPath, silentVideo);

  console.log(`Voice: ${voice} at ${rate} words per minute`);

  try {
    const segmentArguments = [];
    timeline.forEach((segment, index) => {
      const segmentPath = path.join(workDirectory, `${String(index + 1).padStart(2, "0")}.aiff`);
      run("say", [
        "-v", voice,
        "-r", String(rate),
        "-o", segmentPath,
        segment.text
      ]);

      const duration = audioDuration(segmentPath);
      const nextStart = timeline[index + 1] ? timeline[index + 1].start : 60;
      const finish = segment.start + duration;
      console.log(`Segment ${index + 1}: ${duration.toFixed(2)}s, ends at ${finish.toFixed(2)}s`);
      if (finish > nextStart - 0.12) {
        throw new Error(`Narration segment ${index + 1} overlaps the next scene. Increase SERIES_RATE or shorten the script.`);
      }

      segmentArguments.push(String(segment.start), segmentPath);
    });

    run("swift", [path.join(__dirname, "generate-series-soundbed.swift"), soundbed], { stdio: "inherit" });
    run("swift", [
      path.join(__dirname, "mix-series-audio.swift"),
      silentVideo,
      outputPath,
      audioPath,
      soundbed,
      ...segmentArguments
    ], { stdio: "inherit" });
    console.log(`Narrated video: ${outputPath}`);
    console.log(`Browser audio: ${audioPath}`);
  } catch (error) {
    if (!fs.existsSync(outputPath) && fs.existsSync(silentVideo)) {
      fs.copyFileSync(silentVideo, outputPath);
    }
    throw error;
  } finally {
    fs.rmSync(workDirectory, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
}
