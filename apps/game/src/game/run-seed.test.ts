import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRunSeed } from "./run-seed.ts";
import { createGame, rand } from "./sim.ts";

describe("resolveRunSeed", () => {
  it("keeps a uint32 pin and mixes the clock otherwise", () => {
    assert.equal(resolveRunSeed(1902176094, 5), 1902176094);
    assert.equal(resolveRunSeed(1, 5), 1);
    assert.equal(resolveRunSeed(0xffffffff, 5), 0xffffffff);
    assert.equal(resolveRunSeed(0, 0), (0 ^ 0x9e3779b9) >>> 0);
    assert.equal(resolveRunSeed(1.5, 0), (0 ^ 0x9e3779b9) >>> 0);
    assert.equal(resolveRunSeed(-3, 0), (0 ^ 0x9e3779b9) >>> 0);
    assert.equal(resolveRunSeed("1902176094", 0), (0 ^ 0x9e3779b9) >>> 0);
    assert.equal(resolveRunSeed(undefined, 0x9e3779b9), 1);
  });
});

describe("createGame run seed", () => {
  it("records the seed the run was built from after the map rolls", () => {
    const g = createGame(1902176094, "PLAYER_SHIP_HARD", "easy");
    assert.equal(g.runSeed, 1902176094);
    assert.equal(g.difficulty, "easy");
    assert.equal(g.hullId, "PLAYER_SHIP_HARD");
    rand(g);
    assert.equal(g.runSeed, 1902176094);
  });
});
