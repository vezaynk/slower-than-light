import type { Shot } from "../types.ts";
import { BEAM_CREW } from "./weapons-beam.ts";
import { BOMB_CREW } from "./weapons-bomb.ts";

/**
 * Crew damage for a hit when that weapon's own wiki section prints a number.
 * Null keeps Weapons, "Weapons: general information": 15 damage per system point.
 * A dash is not a number. Lasers, flak, missiles, ions, and crystal rows print none.
 * The bomb and beam figures are flat HP, not scaled by the landed system damage.
 * Beam pages say "per room tile". Shot has no tile count, so the HP is not multiplied.
 * Chain stays off the weapon: WeaponDef has no chain field.
 * Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer. citedPierce is that 1.
 */
const CREW_BY_ID: Record<string, number> = {
  ...BOMB_CREW,
  ...BEAM_CREW,
  // content.ts stores Beam (Weapons), "Pike Beam" as shear and skips id pike.
  shear: BEAM_CREW.pike,
};

export function citedCrewDamage(shot: Shot, _damage: number): number | null {
  if (!shot.defId || !Object.prototype.hasOwnProperty.call(CREW_BY_ID, shot.defId)) return null;
  return CREW_BY_ID[shot.defId];
}

/**
 * Hull damage on a room with no system.
 * Laser (Weapons), "Types of lasers": each Hull Laser shot "does 2 hull damage when hitting a systemless room."
 * The same section: "Hull Lasers' crew damage is not increased if they hit crew in systemless rooms."
 * Hull Smasher I and II print "1 (to system rooms) or 2 (to systemless rooms)".
 * Beam (Weapons), "Hull Beam": "1 damage per room hit (2 damage on systemless rooms)". Crew damage stays the printed 15.
 * Missile (Weapons), "Hull Missile": "2 (to system rooms) or 4 (to systemless rooms)".
 * INFERRED: that 4 is hull damage, and crew stay on the system-room 2, the split the laser page states.
 * A kit room counts as a system room. The pages say "system rooms" and "empty rooms" and do not mention kits.
 */
const SYSTEMLESS_HULL: Record<string, number> = {
  hullsmash: 2,
  hullsmash2: 2,
  hullbeam: 2,
  hullmissile: 4,
};

export function systemlessHull(defId: string | undefined): number | null {
  if (!defId || !Object.prototype.hasOwnProperty.call(SYSTEMLESS_HULL, defId)) return null;
  return SYSTEMLESS_HULL[defId];
}

/** Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer. Other guns print no pierce. */
const PIERCE_ONE = new Set(["heavypierce", "crystalburst", "crystalburst2", "heavycrystal", "heavycrystal2"]);

export function citedPierce(defId: string | undefined): number {
  if (!defId || !PIERCE_ONE.has(defId)) return 0;
  return 1;
}
