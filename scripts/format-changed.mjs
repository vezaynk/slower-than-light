import { execFileSync, spawnSync } from "node:child_process";

const base = process.argv[2] ?? "origin/master";
if (/^0+$/.test(base)) {
  console.log("No previous commit to compare. Formatting check skipped.");
  process.exit(0);
}

let names;
try {
  names = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base, "HEAD"], {
    encoding: "utf8",
  });
} catch {
  console.error(`Could not diff against ${base}.`);
  process.exit(1);
}

const files = names
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
if (files.length === 0) {
  console.log("No changed files to format.");
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "prettier", "--check", "--ignore-unknown", ...files], {
  stdio: "inherit",
});
process.exit(result.status === null ? 1 : result.status);
