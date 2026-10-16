import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, DEPOWER_DRAIN_S, depowerWeapon, powerDown, powerMask, powerUp, sparePower, startCombat, step, toggleWeapon } from "./sim.ts";
import type { WeaponInst } from "./types.ts";

describe("weapon depower (per the user; Game patches, Weapon Depower Delay)", () => {
  it("returns a switched-off weapon's bars to the reactor and draws them back when switched on", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
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
    const g = createGame(3, "PLAYER_SHIP_HARD");
    const w = g.player.weapons[0]!;
    depowerWeapon(g, w.uid);
    g.player.reactor -= sparePower(g.player);
    toggleWeapon(g, w.uid);
    assert.equal(w.enabled, false);
    assert.equal(powerMask(g.player)[0], false);
  });

  it("drains quickly, not at once, and holds while paused or while the radial menu is open", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
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
    const g = createGame(3, "PLAYER_SHIP_HARD");
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

  it("enables weapons from the left when power is added, and disables them when it is removed", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    g.player.reactor = 25;
    const sys = g.player.systems.weapons;
    sys.level = 8;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 0;
    const gun = (defId: string, uid: string): WeaponInst => ({
      uid,
      defId,
      charge: 0,
      enabled: false,
      autofire: false,
      target: null,
    });
    // Burst Laser II needs 2. Basic Laser needs 1. One click covers the whole cost.
    g.player.weapons = [gun("LASER_BURST_3", "burst"), gun("LASER_BURST_1", "laser")];
    powerUp(g, "weapons");
    assert.equal(sys.power, 2);
    assert.equal(g.player.weapons[0]!.enabled, true);
    assert.equal(g.player.weapons[1]!.enabled, false);
    assert.deepEqual(powerMask(g.player), [true, false]);
    powerUp(g, "weapons");
    assert.equal(sys.power, 3);
    assert.equal(g.player.weapons[1]!.enabled, true);
    assert.deepEqual(powerMask(g.player), [true, true]);
    powerDown(g, "weapons");
    assert.equal(sys.power, 2);
    assert.equal(g.player.weapons[0]!.enabled, true);
    assert.equal(g.player.weapons[1]!.enabled, false);
    powerDown(g, "weapons");
    assert.equal(sys.power, 0);
    assert.equal(g.player.weapons[0]!.enabled, false);
    assert.equal(g.player.weapons[1]!.enabled, false);
    assert.deepEqual(powerMask(g.player), [false, false]);
  });

  it("does not retarget weapon power when another system changes", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    const before = g.player.weapons.map((w) => w.enabled);
    const engines = g.player.systems.engines.power;
    if (sparePower(g.player) > 0 && engines < g.player.systems.engines.level) powerUp(g, "engines");
    else powerDown(g, "engines");
    assert.deepEqual(
      g.player.weapons.map((w) => w.enabled),
      before,
    );
  });

  it("clears the aim of a weapon that is disabled, and leaves the other gun's aim", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    startCombat(g, "scout");
    g.player.reactor = 25;
    const sys = g.player.systems.weapons;
    sys.level = 8;
    sys.damage = 0;
    sys.ion = [];
    sys.power = 3;
    const gun = (defId: string, uid: string, target: string): WeaponInst => ({
      uid,
      defId,
      charge: 0,
      enabled: true,
      autofire: false,
      target,
    });
    g.player.weapons = [gun("LASER_BURST_3", "burst", "keep"), gun("LASER_BURST_1", "laser", "drop")];
    g.armed = "laser";
    g.targeting = true;
    g.beamAnchor = { x: 1, y: 1 };
    powerDown(g, "weapons");
    assert.equal(g.player.weapons[1]!.enabled, false);
    assert.equal(g.player.weapons[1]!.target, null);
    assert.equal(g.player.weapons[0]!.target, "keep");
    assert.equal(g.targeting, false);
    assert.equal(g.beamAnchor, null);

    g.player.weapons[0]!.target = "keep";
    g.armed = "burst";
    g.targeting = true;
    depowerWeapon(g, "laser");
    assert.equal(g.player.weapons[0]!.target, "keep");
    assert.equal(g.targeting, true);
    depowerWeapon(g, "burst");
    assert.equal(g.player.weapons[0]!.target, null);
    assert.equal(g.targeting, false);
  });

  it("drains an unpowered gun outside a fight too", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD");
    g.phase = "map";
    const w = g.player.weapons[0]!;
    w.charge = 0.5;
    depowerWeapon(g, w.uid);
    for (let i = 0; i < 4; i++) step(g, 0.05);
    assert.ok(w.charge < 0.35 && w.charge > 0.25, `${w.charge}`);
  });
});
