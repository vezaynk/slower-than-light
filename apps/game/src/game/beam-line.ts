import { cellOccupied } from "./layouts.ts";
import type { BeamPoint } from "./types.ts";

/**
 * A hull the swipe can cross. Only the floor grid is read.
 * Beam (Weapons), "Beam targeting and damage mechanics": damage lands the first
 * moment the beam enters a room, and a tiny edge of that room is enough.
 */
export type BeamGrid = {
  rooms: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    omit?: { x: number; y: number }[];
  }[];
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

const CELL_EDGE = 1e-4;

/** Occupied floor cells. An omitted cell is hull, not a place a shot can land. */
export function targetableCells(ship: BeamGrid): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (const room of ship.rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cellOccupied(room, x, y)) cells.push({ x, y });
      }
    }
  }
  return cells;
}

/** Inclusive slider range over the targetable cells. The far edge stays inside the last cell. */
export function targetableSpan(
  ship: BeamGrid,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const cells = targetableCells(ship);
  if (!cells.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x + 1 - CELL_EDGE);
    maxY = Math.max(maxY, cell.y + 1 - CELL_EDGE);
  }
  return { minX, minY, maxX, maxY };
}

/** The room whose floor contains the point, or null when the point is hull or outside the grid. */
export function roomAtPoint(ship: BeamGrid, point: BeamPoint): string | null {
  const ix = Math.floor(point.x);
  const iy = Math.floor(point.y);
  for (const room of ship.rooms) {
    if (cellOccupied(room, ix, iy)) return room.id;
  }
  return null;
}

/**
 * Pull a point back onto targetable floor. Inside a room it stays put.
 * A point past the rooms, or on hull between them, snaps to the nearest occupied cell.
 */
export function clampTargetPoint(ship: BeamGrid, point: BeamPoint): BeamPoint | null {
  const span = targetableSpan(ship);
  const cells = targetableCells(ship);
  if (!span || !cells.length) return null;
  const x = Math.min(span.maxX, Math.max(span.minX, point.x));
  const y = Math.min(span.maxY, Math.max(span.minY, point.y));
  if (roomAtPoint(ship, { x, y })) return { x, y };
  let best = cells[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  let bestX = best.x;
  let bestY = best.y;
  for (const cell of cells) {
    const cx = Math.min(cell.x + 1 - CELL_EDGE, Math.max(cell.x, x));
    const cy = Math.min(cell.y + 1 - CELL_EDGE, Math.max(cell.y, y));
    const d = (cx - x) ** 2 + (cy - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = cell;
      bestX = cx;
      bestY = cy;
    }
  }
  return { x: bestX, y: bestY };
}

/**
 * Beam end: stay on targetable floor, and do not run past the printed tile length.
 * A snap back onto a room that would stretch the swipe keeps the clipped point instead.
 */
export function clampBeamEnd(
  ship: BeamGrid,
  start: BeamPoint,
  toward: BeamPoint,
  tiles: number | null,
): BeamPoint | null {
  const a = clampTargetPoint(ship, start);
  const b = clampTargetPoint(ship, toward);
  if (!a || !b) return null;
  if (tiles == null || !(tiles > 0)) return b;
  const clipped = clipBeamEnd(a, b, tiles);
  if (roomAtPoint(ship, clipped)) return clipped;
  const stayed = clampTargetPoint(ship, clipped);
  if (!stayed) return clipped;
  if (Math.hypot(stayed.x - a.x, stayed.y - a.y) > tiles + 1e-6) return clipped;
  return stayed;
}

/**
 * Integer cells the segment crosses, in the same order as the walk inside
 * roomsOnSegment, including the two side cells when it passes through a grid corner.
 * A cell is listed once. A step outside the grid is not a cell.
 */
export function cellsOnSegment(
  ship: BeamGrid,
  a: BeamPoint,
  b: BeamPoint,
): { x: number; y: number }[] {
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
 * The caller shortens a longer swipe to the printed tile length before this walk.
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

/**
 * Beam (Weapons): each row prints a length as "N (X tiles diagonally)".
 * X is the tile length. A second click farther than that stops on the way there.
 * A closer click is the end. This does not stretch a short swipe out to X.
 */
/**
 * The stroke while a beam is firing. The leading edge travels from `a` to `b` as `t` goes from 0 to 1.
 * The stroke stays `length` long and trails behind that edge, so the beam is long for the whole swipe.
 */
export function beamStroke(
  a: BeamPoint,
  b: BeamPoint,
  t: number,
  length: number,
): { tail: BeamPoint; head: BeamPoint } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = Math.hypot(dx, dy);
  const ux = span > 1e-4 ? dx / span : 1;
  const uy = span > 1e-4 ? dy / span : 0;
  const k = Math.min(1, Math.max(0, t));
  const head = { x: a.x + dx * k, y: a.y + dy * k };
  const len = Math.max(0, length);
  return { tail: { x: head.x - ux * len, y: head.y - uy * len }, head };
}

export function clipBeamEnd(a: BeamPoint, toward: BeamPoint, tiles: number): BeamPoint {
  const dx = toward.x - a.x;
  const dy = toward.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (!(tiles > 0) || !(dist > tiles)) return { x: toward.x, y: toward.y };
  const scale = tiles / dist;
  return { x: a.x + dx * scale, y: a.y + dy * scale };
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
