/**
 * Display orbit for a deployed drone. The angle lives here, not on the wall clock,
 * so a pause cannot send the drone back to the start of the circle.
 * Losing power eases the speed down to a stop. Power coming back eases it to cruise.
 * `rate` is 1 at cruise and 0 at rest. `omega` is the cruise speed in radians per second
 * and carries the spin direction.
 */
export const DRIFT_TAU = 0.34;

/** Close enough to the target speed to sit exactly on it. */
const DRIFT_SNAP = 0.02;

export type DroneDrift = {
  /** Radians traveled, including the starting offset. */
  angle: number;
  /** 1 at cruise, 0 fully stopped. */
  rate: number;
};

/** Advance one display frame. A halted clock leaves the angle and the speed untouched. */
export function stepDrift(drift: DroneDrift, dt: number, cruising: boolean, omega: number, halted: boolean): number {
  if (halted || !(dt > 0)) return drift.angle;
  const target = cruising ? 1 : 0;
  const k = 1 - Math.exp(-dt / DRIFT_TAU);
  drift.rate += (target - drift.rate) * k;
  drift.angle += omega * drift.rate * dt;
  if (target === 0 && drift.rate < DRIFT_SNAP) drift.rate = 0;
  else if (target === 1 && drift.rate > 1 - DRIFT_SNAP) drift.rate = 1;
  return drift.angle;
}
