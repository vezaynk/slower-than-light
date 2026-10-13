import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { factionPaint, plateOf, type HullCell } from "./hull-plate.ts";
import { LAYOUTS, layoutFor } from "./layouts.ts";
import { ENEMY_CLASSES } from "./wiki/enemy-ships.ts";
import { ENEMY_LAYOUTS } from "./wiki/enemy-layouts.ts";
import { flagshipStage1, flagshipStage2, flagshipStage3 } from "./wiki/flagship-layout.ts";

type Box = { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

const BLOCK: Box[] = [{ x: 0, y: 0, w: 4, h: 3 }];

function floorOf(rooms: Box[]): Set<string> {
  const floor = new Set<string>();
  for (const room of rooms) {
    const skip = new Set((room.omit ?? []).map((c) => `${c.x},${c.y}`));
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!skip.has(`${x},${y}`)) floor.add(`${x},${y}`);
      }
    }
  }
  return floor;
}

function sig(cells: HullCell[]): string {
  return cells.map((c) => `${c.x},${c.y},${c.ink}`).join("|");
}

function offFloor(cells: HullCell[], rooms: Box[]) {
  const floor = floorOf(rooms);
  for (const cell of cells) assert.equal(floor.has(`${cell.x},${cell.y}`), false, `${cell.x},${cell.y}`);
}

describe("hull plates", () => {
  it("paints every player layout, enemy class, and flagship stage", () => {
    const seen = new Map<string, string>();
    const claim = (id: string, cells: HullCell[]) => {
      assert.ok(cells.length > 0, id);
      const key = sig(cells);
      assert.equal(seen.has(key), false, `${id} repeats ${seen.get(key)}`);
      seen.set(key, id);
    };

    for (const id of Object.keys(LAYOUTS)) {
      const layout = layoutFor(id);
      assert.ok(layout, id);
      const cells = plateOf({
        id,
        faction: id.split("-")[0],
        facing: "right",
        cols: layout.cols,
        rows: layout.rows,
        rooms: layout.rooms,
      });
      claim(id, cells);
      offFloor(cells, layout.rooms);
    }

    for (const cls of ENEMY_CLASSES) {
      const cells = plateOf({
        id: cls.id,
        faction: cls.faction,
        facing: "left",
        cols: 4,
        rows: 3,
        rooms: BLOCK,
      });
      claim(`block:${cls.id}`, cells);
      offFloor(cells, BLOCK);
    }

    const real = ENEMY_LAYOUTS["rebel-fighter"];
    const realCells = plateOf({
      id: "rebel-fighter",
      faction: "rebel",
      facing: "left",
      cols: real.cols,
      rows: real.rows,
      rooms: real.rooms,
    });
    assert.ok(realCells.length > 0);
    offFloor(realCells, real.rooms);

    for (const [id, layout] of [
      ["flagship-1", flagshipStage1],
      ["flagship-2", flagshipStage2],
      ["flagship-3", flagshipStage3],
    ] as const) {
      const cells = plateOf({
        id,
        faction: "rebel",
        facing: "left",
        cols: layout.cols,
        rows: layout.rows,
        rooms: layout.rooms,
      });
      claim(id, cells);
      offFloor(cells, layout.rooms);
    }
  });

  it("keeps one skin for both kestrels and a different plate", () => {
    const paint = factionPaint("kestrel");
    assert.equal(paint.skin, "#c8c2b4");
    const a = layoutFor("kestrel-a");
    const b = layoutFor("kestrel-b");
    assert.ok(a && b);
    const plateA = plateOf({ id: "kestrel-a", faction: "kestrel", facing: "right", cols: a.cols, rows: a.rows, rooms: a.rooms });
    const plateB = plateOf({ id: "kestrel-b", faction: "kestrel", facing: "right", cols: b.cols, rows: b.rows, rooms: b.rooms });
    assert.equal(factionPaint("kestrel").skin, paint.skin);
    assert.notEqual(sig(plateA), sig(plateB));
  });

  it("paints rebel and zoltan with different skins", () => {
    const rebel = ENEMY_CLASSES.find((row) => row.faction === "rebel");
    const zoltan = ENEMY_CLASSES.find((row) => row.faction === "zoltan");
    assert.ok(rebel && zoltan);
    assert.notEqual(factionPaint(rebel.faction).skin, factionPaint(zoltan.faction).skin);
    assert.equal(factionPaint("federation").skin, factionPaint("fed").skin);
    assert.equal(factionPaint("unknown").skin, factionPaint("rebel").skin);
  });

  it("adds a pirate mark the plain plate does not have", () => {
    const layout = layoutFor("kestrel-a");
    assert.ok(layout);
    const args = {
      id: "kestrel-a",
      faction: "kestrel",
      facing: "right" as const,
      cols: layout.cols,
      rows: layout.rows,
      rooms: layout.rooms,
    };
    const plain = plateOf(args);
    const pirate = plateOf({ ...args, pirate: true });
    const plainMarks = new Set(plain.filter((c) => c.ink === "mark").map((c) => `${c.x},${c.y}`));
    assert.ok(pirate.some((c) => c.ink === "mark" && !plainMarks.has(`${c.x},${c.y}`)));
    offFloor(pirate, layout.rooms);
  });
});
