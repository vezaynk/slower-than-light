/**
 * Chain weapons. The loaded blueprint's `<boost>` is the profile.
 * Cooldown subtracts seconds from the blueprint charge. Damage adds ion to the blueprint ion.
 * Step 0 is that blueprint number. A weapon with no boost is not a chain weapon.
 */
import { weaponDef } from "@stl/pack";

type Boost = { type: "cooldown" | "damage"; amount: number; count: number };

function boostOf(defId: string): Boost | null {
  const boost = weaponDef(defId)?.boost;
  if (!boost || !(boost.count > 0)) return null;
  return boost;
}

/** Printed charge times are tenths of a second. Subtraction is rounded back to that tenth. */
function tenths(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Seconds for this charge, or null when the weapon is not a cooldown chain. The last time stays. */
export function chainChargeSeconds(defId: string, step: number): number | null {
  const boost = boostOf(defId);
  const base = weaponDef(defId)?.charge;
  if (!boost || boost.type !== "cooldown" || base == null) return null;
  const i = Math.max(0, Math.min(Math.floor(step), boost.count));
  return tenths(base - boost.amount * i);
}

/** Ion on the shot about to launch, or null when the weapon is not a damage chain. The last amount stays. */
export function chainIonAmount(defId: string, step: number): number | null {
  const boost = boostOf(defId);
  const base = weaponDef(defId)?.ion;
  if (!boost || boost.type !== "damage" || base == null) return null;
  const i = Math.max(0, Math.min(Math.floor(step), boost.count));
  return base + boost.amount * i;
}

export function isChainWeapon(defId: string): boolean {
  const boost = boostOf(defId);
  return boost != null && (boost.type === "cooldown" || boost.type === "damage");
}

/** Index after a shot actually leaves. Null when this id is not a chain weapon. Capped at `count`. */
export function nextChainStep(defId: string, step: number): number | null {
  const boost = boostOf(defId);
  if (!boost) return null;
  return Math.min(Math.max(0, Math.floor(step)) + 1, boost.count);
}
