import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, DEPOWER_DRAIN_S, depowerWeapon, powerMask, sparePower, startCombat, step, toggleWeapon } from "./sim.ts";

describe("weapon depower (per the user; Game patches, Weapon Depower Delay)", () => {
  it("returns a switched-off weapon's bars to the reactor and draws them back when switched on", () => {
    const g = createGame(3, "kestrel-a");
    const sys = g.player.systems.weapons;
    const spare = sparePower(g.player);
    const power = sys.power;
    const w = g.player.weapons[0]!;
    assert.equal(powerMask(g.player)[0], true);
    toggleWeapon(g, w.uid);
    assert.equal(w.enabled, false);
    assert.ok(sys.power < power);
    assert.equal(sparePower(g.player), spare + (power - sys.power));
    toggleWeapon(g, w.uid);
    assert.equal(w.enabled, true);
    assert.equal(powerMask(g.player)[0], true);
    assert.equal(sys.power, power);
    assert.equal(sparePower(g.player), spare);
  });

  it("stays off when the reactor has too few spare bars", () => {
    const g = createGame(3, "kestrel-a");
    const w = g.player.weapons[0]!;
    depowerWeapon(g, w.uid);
    g.player.reactor -= sparePower(g.player);
    toggleWeapon(g, w.uid);
    assert.equal(w.enabled, false);
    assert.equal(powerMask(g.player)[0], false);
  });

  it("drains quickly, not at once, and holds while paused or while the radial menu is open", () => {
    const g = createGame(3, "kestrel-a");
    startCombat(g, "scout");
    const w = g.player.weapons[0]!;
    w.charge = 0.9;
    depowerWeapon(g, w.uid);
    assert.equal(w.charge, 0.9);
    g.paused = true;
    step(g, 0.05);
    assert.equal(w.charge, 0.9);
    g.paused = false;
    g.menuHold = true;
    step(g, 0.05);
    assert.equal(w.charge, 0.9);
    g.menuHold = false;
    step(g, 0.05);
    assert.ok(Math.abs(w.charge - (0.9 - 0.05 / DEPOWER_DRAIN_S)) < 1e-9);
    for (let i = 0; i < 40; i++) step(g, 0.05);
    assert.equal(w.charge, 0);
  });

  it("drains a gun that loses power to damage, not only one switched off", () => {
    const g = createGame(3, "kestrel-a");
    startCombat(g, "scout");
    const w = g.player.weapons[0]!;
    w.charge = 0.5;
    const sys = g.player.systems.weapons;
    sys.damage = sys.level;
    sys.power = 0;
    assert.equal(w.enabled, true);
    step(g, 0.05);
    assert.ok(w.charge < 0.5 && w.charge > 0.4);
  });

  it("drains an unpowered gun outside a fight too", () => {
    const g = createGame(3, "kestrel-a");
    g.phase = "map";
    const w = g.player.weapons[0]!;
    w.charge = 0.5;
    depowerWeapon(g, w.uid);
    for (let i = 0; i < 4; i++) step(g, 0.05);
    assert.ok(w.charge < 0.35 && w.charge > 0.25, `${w.charge}`);
  });
});
