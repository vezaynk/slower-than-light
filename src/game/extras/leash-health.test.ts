import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { clearEnemyLeash, heldByEnemy, leashedDamageBonus, startLeash, tickLeash } from "./leash.ts";
import type { Crew, Game, Kit } from "../types.ts";

function kit(level: number, power = level): Kit {
  return { id: "leash", level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

function fight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.zoltan = 0;
  g.player.zoltan = 0;
  return g;
}

function foe(g: Game): Crew {
  const c = g.crew.find((o) => o.side === "enemy" && o.aboard === "enemy" && o.hp > 0);
  assert.ok(c);
  return c;
}

describe("Mind Control health boost", () => {
  it("adds +0 / +15 / +30 health by level on the player's hold, and removes it on expiry", () => {
    for (const [level, bonus, duration] of [
      [1, 0, 14],
      [2, 15, 20],
      [3, 30, 28],
    ] as const) {
      const g = fight(20 + level);
      g.player.kits.leash = kit(level, 1);
      const c = foe(g);
      const base = c.maxHp;
      const hp = c.hp;
      startLeash(g, c.id);
      assert.equal(c.maxHp, base + bonus, `level ${level} maxHp`);
      assert.equal(c.hp, hp + bonus, `level ${level} hp`);
      tickLeash(g, duration);
      assert.equal(c.leashed, undefined);
      assert.equal(c.maxHp, base);
      assert.ok(c.hp <= base);
      assert.equal(c.leashBoost, undefined);
    }
  });

  it("clamps hp to the base max when the boost ends (INFERRED)", () => {
    const g = fight(30);
    g.player.kits.leash = kit(3, 1);
    const c = foe(g);
    const base = c.maxHp;
    startLeash(g, c.id);
    c.hp = c.maxHp - 10; // took 10 while boosted: still above base
    tickLeash(g, 28);
    assert.equal(c.maxHp, base);
    assert.equal(c.hp, base);
  });

  it("boosts player crew the enemy holds, and removes it when freed or at combat end", () => {
    const g = fight(31);
    g.enemy!.kits.leash = kit(2);
    const room = g.enemy!.rooms.find((r) => !r.system) ?? g.enemy!.rooms[0]!;
    room.kit = "leash";
    const bases = new Map(g.crew.map((c) => [c.id, c.maxHp]));
    tickLeash(g, 0.05);
    const c = g.crew.find((o) => heldByEnemy(o))!;
    assert.ok(c);
    assert.equal(c.maxHp, bases.get(c.id)! + 15);
    assert.equal(leashedDamageBonus(c), 1.25);
    clearEnemyLeash(g);
    assert.equal(c.maxHp, bases.get(c.id));

    const h = fight(32);
    h.enemy!.kits.leash = kit(3);
    (h.enemy!.rooms.find((r) => !r.system) ?? h.enemy!.rooms[0]!).kit = "leash";
    h.player.kits.leash = kit(1);
    tickLeash(h, 0.05);
    const d = h.crew.find((o) => heldByEnemy(o))!;
    const base = d.maxHp - 30;
    startLeash(h, d.id);
    assert.equal(heldByEnemy(d), false);
    assert.equal(d.maxHp, base);
  });

  it("removes health and damage boosts when the system level drops", () => {
    const g = fight(33);
    g.enemy!.kits.leash = kit(3);
    (g.enemy!.rooms.find((r) => !r.system) ?? g.enemy!.rooms[0]!).kit = "leash";
    tickLeash(g, 0.05);
    const c = g.crew.find((o) => heldByEnemy(o))!;
    const base = c.maxHp - 30;
    assert.equal(leashedDamageBonus(c), 2);
    g.enemy!.kits.leash!.damage = 1;
    tickLeash(g, 0.05);
    assert.ok(heldByEnemy(c), "hold continues on a lower level");
    assert.equal(c.maxHp, base);
    assert.equal(leashedDamageBonus(c), 1);

    const p = fight(34);
    p.player.kits.leash = kit(2, 1);
    const f = foe(p);
    const fBase = f.maxHp;
    startLeash(p, f.id);
    assert.equal(leashedDamageBonus(f), 1.25);
    p.player.kits.leash!.damage = 1;
    tickLeash(p, 0.05);
    assert.equal(f.maxHp, fBase);
    assert.equal(leashedDamageBonus(f), 1);
  });

  it("keeps the damage multiplier across a JSON save/load", () => {
    const g = fight(35);
    g.player.kits.leash = kit(3, 1);
    const c = foe(g);
    startLeash(g, c.id);
    const loaded = JSON.parse(JSON.stringify(g)) as Game;
    const back = loaded.crew.find((o) => o.id === c.id)!;
    assert.equal(leashedDamageBonus(back), 2);
    tickLeash(loaded, 28);
    assert.equal(back.maxHp, c.maxHp - 30);
  });
});

describe("Mind Control on Slugs", () => {
  it("the player cannot leash an enemy Slug and the kit is not spent", () => {
    const g = fight(36);
    const k = (g.player.kits.leash = kit(2, 1));
    const c = foe(g);
    c.kin = "gel";
    const base = c.maxHp;
    const logs = g.log.length;
    startLeash(g, c.id);
    assert.equal(c.leashed, undefined);
    assert.equal(c.maxHp, base);
    assert.equal(k.on, false);
    assert.equal(k.left, 0);
    assert.ok(g.log.length > logs, "logs a line");
  });
});
