/**
 * Wiki page "Drone Control", section "Combat Drone Mark II".
 * The section prints "Power requirement: 4 power" and "Speed: 28".
 * It prints no cooldown. Speed is movement.
 * "Combat Drones (offensive drones)" says the drone picks a new angle and
 * "Moves faster, and consequently has a higher rate of fire".
 * The shot wait is orbitLegSeconds, not a printed cooldown.
 * Not a SwarmKind.
 *
 * Power, damage, fire chance, and speed are the droneBlueprint and its `<weaponBlueprint>` (COMBAT_2 `<power>` and
 * `<speed>` are 4 and 28; DRONE_LASER is 1 damage and a 10% fire). COMBAT1_SPEED is COMBAT_1's `<speed>`, 15.
 * Those are not gap numbers. The orbit constants are gap `<droneOrbit>` (`droneOrbit`).
 */
import { droneOrbit } from "@stl/pack";

// "Fires a laser blast that deals 1 hull/system damage per projectile, with a 10% chance to start fire in the hit room."
export const COMBAT2 = {
  power: 4,
  damage: 1,
  // "Laser blast has 10% chance to start fire in the hit room".
  fireChance: 0.1,
  // "Speed: 28". The droneBlueprint `<speed>` already holds this.
  speed: 28,
  // The section prints no cooldown line.
  cooldown: null,
};

/** Drone Control, Combat Drone Mark I: "Speed: 15". The droneBlueprint `<speed>` already holds this. */
export const COMBAT1_SPEED = 15;

/** Drone Control, "Combat Drones (offensive drones)": non-wrapping separation. Gap `<droneOrbit minSep>`. */
function orbitMinSep(): number {
  return droneOrbit("minSep");
}

/** xftl doc/combat-drone: blueprint speed over this is semi-major units a second. Gap `<droneOrbit speedScale>`. */
function orbitSpeedScale(): number {
  return droneOrbit("speedScale");
}

/** xftl doc/combat-drone: the stop is this many semi-major units out. Gap `<droneOrbit stopRadius>`. */
function orbitStopRadius(): number {
  return droneOrbit("stopRadius");
}

/** xftl doc/combat-drone: wait on the stop, then fire. Gap `<droneOrbit firePause>`. */
function orbitFirePause(): number {
  return droneOrbit("firePause");
}

/** xftl doc/combat-drone: a beam drone's additionalPause. Gap `<droneOrbit beamHold>`. */
export function beamHoldSeconds(): number {
  return droneOrbit("beamHold");
}

/** Shortest arc around the circle. 5° to 355° is 10° of travel. */
export function orbitGap(from: number, to: number): number {
  const raw = Math.abs(from - to) % 360;
  return Math.min(raw, 360 - raw);
}

/**
 * Seconds from leaving one stop to firing at the next, plus `hold` after the shot (a beam drone's beamHoldSeconds).
 * INFERRED: the drone flies the straight chord between the two stops, on a circle (a round shield). An elliptical
 * shield would shorten legs across its minor axis; this sim has no shield ellipse.
 * INFERRED: the notes slow the drone during the pause ("the speed is multiplied by the time remaining over 1.5");
 * that creep is counted as part of the pause, not as extra flight.
 */
export function orbitLegSeconds(from: number, to: number, speed: number, hold = 0): number {
  const chord = 2 * orbitStopRadius() * Math.sin((orbitGap(from, to) * Math.PI) / 360);
  return (chord * orbitSpeedScale()) / speed + orbitFirePause() + hold;
}

/** True when the non-wrapping check accepts this destination. */
export function bearingAccepted(from: number, to: number): boolean {
  return Math.abs(to - from) >= orbitMinSep();
}

export type OrbitChord = { x: number; y: number; angle: number };

/**
 * Where a fire drone sits on the straight chord between two stops, and which way it faces.
 * Degrees match pickOrbitBearing. 0 is +x. Canvas y grows downward, the same way the ellipse is drawn.
 * The sheet's nose points +x, so `angle` is the rotation. The last pause, plus `hold`, is spent sitting
 * on the destination. xftl doc/combat-drone: the drone flies that chord, then waits, then fires.
 */
export function orbitChordPose(
  heading: number,
  bearing: number,
  aux: number,
  left: number,
  rx: number,
  ry: number,
  hold = 0,
): OrbitChord {
  const from = chordStop(heading, rx, ry);
  const to = chordStop(bearing, rx, ry);
  const flight = Math.max(0, left - orbitFirePause() - hold);
  const t = flight <= 1e-6 ? 1 : Math.min(1, Math.max(0, aux) / flight);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return {
    x: from.x + dx * t,
    y: from.y + dy * t,
    angle: Math.hypot(dx, dy) < 1e-4 ? (bearing * Math.PI) / 180 : Math.atan2(dy, dx),
  };
}

function chordStop(deg: number, rx: number, ry: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * rx, y: Math.sin(rad) * ry };
}
