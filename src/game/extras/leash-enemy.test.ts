import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, orderCrew, startCombat, step } from "../sim.ts";
import {
  ION_MAX_COOLDOWN,
  clearEnemyLeash,
  fireEnemyLeash,
  heldByEnemy,
  ionOnLeash,
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
      assert.equal(k.cool, 0);
      // No ordinary wait: the next tick may fire at once.
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
    // Mind Control, Overview: the player's hold needs a view. Level 2 Sensors shows that crew.
    g.player.systems.sensors.level = 2;
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
    assert.equal(ek.cool, 0);
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
    assert.equal(g.enemy!.kits.leash!.cool, 0);
  });

  it("ionOnLeash sets 25 only when every level is ionized and leaves the hold up", () => {
    const g = fight(12, 3);
    assert.equal(fireEnemyLeash(g), true);
    const c = held(g)!;
    const k = g.enemy!.kits.leash!;
    const power = k.power;
    const left = k.left;
    const leashed = c.leashed;
    k.ion = [5, 5];
    ionOnLeash(k);
    assert.equal(k.cool, 0, "ion shorter than the level");
    k.ion = [5, 5, 5];
    ionOnLeash(k);
    assert.equal(k.cool, ION_MAX_COOLDOWN);
    assert.equal(k.on, true);
    assert.equal(k.power, power);
    assert.equal(k.left, left);
    assert.equal(heldByEnemy(c), true);
    assert.equal(c.leashed, leashed);
    // INFERRED: a later ion hit that still covers every level sets 25 again.
    k.cool = 3;
    k.ion = [5, 5, 5, 5];
    ionOnLeash(k);
    assert.equal(k.cool, ION_MAX_COOLDOWN);
    assert.equal(k.on, true);
    assert.equal(heldByEnemy(c), true);
    const empty = kit(0);
    empty.ion = [5];
    ionOnLeash(empty);
    assert.equal(empty.cool, 0, "level 0 is not every level");
  });

  it("a player hold ending does not clear an ion cooldown already set", () => {
    const dropped = fight(13, 1);
    dropped.player.kits.leash = kit(1, 1);
    dropped.player.systems.sensors.level = 2;
    const foe = dropped.crew.find((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy")!;
    startLeash(dropped, foe.id);
    const low = dropped.player.kits.leash!;
    low.ion = [5];
    ionOnLeash(low);
    assert.equal(low.cool, ION_MAX_COOLDOWN);
    assert.equal(low.on, true);
    tickLeash(dropped, 0.05);
    assert.equal(low.on, false);
    assert.equal(low.cool, ION_MAX_COOLDOWN);

    const g = fight(14, 2);
    g.player.kits.leash = kit(2, 1);
    g.player.systems.sensors.level = 2;
    const other = g.crew.find((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy")!;
    startLeash(g, other.id);
    const pk = g.player.kits.leash!;
    pk.zoltan = 1;
    pk.ion = [5, 5];
    ionOnLeash(pk);
    assert.equal(pk.on, true);
    assert.equal(pk.cool, ION_MAX_COOLDOWN);
    tickLeash(g, 20);
    assert.equal(pk.on, false);
    assert.equal(pk.cool, ION_MAX_COOLDOWN);
  });
});
