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

/** Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer. Other guns print no pierce. */
const PIERCE_ONE = new Set(["heavypierce", "crystalburst", "crystalburst2", "heavycrystal", "heavycrystal2"]);

export function citedPierce(defId: string | undefined): number {
  if (!defId || !PIERCE_ONE.has(defId)) return 0;
  return 1;
}
