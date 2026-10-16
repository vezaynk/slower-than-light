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
    id: "BEAM_1",
    name: "Mini Beam",
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
    blurb: "Extremely cheap and weak beam weapon.",
  },
  {
    id: "BEAM_LONG",
    name: "Pike Beam",
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
    blurb: "Can cut across entire ships, assuming there's no shield to stop it.",
  },
  {
    id: "BEAM_HULL",
    name: "Hull Beam",
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
    blurb: "This beam is most powerful when targeting large, empty sections of hull.",
  },
  {
    id: "BEAM_2",
    name: "Halberd Beam",
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
    blurb: "Slow but reliably powerful standard beam weapon.",
  },
  {
    id: "BEAM_3",
    name: "Glaive Beam",
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
      "One of the most powerful weapons of war ever created. Known to take out some ships in a single blast.",
  },
  {
    id: "BEAM_FIRE",
    name: "Fire Beam",
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
    blurb: "This terrifying beam does no physical damage but ignites fires.",
  },
  {
    id: "BEAM_BIO",
    name: "Anti-Bio Beam",
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
      "This terrifying beam does no physical damage, but rips through organic material, dealing heavy damage to crew members.",
  },
];

/**
 * Crew-damage HP printed on Beam (Weapons).
 * Fire Beam's crew line is "-", not a number. Boss Beam prints no crew line.
 * Artillery Beam prints 15 HP per room tile. lance.ts applies the cut when the swipe finishes.
 */
/**
 * Beam (Weapons): the parenthetical tile count, not the pixel figure.
 * Pike Beam and the fitted beam share BEAM_LONG.
 * Artillery Beam is not aimed with this line. Its length is ARTILLERY_BEAM_PX.
 */
export const BEAM_TILES: Record<string, number> = {
  // "Beam length: 45 (1 tile diagonally)"
  BEAM_1: 1,
  // "Beam length: 170 (3.8 tiles diagonally)". Pike Beam uses the same blueprint.
  BEAM_LONG: 3.8,
  // "Beam length: 100 (2.2 tiles diagonally)"
  BEAM_HULL: 2.2,
  // "Beam length: 80 (1.8 tiles diagonally)"
  BEAM_2: 1.8,
  // "Beam length: 80 (1.8 tiles diagonally)"
  BEAM_3: 1.8,
  // "Beam length: 140 (3.1 tiles diagonally)"
  BEAM_FIRE: 3.1,
  // "Beam length: 140 (3.1 tiles diagonally)"
  BEAM_BIO: 3.1,
  // Beam (Weapons), Boss Beam: "Beam length: 100 (2.2 tiles diagonally)".
  ARTILLERY_BOSS_3: 2.2,
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
  BEAM_1: 3,
  // BEAM_LONG, 'Pike' Beam, speed 9.
  BEAM_LONG: 9,
  // BEAM_HULL, 'Lucerne' Beam, speed 5.
  BEAM_HULL: 5,
  // BEAM_2, 'Halberd' Beam, speed 5.
  BEAM_2: 5,
  // BEAM_3, 'Glaive' Beam, speed 5.
  BEAM_3: 5,
  // BEAM_FIRE, 'Torch' Beam, speed 5.
  BEAM_FIRE: 5,
  // BEAM_BIO, 'Faucon' Rad-Beam, speed 30.
  BEAM_BIO: 30,
  // Template:Beam weapons, Boss Beam: speed 5. Length 100 (2.2 tiles) is BEAM_TILES.
  ARTILLERY_BOSS_3: 5,
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
  BEAM_1: 15,
  // Beam (Weapons), "Pike Beam": Crew damage: 15 HP per room tile. The unregistered pike row is the same blueprint.
  BEAM_LONG: 15,
  // Beam (Weapons), "Hull Beam": Crew damage: 15 HP per room tile.
  BEAM_HULL: 15,
  // Beam (Weapons), "Halberd Beam": Crew damage: 30 HP per room tile.
  BEAM_2: 30,
  // Beam (Weapons), "Glaive Beam": Crew damage: 45 HP per room tile.
  BEAM_3: 45,
  // Beam (Weapons), "Anti-Bio Beam": Crew damage: 60 HP per room tile.
  BEAM_BIO: 60,
};

export const BEAM_GAPS: { id: string; note: string }[] = [
  {
    id: "BEAM_1",
    note: 'Beam (Weapons), "Mini Beam": beam length 45 (1 tile diagonally). Crew damage 15 HP per room tile. WeaponDef has no length or crew-damage field.',
  },
  {
    id: "BEAM_LONG",
    note: 'Beam (Weapons), "Pike Beam": beam length 170 (3.8 tiles diagonally). Crew damage 15 HP per room tile. WeaponDef has no length or crew-damage field.',
  },
  {
    id: "BEAM_HULL",
    note: 'Beam (Weapons), "Hull Beam": beam length 100 (2.2 tiles diagonally). 2 damage on systemless rooms, applied as hull damage. Each shield layer cuts that figure by one. Crew damage 15 HP per room tile. WeaponDef stores only the 1 damage per room.',
  },
  {
    id: "BEAM_2",
    note: 'Beam (Weapons), "Halberd Beam": beam length 80 (1.8 tiles diagonally). Can target 3-4 rooms straight, 2-3 diagonally, 5 max. Still deals 1 damage per room through 1 shield. Crew damage 30 HP per room tile.',
  },
  {
    id: "BEAM_3",
    note: 'Beam (Weapons), "Glaive Beam": beam length 80 (1.8 tiles diagonally). Still deals 1 damage per room through 2 shields, or 2 damage per room through 1 shield. Crew damage 45 HP per room tile.',
  },
  {
    id: "BEAM_FIRE",
    note: 'Beam (Weapons), "Fire Beam": beam length 140 (3.1 tiles diagonally). Deals 1 point of damage twice against Zoltan Shields. Crew damage is listed as "-". Fires: "Fire beams can be blocked by a regular shield barrier (1 is enough)".',
  },
  {
    id: "BEAM_BIO",
    note: 'Beam (Weapons), "Anti-Bio Beam": beam length 140 (3.1 tiles diagonally). Crew damage 60 HP per room tile, which is not hull damage. Deals 1 point of damage twice against Zoltan Shields. Beam (Weapons): "even one shield layer is enough to block most beam weapons."',
  },
  {
    id: "artillery-beam",
    // Beam (Weapons), "Artillery Beam": no WeaponDef. lance.ts owns the system.
    note: 'lance.ts owns the system. Beam (Weapons), "Artillery Beam": artillery system with 4 system levels maximum. Charge time 50s for level 1, reduced by 10 seconds for each level above 1 to a minimum of 20s for level 4. Beam length 500 (12.5 tiles diagonally). Deals 1 damage per room hit and ignores all standard shields. Crew damage 15 HP per room tile. Effect: 10% chance to start fire (per tile). Pre-installed on Federation Cruiser Layout A and Layout B. Opening paragraph: pierces all regular shield layers (up to all 5).',
  },
  {
    id: "ARTILLERY_BOSS_3",
    // Beam (Weapons), "Boss Beam": "Artillery system: with 3 system levels maximum". No power requirement.
    // INFERRED: that maximum is the WeaponDef power in flagship-weapons.ts, and it is not a Weapons-pool cost.
    note: 'INFERRED: the artillery maximum is 3, stored on the WeaponDef in flagship-weapons.ts, and it is not a Weapons-pool cost. Beam (Weapons), "Boss Beam" states no power requirement. This catalog does not emit a second WeaponDef. Charge time 32.5s for level 1, 26s for level 2, 19.5s for level 3. Beam length 100 (2.2 tiles diagonally). Deals 2 damage per room hit. Artillery system with 3 system levels maximum. Only used by the Rebel Flagship in phase 1-2. The italic quote is inside an HTML comment and is not copied.',
  },
  {
    id: "shield-layers",
    // Beam (Weapons), "Beam targeting and damage mechanics".
    note: 'Beam (Weapons), "Beam targeting and damage mechanics": the damage of a beam is reduced by one for every shield layer. Beams do not deplete regular shield layers. A 2-damage Halberd Beam deals 1 damage per room through 1 shield layer. Damage to crew drones is halved. A drone that already has health and is in the room takes half the crew damage.',
  },
  {
    id: "swipe",
    // Beam (Weapons), "Beam targeting and damage mechanics".
    note: 'Beam (Weapons), "Beam targeting and damage mechanics": the first click sets the starting point and the second click fires. Even a tiny edge of a room counts, and damage is applied when the beam first enters that room. A longer swipe stops at the printed tile length. A closer click is not stretched. Halberd\'s "3-4 rooms straight, 2-3 diagonally, 5 max" is not the room rule. Enemies still start in the centre of a room. INFERRED: an enemy swipe adds one door-neighbour.',
  },
  {
    id: "zoltan-shield",
    // Beam (Weapons), "Beams vs Zoltan Shields".
    note: 'Beam (Weapons), "Beams vs Zoltan Shields": first damage instance at 33% of the beam path, second at 80%. Beams that do no hull damage do 1 damage per instance. A Halberd Beam deals 4 damage (2 x 2 instances). A Fire Beam or Anti-Bio Beam deals 2 damage (1 x 2 instances).',
  },
];
