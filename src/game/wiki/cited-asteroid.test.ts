import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { asteroidIntervalSeconds } from "./cited-asteroid.ts";

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
});
