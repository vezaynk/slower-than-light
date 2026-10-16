import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scenarioById, scenarios } from "../src/scenarios.ts";
import { takeId } from "../src/take-id.ts";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../..");
const recordings = path.join(appRoot, "recordings");

function git(command: string): string {
  return execSync(command, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function parseArgs(argv: string[]): { names: string[]; label?: string } {
  const names: string[] = [];
  let label: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log("usage: record [scenario...] [--label name]");
      console.log(`scenarios: ${scenarios.map((scenario) => scenario.id).join(", ")}`);
      process.exit(0);
    }
    if (arg === "--label") {
      label = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg) names.push(arg);
  }
  return { names, label };
}

const { names, label } = parseArgs(process.argv.slice(2));
const selected = names.length ? names : scenarios.map((scenario) => scenario.id);
for (const name of selected) {
  if (!scenarioById(name)) {
    console.error(`Unknown scenario "${name}". Known: ${scenarios.map((scenario) => scenario.id).join(", ")}`);
    process.exit(1);
  }
}

const sha = git("git rev-parse HEAD");
const branch = git("git rev-parse --abbrev-ref HEAD");
const dirty = git("git status --porcelain").length > 0;
const id = takeId({ branch, sha, dirty, label });
console.log(`Recording ${selected.join(", ")} as ${id}`);

const specs = selected.map((name) => scenarioById(name)?.spec).filter((spec): spec is string => !!spec);
const result = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", "--config", "playwright.config.ts", ...specs],
  {
    cwd: appRoot,
    stdio: "inherit",
    env: { ...process.env, REEL_ROOT: recordings, REEL_TAKE_ID: id },
  },
);

const recordedAt = new Date().toISOString();
for (const name of selected) {
  const dir = path.join(recordings, name, id);
  const video = path.join(dir, "video.webm");
  if (!fs.existsSync(video)) continue;
  const meta = {
    id,
    scenario: name,
    label: id,
    branch,
    sha,
    dirty,
    ok: result.status === 0,
    recordedAt,
  };
  fs.writeFileSync(path.join(dir, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Saved ${path.relative(repoRoot, video)}`);
}

process.exit(result.status ?? 1);
