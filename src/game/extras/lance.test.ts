import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, log, rand, sparePower, startCombat } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  CHARGE_SECONDS,
  DISPLAY_NAME,
  INSTALL_COST,
  UPGRADE_COSTS,
  aimLance,
  installLance,
  tickLance,
  toggleLancePower,
} from "./lance.ts";

function armed(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.player.kits.lance = {
    id: "lance",
    level: 1,
    power: 1,
    left: 0,
    cool: 0,
    target: null,
    on: true,
    aux: 0.999,
  };
  return g;
}

describe("lance", () => {
  it("drops enemy hull on a short tick and leaves the shield bubble alone", () => {
    const g = armed(1);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    assert.ok(bubble > 0);
    const room = g.enemy.rooms.find((r) => r.system === "shields");
    assert.ok(room);
    const broken = g.enemy.systems.shields.damage;
    aimLance(g, room.id);
    log(g, "mark");
    tickLance(g, 0.1);
    assert.ok(g.enemy.hull < hull);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.shields.damage, broken + 1);
    assert.equal(g.shots.length, 0);
    assert.equal(g.player.kits.lance?.aux, 0);
    assert.equal(g.log[0], `${DISPLAY_NAME} cuts ${g.enemy.name}.`);
    assert.equal(g.log[1], "mark");
  });

  it("cuts the aimed room and one door neighbor", () => {
    const g = armed(2);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    const room = g.enemy.rooms.find((r) => r.id === "e-weapons");
    assert.ok(room);
    aimLance(g, room.id);
    tickLance(g, 0.1);
    assert.equal(g.enemy.hull, hull - 2);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.weapons.damage, 1);
  });

  it("cuts only the target when no door links it", () => {
    const g = armed(3);
    assert.ok(g.enemy);
    g.enemy.doors = [];
    const hull = g.enemy.hull;
    const bubble = g.enemy.shieldNow;
    const room = g.enemy.rooms.find((r) => r.system === "oxygen");
    assert.ok(room);
    g.enemy.systems.oxygen.damage = g.enemy.systems.oxygen.level;
    aimLance(g, room.id);
    tickLance(g, 0.1);
    assert.equal(g.enemy.hull, hull - 1);
    assert.equal(g.enemy.shieldNow, bubble);
    assert.equal(g.enemy.systems.oxygen.damage, g.enemy.systems.oxygen.level);
  });

  it("rolls a ten percent fire chance per room", () => {
    const g = armed(4);
    assert.ok(g.enemy);
    g.enemy.doors = [];
    const room = g.enemy.rooms[0];
    aimLance(g, room.id);
    const saved = g.seed;
    const roll = rand(g);
    g.seed = saved;
    tickLance(g, 0.1);
    assert.equal(room.fire, roll < 0.1 ? 1 : 0);
  });

  it("does not charge without a reactor bar, and a stored charge drains", () => {
    const g = armed(5);
    assert.ok(g.enemy);
    const kit = g.player.kits.lance;
    assert.ok(kit);
    kit.power = 0;
    kit.aux = 0.25;
    const hull = g.enemy.hull;
    tickLance(g, 0.5);
    assert.equal(kit.aux, 0);
    assert.equal(g.enemy.hull, hull);
  });

  it("fills aux on the level clock and fires on its own", () => {
    const g = armed(6);
    assert.ok(g.enemy);
    const kit = g.player.kits.lance;
    assert.ok(kit);
    const hull = g.enemy.hull;
    kit.level = 1;
    kit.aux = 0;
    kit.target = null;
    tickLance(g, 25);
    assert.equal(kit.aux, 0.5);
    assert.equal(g.enemy.hull, hull);
    tickLance(g, 25);
    assert.equal(kit.aux, 0);
    assert.ok(g.enemy.hull < hull);
  });

  it("mounts for free and records the wiki costs", () => {
    const g = createGame(7);
    assert.equal(INSTALL_COST, null);
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.deepEqual(UPGRADE_COSTS, { 2: 30, 3: 50, 4: 80 });
    assert.equal(DISPLAY_NAME, "Artillery Beam");
    const scrap = g.scrap;
    assert.equal(installLance(g), true);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.kits.lance?.id, "lance");
    assert.equal(g.player.kits.lance?.power, 0);
    assert.equal(installLance(g), false);
  });

  it("takes one spare reactor bar and gives it back", () => {
    const g = createGame(8);
    assert.equal(installLance(g), true);
    const kit = g.player.kits.lance;
    assert.ok(kit);
    const spare = sparePower(g.player);
    assert.ok(spare >= 1);
    toggleLancePower(g);
    assert.equal(kit.power, 1);
    assert.equal(sparePower(g.player), spare - 1);
    toggleLancePower(g);
    assert.equal(kit.power, 0);
    assert.equal(sparePower(g.player), spare);
    g.player.reactor -= spare;
    assert.ok(sparePower(g.player) < 1);
    toggleLancePower(g);
    assert.equal(kit.power, 0);
  });
});
