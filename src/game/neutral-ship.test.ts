import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, halted, startCombat, step, truce } from "./sim.ts";
import type { Game } from "./types.ts";
import { onPlayerJump } from "./extras/index.ts";
import { closeFight } from "./wiki/surrender.ts";

function fight(seed = 6): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, "Rebel", false);
  g.enemy!.weapons = [];
  g.enemy!.boards = false;
  g.boardTimer = 0;
  if (g.enemyEscape) g.enemyEscape.mode = "never";
  return g;
}

function tick(g: Game, seconds: number) {
  g.paused = false;
  g.phase = "map";
  for (let i = 0; i < Math.round(seconds * 30); i++) step(g, 1 / 30);
}

const theirs = (g: Game) => g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);

describe("neutral ship (per the user: the target keeps running after a surrender)", () => {
  it("keeps the surrendered ship's crew aboard, and it reads as a truce", () => {
    const g = fight();
    const crew = theirs(g).length;
    assert.ok(crew > 0);
    closeFight(g);
    assert.equal(g.enemy, null);
    assert.ok(g.wreck);
    assert.equal(truce(g), true);
    assert.equal(theirs(g).length, crew);
  });

  it("its crew keep repairing their ship once the fight is over", () => {
    const g = fight();
    const ship = g.enemy!;
    const sys = Object.values(ship.systems).find((s) => s && s.level > 1);
    assert.ok(sys);
    sys.damage = 1;
    closeFight(g);
    assert.equal(halted(g), false);
    tick(g, 60);
    assert.equal(sys.damage, 0);
  });

  it("nobody fights aboard it: a crew member of yours beside theirs takes no blows", () => {
    const g = fight();
    const them = theirs(g)[0]!;
    const mine = g.crew.find((c) => c.side === "player")!;
    closeFight(g);
    mine.aboard = "enemy";
    mine.room = them.room;
    mine.path = [];
    const hp = mine.hp;
    const room = g.wreck!.rooms.find((r) => r.id === them.room)!;
    room.o2 = 100;
    tick(g, 10);
    assert.equal(mine.hp, hp);
  });

  it("is left behind with its crew on the jump", () => {
    const g = fight();
    closeFight(g);
    onPlayerJump(g);
    assert.equal(g.wreck, null);
    assert.equal(g.crew.some((c) => c.side === "enemy"), false);
  });
});
