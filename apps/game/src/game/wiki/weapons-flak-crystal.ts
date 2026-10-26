import { cellOccupied } from "../layouts.ts";

/** Flak (Weapons), "Flak Gun Mark II": additional fake flak. */
export const FLAK2_FAKE = 6;
/** Flak (Weapons), "Advanced Flak": additional fake flak. */
export const ADV_FLAK_FAKE = 3;

export type Flak2Room = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type Flak2Land = { kind: "stay" } | { kind: "room"; roomId: string } | { kind: "miss" };

type Tile = { x: number; y: number };

/** 1×2 cuts in hundredths of a percent. The last outer tile fills the extra 0.02. */
const FLAK2_NARROW = [2578, 1206, 1206, 1206, 1206, 702, 702, 270, 270, 270, 270, 29, 29, 29, 27];
/** 2×2 cuts. 51.56 + 8×5.90 + 4×0.31 = 100. */
const FLAK2_WIDE = [5156, 590, 590, 590, 590, 590, 590, 590, 590, 31, 31, 31, 31];

function cutsOf(steps: readonly number[]): number[] {
  const cuts: number[] = [];
  let acc = 0;
  for (const step of steps) {
    acc += step;
    cuts.push(acc / 10000);
  }
  return cuts;
}

export const FLAK2_NARROW_CUTS = cutsOf(FLAK2_NARROW);
export const FLAK2_WIDE_CUTS = cutsOf(FLAK2_WIDE);

function floorTiles(room: Flak2Room): Tile[] {
  const out: Tile[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) out.push({ x, y });
    }
  }
  return out;
}

function twoTile(room: Flak2Room): [Tile, Tile] | null {
  if (room.w * room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 2) return null;
  const [a, b] = tiles;
  const straight =
    (a.x === b.x && Math.abs(a.y - b.y) === 1) || (a.y === b.y && Math.abs(a.x - b.x) === 1);
  return straight ? [a, b] : null;
}

function twoByTwo(room: Flak2Room): Tile[] | null {
  if (room.w !== 2 || room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 4) return null;
  return tiles;
}

/** True when the shot must roll a printed Flak II split. */
export function flak2AimRolls(room: Flak2Room): boolean {
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

/** The next tile outward from each long-side tile. The page calls these the tiles after the long sides. */
function outerLongTiles(pair: [Tile, Tile]): Tile[] {
  const [a, b] = pair;
  if (a.y === b.y) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    return [
      { x: left.x, y: left.y - 2 },
      { x: right.x, y: right.y - 2 },
      { x: left.x, y: left.y + 2 },
      { x: right.x, y: right.y + 2 },
    ];
  }
  const [top, bot] = a.y < b.y ? [a, b] : [b, a];
  return [
    { x: top.x - 2, y: top.y },
    { x: bot.x - 2, y: bot.y },
    { x: top.x + 2, y: top.y },
    { x: bot.x + 2, y: bot.y },
  ];
}

/** Eight side tiles around a 2×2, then the four corners. */
function wideTiles(room: Flak2Room): Tile[] {
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
    { x: x - 1, y: y - 1 },
    { x: x + 2, y: y - 1 },
    { x: x - 1, y: y + 2 },
    { x: x + 2, y: y + 2 },
  ];
}

function landOn(rooms: readonly Flak2Room[], aimId: string, tile: Tile): Flak2Land {
  const hit = rooms.find((room) => cellOccupied(room, tile.x, tile.y));
  if (!hit || hit.id === aimId) return hit ? { kind: "stay" } : { kind: "miss" };
  return { kind: "room", roomId: hit.id };
}

/**
 * Where one Flak II pellet lands. `roll` is used only for a 1×2 or a 2×2.
 * Every other shape ignores `roll` and stays.
 */
export function flak2Landing(rooms: readonly Flak2Room[], aimId: string, roll: number): Flak2Land {
  const aim = rooms.find((room) => room.id === aimId);
  if (!aim) return { kind: "stay" };
  const pair = twoTile(aim);
  if (pair) {
    const index = bandIndex(roll, FLAK2_NARROW_CUTS);
    if (index < 0) return { kind: "stay" };
    const tiles = [...narrowTiles(pair), ...outerLongTiles(pair)];
    return landOn(rooms, aimId, tiles[index]);
  }
  if (twoByTwo(aim)) {
    const index = bandIndex(roll, FLAK2_WIDE_CUTS);
    if (index < 0) return { kind: "stay" };
    return landOn(rooms, aimId, wideTiles(aim)[index]);
  }
  return { kind: "stay" };
}

/**
 * Flak (Weapons), "Adv. Flak Gun".
 * "When fired at 1x2 room: 48.74% in main room, 11.51% in each tile next to long sides, 2.57% in each tile next to short sides, 0.02% in each tile next to corners."
 * "When fired at 2x2 room: 89.59% in main room, 1.30% in each tile next to sides."
 * Targeting area radius 40 is not simulated as pixels. Additional fake flak is ADV_FLAK_FAKE, spawned in launch.
 * INFERRED: each of the three pellets rolls on its own. The page does not say they share one roll.
 * INFERRED: a 2×1 is that 1×2 rectangle turned, so it uses the same split.
 * INFERRED: 48.74 + 4×11.51 + 2×2.57 + 4×0.02 = 100, so every printed 1×2 tile keeps its percent.
 * INFERRED: 89.59 + 8×1.30 = 99.99, so the last side tile is 1.31%.
 * INFERRED: a shape with no printed percent stays in the aimed room. An empty tile is a miss.
 * INFERRED: the 2×2 line has no corners, so only the eight side tiles are rolled.
 */
/** 1×2 cuts in hundredths of a percent. The printed figures already sum to 100. */
const ADV_NARROW = [4874, 1151, 1151, 1151, 1151, 257, 257, 2, 2, 2, 2];
/** 2×2 cuts. The last side tile is 1.31 so the eight sides reach 100. */
const ADV_WIDE = [8959, 130, 130, 130, 130, 130, 130, 130, 131];

export const ADV_NARROW_CUTS = cutsOf(ADV_NARROW);
export const ADV_WIDE_CUTS = cutsOf(ADV_WIDE);

/** True when the shot must roll a printed Adv. Flak split. */
export function advFlakAimRolls(room: Flak2Room): boolean {
  return twoTile(room) != null || twoByTwo(room) != null;
}

/**
 * Where one Adv. Flak pellet lands. `roll` is used only for a 1×2 or a 2×2.
 * Every other shape ignores `roll` and stays.
 */
export function advFlakLanding(
  rooms: readonly Flak2Room[],
  aimId: string,
  roll: number,
): Flak2Land {
  const aim = rooms.find((room) => room.id === aimId);
  if (!aim) return { kind: "stay" };
  const pair = twoTile(aim);
  if (pair) {
    const index = bandIndex(roll, ADV_NARROW_CUTS);
    if (index < 0) return { kind: "stay" };
    return landOn(rooms, aimId, narrowTiles(pair)[index]);
  }
  if (twoByTwo(aim)) {
    const index = bandIndex(roll, ADV_WIDE_CUTS);
    if (index < 0) return { kind: "stay" };
    return landOn(rooms, aimId, wideTiles(aim)[index]);
  }
  return { kind: "stay" };
}
