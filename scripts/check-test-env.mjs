// Fails when Turborepo's strict env mode would strip a dat variable from a test task that reads it. CI sets no
// FTL_DAT, so the archive tests would skip silently, and a replaced dat would replay an old result.
import { execFileSync } from "node:child_process";

const expected = {
  "@stl/game#test:src": ["FTL_DAT", "STL_DATS", "STL_DAT_DIGEST"],
  "@stl/totallynotftl#test": ["FTL_DAT", "FTL_DAT_DIGEST"],
};

const out = execFileSync("turbo", ["run", "test", "test:src", "--dry=json"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const tasks = new Map(
  JSON.parse(out.slice(out.indexOf("{"))).tasks.map((task) => [task.taskId, task]),
);

let failed = false;
for (const [id, names] of Object.entries(expected)) {
  const env = tasks.get(id)?.environmentVariables?.specified?.env;
  const missing = env ? names.filter((name) => !env.includes(name)) : names;
  if (missing.length) {
    console.error(
      `${id} does not receive ${missing.join(", ")}${env ? "" : " (task not in the graph)"}`,
    );
    failed = true;
  } else {
    console.log(`${id}: ${env.join(", ")}`);
  }
}
process.exit(failed ? 1 : 0);
