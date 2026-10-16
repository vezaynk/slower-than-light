import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { Game, Kit, KitId } from "../types.ts";
import { checkEnemyPower } from "./ship-ai.ts";

function kit(id: KitId, level: number): Kit {
  return { id, level, power: 0, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/** A plain enemy: shields 4, engines 2, oxygen 1, weapons 3 with a 1-bar and a 2-bar gun. */
function enemy(reactor: number): Game {
  const g = createGame(3);
  startCombat(g, "scout");
  const e = g.enemy!;
  e.kits = {};
  e.storm = false;
  for (const s of Object.values(e.systems)) {
    s.level = 0;
    s.power = 0;
    s.damage = 0;
    s.ion = [];
  }
  e.systems.shields.level = 4;
  e.systems.engines.level = 2;
  e.systems.oxygen.level = 1;
  e.systems.weapons.level = 3;
  e.weapons = [
    { uid: "w1", defId: "LASER_BURST_1", charge: 0, enabled: false, autofire: true, target: null },
    { uid: "w2", defId: "LASER_BURST_3", charge: 0, enabled: false, autofire: true, target: null },
  ];
  e.reactor = reactor;
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemyEscape = null;
  return g;
}

describe("enemy power (xftl doc/ship-ai, CheckPowerLevels)", () => {
  it("fills everything when the reactor covers it", () => {
    const g = enemy(10);
    checkEnemyPower(g);
    const e = g.enemy!;
    assert.equal(e.systems.shields.power, 4);
    assert.equal(e.systems.engines.power, 2);
    assert.equal(e.systems.oxygen.power, 1);
    assert.equal(e.systems.weapons.power, 3);
    assert.ok(e.weapons.every((w) => w.enabled));
  });

  it("short on power: oxygen first, then a weapon, then shields, cloak, engines a bar at a time", () => {
    const g = enemy(5);
    checkEnemyPower(g);
    const e = g.enemy!;
    // Oxygen 1 (4 left). Loop 1: the first gun (both at 0 s, and a later one must beat the stored 0), shields 1,
    // engines 1 (1 left). Loop 2: the 2-bar gun does not fit; shields 2. Nothing left.
    assert.equal(e.systems.oxygen.power, 1);
    assert.deepEqual(e.weapons.map((w) => w.enabled), [true, false]);
    assert.equal(e.systems.weapons.power, 1);
    assert.equal(e.systems.shields.power, 2);
    assert.equal(e.systems.engines.power, 1);
  });

  it("halves the reactor in a plasma storm", () => {
    const g = enemy(10);
    g.enemy!.storm = true;
    checkEnemyPower(g);
    const e = g.enemy!;
    const used = e.systems.shields.power + e.systems.engines.power + e.systems.oxygen.power + e.systems.weapons.power;
    assert.equal(used, 5);
  });

  it("powers the weapon that has charged longest, rounded down as the game stores it", () => {
    const g = enemy(5);
    const [a, b] = g.enemy!.weapons;
    a.charge = 0.5;
    b.charge = 0.1;
    checkEnemyPower(g);
    assert.equal(a.enabled, true);
  });

  it("keeps an ionized system's power, and restores a repaired system", () => {
    const g = enemy(10);
    const e = g.enemy!;
    e.systems.shields.power = 2;
    e.systems.shields.ion = [5];
    checkEnemyPower(g);
    assert.equal(e.systems.shields.power, 2);
    e.systems.shields.ion = [];
    e.systems.engines.damage = 2;
    checkEnemyPower(g);
    assert.equal(e.systems.engines.power, 0);
    e.systems.engines.damage = 0;
    checkEnemyPower(g);
    assert.equal(e.systems.engines.power, 2);
  });

  it("gives oxygen, the teleporter, and the clone bay their first bar before anything else", () => {
    const g = enemy(3);
    const e = g.enemy!;
    e.kits.teleporter = kit("teleporter", 2);
    e.kits.clonebay = kit("clonebay", 1);
    checkEnemyPower(g);
    assert.equal(e.systems.oxygen.power, 1);
    assert.equal(e.kits.teleporter.power, 1);
    assert.equal(e.kits.clonebay.power, 1);
    assert.equal(e.systems.shields.power, 0);
  });

  it("leaves weapons and drones unpowered while escaping", () => {
    const g = enemy(4);
    g.enemyEscape = { mode: "start", seconds: 30, running: true } as never;
    checkEnemyPower(g);
    const e = g.enemy!;
    assert.equal(e.systems.weapons.power, 0);
    assert.equal(e.systems.shields.power + e.systems.engines.power + e.systems.oxygen.power, 4);
  });
});
