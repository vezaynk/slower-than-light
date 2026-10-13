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
 * xftl doc/combat-drone: "The speed passed into GetNext point is set as the speed in the blueprint times the semi-major
 * axis (longest distance from centre) of the shields, divided by 21.875. This gives the speed in pixels per second."
 * CombatDrone::PickDestination puts the stop on the shields at the new angle, "multiply it by 1.15 ... to make the drone
 * stop just outside the shields". So in semi-major units the stop circle is 1.15 and the speed is Speed / 21.875.
 */
export const ORBIT_SPEED_SCALE = 21.875;
export const ORBIT_STOP_RADIUS = 1.15;
/** xftl doc/combat-drone: "Once it gets to it's target position, it waits 0.5 seconds ... and then fires". */
export const ORBIT_FIRE_PAUSE_S = 0.5;
/** xftl doc/combat-drone: a beam drone "sets additionalPause to 0.5, delaying the movement ... until the beam has finished". */
export const BEAM_HOLD_S = 0.5;

/** Shortest arc around the circle. 5° to 355° is 10° of travel. */
export function orbitGap(from: number, to: number): number {
  const raw = Math.abs(from - to) % 360;
  return Math.min(raw, 360 - raw);
}

/**
 * Seconds from leaving one stop to firing at the next, plus `hold` after the shot (a beam drone's BEAM_HOLD_S).
 * INFERRED: the drone flies the straight chord between the two stops, on a circle (a round shield). An elliptical
 * shield would shorten legs across its minor axis; this sim has no shield ellipse.
 * INFERRED: the notes slow the drone during the pause ("the speed is multiplied by the time remaining over 1.5");
 * that creep is counted as part of the 0.5 s, not as extra flight.
 */
export function orbitLegSeconds(from: number, to: number, speed: number, hold = 0): number {
  const chord = 2 * ORBIT_STOP_RADIUS * Math.sin((orbitGap(from, to) * Math.PI) / 360);
  return (chord * ORBIT_SPEED_SCALE) / speed + ORBIT_FIRE_PAUSE_S + hold;
}

/** True when the non-wrapping check accepts this destination. */
export function bearingAccepted(from: number, to: number): boolean {
  return Math.abs(to - from) >= ORBIT_MIN_SEP;
}
