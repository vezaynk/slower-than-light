// Runs `turbo run <args> --continue=dependencies-successful` with the dat paths made absolute and with digests of
// their bytes in the env. Turborepo hashes env values, not the files they name, so a dat replaced in place would
// otherwise replay an old result.
// - FTL_DAT_DIGEST covers FTL_DAT. STL_DAT_DIGEST covers FTL_DAT and every STL_DATS path.
// - A path that cannot be read is reported and hashed as a sentinel, so the run goes on and misses the cache once the
//   file appears.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const absolute = (paths) =>
  paths
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => resolve(root, path));

const warned = new Set();

async function digestOf(entries) {
  if (!entries.length) return "";
  const digest = createHash("sha256");
  for (const { name, path } of entries) {
    digest.update(`${path}\0`);
    try {
      for await (const chunk of createReadStream(path)) digest.update(chunk);
    } catch (error) {
      if (!warned.has(path))
        console.warn(`dat-digest: cannot read ${name}=${path} (${error.code ?? error.message})`);
      warned.add(path);
      digest.update(`\0unreadable:${error.code ?? "error"}\0`);
    }
  }
  return digest.digest("hex");
}

const ftl = absolute([process.env.FTL_DAT ?? ""]);
const extra = absolute((process.env.STL_DATS ?? "").split(","));
const ftlEntries = ftl.map((path) => ({ name: "FTL_DAT", path }));
const extraEntries = extra.map((path) => ({ name: "STL_DATS", path }));

const env = {
  ...process.env,
  FTL_DAT_DIGEST: await digestOf(ftlEntries),
  STL_DAT_DIGEST: await digestOf([...ftlEntries, ...extraEntries]),
};
if (ftl.length) env.FTL_DAT = ftl[0];
if (extra.length) env.STL_DATS = extra.join(",");

const args = ["run", ...process.argv.slice(2)];
if (!args.some((arg) => arg === "--continue" || arg.startsWith("--continue="))) {
  args.push("--continue=dependencies-successful");
}
const run = spawnSync("turbo", args, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
if (run.error) console.error(run.error.message);
process.exit(run.status ?? 1);
