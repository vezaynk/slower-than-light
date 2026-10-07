import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, doorLevel, evasionPercent } from "./sim.ts";
import type { Crew } from "./types.ts";

describe("Systems: a breach blocks manning until it is sealed", () => {
  it("drops the engines bonus while that room is breached and undamaged", () => {
    const g = createGame(1);
    const engines = g.player.rooms.find((r) => r.system === "engines")!;
    const pilot = g.player.rooms.find((r) => r.system === "pilot")!;
    for (const c of g.crew) {
      if (c.room === engines.id || c.room === pilot.id) c.path = [];
    }
    assert.equal(g.player.systems.engines.damage, 0);
    assert.equal(engines.breach, 0);
    assert.equal(evasionPercent(g, g.player, "player"), 20);

    engines.breach = 1;
    assert.equal(g.player.systems.engines.damage, 0);
    assert.equal(evasionPercent(g, g.player, "player"), 15);
    for (const c of g.crew) {
      if (c.room === engines.id || c.room === pilot.id) assert.equal(c.path.length, 0);
    }

    engines.breach = 0;
    assert.equal(evasionPercent(g, g.player, "player"), 20);
  });

  it("drops the pilot bonus while piloting is breached and engines are clear", () => {
    const g = createGame(2);
    const engines = g.player.rooms.find((r) => r.system === "engines")!;
    const pilot = g.player.rooms.find((r) => r.system === "pilot")!;
    for (const c of g.crew) {
      if (c.room === engines.id || c.room === pilot.id) c.path = [];
    }
    assert.equal(engines.breach, 0);
    assert.equal(g.player.systems.engines.damage, 0);
    assert.equal(g.player.systems.pilot.damage, 0);

    pilot.breach = 1;
    assert.equal(evasionPercent(g, g.player, "player"), 15);
    for (const c of g.crew) {
      if (c.room === engines.id || c.room === pilot.id) assert.equal(c.path.length, 0);
    }
  });

  it("keeps an auto-ship's door manning bonus through fire, a breach, and an intruder", () => {
    const g = createGame(3);
    const doors = g.player.rooms.find((r) => r.system === "doors")!;
    const nen = g.crew.find((c) => c.id === "c-nen")!;
    nen.room = doors.id;
    nen.path = [];
    g.player.automated = true;
    assert.equal(g.player.systems.doors.damage, 0);
    assert.equal(doorLevel(g, g.player, "player"), 2);

    doors.o2 = 5;
    assert.equal(doorLevel(g, g.player, "player"), 1);
    doors.o2 = 100;

    doors.fire = 1;
    doors.breach = 1;
    const boarder: Crew = {
      id: "boarder",
      name: "Boarder",
      side: "enemy",
      aboard: "player",
      hp: 100,
      maxHp: 100,
      room: doors.id,
      path: [],
      move: 0,
      think: 0,
      tone: 0,
    };
    g.crew.push(boarder);
    assert.equal(doorLevel(g, g.player, "player"), 2);

    g.player.automated = false;
    assert.equal(doorLevel(g, g.player, "player"), 1);
  });
});
