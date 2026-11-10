import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";
import { allCrew, allHulls, allSectors, sectorDef, type HullDef } from "@stl/pack";
import { installStandIn } from "@stl/standin";
import { installArchive } from "./archive-play.ts";
import { specFromHull } from "./enemy-gen.ts";
import { RACE_OF, sectorCrewRarities } from "./rarity.ts";
import "./pack/base.ts";

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A pirate hull whose whole crew is `<crewCount class="random">`. */
function pirateHull(): HullDef {
  const hull = allHulls().find(
    (row) => row.crewCounts?.length && row.crewCounts.every((count) => count.class === "random"),
  );
  assert.ok(hull, "the archive has a ship with a random crew");
  return hull;
}

/**
 * The share each race should get in a sector, worked out from the archive directly: the sector's `<rarityList>` over
 * each crewBlueprint's `<rarity>`, rarity 0 left out, weight 6 - rarity.
 */
function expectedShares(sectorId: string): Map<string, number> {
  const listed = new Map((sectorDef(sectorId)?.rarities ?? []).map((row) => [row.id, row.rarity]));
  const weights = new Map<string, number>();
  for (const race of allCrew()) {
    const rarity = listed.get(race.id) ?? race.rarity ?? 0;
    if (rarity > 0 && rarity < 6) weights.set(RACE_OF[race.id] ?? race.id, 6 - rarity);
  }
  const total = [...weights.values()].reduce((sum, w) => sum + w, 0);
  return new Map([...weights].map(([race, w]) => [race, w / total]));
}

/** Pirate ships in every sector of the loaded archive until each has `draws` crew; the race counts per sector. */
function drawPirateCrews(draws: number): Map<string, Map<string, number>> {
  const hull = pirateHull();
  const out = new Map<string, Map<string, number>>();
  for (const [i, sector] of allSectors().entries()) {
    const rand = rng(1000 + i);
    const counts = new Map<string, number>();
    let n = 0;
    while (n < draws) {
      const spec = specFromHull(
        hull,
        { sector: 5, sectorId: sector.id, sectorName: sector.name, difficulty: "normal" },
        rand,
      );
      assert.ok(spec.crew.length > 0, `${sector.id}: a pirate crew`);
      for (const c of spec.crew) counts.set(c.race, (counts.get(c.race) ?? 0) + 1);
      n += spec.crew.length;
    }
    out.set(sector.id, counts);
  }
  return out;
}

/** Every race drawn is one the sector allows, every allowed race shows up, and each share is within 3 points. */
function assertFollowsRarities(draws: Map<string, Map<string, number>>): void {
  for (const [sectorId, counts] of draws) {
    const expected = expectedShares(sectorId);
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    assert.deepEqual([...counts.keys()].sort(), [...expected.keys()].sort(), sectorId);
    for (const [race, share] of expected) {
      const seen = (counts.get(race) ?? 0) / total;
      assert.ok(
        Math.abs(seen - share) < 0.03,
        `${sectorId} ${race}: ${(seen * 100).toFixed(1)}% drawn, ${(share * 100).toFixed(1)}% expected`,
      );
    }
  }
}

describe("pirate crews follow the stand-in sectors' rarityList", () => {
  it("every stand-in sector carries a crew rarityList", () => {
    for (const sector of allSectors()) {
      const crew = (sector.rarities ?? []).filter((row) => RACE_OF[row.id] && row.rarity > 0);
      assert.ok(crew.length > 0, sector.id);
    }
  });

  it("4000 pirate crew per sector match each sector's weights", () => {
    assertFollowsRarities(drawPirateCrews(4000));
  });

  it("Engi Controlled Sector reads engi 1, human 3, energy 4 from its rarityList", () => {
    const shares = Object.fromEntries(
      sectorCrewRarities("ENGI_SECTOR")
        .filter((row) => row.rarity > 0)
        .map((row) => [row.id, row.rarity]),
    );
    assert.deepEqual(shares, { engi: 1, human: 3, energy: 4 });
  });
});

const dat = process.env.FTL_DAT?.trim();

describe(
  "pirate crews follow ftl.dat's sector rarities",
  { skip: dat ? false : "FTL_DAT is unset", timeout: 300_000 },
  () => {
    after(async () => {
      await installStandIn();
    });

    it("4000 pirate crew per sector match each sector's weights", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      assertFollowsRarities(drawPirateCrews(4000));
    });

    it("a sector with no rarityList keeps the crewBlueprint rarities; a listed race takes the sector's", async () => {
      await installArchive(new Uint8Array(readFileSync(dat!)));
      // ftl.dat's STANDARD_SPACE has no rarityList, so blueprints.xml decides: human 1, engi 2, mantis 2, rock 3,
      // energy 5; slug, crystal and anaerobic are 0.
      assert.deepEqual([...expectedShares("STANDARD_SPACE").keys()].sort(), [
        "Engi",
        "Human",
        "Mantis",
        "Rock",
        "Zoltan",
      ]);
      // ENGI_SECTOR lists engi 1, human 3, energy 4 and sets the others to 0.
      assert.deepEqual(
        [...expectedShares("ENGI_SECTOR")]
          .map(([race, share]) => [race, Math.round(share * 10)])
          .sort(),
        [
          ["Engi", 5],
          ["Human", 3],
          ["Zoltan", 2],
        ],
      );
      // Lanius only where LANIUS_SECTOR lists anaerobic; Crystal only in CRYSTAL_HOME.
      for (const sector of allSectors()) {
        const races = expectedShares(sector.id);
        assert.equal(races.has("Lanius"), sector.id === "LANIUS_SECTOR", sector.id);
        assert.equal(races.has("Crystal"), sector.id === "CRYSTAL_HOME", sector.id);
      }
      assert.deepEqual([...expectedShares("CRYSTAL_HOME").keys()], ["Crystal"]);
    });
  },
);
