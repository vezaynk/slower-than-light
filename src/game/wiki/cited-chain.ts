/**
 * Chain weapons. Wiki pages "Laser (Weapons)" and "Ion (Weapons)".
 * WeaponDef.charge stays the first printed step. Combat reads the rest here.
 */

/** Chain Burst Laser: "Charge-up profile: 16s/13s/10s/7s (-3s per step, 3 steps total)". */
const BURST_CHARGE = [16, 13, 10, 7] as const;
/**
 * Chain Vulcan: "Charge-up profile: 11.1s / 9.1s / 7.1s / 5.1s / 3.1s / 1.1s (-2s per step, 5 steps total)".
 * "It takes 35.5 seconds before the Vulcan gets up to full speed" is the sum of the first five.
 */
const VULCAN_CHARGE = [11.1, 9.1, 7.1, 5.1, 3.1, 1.1] as const;
/**
 * Chain Ion: "Ion damage per shot: 1, with each subsequent shot dealing 1 additional ion damage, up to a maximum of 4".
 * Charge time stays 14 seconds. "it takes 56 seconds to fully chain" is 4 × 14.
 */
const ION_STEPS = [1, 2, 3, 4] as const;

const CHARGE_STEPS: Record<string, readonly number[]> = {
  chainlaser: BURST_CHARGE,
  vulcan: VULCAN_CHARGE,
};

const ION_BY_ID: Record<string, readonly number[]> = {
  chainion: ION_STEPS,
};

function capped(steps: readonly number[], step: number): number {
  const i = Math.max(0, Math.min(Math.floor(step), steps.length - 1));
  return steps[i];
}

/** Seconds for this charge, or null when the weapon is not a charge-profile chain gun. The last time stays. */
export function chainChargeSeconds(defId: string, step: number): number | null {
  const steps = CHARGE_STEPS[defId];
  if (!steps) return null;
  return capped(steps, step);
}

/** Ion on the shot about to launch, or null when the weapon is not Chain Ion. The last amount stays. */
export function chainIonAmount(defId: string, step: number): number | null {
  const steps = ION_BY_ID[defId];
  if (!steps) return null;
  return capped(steps, step);
}

export function isChainWeapon(defId: string): boolean {
  return defId in CHARGE_STEPS || defId in ION_BY_ID;
}

/** Index after a shot actually leaves. Null when this id is not a chain weapon. Capped at the last printed step. */
export function nextChainStep(defId: string, step: number): number | null {
  const steps = CHARGE_STEPS[defId] ?? ION_BY_ID[defId];
  if (!steps) return null;
  return Math.min(Math.max(0, Math.floor(step)) + 1, steps.length - 1);
}
