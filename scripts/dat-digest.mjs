// Runs a shell command with STL_DAT_DIGEST set to a hash of the bytes at FTL_DAT and each STL_DATS path. Turborepo
// hashes env values, not the files they name, so a dat replaced in place would otherwise replay an old result.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

const paths = [process.env.FTL_DAT ?? "", ...(process.env.STL_DATS ?? "").split(",")]
  .map((path) => path.trim())
  .filter(Boolean);
const digest = createHash("sha256");
for (const path of paths) {
  digest.update(`${path}\0`);
  for await (const chunk of createReadStream(path)) digest.update(chunk);
}
const run = spawnSync(process.argv.slice(2).join(" "), {
  shell: true,
  stdio: "inherit",
  env: { ...process.env, STL_DAT_DIGEST: paths.length ? digest.digest("hex") : "" },
});
process.exit(run.status ?? 1);
