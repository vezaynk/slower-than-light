import type { WeaponDef } from "../content.ts";

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
 * Flak I and the Fire Bomb. Display names match those rows.
 */
export const ORDNANCE: WeaponDef[] = [
  // Flak (Weapons), "Flak Gun Mark I": purchase price 65, power 2, charge 10 seconds, shots 3, damage per shot 1.
  // That section also lists targeting radius 42 and 3 additional fake flak. Neither is a field here.
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
