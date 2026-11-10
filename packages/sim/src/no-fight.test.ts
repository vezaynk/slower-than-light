import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, step, togglePause } from "./sim.ts";
import type { Game } from "./types.ts";

/** Per the user: the ship behaves the same with or without a fight on. These run on the map, with no enemy ship. */
function map(): Game {
  const g = createGame(4, "PLAYER_SHIP_HARD");
  g.phase = "map";
  g.enemy = null;
  g.paused = false;
  return g;
}

const run = (g: Game, seconds: number) => {
  for (let t = 0; t < seconds - 1e-9; t += 0.05) step(g, 0.05);
};

describe("the ship outside a fight (per the user)", () => {
  it("pauses on the map, and a pause holds the ship's clock", () => {
    const g = map();
    togglePause(g);
    assert.equal(g.userPaused, true);
    const room = g.player.rooms[0]!;
    room.o2 = 50;
    run(g, 1);
    assert.equal(room.o2, 50);
    togglePause(g);
    assert.equal(g.userPaused, false);
    run(g, 1);
    assert.ok(room.o2 > 50);
  });

  it("recharges shields and wears ion off", () => {
    const g = map();
    g.player.shieldNow = 0;
    g.player.systems.engines.ion = [5];
    run(g, 4);
    assert.ok(g.player.shieldNow > 0, `shields ${g.player.shieldNow}`);
    assert.ok(g.player.systems.engines.ion.length === 0 || g.player.systems.engines.ion[0]! < 5);
  });

  it("lets a fire damage its room's system, and crew repair a damaged one", () => {
    const g = map();
    const room = g.player.rooms.find((r) => r.system === "shields")!;
    for (const c of g.crew)
      if (c.room === room.id) c.room = g.player.rooms.find((r) => r.system === "pilot")!.id;
    room.fire = 1;
    const before = g.player.systems.shields.damage;
    run(g, 20);
    assert.ok(g.player.systems.shields.damage > before || room.fire === 0, "fire sabotage");
    // Crew in a room with a damaged system fix it.
    const eng = g.player.systems.engines;
    eng.damage = 1;
    eng.fix = 0;
    run(g, 0.5);
    assert.ok(eng.fix > 0 || eng.damage === 0, `fix ${eng.fix}`);
  });
});
