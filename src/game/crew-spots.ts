/**
 * Floor tiles crew stand on, medbay and clone-bay spot caps, and teleporter pads.
 * No sim import: sling and the combat tick both call this.
 */

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
  system?: string | null;
  kit?: string;
};

export function floorCells(room: Box): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (room.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

export function tileCount(room: { w: number; h: number; omit?: unknown[] }): number {
  return room.w * room.h - (room.omit?.length ?? 0);
}

/** Teleporter pads, one per floor tile, row by row. */
export function padCells(room: Box): string[] {
  return floorCells(room).map((cell) => `${cell.x},${cell.y}`);
}

/** First pad not already taken. Null when every pad is spoken for. */
export function claimPadTile(room: Box, taken: ReadonlySet<string>): string | null {
  for (const key of padCells(room)) {
    if (!taken.has(key)) return key;
  }
  return null;
}

/** Bottom row first, then the left of that row. The front of the room stands here. */
export function standCells(room: Box): { x: number; y: number }[] {
  return floorCells(room).sort((a, b) => b.y - a.y || a.x - b.x);
}

export function interiorLinks(doors: { a: string; b: string | "void" }[], roomId: string): number {
  const ids = new Set<string>();
  for (const door of doors) {
    if (door.b === "void") continue;
    if (door.a === roomId) ids.add(door.b);
    else if (door.b === roomId) ids.add(door.a);
  }
  return ids.size;
}

/**
 * Standing spots in a medbay or clone bay.
 * Medbay: player 2 when the room has two tiles or fewer, otherwise 3.
 * Enemy medbay: 2 or 4 the same way.
 * Clone bay (kit "cradle", and not still the medbay): player 1 or 3, enemy 2 or 4.
 * Stealth B and Rock C: the medbay "is positioned in a dead-end corner and has 2 standing spots."
 * INFERRED: one interior door is that dead-end, so a player medbay with a single neighbor stays at 2
 * even when the tile count would allow 3.
 */
export function medicalLimit(room: Box, side: "player" | "enemy", interiorDoors: number): number {
  const tiles = tileCount(room);
  if (room.system === "medbay") {
    if (side === "player") {
      if (interiorDoors <= 1) return 2;
      return tiles <= 2 ? 2 : 3;
    }
    return tiles <= 2 ? 2 : 4;
  }
  if (side === "player") return tiles <= 2 ? 1 : 3;
  return tiles <= 2 ? 2 : 4;
}

export type StandSpot = { x: number; y: number; stack: number };

/** Idle crew in one room. A pad tile wins over the file order. Overflow stacks on the last tile. */
export function assignStands(
  room: Box,
  crew: { id: string; file?: number; pad?: string }[],
): Map<string, StandSpot> {
  const slots = standCells(room);
  const pads = new Set(padCells(room));
  const ordered = crew
    .slice()
    .sort((a, b) => (a.file ?? 0) - (b.file ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const used = new Map<string, number>();
  const out = new Map<string, StandSpot>();
  let next = 0;
  for (const c of ordered) {
    let cell: { x: number; y: number } | null = null;
    if (c.pad && pads.has(c.pad)) {
      const [xs, ys] = c.pad.split(",");
      cell = { x: Number(xs), y: Number(ys) };
    } else if (slots.length) {
      cell = slots[Math.min(next, slots.length - 1)]!;
      if (next < slots.length) next += 1;
    }
    if (!cell) continue;
    const key = `${cell.x},${cell.y}`;
    const stack = used.get(key) ?? 0;
    used.set(key, stack + 1);
    out.set(c.id, { x: cell.x, y: cell.y, stack });
  }
  return out;
}
