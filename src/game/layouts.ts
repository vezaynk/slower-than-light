import type { Door, DoorMark, DoorSide, KitId, Room, Ship, SysId } from "./types.ts";

/**
 * Interior tiles. Each cell is one square, the same unit on every hull.
 * Player hulls are traced from the wiki's hangar pictures (`*Systems.png`, one per cruiser layout): every room, every
 * orange or grey door bar, and the room under every system icon. A dark icon is an installed system. A pale icon marks
 * the room the hull keeps for a system it can buy (Systems: "Each system occupies one predetermined room").
 * Square counts are the picture's cell total; cruiser pages do not state them.
 * Layouts without marks still use the older inferred strip. The wiki pictures were not copied.
 */

export type TileRoom = {
  id: string;
  title: string;
  system: SysId | null;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cells inside the box that the picture leaves as hull. */
  omit?: { x: number; y: number }[];
  /** Subsystem kit seated here (seatLayout). Absent on the raw traced layouts. */
  kit?: KitId;
};

export type Layout = {
  cols: number;
  rows: number;
  rooms: TileRoom[];
  /**
   * Orange bars traced on the hangar picture. Absent on a layout that was not traced:
   * those still connect every shared edge.
   */
  marks?: DoorMark[];
};

type Raw = [string, string, SysId | null, number, number, number, number];
type Bar = [number, number, DoorSide];

/** Square totals below are the traced cell count. Cruiser pages do not state a square count. */
function traced(rows: Raw[], bars: Bar[], cols: number, gridRows: number): Layout {
  return {
    ...pack(rows, cols, gridRows),
    marks: bars.map(([x, y, side]) => ({ x, y, side })),
  };
}

/** Callers keep the published square count. Positions in the rows are INFERRED because the wiki picture was not text. */
function pack(rows: Raw[], cols: number, gridRows: number): Layout {
  return {
    cols,
    rows: gridRows,
    rooms: rows.map(([id, title, system, x, y, w, h]) => ({ id, title, system, x, y, w, h })),
  };
}

/** Looks up a layout. Hangar square counts are the traced pictures, not a wiki sentence. */
export function layoutFor(id: string): Layout | undefined {
  return LAYOUTS[id];
}

/** Sums room squares. An omitted cell is hull, not a square. */
export function tileCount(layout: Layout): number {
  return layout.rooms.reduce((n, r) => n + r.w * r.h - (r.omit?.length ?? 0), 0);
}

export function cellOccupied(
  room: { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] },
  x: number,
  y: number,
): boolean {
  if (x < room.x || y < room.y || x >= room.x + room.w || y >= room.y + room.h) return false;
  return !room.omit?.some((cell) => cell.x === x && cell.y === y);
}

/** Outline of a room that is not a filled rectangle, in CSS polygon form. */
export function roomClip(room: {
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
}): string | undefined {
  if (!room.omit?.length) return undefined;
  const on = new Set<string>();
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) on.add(`${x},${y}`);
    }
  }
  const next = new Map<string, string>();
  const link = (ax: number, ay: number, bx: number, by: number) => next.set(`${ax},${ay}`, `${bx},${by}`);
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (!on.has(`${x},${y}`)) continue;
      const lx = x - room.x;
      const ly = y - room.y;
      if (!on.has(`${x},${y - 1}`)) link(lx, ly, lx + 1, ly);
      if (!on.has(`${x + 1},${y}`)) link(lx + 1, ly, lx + 1, ly + 1);
      if (!on.has(`${x},${y + 1}`)) link(lx + 1, ly + 1, lx, ly + 1);
      if (!on.has(`${x - 1},${y}`)) link(lx, ly + 1, lx, ly);
    }
  }
  const start = next.keys().next().value;
  if (!start) return undefined;
  const pts: string[] = [];
  let cur = start;
  const seen = new Set<string>();
  do {
    const [x, y] = cur.split(",").map(Number);
    pts.push(`${(x / room.w) * 100}% ${(y / room.h) * 100}%`);
    seen.add(cur);
    const step = next.get(cur);
    if (!step) break;
    cur = step;
  } while (cur !== start && !seen.has(cur));
  return `polygon(${pts.join(",")})`;
}

type Sized = {
  id: string;
  title: string;
  system: SysId | null;
  size: 2 | 4;
};

/**
 * Packs 2-square (2×1) and 4-square (2×2) rooms into a 4-row strip.
 * Square totals are the published comparison. Column positions are not the wiki picture.
 * Positions are INFERRED because the wiki picture was not text.
 */
export function columnLayout(rooms: Sized[]): Layout {
  const placed: TileRoom[] = [];
  let x = 0;
  let y = 0;
  for (const room of rooms) {
    const h = room.size === 4 ? 2 : 1;
    if (y + h > 4) {
      x += 2;
      y = 0;
    }
    placed.push({
      id: room.id,
      title: room.title,
      system: room.system,
      x,
      y,
      w: 2,
      h,
    });
    y += h;
  }
  return { cols: Math.max(2, x + 2), rows: 4, rooms: placed };
}

/** Pads halls and holds out to the published 2-square and 4-square counts. Those counts stay. Positions are INFERRED because the wiki picture was not text. */
function sized(rooms: Sized[], twos: number, fours: number): Layout {
  const out = rooms.slice();
  let t = out.filter((r) => r.size === 2).length;
  let f = out.filter((r) => r.size === 4).length;
  let n = 0;
  while (f < fours) {
    out.push({ id: `p-x${n}`, title: "Hold", system: null, size: 4 });
    f += 1;
    n += 1;
  }
  while (t < twos) {
    out.push({ id: `p-x${n}`, title: "Hall", system: null, size: 2 });
    t += 1;
    n += 1;
  }
  return columnLayout(out);
}

/** Shared system rooms, sized 2 or 4 so a published total can be kept. Positions are INFERRED because the wiki picture was not text. */
const core = (med: "Medbay" | "Clone Bay", medSys: SysId | null): Sized[] => [
  { id: "p-engines", title: "Engines", system: "engines", size: 4 },
  { id: "p-oxygen", title: "Oxygen", system: "oxygen", size: 2 },
  { id: "p-doors", title: "Doors", system: "doors", size: 2 },
  { id: "p-shields", title: "Shields", system: "shields", size: 4 },
  { id: "p-medbay", title: med, system: medSys, size: 4 },
  { id: "p-sensors", title: "Sensors", system: "sensors", size: 2 },
  { id: "p-weapons", title: "Weapons", system: "weapons", size: 4 },
  { id: "p-pilot", title: "Piloting", system: "pilot", size: 4 },
];

/** Each entry keeps its published square total. Cruiser pages do not state square counts, so the count is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text. */
/** Traced from `KestralASystems.png`, the Kestrel A hangar picture (The Kestrel): 48 squares, 17 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Backup Battery, Mind Control, Drones, Cloaking, Teleporter, Hacking. */
const kestrelA = traced(
  [
    ["p-kah0", "Hall", null, 6, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 1, 1, 2, 1],
    ["p-battery", "Backup Battery", null, 3, 1, 2, 1],
    ["p-mind", "Mind Control", null, 6, 1, 2, 2],
    ["p-medbay", "Medbay", "medbay", 8, 1, 2, 2],
    ["p-kah1", "Hall", null, 0, 2, 1, 2],
    ["p-engines", "Engines", "engines", 1, 2, 2, 2],
    ["p-weapons", "Weapons", "weapons", 4, 2, 2, 2],
    ["p-doors", "Doors", "doors", 10, 2, 2, 1],
    ["p-drones", "Drones", null, 12, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 14, 2, 1, 2],
    ["p-cloak", "Cloaking", null, 6, 3, 2, 2],
    ["p-shields", "Shields", "shields", 8, 3, 2, 2],
    ["p-sensors", "Sensors", "sensors", 10, 3, 2, 1],
    ["p-tele", "Teleporter", null, 1, 4, 2, 1],
    ["p-hack", "Hacking", null, 3, 4, 2, 1],
    ["p-kah2", "Hall", null, 6, 5, 2, 1],
  ],
  [
    [6, 0, "n"],
    [7, 0, "n"],
    [7, 0, "s"],
    [2, 1, "e"],
    [2, 1, "s"],
    [4, 1, "s"],
    [7, 1, "e"],
    [0, 2, "e"],
    [0, 2, "w"],
    [5, 2, "e"],
    [8, 2, "s"],
    [9, 2, "e"],
    [11, 2, "e"],
    [0, 3, "e"],
    [0, 3, "w"],
    [2, 3, "s"],
    [4, 3, "s"],
    [5, 3, "e"],
    [9, 3, "e"],
    [11, 3, "e"],
    [13, 3, "e"],
    [2, 4, "e"],
    [7, 4, "e"],
    [7, 4, "s"],
    [6, 5, "s"],
    [7, 5, "s"],
  ],
  15,
  6,
);

/** Traced from `KestralB.png`, the Kestrel B hangar picture (Red-Tail): 42 squares, 15 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Teleporter, Backup Battery, Cloaking, Drones, Hacking. */
const kestrelB = traced(
  [
    ["p-medbay", "Medbay", "medbay", 3, 0, 2, 2],
    ["p-mind", "Mind Control", null, 5, 0, 2, 1],
    ["p-shields", "Shields", "shields", 1, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 6, 1, 2, 2],
    ["p-tele", "Teleporter", null, 4, 2, 2, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 1],
    ["p-battery", "Backup Battery", null, 6, 3, 2, 1],
    ["p-doors", "Doors", "doors", 8, 3, 2, 1],
    ["p-kbh0", "Hall", null, 10, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 12, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 1, 4, 2, 2],
    ["p-sensors", "Sensors", "sensors", 4, 4, 2, 1],
    ["p-cloak", "Cloaking", null, 6, 4, 2, 2],
    ["p-drones", "Drones", null, 3, 5, 2, 2],
    ["p-hack", "Hacking", null, 5, 6, 2, 1],
  ],
  [
    [4, 0, "e"],
    [5, 0, "n"],
    [6, 0, "n"],
    [6, 0, "s"],
    [1, 1, "n"],
    [1, 1, "w"],
    [2, 1, "e"],
    [4, 1, "s"],
    [1, 2, "s"],
    [5, 2, "e"],
    [6, 2, "s"],
    [7, 2, "s"],
    [1, 3, "s"],
    [6, 3, "s"],
    [7, 3, "e"],
    [7, 3, "s"],
    [8, 3, "s"],
    [9, 3, "e"],
    [9, 3, "s"],
    [10, 3, "n"],
    [10, 3, "s"],
    [11, 3, "e"],
    [11, 3, "n"],
    [11, 3, "s"],
    [12, 3, "s"],
    [13, 3, "s"],
    [4, 4, "s"],
    [5, 4, "e"],
    [1, 5, "s"],
    [1, 5, "w"],
    [2, 5, "e"],
    [6, 5, "s"],
    [4, 6, "e"],
    [5, 6, "s"],
    [6, 6, "s"],
  ],
  14,
  7,
);

/** Traced from `KestralCSystems.png`, the Kestrel C hangar picture (The Swallow): 46 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Teleporter, Drones, Backup Battery, Hacking, Mind Control. */
const kestrelC = traced(
  [
    ["p-kch0", "Hall", null, 6, 0, 2, 1],
    ["p-cloak", "Cloaking", null, 1, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 4, 1, 2, 2],
    ["p-kch1", "Hall", null, 6, 1, 2, 1],
    ["p-tele", "Teleporter", null, 8, 1, 2, 1],
    ["p-engines", "Engines", "engines", 0, 2, 2, 2],
    ["p-drones", "Drones", null, 2, 2, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 7, 2, 1, 2],
    ["p-battery", "Backup Battery", null, 9, 2, 1, 2],
    ["p-clone", "Clone Bay", null, 10, 2, 2, 2],
    ["p-doors", "Doors", "doors", 12, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 14, 2, 1, 2],
    ["p-shields", "Shields", "shields", 4, 3, 2, 2],
    ["p-sensors", "Sensors", "sensors", 12, 3, 2, 1],
    ["p-hack", "Hacking", null, 1, 4, 2, 1],
    ["p-kch2", "Hall", null, 6, 4, 2, 1],
    ["p-mind", "Mind Control", null, 8, 4, 2, 1],
    ["p-kch3", "Hall", null, 6, 5, 2, 1],
  ],
  [
    [6, 0, "n"],
    [6, 0, "s"],
    [7, 0, "n"],
    [7, 0, "s"],
    [1, 1, "s"],
    [2, 1, "s"],
    [5, 1, "e"],
    [7, 1, "e"],
    [7, 1, "s"],
    [9, 1, "s"],
    [0, 2, "w"],
    [3, 2, "e"],
    [9, 2, "e"],
    [11, 2, "e"],
    [12, 2, "s"],
    [13, 2, "e"],
    [13, 2, "s"],
    [0, 3, "w"],
    [1, 3, "s"],
    [2, 3, "s"],
    [3, 3, "e"],
    [7, 3, "s"],
    [9, 3, "e"],
    [9, 3, "s"],
    [11, 3, "e"],
    [13, 3, "e"],
    [5, 4, "e"],
    [6, 4, "s"],
    [7, 4, "e"],
    [7, 4, "s"],
    [6, 5, "s"],
    [7, 5, "s"],
  ],
  15,
  6,
);

/** Traced from `EngiASystems.png`, the Engi A hangar picture (The Torus): 42 squares, 16 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Hacking, Backup Battery, Teleporter, Mind Control. */
const engiA = traced(
  [
    ["p-drones", "Drones", null, 0, 0, 2, 2],
    ["p-eah0", "Hall", null, 3, 0, 2, 1],
    ["p-cloak", "Cloaking", null, 5, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 2, 1, 1, 2],
    ["p-hack", "Hacking", null, 3, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-battery", "Backup Battery", null, 1, 2, 1, 2],
    ["p-sensors", "Sensors", "sensors", 4, 3, 1, 2],
    ["p-tele", "Teleporter", null, 6, 3, 1, 2],
    ["p-eah1", "Hall", null, 7, 3, 1, 2],
    ["p-engines", "Engines", "engines", 0, 4, 2, 2],
    ["p-shields", "Shields", "shields", 2, 4, 2, 2],
    ["p-mind", "Mind Control", null, 5, 4, 1, 2],
    ["p-doors", "Doors", "doors", 4, 5, 1, 2],
    ["p-medbay", "Medbay", "medbay", 6, 5, 2, 2],
    ["p-pilot", "Piloting", "pilot", 8, 5, 1, 2],
  ],
  [
    [3, 0, "n"],
    [3, 0, "s"],
    [4, 0, "n"],
    [4, 0, "s"],
    [1, 1, "s"],
    [2, 1, "e"],
    [4, 1, "e"],
    [5, 1, "e"],
    [1, 2, "e"],
    [6, 2, "s"],
    [1, 3, "s"],
    [6, 3, "e"],
    [7, 3, "e"],
    [4, 4, "e"],
    [4, 4, "s"],
    [5, 4, "e"],
    [6, 4, "s"],
    [7, 4, "e"],
    [1, 5, "e"],
    [3, 5, "e"],
    [5, 5, "e"],
    [7, 6, "e"],
  ],
  9,
  7,
);

/** Traced from `EngiBSystems.png`, the Engi B hangar picture (The Vortex): 32 squares, 14 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Sensors, Teleporter, Mind Control, Hacking, Backup Battery, Cloaking. */
const engiB = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-weapons", "Weapons", "weapons", 2, 1, 2, 1],
    ["p-sensors", "Sensors", null, 4, 1, 2, 1],
    ["p-tele", "Teleporter", null, 6, 1, 1, 2],
    ["p-mind", "Mind Control", null, 0, 2, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 1, 2, 1, 2],
    ["p-medbay", "Medbay", "medbay", 6, 3, 1, 2],
    ["p-drones", "Drones", null, 0, 4, 2, 2],
    ["p-doors", "Doors", "doors", 2, 4, 2, 1],
    ["p-hack", "Hacking", null, 4, 4, 2, 1],
    ["p-battery", "Backup Battery", null, 2, 5, 2, 1],
    ["p-shields", "Shields", "shields", 4, 5, 2, 1],
    ["p-cloak", "Cloaking", null, 6, 5, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 5, 1, 2],
  ],
  [
    [1, 1, "e"],
    [1, 1, "s"],
    [3, 1, "e"],
    [5, 1, "e"],
    [0, 2, "e"],
    [0, 2, "w"],
    [6, 2, "s"],
    [0, 3, "e"],
    [0, 3, "w"],
    [1, 3, "s"],
    [1, 4, "e"],
    [2, 4, "s"],
    [3, 4, "e"],
    [3, 4, "s"],
    [4, 4, "s"],
    [5, 4, "e"],
    [5, 4, "s"],
    [6, 4, "s"],
    [2, 5, "s"],
    [3, 5, "s"],
    [7, 5, "e"],
  ],
  9,
  7,
);

/** Traced from `EngiCSystems.png`, the Engi C hangar picture (Tetragon): 40 squares, 17 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Backup Battery, Mind Control, Teleporter. */
const engiC = traced(
  [
    ["p-oxygen", "Oxygen", "oxygen", 0, 0, 1, 2],
    ["p-cloak", "Cloaking", null, 1, 0, 1, 2],
    ["p-battery", "Backup Battery", null, 2, 0, 1, 2],
    ["p-mind", "Mind Control", null, 3, 0, 1, 2],
    ["p-tele", "Teleporter", null, 4, 0, 1, 2],
    ["p-hack", "Hacking", null, 5, 0, 1, 2],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-drones", "Drones", null, 1, 2, 2, 2],
    ["p-shields", "Shields", "shields", 4, 3, 2, 2],
    ["p-ech0", "Hall", null, 6, 3, 1, 2],
    ["p-engines", "Engines", "engines", 0, 4, 1, 2],
    ["p-clone", "Clone Bay", null, 2, 4, 2, 1],
    ["p-ech1", "Hall", null, 1, 5, 2, 1],
    ["p-sensors", "Sensors", "sensors", 3, 5, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 5, 1, 2],
    ["p-ech2", "Hall", null, 4, 6, 2, 1],
    ["p-doors", "Doors", "doors", 6, 6, 2, 1],
  ],
  [
    [2, 0, "n"],
    [3, 0, "n"],
    [4, 0, "n"],
    [0, 1, "e"],
    [1, 1, "e"],
    [1, 1, "s"],
    [2, 1, "e"],
    [2, 1, "s"],
    [3, 1, "e"],
    [4, 1, "e"],
    [5, 1, "e"],
    [6, 2, "s"],
    [2, 3, "e"],
    [2, 3, "s"],
    [2, 4, "s"],
    [3, 4, "e"],
    [5, 4, "e"],
    [0, 5, "e"],
    [2, 5, "e"],
    [4, 5, "s"],
    [5, 6, "e"],
    [5, 6, "s"],
    [7, 6, "e"],
  ],
  9,
  7,
);

/** Traced from `FedASystems.png`, the Federation A hangar picture (The Osprey): 46 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Teleporter, Hacking, Cloaking, Backup Battery, Drones, Mind Control, Artillery. */
const fedA = traced(
  [
    ["p-fah0", "Hall", null, 0, 0, 1, 2],
    ["p-tele", "Teleporter", null, 1, 1, 2, 1],
    ["p-hack", "Hacking", null, 2, 2, 2, 1],
    ["p-doors", "Doors", "doors", 4, 2, 1, 2],
    ["p-weapons", "Weapons", "weapons", 12, 2, 2, 2],
    ["p-engines", "Engines", "engines", 1, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 3, 3, 1, 2],
    ["p-medbay", "Medbay", "medbay", 5, 3, 2, 2],
    ["p-shields", "Shields", "shields", 7, 3, 2, 2],
    ["p-cloak", "Cloaking", null, 9, 3, 1, 2],
    ["p-sensors", "Sensors", "sensors", 10, 3, 2, 1],
    ["p-fah1", "Hall", null, 14, 3, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 4, 4, 1, 2],
    ["p-battery", "Backup Battery", null, 10, 4, 2, 1],
    ["p-drones", "Drones", null, 12, 4, 2, 2],
    ["p-mind", "Mind Control", null, 2, 5, 2, 1],
    ["p-fah2", "Hall", null, 0, 6, 1, 2],
    ["p-artillery", "Artillery", null, 1, 6, 2, 1],
  ],
  [
    [0, 0, "w"],
    [0, 1, "e"],
    [0, 1, "w"],
    [2, 1, "s"],
    [2, 2, "s"],
    [3, 2, "e"],
    [4, 3, "e"],
    [8, 3, "e"],
    [9, 3, "e"],
    [11, 3, "e"],
    [12, 3, "s"],
    [13, 3, "e"],
    [14, 3, "e"],
    [2, 4, "e"],
    [2, 4, "s"],
    [4, 4, "e"],
    [6, 4, "e"],
    [9, 4, "e"],
    [11, 4, "e"],
    [13, 4, "e"],
    [14, 4, "e"],
    [2, 5, "s"],
    [3, 5, "e"],
    [0, 6, "e"],
    [0, 6, "w"],
    [0, 7, "w"],
  ],
  15,
  8,
);

/** Traced from `FederationBSystems.png`, the Federation B hangar picture (Nisos): 44 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Drones, Backup Battery, Teleporter, Mind Control, Cloaking, Artillery, Hacking. */
const fedB = traced(
  [
    ["p-sensors", "Sensors", "sensors", 0, 0, 2, 1],
    ["p-fbh0", "Hall", null, 2, 0, 1, 2],
    ["p-drones", "Drones", null, 0, 1, 2, 2],
    ["p-battery", "Backup Battery", null, 2, 2, 1, 2],
    ["p-weapons", "Weapons", "weapons", 11, 2, 2, 2],
    ["p-tele", "Teleporter", null, 3, 3, 2, 1],
    ["p-mind", "Mind Control", null, 9, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 1, 4, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 4, 4, 2, 1],
    ["p-fbh1", "Hall", null, 6, 4, 2, 1],
    ["p-medbay", "Medbay", "medbay", 8, 4, 2, 1],
    ["p-cloak", "Cloaking", null, 2, 5, 1, 2],
    ["p-artillery", "Artillery", null, 3, 5, 2, 1],
    ["p-hack", "Hacking", null, 9, 5, 2, 1],
    ["p-shields", "Shields", "shields", 11, 5, 2, 2],
    ["p-engines", "Engines", "engines", 0, 6, 2, 2],
    ["p-fbh2", "Hall", null, 2, 7, 1, 2],
    ["p-doors", "Doors", "doors", 0, 8, 2, 1],
  ],
  [
    [1, 0, "e"],
    [2, 0, "e"],
    [2, 1, "e"],
    [2, 1, "s"],
    [1, 2, "e"],
    [2, 3, "e"],
    [2, 3, "s"],
    [4, 3, "s"],
    [9, 3, "s"],
    [10, 3, "e"],
    [2, 4, "s"],
    [4, 4, "s"],
    [5, 4, "e"],
    [6, 4, "n"],
    [6, 4, "s"],
    [7, 4, "e"],
    [7, 4, "n"],
    [7, 4, "s"],
    [9, 4, "s"],
    [2, 5, "e"],
    [10, 5, "e"],
    [1, 6, "e"],
    [2, 6, "s"],
    [2, 7, "e"],
    [1, 8, "e"],
    [2, 8, "e"],
  ],
  13,
  9,
);

/** Traced from `FederationCSystems.png`, the Federation C hangar picture (The Fregatidae): 46 squares, 19 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Hacking, Cloaking, Backup Battery, Artillery, Mind Control, Drones. */
const fedC = traced(
  [
    ["p-fch0", "Hall", null, 0, 0, 1, 2],
    ["p-clone", "Clone Bay", null, 1, 1, 2, 2],
    ["p-hack", "Hacking", null, 3, 2, 2, 1],
    ["p-fch1", "Hall", null, 11, 2, 1, 2],
    ["p-cloak", "Cloaking", null, 12, 2, 2, 1],
    ["p-engines", "Engines", "engines", 1, 3, 1, 2],
    ["p-pilot", "Piloting", "pilot", 2, 3, 1, 2],
    ["p-battery", "Backup Battery", null, 4, 3, 1, 2],
    ["p-tele", "Teleporter", null, 5, 3, 2, 1],
    ["p-artillery", "Artillery", null, 7, 3, 2, 2],
    ["p-sensors", "Sensors", "sensors", 9, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 13, 3, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 5, 4, 2, 1],
    ["p-doors", "Doors", "doors", 9, 4, 2, 1],
    ["p-fch2", "Hall", null, 11, 4, 1, 2],
    ["p-shields", "Shields", "shields", 1, 5, 2, 2],
    ["p-mind", "Mind Control", null, 3, 5, 2, 1],
    ["p-drones", "Drones", null, 12, 5, 2, 1],
    ["p-fch3", "Hall", null, 0, 6, 1, 2],
  ],
  [
    [0, 0, "w"],
    [0, 1, "e"],
    [0, 1, "w"],
    [1, 2, "s"],
    [1, 2, "w"],
    [2, 2, "e"],
    [4, 2, "s"],
    [11, 2, "e"],
    [11, 2, "n"],
    [11, 2, "w"],
    [13, 2, "s"],
    [1, 3, "e"],
    [4, 3, "e"],
    [6, 3, "e"],
    [8, 3, "e"],
    [10, 3, "e"],
    [14, 3, "e"],
    [1, 4, "s"],
    [4, 4, "e"],
    [4, 4, "s"],
    [6, 4, "e"],
    [8, 4, "e"],
    [10, 4, "e"],
    [13, 4, "s"],
    [14, 4, "e"],
    [1, 5, "w"],
    [2, 5, "e"],
    [11, 5, "e"],
    [11, 5, "s"],
    [11, 5, "w"],
    [0, 6, "e"],
    [0, 6, "w"],
    [0, 7, "w"],
  ],
  15,
  8,
);

/** Traced from `ZoltanASystems.png`, the Zoltan A hangar picture (The Adjudicator): 46 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Teleporter, Mind Control, Hacking, Cloaking, Backup Battery, Drones. */
const zoltanA = traced(
  [
    ["p-sensors", "Sensors", "sensors", 1, 0, 2, 1],
    ["p-zah0", "Hall", null, 3, 0, 1, 2],
    ["p-tele", "Teleporter", null, 1, 1, 2, 1],
    ["p-mind", "Mind Control", null, 8, 1, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 9, 1, 2, 1],
    ["p-hack", "Hacking", null, 3, 2, 2, 1],
    ["p-cloak", "Cloaking", null, 5, 2, 2, 1],
    ["p-battery", "Backup Battery", null, 7, 2, 1, 2],
    ["p-medbay", "Medbay", "medbay", 9, 2, 2, 2],
    ["p-zah1", "Hall", null, 4, 3, 1, 2],
    ["p-doors", "Doors", "doors", 8, 3, 1, 2],
    ["p-pilot", "Piloting", "pilot", 12, 3, 1, 2],
    ["p-zah2", "Hall", null, 10, 4, 2, 1],
    ["p-engines", "Engines", "engines", 0, 5, 2, 2],
    ["p-weapons", "Weapons", "weapons", 2, 5, 2, 2],
    ["p-shields", "Shields", "shields", 4, 5, 2, 2],
    ["p-drones", "Drones", null, 6, 5, 2, 2],
    ["p-zah3", "Hall", null, 9, 5, 2, 1],
  ],
  [
    [2, 0, "e"],
    [2, 1, "e"],
    [3, 1, "s"],
    [8, 1, "e"],
    [10, 1, "s"],
    [4, 2, "e"],
    [4, 2, "s"],
    [6, 2, "e"],
    [7, 2, "e"],
    [4, 3, "e"],
    [4, 3, "w"],
    [7, 3, "e"],
    [8, 3, "e"],
    [10, 3, "s"],
    [4, 4, "e"],
    [4, 4, "s"],
    [4, 4, "w"],
    [10, 4, "s"],
    [11, 4, "e"],
    [1, 5, "e"],
    [3, 5, "e"],
    [5, 5, "e"],
    [9, 5, "s"],
    [10, 5, "s"],
    [1, 6, "e"],
    [3, 6, "e"],
    [5, 6, "e"],
  ],
  13,
  7,
);

/** Traced from `ZoltanB.png`, the Zoltan B hangar picture (Noether): 40 squares, 15 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Drones, Hacking, Cloaking, Backup Battery, Teleporter. */
const zoltanB = traced(
  [
    ["p-medbay", "Medbay", "medbay", 6, 0, 2, 2],
    ["p-mind", "Mind Control", null, 8, 0, 2, 1],
    ["p-drones", "Drones", null, 10, 0, 2, 2],
    ["p-engines", "Engines", "engines", 2, 1, 1, 2],
    ["p-hack", "Hacking", null, 4, 1, 1, 2],
    ["p-shields", "Shields", "shields", 8, 1, 2, 2],
    ["p-cloak", "Cloaking", null, 6, 2, 2, 2],
    ["p-weapons", "Weapons", "weapons", 10, 2, 2, 2],
    ["p-doors", "Doors", "doors", 0, 3, 2, 1],
    ["p-battery", "Backup Battery", null, 2, 3, 2, 1],
    ["p-zbh0", "Hall", null, 4, 3, 2, 1],
    ["p-tele", "Teleporter", null, 8, 3, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 2, 4, 1, 2],
    ["p-sensors", "Sensors", "sensors", 4, 4, 1, 2],
    ["p-pilot", "Piloting", "pilot", 6, 4, 1, 2],
  ],
  [
    [7, 0, "e"],
    [8, 0, "n"],
    [8, 0, "s"],
    [9, 0, "e"],
    [9, 0, "n"],
    [9, 0, "s"],
    [6, 1, "s"],
    [11, 1, "s"],
    [2, 2, "s"],
    [4, 2, "s"],
    [8, 2, "s"],
    [9, 2, "s"],
    [0, 3, "w"],
    [1, 3, "e"],
    [2, 3, "s"],
    [3, 3, "e"],
    [4, 3, "s"],
    [5, 3, "e"],
    [6, 3, "s"],
    [7, 3, "e"],
    [8, 3, "s"],
    [9, 3, "e"],
    [9, 3, "s"],
  ],
  12,
  6,
);

/** Traced from `ZoltanCSystems.png`, the Zoltan C hangar picture (Cerenkov): 46 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Hacking, Cloaking, Mind Control, Teleporter. */
const zoltanC = traced(
  [
    ["p-engines", "Engines", "engines", 1, 0, 1, 2],
    ["p-shields", "Shields", "shields", 2, 0, 2, 2],
    ["p-weapons", "Weapons", "weapons", 7, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 9, 1, 2, 1],
    ["p-battery", "Backup Battery", null, 3, 2, 2, 1],
    ["p-zch0", "Hall", null, 5, 2, 2, 1],
    ["p-hack", "Hacking", null, 10, 2, 1, 2],
    ["p-zch1", "Hall", null, 6, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 12, 3, 1, 2],
    ["p-cloak", "Cloaking", null, 8, 4, 2, 1],
    ["p-zch2", "Hall", null, 10, 4, 2, 1],
    ["p-clone", "Clone Bay", null, 0, 5, 2, 2],
    ["p-mind", "Mind Control", null, 2, 5, 2, 1],
    ["p-tele", "Teleporter", null, 4, 5, 2, 1],
    ["p-drones", "Drones", null, 6, 5, 2, 2],
    ["p-zch3", "Hall", null, 9, 5, 2, 1],
    ["p-sensors", "Sensors", "sensors", 2, 6, 2, 1],
    ["p-doors", "Doors", "doors", 4, 6, 2, 1],
  ],
  [
    [1, 0, "e"],
    [3, 1, "s"],
    [7, 1, "n"],
    [7, 1, "w"],
    [8, 1, "e"],
    [10, 1, "s"],
    [4, 2, "e"],
    [6, 2, "e"],
    [6, 2, "s"],
    [7, 2, "s"],
    [6, 3, "w"],
    [10, 3, "s"],
    [6, 4, "s"],
    [6, 4, "w"],
    [7, 4, "e"],
    [7, 4, "s"],
    [9, 4, "e"],
    [9, 4, "s"],
    [10, 4, "s"],
    [11, 4, "e"],
    [1, 5, "e"],
    [3, 5, "e"],
    [5, 5, "e"],
    [9, 5, "s"],
    [10, 5, "s"],
    [1, 6, "e"],
    [3, 6, "e"],
    [5, 6, "e"],
  ],
  13,
  7,
);

/** Traced from `SlugASystems.png`, the Slug A hangar picture (Man of War): 40 squares, 15 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Cloaking, Backup Battery, Teleporter, Sensors, Hacking, Drones. */
const slugA = traced(
  [
    ["p-mind", "Mind Control", null, 1, 0, 1, 2],
    ["p-doors", "Doors", "doors", 2, 0, 1, 2],
    ["p-cloak", "Cloaking", null, 3, 0, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 6, 1, 1, 2],
    ["p-weapons", "Weapons", "weapons", 2, 2, 2, 2],
    ["p-engines", "Engines", "engines", 0, 3, 2, 2],
    ["p-sah0", "Hall", null, 5, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 7, 3, 1, 2],
    ["p-battery", "Backup Battery", null, 3, 4, 1, 2],
    ["p-tele", "Teleporter", null, 5, 4, 1, 2],
    ["p-sensors", "Sensors", null, 6, 5, 1, 2],
    ["p-hack", "Hacking", null, 1, 6, 1, 2],
    ["p-shields", "Shields", "shields", 2, 6, 2, 2],
    ["p-drones", "Drones", null, 4, 6, 2, 2],
  ],
  [
    [1, 0, "e"],
    [1, 0, "w"],
    [2, 0, "e"],
    [4, 0, "s"],
    [1, 1, "w"],
    [2, 1, "s"],
    [3, 2, "e"],
    [5, 2, "e"],
    [5, 2, "s"],
    [1, 3, "e"],
    [3, 3, "s"],
    [5, 3, "s"],
    [6, 3, "e"],
    [3, 5, "s"],
    [5, 5, "e"],
    [5, 5, "s"],
    [1, 6, "w"],
    [1, 7, "e"],
    [1, 7, "w"],
    [3, 7, "e"],
  ],
  8,
  8,
);

/** Traced from `SlugBSystems.png`, the Slug B hangar picture (The Stormwalker): 54 squares, 20 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Sensors, Mind Control, Cloaking, Medbay, Hacking, Backup Battery, Drones. */
const slugB = traced(
  [
    ["p-sensors", "Sensors", null, 6, 0, 2, 1],
    ["p-sbh0", "Hall", null, 4, 1, 1, 2],
    ["p-engines", "Engines", "engines", 6, 1, 2, 2],
    ["p-tele", "Teleporter", null, 5, 2, 1, 2],
    ["p-mind", "Mind Control", null, 0, 3, 2, 1],
    ["p-cloak", "Cloaking", null, 2, 3, 2, 2],
    ["p-sbh1", "Hall", null, 8, 3, 2, 1],
    ["p-medbay", "Medbay", null, 10, 3, 2, 2],
    ["p-sbh2", "Hall", null, 0, 4, 1, 2],
    ["p-hack", "Hacking", null, 4, 4, 2, 2],
    ["p-sbh3", "Hall", null, 6, 4, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 4, 1, 2],
    ["p-shields", "Shields", "shields", 2, 5, 2, 2],
    ["p-weapons", "Weapons", "weapons", 10, 5, 2, 2],
    ["p-battery", "Backup Battery", null, 0, 6, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 5, 6, 1, 2],
    ["p-sbh4", "Hall", null, 8, 6, 2, 1],
    ["p-sbh5", "Hall", null, 4, 7, 1, 2],
    ["p-drones", "Drones", null, 6, 7, 2, 2],
    ["p-doors", "Doors", "doors", 6, 9, 2, 1],
  ],
  [
    [6, 0, "s"],
    [4, 1, "w"],
    [4, 2, "e"],
    [4, 2, "w"],
    [5, 2, "e"],
    [0, 3, "s"],
    [1, 3, "e"],
    [5, 3, "s"],
    [8, 3, "n"],
    [8, 3, "s"],
    [9, 3, "e"],
    [9, 3, "n"],
    [0, 4, "w"],
    [2, 4, "s"],
    [3, 4, "e"],
    [5, 4, "e"],
    [7, 4, "e"],
    [11, 4, "s"],
    [0, 5, "s"],
    [0, 5, "w"],
    [3, 5, "e"],
    [5, 5, "s"],
    [8, 5, "s"],
    [1, 6, "e"],
    [8, 6, "s"],
    [9, 6, "e"],
    [9, 6, "s"],
    [4, 7, "e"],
    [4, 7, "w"],
    [5, 7, "e"],
    [5, 7, "s"],
    [4, 8, "w"],
    [6, 8, "s"],
  ],
  12,
  10,
);

/** Traced from `SlugCSystems.png`, the Slug C hangar picture (Ariolimax): 42 squares, 16 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Backup Battery, Sensors, Teleporter, Drones. */
const slugC = traced(
  [
    ["p-mind", "Mind Control", null, 1, 0, 2, 2],
    ["p-cloak", "Cloaking", null, 3, 0, 2, 1],
    ["p-sch0", "Hall", null, 5, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 3, 1, 2, 1],
    ["p-battery", "Backup Battery", null, 6, 1, 1, 2],
    ["p-sensors", "Sensors", null, 1, 2, 2, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 2],
    ["p-shields", "Shields", "shields", 2, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 4, 3, 1, 2],
    ["p-weapons", "Weapons", "weapons", 6, 3, 2, 2],
    ["p-doors", "Doors", "doors", 1, 5, 2, 1],
    ["p-tele", "Teleporter", null, 6, 5, 1, 2],
    ["p-hack", "Hacking", null, 1, 6, 2, 2],
    ["p-drones", "Drones", null, 3, 6, 2, 1],
    ["p-sch1", "Hall", null, 5, 6, 1, 2],
    ["p-clone", "Clone Bay", null, 3, 7, 2, 1],
  ],
  [
    [1, 0, "w"],
    [2, 0, "e"],
    [4, 0, "e"],
    [5, 0, "e"],
    [5, 0, "n"],
    [1, 1, "s"],
    [1, 1, "w"],
    [2, 1, "e"],
    [4, 1, "e"],
    [5, 1, "e"],
    [1, 2, "s"],
    [1, 2, "w"],
    [6, 2, "s"],
    [1, 3, "e"],
    [3, 3, "e"],
    [1, 4, "e"],
    [1, 4, "s"],
    [3, 4, "e"],
    [6, 4, "s"],
    [1, 5, "s"],
    [1, 5, "w"],
    [1, 6, "w"],
    [2, 6, "e"],
    [4, 6, "e"],
    [5, 6, "e"],
    [1, 7, "w"],
    [2, 7, "e"],
    [4, 7, "e"],
  ],
  8,
  8,
);

/** Traced from `RockASystems.png`, the Rock A hangar picture (Bulwark): 48 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Drones, Mind Control, Hacking, Backup Battery, Teleporter. */
const rockA = traced(
  [
    ["p-oxygen", "Oxygen", "oxygen", 0, 0, 1, 2],
    ["p-doors", "Doors", "doors", 1, 0, 1, 2],
    ["p-shields", "Shields", "shields", 2, 0, 2, 2],
    ["p-cloak", "Cloaking", null, 4, 0, 2, 2],
    ["p-drones", "Drones", null, 6, 0, 2, 2],
    ["p-pilot", "Piloting", "pilot", 8, 0, 1, 2],
    ["p-rah0", "Hall", null, 1, 2, 1, 2],
    ["p-rah1", "Hall", null, 2, 2, 2, 1],
    ["p-mind", "Mind Control", null, 4, 2, 2, 1],
    ["p-rah2", "Hall", null, 6, 2, 1, 2],
    ["p-rah3", "Hall", null, 2, 3, 2, 1],
    ["p-hack", "Hacking", null, 4, 3, 2, 1],
    ["p-sensors", "Sensors", "sensors", 0, 4, 1, 2],
    ["p-battery", "Backup Battery", null, 1, 4, 1, 2],
    ["p-engines", "Engines", "engines", 2, 4, 2, 2],
    ["p-weapons", "Weapons", "weapons", 4, 4, 2, 2],
    ["p-medbay", "Medbay", "medbay", 6, 4, 2, 2],
    ["p-tele", "Teleporter", null, 8, 4, 1, 2],
  ],
  [
    [0, 0, "e"],
    [7, 0, "e"],
    [0, 1, "e"],
    [1, 1, "s"],
    [2, 1, "s"],
    [3, 1, "s"],
    [4, 1, "s"],
    [5, 1, "s"],
    [6, 1, "s"],
    [7, 1, "e"],
    [1, 2, "e"],
    [1, 2, "w"],
    [3, 2, "e"],
    [5, 2, "e"],
    [6, 2, "e"],
    [1, 3, "e"],
    [1, 3, "s"],
    [1, 3, "w"],
    [2, 3, "s"],
    [3, 3, "e"],
    [3, 3, "s"],
    [4, 3, "s"],
    [5, 3, "e"],
    [5, 3, "s"],
    [6, 3, "e"],
    [6, 3, "s"],
    [0, 4, "e"],
    [7, 4, "e"],
    [0, 5, "e"],
    [7, 5, "e"],
  ],
  9,
  6,
);

/** Traced from `RockBSystems.png`, the Rock B hangar picture (Shivan): 44 squares, 16 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Backup Battery, Teleporter, Hacking, Cloaking, Drones, Doors. */
const rockB = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 2, 0, 2, 2],
    ["p-shields", "Shields", "shields", 6, 0, 2, 2],
    ["p-sensors", "Sensors", "sensors", 8, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 4, 1, 1, 2],
    ["p-rbh0", "Hall", null, 2, 2, 2, 1],
    ["p-mind", "Mind Control", null, 5, 2, 2, 1],
    ["p-battery", "Backup Battery", null, 4, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 6, 3, 2, 1],
    ["p-rbh1", "Hall", null, 2, 4, 2, 1],
    ["p-tele", "Teleporter", null, 4, 4, 1, 2],
    ["p-hack", "Hacking", null, 5, 4, 2, 1],
    ["p-weapons", "Weapons", "weapons", 0, 5, 2, 2],
    ["p-cloak", "Cloaking", null, 2, 5, 2, 2],
    ["p-drones", "Drones", null, 6, 5, 2, 2],
    ["p-doors", "Doors", null, 8, 5, 1, 2],
  ],
  [
    [1, 0, "e"],
    [7, 0, "e"],
    [1, 1, "e"],
    [2, 1, "s"],
    [3, 1, "s"],
    [6, 1, "s"],
    [7, 1, "e"],
    [3, 2, "e"],
    [4, 2, "s"],
    [5, 2, "s"],
    [4, 3, "s"],
    [5, 3, "e"],
    [5, 3, "s"],
    [2, 4, "s"],
    [3, 4, "e"],
    [3, 4, "s"],
    [6, 4, "s"],
    [1, 5, "e"],
    [7, 5, "e"],
    [1, 6, "e"],
    [7, 6, "e"],
  ],
  9,
  7,
);

/** Traced from `RockCSystems.png`, the Rock C hangar picture (Tektite): 40 squares, 17 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Mind Control, Hacking, Drones, Teleporter, Backup Battery. */
const rockC = traced(
  [
    ["p-weapons", "Weapons", "weapons", 0, 0, 2, 2],
    ["p-rch0", "Hall", null, 2, 0, 2, 1],
    ["p-cloak", "Cloaking", null, 4, 0, 2, 1],
    ["p-rch1", "Hall", null, 6, 0, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 0, 1, 2],
    ["p-mind", "Mind Control", null, 3, 1, 1, 2],
    ["p-doors", "Doors", "doors", 5, 1, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 7, 1, 1, 2],
    ["p-engines", "Engines", "engines", 0, 2, 2, 2],
    ["p-hack", "Hacking", null, 3, 3, 1, 2],
    ["p-sensors", "Sensors", "sensors", 5, 3, 1, 2],
    ["p-drones", "Drones", null, 7, 3, 1, 2],
    ["p-shields", "Shields", "shields", 0, 4, 2, 2],
    ["p-clone", "Clone Bay", null, 8, 4, 1, 2],
    ["p-rch2", "Hall", null, 2, 5, 2, 1],
    ["p-tele", "Teleporter", null, 4, 5, 2, 1],
    ["p-battery", "Backup Battery", null, 6, 5, 2, 1],
  ],
  [
    [1, 0, "e"],
    [3, 0, "e"],
    [3, 0, "s"],
    [5, 0, "e"],
    [5, 0, "s"],
    [7, 0, "e"],
    [7, 0, "s"],
    [0, 1, "s"],
    [3, 1, "e"],
    [5, 1, "e"],
    [0, 2, "w"],
    [3, 2, "e"],
    [3, 2, "s"],
    [5, 2, "e"],
    [5, 2, "s"],
    [7, 2, "e"],
    [7, 2, "s"],
    [0, 3, "s"],
    [0, 3, "w"],
    [3, 3, "e"],
    [5, 3, "e"],
    [7, 3, "e"],
    [3, 4, "e"],
    [3, 4, "s"],
    [5, 4, "e"],
    [5, 4, "s"],
    [7, 4, "s"],
    [1, 5, "e"],
    [3, 5, "e"],
    [5, 5, "e"],
    [7, 5, "e"],
  ],
  9,
  6,
);

/** Traced from `StealthASystems.png`, the Stealth A hangar picture (The Nesasio): 40 squares, 15 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Backup Battery, Drones, Shields, Mind Control, Teleporter, Hacking. */
const stealthA = traced(
  [
    ["p-sensors", "Sensors", "sensors", 2, 0, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 0, 2, 2],
    ["p-battery", "Backup Battery", null, 6, 1, 2, 1],
    ["p-engines", "Engines", "engines", 0, 2, 2, 2],
    ["p-drones", "Drones", null, 2, 2, 1, 2],
    ["p-shields", "Shields", null, 3, 2, 2, 2],
    ["p-mind", "Mind Control", null, 5, 2, 1, 2],
    ["p-tele", "Teleporter", null, 7, 2, 1, 2],
    ["p-weapons", "Weapons", "weapons", 8, 2, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 10, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 12, 2, 1, 2],
    ["p-sah0", "Hall", null, 10, 3, 2, 1],
    ["p-cloak", "Cloaking", null, 4, 4, 2, 2],
    ["p-hack", "Hacking", null, 6, 4, 2, 1],
    ["p-doors", "Doors", "doors", 2, 5, 2, 1],
  ],
  [
    [3, 0, "e"],
    [4, 1, "s"],
    [5, 1, "e"],
    [5, 1, "s"],
    [7, 1, "s"],
    [1, 2, "e"],
    [4, 2, "e"],
    [5, 2, "e"],
    [9, 2, "e"],
    [10, 2, "s"],
    [11, 2, "e"],
    [2, 3, "e"],
    [4, 3, "s"],
    [5, 3, "e"],
    [5, 3, "s"],
    [7, 3, "e"],
    [7, 3, "s"],
    [10, 3, "s"],
    [11, 3, "s"],
    [5, 4, "e"],
    [3, 5, "e"],
  ],
  13,
  6,
);

/** Traced from `StealthBSystems.png`, the Stealth B hangar picture (DA-SR 12): 38 squares, 15 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Drones, Shields, Backup Battery, Hacking, Mind Control, Teleporter. */
const stealthB = traced(
  [
    ["p-medbay", "Medbay", "medbay", 2, 0, 2, 1],
    ["p-drones", "Drones", null, 3, 1, 2, 2],
    ["p-shields", "Shields", null, 5, 1, 2, 2],
    ["p-battery", "Backup Battery", null, 1, 2, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 7, 2, 2, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 1],
    ["p-sensors", "Sensors", "sensors", 3, 3, 2, 1],
    ["p-sbh0", "Hall", null, 5, 3, 2, 1],
    ["p-hack", "Hacking", null, 8, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 3, 2, 1],
    ["p-mind", "Mind Control", null, 1, 4, 2, 1],
    ["p-cloak", "Cloaking", null, 3, 4, 2, 2],
    ["p-weapons", "Weapons", "weapons", 5, 4, 2, 2],
    ["p-doors", "Doors", "doors", 7, 4, 2, 1],
    ["p-tele", "Teleporter", null, 2, 6, 2, 1],
  ],
  [
    [3, 0, "s"],
    [4, 1, "e"],
    [1, 2, "s"],
    [1, 2, "w"],
    [2, 2, "e"],
    [3, 2, "s"],
    [6, 2, "e"],
    [6, 2, "s"],
    [8, 2, "s"],
    [1, 3, "s"],
    [3, 3, "s"],
    [6, 3, "e"],
    [6, 3, "s"],
    [8, 3, "s"],
    [9, 3, "e"],
    [1, 4, "w"],
    [2, 4, "e"],
    [6, 4, "e"],
    [3, 5, "s"],
    [4, 5, "e"],
  ],
  12,
  7,
);

/** Traced from `StealthCSystems.png`, the Stealth C hangar picture (Simo-H): 40 squares, 14 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Backup Battery, Sensors, Shields, Mind Control, Teleporter, Cloaking, Hacking. */
const stealthC = traced(
  [
    ["p-clone", "Clone Bay", null, 2, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 4, 0, 2, 1],
    ["p-battery", "Backup Battery", null, 5, 1, 1, 2],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-sensors", "Sensors", null, 0, 2, 2, 1],
    ["p-engines", "Engines", "engines", 2, 2, 2, 2],
    ["p-shields", "Shields", null, 8, 2, 2, 2],
    ["p-mind", "Mind Control", null, 10, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 12, 2, 1, 2],
    ["p-doors", "Doors", "doors", 0, 3, 2, 1],
    ["p-tele", "Teleporter", null, 5, 3, 1, 2],
    ["p-drones", "Drones", null, 6, 3, 2, 2],
    ["p-cloak", "Cloaking", null, 2, 4, 2, 2],
    ["p-hack", "Hacking", null, 4, 5, 2, 1],
  ],
  [
    [3, 0, "e"],
    [5, 0, "s"],
    [2, 1, "w"],
    [3, 1, "s"],
    [5, 1, "e"],
    [5, 1, "w"],
    [1, 2, "e"],
    [5, 2, "s"],
    [5, 2, "w"],
    [7, 2, "e"],
    [9, 2, "e"],
    [10, 2, "s"],
    [11, 2, "e"],
    [11, 2, "s"],
    [1, 3, "e"],
    [3, 3, "s"],
    [5, 3, "w"],
    [7, 3, "e"],
    [2, 4, "w"],
    [5, 4, "e"],
    [5, 4, "s"],
    [5, 4, "w"],
    [3, 5, "e"],
  ],
  13,
  6,
);

/** Traced from `LaniusASystems.png`, the Lanius A hangar picture (Kruos): 42 squares, 16 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Teleporter, Cloaking, Backup Battery, Drones, Mind Control. */
const laniusA = traced(
  [
    ["p-clone", "Clone Bay", null, 0, 0, 2, 2],
    ["p-tele", "Teleporter", null, 2, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 4, 0, 2, 1],
    ["p-hack", "Hacking", null, 6, 0, 1, 2],
    ["p-lah0", "Hall", null, 2, 1, 2, 1],
    ["p-shields", "Shields", "shields", 4, 1, 2, 2],
    ["p-cloak", "Cloaking", null, 7, 1, 1, 2],
    ["p-engines", "Engines", "engines", 3, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 7, 3, 1, 2],
    ["p-weapons", "Weapons", "weapons", 4, 5, 2, 2],
    ["p-battery", "Backup Battery", null, 7, 5, 1, 2],
    ["p-drones", "Drones", null, 0, 6, 2, 2],
    ["p-lah1", "Hall", null, 2, 6, 2, 1],
    ["p-mind", "Mind Control", null, 6, 6, 1, 2],
    ["p-sensors", "Sensors", "sensors", 2, 7, 2, 1],
    ["p-doors", "Doors", "doors", 4, 7, 2, 1],
  ],
  [
    [1, 0, "e"],
    [3, 0, "e"],
    [5, 0, "e"],
    [0, 1, "s"],
    [1, 1, "e"],
    [2, 1, "s"],
    [3, 1, "e"],
    [3, 1, "s"],
    [5, 1, "e"],
    [6, 1, "e"],
    [4, 2, "s"],
    [7, 2, "s"],
    [3, 3, "w"],
    [3, 4, "w"],
    [4, 4, "s"],
    [7, 4, "s"],
    [0, 6, "n"],
    [1, 6, "e"],
    [2, 6, "n"],
    [3, 6, "e"],
    [3, 6, "n"],
    [5, 6, "e"],
    [6, 6, "e"],
    [1, 7, "e"],
    [3, 7, "e"],
    [5, 7, "e"],
  ],
  8,
  8,
);

/** Traced from `LaniusBSystems.png`, the Lanius B hangar picture (The Shrike): 50 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Sensors, Cloaking, Drones, Hacking, Backup Battery. */
const laniusB = traced(
  [
    ["p-sensors", "Sensors", null, 2, 0, 2, 1],
    ["p-cloak", "Cloaking", null, 4, 0, 2, 1],
    ["p-drones", "Drones", null, 0, 1, 2, 2],
    ["p-hack", "Hacking", null, 2, 1, 2, 1],
    ["p-shields", "Shields", "shields", 5, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 2, 2, 2, 1],
    ["p-lbh0", "Hall", null, 7, 2, 2, 1],
    ["p-lbh1", "Hall", null, 5, 3, 2, 2],
    ["p-engines", "Engines", "engines", 3, 4, 2, 2],
    ["p-pilot", "Piloting", "pilot", 7, 4, 1, 2],
    ["p-lbh2", "Hall", null, 5, 5, 2, 2],
    ["p-clone", "Clone Bay", null, 0, 7, 2, 2],
    ["p-tele", "Teleporter", null, 2, 7, 2, 1],
    ["p-weapons", "Weapons", "weapons", 5, 7, 2, 2],
    ["p-lbh3", "Hall", null, 7, 7, 2, 1],
    ["p-battery", "Backup Battery", null, 2, 8, 2, 1],
    ["p-doors", "Doors", "doors", 2, 9, 2, 1],
    ["p-mind", "Mind Control", null, 4, 9, 2, 1],
  ],
  [
    [3, 0, "e"],
    [3, 0, "s"],
    [5, 0, "s"],
    [1, 1, "e"],
    [2, 1, "s"],
    [0, 2, "s"],
    [0, 2, "w"],
    [1, 2, "e"],
    [6, 2, "e"],
    [6, 2, "s"],
    [7, 2, "n"],
    [7, 2, "s"],
    [8, 2, "n"],
    [8, 2, "s"],
    [4, 4, "e"],
    [4, 4, "n"],
    [6, 4, "e"],
    [4, 5, "e"],
    [4, 5, "s"],
    [6, 5, "e"],
    [6, 6, "s"],
    [0, 7, "n"],
    [0, 7, "w"],
    [1, 7, "e"],
    [2, 7, "s"],
    [6, 7, "e"],
    [7, 7, "n"],
    [7, 7, "s"],
    [8, 7, "n"],
    [8, 7, "s"],
    [1, 8, "e"],
    [3, 8, "s"],
    [5, 8, "s"],
    [3, 9, "e"],
  ],
  9,
  10,
);

/** Traced from `MantisASystems.png`, the Mantis A hangar picture (The Gila Monster): 54 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Drones, Cloaking, Backup Battery, Hacking, Sensors. */
const mantisA = traced(
  [
    ["p-weapons", "Weapons", "weapons", 0, 0, 2, 2],
    ["p-doors", "Doors", "doors", 2, 1, 2, 1],
    ["p-mind", "Mind Control", null, 1, 2, 2, 2],
    ["p-medbay", "Medbay", "medbay", 8, 2, 2, 2],
    ["p-mah0", "Hall", null, 5, 3, 2, 1],
    ["p-drones", "Drones", null, 10, 3, 2, 1],
    ["p-mah1", "Hall", null, 1, 4, 1, 2],
    ["p-engines", "Engines", "engines", 2, 4, 2, 2],
    ["p-mah2", "Hall", null, 4, 4, 1, 2],
    ["p-pilot", "Piloting", "pilot", 5, 4, 1, 2],
    ["p-cloak", "Cloaking", null, 6, 4, 2, 2],
    ["p-battery", "Backup Battery", null, 8, 4, 2, 2],
    ["p-hack", "Hacking", null, 1, 6, 2, 2],
    ["p-mah3", "Hall", null, 5, 6, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 8, 6, 2, 2],
    ["p-tele", "Teleporter", null, 10, 6, 2, 1],
    ["p-shields", "Shields", "shields", 0, 8, 2, 2],
    ["p-sensors", "Sensors", null, 2, 8, 2, 1],
  ],
  [
    [1, 1, "s"],
    [2, 1, "s"],
    [2, 3, "s"],
    [5, 3, "n"],
    [5, 3, "s"],
    [6, 3, "n"],
    [6, 3, "s"],
    [9, 3, "e"],
    [9, 3, "s"],
    [1, 4, "e"],
    [1, 4, "w"],
    [3, 4, "e"],
    [7, 4, "e"],
    [1, 5, "e"],
    [1, 5, "w"],
    [2, 5, "s"],
    [4, 5, "e"],
    [5, 5, "s"],
    [6, 5, "s"],
    [9, 5, "s"],
    [5, 6, "s"],
    [6, 6, "s"],
    [9, 6, "e"],
    [1, 7, "s"],
    [2, 7, "s"],
  ],
  12,
  10,
);

/** Traced from `MantisBSystems.png`, the Mantis B hangar picture (The Basilisk): 46 squares, 17 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Cloaking, Backup Battery, Mind Control, Hacking. */
const mantisB = traced(
  [
    ["p-cloak", "Cloaking", null, 0, 0, 2, 1],
    ["p-sensors", "Sensors", "sensors", 0, 1, 2, 1],
    ["p-battery", "Backup Battery", null, 2, 1, 1, 2],
    ["p-medbay", "Medbay", "medbay", 1, 3, 2, 2],
    ["p-mbh0", "Hall", null, 3, 3, 2, 1],
    ["p-mind", "Mind Control", null, 5, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 7, 3, 2, 2],
    ["p-shields", "Shields", "shields", 9, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 5, 4, 1, 2],
    ["p-tele", "Teleporter", null, 1, 5, 2, 2],
    ["p-engines", "Engines", "engines", 7, 5, 2, 2],
    ["p-drones", "Drones", null, 9, 5, 2, 2],
    ["p-mbh1", "Hall", null, 3, 6, 2, 1],
    ["p-hack", "Hacking", null, 5, 6, 2, 1],
    ["p-mbh2", "Hall", null, 2, 7, 1, 2],
    ["p-doors", "Doors", "doors", 0, 8, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 0, 9, 2, 1],
  ],
  [
    [0, 0, "s"],
    [1, 0, "s"],
    [1, 1, "e"],
    [2, 2, "s"],
    [2, 3, "e"],
    [3, 3, "n"],
    [4, 3, "e"],
    [4, 3, "n"],
    [5, 3, "s"],
    [6, 3, "e"],
    [8, 3, "e"],
    [10, 3, "e"],
    [10, 3, "n"],
    [1, 4, "s"],
    [7, 4, "s"],
    [10, 4, "s"],
    [5, 5, "s"],
    [2, 6, "e"],
    [2, 6, "s"],
    [3, 6, "s"],
    [4, 6, "e"],
    [4, 6, "s"],
    [6, 6, "e"],
    [8, 6, "e"],
    [10, 6, "e"],
    [10, 6, "s"],
    [0, 8, "s"],
    [1, 8, "e"],
    [1, 8, "s"],
  ],
  11,
  10,
);

/** Traced from `MantisCSystems.png`, the Mantis C hangar picture (The Theseus): 56 squares, 18 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Hacking, Mind Control, Backup Battery, Cloaking, Drones. */
const mantisC = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-mch0", "Hall", null, 2, 0, 2, 2],
    ["p-hack", "Hacking", null, 1, 2, 2, 2],
    ["p-clone", "Clone Bay", null, 8, 2, 2, 2],
    ["p-mch1", "Hall", null, 3, 3, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 7, 3, 1, 2],
    ["p-shields", "Shields", "shields", 10, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 3, 4, 1, 2],
    ["p-mind", "Mind Control", null, 4, 4, 1, 2],
    ["p-doors", "Doors", "doors", 5, 4, 2, 1],
    ["p-sensors", "Sensors", "sensors", 5, 5, 2, 1],
    ["p-battery", "Backup Battery", null, 7, 5, 1, 2],
    ["p-weapons", "Weapons", "weapons", 10, 5, 2, 2],
    ["p-cloak", "Cloaking", null, 1, 6, 2, 2],
    ["p-mch2", "Hall", null, 3, 6, 2, 1],
    ["p-tele", "Teleporter", null, 8, 6, 2, 2],
    ["p-drones", "Drones", null, 0, 8, 2, 2],
    ["p-mch3", "Hall", null, 2, 8, 2, 2],
  ],
  [
    [2, 0, "n"],
    [3, 0, "e"],
    [3, 0, "n"],
    [1, 1, "e"],
    [2, 1, "s"],
    [2, 3, "e"],
    [3, 3, "n"],
    [3, 3, "s"],
    [4, 3, "n"],
    [4, 3, "s"],
    [7, 3, "e"],
    [7, 3, "n"],
    [9, 3, "e"],
    [4, 4, "e"],
    [6, 4, "e"],
    [7, 4, "s"],
    [10, 4, "s"],
    [11, 4, "e"],
    [3, 5, "s"],
    [4, 5, "e"],
    [4, 5, "s"],
    [6, 5, "e"],
    [11, 5, "e"],
    [2, 6, "e"],
    [3, 6, "s"],
    [4, 6, "s"],
    [7, 6, "e"],
    [7, 6, "s"],
    [9, 6, "e"],
    [2, 7, "s"],
    [1, 8, "e"],
    [2, 9, "s"],
    [3, 9, "e"],
    [3, 9, "s"],
  ],
  12,
  10,
);

/** Traced from `CrystalASystems.png`, the Crystal A hangar picture (Bravais): 54 squares, 19 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Drones, Mind Control, Teleporter, Hacking, Backup Battery, Cloaking. */
const crystalA = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-drones", "Drones", null, 2, 0, 2, 2],
    ["p-sensors", "Sensors", "sensors", 5, 0, 2, 1],
    ["p-doors", "Doors", "doors", 12, 0, 1, 2],
    ["p-weapons", "Weapons", "weapons", 13, 0, 2, 2],
    ["p-mind", "Mind Control", null, 4, 1, 2, 2],
    ["p-tele", "Teleporter", null, 10, 1, 1, 2],
    ["p-cah0", "Hall", null, 2, 2, 1, 2],
    ["p-pilot", "Piloting", "pilot", 6, 2, 1, 2],
    ["p-hack", "Hacking", null, 11, 2, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 5, 3, 1, 2],
    ["p-cah1", "Hall", null, 13, 3, 1, 2],
    ["p-cah2", "Hall", null, 2, 4, 1, 2],
    ["p-shields", "Shields", "shields", 3, 4, 2, 2],
    ["p-medbay", "Medbay", "medbay", 11, 4, 2, 2],
    ["p-cah3", "Hall", null, 5, 5, 2, 1],
    ["p-cah4", "Hall", null, 7, 5, 2, 1],
    ["p-battery", "Backup Battery", null, 9, 5, 2, 1],
    ["p-cloak", "Cloaking", null, 4, 6, 2, 2],
  ],
  [
    [5, 0, "s"],
    [12, 0, "e"],
    [1, 1, "e"],
    [2, 1, "s"],
    [3, 1, "e"],
    [12, 1, "e"],
    [12, 1, "s"],
    [2, 2, "w"],
    [5, 2, "e"],
    [5, 2, "s"],
    [10, 2, "e"],
    [2, 3, "s"],
    [2, 3, "w"],
    [11, 3, "s"],
    [12, 3, "e"],
    [13, 3, "e"],
    [2, 4, "e"],
    [4, 4, "e"],
    [5, 4, "s"],
    [12, 4, "e"],
    [13, 4, "e"],
    [2, 5, "e"],
    [4, 5, "s"],
    [5, 5, "s"],
    [6, 5, "e"],
    [7, 5, "n"],
    [7, 5, "s"],
    [8, 5, "e"],
    [8, 5, "n"],
    [8, 5, "s"],
    [10, 5, "e"],
  ],
  15,
  8,
);

/** Traced from `CrystalBSystems.png`, the Crystal B hangar picture (Carnelian): 46 squares, 16 rooms, the orange or grey door bars, and the room of every system icon. Pale icons mark rooms kept for systems this hull can buy: Mind Control, Hacking, Backup Battery, Drones. */
const crystalB = traced(
  [
    ["p-mind", "Mind Control", null, 3, 0, 1, 2],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-cloak", "Cloaking", null, 12, 0, 2, 2],
    ["p-engines", "Engines", "engines", 0, 1, 2, 2],
    ["p-tele", "Teleporter", null, 2, 2, 2, 2],
    ["p-weapons", "Weapons", "weapons", 7, 2, 2, 2],
    ["p-hack", "Hacking", null, 9, 2, 2, 1],
    ["p-cbh0", "Hall", null, 11, 2, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 1, 4, 1, 2],
    ["p-medbay", "Medbay", "medbay", 2, 4, 2, 2],
    ["p-sensors", "Sensors", "sensors", 4, 4, 2, 1],
    ["p-cbh1", "Hall", null, 6, 4, 2, 1],
    ["p-battery", "Backup Battery", null, 3, 6, 2, 1],
    ["p-drones", "Drones", null, 5, 6, 2, 2],
    ["p-doors", "Doors", "doors", 7, 6, 2, 1],
    ["p-pilot", "Piloting", "pilot", 9, 6, 1, 2],
  ],
  [
    [3, 0, "e"],
    [3, 0, "n"],
    [3, 1, "e"],
    [3, 1, "s"],
    [12, 1, "s"],
    [1, 2, "e"],
    [8, 2, "e"],
    [10, 2, "e"],
    [12, 2, "e"],
    [3, 3, "s"],
    [7, 3, "s"],
    [3, 4, "e"],
    [5, 4, "e"],
    [7, 4, "e"],
    [1, 5, "e"],
    [3, 5, "s"],
    [3, 6, "w"],
    [4, 6, "e"],
    [6, 6, "e"],
    [8, 6, "e"],
  ],
  14,
  8,
);

export const LAYOUTS: Record<string, Layout> = {
  "kestrel-a": kestrelA,
  "kestrel-b": kestrelB,
  "kestrel-c": kestrelC,
  "engi-a": engiA,
  "engi-b": engiB,
  "engi-c": engiC,
  "fed-a": fedA,
  "fed-b": fedB,
  "fed-c": fedC,
  "zoltan-a": zoltanA,
  "zoltan-b": zoltanB,
  "zoltan-c": zoltanC,
  "slug-a": slugA,
  "slug-b": slugB,
  "slug-c": slugC,
  "rock-a": rockA,
  "rock-b": rockB,
  "rock-c": rockC,
  "stealth-a": stealthA,
  "stealth-b": stealthB,
  "stealth-c": stealthC,
  "lanius-a": laniusA,
  "lanius-b": laniusB,
  "mantis-a": mantisA,
  "mantis-b": mantisB,
  "mantis-c": mantisC,
  "crystal-a": crystalA,
  "crystal-b": crystalB,
};


// ---------------------------------------------------------------------------------------------
// Kit rooms on player hulls.
// Systems, lead: "Each system occupies one predetermined room specific to the ship (the player cannot choose what
// room to put a purchasable system to nor cannot alter the position of any installed system)." Same page: "All
// player ships have eight slots for systems, and four slots for subsystems." The cruiser pages list systems but
// not which room each one takes, so the documented spots are the rooms traced off the hangar pictures with a
// system label (Cloaking, Teleporter, Drones, ...). Every other kit goes to an empty traced room (INFERRED).
// ---------------------------------------------------------------------------------------------

/** Room title for a kit, as the hangar pictures label it. Artillery Beam and Flak Artillery share one label. */
export const KIT_TITLE: Record<KitId, string> = {
  veil: "Cloaking",
  sling: "Teleporter",
  spike: "Hacking",
  swarm: "Drones",
  leash: "Mind Control",
  cradle: "Clone Bay",
  cell: "Backup Battery",
  lance: "Artillery",
  flak: "Artillery",
};

/**
 * Preferred square counts per kit for an INFERRED room, best first.
 * - Crew Teleporter: "Ships can have only 2-tile Teleporter rooms, except for three playable ships with four-person
 *   teleporters" (Mantis B, Mantis C, Crystal B, whose 4-tile rooms are traced).
 * - Clone Bay: "a 4-tile Clone Bay room, similarly to Medbay ... while a 2-tile Clone Bay room".
 * - Mind Control: the page's figure is a "4-tile Mind Control room".
 * - Drone Control: the page's gallery shows "DroneRoomLarge" and "DroneRoomSmall". INFERRED: 4 then 2.
 * - INFERRED for the rest: the traced Cloaking rooms are 4 squares, the traced Artillery and Backup Battery rooms 2.
 */
const KIT_SQUARES: Record<KitId, number[]> = {
  sling: [2, 4],
  cradle: [4, 2],
  leash: [4, 2],
  swarm: [4, 2],
  veil: [4, 2],
  spike: [4, 2, 1],
  cell: [2, 4],
  lance: [2, 4],
  flak: [2, 4],
};

type Seat = { id: string; title: string; system: SysId | null; w: number; h: number; omit?: { x: number; y: number }[]; kit?: KitId };

function squares(r: Seat): number {
  return r.w * r.h - (r.omit?.length ?? 0);
}

/**
 * The room a kit belongs in, or undefined when the hull has no free room.
 * 1. A room already holding it. 2. A traced room labelled for it (the documented spot).
 * 3. Clone Bay only: the medical room, when Medbay is not fitted (also the pale Medbay room on a hull with no medical
 *    system). Systems: "Clone bays and medbays are mutually exclusive: buying one replaces the other". 4. INFERRED: the first empty traced room ("Hall"/"Hold") whose
 *    square count is earliest in KIT_SQUARES, then any empty room.
 */
export function kitSeat<R extends Seat>(rooms: R[], kit: KitId, medbayLevel = 0): R | undefined {
  const held = rooms.find((r) => r.kit === kit);
  if (held) return held;
  const free = (r: R) => !r.kit && r.system === null;
  const traced = rooms.find((r) => free(r) && r.title === KIT_TITLE[kit]);
  if (traced) return traced;
  if (kit === "cradle" && medbayLevel <= 0) {
    const bay = rooms.find((r) => !r.kit && (r.system === "medbay" || (r.system === null && r.title === "Medbay")));
    if (bay) return bay;
  }
  const empty = rooms.filter((r) => free(r) && (r.title === "Hall" || r.title === "Hold"));
  for (const n of KIT_SQUARES[kit]) {
    const hit = empty.find((r) => squares(r) === n);
    if (hit) return hit;
  }
  return empty[0];
}

function claim(r: Seat, kit: KitId) {
  r.kit = kit;
  r.title = KIT_TITLE[kit];
  // Clone Bay takes over the medical room (Systems: buying one replaces the other).
  if (kit === "cradle" && r.system === "medbay") r.system = null;
}

/** A copy of a hangar layout with each listed kit seated, for the hangar cutaway. */
export function seatLayout(layout: Layout, kits: KitId[]): Layout {
  const rooms = layout.rooms.map((r) => ({ ...r }));
  for (const kit of kits) {
    const r = kitSeat(rooms, kit);
    if (r) claim(r, kit);
  }
  return { ...layout, rooms };
}

function touching(a: Seat & { x: number; y: number }, b: Seat & { x: number; y: number }): boolean {
  const xTouch = a.x + a.w === b.x || b.x + b.w === a.x;
  const yOverlap = a.y < b.y + b.h && a.y + a.h > b.y;
  const yTouch = a.y + a.h === b.y || b.y + b.h === a.y;
  const xOverlap = a.x < b.x + b.w && a.x + a.w > b.x;
  return (xTouch && yOverlap) || (yTouch && xOverlap);
}

/**
 * INVENTED: a hull with no empty room left (the Lark grid has none) grows one 2×1 room under the grid for the kit.
 * Doors follow sim.ts addDoors: one shut door to space, and one shut door per touching room.
 */
function growRoom(ship: Ship, kit: KitId): Room {
  const taken = (x: number, y: number) =>
    ship.rooms.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  const width = Math.max(2, ship.cols);
  let x = 0;
  let y = ship.rows;
  // First open 2×1 spot, top to bottom, that still touches the hull's rooms.
  find: for (let sy = 0; sy <= ship.rows; sy++) {
    for (let sx = 0; sx + 2 <= width; sx++) {
      if (taken(sx, sy) || taken(sx + 1, sy)) continue;
      const box = { id: "", title: "", system: null, x: sx, y: sy, w: 2, h: 1 };
      if (!ship.rooms.some((o) => touching(o, box))) continue;
      x = sx;
      y = sy;
      break find;
    }
  }
  const r: Room = {
    id: `p-kit-${kit}`,
    title: KIT_TITLE[kit],
    system: null,
    kit,
    x,
    y,
    w: 2,
    h: 1,
    o2: 100,
    fire: 0,
    breach: 0,
    breachFix: 0,
    fireTick: 0,
    flash: 0,
    venting: false,
  };
  const doors: Door[] = [{ a: r.id, b: "void", open: false, hp: 0, stuck: 0 }];
  for (const o of ship.rooms) if (touching(o, r)) doors.push({ a: o.id, b: r.id, open: false, hp: 0, stuck: 0 });
  ship.rooms.push(r);
  ship.doors.push(...doors);
  ship.rows = Math.max(ship.rows, y + 1);
  return r;
}

/** Systems a store sells that are not kits, with the title of the pale room each hull keeps for them. */
const BOUGHT_SYSTEMS: [SysId, string][] = [
  ["shields", "Shields"],
  ["sensors", "Sensors"],
  ["doors", "Doors"],
  ["medbay", "Medbay"],
];

/**
 * Gives every kit on a player hull its room (`room.kit`), so weapon hits reach it (sim.ts strikeRoom -> hurtKit),
 * crew repair it (sim.ts life), and the Hard targeting list resolves it (wiki/targeting.ts). Idempotent.
 * Also undoes a Clone Bay room when the store swaps Medbay back in (Systems: "buying one replaces the other"), and
 * gives a bought Shields, Sensors, Door System, or Medbay the pale room its hangar picture keeps for it.
 */
export function seatKits(ship: Ship): void {
  if (!ship.rooms || !ship.kits) return;
  const medbay = ship.systems?.medbay?.level ?? 0;
  for (const r of ship.rooms) {
    if (!r.kit || ship.kits[r.kit]) continue;
    if (r.kit === "cradle" && medbay > 0 && !ship.rooms.some((o) => o.system === "medbay")) {
      r.system = "medbay";
      r.title = "Medbay";
    }
    delete r.kit;
  }
  for (const [id, title] of BOUGHT_SYSTEMS) {
    if ((ship.systems?.[id]?.level ?? 0) <= 0 || ship.rooms.some((r) => r.system === id)) continue;
    const r = ship.rooms.find((o) => o.system === null && !o.kit && o.title === title);
    if (r) r.system = id;
  }
  for (const id of Object.keys(ship.kits) as KitId[]) {
    if (!ship.kits[id]) continue;
    const r = kitSeat(ship.rooms, id, medbay);
    if (r) claim(r, id);
    else growRoom(ship, id);
  }
}
