import type { DroneOrbit } from "@stl/pack";

/**
 * Combat-drone flight that is not on the droneBlueprint. Speed is `<speed>` (Combat Drone Mark I is 15, Mark II is 28).
 * Drone Control, "Combat Drones (offensive drones)": the next angle is at least 90 degrees from the last, and that
 * comparison does not wrap.
 * xftl doc/combat-drone: speed is the blueprint speed times the shield semi-major axis, divided by 21.875.
 * The stop is that axis times 1.15, just outside the shields. The drone waits 0.5 seconds, then fires.
 * A beam drone sets additionalPause to 0.5, delaying the next move until the beam has finished.
 *
 * The gap mod writes these as `<droneOrbit minSep speedScale stopRadius firePause beamHold>`.
 */
export const DRONE_ORBIT: Required<DroneOrbit> = {
  minSep: 90,
  speedScale: 21.875,
  stopRadius: 1.15,
  firePause: 0.5,
  beamHold: 0.5,
};
