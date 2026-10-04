import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat } from "../sim.ts";
import type { Crew, Game, Room, Ship } from "../types.ts";
import { SABOTAGE_RATE, tickSabotage } from "./sabotage.ts";

function fight(seed = 7): Game {
  const g = createGame(seed);
  startCombat(g, "Rebel ship");
  assert.ok(g.enemy);
  // Isolate rooms: clear crew so only the test's bodies stand anywhere.
  g.crew = [];
  return g;
}

function body(id: string, side: "player" | "enemy", aboard: "player" | "enemy", room: string, extra: Partial<Crew> = {}): Crew {
  return {
    id,
    name: id,
    side,
    aboard,
    hp: 100,
    maxHp: 100,
    room,
    path: [],
    move: 0,
    think: 0,
    tone: 0,
    ...extra,
  };
}

function sysRoom(ship: Ship, min = 2): Room {
  const r = ship.rooms.find((x) => x.system && ship.systems[x.system].level >= min);
  assert.ok(r, "a system room");
  return r;
}

function run(g: Game, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds - 1e-9; t += dt) tickSabotage(g, dt);
}

describe("system sabotage by boarders and fires", () => {
  it("one stationary boarder deals 1 system damage after 1/0.08 = 12.5 seconds", () => {
    const g = fight();
    const r = sysRoom(g.enemy!);
    const sys = g.enemy!.systems[r.system!];
    sys.damage = 0;
    r.fire = 0;
    g.crew.push(body("b", "player", "enemy", r.id));
    run(g, 12.4);
    assert.equal(sys.damage, 0);
    assert.ok(Math.abs((r.sabotage ?? 0) - 12.4 * SABOTAGE_RATE) < 1e-6);
    run(g, 0.2);
    assert.equal(sys.damage, 1);
    assert.ok((r.sabotage ?? 0) < 0.05);
  });

  it("a hostile defender in the room stops the sabotage", () => {
    const g = fight();
    const r = sysRoom(g.player);
    const sys = g.player.systems[r.system!];
    sys.damage = 0;
    r.fire = 0;
    g.crew.push(body("b", "enemy", "player", r.id), body("d", "player", "player", r.id));
    run(g, 20);
    assert.equal(sys.damage, 0);
  });

  it("moving or stunned boarders do not sabotage", () => {
    const g = fight();
    const r = sysRoom(g.player);
    r.fire = 0;
    g.player.systems[r.system!].damage = 0;
    g.crew.push(body("m", "enemy", "player", r.id, { path: ["x"] }), body("s", "enemy", "player", r.id, { stun: 99 }));
    run(g, 20);
    assert.equal(g.player.systems[r.system!].damage, 0);
    assert.equal(r.sabotage ?? 0, 0);
  });

  it("boarders and fire add up; progress resets once neither remains", () => {
    const g = fight();
    const r = sysRoom(g.player);
    g.player.systems[r.system!].damage = 0;
    r.fire = 1;
    g.crew.push(body("b", "enemy", "player", r.id));
    run(g, 5);
    assert.ok(Math.abs((r.sabotage ?? 0) - 5 * 2 * SABOTAGE_RATE) < 1e-6);
    g.crew = [];
    r.fire = 0;
    run(g, 0.05);
    assert.equal(r.sabotage, 0);
  });

  it("fire alone damages the system even with friendly crew present", () => {
    const g = fight();
    const r = sysRoom(g.player);
    g.player.systems[r.system!].damage = 0;
    r.fire = 2;
    g.crew.push(body("d", "player", "player", r.id));
    run(g, 1 / (2 * SABOTAGE_RATE) + 0.1);
    assert.equal(g.player.systems[r.system!].damage, 1);
  });

  it("burning a system out costs 1 hull, once, and then progress stops", () => {
    const g = fight();
    const r = sysRoom(g.player, 1);
    const sys = g.player.systems[r.system!];
    sys.damage = sys.level - 1;
    r.fire = 1;
    const hull = g.player.hull;
    run(g, 1 / SABOTAGE_RATE + 0.1);
    assert.equal(sys.damage, sys.level);
    assert.equal(g.player.hull, hull - 1);
    run(g, 40);
    assert.equal(g.player.hull, hull - 1);
    assert.equal(r.sabotage ?? 0, 0);
  });

  it("damages an enemy kit room", () => {
    const g = fight();
    const r = g.enemy!.rooms.find((x) => !x.system) ?? g.enemy!.rooms[0]!;
    r.system = null;
    r.kit = "leash";
    r.fire = 0;
    g.enemy!.kits.leash = { id: "leash", level: 2, power: 2, left: 0, cool: 0, target: null, on: false, aux: 0 };
    g.crew.push(body("b", "player", "enemy", r.id));
    run(g, 12.6);
    assert.equal(g.enemy!.kits.leash!.damage, 1);
  });

  it("INFERRED: a leashed enemy on its own ship sabotages it; a leashed player boarder defends there", () => {
    const g = fight();
    const r = sysRoom(g.enemy!);
    const sys = g.enemy!.systems[r.system!];
    sys.damage = 0;
    r.fire = 0;
    g.crew.push(body("e", "enemy", "enemy", r.id, { leashed: 30 }));
    run(g, 12.6);
    assert.equal(sys.damage, 1);
    const g2 = fight();
    const r2 = sysRoom(g2.enemy!);
    g2.enemy!.systems[r2.system!].damage = 0;
    r2.fire = 0;
    g2.crew.push(body("b", "player", "enemy", r2.id), body("p", "player", "enemy", r2.id, { leashed: 30 }));
    run(g2, 20);
    assert.equal(g2.enemy!.systems[r2.system!].damage, 0);
  });
});
