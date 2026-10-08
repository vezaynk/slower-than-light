import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, orderCrew, step } from "./sim.ts";

describe("crew orders outside a fight", () => {
  it("walks into the ordered room on the map", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-oxygen");
    assert.deepEqual(ivo.path, ["p-oxygen"]);
    assert.equal(ivo.room, "p-engines");
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-oxygen");
    assert.deepEqual(ivo.path, []);
    assert.equal(ivo.move, 0);
  });

  it("holds the walk while paused", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.paused = true;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-oxygen");
    for (let i = 0; i < 20; i++) step(g, 0.05);
    assert.equal(ivo.room, "p-engines");
    assert.equal(ivo.move, 0);
  });
});
