import type { Difficulty, SysId, WeaponKind } from "./types";
import { ORDNANCE } from "./extras/ordnance.ts";
import { BEAM_WEAPONS } from "./wiki/weapons-beam.ts";
import { BOMB_WEAPONS } from "./wiki/weapons-bomb.ts";
import { FLAK_CRYSTAL_WEAPONS } from "./wiki/weapons-flak-crystal.ts";
import { ION_WEAPONS } from "./wiki/weapons-ion.ts";
import { LASER_WEAPONS } from "./wiki/weapons-laser.ts";
import { MISSILE_WEAPONS } from "./wiki/weapons-missile.ts";

export type WeaponDef = {
  id: string;
  name: string;
  kind: WeaponKind;
  power: number;
  charge: number;
  shots: number;
  gap: number;
  damage: number;
  ion: number;
  fire: number;
  breach: number;
  ammo: boolean;
  price: number;
  blurb: string;
};

/**
 * Fitted weapons. Each object is cited on the comment above it.
 * Dart stays Dart: its charge is not a wiki missile. INVENTED name.
 * The id `shear` is an invented local id. Its numbers are the Pike Beam row, so the display name is Pike Beam.
 */
export const WEAPONS: Record<string, WeaponDef> = {
  // Laser (Weapons), "Burst Laser Mark II": purchase price 80, power 2, charge 12 seconds, shots 3, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.1, not on the page.
  // Breach is not stated. gap 0.28 is not on the page and is left in place.
  lineburst: {
    id: "lineburst",
    name: "Burst Laser II",
    kind: "laser",
    power: 2,
    charge: 12,
    shots: 3,
    gap: 0.28,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 80,
    blurb: "Three bolts. The first one only buys down a shield layer.",
  },
  // Laser (Weapons), "Basic Laser": "Sells for: 10 (cannot be bought or found)". price 0, not the sell value.
  // Power 1, charge 10 seconds, shots 1, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.08, not on the page.
  spark: {
    id: "spark",
    name: "Basic Laser",
    kind: "laser",
    power: 1,
    charge: 10,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "One bolt. A shield layer stops it whole.",
  },
  // Laser (Weapons), "Dual Lasers": "Sells for: 12 (cannot be bought or found)". price 0, not the sell value.
  // Power 1, charge 10 seconds, shots 2, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.08, not on the page.
  // gap 0.3 is not on the page and is left in place.
  twin: {
    id: "twin",
    name: "Dual Lasers",
    kind: "laser",
    power: 1,
    charge: 10,
    shots: 2,
    gap: 0.3,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "Two bolts from a single power bar.",
  },
  // Laser (Weapons), "Heavy Laser Mark I": purchase price 50, power 1, charge 9 seconds, shots 1, damage per shot 2.
  // Laser (Weapons), "Types of lasers": the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance.
  heavy: {
    id: "heavy",
    name: "Heavy Laser",
    kind: "laser",
    power: 1,
    charge: 9,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0.3,
    breach: 0.3,
    ammo: false,
    price: 50,
    blurb: "Two hull if it lands. One shield layer still eats the entire shot.",
  },
  // INVENTED. Charge is 14 seconds, which is not Artemis (Missile (Weapons), "Artemis Missiles", 11 seconds) or Leto ("Leto Missiles", 9 seconds), so it is not renamed.
  dart: {
    id: "dart",
    name: "Dart",
    kind: "missile",
    power: 1,
    charge: 14,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0.1,
    breach: 0.25,
    ammo: true,
    price: 40,
    blurb: "Ignores shields. Spends one missile. Can still miss.",
  },
  // Ion (Weapons), "Ion Blast": purchase price 30, power 1, charge 8 seconds, shots 1, ion damage per shot 1.
  // The section and the page lead give no hull damage, so damage is 0. Effect: low chance to stun. No percent is published. Stun is not a field.
  needle: {
    id: "needle",
    name: "Ion Blast",
    kind: "ion",
    power: 1,
    charge: 8,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 30,
    blurb: "No hull damage. A shield blocks it. If it lands, it locks one power bar for 5 seconds.",
  },
  // Missile (Weapons), "Artemis Missiles": sells for 19 (cannot be bought or found), so price is 0, not 19.
  // Power 1, charge 11 seconds, shots 1, damage per shot 2.
  // Effect: low chance of fire or breach. No percent is published. INFERRED removed: fire 0.1 and breach 0.09 were not on the page.
  // Low chance to stun is not a field. The lead says a missile spends 1 ammunition.
  artemis: {
    id: "artemis",
    name: "Artemis Missiles",
    kind: "missile",
    power: 1,
    charge: 11,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: true,
    price: 0,
    blurb: "Ignores shields. Two damage. Spends one missile. Can still miss.",
  },
  // Missile (Weapons), "Leto Missiles": sells for 10 (cannot be bought or found), so price is 0, not 10.
  // Power 1, charge 9 seconds, shots 1, damage per shot 1.
  // Effect: low chance of fire or breach. No percent is published. INFERRED removed: fire 0.1 and breach 0.09 were not on the page.
  // Low chance to stun is not a field. The lead says a missile spends 1 ammunition.
  leto: {
    id: "leto",
    name: "Leto Missiles",
    kind: "missile",
    power: 1,
    charge: 9,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: true,
    price: 0,
    blurb: "Ignores shields. One damage. Spends one missile. Can still miss.",
  },
  // Ion (Weapons), "Ion Blast Mark II": purchase price 70, power 3, charge 4 seconds, shots 1, ion damage per shot 1.
  // No hull damage is stated, so damage is 0. Effect: low chance to stun. No percent is published. Stun is not a field.
  ion2: {
    id: "ion2",
    name: "Ion Blast II",
    kind: "ion",
    power: 3,
    charge: 4,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 70,
    blurb: "No hull damage. Locks one power bar for 5 seconds if it gets past the shields.",
  },
  // Ion (Weapons), "Heavy Ion": purchase price 45, power 2, charge 13 seconds, shots 1, ion damage per shot 2.
  // No hull damage is stated, so damage is 0. Effect: moderate-low chance to stun. No percent is published. Stun is not a field.
  heavyion: {
    id: "heavyion",
    name: "Heavy Ion",
    kind: "ion",
    power: 2,
    charge: 13,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 2,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 45,
    blurb: "No hull damage. Two ion if it lands, which is two locked bars.",
  },
  // Ion (Weapons), "Ion Stunner": purchase price 35, power 1, charge 10 seconds, shots 1, ion damage per shot 1.
  // No hull damage is stated, so damage is 0. Effect: stuns crew in the room for 5 seconds. That stun is not a field.
  stunner: {
    id: "stunner",
    name: "Ion Stunner",
    kind: "ion",
    power: 1,
    charge: 10,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 35,
    blurb: "No hull damage. One ion if it lands. The page's room stun is not simulated.",
  },
  // Beam (Weapons), "Pike Beam": purchase price 55, power 2, charge 16 seconds, damage 1 per room.
  // The id `shear` is INVENTED. The display name is the wiki row those numbers match.
  // Halberd Beam is a different row: 65 scrap, 3 power, 17 seconds, 2 damage. It is registered from weapons-beam.ts.
  shear: {
    id: "shear",
    name: "Pike Beam",
    kind: "beam",
    power: 2,
    charge: 16,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 55,
    blurb: "One evade roll for the whole sweep. Shields subtract damage and stay up.",
  },
};

// Wiki page "Flak (Weapons)", section "Flak Gun Mark I", and wiki page "Bomb (Weapons)", section "Fire Bomb".
for (const extra of ORDNANCE) WEAPONS[extra.id] = extra;
// Ids already stored are left as they are. The added rows are wiki page "Laser (Weapons)", section "List of Laser weapons"; "Beam (Weapons)", section "List of Beam weapons"; "Ion (Weapons)", section "List of Ion weapons"; "Missile (Weapons)", section "List of Missile weapons"; "Bomb (Weapons)", section "List of Bomb weapons"; "Flak (Weapons)", section "List of Flak weapons"; "Crystal (Weapons)", section "List of Crystal weapons".
// `pike` is skipped: wiki page "Beam (Weapons)", section "Pike Beam", is already stored as `shear`.
for (const extra of [
  ...LASER_WEAPONS,
  ...BEAM_WEAPONS,
  ...ION_WEAPONS,
  ...MISSILE_WEAPONS,
  ...BOMB_WEAPONS,
  ...FLAK_CRYSTAL_WEAPONS,
]) {
  if (extra.id === "pike" || WEAPONS[extra.id]) continue;
  WEAPONS[extra.id] = extra;
}

export const SYS_LABEL: Record<SysId, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  medbay: "Medbay",
  weapons: "Weapons",
  pilot: "Piloting",
  sensors: "Sensors",
  doors: "Doors",
};

export const MAIN_SYSTEMS: SysId[] = [
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
];

/** Engines, "System Upgrades", Evasion column. Powered levels 1–8 with a working pilot: 5, 10, 15, 20, 25, 28, 31, 35. Index 0 is no engines. Manning is added in the sim. */
export const EVADE_TABLE = [0, 5, 10, 15, 20, 25, 28, 31, 35];

/** Engines, "FTL Drive charge time", unmanned column, levels 1–8. Index 0 is unused. */
export const FTL_UNMANNED = [0, 67.9, 53.1, 43.6, 36.9, 32.1, 28.3, 25.4, 23.0];

/** Engines, "FTL Drive charge time", manned columns, skill ranks 0 / 1 / 2. */
export const FTL_SKILL = [
  [0, 61.8, 48.3, 39.6, 33.6, 29.0, 25.7, 23.1, 20.9],
  [0, 58.0, 45.4, 37.2, 31.6, 27.5, 24.2, 21.7, 19.6],
  [0, 54.3, 42.6, 34.9, 29.5, 25.7, 22.6, 20.3, 18.4],
];

/** Engines, "FTL Drive charge time", manned skill 0. */
export const FTL_MANNED = FTL_SKILL[0];

/** INVENTED strings. Wiki page "Sectors" names different sector types (Civilian, Engi, Mantis, and the rest). The array is not replaced. */
export const SECTOR_NAMES = [
  "Cinder Reach",
  "Glass Margin",
  "Salt Lattice",
  "Red Kiln",
  "Quiet Arm",
  "Broken Mile",
  "Night Freight",
  "Shut Gate",
];

/** Template:Scrap rewards (Normal), Medium column, sectors 1–8. Easy and Hard are other templates and are not this array. */
export const SCRAP_MEDIUM: [number, number][] = [
  [12, 19],
  [16, 27],
  [21, 35],
  [26, 42],
  [31, 50],
  [36, 58],
  [40, 66],
  [45, 74],
];

/** Template:Scrap rewards (Medium), Easy column, sectors 1–8. */
const SCRAP_MEDIUM_EASY: [number, number][] = [
  [16, 27],
  [21, 35],
  [26, 42],
  [31, 50],
  [36, 58],
  [40, 66],
  [45, 74],
  [50, 81],
];

/** Template:Scrap rewards (Medium), Hard column, sectors 1–8. */
const SCRAP_MEDIUM_HARD: [number, number][] = [
  [12, 19],
  [12, 19],
  [16, 27],
  [21, 35],
  [26, 42],
  [31, 50],
  [36, 58],
  [40, 66],
];

/**
 * The Rebel Flagship: destroying stage 1 or stage 2 pays a high scrap reward at sector 1 value.
 * Stage 3 pays none. Easy high is 27–32. Normal and Hard high are 19–23.
 */
export function flagshipStageScrap(difficulty: Difficulty): [number, number] {
  if (difficulty === "easy") return [27, 32];
  return [19, 23];
}

/** Template:Scrap rewards (Medium), the column for the hangar difficulty. */
export function mediumScrapBand(difficulty: Difficulty, sector: number): [number, number] {
  const table = difficulty === "easy" ? SCRAP_MEDIUM_EASY : difficulty === "hard" ? SCRAP_MEDIUM_HARD : SCRAP_MEDIUM;
  return table[Math.min(7, Math.max(0, sector - 1))];
}

/**
 * Humans, "Race characteristics", column XP/level: Piloting 15, Engines 15, Shields 55, Weapons 65, Repair 18, Combat 8.
 * skillRank treats the next rank as another XP/level of the same amount.
 */
export const XP_NEED = {
  pilot: 15,
  engines: 15,
  weapons: 65,
  shields: 55,
  repair: 18,
  combat: 8,
} as const;

export function skillRank(xp: number, need: number): 0 | 1 | 2 {
  if (xp >= need * 2) return 2;
  if (xp >= need) return 1;
  return 0;
}

/** INVENTED personal names. Hangar crew cards repeat the wiki race count and do not use this pool. */
export const CREW_POOL = [
  "Ada Voss",
  "Ivo Park",
  "Nen Hale",
  "Brin Sol",
  "Quill Ade",
  "Mara Kent",
];

/** Wiki page "Shields", section "Overview": layers 1–2 restore in 2s, the 3rd in 1.72s, the 4th in 1.5s, the 5th in 1.33s. No later layer is listed, so that 1.33s is reused. INFERRED for a layer past the 5th. */
export function shieldLayerSeconds(layer: number): number {
  if (layer <= 2) return 2;
  if (layer === 3) return 1.72;
  if (layer === 4) return 1.5;
  return 1.33;
}

/**
 * Cost of the next level, keyed by the level already owned.
 * Weapon Control, Engines, Shields, Medbay, and Piloting "System Upgrades" tables.
 * Reactor bars: Template:Reactor power cost. The bar being bought is level + 1, and the cap is 25.
 * Ship: finishing a reactor that already has 8 bars costs 490 scrap.
 */
export function upgradeCost(id: SysId | "reactor", level: number): number | null {
  if (id === "reactor") {
    const next = level + 1;
    if (next > 25) return null;
    if (next <= 5) return 30;
    if (next <= 10) return 20;
    if (next <= 15) return 25;
    if (next <= 20) return 30;
    return 35;
  }
  const table: Partial<Record<SysId, Record<number, number>>> = {
    // Shields: 100 is Shields-1 to Shields-2 (Zoltan B). 125 is the store price of a missing Shields system, not this row.
    shields: { 1: 100, 2: 20, 3: 30, 4: 40, 5: 60, 6: 80, 7: 100 },
    // Engines: costs to reach levels 2–8 are 10, 15, 30, 40, 60, 80, 120.
    engines: { 1: 10, 2: 15, 3: 30, 4: 40, 5: 60, 6: 80, 7: 120 },
    // Oxygen, "System Upgrades": level 2 costs 25, level 3 costs 50.
    oxygen: { 1: 25, 2: 50 },
    // Medbay, "System Upgrades": level 2 costs 35, level 3 costs 45. The 50 on level 1 is the store purchase.
    medbay: { 1: 35, 2: 45 },
    // Weapon Control, "System Upgrades": level 2 is 40, then 25, 35, 50, 75, 90, 100 through level 8.
    weapons: { 1: 40, 2: 25, 3: 35, 4: 50, 5: 75, 6: 90, 7: 100 },
    // Piloting, "System Upgrades": level 2 costs 20, level 3 costs 50.
    pilot: { 1: 20, 2: 50 },
    // Sensors, "System Upgrades": level 3 costs 40.
    sensors: { 2: 40 },
    // Door System, "System Upgrades": level 1 is 60, level 2 is 35, level 3 is 50.
    doors: { 0: 60, 1: 35, 2: 50 },
  };
  return table[id]?.[level] ?? null;
}

/** Template:Stores: hull repairs in stores. Per hull point: 2 in sectors 1–3, 3 in 4–6, 4 in 7–8. */
export function hullRepairPerPoint(sector: number): number {
  if (sector >= 7) return 4;
  if (sector >= 4) return 3;
  return 2;
}

export function upgradeBlurb(id: SysId | "reactor", level: number): string {
  if (id === "reactor") return "One more bar in the pool.";
  if (id === "shields") {
    return level % 2 === 1
      ? "Next level adds a buffer bar."
      : "Next level adds a shield layer.";
  }
  if (id === "engines") return "More evasion, faster FTL charge.";
  if (id === "oxygen") return level === 1 ? "Refill ×4." : "Refill ×7.";
  if (id === "medbay") return "Heal faster than a room can choke you.";
  if (id === "weapons") return "More power for mounted guns.";
  if (id === "pilot" && level === 1) return "Autopilot: half of engine evasion with the chair empty. Jump still needs a body.";
  if (id === "pilot") return "Autopilot: 80% of engine evasion. Jump still needs a body.";
  if (id === "sensors") return "Read enemy weapon charge.";
  if (id === "doors" && level === 1) return "Blast doors. The page prices this step at 35. Fire through them is 10× slower. Boarders need 8 hits.";
  if (id === "doors") return "Heavier blast doors, priced at 50. A body on the console counts as one level higher.";
  return "";
}
