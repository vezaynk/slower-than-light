import type { SysId } from "./types.ts";

/**
 * Interior tiles. Each cell is one square, the same unit on every hull.
 * Square counts match the published layout-size comparison:
 * Kestrel A 10×2 + 7×4 = 48, B 9×2 + 6×4 = 42, C 12×2 + 5×4 = 44,
 * Engi A 42, B 32, C 40, Federation A 46, B 44, C 46.
 * Positions are the interior arrangement (engines aft, piloting forward) so rooms share walls.
 * The wiki pictures were not copied. Those files did not load, so this is not a trace.
 */

export type TileRoom = {
  id: string;
  title: string;
  system: SysId | null;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Layout = {
  cols: number;
  rows: number;
  rooms: TileRoom[];
};

type Raw = [string, string, SysId | null, number, number, number, number];

function pack(rows: Raw[], cols: number, gridRows: number): Layout {
  return {
    cols,
    rows: gridRows,
    rooms: rows.map(([id, title, system, x, y, w, h]) => ({ id, title, system, x, y, w, h })),
  };
}

const kestrelA = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-a1", "Hall", null, 2, 1, 2, 1],
    ["p-a2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 4, 2, 2, 2],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-a3", "Hall", null, 6, 1, 2, 1],
    ["p-a4", "Hold", null, 6, 2, 2, 2],
    ["p-a5", "Hall", null, 8, 0, 2, 1],
    ["p-weapons", "Weapons", "weapons", 8, 1, 2, 2],
    ["p-a6", "Hall", null, 8, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 0, 2, 2],
    ["p-a7", "Hall", null, 10, 2, 2, 1],
    ["p-a8", "Hold", null, 12, 0, 2, 2],
    ["p-a9", "Hall", null, 12, 2, 2, 1],
  ],
  14,
  4,
);

const kestrelB = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-b1", "Hall", null, 2, 1, 2, 1],
    ["p-b2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 4, 2, 2, 2],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-b3", "Hall", null, 6, 1, 2, 1],
    ["p-b4", "Hold", null, 6, 2, 2, 2],
    ["p-weapons", "Weapons", "weapons", 8, 0, 2, 2],
    ["p-b5", "Hall", null, 8, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 0, 2, 2],
    ["p-b6", "Hall", null, 10, 2, 2, 1],
    ["p-b7", "Hall", null, 12, 1, 2, 1],
  ],
  14,
  4,
);

const kestrelC = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-c1", "Hall", null, 2, 1, 2, 1],
    ["p-c2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-clone", "Clone Bay", null, 4, 2, 2, 2],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-c3", "Hall", null, 6, 1, 2, 1],
    ["p-c4", "Hall", null, 6, 2, 2, 1],
    ["p-c5", "Hall", null, 6, 3, 2, 1],
    ["p-c6", "Hall", null, 8, 0, 2, 1],
    ["p-weapons", "Weapons", "weapons", 8, 1, 2, 2],
    ["p-c7", "Hall", null, 8, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 0, 2, 1],
    ["p-c8", "Hall", null, 10, 1, 2, 1],
    ["p-c9", "Hall", null, 10, 2, 2, 2],
  ],
  12,
  4,
);

const engiA = pack(
  [
    ["p-engines", "Engines", "engines", 0, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 0, 2, 1],
    ["p-doors", "Doors", "doors", 0, 3, 2, 1],
    ["p-e1", "Hall", null, 2, 0, 2, 1],
    ["p-shields", "Shields", "shields", 2, 1, 2, 2],
    ["p-e2", "Hall", null, 2, 3, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 0, 2, 2],
    ["p-sensors", "Sensors", "sensors", 4, 2, 2, 1],
    ["p-e3", "Hall", null, 4, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-e4", "Hall", null, 6, 0, 2, 1],
    ["p-drones", "Drones", null, 6, 3, 2, 1],
    ["p-e5", "Hall", null, 8, 0, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 1, 2, 2],
    ["p-e6", "Hall", null, 8, 3, 2, 1],
    ["p-e7", "Hall", null, 10, 1, 2, 1],
  ],
  12,
  4,
);

const engiB = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 0, 1, 2, 1],
    ["p-doors", "Doors", "doors", 0, 2, 2, 1],
    ["p-shields", "Shields", "shields", 2, 0, 2, 2],
    ["p-f1", "Hall", null, 2, 2, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 0, 2, 1],
    ["p-weapons", "Weapons", "weapons", 4, 1, 2, 2],
    ["p-f2", "Hall", null, 6, 0, 2, 1],
    ["p-drones", "Drones", null, 6, 1, 2, 1],
    ["p-pilot", "Piloting", "pilot", 6, 2, 2, 1],
    ["p-f3", "Hall", null, 8, 0, 2, 1],
    ["p-f4", "Hall", null, 8, 1, 2, 1],
    ["p-f5", "Hall", null, 8, 2, 2, 1],
    ["p-f6", "Hall", null, 4, 3, 2, 1],
  ],
  10,
  4,
);

const engiC = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-g1", "Hall", null, 2, 1, 2, 1],
    ["p-g2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-clone", "Clone Bay", null, 4, 2, 2, 1],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-g3", "Hall", null, 6, 1, 2, 1],
    ["p-hack", "Hacking", null, 6, 2, 2, 1],
    ["p-weapons", "Weapons", "weapons", 8, 0, 2, 1],
    ["p-drones", "Drones", null, 8, 1, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 2, 2, 1],
    ["p-g4", "Hall", null, 10, 0, 2, 1],
    ["p-g5", "Hall", null, 10, 1, 2, 1],
    ["p-g6", "Hall", null, 10, 2, 2, 2],
    ["p-g7", "Hall", null, 4, 3, 2, 1],
  ],
  12,
  4,
);

const fedA = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-h1", "Hall", null, 2, 1, 2, 1],
    ["p-h2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 4, 2, 2, 2],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-h3", "Hall", null, 6, 1, 2, 1],
    ["p-h4", "Hall", null, 6, 2, 2, 1],
    ["p-h5", "Hall", null, 6, 3, 2, 1],
    ["p-artillery", "Artillery", null, 8, 0, 2, 1],
    ["p-h10", "Hall", null, 8, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 8, 2, 2, 2],
    ["p-h6", "Hall", null, 10, 0, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 1, 2, 2],
    ["p-h7", "Hall", null, 10, 3, 2, 1],
    ["p-h8", "Hall", null, 12, 1, 2, 1],
  ],
  14,
  4,
);

const fedB = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-i1", "Hall", null, 2, 1, 2, 1],
    ["p-i2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 4, 2, 2, 1],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-i3", "Hall", null, 6, 1, 2, 1],
    ["p-i4", "Hall", null, 6, 2, 2, 1],
    ["p-artillery", "Artillery", null, 8, 0, 2, 2],
    ["p-weapons", "Weapons", "weapons", 8, 2, 2, 1],
    ["p-i5", "Hall", null, 10, 0, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 1, 2, 2],
    ["p-i6", "Hall", null, 10, 3, 2, 1],
    ["p-i7", "Hall", null, 12, 1, 2, 1],
    ["p-i8", "Hall", null, 4, 3, 2, 1],
    ["p-i9", "Hall", null, 8, 3, 2, 1],
  ],
  14,
  4,
);

const fedC = pack(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 0, 2, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-j1", "Hall", null, 2, 1, 2, 1],
    ["p-j2", "Hall", null, 2, 2, 2, 1],
    ["p-shields", "Shields", "shields", 4, 0, 2, 2],
    ["p-clone", "Clone Bay", null, 4, 2, 2, 2],
    ["p-sensors", "Sensors", "sensors", 6, 0, 2, 1],
    ["p-j3", "Hall", null, 6, 1, 2, 1],
    ["p-tele", "Teleporter", null, 6, 2, 2, 1],
    ["p-j4", "Hall", null, 6, 3, 2, 1],
    ["p-flak", "Flak", null, 8, 0, 2, 1],
    ["p-j10", "Hall", null, 8, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 8, 2, 2, 1],
    ["p-j5", "Hall", null, 8, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 0, 2, 2],
    ["p-j6", "Hall", null, 10, 2, 2, 1],
    ["p-j7", "Hall", null, 12, 0, 2, 1],
    ["p-j8", "Hall", null, 12, 1, 2, 1],
  ],
  14,
  4,
);

export function layoutFor(id: string): Layout | undefined {
  return LAYOUTS[id];
}

export function tileCount(layout: Layout): number {
  return layout.rooms.reduce((n, r) => n + r.w * r.h, 0);
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
  "zoltan-a": sized(core("Medbay", "medbay"), 13, 5),
  "zoltan-b": sized(core("Medbay", "medbay"), 10, 5),
  "zoltan-c": sized(core("Clone Bay", null), 13, 5),
  "slug-a": sized(
    core("Medbay", "medbay").filter((r) => r.id !== "p-sensors"),
    10,
    5,
  ),
  "slug-b": sized(
    [
      ...core("Medbay", "medbay").filter((r) => r.id !== "p-medbay" && r.id !== "p-sensors"),
      { id: "p-tele", title: "Teleporter", system: null, size: 4 },
    ],
    13,
    7,
  ),
  "slug-c": sized(
    [
      ...core("Clone Bay", null),
      { id: "p-hack", title: "Hacking", system: null, size: 2 },
      { id: "p-mind", title: "Mind Control", system: null, size: 2 },
    ],
    11,
    5,
  ),
  "rock-a": sized(core("Medbay", "medbay"), 12, 6),
  "rock-b": sized(
    core("Medbay", "medbay").filter((r) => r.id !== "p-doors"),
    10,
    6,
  ),
  "rock-c": sized(
    [
      { id: "p-engines", title: "Engines", system: "engines", size: 4 },
      { id: "p-shields", title: "Shields", system: "shields", size: 4 },
      { id: "p-weapons", title: "Weapons", system: "weapons", size: 4 },
      { id: "p-oxygen", title: "Oxygen", system: "oxygen", size: 2 },
      { id: "p-doors", title: "Doors", system: "doors", size: 2 },
      { id: "p-sensors", title: "Sensors", system: "sensors", size: 2 },
      { id: "p-medbay", title: "Clone Bay", system: null, size: 2 },
      { id: "p-pilot", title: "Piloting", system: "pilot", size: 2 },
    ],
    14,
    3,
  ),
  "stealth-a": sized(
    [
      ...core("Medbay", "medbay").filter((r) => r.id !== "p-shields"),
      { id: "p-cloak", title: "Cloaking", system: null, size: 2 },
    ],
    10,
    5,
  ),
  "stealth-b": sized(
    [
      ...core("Medbay", "medbay").filter((r) => r.id !== "p-shields" && r.id !== "p-weapons"),
      { id: "p-weapons", title: "Weapons", system: "weapons", size: 2 },
      { id: "p-cloak", title: "Cloaking", system: null, size: 4 },
    ],
    11,
    4,
  ),
  "stealth-c": sized(
    [
      ...core("Clone Bay", null).filter((r) => r.id !== "p-shields" && r.id !== "p-sensors"),
      { id: "p-drones", title: "Drones", system: null, size: 4 },
    ],
    8,
    6,
  ),
  "lanius-a": sized(
    [
      ...core("Clone Bay", null),
      { id: "p-hack", title: "Hacking", system: null, size: 2 },
    ],
    11,
    5,
  ),
  "lanius-b": sized(
    [
      ...core("Clone Bay", null).filter((r) => r.id !== "p-sensors"),
      { id: "p-tele", title: "Teleporter", system: null, size: 4 },
      { id: "p-mind", title: "Mind Control", system: null, size: 2 },
    ],
    11,
    7,
  ),
};

