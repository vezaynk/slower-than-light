import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { installStandIn } from "@stl/standin";
import { installArchive } from "./archive-play.ts";
import { sectorFightPool } from "./enemy-gen.ts";

/** Lists in the pool, largest share first. */
function lists(sectorId: string): string[] {
  return [...sectorFightPool(sectorId)].sort((a, b) => b[1] - a[1]).map(([list]) => list);
}

function total(sectorId: string): number {
  return [...sectorFightPool(sectorId).values()].reduce((a, b) => a + b, 0);
}

describe("a sector's random fight pool (stand-in)", () => {
  it("holds the ships hostile beacons open with, not fights only a choice leads to", async () => {
    await installStandIn();
    // Engi space: pirates, Rebels and Mantis raiders. The Engi's own ships are met only through choices.
    assert.deepEqual(lists("ENGI_SECTOR"), ["SHIPS_PIRATE", "SHIPS_REBEL", "SHIPS_MANTIS"]);
    // A home sector leans on its own faction.
    assert.equal(lists("ROCK_SECTOR")[0], "SHIPS_ROCK");
    assert.equal(lists("SLUG_SECTOR")[0], "SHIPS_JELLY");
    assert.ok(Math.abs(total("MANTIS_SECTOR") - 1) < 1e-9);
  });
});

const dat = process.env.FTL_DAT?.trim();

describe(
  "a sector's random fight pool (ftl.dat)",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 120_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("reads each event's own <ship load>, weighted by the sector's event counts", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      // Before: only one neutral event's choice fed Engi space, so every draw was an Engi ship.
      assert.deepEqual(lists("ENGI_SECTOR"), ["SHIPS_PIRATE", "SHIPS_REBEL", "SHIPS_MANTIS"]);
      assert.equal(lists("MANTIS_SECTOR")[0], "SHIPS_MANTIS");
      assert.equal(lists("ROCK_SECTOR")[0], "SHIPS_ROCK_PIRATE");
      assert.ok(lists("ZOLTAN_SECTOR").includes("SHIPS_ZOLTAN"));
      assert.ok(Math.abs(total("REBEL_SECTOR") - 1) < 1e-9);
    });
  },
);
