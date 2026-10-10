import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGame } from "./sim.ts";
import { arriveMove, footVia, hopSteps, standCell, walkCells, walkPoint } from "./walk-path.ts";

const column = {
  cols: 2,
  rows: 5,
  rooms: [
    { id: "L", x: 0, y: 0, w: 1, h: 5 },
    { id: "R", x: 1, y: 0, w: 1, h: 5 },
  ],
  doors: [{ a: "L", b: "R" as const }],
};

describe("walk path", () => {
  it("crosses the only door instead of the two room centers", () => {
    const ship = { ...column, doorMarks: [{ x: 0, y: 0, side: "e" as const }] };
    const cells = walkCells(ship, "L", ["R"], undefined);
    assert.deepEqual(cells, [
      { x: 0, y: 4 },
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 1, y: 3 },
      { x: 1, y: 4 },
    ]);
    const mid = walkPoint(ship, "L", ["R"], undefined, 0.5);
    assert.deepEqual(mid, { x: 1, y: 0.5 });
    const crossed = cells!.findIndex((cell, i) => i > 0 && cell.x !== cells![i - 1].x);
    assert.equal(cells![crossed].y, 0);
    assert.equal(cells![crossed - 1].y, 0);
  });

  it("uses the nearest shared edge when the ship has no door bars", () => {
    const cells = walkCells(column, "L", ["R"], undefined);
    assert.deepEqual(cells, [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
    ]);
  });

  it("stays put when the rooms do not share a door", () => {
    assert.equal(walkCells({ ...column, doors: [] }, "L", ["R"], undefined), null);
  });

  it("starts a Kestrel order on the standing tile and leaves through the door", () => {
    const ship = createGame(4, "kestrel-a").player;
    assert.ok(ship.doorMarks?.length);
    const cells = walkCells(ship, "p-engines", ["p-oxygen"], undefined);
    assert.deepEqual(cells, [
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]);
    const at = walkPoint(ship, "p-engines", ["p-oxygen"], undefined, 0);
    assert.deepEqual(at, { x: 1.5, y: 3.5 });
    const door = walkPoint(ship, "p-oxygen", ["p-a1"], "2,1", 0);
    assert.deepEqual(door, { x: 2.5, y: 1.5 });
  });

  it("stands a lone crew on the bottom-left tile", () => {
    assert.deepEqual(standCell({ id: "W", x: 0, y: 0, w: 3, h: 1 }), { x: 0, y: 0 });
  });

  it("ends on the requested floor tile", () => {
    const cells = walkCells(column, "L", ["R"], undefined, { x: 1, y: 0 });
    assert.deepEqual(cells!.at(-1), { x: 1, y: 0 });
    const fallback = walkCells(column, "L", ["R"], undefined, { x: 9, y: 9 });
    assert.deepEqual(fallback!.at(-1), { x: 1, y: 4 });
  });

  it("holds the last tile before the hop clock finishes", () => {
    const cells = walkCells(column, "L", ["R"], undefined)!;
    const steps = hopSteps(cells);
    const end = cells[cells.length - 1]!;
    assert.equal(arriveMove(0, 1), 0);
    assert.equal(arriveMove(0.72, 1), 1);
    // The early hold is 0.28 of one tile, not 0.28 of the whole room.
    const done = 1 - 0.28 / steps;
    assert.equal(arriveMove(done, steps), 1);
    assert.ok(arriveMove(done / 2, steps) < 1);
    const held = walkPoint(column, "L", ["R"], undefined, arriveMove(done, steps));
    assert.deepEqual(held, { x: end.x + 0.5, y: end.y + 0.5 });
    const mid = walkPoint(column, "L", ["R"], undefined, 0.5);
    assert.notDeepEqual(mid, held);
  });

  it("resumes a hop at the exact point instead of the cell center", () => {
    const ship = createGame(4, "kestrel-a").player;
    const via = "2,2@2.5000,2.2000";
    const at = walkPoint(ship, "p-engines", ["p-oxygen"], via, 0);
    assert.deepEqual(at, { x: 2.5, y: 2.2 });
    const steps = hopSteps(walkCells(ship, "p-engines", ["p-oxygen"], via), via);
    const next = walkPoint(ship, "p-engines", ["p-oxygen"], via, 0.05 / steps);
    assert.ok(next);
    const along = Math.hypot(next.x - at.x, next.y - at.y);
    assert.ok(Math.abs(along - 0.05) < 0.01, String(along));
    const foot = footVia(ship, "p-engines", ["p-oxygen"], via, 0);
    assert.ok(foot);
    assert.equal(foot.room, "p-engines");
    const resumed = walkPoint(ship, "p-engines", ["p-oxygen"], foot.via, 0);
    assert.ok(resumed);
    assert.ok(Math.hypot(resumed.x - at.x, resumed.y - at.y) < 0.001);
  });
});
