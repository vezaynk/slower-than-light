import { hullDef, marksFromDoors, roomNames } from "@stl/pack";
import type { Door, DoorMark, KitId, Room, Ship, SysId } from "./types.ts";

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
  /** The system this empty room is kept for (its pale hangar icon). It shows as a Hall until that system is bought. */
  reserve?: string;
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

const PLAYER_SYSTEMS = new Set<SysId>([
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "pilot",
  "sensors",
  "doors",
]);

const SYSTEM_TITLE: Record<string, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  medbay: "Medbay",
  weapons: "Weapons",
  pilot: "Piloting",
  sensors: "Sensors",
  doors: "Doors",
  cloaking: "Cloaking",
  teleporter: "Teleporter",
  hacking: "Hacking",
  drones: "Drones",
  mind: "Mind Control",
  clonebay: "Clone Bay",
  battery: "Backup Battery",
  artillery: "Artillery",
};

function isPlayerSystem(id: string | undefined): id is SysId {
  return id != null && PLAYER_SYSTEMS.has(id as SysId);
}

function gridSpan(rooms: { x: number; y: number; w: number; h: number }[]): {
  cols: number;
  rows: number;
} {
  let cols = 1;
  let rows = 1;
  for (const room of rooms) {
    cols = Math.max(cols, room.x + room.w);
    rows = Math.max(rows, room.y + room.h);
  }
  return { cols, rows };
}

/**
 * The loaded hull's room grid. A hull with no grid keeps the Lark fallback.
 * Room names, titles, and the rooms kept for a system the ship can buy all come from the blueprint's installs
 * (hull-fit's roomNames), as ftl.dat's layout files name nothing.
 */
export function layoutFor(id: string): Layout | undefined {
  const hull = hullDef(id);
  if (!hull?.grid || hull.grid.rooms.length === 0) return undefined;
  const grid = hull.grid;
  if (grid.rooms.every((room) => room.w === 0 && room.h === 0)) return undefined;
  const span = gridSpan(grid.rooms);
  const names = roomNames(hull);
  return {
    cols: grid.cols ?? span.cols,
    rows: grid.rows ?? span.rows,
    rooms: grid.rooms.map((room) => {
      const fitted = hull.installs?.find((item) => item.room === room.id && item.start)?.id;
      const open = hull.installs?.find((item) => item.room === room.id && !item.start)?.id;
      const system = isPlayerSystem(fitted) ? fitted : null;
      const tile: TileRoom = {
        id: names.get(room.id) ?? String(room.id),
        title: (system ? SYSTEM_TITLE[system] : undefined) ?? "Hall",
        system,
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
      };
      // A kit's room is kept for it until seatKits or seatLayout seats it, as is a room for a system the ship can buy.
      const kept = system ? undefined : (fitted ?? open);
      const reserve = kept ? SYSTEM_TITLE[kept] : undefined;
      if (reserve) tile.reserve = reserve;
      return tile;
    }),
    marks: marksFromDoors(grid),
  };
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
  const link = (ax: number, ay: number, bx: number, by: number) =>
    next.set(`${ax},${ay}`, `${bx},${by}`);
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
  cloaking: "Cloaking",
  teleporter: "Teleporter",
  hacking: "Hacking",
  drones: "Drones",
  mind: "Mind Control",
  clonebay: "Clone Bay",
  battery: "Backup Battery",
  artillery: "Artillery",
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
  teleporter: [2, 4],
  clonebay: [4, 2],
  mind: [4, 2],
  drones: [4, 2],
  cloaking: [4, 2],
  hacking: [4, 2, 1],
  battery: [2, 4],
  artillery: [2, 4],
};

type Seat = {
  id: string;
  title: string;
  system: SysId | null;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
  kit?: KitId;
  reserve?: string;
};

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
  const traced = rooms.find((r) => free(r) && r.reserve === KIT_TITLE[kit]);
  if (traced) return traced;
  if (kit === "clonebay" && medbayLevel <= 0) {
    const bay = rooms.find(
      (r) => !r.kit && (r.system === "medbay" || (r.system === null && r.reserve === "Medbay")),
    );
    if (bay) return bay;
  }
  // A room kept for another system is not free (Systems: "Each system occupies one predetermined room").
  const empty = rooms.filter(
    (r) => free(r) && !r.reserve && (r.title === "Hall" || r.title === "Hold"),
  );
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
  if (kit === "clonebay" && r.system === "medbay") r.system = null;
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
  for (const o of ship.rooms)
    if (touching(o, r)) doors.push({ a: o.id, b: r.id, open: false, hp: 0, stuck: 0 });
  ship.rooms.push(r);
  ship.doors.push(...doors);
  ship.rows = Math.max(ship.rows, y + 1);
  return r;
}

/**
 * Systems a store sells that are not kits, with the title of the pale room each hull keeps for them (the pale icons on
 * the traced hangar pictures). Stores and resources names Shields, Sensors, and "a medical system" among store stock.
 */
const BOUGHT_SYSTEMS: [SysId, string][] = [
  ["shields", "Shields"],
  ["sensors", "Sensors"],
  ["doors", "Doors"],
  ["medbay", "Medbay"],
];

/** Titles an older save used for a pale room, before that room stored `reserve`. */
const RESERVABLE_TITLE = new Set<string>([
  ...Object.values(KIT_TITLE),
  ...BOUGHT_SYSTEMS.map(([, title]) => title),
]);

/**
 * Gives every kit on a player hull its room (`room.kit`), so weapon hits reach it (sim.ts strikeRoom -> hurtKit),
 * crew repair it (sim.ts life), and the Hard targeting list resolves it (wiki/targeting.ts). Idempotent.
 * Also undoes a Clone Bay room when the store swaps Medbay back in (Systems: "buying one replaces the other"), and
 * gives a bought Shields, Sensors, Door System, or Medbay the pale room its hangar picture keeps for it.
 */
export function seatKits(ship: Ship): void {
  if (!ship.rooms || !ship.kits) return;
  const medbay = ship.systems?.medbay?.level ?? 0;
  // Older saves named the pale room after its system and did not set reserve.
  for (const r of ship.rooms) {
    if (r.system !== null || r.kit || !RESERVABLE_TITLE.has(r.title)) continue;
    r.reserve = r.title;
    r.title = "Hall";
  }
  for (const r of ship.rooms) {
    if (!r.kit || ship.kits[r.kit]) continue;
    if (r.kit === "clonebay" && medbay > 0 && !ship.rooms.some((o) => o.system === "medbay")) {
      r.system = "medbay";
      r.title = "Medbay";
    } else {
      // The system left: its room is a Hall again, still kept for it (Systems: "Each system occupies one predetermined
      // room specific to the ship").
      r.reserve = r.title;
      r.title = "Hall";
    }
    delete r.kit;
  }
  for (const [id, title] of BOUGHT_SYSTEMS) {
    if ((ship.systems?.[id]?.level ?? 0) <= 0 || ship.rooms.some((r) => r.system === id)) continue;
    // Systems: "buying one replaces the other" - the medical room is kept for Medbay and Clone Bay alike.
    const medical = (o: Room) => id === "medbay" && o.reserve === "Clone Bay";
    const r = ship.rooms.find(
      (o) => o.system === null && !o.kit && (o.reserve === title || medical(o)),
    );
    if (r) {
      r.system = id;
      r.title = title;
    }
  }
  for (const id of Object.keys(ship.kits) as KitId[]) {
    if (!ship.kits[id]) continue;
    const r = kitSeat(ship.rooms, id, medbay);
    if (r) claim(r, id);
    else growRoom(ship, id);
  }
}
