import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, step } from "./sim.ts";

describe("a dead ship outside combat", () => {
  it("ends the run when a fire destroys the last system bar and the hull", () => {
    const g = createGame(1902176094, "PLAYER_SHIP_HARD", "easy");
    assert.equal(g.phase, "map");
    assert.equal(g.enemy, null);
    const room = g.player.rooms.find((r) => r.system === "oxygen");
    assert.ok(room);
    const sys = g.player.systems.oxygen;
    assert.ok(sys.level >= 1);
    // One more sabotage bar destroys the system. Fires deal that bar, then 1 hull.
    sys.damage = sys.level - 1;
    sys.fix = 0;
    room.fire = 1;
    room.o2 = 100;
    room.sabotage = 0;
    room.breach = 0;
    g.player.hull = 1;
    const away = g.player.rooms.find((r) => r.id !== room.id && r.system !== "doors");
    assert.ok(away);
    for (const c of g.crew) {
      c.room = away.id;
      c.path = [];
      c.stun = 60;
      c.hp = c.maxHp;
    }
    for (const d of g.player.doors) d.open = false;
    const before = g.player.hull;
    let steps = 0;
    while (g.phase === "map" && steps < 400) {
      step(g, 0.05);
      steps += 1;
    }
    assert.ok(steps < 400, "the map clock never reached a defeat");
    assert.equal(g.phase, "defeat");
    assert.equal(g.outcome, "hull");
    assert.ok(g.player.hull < before);
    assert.ok(g.player.hull <= 0);
    assert.ok(g.crew.some((c) => c.side === "player" && c.hp > 0));
  });

  it("ends the run when the crew suffocates on the map with the hull intact", () => {
    const g = createGame(3, "PLAYER_SHIP_HARD", "easy");
    assert.equal(g.phase, "map");
    g.player.systems.oxygen.power = 0;
    g.player.systems.medbay.power = 0;
    for (const r of g.player.rooms) r.o2 = 0;
    const room = g.player.rooms.find((r) => r.system === "pilot");
    assert.ok(room);
    for (const c of g.crew) {
      if (c.side !== "player") continue;
      c.room = room.id;
      c.path = [];
      c.hp = 1;
    }
    const hull = g.player.hull;
    assert.ok(hull > 0);
    let steps = 0;
    while (g.phase === "map" && steps < 40) {
      step(g, 0.05);
      steps += 1;
    }
    assert.ok(steps < 40, "suffocation never ended the run");
    assert.equal(g.phase, "defeat");
    assert.equal(g.outcome, "crew");
    assert.ok(g.player.hull > 0);
    assert.equal(g.player.hull, hull);
  });
});
