import { standCells } from "./crew-spots.ts";
import type { DoorMark, DoorSide } from "./types.ts";

/**
 * Cells a walking sprite crosses inside the rooms the sim already chose.
 * One floor tile takes TILE_WALK_S, including tiles inside a room and the
 * step through a doorway. The line follows door tiles from the standing
 * cell, or from the doorway just used, and ends on the destination's
 * at-rest tile on the last hop.
 */

/** INFERRED: one floor tile at movement ×1. Race movement multiplies this. */
export const TILE_WALK_S = 0.6;

export type WalkRoom = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type WalkShip = {
  rooms: WalkRoom[];
  cols: number;
  rows: number;
  doors: { a: string; b: string | "void" }[];
  doorMarks?: DoorMark[];
};

export type WalkCell = { x: number; y: number };

const STEP: Record<DoorSide, [number, number]> = {
  n: [0, -1],
  e: [1, 0],
  s: [0, 1],
  w: [-1, 0],
};

function key(x: number, y: number) {
  return `${x},${y}`;
}

function parse(k: string): WalkCell {
  const [x, y] = k.split(",").map(Number);
  return { x, y };
}

function owners(ship: WalkShip): Map<string, string> {
  const at = new Map<string, string>();
  for (const r of ship.rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (r.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
        at.set(key(x, y), r.id);
      }
    }
  }
  return at;
}

/** Front at-rest tile: the bottom row, then the left side. A lone crew member stands here. */
export function standCell(room: WalkRoom): WalkCell | null {
  return standCells(room)[0] ?? null;
}

function onFloor(room: WalkRoom, cell: WalkCell): boolean {
  if (cell.x < room.x || cell.y < room.y || cell.x >= room.x + room.w || cell.y >= room.y + room.h) return false;
  return !room.omit?.some((omit) => omit.x === cell.x && omit.y === cell.y);
}

function doorPairs(ship: WalkShip): Set<string> {
  const pairs = new Set<string>();
  for (const door of ship.doors) {
    if (door.b === "void") continue;
    pairs.add(door.a < door.b ? `${door.a}|${door.b}` : `${door.b}|${door.a}`);
  }
  return pairs;
}

function markEdges(ship: WalkShip, own: Map<string, string>): Set<string> | null {
  if (!ship.doorMarks?.length) return null;
  const edges = new Set<string>();
  for (const mark of ship.doorMarks) {
    const [dx, dy] = STEP[mark.side];
    const nx = mark.x + dx;
    const ny = mark.y + dy;
    const here = own.get(key(mark.x, mark.y));
    const there = own.get(key(nx, ny));
    if (!here || !there || here === there) continue;
    const lo = mark.y < ny || (mark.y === ny && mark.x < nx);
    edges.add(lo ? `${mark.x},${mark.y}|${nx},${ny}` : `${nx},${ny}|${mark.x},${mark.y}`);
  }
  return edges;
}

/** 4-connected tiles. A room change is allowed only between consecutive rooms, and only through a real door. */
function chainAdj(ship: WalkShip, own: Map<string, string>, sequence: string[]): Map<string, string[]> {
  const index = new Map<string, number>();
  sequence.forEach((id, i) => {
    if (!index.has(id)) index.set(id, i);
  });
  const marks = markEdges(ship, own);
  const pairs = marks ? null : doorPairs(ship);
  const adj = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = adj.get(a);
    if (list) list.push(b);
    else adj.set(a, [b]);
  };
  for (const [cell, room] of own) {
    const ia = index.get(room);
    if (ia == null) continue;
    const [xs, ys] = cell.split(",");
    const x = Number(xs);
    const y = Number(ys);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const next = key(nx, ny);
      const other = own.get(next);
      if (!other) continue;
      const ib = index.get(other);
      if (ib == null) continue;
      if (other !== room) {
        if (Math.abs(ia - ib) !== 1) continue;
        if (marks) {
          if (!marks.has(`${x},${y}|${nx},${ny}`)) continue;
        } else if (!pairs?.has(room < other ? `${room}|${other}` : `${other}|${room}`)) continue;
      }
      add(cell, next);
      add(next, cell);
    }
  }
  return adj;
}

function bfs(adj: Map<string, string[]>, start: string, goal: string): string[] | null {
  if (start === goal) return [start];
  const prev = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const at = queue.shift()!;
    const next = (adj.get(at) ?? []).slice().sort((a, b) => {
      const pa = parse(a);
      const pb = parse(b);
      return pa.y - pb.y || pa.x - pb.x;
    });
    for (const n of next) {
      if (prev.has(n)) continue;
      prev.set(n, at);
      if (n === goal) {
        const path = [n];
        let w: string | null = at;
        while (w) {
          path.push(w);
          w = prev.get(w) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

function dist(adj: Map<string, string[]>, start: string, goal: string): number {
  const path = bfs(adj, start, goal);
  return path ? path.length - 1 : Infinity;
}

function entries(adj: Map<string, string[]>, own: Map<string, string>, into: string, from: string): string[] {
  const found: string[] = [];
  for (const [cell, room] of own) {
    if (room !== into) continue;
    if ((adj.get(cell) ?? []).some((n) => own.get(n) === from)) found.push(cell);
  }
  return found;
}

function prefer(a: string, b: string): string {
  const pa = parse(a);
  const pb = parse(b);
  if (pa.x !== pb.x) return pa.x < pb.x ? a : b;
  return pa.y <= pb.y ? a : b;
}

/** "x,y" or "x,y@px,py" — the cell, then the exact point when a walk was redirected mid-tile. */
function viaCellKey(via?: string): string | null {
  if (!via) return null;
  const cell = via.split("@", 1)[0]!;
  return /^-?\d+,-?\d+$/.test(cell) ? cell : null;
}

function viaSeam(via?: string): { x: number; y: number } | null {
  if (!via) return null;
  const at = via.indexOf("@");
  if (at < 0) return null;
  const [xs, ys] = via.slice(at + 1).split(",");
  const x = Number(xs);
  const y = Number(ys);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function startKey(own: Map<string, string>, room: WalkRoom, via?: string): string | null {
  const cell = viaCellKey(via);
  if (cell && own.get(cell) === room.id) return cell;
  const stand = standCell(room);
  return stand ? key(stand.x, stand.y) : null;
}

/** Tiles of this hop, including the doorway and the destination stand on the last room. */
export function walkCells(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via?: string,
  goal?: WalkCell,
): WalkCell[] | null {
  if (!path.length) return null;
  const own = owners(ship);
  const byId = new Map(ship.rooms.map((room) => [room.id, room]));
  const current = byId.get(roomId);
  const next = byId.get(path[0]);
  const last = byId.get(path[path.length - 1]);
  if (!current || !next || !last) return null;
  const stand = goal && onFloor(last, goal) ? goal : standCell(last);
  const from = startKey(own, current, via);
  if (!stand || !from) return null;
  const finalKey = key(stand.x, stand.y);
  const rooms = [roomId, ...path];
  const hop = chainAdj(ship, own, [roomId, path[0]]);
  const doors = entries(hop, own, path[0], roomId);
  if (!doors.length) return null;
  const rest = chainAdj(ship, own, path);
  let chosen = doors[0];
  let best = Infinity;
  for (const door of doors) {
    const across = dist(hop, from, door);
    const after = dist(rest, door, finalKey);
    if (across === Infinity || after === Infinity) continue;
    const cost = across + after;
    if (cost < best || (cost === best && prefer(door, chosen) === door)) {
      best = cost;
      chosen = door;
    }
  }
  if (best === Infinity) return null;
  const head = bfs(hop, from, chosen);
  if (!head) return null;
  if (path.length === 1 && chosen !== finalKey) {
    const tail = bfs(rest, chosen, finalKey);
    if (!tail) return null;
    return head.concat(tail.slice(1)).map(parse);
  }
  return head.map(parse);
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Tile-to-tile steps in this hop. A missing path still costs one tile. A mid-tile resume uses the remaining distance. */
export function hopSteps(cells: WalkCell[] | null, via?: string): number {
  const seam = viaSeam(via);
  if (!seam) {
    if (!cells || cells.length < 2) return 1;
    return cells.length - 1;
  }
  if (!cells?.length) return 1;
  const pts = seamTrack(cells, seam);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
  return Math.max(len, 1e-4);
}

function sample(cells: WalkCell[], move: number): { x: number; y: number } {
  if (cells.length === 1) return { x: cells[0]!.x + 0.5, y: cells[0]!.y + 0.5 };
  const distAlong = clamp01(move) * (cells.length - 1);
  const i = Math.min(cells.length - 2, Math.floor(distAlong));
  const f = distAlong - i;
  const a = cells[i]!;
  const b = cells[i + 1]!;
  return { x: a.x + 0.5 + (b.x - a.x) * f, y: a.y + 0.5 + (b.y - a.y) * f };
}

/** Seam first, then every cell center after the anchor. A one-cell hop still ends on that cell's center. */
function seamTrack(cells: WalkCell[], seam: { x: number; y: number }): { x: number; y: number }[] {
  const rest = cells.slice(1).map((cell) => ({ x: cell.x + 0.5, y: cell.y + 0.5 }));
  if (rest.length) return [seam, ...rest];
  const end = { x: cells[0]!.x + 0.5, y: cells[0]!.y + 0.5 };
  if (Math.hypot(seam.x - end.x, seam.y - end.y) < 1e-3) return [seam];
  return [seam, end];
}

function sampleSeam(cells: WalkCell[], move: number, seam: { x: number; y: number }): { x: number; y: number } {
  const pts = seamTrack(cells, seam);
  if (pts.length === 1) return pts[0]!;
  let total = 0;
  const seg: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    seg.push(d);
    total += d;
  }
  if (total <= 1e-6) return pts[pts.length - 1]!;
  let left = clamp01(move) * total;
  for (let i = 0; i < seg.length; i++) {
    const d = seg[i]!;
    if (left <= d || i === seg.length - 1) {
      const f = d <= 1e-6 ? 1 : Math.min(1, left / d);
      const a = pts[i]!;
      const b = pts[i + 1]!;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    }
    left -= d;
  }
  return pts[pts.length - 1]!;
}

/**
 * Paint clock for the last hop. The sim clears the path on the tick `move` hits 1,
 * and the ship redraws about every 80ms, so that exact pose is never shown.
 * The sprite finishes 0.28 of one tile early and holds the stand. That slice
 * does not grow with the tiles inside the room.
 */
export function arriveMove(move: number, steps = 1): number {
  const hold = 0.28 / Math.max(1, steps);
  return Math.min(1, clamp01(move) / (1 - hold));
}

/** Point in tile space (cell centers are x+0.5, y+0.5). `move` is the sim's 0..1 hop clock. */
export function walkPoint(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via: string | undefined,
  move: number,
  goal?: WalkCell,
): { x: number; y: number } | null {
  const cells = walkCells(ship, roomId, path, via, goal);
  if (!cells?.length) return null;
  const seam = viaSeam(via);
  return seam ? sampleSeam(cells, move, seam) : sample(cells, move);
}

/**
 * Where a walker is, so a new order can leave from that point.
 * `room` is the floor under the painted point when that room is this hop, otherwise the current room.
 * `via` is "x,y" or "x,y@px,py" when the point is not that cell's center.
 */
export function footVia(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via: string | undefined,
  move: number,
  goal?: WalkCell,
): { room: string; via: string } | null {
  if (!path.length) return null;
  const cells = walkCells(ship, roomId, path, via, goal);
  if (!cells?.length) return null;
  const own = owners(ship);
  const steps = hopSteps(cells, via);
  const t = path.length === 1 ? arriveMove(move, steps) : clamp01(move);
  const seam = viaSeam(via);
  const point = seam ? sampleSeam(cells, t, seam) : sample(cells, t);
  const fx = Math.floor(point.x);
  const fy = Math.floor(point.y);
  const paintedRoom = own.get(key(fx, fy));
  const onHop = paintedRoom === roomId || path.includes(paintedRoom ?? "");
  let cell: WalkCell | null = onHop && paintedRoom ? { x: fx, y: fy } : null;
  if (!cell) {
    let best = Infinity;
    for (const candidate of cells) {
      if (own.get(key(candidate.x, candidate.y)) !== roomId) continue;
      const d = Math.hypot(candidate.x + 0.5 - point.x, candidate.y + 0.5 - point.y);
      if (d < best) {
        best = d;
        cell = candidate;
      }
    }
  }
  if (!cell) return null;
  const room = own.get(key(cell.x, cell.y)) ?? roomId;
  const centerX = cell.x + 0.5;
  const centerY = cell.y + 0.5;
  const stamp = key(cell.x, cell.y);
  if (Math.hypot(point.x - centerX, point.y - centerY) < 1e-3) return { room, via: stamp };
  return { room, via: `${stamp}@${point.x.toFixed(4)},${point.y.toFixed(4)}` };
}

/** Landing tile of the current hop. The walker stores it so the next room starts on the same cell. */
export function hopLanding(ship: WalkShip, roomId: string, path: string[], via?: string, goal?: WalkCell): WalkCell | null {
  const cells = walkCells(ship, roomId, path, via, goal);
  if (!cells?.length) return null;
  return cells[cells.length - 1];
}

export function walkPose(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via: string | undefined,
  move: number,
  goal?: WalkCell,
): { x: number; y: number; faceLeft: boolean } | null {
  const cells = walkCells(ship, roomId, path, via, goal);
  if (!cells?.length) return null;
  const seam = viaSeam(via);
  const at = seam ? sampleSeam(cells, move, seam) : sample(cells, move);
  if (seam) {
    const ahead = sampleSeam(cells, Math.min(1, clamp01(move) + 1e-3), seam);
    if (ahead.x < at.x - 0.01) return { ...at, faceLeft: true };
    if (ahead.x > at.x + 0.01) return { ...at, faceLeft: false };
  }
  const steps = cells.length - 1;
  const along = clamp01(move) * steps;
  const begin = Math.min(cells.length - 1, Math.ceil(along - 1e-6));
  for (let i = begin; i < cells.length; i++) {
    const cx = cells[i]!.x + 0.5;
    if (cx < at.x - 0.01) return { ...at, faceLeft: true };
    if (cx > at.x + 0.01) return { ...at, faceLeft: false };
  }
  if (cells.length >= 2) {
    const prev = cells[cells.length - 2]!;
    const last = cells[cells.length - 1]!;
    if (prev.x !== last.x) return { ...at, faceLeft: prev.x > last.x };
  }
  return { ...at, faceLeft: false };
}
