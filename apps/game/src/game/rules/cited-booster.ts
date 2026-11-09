/**
 * Augmentations, "Drone Reactor Booster". No purchase price.
 * "Your shipboard drones have their movement speed increased by 25 percent."
 * "Increases the speed of crew drones by 25%, however, the actual crew drone speed is increased from 50% of regular crew speed to 62.5%."
 * Fractions of regular crew speed. This does not move a drone.
 *
 * The 25 percent is the augment's meaning (augBlueprint DRONE_SPEED). It is not a second XML number.
 * Unboosted crew drones move at half of regular crew speed. The boosted speed is that half increased by
 * 25 percent: 0.5 * 1.25 = 0.625. Both stay this derived rule.
 */

/** Unboosted crew drones move at half of regular crew speed. */
export const CREW_DRONE_SPEED = 0.5;

/** Drone Reactor Booster: increase the unboosted half by 25 percent. */
const BOOSTER = 1.25;

/** The same half, increased by 25 percent, is 62.5 percent of regular crew speed. */
export const BOOSTED_CREW_DRONE_SPEED = CREW_DRONE_SPEED * BOOSTER;

/** Fraction of regular crew speed. `boosted` selects the Drone Reactor Booster ratio. */
export function crewDroneSpeed(boosted: boolean): number {
  return boosted ? CREW_DRONE_SPEED * BOOSTER : CREW_DRONE_SPEED;
}
