import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, orderCrew, startCombat, step } from "../sim.ts";
import {
  ENEMY_COOLDOWN,
  clearEnemyLeash,
  fireEnemyLeash,
  heldByEnemy,
  sideOf,
  startLeash,
  tickLeash,
} from "./leash.ts";
import type { Crew, Game, Kit } from "../types.ts";

function kit(level: number, power = level): Kit {
  return { id: "leash", level, power, left: 0, cool: 0, target: null, on: false, aux: 0 };
}

/** Rebel ship fight with an enemy Mind Control kit in a room marked `kit: "leash"`. */
function fight(seed: number, level = 1): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  g.enemy.kits.leash = kit(level);
  const room = g.enemy.rooms.find((r) => !r.system) ?? g.enemy.rooms[0]!;
  room.kit = "leash";
  g.player.zoltan = 0;
  return g;
}

function held(g: Game): Crew | undefined {
  return g.crew.find((c) => heldByEnemy(c));
}

describe("enemy mind control", () => {
  it("controls a random player crew member for the level duration, then it reverts", () => {
    for (const [level, duration] of [
      [1, 14],
      [2, 20],
      [3, 28],
    ] as const) {
      const g = fight(3 + level, level);
      tickLeash(g, 0.05);
      const c = held(g);
      assert.ok(c, `level ${level} fired`);
      assert.equal(c.side, "player");
      assert.equal(sideOf(c), "enemy");
      assert.equal(c.leashed, duration);
      const k = g.enemy!.kits.leash!;
      assert.equal(k.on, true);
      assert.equal(k.target, c.id);
      tickLeash(g, duration - 0.1);
      assert.ok(heldByEnemy(c));
      tickLeash(g, 0.2);
      assert.equal(heldByEnemy(c), false);
      assert.equal(c.leashed, undefined);
      assert.equal(sideOf(c), "player");
      assert.equal(k.on, false);
      assert.equal(k.cool, ENEMY_COOLDOWN);
      // Off cooldown, it fires again.
      tickLeash(g, ENEMY_COOLDOWN + 0.01);
      tickLeash(g, 0.01);
      assert.ok(held(g));
    }
  });

  it("picks different targets across seeds", () => {
    const names = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const g = fight(seed);
      assert.equal(fireEnemyLeash(g), true);
      names.add(held(g)!.id);
    }
    assert.ok(names.size > 1);
  });

  it("the held crew member fights player crew aboard the player ship", () => {
    const g = fight(11);
    assert.equal(fireEnemyLeash(g), true);
    const c = held(g)!;
    const pal = g.crew.find((o) => o.side === "player" && o.id !== c.id && o.hp > 0)!;
    assert.ok(pal);
    // Same quiet room, nobody walking, no enemy boarders.
    g.crew = g.crew.filter((o) => o.side === "player" || o.aboard === "enemy");
    for (const o of [c, pal]) {
      o.aboard = "player";
      o.room = pal.room;
      o.path = [];
      o.move = 0;
      o.hp = o.maxHp;
    }
    const room = g.player.rooms.find((r) => r.id === pal.room)!;
    room.fire = 0;
    room.o2 = 100;
    g.paused = false;
    g.boardTimer = 999;
    step(g, 0.05);
    step(g, 0.05);
    assert.ok(pal.hp < pal.maxHp, "pal took hits");
    assert.ok(c.hp < c.maxHp, "held crew took hits");
  });

  it("the enemy cannot cancel the player's mind control", () => {
    const g = fight(5, 3);
    g.player.kits.leash = kit(1);
    const foe = g.crew.find((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy")!;
    g.enemy!.zoltan = 0;
    startLeash(g, foe.id);
    assert.equal(foe.leashed, 14);
    tickLeash(g, 0.05);
    const c = held(g);
    assert.ok(c);
    assert.equal(c.side, "player");
    assert.ok((foe.leashed ?? 0) > 13);
    assert.equal(sideOf(foe), "player");
    // The player's own hold ending does not free crew the enemy holds, and vice versa.
    tickLeash(g, 14);
    assert.equal(foe.leashed, undefined);
    assert.ok(heldByEnemy(c));
  });

  it("the player frees their own crew with any level of Mind Control", () => {
    const g = fight(6, 3);
    g.player.kits.leash = kit(1);
    tickLeash(g, 0.05);
    const c = held(g)!;
    assert.equal(c.leashed, 28);
    startLeash(g, c.id);
    assert.equal(heldByEnemy(c), false);
    assert.equal(sideOf(c), "player");
    const ek = g.enemy!.kits.leash!;
    assert.equal(ek.on, false);
    assert.equal(ek.cool, ENEMY_COOLDOWN);
    assert.equal(g.player.kits.leash!.on, true);
  });

  it("an enemy leash at 0 working bars cannot fire", () => {
    const g = fight(7, 2);
    g.enemy!.kits.leash!.damage = 2;
    tickLeash(g, 1);
    assert.equal(held(g), undefined);
    const h = fight(7, 2);
    h.enemy!.kits.leash!.power = 0;
    tickLeash(h, 1);
    assert.equal(held(h), undefined);
  });

  it("a hold ends once the enemy kit loses every bar", () => {
    const g = fight(8, 2);
    tickLeash(g, 0.05);
    const c = held(g)!;
    g.enemy!.kits.leash!.damage = 2;
    tickLeash(g, 0.05);
    assert.equal(heldByEnemy(c), false);
  });

  it("skips Slugs and crew behind the player's Zoltan Shield", () => {
    const slugs = fight(9);
    for (const c of slugs.crew) if (c.side === "player") c.kin = "gel";
    assert.equal(fireEnemyLeash(slugs), false);
    const bubble = fight(9);
    bubble.player.zoltan = 5;
    assert.equal(fireEnemyLeash(bubble), false);
    const boarder = bubble.crew.find((c) => c.side === "player")!;
    boarder.aboard = "enemy";
    assert.equal(fireEnemyLeash(bubble), true);
    assert.equal(held(bubble), boarder);
  });

  it("held crew cannot be ordered, and clearEnemyLeash frees them", () => {
    const g = fight(10);
    fireEnemyLeash(g);
    const c = held(g)!;
    c.path = [];
    const other = g.player.rooms.find((r) => r.id !== c.room)!;
    orderCrew(g, c.id, other.id);
    assert.deepEqual(c.path, []);
    assert.equal(clearEnemyLeash(g), 1);
    assert.equal(heldByEnemy(c), false);
    assert.equal(g.enemy!.kits.leash!.cool, ENEMY_COOLDOWN);
  });
});
