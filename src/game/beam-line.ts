import { cellOccupied } from "./layouts.ts";
import type { BeamPoint } from "./types.ts";

/**
 * A hull the swipe can cross. Only the floor grid is read.
 * Beam (Weapons), "Beam targeting and damage mechanics": damage lands the first
 * moment the beam enters a room, and a tiny edge of that room is enough.
 */
export type BeamGrid = {
  rooms: { id: string; x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] }[];
  cols: number;
  rows: number;
};

/** Centre of a room, kept inside its own cells. */
export function roomCenter(room: { x: number; y: number; w: number; h: number }): BeamPoint {
  return {
    x: Math.min(room.x + room.w / 2, room.x + room.w - 1e-6),
    y: Math.min(room.y + room.h / 2, room.y + room.h - 1e-6),
  };
}

/** Click fraction inside a room's box, as a tile-space point. The far edge stays in the last cell. */
export function pointInRoom(
  room: { x: number; y: number; w: number; h: number },
  fracX: number,
  fracY: number,
): BeamPoint {
  const fx = Math.min(1, Math.max(0, fracX));
  const fy = Math.min(1, Math.max(0, fracY));
  return {
    x: room.x + Math.min(fx * room.w, Math.max(0, room.w - 1e-6)),
    y: room.y + Math.min(fy * room.h, Math.max(0, room.h - 1e-6)),
  };
}

/**
 * Integer cells the segment crosses, in the same order as the walk inside
 * roomsOnSegment, including the two side cells when it passes through a grid corner.
 * A cell is listed once. A step outside the grid is not a cell.
 */
export function cellsOnSegment(ship: BeamGrid, a: BeamPoint, b: BeamPoint): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const seen = new Set<string>();
  visitSegment(ship, a, b, (ix, iy) => {
    const key = `${ix},${iy}`;
    if (seen.has(key)) return;
    seen.add(key);
    cells.push({ x: ix, y: iy });
  });
  return cells;
}

/**
 * Rooms whose floor the segment from `a` to `b` touches, in the order the beam
 * enters them. A room is listed once. An omitted cell is hull, not floor.
 * A segment that passes through a grid corner also counts the two side cells:
 * that corner is the tiny edge of those rooms.
 * Printed beam length does not shorten the segment.
 */
export function roomsOnSegment(ship: BeamGrid, a: BeamPoint, b: BeamPoint): string[] {
  const owner = new Map<string, string>();
  for (const room of ship.rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!cellOccupied(room, x, y)) continue;
        owner.set(`${x},${y}`, room.id);
      }
    }
  }

  const rooms: string[] = [];
  const seen = new Set<string>();
  visitSegment(ship, a, b, (ix, iy) => {
    const id = owner.get(`${ix},${iy}`);
    if (!id || seen.has(id)) return;
    seen.add(id);
    rooms.push(id);
  });
  return rooms;
}

/** The grid walk roomsOnSegment and cellsOnSegment share. Bounds stay here so both see the same cells. */
function visitSegment(
  ship: BeamGrid,
  a: BeamPoint,
  b: BeamPoint,
  visit: (ix: number, iy: number) => void,
): void {
  const add = (ix: number, iy: number) => {
    if (ix < 0 || iy < 0 || ix >= ship.cols || iy >= ship.rows) return;
    visit(ix, iy);
  };

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let ix = Math.floor(a.x);
  let iy = Math.floor(a.y);
  if (a.x === ship.cols) ix = ship.cols - 1;
  if (a.y === ship.rows) iy = ship.rows - 1;

  if (!(Math.abs(dx) > 1e-12) && !(Math.abs(dy) > 1e-12)) {
    add(ix, iy);
    return;
  }

  const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const tDeltaX = stepX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dx);
  const tDeltaY = stepY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / dy);
  let tMaxX = stepX === 0 ? Number.POSITIVE_INFINITY : ((stepX > 0 ? ix + 1 : ix) - a.x) / dx;
  let tMaxY = stepY === 0 ? Number.POSITIVE_INFINITY : ((stepY > 0 ? iy + 1 : iy) - a.y) / dy;

  const limit = (ship.cols + ship.rows + 2) * 3;
  for (let n = 0; n < limit; n++) {
    add(ix, iy);
    if (tMaxX > 1 + 1e-9 && tMaxY > 1 + 1e-9) break;
    if (tMaxX < tMaxY - 1e-9) {
      if (tMaxX > 1 + 1e-9) break;
      ix += stepX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxX - 1e-9) {
      if (tMaxY > 1 + 1e-9) break;
      iy += stepY;
      tMaxY += tDeltaY;
    } else {
      if (tMaxX > 1 + 1e-9) break;
      add(ix + stepX, iy);
      add(ix, iy + stepY);
      ix += stepX;
      iy += stepY;
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
    }
  }
}
