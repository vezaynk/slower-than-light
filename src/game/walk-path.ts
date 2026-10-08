import type { DoorMark, DoorSide } from "./types.ts";

/**
 * Cells a walking sprite crosses inside the rooms the sim already chose.
 * One hop still lasts the sim's room time. The line follows door tiles
 * from the standing cell, or from the doorway just used, and ends on the
 * destination's standing cell on the last hop.
 */

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

/** Floor tile closest to where a standing crew token sits, bottom center. Lower x, then lower y, breaks a tie. */
export function standCell(room: WalkRoom): WalkCell | null {
  let best: WalkCell | null = null;
  let bestD = Infinity;
  const tx = room.x + room.w / 2;
  const ty = room.y + room.h - 0.5;
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (room.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
      const d = (x + 0.5 - tx) ** 2 + (y + 0.5 - ty) ** 2;
      const closer = d < bestD - 1e-9;
      const tie =
        Math.abs(d - bestD) <= 1e-9 && best !== null && (x < best.x || (x === best.x && y < best.y));
      if (closer || tie || best === null) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
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

function startKey(own: Map<string, string>, room: WalkRoom, via?: string): string | null {
  if (via && /^-?\d+,-?\d+$/.test(via) && own.get(via) === room.id) return via;
  const stand = standCell(room);
  return stand ? key(stand.x, stand.y) : null;
}

/** Tiles of this hop, including the doorway and the destination stand on the last room. */
export function walkCells(ship: WalkShip, roomId: string, path: string[], via?: string): WalkCell[] | null {
  if (!path.length) return null;
  const own = owners(ship);
  const byId = new Map(ship.rooms.map((room) => [room.id, room]));
  const current = byId.get(roomId);
  const next = byId.get(path[0]);
  const last = byId.get(path[path.length - 1]);
  if (!current || !next || !last) return null;
  const stand = standCell(last);
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

function sample(cells: WalkCell[], move: number): { x: number; y: number } {
  if (cells.length === 1) return { x: cells[0].x + 0.5, y: cells[0].y + 0.5 };
  const distAlong = clamp01(move) * (cells.length - 1);
  const i = Math.min(cells.length - 2, Math.floor(distAlong));
  const f = distAlong - i;
  const a = cells[i];
  const b = cells[i + 1];
  return { x: a.x + 0.5 + (b.x - a.x) * f, y: a.y + 0.5 + (b.y - a.y) * f };
}

/** Point in tile space (cell centers are x+0.5, y+0.5). `move` is the sim's 0..1 hop clock. */
export function walkPoint(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via: string | undefined,
  move: number,
): { x: number; y: number } | null {
  const cells = walkCells(ship, roomId, path, via);
  if (!cells?.length) return null;
  return sample(cells, move);
}

/** Landing tile of the current hop. The walker stores it so the next room starts on the same cell. */
export function hopLanding(ship: WalkShip, roomId: string, path: string[], via?: string): WalkCell | null {
  const cells = walkCells(ship, roomId, path, via);
  if (!cells?.length) return null;
  return cells[cells.length - 1];
}

export function walkPose(
  ship: WalkShip,
  roomId: string,
  path: string[],
  via: string | undefined,
  move: number,
): { x: number; y: number; faceLeft: boolean } | null {
  const cells = walkCells(ship, roomId, path, via);
  if (!cells?.length) return null;
  const at = sample(cells, move);
  const steps = cells.length - 1;
  const along = clamp01(move) * steps;
  const begin = Math.min(cells.length - 1, Math.ceil(along - 1e-6));
  for (let i = begin; i < cells.length; i++) {
    const cx = cells[i].x + 0.5;
    if (cx < at.x - 0.01) return { ...at, faceLeft: true };
    if (cx > at.x + 0.01) return { ...at, faceLeft: false };
  }
  return { ...at, faceLeft: false };
}
