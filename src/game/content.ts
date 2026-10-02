import type { SysId, WeaponKind } from "./types";
import { ORDNANCE } from "./extras/ordnance.ts";

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
 * Weapon names follow the wiki row when the numbers match that row.
 * Burst Laser II: 2 power, 12s, 3 shots, 1 damage, 10% fire.
 * Basic Laser: 1 power, 10s, 1 shot. Dual Lasers: 1 power, 10s, 2 shots.
 * Heavy Laser: 1 power, 9s, 2 damage. Ion Blast: 1 power, 8s, 1 ion.
 * INVENTED: Dart's 14s charge is not player Artemis (11s) or Leto (9s), so it keeps its own name.
 * Shear is a short beam. INFERRED: 16s is not Pike 14s or Halberd 17s, so it keeps its own name.
 */
export const WEAPONS: Record<string, WeaponDef> = {
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
    fire: 0.1,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "Three bolts. The first one only buys down a shield layer.",
  },
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
    fire: 0.08,
    breach: 0,
    ammo: false,
    price: 20,
    blurb: "One bolt. A shield layer stops it whole.",
  },
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
    fire: 0.08,
    breach: 0,
    ammo: false,
    price: 35,
    blurb: "Two bolts from a single power bar.",
  },
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
    fire: 0,
    breach: 0.05,
    ammo: false,
    price: 45,
    blurb: "Two hull if it lands. One shield layer still eats the entire shot.",
  },
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
    price: 38,
    blurb: "No hull damage. A shield blocks it. If it lands, it locks one power bar for 5 seconds.",
  },
  artemis: {
    id: "artemis",
    name: "Artemis Missiles",
    kind: "missile",
    // Missile (Weapons), "Missile weapons table", player Artemis: 1 power, 11s, 1 shot, 2 damage.
    // Fire, breach, stun 10 / 9 / 10. Sells for 19. Spends one missile.
    // MISMATCH: stun is not applied. WeaponDef has no stun field.
    power: 1,
    charge: 11,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0.1,
    breach: 0.09,
    ammo: true,
    price: 19,
    blurb: "Ignores shields. Two damage. Spends one missile. Can still miss.",
  },
  leto: {
    id: "leto",
    name: "Leto Missiles",
    kind: "missile",
    // Missile (Weapons), "Missile weapons table", Leto: 1 power, 9s, 1 shot, 1 damage.
    // Fire, breach, stun 10 / 9 / 10. Sells for 10. Spends one missile.
    // MISMATCH: stun is not applied.
    power: 1,
    charge: 9,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0.1,
    breach: 0.09,
    ammo: true,
    price: 10,
    blurb: "Ignores shields. One damage. Spends one missile. Can still miss.",
  },
  ion2: {
    id: "ion2",
    name: "Ion Blast II",
    kind: "ion",
    // Ion (Weapons), "Ion weapons table", Ion Blast II: 3 power, 4s, 1 shot, 1 ion, price 70.
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
  heavyion: {
    id: "heavyion",
    name: "Heavy Ion",
    kind: "ion",
    // Ion (Weapons), "Ion weapons table", Heavy Ion: 2 power, 13s, 1 shot, 2 ion, price 45.
    // Stun 20% is not applied.
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
  stunner: {
    id: "stunner",
    name: "Ion Stunner",
    kind: "ion",
    // Ion (Weapons), "Ion weapons table", Ion Stunner: 1 power, 10s, 1 shot, 1 ion, price 35.
    // The table's 100% stun (5 seconds) is not applied. MISMATCH.
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
  shear: {
    id: "shear",
    name: "Shear",
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

for (const extra of ORDNANCE) WEAPONS[extra.id] = extra;

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

/** Engines, evasion from powered bars alone, levels 0–8. Manning is added in the sim. */
export const EVADE_TABLE = [0, 5, 10, 15, 20, 25, 28, 31, 35];

/** Engines, "FTL Charge Times", unmanned, by powered engine level. */
export const FTL_UNMANNED = [0, 67.9, 53.1, 43.6, 36.9, 32.1, 28.3, 25.4, 23.0];

/** Engines, "FTL Charge Times", manned, skill ranks 0 / 1 / 2. */
export const FTL_SKILL = [
  [0, 61.8, 48.3, 39.6, 33.6, 29.0, 25.7, 23.1, 20.9],
  [0, 58.0, 45.4, 37.2, 31.6, 27.5, 24.2, 21.7, 19.6],
  [0, 54.3, 42.6, 34.9, 29.5, 25.7, 22.6, 20.3, 18.4],
];

/** Wiki FTL charge seconds, engines manned at the first skill tier. */
export const FTL_MANNED = FTL_SKILL[0];

/** INVENTED names. Sector count of 8 matches the campaign length, not these labels. */
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

/** Rewards, medium difficulty scrap band by sector. INFERRED label: the page's "medium" row for sectors 1–8. */
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

/** Skills: XP to reach rank 1. Rank 2 is twice that. INFERRED amounts; the skills page lists ranks but these thresholds were not re-checked this pass. */
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

export const CREW_POOL = [
  "Ada Voss",
  "Ivo Park",
  "Nen Hale",
  "Brin Sol",
  "Quill Ade",
  "Mara Kent",
];

/** Shields, recharge: layers 1–2 take 2s, the 3rd 1.72s, the 4th 1.5s, the 5th 1.33s. */
export function shieldLayerSeconds(layer: number): number {
  if (layer <= 2) return 2;
  if (layer === 3) return 1.72;
  if (layer === 4) return 1.5;
  return 1.33;
}

/**
 * Cost of the next level, keyed by the current level.
 * Door System "System Upgrades": the cost column is the price of that level.
 * Level 1 is 60 (buying the system), level 2 is 35, level 3 is 50. Keyed here by the level you already have.
 * Reactor stepping and several other rows are INFERRED where a full table was not copied.
 */
export function upgradeCost(id: SysId | "reactor", level: number): number | null {
  if (id === "reactor") {
    if (level >= 16) return null;
    return 20 + Math.max(0, level - 8) * 5;
  }
  const table: Partial<Record<SysId, Record<number, number>>> = {
    shields: { 2: 20, 3: 30, 4: 40, 5: 60, 6: 80, 7: 100 },
    engines: { 1: 10, 2: 15, 3: 30, 4: 40, 5: 60, 6: 80, 7: 120 },
    oxygen: { 1: 25, 2: 50 },
    medbay: { 1: 35 },
    weapons: { 3: 25, 4: 40, 5: 60 },
    pilot: { 1: 20, 2: 50 },
    sensors: { 2: 40 },
    doors: { 0: 60, 1: 35, 2: 50 },
  };
  return table[id]?.[level] ?? null;
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
