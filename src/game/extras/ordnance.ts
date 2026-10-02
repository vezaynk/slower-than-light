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
  {
    id: "scatter",
    name: "Flak I",
    kind: "flak",
    // Flak (Weapons) "Flak Gun Mark I" and "Flak weapons table": 2 power, 10s, 3 shots, 1 damage, price 65.
    // Wiki flak gun: 2 power, 10s, 3 pellets, 1 damage, no fire, no breach, no missile. Store price 65.
    // Lead text: each projectile depletes one shield layer, and flak never causes fires or breaches.
    // "Understanding flak accuracy": each shot can miss on evasion, or miss the room inside the circle.
    // INFERRED: gap 0 ("all the shots arrive almost simultaneously"); ion 0; ammo false (no missile cost is listed).
    // MISMATCH: code has no radius and no fake projectiles. Wiki "Flak weapons table" says radius 42 and 3 fake flak.
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
  {
    id: "cask",
    name: "Fire Bomb",
    kind: "bomb",
    // Bomb (Weapons) "Fire Bomb" and "Bomb weapons table": 2 power, 15s, system damage 0, fire/breach/stun 100/0/0, price 50.
    // Wiki fire bomb: 2 power, 15s, 0 system damage, 100% fire, 0 breach. Store price 50. Spends a missile.
    // "Comparing bombs to missiles": 1 missile per shot; no hull damage. "Fire Bomb" also lists crew damage 30, which this def does not store.
    // INFERRED: shots 1, gap 0, ion 0. The page does not number them. fire 1 is the table's 100% chance.
    // Fire Bomb: guaranteed 1–2 fires. applyImpact adds the second on a coin flip. INFERRED: the page does not say how often it is 2.
    // Bomb lead: they can miss. applyImpact rolls evasion. They still do not pop shields.
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
