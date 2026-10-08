import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame, orderCrew, step } from "./sim.ts";
import { hopLanding, walkPoint } from "./walk-path.ts";

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
    assert.equal(ivo.via, undefined);
  });

  it("carries the doorway into the next room", () => {
    const g = createGame(4, "kestrel-a");
    g.phase = "map";
    g.enemy = null;
    const ivo = g.crew.find((c) => c.name === "Ivo Park");
    assert.ok(ivo);
    orderCrew(g, ivo.id, "p-medbay");
    assert.equal(ivo.via, undefined);
    assert.ok(ivo.path.length > 1);
    const from = ivo.room;
    const landing = hopLanding(g.player, from, ivo.path, undefined);
    assert.ok(landing);
    for (let i = 0; i < 40 && ivo.room === from; i++) step(g, 0.05);
    assert.notEqual(ivo.room, from);
    assert.equal(ivo.via, `${landing.x},${landing.y}`);
    const at = walkPoint(g.player, ivo.room, ivo.path, ivo.via, 0);
    assert.deepEqual(at, { x: landing.x + 0.5, y: landing.y + 0.5 });
  });
});
