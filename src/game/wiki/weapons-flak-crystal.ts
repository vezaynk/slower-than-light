import type { WeaponDef } from "../content.ts";
import { cellOccupied } from "../layouts.ts";

/**
 * Unfitted rows from page titles "Flak (Weapons)" and "Crystal (Weapons)".
 * Flak Gun Mark I is already fitted as scatter. Flak Artillery is not a weapon
 * row; flakart.ts owns that system, and the extra numbers sit in the gaps.
 * Crystal pages state one shield layer of pierce. WeaponDef has no pierce field.
 */
export type FlakCrystalGap = {
  id: string;
  note: string;
  radius?: number;
  fake?: number;
  pierce?: number;
  /** Adv. Flak sells for this scrap and is not a store purchase. */
  sell?: number;
  rooms?: readonly string[];
};

/**
 * Flak (Weapons) lead: "they never cause fires or breaches."
 * INFERRED: gap 0 because that page says the shots arrive almost simultaneously,
 * and neither weapon section gives a per-shot gap. Ion 0 and ammo false: no ion
 * and no missile cost are listed. Shots are the projectile count.
 */
const FLAK_FAMILY = {
  gap: 0,
  ion: 0,
  fire: 0,
  breach: 0,
  ammo: false,
} as const;

export const FLAK_CRYSTAL_WEAPONS: WeaponDef[] = [
  {
    id: "advflak",
    name: "Adv. Flak Gun",
    kind: "flak",
    // Flak (Weapons) "Adv. Flak Gun": 1 power, 8s, 3 shots, 1 damage.
    // Sells for 30 and cannot be bought or found, so price is 0, not the sell scrap.
    power: 1,
    charge: 8,
    shots: 3,
    // INFERRED: gap 0. The shots arrive almost simultaneously, and the section gives no gap.
    gap: FLAK_FAMILY.gap,
    damage: 1,
    ion: FLAK_FAMILY.ion,
    // Flak (Weapons) lead: they never cause fires or breaches.
    fire: FLAK_FAMILY.fire,
    breach: FLAK_FAMILY.breach,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: FLAK_FAMILY.ammo,
    price: 0,
    blurb:
      "Fires a blast of debris across a random area doing up to 3 damage. Good at taking down shields but hard to aim.",
  },
  {
    id: "flak2",
    name: "Flak Gun Mark II",
    kind: "flak",
    // Flak (Weapons) "Flak Gun Mark II": 3 power, 21s, 7 shots, 1 damage, purchase price 80.
    power: 3,
    charge: 21,
    shots: 7,
    // INFERRED: gap 0. The shots arrive almost simultaneously, and the section gives no gap.
    gap: FLAK_FAMILY.gap,
    damage: 1,
    ion: FLAK_FAMILY.ion,
    // Flak (Weapons) lead: they never cause fires or breaches.
    fire: FLAK_FAMILY.fire,
    breach: FLAK_FAMILY.breach,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: FLAK_FAMILY.ammo,
    price: 80,
    blurb:
      "Fires a blast of debris across a random area doing up to 7 damage. Good at taking down shields but hard to aim.",
  },
  {
    id: "crystalburst",
    name: "Crystal Burst Mark I",
    // Shards are projectiles. WeaponKind has no crystal kind.
    // kind "laser" is the closest stored kind and pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Crystal Burst Mark I": 2 power, 15s, 2 shots, 1 damage, purchase price 20.
    power: 2,
    charge: 15,
    shots: 2,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 1,
    // INFERRED: ion 0. The row lists no ion.
    ion: 0,
    // INFERRED: fire 0. The row lists no fire chance.
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "crystalburst2",
    name: "Crystal Burst Mark II",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Crystal Burst Mark II": 3 power, 17s, 3 shots, 1 damage, purchase price 20.
    power: 3,
    charge: 17,
    shots: 3,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "heavycrystal",
    name: "Heavy Crystal Mark I",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Heavy Crystal Mark I": 1 power, 13s, 1 shot, 2 damage, purchase price 20.
    power: 1,
    charge: 13,
    shots: 1,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "heavycrystal2",
    name: "Heavy Crystal Mark II",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Heavy Crystal Mark II": 3 power, 19s, 1 shot, 4 damage, purchase price 20.
    power: 3,
    charge: 19,
    shots: 1,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 4,
    ion: 0,
    fire: 0,
    // "guaranteed breach" is certain, so this is 1 rather than a guessed percent.
    breach: 1,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
];

export const FLAK_CRYSTAL_GAPS: FlakCrystalGap[] = [
  {
    id: "advflak",
    radius: 40,
    fake: 3,
    sell: 30,
    rooms: [
      "When fired at 1x2 room: 48.74% in main room, 11.51% in each tile next to long sides, 2.57% in each tile next to short sides, 0.02% in each tile next to corners.",
      "When fired at 2x2 room: 89.59% in main room, 1.30% in each tile next to sides.",
    ],
    note: 'Flak (Weapons) "Adv. Flak Gun": targeting area radius 40 and 3 additional fake flak are not on WeaponDef. Sells for 30 and cannot be bought or found, so price is 0. Enemies never use it. Only on Lanius B. Room odds are applied by advFlakLanding. Radius 40 is not simulated as pixels.',
  },
  {
    id: "flak2",
    radius: 55,
    fake: 6,
    rooms: [
      "When fired at 1x2 room: 25.78% in main room, 12.06% in each tile next to long sides, 7.02% in each tile next to short sides, 2.70% in each tile next to corners, 0.29% in each tile after the tiles next to long sides.",
      "When fired at 2x2 room: 51.56% in main room, 5.90% in each tile next to sides, 0.31% in each tile next to corners.",
    ],
    note: 'Flak (Weapons) "Flak Gun Mark II": targeting area radius 55 and 6 additional fake flak are not on WeaponDef. Store rarity 4. Room odds are applied by flak2Landing. Radius 55 is not simulated as pixels.',
  },
  {
    id: "flak-artillery",
    radius: 35,
    fake: 7,
    rooms: [
      "When fired at 1x2 room: 60.90% in main room, 9.78% in each tile next to long sides.",
      "When fired at 2x2 room: 100% in main room.",
    ],
    note: 'flakart.ts owns the system. Flak (Weapons) "Flak Artillery" matches that file on 4 levels, charge 50/40/30/20, shots 7, damage 1, and auto-fire. This section is more than that reminder: radius 35 (each flak projectile is auto-targeted at a random room), additional fake flak 7, and the room odds below are not applied there.',
  },
  {
    id: "crystalburst",
    pierce: 1,
    note: 'Crystal (Weapons) "Crystal Burst Mark I": pierce one shield layer. WeaponDef has no pierce field, so kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Low chance to stun crew; no percent is given. Store rarity 1.',
  },
  {
    id: "crystalburst2",
    pierce: 1,
    note: 'Crystal (Weapons) "Crystal Burst Mark II": pierce one shield layer. WeaponDef has no pierce field, so kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Low chance to stun crew; no percent is given. Store rarity 4.',
  },
  {
    id: "heavycrystal",
    pierce: 1,
    note: 'Crystal (Weapons) "Heavy Crystal Mark I": pierce one shield layer. WeaponDef has no pierce field, so kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Moderate-low chance to stun crew; no percent is given. Store rarity 2.',
  },
  {
    id: "heavycrystal2",
    pierce: 1,
    note: 'Crystal (Weapons) "Heavy Crystal Mark II": pierce one shield layer. WeaponDef has no pierce field, so kind "laser" does not apply pierce. Effect: guaranteed breach, stored as breach 1. Moderate-low chance to stun crew; no percent is given. Store rarity 5.',
  },
];

/**
 * Flak (Weapons), "Flak Gun Mark II".
 * "When fired at 1x2 room: 25.78% in main room, 12.06% in each tile next to long sides, 7.02% in each tile next to short sides, 2.70% in each tile next to corners, 0.29% in each tile after the tiles next to long sides."
 * "When fired at 2x2 room: 51.56% in main room, 5.90% in each tile next to sides, 0.31% in each tile next to corners."
 * Targeting area radius 55 is not simulated as pixels. Additional fake flak is not spawned.
 * INFERRED: each of the seven pellets rolls on its own. The page does not say they share one roll.
 * INFERRED: a 2×1 is that 1×2 rectangle turned, so it uses the same split.
 * INFERRED: 25.78 + 4×12.06 + 2×7.02 + 4×2.70 + 4×0.29 = 100.02, so the last outer long-side tile is 0.27%.
 * INFERRED: "each tile after the tiles next to long sides" is the next tile outward from each of those four.
 * INFERRED: a shape with no printed percent stays in the aimed room.
 * INFERRED: a neighboring tile maps to the room whose floor contains that cell. An empty tile is a miss.
 * INFERRED: long sides, then short sides, then corners, then the outer long-side tiles. Along a room, north then south, or west then east.
 * INFERRED: a 2×2 lists sides before corners. Corner order is northwest, northeast, southwest, southeast.
 */
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
  const straight = (a.x === b.x && Math.abs(a.y - b.y) === 1) || (a.y === b.y && Math.abs(a.x - b.x) === 1);
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
 * Targeting area radius 40 is not simulated as pixels. Additional fake flak is not spawned.
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
export function advFlakLanding(rooms: readonly Flak2Room[], aimId: string, roll: number): Flak2Land {
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
