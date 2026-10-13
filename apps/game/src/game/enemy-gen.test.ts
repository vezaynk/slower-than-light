import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEAPONS } from "./content.ts";
import {
  arm,
  crewCount,
  enemyPool,
  hullFor,
  optionalChance,
  pickElite,
  pickEnemy,
  rangePool,
  requestFor,
  rollEnemy,
  rollMaxLevel,
  UPGRADE_BUDGET,
} from "./enemy-gen.ts";
import { weaponIdForName } from "./gear-look.ts";
import { createGame, startCombat } from "./sim.ts";
import { ENEMY_CLASSES, ENEMY_WEAPON_POOLS } from "./wiki/enemy-ships.ts";

const SECTOR_NAMES = [
  "Civilian Sector",
  "Engi Controlled Sector",
  "Zoltan Homeworlds",
  "Mantis Controlled Sector",
  "Rock Controlled Sector",
  "Slug Home Nebula",
  "Pirate Controlled Sector",
  "Rebel Stronghold",
  "Hidden Crystal Worlds",
  // Lanius ships fight only in the Abandoned Sector's hostile list (wiki/sector-hostiles.ts).
  "Abandoned Sector",
];

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

describe("documented enemy pool", () => {
  it("covers all 47 classes from the ten faction pages", () => {
    assert.equal(ENEMY_CLASSES.length, 47);
    assert.deepEqual(
      [...new Set(ENEMY_CLASSES.map((c) => c.faction))].sort(),
      ["auto", "crystal", "engi", "federation", "lanius", "mantis", "rebel", "rock", "slug", "zoltan"],
    );
  });

  it("can field every class: by sector pool, the Rebel Elite path, or its one event", () => {
    const reachable = new Set<string>();
    for (let sector = 1; sector <= 8; sector++) {
      for (const sectorName of SECTOR_NAMES) {
        for (const e of enemyPool({ sector, sectorName, difficulty: "normal" })) reachable.add(e.cls.id);
      }
    }
    const r = seeded(7);
    for (let i = 0; i < 40; i++) reachable.add(pickElite(r).id);
    for (const cls of ENEMY_CLASSES.filter((c) => c.uniqueTo)) {
      const event = cls.uniqueTo!.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      reachable.add(pickEnemy({ sector: 6, sectorName: "Rock Controlled Sector", difficulty: "normal" }, seeded(1), { event }).cls.id);
    }
    assert.deepEqual(ENEMY_CLASSES.map((c) => c.id).filter((id) => !reachable.has(id)), []);
  });

  it("follows sector 1's event lists: Rebel, Auto-ship, Mantis, and pirates only", () => {
    const regular = enemyPool({ sector: 1, sectorName: "Civilian (Starting) Sector", difficulty: "normal" }).filter((e) => !e.pirate);
    assert.deepEqual([...new Set(regular.map((e) => e.cls.faction))].sort(), ["auto", "mantis", "rebel"]);
  });

  it("keeps Elites, event-only ships, and Federation (outside Crystal Homeworlds) out of the random pool", () => {
    const ids = enemyPool({ sector: 5, sectorName: "Civilian Sector", difficulty: "normal" }).map((e) => e.cls.id);
    for (const id of ["elite-fighter", "elite-assault", "rock-assault-elite", "federation-scout"]) assert.ok(!ids.includes(id), id);
  });

  it("maps every faction pool weapon to a fitted weapon", () => {
    const names = new Set(Object.values(ENEMY_WEAPON_POOLS).flat());
    assert.deepEqual([...names].filter((n) => !weaponIdForName(n)), []);
  });

  it("honours the ship an event asks for", () => {
    const ctx = { sector: 3, sectorName: "Civilian Sector", difficulty: "normal" as const };
    assert.equal(pickEnemy(ctx, seeded(2), requestFor("Lanius ship")).cls.faction, "lanius");
    const zp = pickEnemy(ctx, seeded(3), requestFor("Zoltan pirate ship"));
    assert.deepEqual([zp.cls.faction, zp.pirate], ["zoltan", true]);
    assert.equal(pickEnemy(ctx, seeded(4), requestFor("Pirate ship")).pirate, true);
  });
});

describe("rolled ships stay inside the printed numbers", () => {
  it("hull, crew, systems, and weapon power", () => {
    for (const cls of ENEMY_CLASSES) {
      for (let sector = cls.sectors[0]; sector <= cls.sectors[1]; sector++) {
        const ctx = { sector, sectorName: "Civilian Sector", difficulty: "normal" as const };
        const spec = rollEnemy(cls, false, ctx, seeded(sector * 31 + cls.id.length));
        assert.ok(spec.hull >= cls.hull[0] && spec.hull <= cls.hull[1], `${cls.id} hull`);
        assert.ok(spec.crew.length >= cls.crew[0] && spec.crew.length <= cls.crew[1], `${cls.id} crew`);
        for (const [id, [level]] of Object.entries(spec.systems)) {
          const key = id === "pilot" ? "pilot" : id;
          const range = cls.systems[key as keyof typeof cls.systems] ?? cls.optional[key as keyof typeof cls.optional];
          assert.ok(range && level >= range[0] && level <= range[1], `${cls.id} ${id} ${level}`);
        }
        const power = spec.weapons.reduce((sum, id) => sum + WEAPONS[id].power, 0);
        assert.ok(spec.weapons.length >= 1, `${cls.id} unarmed`);
        assert.ok(power <= (spec.systems.weapons?.[0] ?? 0) || spec.weapons.length === 1, `${cls.id} over power`);
        assert.equal(spec.missiles, cls.missiles);
      }
    }
  });

  it("builds a fight from a documented class, never the old invented names", () => {
    const invented = ["Cinder picket", "Margin cutter", "Ash barge", "Hullhook", "Gate hunter", "Hook", "Barb", "Pilot", "Gunner", "Warden"];
    for (let seed = 1; seed <= 30; seed++) {
      const g = createGame(seed);
      g.sector = 1 + (seed % 7);
      startCombat(g, "pool");
      assert.ok(g.enemy?.classId, `seed ${seed}`);
      assert.ok(!invented.includes(g.enemy!.name));
      for (const c of g.crew.filter((m) => m.side === "enemy")) assert.ok(!invented.includes(c.name));
    }
  });
});

describe("enemy generation by difficulty (Mathchamp, Details on enemy ship generation)", () => {
  const ctx = (sector: number, difficulty: "easy" | "normal" | "hard" = "normal") => ({
    sector,
    sectorName: "Civilian Sector",
    difficulty,
  });
  const cls = (id: string) => ENEMY_CLASSES.find((c) => c.id === id)!;
  /** Share of rolled ships with a Crew Teleporter (the sling kit). */
  const teleporters = (id: string, pirate: boolean, sector: number, difficulty: "easy" | "normal" | "hard" = "hard") => {
    const rand = seeded(sector * 97 + (pirate ? 1 : 0));
    let n = 0;
    for (let i = 0; i < 4000; i++) if (rollEnemy(cls(id), pirate, ctx(sector, difficulty), rand).kits.sling) n++;
    return n / 4000;
  };

  it("fits an optional system 20% of the time on Normal in sector 1, +10% each sector, Hard +10%, Easy delayed and -10%", () => {
    const pct = (d: "easy" | "normal" | "hard") => [1, 2, 3, 4, 5, 6, 7, 8].map((s) => Math.round(optionalChance(s, d) * 100));
    assert.deepEqual(pct("normal"), [20, 30, 40, 50, 60, 70, 80, 90]);
    assert.deepEqual(pct("hard"), [30, 40, 50, 60, 70, 80, 90, 100]);
    assert.deepEqual(pct("easy"), [10, 10, 20, 30, 40, 50, 60, 70]);
    assert.ok(Math.abs(teleporters("rebel-fighter", false, 1, "normal") - 0.2) < 0.03);
    assert.ok(Math.abs(teleporters("rebel-fighter", false, 4, "hard") - 0.6) < 0.03);
  });

  it("keeps a bracketed system on the version the page names", () => {
    // Rock Ships: Rock Scout "Crew Teleporter (1-2) [Pirate Scout only]"; Rock Investigator "[Rock Investigator only]".
    assert.equal(teleporters("rock-scout", false, 8), 0);
    assert.equal(teleporters("rock-scout", true, 8), 1);
    assert.equal(teleporters("rock-investigator", false, 8), 1);
    assert.equal(teleporters("rock-investigator", true, 8), 0);
  });

  it("rolls the per-sector maximum from the printed range, and Easy sector 1 ships stay at their starting levels", () => {
    // ftl-layouts.mikehopley.org, Rebel Fighter Shields 2-8 on Hard: sectors 1-2 "2-3", 3 "3-5", 4 "4-6", 8 "7-8".
    const want: Record<number, [number, number]> = { 1: [2, 3], 3: [3, 5], 4: [4, 6], 8: [7, 8] };
    const rand = seeded(5);
    for (const [sector, [lo, hi]] of Object.entries(want)) {
      const seen = new Set<number>();
      for (let i = 0; i < 400; i++) seen.add(rollMaxLevel([2, 8], ctx(Number(sector), "hard"), rand));
      assert.deepEqual([Math.min(...seen), Math.max(...seen)], [lo, hi], `sector ${sector}`);
    }
    const easy = seeded(9);
    for (let i = 0; i < 200; i++) {
      const spec = rollEnemy(cls("rebel-fighter"), false, ctx(1, "easy"), easy);
      assert.equal(spec.systems.shields?.[0], 2);
      assert.equal(spec.systems.weapons?.[0], 2);
    }
  });

  it("spends no more than the sector's offensive, defensive, and general budget", () => {
    for (const d of ["easy", "normal", "hard"] as const) {
      for (let sector = 1; sector <= 8; sector++) {
        const [o, def, gen] = UPGRADE_BUDGET[d][sector - 1];
        const rand = seeded(sector + 31);
        for (let i = 0; i < 50; i++) {
          const c = cls("rebel-fighter");
          const spec = rollEnemy(c, false, ctx(sector, d), rand);
          let upgrades = 0;
          for (const [id, r] of Object.entries(c.systems)) {
            const lvl = (spec.systems as Record<string, [number, number]>)[id]?.[0];
            if (lvl != null) upgrades += lvl - r[0];
          }
          assert.ok(upgrades <= o + def + gen, `${d} sector ${sector}: ${upgrades}`);
        }
      }
    }
  });

  it("crew and hull follow the per-sector tables", () => {
    // Mantis Scout crew 3-4: 3 in sectors 1-4, 4 in sectors 5-6. Rebel Fighter crew 3-5: 3, 3, 3, 4, 4, 4, 5, 5.
    assert.deepEqual([1, 2, 3, 4, 5, 6].map((s) => crewCount(cls("mantis-scout").crew, ctx(s))), [3, 3, 3, 3, 4, 4]);
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((s) => crewCount(cls("rebel-fighter").crew, ctx(s))), [3, 3, 3, 4, 4, 4, 5, 5]);
    // Mantis Fighter hull 10-16 from sector 2. Rebel Fighter 10-17, "(9-16 on Easy)".
    assert.deepEqual([2, 5, 8].map((s) => hullFor(cls("mantis-fighter"), ctx(s))), [10, 13, 16]);
    assert.deepEqual([1, 8].map((s) => hullFor(cls("rebel-fighter"), ctx(s, "easy"))), [9, 16]);
  });

  it("arms by Mathchamp's weapon rules", () => {
    const rand = seeded(3);
    for (let i = 0; i < 300; i++) {
      for (const level of [1, 2, 3, 4, 6, 8]) {
        const { weapons } = arm(ENEMY_WEAPON_POOLS.rebel, level, rand);
        const power = weapons.map((id) => WEAPONS[id].power);
        assert.ok(power.reduce((a, b) => a + b, 0) <= level);
        assert.ok(power.every((p) => p < level || p === 1), `level ${level}: ${weapons}`);
        if (level >= 3) assert.ok(power[0] >= 2, `level ${level} first gun ${weapons[0]}`);
        // A ship never opens on a gun that clears neither flag (non-damaging beam or bomb).
        const first = WEAPONS[weapons[0]];
        assert.ok(first.kind === "laser" || first.kind === "ion" || (first.damage > 0 && first.kind !== "bomb"), weapons[0]);
      }
    }
  });

  it("delays which classes appear by a sector on Easy", () => {
    // Mantis Fighter: "Encountered in sectors: 2-8". On Easy it first appears in sector 3.
    const has = (sector: number, d: "easy" | "normal") =>
      rangePool({ sector, sectorName: "Mantis Controlled Sector", difficulty: d }).some((e) => e.cls.id === "mantis-fighter");
    assert.equal(has(2, "normal"), true);
    assert.equal(has(2, "easy"), false);
    assert.equal(has(3, "easy"), true);
  });
});

describe("Federation requests", () => {
  it("field a Federation ship, regular or pirate, wherever the event is", () => {
    const ctx = { sector: 3, sectorName: "Civilian Sector", difficulty: "normal" as const };
    for (let i = 1; i <= 10; i++) assert.equal(pickEnemy(ctx, seeded(i * 97), requestFor("Federation ship")).cls.faction, "federation");
  });
});
