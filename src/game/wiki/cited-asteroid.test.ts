import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, continueReward, createGame, startCombat, step } from "../sim.ts";
import { asteroidIntervalSeconds, asteroidSide } from "./cited-asteroid.ts";

describe("asteroid interval", () => {
  it("is random and shortens as the shield system level rises", () => {
    assert.equal(asteroidIntervalSeconds(0, 0), 6);
    assert.ok(asteroidIntervalSeconds(0, 0.999999) < 10);
    assert.ok(asteroidIntervalSeconds(0, 0) < asteroidIntervalSeconds(0, 0.9));
    assert.ok(asteroidIntervalSeconds(8, 0.4) < asteroidIntervalSeconds(0, 0.4));
    assert.ok(asteroidIntervalSeconds(4, 0.2) < asteroidIntervalSeconds(2, 0.2));
    assert.equal(asteroidIntervalSeconds(8, 0), 1.5);
    assert.equal(asteroidIntervalSeconds(12, 0), asteroidIntervalSeconds(8, 0));
  });

  it("follows shield system level, not power or ion", () => {
    const powered = createGame(5);
    powered.player.systems.shields.level = 4;
    powered.player.systems.shields.power = 4;
    startCombat(powered, "scout", true);

    const down = createGame(5);
    down.player.systems.shields.level = 4;
    down.player.systems.shields.power = 0;
    down.player.systems.shields.ion = [5, 5, 5, 5];
    startCombat(down, "scout", true);

    const open = createGame(5);
    open.player.systems.shields.level = 0;
    open.player.systems.shields.power = 0;
    startCombat(open, "scout", true);

    assert.equal(down.asteroidWait, powered.asteroidWait);
    assert.ok((down.asteroidWait ?? 0) > 0);
    assert.ok((open.asteroidWait ?? 0) > (powered.asteroidWait ?? 0));
    assert.equal(powered.asteroidT, 0);
  });

  it("rolls a new wait from the current shield level after a rock", () => {
    const g = createGame(9);
    g.player.systems.shields.level = 8;
    g.player.systems.shields.power = 0;
    startCombat(g, "scout", true);
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    g.player.systems.engines.power = 0;
    g.enemy!.systems.engines.power = 0;
    g.asteroidWait = 0.05;
    g.asteroidT = 0;
    step(g, 0.05);
    assert.equal(g.shots.filter((s) => s.label === "Rock").length, 2);
    assert.ok((g.asteroidWait ?? 0) >= 1.5 && (g.asteroidWait ?? 0) < 2.5);
    assert.equal(g.asteroidT, 0);
  });

  it("keeps throwing rocks after the fight and does not train on those", () => {
    const g = createGame(11);
    startCombat(g, "scout", true);
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    g.player.systems.engines.power = 0;
    g.enemy!.systems.engines.power = 0;
    g.player.systems.shields.power = 2;
    g.player.shieldNow = 1;
    g.enemySurrender = null;
    const nen = g.crew.find((c) => c.id === "c-nen");
    assert.ok(nen);
    nen.room = "p-shields";
    nen.path = [];
    const land = () => {
      g.asteroidWait = 0.05;
      g.asteroidT = 0;
      const before = g.player.shieldNow;
      for (let i = 0; i < 40 && g.player.shieldNow === before && g.phase !== "defeat"; i++) step(g, 0.05);
    };
    land();
    assert.equal(nen.skills?.shields, 1);
    assert.equal(g.player.shieldNow, 0);
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.phase, "reward");
    assert.equal(g.asteroid, true);
    continueReward(g);
    assert.equal(g.phase, "map");
    g.player.shieldNow = 1;
    land();
    assert.equal(nen.skills?.shields, 1);
    assert.equal(g.player.shieldNow, 0);
    assert.equal(g.asteroid, true);
    const here = g.beacons.find((b) => b.id === g.here);
    assert.ok(here && here.links[0]);
    g.fuel = 3;
    commitJump(g, here.links[0]);
    assert.equal(g.asteroid, false);
  });

  it("gives a rock a small chance of a fire or a breach, not both", () => {
    // Environmental Hazards, Asteroid Field: "They have a small chance to cause a fire or a breach."
    // Fires: "asteroids (which can either cause a breach, or fires, or no additional effect)".
    assert.equal(asteroidSide(0), "fire");
    assert.equal(asteroidSide(0.049), "fire");
    assert.equal(asteroidSide(0.05), "breach");
    assert.equal(asteroidSide(0.099), "breach");
    assert.equal(asteroidSide(0.1), "none");
    const seen = new Set<string>();
    for (let seed = 1; seed < 80 && seen.size < 3; seed++) {
      const g = createGame(seed);
      startCombat(g, "scout", true);
      for (const w of g.player.weapons) w.enabled = false;
      for (const w of g.enemy?.weapons ?? []) w.enabled = false;
      g.player.systems.engines.power = 0;
      g.enemy!.systems.engines.power = 0;
      g.asteroidWait = 0.05;
      g.asteroidT = 0;
      step(g, 0.05);
      for (const shot of g.shots) {
        if (shot.label !== "Rock") continue;
        assert.ok(shot.fireChance === 0 || shot.fireChance === 1);
        assert.ok(shot.breachChance === 0 || shot.breachChance === 1);
        assert.ok(shot.fireChance + shot.breachChance <= 1);
        seen.add(shot.fireChance === 1 ? "fire" : shot.breachChance === 1 ? "breach" : "none");
      }
    }
    assert.deepEqual([...seen].sort(), ["breach", "fire", "none"]);
  });

  it("starts that fire or breach when the rock hits a room", () => {
    const land = (want: "fire" | "breach") => {
      for (let seed = 1; seed < 240; seed++) {
        const g = createGame(seed);
        startCombat(g, "scout", true);
        for (const w of g.player.weapons) w.enabled = false;
        for (const w of g.enemy?.weapons ?? []) w.enabled = false;
        g.player.systems.engines.power = 0;
        g.player.systems.shields.power = 0;
        g.player.shieldNow = 0;
        if (g.player.kits.swarm) g.player.kits.swarm.loadout = [];
        g.asteroidWait = 0.05;
        g.asteroidT = 0;
        step(g, 0.05);
        const rock = g.shots.find(
          (s) => s.label === "Rock" && s.at === "player" && (want === "fire" ? s.fireChance === 1 : s.breachChance === 1),
        );
        if (!rock) continue;
        const room = g.player.rooms.find((r) => r.id === rock.targetRoom);
        if (!room) continue;
        const before = want === "fire" ? room.fire : room.breach;
        // The rock waits 0.2s, then flies 0.8s. One long step only spends the wait.
        for (let i = 0; i < 20; i++) step(g, 0.1);
        const after = g.player.rooms.find((r) => r.id === rock.targetRoom);
        if (after && (want === "fire" ? after.fire : after.breach) > before) return true;
      }
      return false;
    };
    assert.equal(land("fire"), true);
    assert.equal(land("breach"), true);
  });

  it("keeps the field when the enemy escapes", () => {
    const g = createGame(4);
    startCombat(g, "scout", true);
    const enemy = g.enemy;
    assert.ok(enemy);
    enemy.systems.engines.power = enemy.systems.engines.level;
    enemy.systems.pilot.damage = 0;
    const pilot = enemy.rooms.find((r) => r.system === "pilot");
    const crew = g.crew.find((c) => c.side === "enemy" && c.hp > 0);
    assert.ok(pilot && crew);
    crew.room = pilot.id;
    crew.aboard = "enemy";
    crew.path = [];
    g.enemyEscape = { mode: "start", seconds: 0.05, chance: 0, threshold: 0, rolled: true, running: true, pursuit: false };
    g.enemyFlee = 0;
    step(g, 0.05);
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
    assert.equal(g.asteroid, true);
  });
});
