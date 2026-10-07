import type { WeaponDef } from "../content.ts";
import { cellOccupied } from "../layouts.ts";

/**
 * Bombs in the wiki spend a missile.
 * Bomb (Weapons) "Comparing bombs to missiles": both bombs and missiles use 1 missile ammunition every time they fire.
 * Weapons "Bomb": they cost 1 missile ammunition each time they fire.
 */
export const NOMISSILE = "bombs in the wiki spend a missile";

/**
 * Pellet count from `shots`. Each pellet deals `damage` and is not applied here.
 * Flak (Weapons) "Flak Gun Mark I": Shots 3, damage per shot 1. "Flak weapons table" is the same row.
 */
export function flakPellets(def: WeaponDef): number {
  return def.shots;
}

/**
 * True for bombs: they do not pop shields.
 * Bomb (Weapons) lead: bombs ignore shields. Evasion is rolled in applyImpact, so they can still miss.
 */
export function bombIgnores(def: WeaponDef): boolean {
  return def.kind === "bomb";
}

/**
 * Flak (Weapons), "Flak Gun Mark I".
 * "When fired at 1x2 room: 44.21% in main room, 11.96% in each tile next to long sides, 3.63% in each tile next to short sides, 0.17% in each tile next to corners."
 * "When fired at 2x2 room: 84.08% in main room, 1.99% in each tile next to sides."
 * Targeting area radius 42 is not simulated as pixels. Fake pellets do not use this split.
 * INFERRED: each of the three pellets rolls on its own. The page does not say they share one roll.
 * INFERRED: a 2×1 is that 1×2 rectangle turned, so it uses the same split.
 * INFERRED: 44.21 + 4×11.96 + 2×3.63 + 4×0.17 = 99.99, so the last corner tile is 0.18%.
 * INFERRED: a shape with no printed percent stays in the aimed room.
 * INFERRED: a neighboring tile maps to the room whose floor contains that cell. An empty tile is a miss.
 * INFERRED: long sides, then short sides, then corners. Along a room, north then south, or west then east.
 */
export type FlakRoom = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type FlakLand = { kind: "stay" } | { kind: "room"; roomId: string } | { kind: "miss" };

type Tile = { x: number; y: number };

/** 1×2 cuts in hundredths of a percent. The last corner fills the missing 0.01. */
const FLAK1_NARROW = [4421, 1196, 1196, 1196, 1196, 363, 363, 17, 17, 17, 18];
/** 2×2 cuts. 84.08 + 8×1.99 = 100. */
const FLAK1_WIDE = [8408, 199, 199, 199, 199, 199, 199, 199, 199];

function cutsOf(steps: readonly number[]): number[] {
  const cuts: number[] = [];
  let acc = 0;
  for (const step of steps) {
    acc += step;
    cuts.push(acc / 10000);
  }
  return cuts;
}

export const FLAK1_NARROW_CUTS = cutsOf(FLAK1_NARROW);
export const FLAK1_WIDE_CUTS = cutsOf(FLAK1_WIDE);

function floorTiles(room: FlakRoom): Tile[] {
  const out: Tile[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) out.push({ x, y });
    }
  }
  return out;
}

function twoTile(room: FlakRoom): [Tile, Tile] | null {
  if (room.w * room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 2) return null;
  const [a, b] = tiles;
  const straight = (a.x === b.x && Math.abs(a.y - b.y) === 1) || (a.y === b.y && Math.abs(a.x - b.x) === 1);
  return straight ? [a, b] : null;
}

function twoByTwo(room: FlakRoom): Tile[] | null {
  if (room.w !== 2 || room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 4) return null;
  return tiles;
}

/** True when the shot must roll a printed Flak I split. */
export function flak1AimRolls(room: FlakRoom): boolean {
  return twoTile(room) != null || twoByTwo(room) != null;
}

function bandIndex(roll: number, cuts: readonly number[]): number {
  for (let i = 0; i < cuts.length; i++) {
    if (roll < cuts[i]) return i - 1;
  }
  return cuts.length - 2;
}

/** Long sides, short sides, then corners, around a straight two-tile room. */
function narrowTiles(pair: [Tile, Tile]): Tile[] {
  const [a, b] = pair;
  if (a.y === b.y) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    return [
      { x: left.x, y: left.y - 1 },
      { x: right.x, y: right.y - 1 },
      { x: left.x, y: left.y + 1 },
      { x: right.x, y: right.y + 1 },
      { x: left.x - 1, y: left.y },
      { x: right.x + 1, y: right.y },
      { x: left.x - 1, y: left.y - 1 },
      { x: right.x + 1, y: right.y - 1 },
      { x: left.x - 1, y: left.y + 1 },
      { x: right.x + 1, y: right.y + 1 },
    ];
  }
  const [top, bot] = a.y < b.y ? [a, b] : [b, a];
  return [
    { x: top.x - 1, y: top.y },
    { x: bot.x - 1, y: bot.y },
    { x: top.x + 1, y: top.y },
    { x: bot.x + 1, y: bot.y },
    { x: top.x, y: top.y - 1 },
    { x: bot.x, y: bot.y + 1 },
    { x: top.x - 1, y: top.y - 1 },
    { x: top.x + 1, y: top.y - 1 },
    { x: bot.x - 1, y: bot.y + 1 },
    { x: bot.x + 1, y: bot.y + 1 },
  ];
}

/** Eight side tiles around a 2×2. Corners are not in the printed 2×2 line. */
function wideTiles(room: FlakRoom): Tile[] {
  const x = room.x;
  const y = room.y;
  return [
    { x, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x, y: y + 2 },
    { x: x + 1, y: y + 2 },
    { x: x - 1, y },
    { x: x - 1, y: y + 1 },
    { x: x + 2, y },
    { x: x + 2, y: y + 1 },
  ];
}

function landOn(rooms: readonly FlakRoom[], aimId: string, tile: Tile): FlakLand {
  const hit = rooms.find((room) => cellOccupied(room, tile.x, tile.y));
  if (!hit || hit.id === aimId) return hit ? { kind: "stay" } : { kind: "miss" };
  return { kind: "room", roomId: hit.id };
}

/**
 * Where one Flak I pellet lands. `roll` is used only for a 1×2 or a 2×2.
 * Every other shape ignores `roll` and stays.
 */
export function flak1Landing(rooms: readonly FlakRoom[], aimId: string, roll: number): FlakLand {
  const aim = rooms.find((room) => room.id === aimId);
  if (!aim) return { kind: "stay" };
  const pair = twoTile(aim);
  if (pair) {
    const index = bandIndex(roll, FLAK1_NARROW_CUTS);
    if (index < 0) return { kind: "stay" };
    return landOn(rooms, aimId, narrowTiles(pair)[index]);
  }
  if (twoByTwo(aim)) {
    const index = bandIndex(roll, FLAK1_WIDE_CUTS);
    if (index < 0) return { kind: "stay" };
    return landOn(rooms, aimId, wideTiles(aim)[index]);
  }
  return { kind: "stay" };
}

/**
 * Flak (Weapons), "Flak Gun Mark I": Additional fake flak 3.
 * "Understanding flak accuracy": fake flak cannot take down shields or deal damage, but can distract defense drones
 * or collide with other projectiles.
 * INVENTED: each fake pellet is a missile with damage 0 and this label. A flak shot drops a shield layer even at
 * damage 0. A missile does not, and defense drones shoot missiles.
 * The page does not print a kind, a damage number, or a label.
 */
export const FLAK1_FAKE = 3;
export const FLAK1_FAKE_LABEL = "fake-flak";

/**
 * Flak I and the Fire Bomb. Display names match those rows.
 */
export const ORDNANCE: WeaponDef[] = [
  // Flak (Weapons), "Flak Gun Mark I": purchase price 65, power 2, charge 10 seconds, shots 3, damage per shot 1.
  // That section also lists targeting radius 42. Additional fake flak is FLAK1_FAKE, spawned in launch, not a WeaponDef field.
  // Lead: flak never causes fires or breaches, so fire 0 and breach 0 are stated, not a missing percent.
  // INFERRED: gap 0 from the lead "all the shots arrive almost simultaneously". Ion 0. No missile cost is listed, so ammo is false.
  {
    id: "scatter",
    name: "Flak I",
    kind: "flak",
    power: 2,
    charge: 10,
    shots: 3,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 65,
    blurb: "Three pellets. Each is one damage, can miss alone, and one shield layer stops one.",
  },
  // Bomb (Weapons), "Fire Bomb": purchase price 50, power 2, charge 15 seconds, system damage 0.
  // Effect: guaranteed 1-2 fires, so fire is 1. No breach percent is published, so breach is 0.
  // "Comparing bombs to missiles": 1 missile per shot, and bombs do no hull damage. Crew damage 30 is not a field.
  // INFERRED: shots 1, gap 0, ion 0. The section does not number them. How often the second fire happens is not published.
  {
    id: "cask",
    name: "Fire Bomb",
    kind: "bomb",
    power: 2,
    charge: 15,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 0,
    fire: 1,
    breach: 0,
    ammo: true,
    price: 50,
    blurb: "Hits the room. No hull. One or two fires. Spends a missile. Ignores shields. Can still miss.",
  },
];
