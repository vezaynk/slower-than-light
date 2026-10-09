import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import { enemyCrystalLockdown, tickEnemyCrewAi } from "../extras/crewai.ts";
import type { Crew, Game, Room } from "../types.ts";

function crystalFight(): Game {
  for (let seed = 1; seed < 80; seed++) {
    const g = createGame(seed);
    g.sector = 6;
    startCombat(g, "Crystal ship");
    if (!g.enemy) continue;
    if (g.crew.some((c) => c.side === "enemy" && c.kin === "shard" && c.hp > 0 && c.aboard === "enemy")) return g;
  }
  throw new Error("no Crystal ship with a Crystal aboard");
}

function calm(g: Game) {
  g.player.weapons = [];
  if (g.enemy) g.enemy.weapons = [];
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = false;
  g.asteroid = false;
  g.bossSurge = 0;
  g.boardTimer = 0;
}

function shard(g: Game): Crew {
  const c = g.crew.find((x) => x.side === "enemy" && x.kin === "shard" && x.hp > 0 && x.aboard === "enemy");
  assert.ok(c);
  return c;
}

function roomOf(g: Game, id: string, hull: "player" | "enemy"): Room {
  const ship = hull === "player" ? g.player : g.enemy!;
  const r = ship.rooms.find((x) => x.id === id);
  assert.ok(r);
  return r;
}

/** A living crew member of the other side, standing in this room. */
function foe(g: Game, roomId: string, aboard: "player" | "enemy"): Crew {
  const c: Crew = {
    id: `foe-${g.crew.length}`,
    name: "Foe",
    side: "player",
    aboard,
    hp: 100,
    maxHp: 100,
    room: roomId,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
  };
  g.crew.push(c);
  return c;
}

describe("enemy Crystal lockdown", () => {
  it("coats the room a Crystal shares with a boarder", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    gem.path = [];
    foe(g, gem.room, "enemy");
    tickEnemyCrewAi(g, 0.05);
    assert.equal(roomOf(g, gem.room, "enemy").lock, 12);
    assert.equal(gem.lockCool, 50);
  });

  it("does not coat a room with no opposing crew", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    gem.path = [];
    enemyCrystalLockdown(g);
    assert.equal(roomOf(g, gem.room, "enemy").lock ?? 0, 0);
    assert.equal(gem.lockCool ?? 0, 0);
  });

  it("coats the player room a boarding Crystal is standing in", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    const bay = g.player.rooms.find((r) => r.system === "pilot") ?? g.player.rooms[0]!;
    const crew = g.crew.find((c) => c.side === "player" && c.hp > 0 && c.aboard === "player");
    assert.ok(crew);
    crew.room = bay.id;
    crew.path = [];
    gem.aboard = "player";
    gem.room = bay.id;
    gem.path = [];
    enemyCrystalLockdown(g);
    assert.equal(roomOf(g, bay.id, "player").lock, 12);
    assert.equal(gem.lockCool, 50);
  });

  it("leaves the charge when the Crystal is still walking", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    foe(g, gem.room, "enemy");
    gem.path = ["elsewhere"];
    enemyCrystalLockdown(g);
    assert.equal(roomOf(g, gem.room, "enemy").lock ?? 0, 0);
    assert.equal(gem.lockCool ?? 0, 0);
  });

  it("does not spend a second Crystal on a room that is already coated", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    const other: Crew = { ...gem, id: "shard-2", path: [], lockCool: 0 };
    g.crew.push(other);
    gem.path = [];
    foe(g, gem.room, "enemy");
    enemyCrystalLockdown(g);
    const spent = [gem, other].filter((c) => (c.lockCool ?? 0) > 0);
    assert.equal(spent.length, 1);
    assert.equal(roomOf(g, gem.room, "enemy").lock, 12);
  });

  it("does not cast while the 50 second recharge is running", () => {
    const g = crystalFight();
    calm(g);
    const gem = shard(g);
    gem.path = [];
    gem.lockCool = 3;
    foe(g, gem.room, "enemy");
    enemyCrystalLockdown(g);
    assert.equal(roomOf(g, gem.room, "enemy").lock ?? 0, 0);
    assert.equal(gem.lockCool, 3);
  });
});
