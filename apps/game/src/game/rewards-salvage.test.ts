import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "./sim.ts";

describe("default fight salvage", () => {
  it("pays two low resources among fuel, missiles, and drone parts", () => {
    const seen = { fuel: false, missiles: false, parts: false };
    for (let seed = 1; seed <= 48; seed++) {
      const g = createGame(seed);
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.fightEvent = null;
      g.pending = null;
      for (const w of g.enemy.weapons) w.enabled = false;
      const fuel = g.fuel;
      const missiles = g.missiles;
      const parts = g.player.parts;
      g.enemy.hull = 0;
      step(g, 0.05);
      assert.equal(g.phase, "reward");
      const note = g.reward?.note ?? "";
      const fuelDraws = [...note.matchAll(/Low fuel (\d+)\./g)].map((m) => Number(m[1]));
      const missileDraws = [...note.matchAll(/Low missiles (\d+)\./g)].map((m) => Number(m[1]));
      const partDraws = note.match(/Low drone part 1\./g) ?? [];
      assert.equal(fuelDraws.length + missileDraws.length + partDraws.length, 2);
      for (const n of fuelDraws) assert.ok(n >= 1 && n <= 3);
      for (const n of missileDraws) assert.ok(n >= 1 && n <= 2);
      assert.equal(g.fuel - fuel, fuelDraws.reduce((sum, n) => sum + n, 0));
      assert.equal(g.missiles - missiles, missileDraws.reduce((sum, n) => sum + n, 0));
      assert.equal(g.player.parts - parts, partDraws.length);
      if (fuelDraws.length) seen.fuel = true;
      if (missileDraws.length) seen.missiles = true;
      if (partDraws.length) seen.parts = true;
    }
    assert.equal(seen.fuel && seen.missiles && seen.parts, true);
  });

  it("mounts a priced weapon on about 3 percent of wrecks, and a full rack adds no scrap", () => {
    let mounted = 0;
    const trials = 400;
    for (let seed = 1; seed <= trials; seed++) {
      const g = createGame(seed);
      g.player.weapons = [];
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.fightEvent = null;
      g.pending = null;
      const before = g.scrap;
      g.enemy.hull = 0;
      step(g, 0.05);
      assert.equal(g.phase, "reward");
      const scrap = g.reward?.scrap ?? 0;
      assert.ok(scrap >= 12 && scrap <= 19);
      assert.equal(g.scrap - before, scrap);
      if (g.player.weapons.length > 0) mounted += 1;
    }
    assert.ok(mounted >= 1 && mounted <= 30, String(mounted));

    for (let seed = 1; seed <= 40; seed++) {
      const g = createGame(seed);
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.fightEvent = null;
      g.pending = null;
      while (g.player.weapons.length < 8) {
        g.player.weapons.push({
          uid: `pad-${g.player.weapons.length}`,
          defId: "leto",
          charge: 0,
          enabled: false,
          autofire: false,
          target: null,
        });
      }
      g.enemy.hull = 0;
      step(g, 0.05);
      assert.ok((g.reward?.scrap ?? 0) <= 19);
      assert.equal(g.player.weapons.length, 8);
    }
  });

  it("a crew kill rolls the five default shapes, and a pending dive stays one fuel", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 180 && seen.size < 4; seed++) {
      const g = createGame(seed);
      g.player.weapons = [];
      const crew = g.crew.filter((c) => c.side === "player").length;
      startCombat(g, "scout");
      assert.ok(g.enemy);
      g.fightEvent = null;
      g.pending = null;
      g.enemy.automated = false;
      g.enemy.classId = g.enemy.classId || "cited";
      if (g.enemy.kits.cradle) g.enemy.kits.cradle.level = 0;
      for (const w of g.enemy.weapons) w.enabled = false;
      if (g.enemySurrender) g.enemySurrender.chance = 0;
      if (g.enemyEscape) g.enemyEscape.mode = "never";
      for (const c of g.crew) if (c.side === "enemy") c.hp = 0;
      step(g, 0);
      assert.equal(g.phase, "reward", String(seed));
      const note = g.reward?.note ?? "";
      const low = note.match(/Low fuel|Low missiles|Low drone part/g) ?? [];
      const fuel = note.match(/Fuel: (\d+)\./);
      if (low.length === 2) {
        const scrap = g.reward?.scrap ?? 0;
        assert.ok(scrap >= 12 && scrap <= 23, note);
        seen.add("resources");
      } else if (fuel && low.length === 0) {
        const n = Number(fuel[1]);
        assert.ok(n >= 3 && n <= 6, note);
        assert.ok((g.reward?.scrap ?? 0) >= 19 && (g.reward?.scrap ?? 0) <= 23, note);
        assert.equal(g.player.weapons.length, 0);
        seen.add("fuel");
      } else if (note.includes("A survivor comes aboard.")) {
        assert.ok((g.reward?.scrap ?? 0) >= 7 && (g.reward?.scrap ?? 0) <= 10, note);
        assert.equal(g.crew.filter((c) => c.side === "player").length, crew + 1);
        assert.equal(low.length, 0);
        seen.add("survivor");
      } else if (/mounted\.|stowed in cargo\./.test(note) && low.length === 0) {
        assert.ok((g.reward?.scrap ?? 0) >= 7 && (g.reward?.scrap ?? 0) <= 10, note);
        assert.ok(g.player.weapons.length > 0 || (g.cargo ?? []).length > 0);
        seen.add("weapon");
      } else assert.fail(note || "(empty)");
    }
    assert.deepEqual([...seen].sort(), ["fuel", "resources", "survivor", "weapon"]);

    const dive = createGame(9);
    startCombat(dive, "scout");
    assert.ok(dive.enemy);
    dive.fightEvent = null;
    dive.pending = "dive:1";
    dive.enemy.automated = false;
    dive.enemy.classId = dive.enemy.classId || "cited";
    for (const c of dive.crew) if (c.side === "enemy") c.hp = 0;
    step(dive, 0);
    assert.equal(dive.phase, "reward");
    assert.equal(dive.reward?.note, "1 fuel.");
    assert.equal(dive.reward?.scrap, 0);
  });
});
