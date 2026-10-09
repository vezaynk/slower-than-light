import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPAIR_SECONDS, createGame, startCombat, step } from "../sim.ts";
import type { Game, Ship } from "../types.ts";

/** Move every crew member out of one breached room so only the gel can close it. */
function primed(g: Game, ship: Ship) {
  const room = ship.rooms[0];
  const other = ship.rooms.find((item) => item.id !== room.id);
  assert.ok(other);
  const aboard = ship === g.player ? "player" : "enemy";
  for (const crew of g.crew) {
    if (crew.aboard === aboard && crew.room === room.id) {
      crew.room = other.id;
      crew.path = [];
    }
  }
  room.breach = 1;
  room.breachFix = REPAIR_SECONDS - 0.03;
  room.fire = 0;
  return room;
}

describe("Slug ship breach gel", () => {
  it("seals an empty breach on a Slug ship, including a pirate, and not on a Rebel", () => {
    const slug = createGame(1);
    slug.sector = 3;
    slug.augments = [];
    startCombat(slug, "Slug ship");
    assert.equal(slug.enemy?.faction, "slug");
    const slugRoom = primed(slug, slug.enemy!);
    step(slug, 0.05);
    assert.equal(slugRoom.breach, 0);

    const pirate = createGame(2);
    pirate.sector = 3;
    pirate.augments = [];
    startCombat(pirate, "Slug pirate ship");
    assert.equal(pirate.enemy?.faction, "slug");
    assert.equal(pirate.enemy?.pirate, true);
    const pirateRoom = primed(pirate, pirate.enemy!);
    step(pirate, 0.05);
    assert.equal(pirateRoom.breach, 0);

    const rebel = createGame(3);
    rebel.augments = ["gel"];
    startCombat(rebel, "Rebel ship");
    assert.notEqual(rebel.enemy?.faction, "slug");
    const rebelRoom = primed(rebel, rebel.enemy!);
    step(rebel, 0.05);
    assert.equal(rebelRoom.breach, 1);

    const home = primed(rebel, rebel.player);
    step(rebel, 0.05);
    assert.equal(home.breach, 0);
  });
});
