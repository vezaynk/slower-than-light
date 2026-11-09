import "../pack/base.ts";
import { weaponDef } from "@stl/pack";
import type { Shot } from "../types.ts";

/**
 * Crew damage for a hit when that weapon's own wiki section prints a number.
 * Null keeps Weapons, "Weapons: general information": 15 damage per system point.
 * A dash is not a number. Lasers, flak, missiles, ions, and crystal rows print none.
 * The bomb and beam figures are flat HP, not scaled by the landed system damage.
 * Beam pages say "per room tile". Shot has no tile count, so the HP is not multiplied.
 * Chain stays off the weapon: WeaponDef has no chain field.
 * Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer. citedPierce is that 1.
 * Zero is a value: an ion bomb prints a dash of crew damage and stores 0.
 */
export function citedCrewDamage(shot: Shot, _damage: number): number | null {
  if (!shot.defId) return null;
  const packed = weaponDef(shot.defId)?.crewDamage;
  return packed ?? null;
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
/**
 * `<hullBust>` is a flag. The systemless figure is twice the blueprint's hull damage:
 * 2, 2, and 2 for the lasers and the beam, and 4 for the missile.
 */
export function systemlessHull(defId: string | undefined): number | null {
  if (!defId) return null;
  const weapon = weaponDef(defId);
  if (weapon?.hullBust == null || !(weapon.hullBust > 0)) return null;
  return weapon.damage * 2;
}

/**
 * Shield layers the shot bypasses: the blueprint's `<sp>`. A weapon without one pierces nothing.
 * Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer; both archives write `<sp>1</sp>` on them.
 * applyImpact reads this for every shot. Kind does not skip the bubble. An ammo missile writes `<sp>5</sp>`,
 * so it passes every ordinary layer. Crystal guns are missiles with no ammo and `<sp>1</sp>`, so a second layer stops them.
 */
export function citedPierce(defId: string | undefined): number {
  return (defId ? weaponDef(defId)?.pierce : undefined) ?? 0;
}
