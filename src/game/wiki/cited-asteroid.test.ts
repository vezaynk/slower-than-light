import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, continueReward, createGame, startCombat, step } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  ASTEROID_TABLE,
  asteroidPhaseSeconds,
  asteroidSide,
  asteroidSpawnSeconds,
  nextAsteroidPhase,
} from "./cited-asteroid.ts";

/** Put the field in a long wave with the next rock due now. */
function rockNow(g: Game) {
  g.asteroidPhase = "wave1";
  g.asteroidPhaseLeft = 100;
  g.asteroidWait = 0.05;
  g.asteroidT = 0;
}

describe("asteroid field timing (xftl doc/asteroids)", () => {
  it("reads the table by shield bubbles: 0-1, 2, 3, 4+", () => {
    // Shields level 0-3 is 0-1 bubbles, 4-5 is 2, 6-7 is 3, 8+ is 4.
    assert.equal(asteroidPhaseSeconds(0, "break", 0), 5);
    assert.equal(asteroidPhaseSeconds(3, "wave1", 1), 16);
    assert.equal(asteroidPhaseSeconds(4, "wave1", 1), 20);
    assert.equal(asteroidPhaseSeconds(6, "break", 0), 12);
    assert.equal(asteroidPhaseSeconds(8, "wave1", 1), 30);
    assert.equal(asteroidSpawnSeconds(2, "wave1", 0), 1.8);
    assert.equal(asteroidSpawnSeconds(8, "wave2", 0), 0.54);
    assert.equal(asteroidSpawnSeconds(12, "wave2", 1), 0.95);
    assert.equal(ASTEROID_TABLE.length, 4);
    // More bubbles, faster rocks (Environmental Hazards: "more frequently if your shields are highly upgraded").
    assert.ok(asteroidSpawnSeconds(8, "wave1", 0.5) < asteroidSpawnSeconds(0, "wave1", 0.5));
  });

  it("cycles break, wave 1, wave 2, and throws rocks only in a wave", () => {
    assert.equal(nextAsteroidPhase("break"), "wave1");
    assert.equal(nextAsteroidPhase("wave1"), "wave2");
    assert.equal(nextAsteroidPhase("wave2"), "break");
    const g = createGame(9);
    startCombat(g, "scout", true);
    assert.equal(g.asteroidPhase, "break");
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    g.asteroidPhaseLeft = 100;
    for (let i = 0; i < 60; i++) step(g, 0.05);
    assert.equal(g.shots.filter((s) => s.label === "Rock").length, 0);
  });

  it("follows shield system level, not power or ion", () => {
    const wait = (power: number, ion: number[], level: number) => {
      const g = createGame(5);
      g.player.systems.shields.level = level;
      g.player.systems.shields.power = power;
      g.player.systems.shields.ion = ion;
      startCombat(g, "scout", true);
      return g.asteroidPhaseLeft;
    };
    assert.equal(wait(0, [5, 5, 5, 5], 6), wait(6, [], 6));
    assert.notEqual(wait(0, [], 0), wait(6, [], 6));
  });

  it("aims rocks at the two ships in turn", () => {
    const g = createGame(9);
    g.player.systems.shields.level = 8;
    g.player.systems.shields.power = 0;
    startCombat(g, "scout", true);
    for (const w of g.player.weapons) w.enabled = false;
    for (const w of g.enemy?.weapons ?? []) w.enabled = false;
    g.player.systems.engines.power = 0;
    g.enemy!.systems.engines.power = 0;
    const at: string[] = [];
    for (let i = 0; i < 4; i++) {
      rockNow(g);
      const before = g.shots.length;
      step(g, 0.05);
      for (const s of g.shots.slice(before)) if (s.label === "Rock") at.push(s.at ?? "");
      assert.ok((g.asteroidWait ?? 0) >= 0.54 && (g.asteroidWait ?? 0) <= 1.35);
    }
    assert.deepEqual(at, ["player", "enemy", "player", "enemy"]);
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
    // After the enemy dies, every second rock is its wasted turn (xftl doc/asteroids), so force up to two.
    const land = () => {
      const before = g.player.shieldNow;
      for (let tries = 0; tries < 2 && g.player.shieldNow === before; tries++) {
        rockNow(g);
        for (let i = 0; i < 40 && g.player.shieldNow === before && g.phase !== "defeat"; i++) step(g, 0.05);
      }
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
      rockNow(g);
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
        rockNow(g);
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
