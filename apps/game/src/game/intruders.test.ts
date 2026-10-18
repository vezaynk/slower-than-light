import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, intruderRoomPriority, startCombat, step } from "./sim.ts";
import type { Crew, Game } from "./types.ts";

function boarder(g: Game, room: string, id: string): Crew {
  const c: Crew = {
    id,
    name: id,
    side: "enemy",
    aboard: "player",
    hp: 100,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
  };
  g.crew.push(c);
  return c;
}

function setup(): Game {
  const g = createGame(5);
  startCombat(g, "scout");
  g.enemy!.weapons = [];
  g.player.weapons = [];
  g.enemyEscape = null;
  g.asb = false;
  g.asteroid = false;
  g.boardTimer = 1e9;
  for (const c of g.crew)
    if (c.side === "player") c.room = g.player.rooms.find((r) => r.system === "pilot")!.id;
  return g;
}

describe("enemy boarders (xftl doc/crew-ai, UpdateIntruders)", () => {
  it("scores rooms: -10 to stay and fight, +100 fire, +70 no air, +5 slot mismatch, +10 far, +20 no system", () => {
    const g = setup();
    const ship = g.player;
    const here = ship.rooms.find((r) => r.system === "shields")!;
    const c = boarder(g, here.id, "x1");
    const base = intruderRoomPriority(g, c, here, 1);
    here.fire = 1;
    assert.equal(intruderRoomPriority(g, c, here, 1), base + 100);
    here.fire = 0;
    here.o2 = 9;
    assert.equal(intruderRoomPriority(g, c, here, 1), base + 70);
    here.o2 = 100;
    ship.systems.shields.damage = ship.systems.shields.level;
    assert.equal(intruderRoomPriority(g, c, here, 1), base + 20);
    ship.systems.shields.damage = 0;
    const mate = g.crew.find((o) => o.side === "player")!;
    mate.room = here.id;
    assert.equal(intruderRoomPriority(g, c, here, 1), base - 10);
    const linked = new Set(
      ship.doors.flatMap((d) => (d.a === here.id ? [d.b] : d.b === here.id ? [d.a] : [])),
    );
    const far = ship.rooms.find((r) => r.id !== here.id && !linked.has(r.id) && r.system)!;
    const near = ship.rooms.find((r) => linked.has(r.id) && r.system)!;
    const sysCost = (r: typeof far) =>
      ship.systems[r.system!].damage >= ship.systems[r.system!].level ? 20 : 0;
    assert.equal(
      intruderRoomPriority(g, c, far, 99) -
        sysCost(far) -
        (intruderRoomPriority(g, c, near, 99) - sysCost(near)),
      10,
    );
  });

  it("the first boarder picks the room and the next ones follow it", () => {
    const g = setup();
    const start = g.player.rooms.find((r) => r.system === "oxygen")!;
    const a = boarder(g, start.id, "x1");
    const b = boarder(g, start.id, "x2");
    for (let i = 0; i < 4; i++) step(g, 0.05);
    assert.ok(a.intrude);
    assert.equal(b.intrude, a.intrude);
  });

  it("stays to fight crew in its own room", () => {
    const g = setup();
    const room = g.player.rooms.find((r) => r.system === "weapons")!;
    const c = boarder(g, room.id, "x1");
    const mate = g.crew.find((o) => o.side === "player")!;
    mate.room = room.id;
    mate.path = [];
    step(g, 0.05);
    assert.equal(c.intrude, room.id);
    assert.equal(c.path.length, 0);
  });
});
