/**
 * Augmentations, "Drone Reactor Booster". No purchase price.
 * "Your shipboard drones have their movement speed increased by 25 percent."
 * "Increases the speed of crew drones by 25%, however, the actual crew drone speed is increased from 50% of regular crew speed to 62.5%."
 * Fractions of regular crew speed. This does not move a drone.
 */

/** Unboosted crew drones move at half of regular crew speed. */
export const CREW_DRONE_SPEED = 0.5;

/** The same half, increased by 25 percent, is 62.5 percent of regular crew speed. */
export const BOOSTED_CREW_DRONE_SPEED = 0.625;

/** Fraction of regular crew speed. `boosted` selects the Drone Reactor Booster ratio. */
export function crewDroneSpeed(boosted: boolean): number {
  return boosted ? BOOSTED_CREW_DRONE_SPEED : CREW_DRONE_SPEED;
}
