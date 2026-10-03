import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, startCombat, step } from "../sim.ts";

describe("starting augments", () => {
  it("fits the ones whose effect already runs", () => {
    assert.deepEqual(createGame(1, "engi-a").augments, ["medbot"]);
    assert.deepEqual(createGame(1, "slug-a").augments, ["gel"]);
    assert.deepEqual(createGame(1, "slug-b").augments, ["gel"]);
    assert.deepEqual(createGame(1, "slug-c").augments, ["gel"]);
    assert.deepEqual(createGame(1, "mantis-a").augments, ["pheromone"]);
    assert.deepEqual(createGame(1, "mantis-b").augments, ["pheromone"]);
    assert.deepEqual(createGame(1, "mantis-c").augments, ["pheromone"]);
  });
});

describe("Slug Repair Gel and Mantis Pheromones", () => {
  it("seals an empty breached room, and stacks on a crew repair", () => {
    const empty = createGame(1);
    startCombat(empty, "scout");
    const room = empty.player.rooms[0];
    const elsewhere = empty.player.rooms.find((item) => item.id !== room.id);
    assert.ok(elsewhere);
    for (const crew of empty.crew) {
      if (crew.room === room.id) crew.room = elsewhere.id;
    }
    room.breach = 1;
    room.breachFix = 7.97;
    room.fire = 0;
    empty.augments = ["gel"];
    step(empty, 0.05);
    assert.equal(room.breach, 0);

    const bare = createGame(1);
    startCombat(bare, "scout");
    const open = bare.player.rooms[0];
    for (const crew of bare.crew) {
      if (crew.room === open.id) crew.room = bare.player.rooms.find((item) => item.id !== open.id)!.id;
    }
    open.breach = 1;
    open.breachFix = 7.97;
    open.fire = 0;
    step(bare, 0.05);
    assert.equal(open.breach, 1);

    const stacked = createGame(1);
    startCombat(stacked, "scout");
    const bench = stacked.player.rooms.find(
      (item) => item.system && stacked.player.systems[item.system].damage <= 0,
    );
    assert.ok(bench);
    const worker = stacked.crew.find((crew) => crew.side === "player" && crew.hp > 0);
    assert.ok(worker);
    for (const crew of stacked.crew) {
      if (crew.side === "player" && crew.id !== worker.id && crew.room === bench.id) {
        crew.room = stacked.player.rooms.find((item) => item.id !== bench.id)!.id;
      }
    }
    worker.room = bench.id;
    worker.path = [];
    worker.stun = 0;
    bench.fire = 0;
    bench.breach = 1;
    bench.breachFix = 7.92;
    stacked.augments = ["gel"];
    step(stacked, 0.05);
    assert.equal(bench.breach, 0);
  });

  it("moves your crew 25 percent faster, including off the ship", () => {
    function walked(pheromone: boolean, aboard: "player" | "enemy") {
      const g = createGame(2);
      startCombat(g, "scout");
      const crew = g.crew.find((item) => item.side === "player" && item.hp > 0);
      assert.ok(crew);
      const ship = aboard === "player" ? g.player : g.enemy;
      assert.ok(ship);
      for (const door of ship.doors) door.open = true;
      const next = ship.rooms.find((room) => room.id !== crew.room) ?? ship.rooms[0];
      crew.aboard = aboard;
      crew.room = ship.rooms[0].id;
      if (next.id === crew.room && ship.rooms[1]) crew.path = [ship.rooms[1].id];
      else crew.path = [next.id];
      crew.move = 0;
      crew.stun = 0;
      if (pheromone) g.augments = ["pheromone"];
      step(g, 0.05);
      return crew.move;
    }
    const home = walked(false, "player");
    const sped = walked(true, "player");
    assert.ok(home > 0);
    assert.ok(Math.abs(sped / home - 1.25) < 1e-9);
    const boarded = walked(true, "enemy");
    assert.ok(Math.abs(boarded / home - 1.25) < 1e-9);
  });
});
