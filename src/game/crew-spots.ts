/**
 * Floor tiles crew stand on, the manning terminal, medbay and clone-bay spot caps,
 * and teleporter pads. No sim import: sling and the combat tick both call this.
 */

type Box = {
  id?: string;
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
 * Medbay, "Overview": players have "either 2 or 3 standing spots", enemies "either 2 or 4" ("depends on the ship
 * design"). INTENTIONAL (confirmed by the user): which one is read from the room, 2 when it has two tiles or fewer,
 * otherwise 3 for the player and 4 for an enemy.
 * Clone bay (kit "cradle", and not still the medbay): player 1 or 3, enemy 2 or 4.
 * Stealth B and Rock C: the medbay "is positioned in a dead-end corner and has 2 standing spots."
 * INTENTIONAL (confirmed by the user): one interior door is that dead-end, so a player medbay with a single neighbor stays at 2
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

export type HeldTile = { room: string; x: number; y: number };
export type TileShift = { x: number; y: number; t: number };

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
  tile?: HeldTile;
  shift?: TileShift;
  stun?: number;
  station?: string;
  stationTile?: { x: number; y: number };
};

/** The floor tile an idle crew member keeps (settleTiles), or null while walking or before one is stamped. */
export function heldTile(c: Pick<RosterCrew, "tile" | "path" | "room">): { x: number; y: number } | null {
  return c.tile && c.path.length === 0 && c.tile.room === c.room ? c.tile : null;
}

const cellKey = (cell: { x: number; y: number }) => `${cell.x},${cell.y}`;

type StandHull = { flagship?: unknown } | null;

/**
 * The crew member who stands at the terminal.
 * Someone already in the room keeps it. Otherwise the first crew member whose walk ends there claims it.
 * A mind-controlled crew member fights for the other side, so they do not take the console.
 */
export function consoleOperator(
  crew: RosterCrew[],
  dest: string,
  aboard?: string,
  cell?: { x: number; y: number } | null,
): string | null {
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
  // With tiles stamped (settleTiles), the operator is whoever stands on the terminal, once they have walked onto it.
  // INTENTIONAL (confirmed by the user): nobody operates while the terminal is empty or its next operator is still
  // walking over.
  if (cell) {
    const on = roster.find((c) => {
      const t = heldTile(c);
      return !!t && t.x === cell.x && t.y === cell.y;
    });
    if (on) return owns(on) && !on.shift ? on.id : null;
    if (roster.some((c) => heldTile(c))) return null;
  }
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
 * Idle crew in one room. A pad tile wins over the file order, then everyone keeps the tile they already hold.
 * Newcomers fill the free tiles; a free terminal goes to one who can man it. Overflow stacks on the last other tile.
 */
export function assignStands(
  room: Box,
  crew: RosterCrew[],
  opts?: { hull?: StandHull; aboard?: string },
): Map<string, StandSpot> {
  const console = roomConsole(room, opts?.hull);
  const consoleKey = console ? cellKey(console) : null;
  const pads = new Set(padCells(room));
  const floor = new Set(floorCells(room).map(cellKey));
  const ordered = crew
    .slice()
    .sort((a, b) => (a.file ?? 0) - (b.file ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const ownsHere = (c: RosterCrew) => {
    const side = stationSide(c);
    return opts?.aboard == null || side == null || side === opts.aboard;
  };
  const used = new Map<string, number>();
  const out = new Map<string, StandSpot>();
  const placed = new Set<string>();
  const put = (id: string, cell: { x: number; y: number }) => {
    const key = cellKey(cell);
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
  // INTENTIONAL (per the user): crew already standing in the room keep their tile when someone else comes or goes.
  // Only an owner keeps the terminal tile; anyone else standing there is moved off it.
  for (const c of ordered) {
    if (placed.has(c.id)) continue;
    const t = heldTile(c);
    if (!t || !floor.has(cellKey(t)) || used.has(cellKey(t))) continue;
    if (cellKey(t) === consoleKey && !ownsHere(c)) continue;
    put(c.id, t);
  }
  // Someone coming back to their saved station takes the tile they saved, when it is free (sim saveStations).
  for (const c of ordered) {
    if (placed.has(c.id) || !room.id || c.station !== room.id || !c.stationTile) continue;
    const key = cellKey(c.stationTile);
    if (!floor.has(key) || used.has(key) || (key === consoleKey && !ownsHere(c))) continue;
    put(c.id, c.stationTile);
  }
  const unplaced = ordered.filter((c) => !placed.has(c.id));
  // A free terminal goes to a newcomer who can run it. settleTiles walks an idle owner over when there is none.
  // By file order alone, so the pick made when the walks were ordered holds whoever arrives first.
  if (console && consoleKey && !used.has(consoleKey)) {
    const op = unplaced.find(ownsHere)?.id;
    if (op) put(op, console);
  }
  // The terminal is kept clear for an owner while one is in the room.
  const blockConsole = !!consoleKey && ordered.some(ownsHere);
  const spare = standCells(room).filter((cell) => !blockConsole || cellKey(cell) !== consoleKey);
  const free = spare.filter((cell) => !used.has(cellKey(cell)));
  let next = 0;
  for (const c of unplaced) {
    if (placed.has(c.id)) continue;
    // Overflow stacks on the last other tile.
    const cell = next < free.length ? free[next++]! : (spare[spare.length - 1] ?? console);
    if (!cell) continue;
    put(c.id, cell);
  }
  return out;
}

/** Where an idle crew member is drawn: their tile, or part way there on an in-room walk. */
export function shiftPoint(c: Pick<RosterCrew, "tile" | "shift">): { x: number; y: number } | null {
  if (!c.tile) return null;
  if (!c.shift) return { x: c.tile.x, y: c.tile.y };
  const t = Math.max(0, Math.min(1, c.shift.t));
  return { x: c.shift.x + (c.tile.x - c.shift.x) * t, y: c.shift.y + (c.tile.y - c.shift.y) * t };
}

type TileRoom = Box & { id: string };

/**
 * Keeps idle crew on their own tiles, once per tick after crew move (sim moveCrew).
 * - A crew member who has just stopped takes the tile assignStands gives them, with no walk: their walk ended there.
 * - Someone moved off a tile (a duplicate, a pad, a non-owner on the terminal) walks to the new one.
 * - Per the user: when the terminal is left empty, the nearest idle crew member who can run it walks over to it.
 *   It counts as manned once they arrive (consoleOperator).
 * `tileSeconds` is one tile's walking time for that crew member. INFERRED: an in-room walk is straight-line tiles.
 */
export function settleTiles(
  crew: RosterCrew[],
  hull: { rooms: TileRoom[]; flagship?: unknown },
  aboard: "player" | "enemy",
  dt: number,
  tileSeconds: (c: RosterCrew) => number,
): void {
  const walkTo = (c: RosterCrew, room: string, cell: { x: number; y: number }) => {
    const from = shiftPoint(c) ?? cell;
    c.tile = { room, x: cell.x, y: cell.y };
    if (from.x === cell.x && from.y === cell.y) delete c.shift;
    else c.shift = { x: from.x, y: from.y, t: 0 };
  };
  for (const room of hull.rooms) {
    const roster = crew.filter(
      (c) =>
        c.hp > 0 &&
        c.aboard === aboard &&
        (c.path.length === 0 ? c.room === room.id : c.path[c.path.length - 1] === room.id),
    );
    if (!roster.length) continue;
    const idle = roster.filter((c) => c.path.length === 0);
    const owns = (c: RosterCrew) => {
      const side = stationSide(c);
      return side == null || side === aboard;
    };
    // Per the user: fighting comes before the terminal. With an enemy standing here, nobody walks between tiles and
    // nobody heads for the terminal (Systems: "intruders prevent manning" as well).
    const fight = idle.some((c) => !owns(c));
    for (const c of idle) {
      if (!c.shift || !c.tile || c.tile.room !== room.id) continue;
      if ((c.stun ?? 0) > 0 || fight) continue;
      const span = Math.max(1, Math.hypot(c.tile.x - c.shift.x, c.tile.y - c.shift.y));
      c.shift.t += dt / (Math.max(1e-6, tileSeconds(c)) * span);
      if (c.shift.t >= 1) delete c.shift;
    }
    const stands = assignStands(room, roster, { hull, aboard });
    for (const c of idle) {
      const spot = stands.get(c.id);
      if (!spot) continue;
      const held = heldTile(c);
      if (!held) {
        c.tile = { room: room.id, x: spot.x, y: spot.y };
        delete c.shift;
      } else if (held.x !== spot.x || held.y !== spot.y) {
        walkTo(c, room.id, spot);
      }
    }
    const cell = roomConsole(room, hull);
    if (!cell || fight) continue;
    // Someone already holds it, or a crew member walking in has it as their stopping tile.
    const claimed = roster.some((c) => {
      const spot = stands.get(c.id);
      return !!spot && spot.x === cell.x && spot.y === cell.y && spot.stack === 0 && owns(c);
    });
    if (claimed) continue;
    let best: RosterCrew | null = null;
    let bestD = Infinity;
    for (const c of idle) {
      if (!owns(c) || (c.stun ?? 0) > 0 || c.pad) continue;
      const at = shiftPoint(c);
      if (!at) continue;
      const d = Math.abs(at.x - cell.x) + Math.abs(at.y - cell.y);
      if (d < bestD || (d === bestD && best && ((c.file ?? 0) < (best.file ?? 0) || ((c.file ?? 0) === (best.file ?? 0) && c.id < best.id)))) {
        best = c;
        bestD = d;
      }
    }
    if (best) walkTo(best, room.id, cell);
  }
}

