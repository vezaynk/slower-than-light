import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { factionPaint, plateOf, type HullCell } from "./hull-plate.ts";
import { playerHulls } from "@stl/sim/hulls.ts";
import { layoutFor } from "@stl/sim/layouts.ts";
import "@stl/sim/pack/base.ts";
import { hullDef, shipAllegiance } from "@stl/pack";
import { enemyHulls } from "@stl/sim/enemy-gen.ts";
import { flagshipLayout } from "@stl/sim/wiki/flagship-layout.ts";

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
  for (const cell of cells)
    assert.equal(floor.has(`${cell.x},${cell.y}`), false, `${cell.x},${cell.y}`);
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

    for (const hull of playerHulls()) {
      const id = hull.id;
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

    for (const hull of enemyHulls()) {
      const cells = plateOf({
        id: hull.id,
        faction: shipAllegiance(hull.id).faction ?? "rebel",
        facing: "left",
        cols: 4,
        rows: 3,
        rooms: BLOCK,
      });
      claim(`block:${hull.id}`, cells);
      offFloor(cells, BLOCK);
    }

    // The archive blueprint's own room grid.
    const grid = hullDef("REBEL_SKINNY")?.grid;
    assert.ok(grid);
    const gridRooms = grid.rooms.map(({ x, y, w, h }) => ({ x, y, w, h, system: null }));
    const real = {
      cols: grid.cols ?? Math.max(...gridRooms.map((room) => room.x + room.w)),
      rows: grid.rows ?? Math.max(...gridRooms.map((room) => room.y + room.h)),
      rooms: gridRooms,
    };
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
      ["flagship-1", flagshipLayout(1, "normal")],
      ["flagship-2", flagshipLayout(2, "normal")],
      ["flagship-3", flagshipLayout(3, "normal")],
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
    const a = layoutFor("PLAYER_SHIP_HARD");
    const b = layoutFor("PLAYER_SHIP_HARD_2");
    assert.ok(a && b);
    const plateA = plateOf({
      id: "PLAYER_SHIP_HARD",
      faction: "kestrel",
      facing: "right",
      cols: a.cols,
      rows: a.rows,
      rooms: a.rooms,
    });
    const plateB = plateOf({
      id: "PLAYER_SHIP_HARD_2",
      faction: "kestrel",
      facing: "right",
      cols: b.cols,
      rows: b.rows,
      rooms: b.rooms,
    });
    assert.equal(factionPaint("kestrel").skin, paint.skin);
    assert.notEqual(sig(plateA), sig(plateB));
  });

  it("paints rebel and zoltan with different skins", () => {
    assert.notEqual(factionPaint("rebel").skin, factionPaint("zoltan").skin);
    assert.equal(factionPaint("federation").skin, factionPaint("fed").skin);
    assert.equal(factionPaint("unknown").skin, factionPaint("rebel").skin);
  });

  it("adds a pirate mark the plain plate does not have", () => {
    const layout = layoutFor("PLAYER_SHIP_HARD");
    assert.ok(layout);
    const args = {
      id: "PLAYER_SHIP_HARD",
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
