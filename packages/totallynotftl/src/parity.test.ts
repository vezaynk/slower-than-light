import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { extractArchive } from "@stl/ftldat";
import { loadFtlMods } from "@stl/hyperspace";
import type { ContentPack } from "@stl/pack";
import { standInDat } from "./archive.ts";

/**
 * Fields a real archive fills and this campaign leaves unset.
 * Writing one would invent a sentence, a palette, a short label, a start event, or a gun list.
 * A gun list or a slot count would also change which weapons a ship mounts.
 * Picture names, shield pierce, hire prices, crew rarities, and beacon quotas are written.
 * Campaign fights stay on choice effects, so an event does not grow a ship, a grant, a boarder tag,
 * or an environment. A campaign fight's hazard is its own fight effect.
 */
const UNPLAYED: Partial<Record<keyof ContentPack, readonly string[]>> = {
  systems: ["detail"],
  crew: ["colors", "detail"],
  hulls: ["droneCount", "droneLoad", "maxSector", "minSector", "weaponCount", "weaponLoad"],
  sectors: ["short", "startEvent"],
  events: ["boarders", "environment", "fx", "grants", "reward", "ship"],
};

const RECORD_LISTS = [
  "weapons",
  "augments",
  "drones",
  "systems",
  "crew",
  "hulls",
  "sectors",
  "events",
  "lists",
  "stores",
  "factions",
  "empties",
  "tunes",
] as const;

function filledKeys(row: object): Set<string> {
  const keys = new Set<string>();
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) keys.add(key);
  }
  return keys;
}

function unionKeys(rows: readonly object[] | undefined): Set<string> {
  const keys = new Set<string>();
  for (const row of rows ?? []) for (const key of filledKeys(row)) keys.add(key);
  return keys;
}

describe("archive field parity", () => {
  const dat = process.env.FTL_DAT;
  it(
    "fills every field a local ftl.dat fills, for each record type",
    { skip: dat ? false : "FTL_DAT is unset" },
    async () => {
      const archive = loadFtlMods(await extractArchive(readFileSync(dat!))).pack;
      const standIn = loadFtlMods(await extractArchive(await standInDat())).pack;
      const gaps: string[] = [];
      for (const type of RECORD_LISTS) {
        const fromArchive = unionKeys(archive[type] as object[] | undefined);
        const fromStandIn = unionKeys(standIn[type] as object[] | undefined);
        const allowed = new Set(UNPLAYED[type] ?? []);
        const missing = [...fromArchive]
          .filter((key) => !fromStandIn.has(key) && !allowed.has(key))
          .sort();
        if (missing.length) gaps.push(`${type}: ${missing.join(", ")}`);
      }
      const rewardArchive = archive.rewards ? filledKeys(archive.rewards) : new Set<string>();
      const rewardStandIn = standIn.rewards ? filledKeys(standIn.rewards) : new Set<string>();
      const rewardMissing = [...rewardArchive].filter((key) => !rewardStandIn.has(key)).sort();
      if (rewardMissing.length) gaps.push(`rewards: ${rewardMissing.join(", ")}`);
      assert.deepEqual(gaps, []);
    },
  );
});
