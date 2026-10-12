import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, hurtSystem, powerDown, sparePower, step } from "./sim.ts";

describe("Per the user: a repaired system takes back spare power", () => {
  it("re-powers the bar damage cut once it is repaired", () => {
    const g = createGame(1);
    const eng = g.player.systems.engines;
    const before = eng.power;
    assert.ok(before >= 1);
    hurtSystem(g.player, "engines", 1);
    assert.equal(eng.power, before - 1);
    eng.damage = 0;
    step(g, 0.05);
    assert.equal(eng.power, before);
    assert.equal(eng.want, undefined);
  });

  it("stays down when there is no spare power", () => {
    const g = createGame(2);
    const eng = g.player.systems.engines;
    const before = eng.power;
    hurtSystem(g.player, "engines", 1);
    const reactor = g.player.reactor;
    g.player.reactor -= sparePower(g.player);
    eng.damage = 0;
    step(g, 0.05);
    assert.equal(eng.power, before - 1);
    g.player.reactor = reactor;
  });

  it("leaves a system the player turned down", () => {
    const g = createGame(3);
    const eng = g.player.systems.engines;
    const before = eng.power;
    hurtSystem(g.player, "engines", 1);
    powerDown(g, "engines");
    eng.damage = 0;
    step(g, 0.05);
    assert.equal(eng.power, before - 2);
  });
});
