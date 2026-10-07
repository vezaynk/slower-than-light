import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { Game } from "../types.ts";
import {
  CHARGE_SECONDS,
  DAMAGE,
  POWER_BARS,
  PROJECTILES,
  SOLD_IN_STORES,
  UPGRADE_COSTS,
  armFlak,
  chargeFlakSeconds,
  tickFlak,
} from "./flakart.ts";

function fight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "scout");
  assert.ok(g.enemy);
  assert.ok(g.enemy.rooms.length >= 2);
  return g;
}

describe("flak burst", () => {
  it("records the upgrade table and does not sell", () => {
    assert.equal(chargeFlakSeconds(1), 50);
    assert.equal(chargeFlakSeconds(2), 40);
    assert.equal(chargeFlakSeconds(3), 30);
    assert.equal(chargeFlakSeconds(4), 20);
    assert.deepEqual(CHARGE_SECONDS, { 1: 50, 2: 40, 3: 30, 4: 20 });
    assert.deepEqual(UPGRADE_COSTS, { 2: 30, 3: 50, 4: 80 });
    assert.deepEqual(POWER_BARS, { 1: 1, 2: 2, 3: 3, 4: 4 });
    assert.equal(PROJECTILES, 7);
    assert.equal(DAMAGE, 1);
    assert.equal(SOLD_IN_STORES, false);
  });

  it("arms without a store and stores the level on the kit", () => {
    const g = createGame(1);
    const scrap = g.scrap;
    armFlak(g, 3);
    assert.equal(g.scrap, scrap);
    assert.equal(g.player.kits.flak?.level, 3);
    assert.equal(g.player.kits.flak?.aux, 0);
  });

  it("holds the spool until the level clock, then pushes seven shots", () => {
    const g = fight(2);
    assert.ok(g.enemy);
    const hull = g.enemy.hull;
    armFlak(g, 1);
    tickFlak(g, 49);
    assert.equal(g.shots.length, 0);
    tickFlak(g, 1);
    assert.equal(g.shots.length, 7);
    assert.equal(g.enemy.hull, hull);
    const rooms = new Set(g.enemy.rooms.map((r) => r.id));
    const aimed = new Set<string>();
    for (const shot of g.shots) {
      assert.equal(shot.from, "player");
      assert.equal(shot.damage, 1);
      assert.equal(shot.kind, "flak");
      assert.equal(shot.ion, 0);
      assert.equal(shot.fireChance, 0);
      assert.equal(shot.breachChance, 0);
      assert.ok(rooms.has(shot.targetRoom));
      aimed.add(shot.targetRoom);
    }
    // Seven pellets cover every room when the hull has seven or fewer, and seven distinct rooms otherwise.
    assert.equal(aimed.size, Math.min(7, g.enemy.rooms.length));
  });

  it("uses the shorter clocks at higher levels", () => {
    for (const level of [2, 3, 4] as const) {
      const g = fight(level + 10);
      armFlak(g, level);
      const seconds = chargeFlakSeconds(level);
      tickFlak(g, seconds - 1);
      assert.equal(g.shots.length, 0);
      tickFlak(g, 1);
      assert.equal(g.shots.length, 7);
    }
  });

  it("accumulates partial ticks and fires once", () => {
    const g = fight(5);
    armFlak(g, 4);
    tickFlak(g, 10);
    tickFlak(g, 10);
    assert.equal(g.shots.length, 7);
    tickFlak(g, 19);
    assert.equal(g.shots.length, 7);
    tickFlak(g, 1);
    assert.equal(g.shots.length, 14);
  });

  it("does not spool while paused, unarmed, or out of a fight", () => {
    const idle = createGame(6);
    armFlak(idle, 1);
    tickFlak(idle, 50);
    assert.equal(idle.shots.length, 0);

    const g = fight(7);
    tickFlak(g, 50);
    assert.equal(g.shots.length, 0);

    armFlak(g, 1);
    tickFlak(g, 25);
    g.paused = true;
    tickFlak(g, 100);
    assert.equal(g.shots.length, 0);
    g.paused = false;
    tickFlak(g, 24);
    assert.equal(g.shots.length, 0);
    tickFlak(g, 1);
    assert.equal(g.shots.length, 7);
  });

  it("waits for an enemy hull, then spreads on the next tick", () => {
    const g = fight(8);
    assert.ok(g.enemy);
    const rooms = g.enemy.rooms;
    g.enemy.rooms = [];
    armFlak(g, 1);
    tickFlak(g, 50);
    assert.equal(g.shots.length, 0);
    g.enemy.rooms = rooms;
    tickFlak(g, 0.01);
    assert.equal(g.shots.length, 7);
  });

  it("keeps two fights on separate clocks", () => {
    const a = fight(9);
    const b = fight(10);
    armFlak(a, 4);
    armFlak(b, 1);
    tickFlak(a, 20);
    tickFlak(b, 20);
    assert.equal(a.shots.length, 7);
    assert.equal(b.shots.length, 0);
  });
});
