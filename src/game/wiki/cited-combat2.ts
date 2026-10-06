import { shieldLayerSeconds } from "../content.ts";

/**
 * Wiki page "Drone Control", section "Combat Drone Mark II".
 * The section prints "Power requirement: 4 power" and "Speed: 28".
 * It prints no cooldown. Speed is movement.
 * "Combat Drones (offensive drones)" says the drone picks a new angle and
 * "Moves faster, and consequently has a higher rate of fire".
 * The shot wait is orbitLegSeconds, not a printed cooldown.
 * Not a SwarmKind.
 */
// "Fires a laser blast that deals 1 hull/system damage per projectile, with a 10% chance to start fire in the hit room."
export const COMBAT2 = {
  power: 4,
  damage: 1,
  // "Laser blast has 10% chance to start fire in the hit room".
  fireChance: 0.1,
  // "Speed: 28".
  speed: 28,
  // The section prints no cooldown line.
  cooldown: null,
};

/** Drone Control, Combat Drone Mark I: "Speed: 15". */
export const COMBAT1_SPEED = 15;

/**
 * Drone Control, "Combat Drones (offensive drones)": the next angle is at least
 * 90 degrees from the last, and that comparison does not wrap. 5 degrees and
 * 355 degrees count as 350 apart.
 */
export const ORBIT_MIN_SEP = 90;

/**
 * INFERRED: degrees per second for one point of Speed, on the normalised orbit.
 * The shortest separation the page allows is 90 degrees. At Speed 15 that leg
 * takes the 2 second restore of shield layers 1 and 2 (Shields, Overview).
 * A longer leg is slower, which is Mark I's "usually slower than normal shield recharge".
 * The same paragraph says movement is normalised to the shield's longest dimension,
 * so the rate does not change with the ship.
 */
export const ORBIT_DEG_PER_SPEED = ORBIT_MIN_SEP / (COMBAT1_SPEED * shieldLayerSeconds(1));

/** Shortest arc around the circle. 5° to 355° is 10° of travel. */
export function orbitGap(from: number, to: number): number {
  const raw = Math.abs(from - to) % 360;
  return Math.min(raw, 360 - raw);
}

/** Seconds to fly this leg. The drone fires when the leg finishes. */
export function orbitLegSeconds(from: number, to: number, speed: number): number {
  return orbitGap(from, to) / (speed * ORBIT_DEG_PER_SPEED);
}

/** True when the non-wrapping check accepts this destination. */
export function bearingAccepted(from: number, to: number): boolean {
  return Math.abs(to - from) >= ORBIT_MIN_SEP;
}
