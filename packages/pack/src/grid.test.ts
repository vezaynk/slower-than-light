import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HullDef } from "./types.ts";
import { gridFromLayout, marksFromDoors, readGrid, writeGrid } from "./grid.ts";

describe("layout text", () => {
  const source = {
    cols: 4,
    rows: 3,
    rooms: [
      { id: "a", title: "Hall", system: null, x: 0, y: 0, w: 2, h: 2 },
      { id: "b", title: "Piloting", system: "pilot", x: 2, y: 0, w: 2, h: 2, reserve: "Cloaking" },
    ],
    marks: [
      { x: 1, y: 0, side: "n" as const },
      { x: 1, y: 1, side: "e" as const },
      { x: 0, y: 1, side: "w" as const },
      { x: 1, y: 1, side: "s" as const },
    ],
  };

  it("writes doors on the eastern or southern cell and reads the same bars back", () => {
    const grid = gridFromLayout(source);
    assert.deepEqual(grid.doors, [
      { x: 1, y: 0, a: 0, b: -1, vertical: 0 },
      { x: 2, y: 1, a: 0, b: 1, vertical: 1 },
      { x: 0, y: 1, a: 0, b: -1, vertical: 1 },
      { x: 1, y: 2, a: 0, b: -1, vertical: 0 },
    ]);
    assert.deepEqual(marksFromDoors(grid), source.marks);
    const read = readGrid(writeGrid(grid));
    assert.ok(read);
    assert.deepEqual(
      read.rooms.map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
      [
        { id: 0, x: 0, y: 0, w: 2, h: 2 },
        { id: 1, x: 2, y: 0, w: 2, h: 2 },
      ],
    );
    assert.deepEqual(read.doors, grid.doors);
    assert.equal(read.x, 0);
    assert.equal(read.y, 0);
    assert.equal(read.vertical, 0);
    // Rooms span 4 by 2. The oval adds the one-cell plate on every side, and ELLIPSE stores radii.
    assert.deepEqual(grid.ellipse, { w: 3 * 35, h: 2 * 35, x: 0, y: 0 });
    assert.deepEqual(read.ellipse, grid.ellipse);
  });

  it("drops a bar whose cell is not inside a room", () => {
    const grid = gridFromLayout({
      ...source,
      marks: [{ x: 9, y: 9, side: "e" }],
    });
    assert.deepEqual(grid.doors, []);
  });
});
