import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";
import { enemyCloneHolds, enemyCloneQueue, onCradleDeath, tickCradle } from "./cradle.ts";
import type { Crew, Game, Kit } from "../types.ts";

/** First seed whose "Rebel ship" rolls a Clone Bay (enemy-gen.ts), so the room is the generated `e-clonebay`. */
function cloneShip(): Game {
  for (let seed = 1; seed < 500; seed++) {
    const g = createGame(seed);
    startCombat(g, "Rebel ship");
    if (g.enemy?.kits.cradle && !g.enemy.automated) return g;
  }
  throw new Error("no Rebel ship with a Clone Bay");
}

function bay(g: Game): Kit {
  const kit = g.enemy?.kits.cradle;
  assert.ok(kit);
  return kit;
}

function foes(g: Game): Crew[] {
  return g.crew.filter((c) => c.side === "enemy");
}

function kill(g: Game, crew: Crew) {
  crew.hp = 0;
  onCradleDeath(g, crew);
}

function wreck(kit: Kit) {
  kit.damage = kit.level;
  kit.power = 0;
}

describe("enemy clone bay", () => {
  for (const [level, seconds] of [
    [1, 12],
    [2, 9],
    [3, 7],
  ] as const) {
    it(`Clone Bay, System Upgrades: level ${level} revives a dead enemy after ${seconds}s in e-clonebay`, () => {
      const g = cloneShip();
      const kit = bay(g);
      kit.level = level;
      kit.power = level;
      const [victim] = foes(g);
      victim.skills = { repair: 100, combat: 5 };
      victim.room = "somewhere";
      kill(g, victim);
      assert.equal(victim.cloneIn, seconds);
      assert.equal(victim.room, "e-clonebay");
      assert.deepEqual(enemyCloneQueue(g), { seconds, count: 1, offline: false });
      tickCradle(g, seconds - 0.1);
      assert.equal(victim.hp, 0);
      tickCradle(g, 0.2);
      assert.equal(victim.hp, victim.maxHp);
      assert.equal(victim.cloneIn, undefined);
      assert.equal(victim.room, "e-clonebay");
      // Clone Bay, Overview: 20% skill penalty, 1 point of combat.
      assert.equal(victim.skills?.repair, 80);
      assert.equal(victim.skills?.combat, 4);
      assert.equal(victim.cloned, true);
      assert.equal(enemyCloneQueue(g), null);
    });
  }

  it("Clone Bay, Overview: the queue revives one-by-one, earliest death first", () => {
    const g = cloneShip();
    const [a, b] = foes(g);
    kill(g, a);
    kill(g, b);
    tickCradle(g, 12.05);
    assert.equal(a.hp, a.maxHp);
    assert.equal(b.hp, 0);
    assert.ok(Math.abs((b.cloneIn ?? 0) - 12) < 1e-9);
  });

  it("Clone Bay, Overview: with every enemy dead the fight continues while the bay works", () => {
    const g = cloneShip();
    for (const c of foes(g)) c.hp = 0;
    step(g, 0.05);
    assert.equal(g.phase, "combat");
    assert.ok(g.enemy);
    assert.ok(foes(g).every((c) => (c.cloneIn ?? 0) > 0 && c.room === "e-clonebay"));
    assert.equal(enemyCloneHolds(g), true);
    for (let i = 0; i < 100; i++) step(g, 0.05);
    assert.equal(g.phase, "combat");
  });

  it("Clone Bay, Overview: destroying the bay with all enemy crew dead or queued ends the fight immediately", () => {
    const g = cloneShip();
    for (const c of foes(g)) c.hp = 0;
    step(g, 0.05);
    assert.equal(g.phase, "combat");
    wreck(bay(g));
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    assert.equal(g.enemy, null);
    assert.equal(foes(g).length, 0);
  });

  it("Clone Bay, Overview: a destroyed bay with live crew keeps the queue until the last one dies, then purges", () => {
    const g = cloneShip();
    const crew = foes(g);
    assert.ok(crew.length >= 2);
    const [first, ...rest] = crew;
    kill(g, first);
    wreck(bay(g));
    assert.equal(enemyCloneHolds(g), false);
    assert.ok((first.cloneIn ?? 0) > 0, "live crew could still repair it");
    for (const c of rest) kill(g, c);
    assert.ok(foes(g).every((c) => c.cloneIn == null), "queue purged instantly");
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
  });

  it("Clone Bay, Overview: offline for 3 seconds loses the last clone queued", () => {
    const g = cloneShip();
    const [a, b] = foes(g);
    kill(g, a);
    kill(g, b);
    bay(g).power = 0;
    tickCradle(g, 2.9);
    assert.equal(enemyCloneQueue(g)?.count, 2);
    assert.equal(enemyCloneQueue(g)?.offline, true);
    tickCradle(g, 0.2);
    assert.equal(b.cloneIn, undefined);
    assert.ok((a.cloneIn ?? 0) > 0);
  });

  it("Enemy Ships: without a Clone Bay a crew kill still wins", () => {
    const g = cloneShip();
    delete g.enemy?.kits.cradle;
    for (const c of foes(g)) c.hp = 0;
    step(g, 0.05);
    assert.notEqual(g.phase, "combat");
    assert.equal(g.enemy, null);
  });
});
