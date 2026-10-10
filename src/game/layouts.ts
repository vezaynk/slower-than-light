import type { Door, DoorMark, DoorSide, KitId, Room, Ship, SysId } from "./types.ts";

/**
 * Interior tiles. Each cell is one square, the same unit on every hull.
 * Traced layouts store the orange bars from the hangar picture. Their square count is that picture's cell total.
 * Cruiser pages do not state square counts. Layouts without marks still use the older inferred strip.
 * The wiki pictures were not copied.
 */

export type TileRoom = {
  id: string;
  title: string;
  system: SysId | null;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Cells inside the box that the picture leaves as hull. The piloting room on Kestrel C is an L. */
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

/** Traced from the Kestrel A hangar picture, including which orange bar sits on which wall. 51 is that picture's square count. The cruiser page states no square count. The C console is the right-hand room. The nose chair is the pink cell past the empty floor. */
const kestrelA = traced(
  [
    ["p-a0", "Hall", null, 6, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 1, 1, 2, 1],
    ["p-a1", "Hall", null, 3, 1, 2, 1],
    ["p-a2", "Hall", null, 6, 1, 2, 2],
    ["p-medbay", "Medbay", "medbay", 8, 1, 2, 2],
    ["p-a3", "Hall", null, 0, 2, 1, 2],
    ["p-engines", "Engines", "engines", 1, 2, 2, 2],
    ["p-a9", "Hall", null, 4, 2, 2, 2],
    ["p-doors", "Doors", "doors", 10, 2, 2, 1],
    ["p-a10", "Hall", null, 12, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 14, 2, 1, 2],
    ["p-a4", "Hall", null, 6, 3, 2, 2],
    ["p-shields", "Shields", "shields", 8, 3, 2, 2],
    ["p-weapons", "Weapons", "weapons", 10, 3, 2, 1],
    ["p-a5", "Hall", null, 1, 4, 2, 1],
    ["p-a6", "Hall", null, 3, 4, 2, 1],
    ["p-a7", "Hall", null, 3, 5, 3, 1],
    ["p-a8", "Hall", null, 6, 5, 2, 1],
  ],
  [
    [4, 3, "s"],
    [4, 1, "s"],
    [2, 1, "e"],
    [2, 1, "s"],
    [2, 3, "s"],
    [2, 4, "e"],
    [0, 3, "e"],
    [0, 2, "e"],
    [7, 4, "e"],
    [7, 4, "s"],
    [8, 2, "s"],
    [9, 2, "e"],
    [11, 3, "e"],
    [11, 2, "e"],
    [9, 3, "e"],
    [5, 3, "e"],
    [5, 2, "e"],
    [7, 1, "e"],
    [7, 0, "s"],
    [6, 0, "n"],
    [6, 5, "s"],
    [0, 3, "w"],
    [0, 2, "w"],
    [7, 5, "s"],
    [7, 0, "n"],
    [13, 3, "e"],
  ],
  15,
  6,
);

/** Traced from the Kestrel B hangar picture. The C console is the upper room and the nozzle is the aft room. 37 is that picture's square count. The cruiser page states no square count. The chair is the pink room ahead of the empty floor. */
const kestrelB = traced(
  [
    ["p-shields", "Shields", "shields", 1, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 3, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 6, 0, 2, 2],
    ["p-b1", "Hall", null, 4, 1, 2, 1],
    ["p-engines", "Engines", "engines", 0, 2, 2, 1],
    ["p-b2", "Hall", null, 6, 2, 2, 1],
    ["p-doors", "Doors", "doors", 8, 2, 2, 1],
    ["p-b7", "Hall", null, 10, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 12, 2, 2, 1],
    ["p-b8", "Hall", null, 1, 3, 1, 1],
    ["p-weapons", "Weapons", "weapons", 4, 3, 2, 1],
    ["p-b3", "Hall", null, 6, 3, 2, 2],
    ["p-b4", "Hall", null, 1, 4, 2, 1],
    ["p-b5", "Hall", null, 3, 4, 2, 2],
    ["p-b6", "Hall", null, 5, 5, 2, 1],
  ],
  [
    [1, 1, "s"],
    [1, 2, "s"],
    [2, 4, "e"],
    [4, 5, "e"],
    [6, 4, "s"],
    [6, 2, "s"],
    [6, 1, "s"],
    [5, 1, "e"],
    [4, 0, "s"],
    [7, 1, "s"],
    [7, 2, "e"],
    [7, 2, "s"],
    [9, 2, "e"],
    [5, 3, "e"],
    [4, 3, "s"],
    [2, 0, "e"],
    [1, 0, "n"],
    [1, 0, "w"],
    [1, 4, "s"],
    [1, 4, "w"],
    [5, 5, "s"],
    [6, 5, "s"],
    [6, 0, "n"],
    [10, 2, "n"],
    [10, 2, "s"],
    [11, 2, "n"],
    [11, 2, "e"],
    [11, 2, "s"],
  ],
  14,
  6,
);

/** Traced from the Kestrel C hangar picture, including which orange bar sits on which wall. 37 is that picture's square count. The cruiser page states no square count. Piloting is an L around one hull square. The engines seat is the aft floor; the nozzle sits on the hull beside that room. */
const kestrelC = traced(
  [
    ["p-kch0", "Hall", null, 5, 0, 2, 1],
    ["p-engines", "Engines", "engines", 0, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 3, 1, 2, 2],
    ["p-kch1", "Hall", null, 5, 1, 2, 1],
    ["p-kch2", "Hall", null, 7, 1, 2, 1],
    ["p-kch3", "Hall", null, 1, 2, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 6, 2, 1, 2],
    ["p-kch4", "Hall", null, 8, 2, 1, 2],
    ["p-pilot", "Piloting", "pilot", 9, 2, 2, 2],
    ["p-kch5", "Hall", null, 11, 2, 1, 1],
    ["p-shields", "Shields", "shields", 3, 3, 2, 2],
    ["p-kch6", "Hall", null, 11, 3, 1, 1],
    ["p-kch7", "Hall", null, 0, 4, 2, 1],
    ["p-kch8", "Hall", null, 5, 4, 2, 1],
    ["p-kch9", "Hall", null, 7, 4, 2, 1],
    ["p-kch10", "Hall", null, 5, 5, 2, 1],
  ],
  [
    [5, 0, "s"],
    [4, 1, "e"],
    [4, 4, "e"],
    [6, 4, "e"],
    [6, 4, "s"],
    [6, 3, "s"],
    [8, 3, "e"],
    [8, 3, "s"],
    [8, 2, "e"],
    [8, 1, "s"],
    [10, 3, "e"],
    [11, 2, "s"],
    [5, 4, "s"],
    [2, 3, "e"],
    [2, 2, "e"],
    [1, 1, "s"],
    [1, 3, "s"],
    [6, 1, "e"],
    [6, 1, "s"],
    [6, 0, "s"],
    [5, 0, "n"],
    [5, 5, "s"],
    [6, 5, "s"],
    [11, 2, "w"],
    [0, 1, "s"],
    [0, 4, "n"],
    [6, 0, "n"],
  ],
  12,
  6,
);
kestrelC.rooms.find((r) => r.id === "p-pilot")!.omit = [{ x: 10, y: 2 }];

/** Traced from the Engi A hangar picture, including which orange bar sits on which wall. 42 is that picture's square count. The cruiser page states no square count. Two beige patches under the hull are not rooms. */
const engiA = traced(
  [
    ["p-sensors", "Sensors", "sensors", 0, 0, 2, 2],
    ["p-eah0", "Hall", null, 3, 0, 2, 1],
    ["p-eah1", "Hall", null, 5, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 2, 1, 1, 2],
    ["p-eah2", "Hall", null, 3, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-eah3", "Hall", null, 1, 2, 1, 2],
    ["p-eah4", "Hall", null, 4, 3, 1, 2],
    ["p-eah5", "Hall", null, 6, 3, 1, 2],
    ["p-eah6", "Hall", null, 7, 3, 1, 2],
    ["p-engines", "Engines", "engines", 0, 4, 2, 2],
    ["p-shields", "Shields", "shields", 2, 4, 2, 2],
    ["p-eah7", "Hall", null, 5, 4, 1, 2],
    ["p-doors", "Doors", "doors", 4, 5, 1, 2],
    ["p-medbay", "Medbay", "medbay", 6, 5, 2, 2],
    ["p-pilot", "Piloting", "pilot", 8, 5, 1, 2],
  ],
  [
    [1, 1, "s"],
    [1, 2, "e"],
    [1, 3, "s"],
    [1, 5, "e"],
    [3, 5, "e"],
    [4, 4, "e"],
    [4, 4, "s"],
    [5, 4, "e"],
    [5, 5, "e"],
    [7, 6, "e"],
    [5, 1, "e"],
    [4, 0, "s"],
    [3, 0, "s"],
    [4, 1, "e"],
    [6, 2, "s"],
    [6, 3, "e"],
    [6, 4, "s"],
    [2, 1, "e"],
    [7, 4, "e"],
    [7, 3, "e"],
    [4, 0, "n"],
    [3, 0, "n"],
  ],
  9,
  7,
);

/** Traced from the Engi B hangar picture, including which orange bar sits on which wall. 32 is that picture's square count. The cruiser page states no square count. A sky strip above the hull is not a room. The white cockpit sits one cell past the dark floor. */
const engiB = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-weapons", "Weapons", "weapons", 2, 1, 2, 1],
    ["p-ebh0", "Hall", null, 4, 1, 2, 1],
    ["p-ebh1", "Hall", null, 6, 1, 1, 2],
    ["p-ebh2", "Hall", null, 0, 2, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 1, 2, 1, 2],
    ["p-medbay", "Medbay", "medbay", 6, 3, 1, 2],
    ["p-drones", "Drones", null, 0, 4, 2, 2],
    ["p-doors", "Doors", "doors", 2, 4, 2, 1],
    ["p-ebh3", "Hall", null, 4, 4, 2, 1],
    ["p-ebh4", "Hall", null, 2, 5, 2, 1],
    ["p-shields", "Shields", "shields", 4, 5, 2, 1],
    ["p-ebh6", "Hall", null, 6, 5, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 5, 1, 2],
  ],
  [
    [1, 1, "e"],
    [1, 1, "s"],
    [1, 3, "s"],
    [1, 4, "e"],
    [3, 4, "e"],
    [3, 4, "s"],
    [4, 4, "s"],
    [5, 4, "e"],
    [5, 4, "s"],
    [6, 4, "s"],
    [6, 2, "s"],
    [5, 1, "e"],
    [3, 1, "e"],
    [2, 4, "s"],
    [0, 3, "e"],
    [0, 2, "e"],
    [2, 5, "s"],
    [3, 5, "s"],
    [7, 5, "e"],
    [0, 3, "w"],
    [0, 2, "w"],
  ],
  9,
  7,
);

/** Traced from the Stealth A hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 36 is that picture's square count. */
const stealthA = traced(
  [
    ["p-weapons", "Weapons", "weapons", 2, 0, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 0, 2, 2],
    ["p-sah0", "Hall", null, 6, 1, 2, 1],
    ["p-sa3", "Hall", null, 0, 2, 2, 2],
    ["p-sah1", "Hall", null, 2, 2, 1, 2],
    ["p-sah2", "Hall", null, 3, 2, 2, 2],
    ["p-sah3", "Hall", null, 5, 2, 1, 2],
    ["p-sah4", "Hall", null, 7, 2, 1, 2],
    ["p-engines", "Engines", "engines", 8, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 10, 2, 1, 1],
    ["p-sah5", "Hall", null, 10, 3, 1, 1],
    ["p-cloak", "Cloaking", null, 4, 4, 2, 2],
    ["p-sah6", "Hall", null, 6, 4, 2, 1],
    ["p-doors", "Doors", "doors", 2, 5, 2, 1],
  ],
  [
    [3, 0, "e"],
    [4, 1, "s"],
    [4, 2, "e"],
    [4, 3, "s"],
    [3, 5, "e"],
    [5, 4, "e"],
    [7, 3, "e"],
    [7, 3, "s"],
    [7, 1, "s"],
    [9, 2, "e"],
    [10, 2, "s"],
    [2, 3, "e"],
    [1, 2, "e"],
    [5, 3, "s"],
    [5, 1, "e"],
    [5, 1, "s"],
    [10, 3, "s"],
    [5, 3, "e"],
    [5, 2, "e"],
  ],
  11,
  6,
);

/** Traced from the Stealth B hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 37 is that picture's square count. */
const stealthB = traced(
  [
    ["p-medbay", "Medbay", "medbay", 2, 0, 2, 1],
    ["p-sbh0", "Hall", null, 3, 1, 2, 2],
    ["p-sbh1", "Hall", null, 5, 1, 2, 2],
    ["p-sbh2", "Hall", null, 1, 2, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 7, 2, 2, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 3, 3, 2, 1],
    ["p-sbh3", "Hall", null, 5, 3, 2, 1],
    ["p-sbh4", "Hall", null, 8, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 10, 3, 1, 1],
    ["p-sbh5", "Hall", null, 1, 4, 2, 1],
    ["p-cloak", "Cloaking", null, 3, 4, 2, 2],
    ["p-drones", "Drones", null, 5, 4, 2, 2],
    ["p-doors", "Doors", "doors", 7, 4, 2, 1],
    ["p-sbh6", "Hall", null, 2, 6, 2, 1],
  ],
  [
    [3, 0, "s"],
    [3, 2, "s"],
    [3, 3, "s"],
    [3, 5, "s"],
    [4, 5, "e"],
    [6, 2, "e"],
    [6, 2, "s"],
    [8, 2, "s"],
    [8, 3, "s"],
    [9, 3, "e"],
    [6, 3, "s"],
    [6, 4, "e"],
    [2, 4, "e"],
    [1, 3, "s"],
    [1, 2, "s"],
    [2, 2, "e"],
    [4, 1, "e"],
    [6, 3, "e"],
    [1, 4, "w"],
    [1, 2, "w"],
  ],
  11,
  7,
);

/** Traced from the Rock A hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 47 is that picture's square count. The C console is the upper room. The barrels beside it are a floor gun; the weapons console is the handgun. */
const rockA = traced(
  [
    ["p-oxygen", "Oxygen", "oxygen", 0, 0, 1, 2],
    ["p-doors", "Doors", "doors", 1, 0, 1, 2],
    ["p-shields", "Shields", "shields", 2, 0, 2, 2],
    ["p-rah0", "Hall", null, 4, 0, 2, 2],
    ["p-rah1", "Hall", null, 6, 0, 2, 2],
    ["p-pilot", "Piloting", "pilot", 8, 1, 1, 1],
    ["p-rah2", "Hall", null, 1, 2, 1, 2],
    ["p-rah3", "Hall", null, 2, 2, 2, 1],
    ["p-rah4", "Hall", null, 4, 2, 2, 1],
    ["p-rah5", "Hall", null, 6, 2, 1, 2],
    ["p-rah6", "Hall", null, 2, 3, 2, 1],
    ["p-rah7", "Hall", null, 4, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 0, 4, 1, 2],
    ["p-rah8", "Hall", null, 1, 4, 1, 2],
    ["p-engines", "Engines", "engines", 2, 4, 2, 2],
    ["p-rah10", "Hall", null, 4, 4, 2, 2],
    ["p-medbay", "Medbay", "medbay", 6, 4, 2, 2],
    ["p-rah9", "Hall", null, 8, 4, 1, 2],
  ],
  [
    [0, 0, "e"],
    [0, 1, "e"],
    [1, 1, "s"],
    [1, 2, "e"],
    [1, 3, "e"],
    [1, 3, "s"],
    [0, 5, "e"],
    [3, 3, "e"],
    [3, 3, "s"],
    [3, 2, "e"],
    [3, 1, "s"],
    [5, 1, "s"],
    [5, 2, "e"],
    [5, 3, "e"],
    [5, 3, "s"],
    [7, 5, "e"],
    [7, 4, "e"],
    [6, 3, "s"],
    [6, 1, "s"],
    [7, 1, "e"],
    [4, 1, "s"],
    [4, 3, "s"],
    [0, 4, "e"],
    [2, 3, "s"],
    [2, 1, "s"],
    [1, 2, "w"],
    [1, 3, "w"],
    [6, 3, "e"],
    [6, 2, "e"],
    [7, 0, "e"],
  ],
  9,
  6,
);

/** Traced from the Rock B hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 40 is that picture's square count. The C console is the upper-right room. The bottom cell has no console. */
const rockB = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 2],
    ["p-medbay", "Medbay", "medbay", 2, 0, 2, 2],
    ["p-shields", "Shields", "shields", 6, 0, 2, 2],
    ["p-weapons", "Weapons", "weapons", 8, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 4, 1, 1, 2],
    ["p-rbh0", "Hall", null, 2, 2, 2, 1],
    ["p-rbh1", "Hall", null, 5, 2, 2, 1],
    ["p-rbh2", "Hall", null, 4, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 6, 3, 1, 1],
    ["p-rbh3", "Hall", null, 2, 4, 2, 1],
    ["p-rbh4", "Hall", null, 4, 4, 1, 2],
    ["p-rbh5", "Hall", null, 5, 4, 2, 1],
    ["p-rbh6", "Hall", null, 2, 5, 2, 2],
    ["p-rbh7", "Hall", null, 6, 5, 2, 2],
    ["p-rbh8", "Hall", null, 8, 5, 1, 2],
    ["p-rbh9", "Hall", null, 1, 6, 1, 1],
  ],
  [
    [1, 1, "e"],
    [2, 1, "s"],
    [3, 2, "e"],
    [4, 2, "s"],
    [4, 3, "s"],
    [1, 6, "e"],
    [2, 4, "s"],
    [3, 4, "e"],
    [3, 4, "s"],
    [6, 4, "s"],
    [6, 1, "s"],
    [7, 0, "e"],
    [7, 1, "e"],
    [7, 6, "e"],
    [7, 5, "e"],
    [5, 3, "e"],
    [5, 3, "s"],
    [5, 2, "s"],
    [3, 1, "s"],
    [1, 0, "e"],
    [2, 5, "w"],
  ],
  9,
  7,
);

/** Traced from the Rock C hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 38 is that picture's square count. */
const rockC = traced(
  [
    ["p-weapons", "Weapons", "weapons", 0, 0, 2, 2],
    ["p-rch0", "Hall", null, 3, 0, 1, 1],
    ["p-rch1", "Hall", null, 4, 0, 2, 1],
    ["p-rch2", "Hall", null, 6, 0, 2, 1],
    ["p-rc4", "Hall", null, 8, 0, 1, 1],
    ["p-rch3", "Hall", null, 3, 1, 1, 2],
    ["p-doors", "Doors", "doors", 5, 1, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 7, 1, 1, 2],
    ["p-pilot", "Piloting", "pilot", 8, 1, 1, 1],
    ["p-engines", "Engines", "engines", 0, 2, 2, 2],
    ["p-rch4", "Hall", null, 3, 3, 1, 2],
    ["p-rc11", "Hall", null, 5, 3, 1, 2],
    ["p-rch5", "Hall", null, 7, 3, 1, 2],
    ["p-sensors", "Sensors", "sensors", 0, 4, 2, 2],
    ["p-rch6", "Hall", null, 2, 5, 2, 1],
    ["p-rch7", "Hall", null, 4, 5, 2, 1],
    ["p-rch8", "Hall", null, 6, 5, 2, 1],
    ["p-rch9", "Hall", null, 8, 5, 1, 1],
  ],
  [
    [0, 1, "s"],
    [0, 3, "s"],
    [1, 5, "e"],
    [3, 5, "e"],
    [3, 4, "s"],
    [3, 2, "s"],
    [3, 0, "e"],
    [3, 0, "s"],
    [5, 0, "e"],
    [5, 0, "s"],
    [5, 2, "s"],
    [5, 4, "s"],
    [5, 5, "e"],
    [7, 5, "e"],
    [7, 4, "s"],
    [7, 2, "s"],
    [7, 0, "e"],
    [7, 0, "s"],
    [0, 2, "w"],
    [0, 3, "w"],
    [3, 4, "e"],
    [3, 3, "e"],
    [3, 2, "e"],
    [3, 1, "e"],
    [5, 1, "e"],
    [5, 2, "e"],
    [5, 3, "e"],
    [5, 4, "e"],
    [7, 3, "e"],
    [7, 2, "e"],
    [1, 0, "e"],
  ],
  9,
  6,
);

/** Traced from the Engi C hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 37 is that picture's square count. */
const engiC = traced(
  [
    ["p-oxygen", "Oxygen", "oxygen", 0, 0, 1, 2],
    ["p-ech0", "Hall", null, 1, 0, 1, 2],
    ["p-ech1", "Hall", null, 2, 0, 1, 2],
    ["p-ech2", "Hall", null, 3, 0, 1, 2],
    ["p-ech3", "Hall", null, 4, 0, 1, 2],
    ["p-drones", "Drones", null, 5, 0, 1, 2],
    ["p-engines", "Engines", "engines", 6, 1, 2, 2],
    ["p-sensors", "Sensors", "sensors", 1, 2, 2, 2],
    ["p-shields", "Shields", "shields", 4, 3, 2, 2],
    ["p-ech4", "Hall", null, 6, 3, 1, 2],
    ["p-ech5", "Hall", null, 0, 4, 1, 1],
    ["p-ech6", "Hall", null, 2, 4, 1, 1],
    ["p-pilot", "Piloting", "pilot", 0, 5, 1, 1],
    ["p-ech7", "Hall", null, 1, 5, 2, 1],
    ["p-weapons", "Weapons", "weapons", 3, 5, 2, 1],
    ["p-ech8", "Hall", null, 4, 6, 2, 1],
    ["p-doors", "Doors", "doors", 6, 6, 2, 1],
  ],
  [
    [0, 1, "e"],
    [1, 1, "e"],
    [1, 1, "s"],
    [2, 3, "s"],
    [2, 4, "s"],
    [2, 5, "e"],
    [0, 5, "e"],
    [4, 5, "s"],
    [6, 2, "s"],
    [5, 1, "e"],
    [3, 1, "e"],
    [4, 1, "e"],
    [5, 4, "e"],
    [5, 6, "e"],
    [2, 1, "e"],
    [2, 1, "s"],
    [2, 3, "e"],
    [4, 4, "w"],
    [4, 0, "n"],
    [3, 0, "n"],
    [2, 0, "n"],
    [5, 6, "s"],
    [7, 6, "e"],
  ],
  8,
  7,
);

/** Traced from the Federation A hangar picture, including which orange bar sits on which wall. 36 is that picture's square count. The cruiser page states no square count. The engine pods beside the floor are hull. */
const fedA = traced(
  [
    ["p-fah0", "Hall", null, 0, 0, 1, 2],
    ["p-fah1", "Hall", null, 1, 1, 2, 1],
    ["p-fah2", "Hall", null, 2, 2, 2, 1],
    ["p-doors", "Doors", "doors", 4, 2, 1, 2],
    ["p-engines", "Engines", "engines", 1, 3, 2, 2],
    ["p-medbay", "Medbay", "medbay", 5, 3, 2, 2],
    ["p-shields", "Shields", "shields", 7, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 9, 3, 1, 2],
    ["p-weapons", "Weapons", "weapons", 10, 3, 2, 1],
    ["p-fah3", "Hall", null, 3, 4, 1, 1],
    ["p-oxygen", "Oxygen", "oxygen", 4, 4, 1, 2],
    ["p-fah4", "Hall", null, 10, 4, 2, 1],
    ["p-fah5", "Hall", null, 1, 5, 1, 1],
    ["p-fah6", "Hall", null, 2, 5, 2, 1],
    ["p-fah7", "Hall", null, 0, 6, 1, 2],
    ["p-fah8", "Hall", null, 1, 6, 2, 1],
  ],
  [
    [0, 1, "e"],
    [2, 1, "s"],
    [2, 2, "s"],
    [2, 4, "e"],
    [2, 4, "s"],
    [2, 5, "s"],
    [0, 6, "e"],
    [3, 5, "e"],
    [4, 4, "e"],
    [4, 3, "e"],
    [6, 4, "e"],
    [8, 3, "e"],
    [9, 3, "e"],
    [9, 4, "e"],
    [3, 2, "e"],
    [0, 0, "w"],
    [0, 1, "w"],
    [0, 6, "w"],
    [11, 4, "e"],
    [11, 3, "e"],
  ],
  12,
  8,
);

/** Traced from the Federation B hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 37 is that picture's square count. The chair is the left room. The C console is the nose. The middle room on that deck has no console. */
const fedB = traced(
  [
    ["p-fbh0", "Hall", null, 0, 0, 2, 2],
    ["p-fbh1", "Hall", null, 2, 0, 1, 1],
    ["p-fbh2", "Hall", null, 2, 1, 1, 2],
    ["p-fbh3", "Hall", null, 11, 1, 1, 1],
    ["p-fbh4", "Hall", null, 3, 2, 2, 1],
    ["p-fbh5", "Hall", null, 9, 2, 2, 1],
    ["p-fbh6", "Hall", null, 11, 2, 1, 1],
    ["p-pilot", "Piloting", "pilot", 1, 3, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 4, 3, 2, 1],
    ["p-fbh10", "Hall", null, 6, 3, 2, 1],
    ["p-medbay", "Medbay", "medbay", 8, 3, 2, 1],
    ["p-fbh7", "Hall", null, 2, 4, 1, 2],
    ["p-weapons", "Weapons", "weapons", 3, 4, 2, 1],
    ["p-fbh8", "Hall", null, 9, 4, 2, 1],
    ["p-shields", "Shields", "shields", 11, 4, 1, 2],
    ["p-engines", "Engines", "engines", 0, 5, 2, 2],
    ["p-fbh9", "Hall", null, 2, 6, 1, 2],
    ["p-doors", "Doors", "doors", 0, 7, 2, 1],
  ],
  [
    [1, 1, "e"],
    [2, 0, "s"],
    [2, 2, "e"],
    [2, 2, "s"],
    [2, 3, "s"],
    [2, 4, "e"],
    [2, 5, "s"],
    [1, 7, "e"],
    [1, 5, "e"],
    [4, 3, "s"],
    [4, 2, "s"],
    [5, 3, "e"],
    [7, 3, "e"],
    [9, 3, "s"],
    [9, 2, "s"],
    [10, 2, "e"],
    [10, 4, "e"],
    [2, 0, "e"],
    [2, 6, "e"],
    [2, 7, "e"],
    [6, 3, "n"],
    [6, 3, "s"],
    [7, 3, "n"],
    [7, 3, "s"],
  ],
  12,
  8,
);

/** Traced from the Federation C hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 32 is that picture's square count. */
const fedC = traced(
  [
    ["p-shields", "Shields", "shields", 1, 0, 2, 1],
    ["p-fch0", "Hall", null, 3, 0, 2, 1],
    ["p-pilot", "Piloting", "pilot", 11, 0, 1, 2],
    ["p-engines", "Engines", "engines", 1, 1, 1, 1],
    ["p-fch1", "Hall", null, 2, 1, 1, 2],
    ["p-fch2", "Hall", null, 4, 1, 1, 2],
    ["p-tele", "Teleporter", null, 5, 1, 2, 1],
    ["p-weapons", "Weapons", "weapons", 7, 1, 2, 2],
    ["p-artillery", "Artillery", null, 9, 1, 2, 1],
    ["p-fch3", "Hall", null, 1, 2, 1, 1],
    ["p-oxygen", "Oxygen", "oxygen", 5, 2, 2, 1],
    ["p-doors", "Doors", "doors", 9, 2, 2, 1],
    ["p-fch4", "Hall", null, 11, 2, 1, 2],
    ["p-clone", "Clone Bay", null, 2, 3, 1, 2],
    ["p-fch5", "Hall", null, 3, 3, 2, 1],
    ["p-fch6", "Hall", null, 0, 4, 1, 1],
    ["p-fch7", "Hall", null, 1, 4, 1, 1],
  ],
  [
    [1, 0, "s"],
    [1, 1, "e"],
    [2, 3, "e"],
    [0, 4, "e"],
    [4, 2, "e"],
    [4, 2, "s"],
    [4, 1, "e"],
    [4, 0, "s"],
    [6, 1, "e"],
    [6, 2, "e"],
    [8, 2, "e"],
    [8, 1, "e"],
    [10, 1, "e"],
    [10, 2, "e"],
    [2, 0, "e"],
    [1, 0, "w"],
    [1, 2, "s"],
    [0, 4, "w"],
    [11, 3, "e"],
    [11, 3, "s"],
    [11, 3, "w"],
    [11, 0, "n"],
    [11, 0, "e"],
    [11, 0, "w"],
  ],
  12,
  5,
);

/** Traced from the Zoltan A hangar picture, including which bar sits on which wall. 45 is that picture's square count. The cruiser page states no square count. The forward floor is tinted by the hangar lamp, and that cell is still a room. */
const zoltanA = traced(
  [
    ["p-weapons", "Weapons", "weapons", 1, 0, 2, 1],
    ["p-zah0", "Hall", null, 3, 0, 1, 2],
    ["p-zah1", "Hall", null, 1, 1, 2, 1],
    ["p-zah2", "Hall", null, 8, 1, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 9, 1, 2, 1],
    ["p-zah3", "Hall", null, 3, 2, 2, 1],
    ["p-zah4", "Hall", null, 5, 2, 2, 1],
    ["p-zah5", "Hall", null, 7, 2, 1, 2],
    ["p-medbay", "Medbay", "medbay", 9, 2, 2, 2],
    ["p-zah6", "Hall", null, 4, 3, 1, 2],
    ["p-zah7", "Hall", null, 8, 3, 1, 2],
    ["p-zah8", "Hall", null, 10, 4, 2, 1],
    ["p-engines", "Engines", "engines", 0, 5, 2, 2],
    ["p-doors", "Doors", "doors", 2, 5, 2, 2],
    ["p-shields", "Shields", "shields", 4, 5, 2, 2],
    ["p-zah9", "Hall", null, 6, 5, 2, 2],
    ["p-zah10", "Hall", null, 9, 5, 2, 1],
    ["p-pilot", "Piloting", "pilot", 12, 4, 1, 1],
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
    [12, 4, "n"],
  ],
  13,
  7,
);

/** Traced from the Zoltan B hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 36 is that picture's square count. The C console is the upper-right room. */
const zoltanB = traced(
  [
    ["p-medbay", "Medbay", "medbay", 6, 0, 2, 2],
    ["p-zbh0", "Hall", null, 8, 0, 2, 1],
    ["p-zbh1", "Hall", null, 10, 0, 1, 2],
    ["p-engines", "Engines", "engines", 2, 1, 1, 1],
    ["p-zbh2", "Hall", null, 4, 1, 1, 2],
    ["p-shields", "Shields", "shields", 8, 1, 2, 2],
    ["p-zbh3", "Hall", null, 2, 2, 1, 1],
    ["p-zbh4", "Hall", null, 6, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 10, 2, 1, 2],
    ["p-doors", "Doors", "doors", 0, 3, 2, 1],
    ["p-zbh5", "Hall", null, 2, 3, 2, 1],
    ["p-zbh6", "Hall", null, 4, 3, 2, 1],
    ["p-zbh7", "Hall", null, 8, 3, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 2, 4, 1, 2],
    ["p-weapons", "Weapons", "weapons", 4, 4, 1, 2],
    ["p-zbh9", "Hall", null, 6, 4, 1, 1],
    ["p-zbh8", "Hall", null, 6, 5, 1, 1],
  ],
  [
    [6, 1, "s"],
    [6, 3, "s"],
    [5, 3, "e"],
    [4, 3, "s"],
    [4, 2, "s"],
    [3, 3, "e"],
    [2, 3, "s"],
    [2, 2, "s"],
    [1, 3, "e"],
    [7, 3, "e"],
    [8, 2, "s"],
    [8, 0, "s"],
    [9, 0, "e"],
    [9, 0, "s"],
    [9, 2, "s"],
    [9, 3, "e"],
    [7, 0, "e"],
    [0, 3, "w"],
    [8, 3, "s"],
    [8, 0, "n"],
    [9, 0, "n"],
    [9, 3, "s"],
  ],
  11,
  6,
);

/** Traced from the Zoltan C hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 42 is that picture's square count. The nozzle is the aft cell, the C is beside it, and the chair is the pink nose. */
const zoltanC = traced(
  [
    ["p-shields", "Shields", "shields", 1, 0, 2, 2],
    ["p-engines", "Engines", "engines", 0, 1, 1, 1],
    ["p-oxygen", "Oxygen", "oxygen", 8, 1, 2, 1],
    ["p-zch1", "Hall", null, 10, 1, 1, 1],
    ["p-battery", "Backup Battery", null, 2, 2, 2, 1],
    ["p-zch2", "Hall", null, 4, 2, 2, 1],
    ["p-zch11", "Hall", null, 6, 2, 2, 1],
    ["p-zch3", "Hall", null, 9, 2, 1, 2],
    ["p-zch4", "Hall", null, 5, 3, 2, 2],
    ["p-zch5", "Hall", null, 7, 4, 2, 1],
    ["p-zch6", "Hall", null, 9, 4, 2, 1],
    ["p-zch7", "Hall", null, 0, 5, 1, 2],
    ["p-zch8", "Hall", null, 1, 5, 2, 1],
    ["p-zch9", "Hall", null, 3, 5, 2, 1],
    ["p-drones", "Drones", null, 5, 5, 2, 2],
    ["p-zch10", "Hall", null, 8, 5, 2, 1],
    ["p-weapons", "Weapons", "weapons", 1, 6, 2, 1],
    ["p-doors", "Doors", "doors", 3, 6, 2, 1],
    ["p-pilot", "Piloting", "pilot", 11, 3, 1, 2],
  ],
  [
    [2, 1, "s"],
    [3, 2, "e"],
    [5, 2, "e"],
    [5, 2, "s"],
    [5, 4, "s"],
    [4, 6, "e"],
    [2, 5, "e"],
    [0, 6, "e"],
    [0, 5, "e"],
    [2, 6, "e"],
    [4, 5, "e"],
    [6, 4, "e"],
    [6, 4, "s"],
    [8, 4, "e"],
    [8, 4, "s"],
    [9, 4, "s"],
    [9, 3, "s"],
    [9, 1, "s"],
    [6, 2, "s"],
    [1, 0, "w"],
    [5, 3, "w"],
    [5, 4, "w"],
    [8, 5, "s"],
    [9, 5, "s"],
    [8, 1, "w"],
    [10, 4, "e"],
  ],
  12,
  7,
);

/** Traced from the Mantis A hangar picture, including which orange bar sits on which wall. 48 is that picture's square count. The cruiser page states no square count. */
const mantisA = traced(
  [
    ["p-weapons", "Weapons", "weapons", 0, 0, 2, 1],
    ["p-doors", "Doors", "doors", 2, 0, 2, 1],
    ["p-mah0", "Hall", null, 1, 1, 2, 2],
    ["p-medbay", "Medbay", "medbay", 8, 1, 2, 2],
    ["p-mah1", "Hall", null, 5, 2, 2, 1],
    ["p-mah2", "Hall", null, 1, 3, 1, 2],
    ["p-engines", "Engines", "engines", 2, 3, 2, 2],
    ["p-mah3", "Hall", null, 4, 3, 1, 2],
    ["p-shields", "Shields", "shields", 5, 3, 1, 2],
    ["p-mah4", "Hall", null, 6, 3, 2, 2],
    ["p-mah5", "Hall", null, 8, 3, 2, 2],
    ["p-mah6", "Hall", null, 1, 5, 2, 2],
    ["p-mah7", "Hall", null, 5, 5, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 8, 5, 2, 2],
    ["p-pilot", "Piloting", "pilot", 0, 7, 2, 2],
    ["p-mah8", "Hall", null, 2, 7, 2, 1],
  ],
  [
    [1, 0, "s"],
    [2, 0, "s"],
    [2, 2, "s"],
    [5, 2, "s"],
    [6, 2, "s"],
    [9, 2, "s"],
    [1, 3, "e"],
    [3, 3, "e"],
    [1, 4, "e"],
    [7, 3, "e"],
    [2, 4, "s"],
    [4, 4, "e"],
    [5, 4, "s"],
    [6, 4, "s"],
    [9, 4, "s"],
    [1, 6, "s"],
    [2, 6, "s"],
    [5, 2, "n"],
    [6, 2, "n"],
    [9, 2, "e"],
    [1, 3, "w"],
    [1, 4, "w"],
    [5, 5, "s"],
    [6, 5, "s"],
    [9, 5, "e"],
  ],
  10,
  9,
);

/** Traced from the Mantis B hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 40 is that picture's square count. */
const mantisB = traced(
  [
    ["p-weapons", "Weapons", "weapons", 0, 0, 2, 1],
    ["p-mbh0", "Hall", null, 2, 0, 1, 2],
    ["p-medbay", "Medbay", "medbay", 1, 2, 2, 2],
    ["p-mbh1", "Hall", null, 3, 2, 2, 1],
    ["p-mbh2", "Hall", null, 5, 2, 2, 1],
    ["p-engines", "Engines", "engines", 7, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 9, 2, 1, 2],
    ["p-mbh3", "Hall", null, 5, 3, 1, 2],
    ["p-tele", "Teleporter", null, 1, 4, 2, 2],
    ["p-shields", "Shields", "shields", 7, 4, 2, 2],
    ["p-mbh4", "Hall", null, 9, 4, 1, 2],
    ["p-mbh5", "Hall", null, 3, 5, 2, 1],
    ["p-mbh6", "Hall", null, 5, 5, 2, 1],
    ["p-mbh7", "Hall", null, 2, 6, 1, 2],
    ["p-doors", "Doors", "doors", 0, 7, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 0, 8, 2, 1],
  ],
  [
    [1, 0, "e"],
    [2, 1, "s"],
    [2, 2, "e"],
    [2, 5, "e"],
    [2, 5, "s"],
    [1, 7, "e"],
    [1, 7, "s"],
    [0, 7, "s"],
    [4, 5, "e"],
    [5, 4, "s"],
    [5, 2, "s"],
    [4, 2, "e"],
    [6, 2, "e"],
    [7, 3, "s"],
    [8, 5, "e"],
    [8, 2, "e"],
    [6, 5, "e"],
    [1, 3, "s"],
    [0, 0, "n"],
    [1, 0, "n"],
    [3, 5, "s"],
    [4, 5, "s"],
    [4, 2, "n"],
    [3, 2, "n"],
  ],
  10,
  9,
);

/** Traced from the Mantis C hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 42 is that picture's square count. */
const mantisC = traced(
  [
    ["p-engines", "Engines", "engines", 0, 0, 2, 1],
    ["p-mch0", "Hall", null, 2, 0, 2, 1],
    ["p-mch1", "Hall", null, 1, 1, 2, 2],
    ["p-mch2", "Hall", null, 3, 2, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 7, 2, 1, 2],
    ["p-mch3", "Hall", null, 8, 2, 2, 1],
    ["p-pilot", "Piloting", "pilot", 3, 3, 1, 2],
    ["p-mch4", "Hall", null, 4, 3, 1, 2],
    ["p-doors", "Doors", "doors", 5, 3, 2, 1],
    ["p-weapons", "Weapons", "weapons", 5, 4, 2, 1],
    ["p-mch5", "Hall", null, 7, 4, 1, 2],
    ["p-mch6", "Hall", null, 1, 5, 2, 2],
    ["p-mch7", "Hall", null, 3, 5, 2, 1],
    ["p-tele", "Teleporter", null, 8, 5, 2, 2],
    ["p-mch8", "Hall", null, 0, 7, 2, 2],
    ["p-mch9", "Hall", null, 2, 7, 2, 2],
  ],
  [
    [1, 0, "e"],
    [2, 2, "e"],
    [3, 2, "s"],
    [3, 4, "s"],
    [2, 5, "e"],
    [2, 6, "s"],
    [1, 7, "e"],
    [4, 4, "e"],
    [4, 4, "s"],
    [6, 3, "e"],
    [7, 3, "s"],
    [7, 2, "e"],
    [7, 5, "e"],
    [6, 4, "e"],
    [4, 3, "e"],
    [4, 2, "s"],
    [2, 0, "s"],
    [3, 2, "n"],
    [3, 5, "s"],
    [2, 8, "s"],
    [3, 8, "e"],
    [3, 8, "s"],
    [4, 5, "s"],
    [7, 2, "n"],
    [9, 2, "e"],
    [7, 5, "s"],
    [9, 5, "e"],
    [4, 2, "n"],
  ],
  10,
  9,
);

/** Traced from the Crystal A hangar picture, including which orange bar sits on which wall. The cruiser page states no square count. 35 is that picture's square count. The chair is the small upper room. The C console is the lower-left cell. The tall cell beside that C has no console, and the picture has no engines nozzle, so that plate stays Hall. Its id is still the engines seat. */
const crystalA = traced(
  [
    ["p-weapons", "Weapons", "weapons", 2, 0, 2, 1],
    ["p-doors", "Doors", "doors", 9, 0, 1, 2],
    ["p-cah0", "Hall", null, 1, 1, 2, 2],
    ["p-cah1", "Hall", null, 7, 1, 1, 2],
    ["p-pilot", "Piloting", "pilot", 3, 2, 1, 1],
    ["p-cah2", "Hall", null, 8, 2, 2, 2],
    ["p-cah3", "Hall", null, 2, 3, 1, 1],
    ["p-cah4", "Hall", null, 3, 3, 1, 1],
    ["p-shields", "Shields", "shields", 0, 4, 1, 1],
    ["p-engines", "Hall", null, 1, 4, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 2, 4, 1, 1],
    ["p-medbay", "Medbay", "medbay", 8, 4, 2, 2],
    ["p-cah5", "Hall", null, 2, 5, 2, 1],
    ["p-cah6", "Hall", null, 4, 5, 2, 1],
    ["p-cah7", "Hall", null, 6, 5, 2, 1],
    ["p-cah8", "Hall", null, 1, 6, 2, 2],
  ],
  [
    [2, 0, "s"],
    [2, 2, "e"],
    [2, 2, "s"],
    [2, 4, "s"],
    [2, 5, "s"],
    [1, 5, "s"],
    [3, 5, "e"],
    [5, 5, "e"],
    [7, 5, "e"],
    [8, 3, "s"],
    [7, 2, "e"],
    [9, 1, "s"],
    [1, 4, "e"],
    [4, 5, "n"],
    [4, 5, "s"],
    [5, 5, "n"],
    [5, 5, "s"],
    [9, 1, "e"],
    [9, 0, "e"],
    [9, 3, "e"],
    [9, 4, "e"],
    [0, 4, "w"],
    [1, 1, "w"],
  ],
  10,
  8,
);

/** Traced from the Crystal B hangar picture, including which orange bar sits on which wall. Two edge cells on that picture are hull, not rooms. The cruiser page states no square count. 44 is that picture's square count. */
const crystalB = traced(
  [
    ["p-cbh0", "Hall", null, 3, 0, 1, 2],
    ["p-sensors", "Sensors", "sensors", 4, 0, 2, 2],
    ["p-cbh1", "Hall", null, 12, 0, 1, 2],
    ["p-engines", "Engines", "engines", 0, 1, 2, 2],
    ["p-tele", "Teleporter", null, 2, 2, 2, 2],
    ["p-weapons", "Weapons", "weapons", 7, 2, 2, 2],
    ["p-cbh2", "Hall", null, 9, 2, 2, 1],
    ["p-cbh3", "Hall", null, 11, 2, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 1, 4, 1, 2],
    ["p-medbay", "Medbay", "medbay", 2, 4, 2, 2],
    ["p-cbh4", "Hall", null, 4, 4, 2, 1],
    ["p-cbh5", "Hall", null, 6, 4, 2, 1],
    ["p-cbh6", "Hall", null, 3, 6, 2, 1],
    ["p-cbh7", "Hall", null, 5, 6, 2, 2],
    ["p-doors", "Doors", "doors", 7, 6, 2, 1],
    ["p-cbh8", "Hall", null, 9, 6, 1, 1],
    ["p-pilot", "Piloting", "pilot", 9, 7, 1, 1],
  ],
  [
    [3, 0, "e"],
    [3, 1, "e"],
    [3, 1, "s"],
    [3, 3, "s"],
    [3, 4, "e"],
    [3, 5, "s"],
    [4, 6, "e"],
    [6, 6, "e"],
    [8, 6, "e"],
    [1, 5, "e"],
    [5, 4, "e"],
    [7, 3, "s"],
    [8, 2, "e"],
    [10, 2, "e"],
    [12, 1, "s"],
    [1, 2, "e"],
    [3, 0, "n"],
    [3, 6, "w"],
    [7, 4, "e"],
    [12, 2, "e"],
  ],
  13,
  8,
);

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

/** Traced from the Slug A hangar picture, including which gray bar sits on which wall. 40 is that picture's square count. The cruiser page states no square count. */
const slugA = traced(
  [
    ["p-doors", "Doors", "doors", 1, 0, 1, 2],
    ["p-sah0", "Hall", null, 2, 0, 1, 2],
    ["p-sah1", "Hall", null, 3, 0, 2, 1],
    ["p-medbay", "Medbay", "medbay", 4, 1, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 6, 1, 1, 1],
    ["p-weapons", "Weapons", "weapons", 2, 2, 2, 2],
    ["p-sah2", "Hall", null, 6, 2, 1, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 2],
    ["p-sah3", "Hall", null, 5, 3, 2, 1],
    ["p-shields", "Shields", "shields", 7, 3, 1, 2],
    ["p-sah4", "Hall", null, 3, 4, 1, 2],
    ["p-sah5", "Hall", null, 5, 4, 1, 2],
    ["p-sah6", "Hall", null, 6, 5, 1, 2],
    ["p-sah7", "Hall", null, 1, 6, 1, 2],
    ["p-pilot", "Piloting", "pilot", 2, 6, 2, 2],
    ["p-sah8", "Hall", null, 4, 6, 2, 2],
  ],
  [
    [1, 0, "e"],
    [2, 0, "e"],
    [4, 0, "s"],
    [2, 1, "s"],
    [3, 2, "e"],
    [5, 2, "e"],
    [1, 3, "e"],
    [5, 2, "s"],
    [3, 3, "s"],
    [5, 3, "s"],
    [6, 3, "e"],
    [3, 5, "s"],
    [5, 5, "e"],
    [5, 5, "s"],
    [1, 7, "e"],
    [3, 7, "e"],
    [1, 0, "w"],
    [1, 1, "w"],
    [1, 6, "w"],
    [1, 7, "w"],
  ],
  8,
  8,
);

/** Traced from the Slug C hangar picture, including which gray bar sits on which wall. 42 is that picture's square count. The cruiser page states no square count. */
const slugC = traced(
  [
    ["p-mind", "Mind Control", null, 1, 0, 2, 2],
    ["p-sch0", "Hall", null, 3, 0, 2, 1],
    ["p-sch1", "Hall", null, 5, 0, 1, 2],
    ["p-oxygen", "Oxygen", "oxygen", 3, 1, 2, 1],
    ["p-sch2", "Hall", null, 6, 1, 1, 2],
    ["p-sch3", "Hall", null, 1, 2, 2, 1],
    ["p-engines", "Engines", "engines", 0, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 2, 3, 2, 2],
    ["p-shields", "Shields", "shields", 4, 3, 1, 2],
    ["p-weapons", "Weapons", "weapons", 6, 3, 2, 2],
    ["p-clone", "Clone Bay", null, 1, 5, 2, 1],
    ["p-sch4", "Hall", null, 6, 5, 1, 2],
    ["p-hack", "Hacking", null, 1, 6, 2, 2],
    ["p-sch5", "Hall", null, 3, 6, 2, 1],
    ["p-sch6", "Hall", null, 5, 6, 1, 2],
    ["p-doors", "Doors", "doors", 3, 7, 2, 1],
  ],
  [
    [2, 0, "e"],
    [4, 0, "e"],
    [1, 1, "s"],
    [2, 1, "e"],
    [4, 1, "e"],
    [5, 1, "e"],
    [1, 2, "s"],
    [6, 2, "s"],
    [1, 3, "e"],
    [3, 3, "e"],
    [1, 4, "e"],
    [1, 4, "s"],
    [3, 4, "e"],
    [6, 4, "s"],
    [1, 5, "s"],
    [2, 6, "e"],
    [4, 6, "e"],
    [5, 6, "e"],
    [2, 7, "e"],
    [4, 7, "e"],
    [1, 0, "w"],
    [5, 0, "e"],
    [5, 0, "n"],
    [1, 1, "w"],
    [1, 2, "w"],
    [1, 5, "w"],
    [1, 6, "w"],
    [1, 7, "w"],
  ],
  8,
  8,
);

/** Traced from the Slug B hangar picture, including which gray bar sits on which wall. 52 is that picture's square count. The cruiser page states no square count. */
const slugB = traced(
  [
    ["p-sbh0", "Hall", null, 4, 0, 1, 2],
    ["p-engines", "Engines", "engines", 6, 0, 2, 2],
    ["p-tele", "Teleporter", null, 5, 1, 1, 2],
    ["p-sbh1", "Hall", null, 0, 2, 2, 1],
    ["p-sbh2", "Hall", null, 2, 2, 2, 2],
    ["p-sbh3", "Hall", null, 8, 2, 2, 1],
    ["p-sbh4", "Hall", null, 10, 2, 2, 2],
    ["p-sbh5", "Hall", null, 0, 3, 1, 2],
    ["p-sbh6", "Hall", null, 4, 3, 2, 2],
    ["p-sbh7", "Hall", null, 6, 3, 2, 1],
    ["p-pilot", "Piloting", "pilot", 8, 3, 1, 2],
    ["p-shields", "Shields", "shields", 2, 4, 2, 2],
    ["p-weapons", "Weapons", "weapons", 10, 4, 2, 2],
    ["p-sbh8", "Hall", null, 0, 5, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 5, 5, 1, 2],
    ["p-sbh9", "Hall", null, 8, 5, 2, 1],
    ["p-sbh10", "Hall", null, 4, 6, 1, 2],
    ["p-sbh11", "Hall", null, 6, 6, 2, 2],
    ["p-doors", "Doors", "doors", 6, 8, 2, 1],
  ],
  [
    [4, 0, "w"],
    [6, 0, "n"],
    [4, 1, "e"],
    [4, 1, "w"],
    [5, 1, "e"],
    [0, 2, "s"],
    [1, 2, "e"],
    [5, 2, "s"],
    [8, 2, "n"],
    [8, 2, "s"],
    [9, 2, "e"],
    [9, 2, "n"],
    [0, 3, "w"],
    [2, 3, "s"],
    [3, 3, "e"],
    [5, 3, "e"],
    [7, 3, "e"],
    [0, 4, "s"],
    [0, 4, "w"],
    [3, 4, "e"],
    [5, 4, "s"],
    [8, 4, "s"],
    [1, 5, "e"],
    [8, 5, "s"],
    [9, 5, "e"],
    [9, 5, "s"],
    [4, 6, "e"],
    [4, 6, "w"],
    [5, 6, "e"],
    [4, 7, "w"],
    [6, 7, "s"],
  ],
  12,
  9,
);

/** Traced from the Lanius B hangar picture, including which orange bar sits on which wall. 46 is that picture's square count. The cruiser page states no square count. */
const laniusB = traced(
  [
    ["p-lb0", "Hall", null, 0, 0, 2, 2],
    ["p-lb1", "Hall", null, 2, 0, 2, 1],
    ["p-shields", "Shields", "shields", 5, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 2, 1, 2, 1],
    ["p-lb2", "Hall", null, 7, 1, 2, 1],
    ["p-lb3", "Hall", null, 5, 2, 2, 2],
    ["p-engines", "Engines", "engines", 3, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 7, 3, 1, 2],
    ["p-lb4", "Hall", null, 5, 4, 2, 2],
    ["p-doors", "Doors", "doors", 0, 6, 2, 2],
    ["p-clone", "Clone Bay", null, 2, 6, 2, 1],
    ["p-weapons", "Weapons", "weapons", 5, 6, 2, 2],
    ["p-lb5", "Hall", null, 7, 6, 2, 1],
    ["p-lb6", "Hall", null, 2, 7, 2, 1],
    ["p-lb7", "Doors", null, 2, 8, 2, 1],
    ["p-mind", "Mind Control", null, 4, 8, 2, 1],
  ],
  [
    [1, 0, "e"],
    [2, 0, "s"],
    [3, 0, "n"],
    [5, 0, "n"],
    [0, 1, "s"],
    [0, 1, "w"],
    [1, 1, "e"],
    [6, 1, "e"],
    [6, 1, "s"],
    [7, 1, "n"],
    [7, 1, "s"],
    [8, 1, "n"],
    [8, 1, "s"],
    [4, 3, "e"],
    [4, 3, "n"],
    [6, 3, "e"],
    [4, 4, "e"],
    [4, 4, "s"],
    [6, 4, "e"],
    [6, 5, "s"],
    [0, 6, "n"],
    [0, 6, "w"],
    [1, 6, "e"],
    [2, 6, "s"],
    [6, 6, "e"],
    [7, 6, "n"],
    [7, 6, "s"],
    [8, 6, "n"],
    [8, 6, "s"],
    [1, 7, "e"],
    [3, 7, "s"],
    [5, 7, "s"],
    [3, 8, "e"],
  ],
  9,
  9,
);

/** Traced from the Lanius A hangar picture, including which orange bar sits on which wall. 42 is that picture's square count. The cruiser page states no square count. The clone-bay tube is not in the picture, so that room is not titled. */
const laniusA = traced(
  [
    ["p-sensors", "Sensors", "sensors", 0, 0, 2, 2],
    ["p-la0", "Hall", null, 2, 0, 2, 1],
    ["p-oxygen", "Oxygen", "oxygen", 4, 0, 2, 1],
    ["p-hack", "Hacking", null, 6, 0, 1, 1],
    ["p-la1", "Hall", null, 2, 1, 2, 1],
    ["p-shields", "Shields", "shields", 4, 1, 2, 2],
    ["p-la2", "Hall", null, 6, 1, 1, 1],
    ["p-la3", "Hall", null, 7, 1, 1, 2],
    ["p-engines", "Engines", "engines", 3, 3, 2, 2],
    ["p-pilot", "Piloting", "pilot", 7, 3, 1, 2],
    ["p-weapons", "Weapons", "weapons", 4, 5, 2, 2],
    ["p-la4", "Hall", null, 7, 5, 1, 2],
    ["p-la5", "Hall", null, 0, 6, 2, 2],
    ["p-la6", "Hall", null, 2, 6, 2, 1],
    ["p-la7", "Hall", null, 6, 6, 1, 2],
    ["p-la8", "Hall", null, 2, 7, 2, 1],
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

/** Traced from the Stealth C hangar picture, including which orange bar sits on which wall. 39 is that picture's square count. The cruiser page states no square count. */
const stealthC = traced(
  [
    ["p-doors", "Doors", "doors", 2, 0, 2, 2],
    ["p-oxygen", "Oxygen", "oxygen", 4, 0, 2, 1],
    ["p-sth0", "Hall", null, 5, 1, 1, 2],
    ["p-weapons", "Weapons", "weapons", 6, 1, 2, 2],
    ["p-sth1", "Hall", null, 0, 2, 2, 1],
    ["p-engines", "Engines", "engines", 2, 2, 2, 2],
    ["p-sth2", "Hall", null, 8, 2, 2, 2],
    ["p-pilot", "Piloting", "pilot", 12, 2, 1, 2],
    ["p-sth3", "Hall", null, 10, 2, 1, 1],
    ["p-sth4", "Doors", null, 0, 3, 2, 1],
    ["p-sth5", "Hall", null, 5, 3, 1, 2],
    ["p-drones", "Drones", null, 6, 3, 2, 2],
    ["p-sth6", "Hall", null, 2, 4, 2, 2],
    ["p-sth7", "Hall", null, 4, 5, 2, 1],
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
    [12, 2, "w"],
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

/** Each entry keeps its published square total. Cruiser pages do not state square counts, so the count is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text. */
export const LAYOUTS: Record<string, Layout> = {
  // Square total is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text.
  "kestrel-a": kestrelA,
  // Square total is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text.
  "kestrel-b": kestrelB,
  // Square total is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text.
  "kestrel-c": kestrelC,
  // Square total is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text.
  "engi-a": engiA,
  // Square total is the comparison already in the file header. Positions are INFERRED because the wiki picture was not text.
  "engi-b": engiB,
  // Traced from the Engi C hangar picture.
  "engi-c": engiC,
  // Traced from the Federation A hangar picture.
  "fed-a": fedA,
  // Traced from the Federation B hangar picture.
  "fed-b": fedB,
  // Traced from the Federation C hangar picture.
  "fed-c": fedC,
  // Traced from the Zoltan A hangar picture.
  "zoltan-a": zoltanA,
  // Traced from the Zoltan B hangar picture.
  "zoltan-b": zoltanB,
  // Traced from the Zoltan C hangar picture.
  "zoltan-c": zoltanC,

  // Traced from the Slug A hangar picture.
  "slug-a": slugA,
  // Traced from the Slug B hangar picture.
  "slug-b": slugB,
  // Traced from the Slug C hangar picture.
  "slug-c": slugC,
  // Traced from the Rock A hangar picture.
  "rock-a": rockA,
  // Traced from the Rock B hangar picture.
  "rock-b": rockB,
  // Traced from the Rock C hangar picture.
  "rock-c": rockC,
  // Traced from the Stealth A hangar picture.
  "stealth-a": stealthA,
  // Traced from the Stealth B hangar picture.
  "stealth-b": stealthB,

  // Traced from the Stealth C hangar picture.
  "stealth-c": stealthC,
  // Traced from the Lanius A hangar picture.
  "lanius-a": laniusA,
  // Traced from the Lanius B hangar picture.
  "lanius-b": laniusB,
  // Traced from the Mantis A hangar picture.
  "mantis-a": mantisA,
  // Traced from the Mantis B hangar picture.
  "mantis-b": mantisB,
  // Traced from the Mantis C hangar picture.
  "mantis-c": mantisC,
  // Traced from the Crystal A hangar picture.
  "crystal-a": crystalA,
  // Traced from the Crystal B hangar picture.
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
 * 3. Clone Bay only: the medical room, when Medbay is not fitted. Systems: "Clone bays and medbays are mutually
 *    exclusive: buying one replaces the other". 4. INFERRED: the first empty traced room ("Hall"/"Hold") whose
 *    square count is earliest in KIT_SQUARES, then any empty room.
 */
export function kitSeat<R extends Seat>(rooms: R[], kit: KitId, medbayLevel = 0): R | undefined {
  const held = rooms.find((r) => r.kit === kit);
  if (held) return held;
  const free = (r: R) => !r.kit && r.system === null;
  const traced = rooms.find((r) => free(r) && r.title === KIT_TITLE[kit]);
  if (traced) return traced;
  if (kit === "cradle" && medbayLevel <= 0) {
    const bay = rooms.find((r) => !r.kit && r.system === "medbay");
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

/**
 * Gives every kit on a player hull its room (`room.kit`), so weapon hits reach it (sim.ts strikeRoom -> hurtKit),
 * crew repair it (sim.ts life), and the Hard targeting list resolves it (wiki/targeting.ts). Idempotent.
 * Also undoes a Clone Bay room when the store swaps Medbay back in (Systems: "buying one replaces the other").
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
  for (const id of Object.keys(ship.kits) as KitId[]) {
    if (!ship.kits[id]) continue;
    const r = kitSeat(ship.rooms, id, medbay);
    if (r) claim(r, id);
    else growRoom(ship, id);
  }
}
