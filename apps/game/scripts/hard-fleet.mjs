#!/usr/bin/env node
/**
 * One Hard UI session per hangar layout.
 * Each layout is its own process so the driver reads --hull at startup.
 * Playwright clicks and keys only. This file does not call the in-page act mutator.
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LAYOUTS } from "./playthrough.mjs";

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const out = arg("--out", "");
const only = arg("--only", "");
const from = arg("--from", "");
const pass = arg("--pass", "1");
const maxMs = arg("--max-ms", "480000");
const url = arg("--url", "");

if (!out) {
  console.error("pass --out");
  process.exit(2);
}

const scripts = path.dirname(fileURLToPath(import.meta.url));
const game = path.dirname(scripts);

function run(layout) {
  return new Promise((resolve) => {
    const logPath = path.join(out, `${layout.id}-${pass}.log`);
    const args = [
      path.join(scripts, "hard-play.mjs"),
      "--hull",
      layout.id,
      "--hangar",
      path.join(out, `${layout.id}-hangar.png`),
      "--edge",
      path.join(out, `${layout.id}-edge.png`),
      "--max-ms",
      maxMs,
    ];
    if (url) args.push("--url", url);
    const log = createWriteStream(logPath);
    const child = spawn(process.execPath, args, {
      cwd: game,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);
    child.on("exit", (code) => {
      log.end(() => resolve(code ?? 1));
    });
  });
}

await mkdir(out, { recursive: true });
let rows = LAYOUTS;
if (from) {
  const index = rows.findIndex((row) => row.id === from);
  if (index < 0) {
    console.error(`unknown --from ${from}`);
    process.exit(2);
  }
  rows = rows.slice(index);
}
if (only) {
  rows = rows.filter((row) => row.id === only);
  if (!rows.length) {
    console.error(`unknown --only ${only}`);
    process.exit(2);
  }
}
console.log(`fleet pass ${pass} layouts ${rows.length}`);
for (const layout of rows) {
  console.log(`fleet start ${layout.id}`);
  const code = await run(layout);
  console.log(`fleet ${layout.id} exit ${code}`);
  if (code !== 0) process.exit(code);
}
console.log(`fleet pass ${pass} ok`);
