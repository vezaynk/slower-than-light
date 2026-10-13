import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, intruderRoomPriority, startCombat, step } from "./sim.ts";
import { sideOf } from "./extras/leash.ts";
import type { Crew, Game, Room, Ship } from "./types.ts";

// Per the user: "Mind controlled enemies should behave the same as boarding enemies. For example, after they destroy
// a system, they should move on to their next target." Mind Control, "Overview": "They will be treated as an intruder
// by the enemy crew." Boarding, "Combat": boarders in a system room without hostile crew sabotage it.

function quietFight(seed: number): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  g.enemy!.weapons = [];
  g.player.weapons = [];
  g.enemyEscape = null;
  g.asb = false;
  g.asteroid = false;
  g.boardTimer = 1e9;
  g.paused = false;
  return g;
}

function level(ship: Ship, r: Room): { level: number; damage: number } {
  const s = r.system ? ship.systems[r.system] : ship.kits[r.kit!]!;
  return { level: s.level, damage: s.damage ?? 0 };
}

/**
 * Puts `c` alone in a working system room near the end of its sabotage. The room is one the boarders' own scoring
 * (intruderRoomPriority) ranks best from where it stands, so it stays there until the system is destroyed.
 */
function nearlyBroken(g: Game, ship: Ship, c: Crew): Room {
  const guarded = (x: Room) => g.crew.some((o) => o.id !== c.id && o.hp > 0 && o.aboard === c.aboard && o.room === x.id);
  const systems = ship.rooms.filter(
    (x) => x.system && x.system !== "doors" && ship.systems[x.system].level >= 2 && !guarded(x),
  );
  const score = (r: Room) => {
    c.room = r.id;
    const own = intruderRoomPriority(g, c, r, 1);
    return ship.rooms.every((o) => o.id === r.id || intruderRoomPriority(g, c, o, 1) >= own) ? own : Infinity;
  };
  const r = systems.find((x) => score(x) < Infinity)!;
  assert.ok(r, "a system room the boarder AI would stay in");
  const s = ship.systems[r.system!];
  s.damage = s.level - 1;
  r.sabotage = 0.99;
  r.fire = 0;
  r.o2 = 100;
  c.room = r.id;
  c.path = [];
  c.move = 0;
  c.stun = 0;
  c.hp = c.maxHp = 1000;
  // As if it had already picked this room (boarders keep a tied room: xftl ChoosePriorityRoom).
  c.intrude = r.id;
  return r;
}

function runUntilMoved(g: Game, ship: Ship, c: Crew, r: Room) {
  let destroyed = false;
  for (let i = 0; i < 200; i++) {
    step(g, 0.05);
    const l = level(ship, r);
    if (l.damage >= l.level) destroyed = true;
    if (destroyed && c.path.length > 0) break;
  }
  assert.ok(destroyed, "the held crew member destroyed the system it stood on");
  assert.notEqual(c.intrude, r.id, "the next target is another room");
  assert.ok(c.path.length > 0, "it walks to the next target");
  const next = ship.rooms.find((x) => x.id === c.intrude)!;
  assert.ok(next.system || next.kit, "the next target houses a system");
  for (let i = 0; i < 400 && c.room !== next.id; i++) step(g, 0.05);
  assert.equal(c.room, next.id, "it arrives at the next target room");
}

describe("mind-controlled crew act as boarders on their own ship", () => {
  it("an enemy the player holds destroys a system, then moves on to the next target room", () => {
    const g = quietFight(3);
    const foe = g.crew.find((c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0)!;
    // Only the held crew member on the enemy hull, so nobody defends the room.
    g.crew = g.crew.filter((c) => c.side === "player" || c.id === foe.id);
    for (const c of g.crew) if (c.side === "player") c.aboard = "player";
    foe.leashed = 1e6;
    assert.equal(sideOf(foe), "player");
    const ship = g.enemy!;
    const r = nearlyBroken(g, ship, foe);
    runUntilMoved(g, ship, foe, r);
  });

  it("a player crew member the enemy holds aboard the player ship does the same", () => {
    const g = quietFight(4);
    // Enemy crew stay aboard their own ship (with none left the fight is won).
    const [held, ...rest] = g.crew.filter((c) => c.side === "player");
    assert.ok(held && rest.length);
    held.leashed = 1e6;
    assert.equal(sideOf(held), "enemy");
    const ship = g.player;
    // Park the others together in one room (this hull has no room without a system); nearlyBroken skips it.
    const park = ship.rooms.find((x) => x.system === "pilot") ?? ship.rooms[0]!;
    for (const c of rest) {
      c.room = park.id;
      c.path = [];
    }
    const r = nearlyBroken(g, ship, held);
    runUntilMoved(g, ship, held, r);
  });
});
