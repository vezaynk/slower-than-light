import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRoute } from "../sim.ts";
import { SECTOR_ORDER, SECTOR_TYPES } from "./sectors.ts";

/** Wiki page "Sectors": heading order and the group heading each one sits under. */
const EXPECTED = [
  ["STANDARD_SPACE", "Civilian (Starting) Sector", "civilian"],
  ["CIVILIAN_SECTOR", "Civilian Sector", "civilian"],
  ["ENGI_SECTOR", "Engi Controlled Sector", "civilian"],
  ["ENGI_HOME", "Engi Homeworlds", "civilian"],
  ["ZOLTAN_SECTOR", "Zoltan Controlled Sector", "civilian"],
  ["ZOLTAN_HOME", "Zoltan Homeworlds", "civilian"],
  ["LANIUS_SECTOR", "Abandoned Sector", "hostile"],
  ["MANTIS_SECTOR", "Mantis Controlled Sector", "hostile"],
  ["MANTIS_HOME", "Mantis Homeworlds", "hostile"],
  ["PIRATE_SECTOR", "Pirate Controlled Sector", "hostile"],
  ["REBEL_SECTOR", "Rebel Controlled Sector", "hostile"],
  ["REBEL_SECTOR_MINIBOSS", "Rebel Stronghold", "hostile"],
  ["ROCK_SECTOR", "Rock Controlled Sector", "hostile"],
  ["ROCK_HOME", "Rock Homeworlds", "hostile"],
  ["SLUG_SECTOR", "Slug Controlled Nebula", "nebula"],
  ["SLUG_HOME", "Slug Home Nebula", "nebula"],
  ["NEBULA_SECTOR", "Uncharted Nebula", "nebula"],
  ["CRYSTAL_HOME", "Hidden Crystal Worlds", "hidden"],
  ["FINAL", "The Last Stand", "last-stand"],
] as const;

describe("SECTOR_TYPES", () => {
  it("has the 19 headings, each id once, under the page's groups", () => {
    assert.equal(SECTOR_TYPES.length, 19);
    const ids = SECTOR_TYPES.map((sector) => sector.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      SECTOR_TYPES.map((sector) => [sector.id, sector.name, sector.group]),
      EXPECTED.map((row) => [...row]),
    );
  });

  it("keeps a note on every heading and does not invent a generation order", () => {
    for (const sector of SECTOR_TYPES) {
      assert.ok(sector.notes.length > 0);
      for (const note of sector.notes) {
        assert.equal(typeof note, "string");
        assert.ok(note.trim().length > 0);
      }
    }
    const text = Object.fromEntries(
      SECTOR_TYPES.map((sector) => [sector.id, sector.notes.join(" ")]),
    );
    assert.match(text["STANDARD_SPACE"], /sector 1/);
    assert.match(text["ENGI_HOME"], /sector 3/);
    assert.match(text["ZOLTAN_HOME"], /sector 3/);
    assert.match(text["MANTIS_HOME"], /sector 3/);
    assert.match(text["REBEL_SECTOR_MINIBOSS"], /sector 5/);
    assert.match(text["ROCK_HOME"], /sector 5/);
    assert.match(text["ROCK_SECTOR"], /rarity \(4\)/);
    assert.match(text["ROCK_HOME"], /rarity \(2\)/);
    assert.match(text["SLUG_SECTOR"], /sector 4/);
    assert.match(text["SLUG_SECTOR"], /20%/);
    assert.match(text["SLUG_SECTOR"], /50%/);
    assert.match(text["SLUG_HOME"], /only once/i);
    assert.match(text["NEBULA_SECTOR"], /0\.8%/);
    assert.doesNotMatch(text["NEBULA_SECTOR"], /sector 4/);
    assert.match(text["CRYSTAL_HOME"], /Ancient device/);
    assert.match(text["FINAL"], /sector 8/);
    assert.match(text["FINAL"], /10 repairs/);
    assert.match(text["FINAL"], /22-44/);
    assert.equal(SECTOR_ORDER, null);
  });
});

describe("sector colour chances", () => {
  it("lands the two sector-2 nodes near 48% civilian, 32% hostile, and 20% nebula", () => {
    // Sectors lead: 48% green, 32% red, 20% purple.
    // INFERRED: those colours are the Civilian, Hostile, and Nebula groups.
    // Sector 2 always has all three (repeatable civilian and hostile sectors, and Uncharted Nebula).
    const counts = { civilian: 0, hostile: 0, nebula: 0 };
    const seeds = 4000;
    for (let seed = 1; seed <= seeds; seed++) {
      const route = buildRoute(seed);
      const start = route.filter((node) => node.col === 0);
      assert.equal(start.length, 1);
      // StarMap::GenerateSectorMap: sector 1 is STANDARD_SPACE, shown as the Civilian Sector.
      assert.equal(start[0]?.sector, "STANDARD_SPACE");
      assert.equal(start[0]?.name, "Civilian Sector");
      const lastCol = Math.max(...route.map((node) => node.col));
      const last = route.filter((node) => node.col === lastCol);
      assert.ok(last.length > 0);
      for (const node of last) assert.equal(node.name, "The Last Stand");
      assert.equal(
        route.some((node) => node.name === "Hidden Crystal Worlds"),
        false,
      );
      const sector2 = route.filter((node) => node.col === 1);
      assert.equal(sector2.length, 2);
      for (const node of sector2) {
        const group = SECTOR_TYPES.find((sector) => sector.id === node.sector)?.group;
        assert.ok(group === "civilian" || group === "hostile" || group === "nebula");
        counts[group] += 1;
      }
    }
    const total = seeds * 2;
    const share = (n: number) => n / total;
    const civilian = share(counts.civilian);
    const hostile = share(counts.hostile);
    const nebula = share(counts.nebula);
    assert.ok(Math.abs(civilian - 0.48) <= 0.04, `civilian ${civilian}`);
    assert.ok(Math.abs(hostile - 0.32) <= 0.04, `hostile ${hostile}`);
    assert.ok(Math.abs(nebula - 0.2) <= 0.04, `nebula ${nebula}`);
  });
});
