import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tileCount, type Layout } from "../layouts.ts";
import { flagshipHardLinks, flagshipStage1, flagshipStage2, flagshipStage3 } from "./flagship-layout.ts";

const step = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] } as const;

function occupied(layout: Layout): Map<string, string> {
  const at = new Map<string, string>();
  for (const room of layout.rooms) {
    assert.ok(room.w > 0 && room.h > 0, room.id);
    assert.ok(room.x >= 0 && room.y >= 0, room.id);
    assert.ok(room.x + room.w <= layout.cols && room.y + room.h <= layout.rows, room.id);
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (room.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
        assert.equal(at.has(`${x},${y}`), false, `${room.id} overlaps ${x},${y}`);
        at.set(`${x},${y}`, room.id);
      }
    }
  }
  return at;
}

function assertTraced(layout: Layout, squares: number) {
  const summed = layout.rooms.reduce((n, room) => n + room.w * room.h - (room.omit?.length ?? 0), 0);
  assert.equal(summed, squares);
  assert.equal(tileCount(layout), squares);
  const at = occupied(layout);
  assert.equal(at.size, squares);
  for (let i = 0; i < layout.rooms.length; i++) {
    const a = layout.rooms[i];
    for (let j = i + 1; j < layout.rooms.length; j++) {
      const b = layout.rooms[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${a.id} overlaps ${b.id}`);
    }
  }
  const seen = new Set<string>();
  for (const mark of layout.marks ?? []) {
    const key = `${mark.x},${mark.y},${mark.side}`;
    assert.equal(seen.has(key), false, key);
    seen.add(key);
    const idHere = at.get(`${mark.x},${mark.y}`);
    assert.ok(idHere, `${mark.x},${mark.y} ${mark.side}`);
    const room = layout.rooms.find((item) => item.id === idHere);
    assert.ok(room);
    if (mark.side === "e") assert.equal(mark.x, room.x + room.w - 1);
    if (mark.side === "w") assert.equal(mark.x, room.x);
    if (mark.side === "s") assert.equal(mark.y, room.y + room.h - 1);
    if (mark.side === "n") assert.equal(mark.y, room.y);
    const [dx, dy] = step[mark.side];
    assert.notEqual(at.get(`${mark.x + dx},${mark.y + dy}`), idHere);
  }
}

describe("Rebel Flagship traced layouts", () => {
  it("counts the stage pictures and the hard links", () => {
    assertTraced(flagshipStage1, 52);
    assertTraced(flagshipStage2, 42);
    assertTraced(flagshipStage3, 32);
    assertTraced(flagshipHardLinks, 4);
    assert.equal(flagshipStage1.marks?.length, 15);
    assert.equal(flagshipStage2.marks?.length, 13);
    assert.equal(flagshipStage3.marks?.length, 11);
    assert.equal(flagshipHardLinks.marks?.length, 4);
  });

  it("keeps the hard links out of the normal stages", () => {
    const hard = ["4,1", "4,2", "7,1", "7,2"];
    for (const layout of [flagshipStage1, flagshipStage2, flagshipStage3]) {
      const at = occupied(layout);
      for (const cell of hard) assert.equal(at.has(cell), false, cell);
    }
    const links = occupied(flagshipHardLinks);
    for (const cell of hard) assert.ok(links.has(cell), cell);
    assert.deepEqual(
      flagshipHardLinks.rooms.map((room) => room.title),
      ["Hall", "Hall"],
    );
  });
});
