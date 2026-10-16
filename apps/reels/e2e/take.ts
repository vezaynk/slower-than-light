import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Directory for this scenario's current take. The record script sets the id. */
export function takeDir(scenario: string): string {
  const root = process.env.REEL_ROOT ?? path.join(appRoot, "recordings");
  const id = process.env.REEL_TAKE_ID ?? "manual";
  const dir = path.join(root, scenario, id);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
