import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FIRE_FIGHT_SHARE, createGame, step } from "./sim.ts";
import type { Game, Room } from "./types.ts";

/** Empty the fire room, shut every door, and keep the door console unmanned so spread uses the level-1 slow. */
function sealed(g: Game, roomId: string): Room {
  assert.equal(g.phase, "map");
  assert.equal(g.enemy, null);
  const room = g.player.rooms.find((r) => r.id === roomId);
  assert.ok(room);
  const away = g.player.rooms.find((r) => r.id !== roomId && r.system !== "doors");
  assert.ok(away);
  for (const c of g.crew) {
    c.room = away.id;
    c.path = [];
    c.stun = 0;
    c.hp = c.maxHp;
  }
  for (const d of g.player.doors) d.open = false;
  assert.ok(g.player.doors.some((d) => d.b !== "void" && (d.a === roomId || d.b === roomId)));
  room.fire = 1;
  room.o2 = 100;
  room.fireTick = 0;
  room.breach = 0;
  return room;
}

function fireTotal(g: Game): number {
  return g.player.rooms.reduce((sum, r) => sum + r.fire, 0);
}

describe("Fires outside a fight", () => {
  it("grows a sealed fire by 0.5 once the level-1 door slow passes 7s", () => {
    const g = createGame(1);
    const room = sealed(g, "p-oxygen");
    const quiet = new Map(g.player.rooms.filter((r) => r.id !== room.id).map((r) => [r.id, r.o2]));
    // Door System: a level-1 closed door slows spread ×1.75. The tick must pass 7s of slowed time.
    const slow = 1.75;
    const dt = 0.05;
    let steps = 0;
    while (room.fire === 1 && steps < 400) {
      step(g, dt);
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 1.5);
    assert.equal(room.fireTick, 0);
    assert.ok(elapsed + 1e-6 >= 7 * slow, `${elapsed}`);
    assert.ok(elapsed - 7 * slow <= dt + 1e-6, `${elapsed}`);
    assert.ok(g.player.rooms.every((r) => r.id === room.id || r.fire === 0));
    assert.ok(Math.abs(room.o2 - (100 - 0.96 * elapsed)) < 1e-6, `${room.o2}`);
    for (const [id, o2] of quiet) assert.equal(g.player.rooms.find((r) => r.id === id)!.o2, o2, id);
  });

  it("grows a sealed fire by 0.5 once blast doors pass 7s", () => {
    const g = createGame(2);
    g.player.systems.doors.level = 2;
    const room = sealed(g, "p-oxygen");
    const dt = 0.05;
    let steps = 0;
    while (room.fire === 1 && steps < 2000) {
      step(g, dt);
      steps += 1;
    }
    const elapsed = steps * dt;
    assert.equal(room.fire, 1.5);
    assert.ok(elapsed + 1e-6 >= 7 * 10, `${elapsed}`);
    assert.ok(elapsed - 70 <= dt + 1e-6, `${elapsed}`);
  });

  it("a crew member in the room puts the fire out and takes 2.128 HP per second", () => {
    const g = createGame(3);
    const room = g.player.rooms.find((r) => r.id === "p-oxygen")!;
    const worker = g.crew[0]!;
    for (const c of g.crew) {
      c.path = [];
      c.stun = 0;
      c.kin = "plain";
      c.skills = {};
      if (c.id !== worker.id) c.room = "p-pilot";
    }
    worker.room = room.id;
    worker.hp = 100;
    worker.maxHp = 100;
    room.fire = 1;
    room.o2 = 100;
    room.fireTick = 0;
    step(g, 0.05);
    const left = 1 - FIRE_FIGHT_SHARE * 0.05;
    assert.ok(Math.abs(room.fire - left) < 1e-9, `${room.fire}`);
    assert.ok(Math.abs(worker.hp - (100 - 2.128 * left * 0.05)) < 1e-6, `${worker.hp}`);
  });

  it("dies below 10% oxygen and does not refill a quiet room", () => {
    const g = createGame(4);
    const room = sealed(g, "p-oxygen");
    room.o2 = 10;
    room.fire = 1;
    const quiet = g.player.rooms.find((r) => r.id === "p-sensors")!;
    quiet.o2 = 80;
    quiet.fire = 0;
    step(g, 0.05);
    assert.equal(room.fire, 0);
    assert.ok(Math.abs(room.o2 - (10 - 0.96 * 0.05)) < 1e-9);
    assert.equal(quiet.o2, 80);
  });

  it("does not repair, heal, or suffocate on the map", () => {
    const g = createGame(5);
    sealed(g, "p-oxygen");
    const med = g.player.rooms.find((r) => r.id === "p-medbay")!;
    g.player.systems.medbay.power = 1;
    g.player.systems.medbay.damage = 1;
    g.player.systems.medbay.fix = 0;
    med.o2 = 4;
    const crew = g.crew[0]!;
    crew.room = med.id;
    crew.hp = 40;
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(g.player.systems.medbay.fix, 0);
    assert.equal(g.player.systems.medbay.damage, 1);
    assert.equal(crew.hp, 40);
    assert.equal(med.o2, 4);
  });

  it("can spread through an open door", () => {
    const g = createGame(6);
    const room = sealed(g, "p-oxygen");
    for (const d of g.player.doors) {
      if (d.b !== "void" && (d.a === room.id || d.b === room.id)) d.open = true;
    }
    room.fireTick = 7;
    const before = fireTotal(g);
    step(g, 0.05);
    const after = fireTotal(g);
    assert.equal(room.fireTick, 0);
    assert.ok(after === before + 0.5 || after === before + 1, `${before} -> ${after}`);
  });

  it("stays still while paused or on the title", () => {
    const g = createGame(7);
    const room = sealed(g, "p-oxygen");
    room.fireTick = 7;
    g.paused = true;
    step(g, 0.05);
    assert.equal(room.fire, 1);
    assert.equal(room.o2, 100);
    g.paused = false;
    g.phase = "title";
    step(g, 0.05);
    assert.equal(room.fire, 1);
    assert.equal(room.fireTick, 7);
    assert.equal(room.o2, 100);
  });
});
