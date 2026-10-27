/**
 * Chain weapons. The loaded blueprint's `<boost>` is the profile.
 * Cooldown subtracts seconds from the blueprint charge.
 * Damage adds ion when the blueprint's ion is already above 0.
 * A damage boost on a weapon with no ion adds hull damage instead.
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

/**
 * Ion on the shot about to launch, or null when this step does not add ion.
 * A damage boost adds ion only when the blueprint already deals ion.
 * The last amount stays. A parsed laser stores ion 0, so it does not grow ion.
 */
export function chainIonAmount(defId: string, step: number): number | null {
  const boost = boostOf(defId);
  const base = weaponDef(defId)?.ion;
  if (!boost || boost.type !== "damage" || !(base != null && base > 0)) return null;
  const i = Math.max(0, Math.min(Math.floor(step), boost.count));
  return base + boost.amount * i;
}

/**
 * Hull damage on the shot about to launch, or null when this step does not add damage.
 * A damage boost adds hull damage when the blueprint deals no ion.
 * Chain Ion keeps its printed hull damage, which is 0.
 */
export function chainDamageAmount(defId: string, step: number): number | null {
  const boost = boostOf(defId);
  const weapon = weaponDef(defId);
  if (!boost || boost.type !== "damage" || !weapon || weapon.ion > 0) return null;
  const i = Math.max(0, Math.min(Math.floor(step), boost.count));
  return weapon.damage + boost.amount * i;
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
