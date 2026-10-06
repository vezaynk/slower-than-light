import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enemyPool, hostileWeights, pickEnemy, requestFor } from "../enemy-gen.ts";
import {
  HOSTILE_CIVILIAN,
  HOSTILE_SHIP,
  OVERRIDE_HOSTILE1,
  SECTOR_HOSTILE_EVENTS,
  sectorHostiles,
} from "./sector-hostiles.ts";
import { SECTOR_TYPES } from "./sectors.ts";

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Share of the sector's random fights per faction ("pirate" for any pirate), at one sector number. */
function shares(sector: number, sectorName: string): Record<string, number> {
  const pool = enemyPool({ sector, sectorName, difficulty: "normal" });
  const w = hostileWeights(pool, sectorName)!;
  const total = w.reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  pool.forEach((e, i) => {
    const k = e.pirate ? "pirate" : e.cls.faction;
    out[k] = (out[k] ?? 0) + w[i] / total;
  });
  return out;
}

describe("hostile encounter lists (wiki/sector-hostiles.ts)", () => {
  it("has a list for every sector type on the Sectors page", () => {
    for (const t of SECTOR_TYPES) assert.ok(sectorHostiles(t.name)?.length, t.name);
    assert.equal(sectorHostiles("Cinder Reach"), null);
  });

  it("every listed event has a ship that names a faction or a pirate", () => {
    for (const events of Object.values(SECTOR_HOSTILE_EVENTS)) {
      for (const e of events) {
        const ship = HOSTILE_SHIP[e];
        assert.ok(ship, e);
        const want = requestFor(ship);
        assert.ok(want.faction || want.pirate, `${e}: ${ship}`);
      }
    }
    for (const [e, ship] of [...HOSTILE_CIVILIAN, ...OVERRIDE_HOSTILE1]) {
      const want = requestFor(ship);
      assert.ok(want.faction || want.pirate, `${e}: ${ship}`);
    }
  });

  it("Civilian sectors: the two templates' draws (5 of 11 and 2 of 12)", () => {
    const s = shares(3, "Civilian Sector");
    const civ = 5 / 11;
    const h1 = 2 / 12;
    const total = 5 + 2;
    const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
    close(s.pirate, (6 * civ + 2 * h1) / total);
    close(s.auto, (2 * civ + 6 * h1) / total);
    close(s.rebel, (3 * civ + 3 * h1) / total);
    close(s.mantis, (1 * h1) / total);
    assert.deepEqual(Object.keys(shares(1, "Civilian (Starting) Sector")).sort(), ["auto", "mantis", "pirate", "rebel"]);
  });

  it("a faction's own sector fields that faction; others it never lists are left out", () => {
    assert.ok(shares(5, "Mantis Controlled Sector").mantis > 0.4);
    assert.ok(shares(5, "Abandoned Sector").lanius > 0.5);
    assert.ok(shares(5, "Slug Controlled Nebula").slug > 0.3);
    assert.ok(shares(5, "Rock Homeworlds").rock > 0.4);
    assert.ok(shares(5, "Zoltan Controlled Sector").zoltan > 0.1);
    assert.ok(shares(5, "Hidden Crystal Worlds").crystal > 0.5);
    assert.ok(shares(5, "Pirate Controlled Sector").pirate > 0.5);
    for (const name of ["Civilian Sector", "Engi Controlled Sector", "Mantis Controlled Sector", "Rebel Controlled Sector"]) {
      assert.equal(shares(5, name).lanius, undefined, name);
    }
    assert.equal(shares(5, "Rock Controlled Sector").auto, undefined);
  });

  it("The Last Stand: Rebel ships only", () => {
    const r = seeded(11);
    for (let i = 0; i < 60; i++) {
      const p = pickEnemy({ sector: 8, sectorName: "The Last Stand", difficulty: "normal" }, r);
      assert.deepEqual([p.cls.faction, p.pirate], ["rebel", false]);
    }
  });

  it("an event's own ship request still wins over the sector list", () => {
    const ctx = { sector: 5, sectorName: "The Last Stand", difficulty: "normal" as const };
    assert.equal(pickEnemy(ctx, seeded(3), requestFor("Pirate ship")).pirate, true);
    assert.equal(pickEnemy({ ...ctx, sectorName: "Civilian Sector" }, seeded(4), requestFor("Lanius ship")).cls.faction, "lanius");
  });
});
