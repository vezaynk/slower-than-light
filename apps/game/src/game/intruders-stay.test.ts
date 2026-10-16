import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { commitJump, continueReward, createGame, intruderOnPlayer, startCombat, step } from "./sim.ts";
import type { Crew, Game } from "./types.ts";
import { closeFight } from "./wiki/surrender.ts";

function plant(g: Game, room: string, hp = 80): Crew {
  g.uid = (g.uid + 1) >>> 0;
  const c: Crew = {
    id: "boarder-" + g.uid.toString(36),
    name: "Intruder",
    side: "enemy",
    aboard: "player",
    hp,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 30,
    tone: 3,
    kin: "human",
  };
  g.crew.push(c);
  return c;
}

function quietFight(seed = 4): Game {
  const g = createGame(seed);
  g.player.weapons = [];
  startCombat(g, "scout");
  assert.ok(g.enemy);
  g.enemy.weapons = [];
  g.enemy.boards = false;
  g.boardTimer = 0;
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.fightEvent = null;
  g.pending = null;
  return g;
}

function intruders(g: Game): Crew[] {
  return g.crew.filter(intruderOnPlayer);
}

/** A linked beacon that does not open another fight. */
function quietDest(g: Game): string {
  const here = g.beacons.find((b) => b.id === g.here);
  assert.ok(here?.links[0]);
  const dest = g.beacons.find((b) => b.id === here.links[0]);
  assert.ok(dest);
  dest.resolved = true;
  dest.kind = "empty";
  g.fuel = 5;
  g.flee = 1;
  return dest.id;
}

describe("intruders stay until they die", () => {
  it("keeps them when the enemy hull is destroyed, and drops the crew who were on that hull", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors");
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0));
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "reward");
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.equal(g.crew.some((c) => c.side === "enemy" && c.aboard === "enemy"), false);
  });

  it("removes one that is already dead when the hull breaks", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors", 0);
    g.enemy!.hull = 0;
    step(g, 0.05);
    assert.equal(g.crew.some((c) => c.id === boarder.id), false);
    assert.equal(intruders(g).length, 0);
  });

  it("keeps sabotaging your ship after the reward", () => {
    const g = quietFight();
    for (const c of g.crew) if (c.side === "player") c.room = "p-pilot";
    const boarder = plant(g, "p-weapons");
    g.enemy!.hull = 0;
    step(g, 0.05);
    continueReward(g);
    assert.equal(g.phase, "map");
    boarder.path = [];
    const room = g.player.rooms.find((r) => r.id === "p-weapons");
    assert.ok(room);
    step(g, 0.05);
    assert.equal(boarder.aboard, "player");
    assert.ok(boarder.hp > 0);
    assert.ok((room.sabotage ?? 0) > 0);
  });

  it("comes along when you jump, and crew on the other hull do not", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors");
    const stranded = g.crew.find((c) => c.side === "player" && c.room !== "p-pilot");
    assert.ok(stranded);
    stranded.aboard = "enemy";
    stranded.room = g.enemy!.rooms[0]!.id;
    const theirs = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").map((c) => c.id);
    assert.ok(theirs.length > 0);
    commitJump(g, quietDest(g));
    assert.equal(g.enemy, null);
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.equal(g.crew.some((c) => c.id === stranded.id), false);
    assert.equal(g.crew.some((c) => theirs.includes(c.id)), false);
  });

  it("is still aboard when the next fight starts", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors");
    startCombat(g, "scout");
    assert.ok(g.enemy);
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.ok(g.crew.some((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0));
  });

  it("still trades blows on your ship after a surrender, and not aboard the surrendered hull", () => {
    const g = quietFight();
    const players = g.crew.filter((c) => c.side === "player");
    assert.ok(players.length >= 3);
    const mate = players[0]!;
    const pilot = players[1]!;
    const visitor = players[2]!;
    mate.room = "p-weapons";
    mate.path = [];
    pilot.room = "p-pilot";
    pilot.path = [];
    const boarder = plant(g, "p-weapons");
    const them = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0);
    assert.ok(them);
    closeFight(g);
    visitor.aboard = "enemy";
    visitor.room = them.room;
    visitor.path = [];
    const wreckHp = visitor.hp;
    g.phase = "map";
    g.paused = false;
    const before = boarder.hp;
    for (let i = 0; i < 40 && boarder.hp === before; i++) step(g, 0.05);
    assert.ok(before - boarder.hp >= 3 && before - boarder.hp <= 7, String(before - boarder.hp));
    assert.equal(boarder.aboard, "player");
    assert.equal(visitor.hp, wreckHp);
  });

  it("stays and keeps sabotaging after they surrender", () => {
    const g = quietFight();
    for (const c of g.crew) if (c.side === "player") c.room = "p-pilot";
    const boarder = plant(g, "p-weapons");
    const wreckCrew = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0).length;
    assert.ok(wreckCrew > 0);
    closeFight(g);
    assert.ok(g.wreck);
    assert.equal(g.enemy, null);
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.equal(g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0).length, wreckCrew);
    g.phase = "map";
    g.paused = false;
    const room = g.player.rooms.find((r) => r.id === "p-weapons");
    assert.ok(room);
    step(g, 0.05);
    assert.ok((room.sabotage ?? 0) > 0);
    assert.equal(boarder.hp > 0 && boarder.aboard === "player", true);
  });

  it("comes along when you jump away from the surrendered ship, and that ship's crew stay behind", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors");
    closeFight(g);
    const left = g.crew.filter((c) => c.side === "enemy" && c.aboard === "enemy").map((c) => c.id);
    assert.ok(left.length > 0);
    commitJump(g, quietDest(g));
    assert.equal(g.wreck, null);
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.equal(g.crew.some((c) => left.includes(c.id)), false);
  });

  it("stays when the enemy jumps away, and your crew on their hull are left behind", () => {
    const g = quietFight();
    const boarder = plant(g, "p-sensors");
    const stranded = g.crew.find((c) => c.side === "player" && c.room !== "p-pilot");
    assert.ok(stranded);
    stranded.aboard = "enemy";
    stranded.room = g.enemy!.rooms[0]!.id;
    g.enemyFlee = 1;
    step(g, 0.05);
    assert.equal(g.enemy, null);
    assert.equal(g.phase, "map");
    assert.deepEqual(intruders(g).map((c) => c.id), [boarder.id]);
    assert.equal(g.crew.some((c) => c.id === stranded.id), false);
    assert.equal(g.crew.some((c) => c.side === "enemy" && c.aboard === "enemy"), false);
  });
});
