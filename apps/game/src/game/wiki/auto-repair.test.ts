import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPAIR_SECONDS, createGame, startCombat, step } from "../sim.ts";

function fight() {
  const g = createGame(8);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.player.hull = 400;
  g.enemy.hull = 400;
  for (const w of [...g.player.weapons, ...g.enemy.weapons]) {
    w.enabled = false;
    w.charge = 0;
    w.target = null;
  }
  const veil = g.enemy.kits.veil;
  if (veil) {
    veil.power = 0;
    veil.on = false;
  }
  const away = g.enemy.rooms.find((room) => room.system !== "weapons" && room.system !== "shields");
  assert.ok(away);
  for (const c of g.crew) {
    if (c.side !== "enemy") continue;
    c.room = away.id;
    c.path = [];
  }
  return g;
}

describe("automated ship repair", () => {
  it("repairs every damaged system at one third of a human and finishes a bar in 37.5s", () => {
    const g = fight();
    const enemy = g.enemy!;
    enemy.automated = true;
    enemy.systems.weapons.damage = 1;
    enemy.systems.weapons.fix = 0;
    enemy.systems.shields.damage = 1;
    enemy.systems.shields.fix = 0;
    step(g, 0.05);
    const slice = 0.05 / 3;
    assert.ok(Math.abs(enemy.systems.weapons.fix - slice) < 1e-9, String(enemy.systems.weapons.fix));
    assert.ok(Math.abs(enemy.systems.shields.fix - slice) < 1e-9, String(enemy.systems.shields.fix));

    enemy.systems.weapons.fix = REPAIR_SECONDS - 0.01;
    step(g, 0.05);
    assert.equal(enemy.systems.weapons.damage, 0);
    assert.equal(enemy.systems.weapons.fix, 0);
    assert.equal(REPAIR_SECONDS * 3, 37.5);
  });

  it("does not repair a breach or a breached system, and a fire resets progress", () => {
    const g = fight();
    const enemy = g.enemy!;
    enemy.automated = true;
    const weapons = enemy.rooms.find((room) => room.system === "weapons")!;
    enemy.systems.weapons.damage = 1;
    enemy.systems.weapons.fix = 2;
    weapons.breach = 1;
    step(g, 0.05);
    assert.equal(weapons.breach, 1);
    assert.equal(enemy.systems.weapons.fix, 2);
    assert.equal(enemy.systems.weapons.damage, 1);

    weapons.breach = 0;
    weapons.fire = 1;
    step(g, 0.05);
    assert.equal(enemy.systems.weapons.fix, 0);
    assert.equal(enemy.systems.weapons.damage, 1);
  });

  it("does not repair a crewed ship", () => {
    const g = fight();
    g.enemy!.systems.weapons.damage = 1;
    g.enemy!.systems.weapons.fix = 0;
    step(g, 0.05);
    assert.equal(g.enemy!.systems.weapons.fix, 0);
    assert.equal(g.enemy!.systems.weapons.damage, 1);
  });
});
