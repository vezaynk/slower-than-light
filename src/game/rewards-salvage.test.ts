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
});
