import { CREW_POOL, SYS_LABEL, WEAPONS, type WeaponDef } from "@stl/catalog";
import { tuneDef } from "@stl/pack";
import type { Difficulty, SysId } from "./types";

export type { WeaponDef };
export { CREW_POOL, SYS_LABEL, WEAPONS };

export const MAIN_SYSTEMS: SysId[] = ["shields", "engines", "oxygen", "medbay", "weapons"];

/** Engines, "System Upgrades", Evasion column. Powered levels 1–8 with a working pilot: 5, 10, 15, 20, 25, 28, 31, 35. Index 0 is no engines. Manning is added in the sim. */
export const EVADE_TABLE = [0, 5, 10, 15, 20, 25, 28, 31, 35];

/** Engines, "FTL Drive charge time", unmanned column, levels 1–8. Index 0 is unused. */
export const FTL_UNMANNED = [0, 67.9, 53.1, 43.6, 36.9, 32.1, 28.3, 25.4, 23.0];

/**
 * Engines, "FTL Drive charge time": a hazard or a boarder, with no enemy ship, charges from 23 seconds.
 * Nebula and plasma/ion storms are not that hazard. No hazard and no enemy charges instantly.
 * The in-fight table above is a different clock, used only while an enemy hull is on the scope.
 */
export const FTL_HAZARD_BASE = 23;

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
  const table =
    difficulty === "easy"
      ? SCRAP_MEDIUM_EASY
      : difficulty === "hard"
        ? SCRAP_MEDIUM_HARD
        : SCRAP_MEDIUM;
  return table[Math.min(7, Math.max(0, sector - 1))];
}

/**
 * Humans, "Race characteristics", column XP/level: Piloting 15, Engines 15, Shields 55, Weapons 65, Repair 18, Combat 8.
 * Crew skills, lead: Combat costs the least, Weapons the most, and Piloting matches Engines.
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
  // Crew skills, lead: "The amount of experience required to achieve skill level 1 and level 2 is exactly the same for a specific skill".
  if (xp >= need * 2) return 2;
  if (xp >= need) return 1;
  return 0;
}

/** Wiki page "Shields", section "Overview": layers 1–2 restore in 2s, the 3rd in 1.72s, the 4th in 1.5s, the 5th in 1.33s. No later layer is listed, so that 1.33s is reused. INFERRED for a layer past the 5th. */
export function shieldLayerSeconds(layer: number): number {
  if (layer <= 2) return 2;
  if (layer === 3) return 1.72;
  if (layer === 4) return 1.5;
  return 1.33;
}

/**
 * Cost of the next level, keyed by the level already owned.
 * System rows are the tune records. Reactor bars stay here.
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
  return tuneDef(id)?.costs.find((step) => step.level === level)?.cost ?? null;
}

/** Template:Stores: hull repairs in stores. Per hull point: 2 in sectors 1–3, 3 in 4–6, 4 in 7–8. */
export function hullRepairPerPoint(sector: number): number {
  if (sector >= 7) return 4;
  if (sector >= 4) return 3;
  return 2;
}

/** Effect of the level being bought. The argument is the level already owned. */
export function upgradeBlurb(id: SysId | "reactor", level: number): string {
  const next = level + 1;
  if (id === "reactor") return "One reactor bar. The cap is 25.";
  // Shields: every 2 system levels adds one bubble. The even level is that layer.
  if (id === "shields") return next % 2 === 0 ? "Adds a shield layer." : "Adds a power bar.";
  if (id === "engines") {
    const evade = EVADE_TABLE[next];
    return evade != null ? `${evade}% evasion with a working pilot.` : "";
  }
  // Oxygen, "System Upgrades": 4.8% at level 2, 8.4% at level 3.
  if (id === "oxygen" && level === 1) return "4.8% per second.";
  if (id === "oxygen" && level === 2) return "8.4% per second.";
  // Medbay, "System Upgrades": 9.6 HP/s and an airless bay at level 2, 19.2 HP/s at level 3.
  if (id === "medbay" && level === 1)
    return "9.6 HP per second. Crew can heal in an airless medbay.";
  if (id === "medbay" && level === 2) return "19.2 HP per second.";
  if (id === "weapons" && next <= 8) return `${next} weapon power.`;
  // Piloting, "System Upgrades": an empty chair keeps 50% at level 2 and 80% at level 3.
  if (id === "pilot" && level === 1) return "Empty chair keeps 50% of engine evasion.";
  if (id === "pilot" && level === 2) return "Empty chair keeps 80% of engine evasion.";
  // Sensors, "System Upgrades": level 2 sees both ships, level 3 also sees enemy weapon charge.
  if (id === "sensors" && level === 1)
    return "See interior of all rooms on your ship and the enemy ship.";
  if (id === "sensors" && level === 2) return "See enemy weapons charge.";
  // Door System, "System Upgrades": blast doors, then improved blast doors. Level 4 is manned only.
  if (id === "doors" && level === 1)
    return "Blast doors. Slows fire between rooms and impedes boarders.";
  if (id === "doors" && level === 2) return "Improved blast doors. Impedes boarders more.";
  return "";
}
