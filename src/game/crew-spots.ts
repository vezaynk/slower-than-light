/**
 * Floor tiles crew stand on, the manning terminal, medbay and clone-bay spot caps,
 * and teleporter pads. No sim import: sling and the combat tick both call this.
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

/**
 * Systems, the paragraph above "Main systems": some systems can be manned.
 * The pages that name that console or that manning bonus are Shields, Engines,
 * Weapon Control, Piloting, Sensors, and Door System.
 * Artillery Beam "does not have a console". Hacking "cannot be manned".
 * Medbay, Clone Bay, Oxygen, and the Crew Teleporter print no manning bonus.
 */
const MANNED: ReadonlySet<string> = new Set(["shields", "engines", "weapons", "pilot", "sensors", "doors"]);

export function mannableSystem(system: string | null | undefined): boolean {
  return !!system && MANNED.has(system);
}

/**
 * The terminal tile.
 * Door System room picture: "(console on the right)".
 * INFERRED: every other mannable room uses that same corner, the rightmost floor tile of the top row.
 * Artillery rooms stay system "weapons" for targeting, and Artillery Beam has no console.
 */
export function roomConsole(room: Box, hull?: { flagship?: unknown } | null): { x: number; y: number } | null {
  if (hull?.flagship && room.system === "weapons") return null;
  if (!mannableSystem(room.system)) return null;
  const cells = floorCells(room);
  if (!cells.length) return null;
  let best = cells[0]!;
  for (const cell of cells) {
    if (cell.y < best.y || (cell.y === best.y && cell.x > best.x)) best = cell;
  }
  return best;
}

/**
 * Mind Control, "Overview": a leashed crew member fights for the other side.
 * Same rule as sideOf in leash.ts. crew-spots cannot import that module.
 */
export function stationSide(c: { side?: "player" | "enemy"; leashed?: number }): "player" | "enemy" | undefined {
  if (!c.side) return undefined;
  if ((c.leashed ?? 0) > 0) return c.side === "player" ? "enemy" : "player";
  return c.side;
}

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

/**
 * How many crew can stand here.
 * Medbay and Clone Bay use the printed standing spots.
 * INFERRED: every other room holds one crew member per floor tile. Clone Bay's
 * "4-tile room ... only up to 3 standing crew" is the exception to that.
 */
export function roomCapacity(room: Box, side: "player" | "enemy", interiorDoors: number): number {
  if (room.system === "medbay" || room.kit === "cradle") return medicalLimit(room, side, interiorDoors);
  const tiles = floorCells(room).length;
  return tiles > 0 ? tiles : 0;
}

export type StandSpot = { x: number; y: number; stack: number };

type RosterCrew = {
  id: string;
  file?: number;
  pad?: string;
  room: string;
  path: string[];
  hp: number;
  aboard?: string;
  side?: "player" | "enemy";
  leashed?: number;
};

type StandHull = { flagship?: unknown } | null;

/**
 * The crew member who stands at the terminal.
 * Someone already in the room keeps it. Otherwise the first crew member whose walk ends there claims it.
 * A mind-controlled crew member fights for the other side, so they do not take the console.
 */
export function consoleOperator(crew: RosterCrew[], dest: string, aboard?: string): string | null {
  const roster = crew.filter((c) => {
    if (c.hp <= 0) return false;
    if (aboard != null && c.aboard !== aboard) return false;
    if (c.path.length === 0) return c.room === dest;
    return c.path[c.path.length - 1] === dest;
  });
  const owns = (c: RosterCrew) => {
    const side = stationSide(c);
    return aboard == null || side == null || side === aboard;
  };
  return (roster.find((c) => owns(c) && c.path.length === 0) ?? roster.find(owns))?.id ?? null;
}

/**
 * The tile this crew member stands on once the walk ends.
 * Everyone idle in the destination, and everyone whose path ends there, keeps a slot,
 * so the last step of the walk is the same tile they occupy at rest.
 * In a mannable room the operator's slot is the terminal.
 */
export function restSpot(
  room: Box,
  crew: RosterCrew[],
  id: string,
  aboard?: string,
  hull?: StandHull,
): StandSpot | null {
  const self = crew.find((c) => c.id === id);
  if (!self || self.hp <= 0) return null;
  const dest = self.path.length > 0 ? self.path[self.path.length - 1]! : self.room;
  const roster = crew.filter((c) => {
    if (c.hp <= 0) return false;
    if (aboard != null && c.aboard !== aboard) return false;
    if (c.path.length === 0) return c.room === dest;
    return c.path[c.path.length - 1] === dest;
  });
  return assignStands(room, roster, { hull, aboard }).get(id) ?? null;
}

/**
 * True when `id` can take a standing spot in `dest`.
 * Crew already standing there, and crew whose walk ends there, fill the room.
 * Someone only passing through does not.
 */
export function mayStand(
  room: Box,
  crew: RosterCrew[],
  id: string,
  dest: string,
  aboard: string,
  side: "player" | "enemy",
  interiorDoors: number,
): boolean {
  const cap = roomCapacity(room, side, interiorDoors);
  let held = 0;
  for (const other of crew) {
    if (other.id === id || other.hp <= 0 || other.aboard !== aboard) continue;
    const there = other.path.length === 0 ? other.room === dest : other.path[other.path.length - 1] === dest;
    if (there) held += 1;
  }
  return held < cap;
}

/**
 * Idle crew in one room. A pad tile wins over the file order.
 * The crew member manning a system stands on its terminal. Overflow stacks on the last other tile.
 */
export function assignStands(
  room: Box,
  crew: RosterCrew[],
  opts?: { hull?: StandHull; aboard?: string },
): Map<string, StandSpot> {
  const console = roomConsole(room, opts?.hull);
  const pads = new Set(padCells(room));
  const ordered = crew
    .slice()
    .sort((a, b) => (a.file ?? 0) - (b.file ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const used = new Map<string, number>();
  const out = new Map<string, StandSpot>();
  const placed = new Set<string>();
  const put = (id: string, cell: { x: number; y: number }) => {
    const key = `${cell.x},${cell.y}`;
    const stack = used.get(key) ?? 0;
    used.set(key, stack + 1);
    out.set(id, { x: cell.x, y: cell.y, stack });
    placed.add(id);
  };
  for (const c of ordered) {
    if (!c.pad || !pads.has(c.pad)) continue;
    const [xs, ys] = c.pad.split(",");
    put(c.id, { x: Number(xs), y: Number(ys) });
  }
  const op = console ? operatorInRoster(crew, opts?.aboard) : null;
  const hold = !!console && !!op && !placed.has(op);
  if (hold && console && op) put(op, console);
  const slots = standCells(room).filter((cell) => !hold || !console || cell.x !== console.x || cell.y !== console.y);
  let next = 0;
  for (const c of ordered) {
    if (placed.has(c.id)) continue;
    const cell = slots.length ? slots[Math.min(next, slots.length - 1)]! : console;
    if (!cell) continue;
    if (slots.length && next < slots.length) next += 1;
    put(c.id, cell);
  }
  return out;
}

/** First owner already standing, else the first owner in this room's roster. */
function operatorInRoster(crew: RosterCrew[], aboard?: string): string | null {
  const owns = (c: RosterCrew) => {
    const side = stationSide(c);
    return aboard == null || side == null || side === aboard;
  };
  return (crew.find((c) => owns(c) && c.path.length === 0) ?? crew.find(owns))?.id ?? null;
}
