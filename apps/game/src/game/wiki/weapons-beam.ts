import { tx } from "../../i18n/index.ts";
import type { WeaponDef } from "../content.ts";

/**
 * Beam rows from wiki page "Beam (Weapons)" that are not already fitted.
 * Artillery Beam is not a WeaponDef. src/game/extras/lance.ts owns that system.
 * Boss Beam is not in this list. flagship-weapons.ts stores power 3 as the artillery maximum.
 * INFERRED: that 3 is not a Weapons-pool cost. The section states no power requirement.
 * Printed crew-damage HP is BEAM_CREW. Fire Beam prints a dash, so it is omitted.
 * "Per room tile" is not a WeaponDef or Shot field, so the HP is not multiplied by tiles.
 */

export const BEAM_WEAPONS: WeaponDef[] = [
  {
    id: "mini",
    name: tx("wiki.weapons-beam.mini-beam"),
    kind: "beam",
    // Beam (Weapons), "Mini Beam": 1 power, charge 12 seconds, 1 damage per room.
    // Sells for: 10. Cannot be bought or found, so price is 0.
    // Effect: 10% chance to start fire (per tile), so fire is 0.1.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length 45 and crew damage 15 are in BEAM_GAPS. Comes equipped on Stealth A and Stealth C.
    power: 1,
    charge: 12,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0.1,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: tx("wiki.weapons-beam.extremely-cheap-and-weak-beam-weapon"),
  },
  {
    id: "pike",
    name: tx("wiki.weapons-beam.pike-beam"),
    kind: "beam",
    // Beam (Weapons), "Pike Beam": 2 power, charge 16 seconds, 1 damage per room.
    // Purchase price: 55. Store rarity: 2.
    // Effect: -, so fire is 0.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length 170 and crew damage 15 are in BEAM_GAPS. Comes equipped on Zoltan B.
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
    blurb: tx("wiki.weapons-beam.can-cut-across-entire-ships-assuming"),
  },
  {
    id: "hullbeam",
    name: tx("wiki.weapons-beam.hull-beam"),
    kind: "beam",
    // Beam (Weapons), "Hull Beam": 2 power, charge 14 seconds, 1 damage per room.
    // The parenthetical 2 damage on systemless rooms is in BEAM_GAPS.
    // Purchase price: 70. Store rarity: 3.
    // Effect: -, so fire is 0.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length 100 and crew damage 15 are in BEAM_GAPS.
    power: 2,
    charge: 14,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 70,
    blurb: tx("wiki.weapons-beam.this-beam-is-most-powerful-when"),
  },
  {
    id: "halberd",
    name: tx("wiki.weapons-beam.halberd-beam"),
    kind: "beam",
    // Beam (Weapons), "Halberd Beam": 3 power, charge 17 seconds, 2 damage per room.
    // Purchase price: 65. Store rarity: 2.
    // Effect: -, so fire is 0.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length, rooms hit, and the 1-shield pierce line are in BEAM_GAPS.
    // Comes equipped on Zoltan A.
    power: 3,
    charge: 17,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 65,
    blurb: tx("wiki.weapons-beam.slow-but-reliably-powerful-standard-beam"),
  },
  {
    id: "glaive",
    name: tx("wiki.weapons-beam.glaive-beam"),
    kind: "beam",
    // Beam (Weapons), "Glaive Beam": 4 power, charge 25 seconds, 3 damage per room.
    // Purchase price: 95. Store rarity: 5.
    // Effect: -, so fire is 0.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length and shield-pierce lines are in BEAM_GAPS. Comes equipped on Stealth B.
    power: 4,
    charge: 25,
    shots: 1,
    gap: 0,
    damage: 3,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 95,
    blurb:
      tx("wiki.weapons-beam.one-of-the-most-powerful-weapons"),
  },
  {
    id: "firebeam",
    name: tx("wiki.weapons-beam.fire-beam"),
    kind: "beam",
    // Beam (Weapons), "Fire Beam": 2 power, charge 20 seconds.
    // Damage: -. The quote says it does no physical damage, so damage is 0.
    // Crew damage: -. No crew figure is stated.
    // Effect: 80% chance to start fire (per tile), so fire is 0.8.
    // Purchase price: 50. Store rarity: 3.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Length 140 and the Zoltan Shield line are in BEAM_GAPS.
    power: 2,
    charge: 20,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 0,
    fire: 0.8,
    breach: 0,
    ammo: false,
    price: 50,
    blurb: tx("wiki.weapons-beam.this-terrifying-beam-does-no-physical"),
  },
  {
    id: "antibio",
    name: tx("wiki.weapons-beam.anti-bio-beam"),
    kind: "beam",
    // Beam (Weapons), "Anti-Bio Beam": 2 power, charge 16 seconds.
    // Damage: -. The quote says it does no physical damage, so damage is 0.
    // Crew damage 60 HP per room tile is not hull damage. It is in BEAM_GAPS.
    // Effect: -, so fire is 0.
    // Purchase price: 50. Store rarity: 5.
    // INFERRED: shots 1, gap 0, ion 0, breach 0. The section states none of those.
    // Comes equipped on Slug A. Enemies never use this weapon.
    power: 2,
    charge: 16,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 50,
    blurb:
      tx("wiki.weapons-beam.this-terrifying-beam-does-no-physical-2"),
  },
];

/**
 * Crew-damage HP printed on Beam (Weapons).
 * Fire Beam's crew line is "-", not a number. Boss Beam prints no crew line.
 * Artillery Beam prints 15 HP per room tile. lance.ts applies the cut when the swipe finishes.
 */
/**
 * Beam (Weapons): the parenthetical tile count, not the pixel figure.
 * `shear` is the fitted id of the Pike Beam row.
 * Artillery Beam is not aimed with this line. Its length is ARTILLERY_BEAM_PX.
 */
export const BEAM_TILES: Record<string, number> = {
  // "Beam length: 45 (1 tile diagonally)"
  mini: 1,
  // "Beam length: 170 (3.8 tiles diagonally)"
  pike: 3.8,
  shear: 3.8,
  // "Beam length: 100 (2.2 tiles diagonally)"
  hullbeam: 2.2,
  // "Beam length: 80 (1.8 tiles diagonally)"
  halberd: 1.8,
  // "Beam length: 80 (1.8 tiles diagonally)"
  glaive: 1.8,
  // "Beam length: 140 (3.1 tiles diagonally)"
  firebeam: 3.1,
  // "Beam length: 140 (3.1 tiles diagonally)"
  antibio: 3.1,
  // Beam (Weapons), Boss Beam: "Beam length: 100 (2.2 tiles diagonally)".
  bossbeam: 2.2,
};

export function beamTileLength(defId: string | undefined): number | null {
  if (!defId || !Object.prototype.hasOwnProperty.call(BEAM_TILES, defId)) return null;
  return BEAM_TILES[defId];
}

/** Printed length of the stroke, in tiles. Artillery Beam is 500px, and 45px is one tile. */
export function beamBodyTiles(defId: string | undefined): number | null {
  if (defId === "artillery-beam") return ARTILLERY_BEAM_PX / 45;
  return beamTileLength(defId);
}

/**
 * Swipe speed from https://ftlmultiverse.miraheze.org/wiki/Data:WeaponDatabase.map
 * matched by the vanilla blueprint id. The FTL wiki says the speed depends on the weapon and prints no number.
 * Multiverse Beam page: speed 5 moves 80 pixels in one second, so pixels per second are speed × 16.
 * Beam (Weapons) counts 45 pixels as one diagonal tile, the same unit as BEAM_TILES and clipBeamEnd.
 * Boss Beam and Artillery Beam are not in that database. Their speeds are the FTL template column.
 */
export const BEAM_SPEED: Record<string, number> = {
  // BEAM_1, 'Spetum' Beam, speed 3.
  mini: 3,
  // BEAM_LONG, 'Pike' Beam, speed 9. Fitted id is shear.
  pike: 9,
  shear: 9,
  // BEAM_HULL, 'Lucerne' Beam, speed 5.
  hullbeam: 5,
  // BEAM_2, 'Halberd' Beam, speed 5.
  halberd: 5,
  // BEAM_3, 'Glaive' Beam, speed 5.
  glaive: 5,
  // BEAM_FIRE, 'Torch' Beam, speed 5.
  firebeam: 5,
  // BEAM_BIO, 'Faucon' Rad-Beam, speed 30.
  antibio: 30,
  // Template:Beam weapons, Boss Beam: speed 5. Length 100 (2.2 tiles) is BEAM_TILES.
  bossbeam: 5,
  // Template:Beam weapons, Artillery Beam: speed 13. Length 500 is ARTILLERY_BEAM_PX.
  "artillery-beam": 13,
};

/** Template:Beam weapons, Artillery Beam: length 500. The swipe is this long, not the span of the target hull. */
export const ARTILLERY_BEAM_PX = 500;

/** Drawn shot label. stepShots animates it and does not apply weapon damage; tickLance lands the cut. */
export const ARTILLERY_SHOT_LABEL = "artillery-beam";

/** Seconds for the printed 500px Artillery Beam swipe at speed 13. */
export function artillerySwipeSeconds(): number {
  return beamSwipeSeconds("artillery-beam", ARTILLERY_BEAM_PX / 45) ?? 0;
}

/** Seconds for a swipe of `tiles` at this weapon's speed, or null when no speed is listed. */
export function beamSwipeSeconds(defId: string | undefined, tiles: number): number | null {
  if (!defId || !Object.prototype.hasOwnProperty.call(BEAM_SPEED, defId)) return null;
  const speed = BEAM_SPEED[defId];
  if (!(speed > 0)) return null;
  return (Math.max(0, tiles) * 45) / (speed * 16);
}

export const BEAM_CREW: Record<string, number> = {
  // Beam (Weapons), "Mini Beam": Crew damage: 15 HP per room tile.
  mini: 15,
  // Beam (Weapons), "Pike Beam": Crew damage: 15 HP per room tile. Fitted id is shear, not pike.
  pike: 15,
  // Beam (Weapons), "Hull Beam": Crew damage: 15 HP per room tile.
  hullbeam: 15,
  // Beam (Weapons), "Halberd Beam": Crew damage: 30 HP per room tile.
  halberd: 30,
  // Beam (Weapons), "Glaive Beam": Crew damage: 45 HP per room tile.
  glaive: 45,
  // Beam (Weapons), "Anti-Bio Beam": Crew damage: 60 HP per room tile.
  antibio: 60,
};

export const BEAM_GAPS: { id: string; note: string }[] = [
  {
    id: "mini",
    note: tx("wiki.weapons-beam.beam-weapons-mini-beam-beam-length"),
  },
  {
    id: "pike",
    note: tx("wiki.weapons-beam.beam-weapons-pike-beam-beam-length"),
  },
  {
    id: "hullbeam",
    note: tx("wiki.weapons-beam.beam-weapons-hull-beam-beam-length"),
  },
  {
    id: "halberd",
    note: tx("wiki.weapons-beam.beam-weapons-halberd-beam-beam-length"),
  },
  {
    id: "glaive",
    note: tx("wiki.weapons-beam.beam-weapons-glaive-beam-beam-length"),
  },
  {
    id: "firebeam",
    note: tx("wiki.weapons-beam.beam-weapons-fire-beam-beam-length"),
  },
  {
    id: "antibio",
    note: tx("wiki.weapons-beam.beam-weapons-anti-bio-beam-beam"),
  },
  {
    id: "artillery-beam",
    // Beam (Weapons), "Artillery Beam": no WeaponDef. lance.ts owns the system.
    note: tx("wiki.weapons-beam.lance-ts-owns-the-system-beam"),
  },
  {
    id: "bossbeam",
    // Beam (Weapons), "Boss Beam": "Artillery system: with 3 system levels maximum". No power requirement.
    // INFERRED: that maximum is the WeaponDef power in flagship-weapons.ts, and it is not a Weapons-pool cost.
    note: tx("wiki.weapons-beam.inferred-the-artillery-maximum-is-3"),
  },
  {
    id: "shield-layers",
    // Beam (Weapons), "Beam targeting and damage mechanics".
    note: tx("wiki.weapons-beam.beam-weapons-beam-targeting-and-damage"),
  },
  {
    id: "swipe",
    // Beam (Weapons), "Beam targeting and damage mechanics".
    note: tx("wiki.weapons-beam.beam-weapons-beam-targeting-and-damage-2"),
  },
  {
    id: "zoltan-shield",
    // Beam (Weapons), "Beams vs Zoltan Shields".
    note: tx("wiki.weapons-beam.beam-weapons-beams-vs-zoltan-shields"),
  },
];
