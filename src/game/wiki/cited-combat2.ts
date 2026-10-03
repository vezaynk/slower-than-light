/**
 * Wiki page "Drone Control", section "Combat Drone Mark II".
 * The section prints "Power requirement: 4 power" and "Speed: 28".
 * It prints no cooldown. Speed is movement, not a cooldown and not a range.
 * "Combat Drones (offensive drones)" says
 * "Drones deal 1 hull/system damage per projectile (of the Combat Drones)".
 * tickSwarm reads the power requirement and emits no shot while cooldown is null.
 * Not a SwarmKind. Not a store row.
 */
// "Fires a laser blast that deals 1 hull/system damage per projectile, with a 10% chance to start fire in the hit room."
export const COMBAT2 = {
  power: 4,
  damage: 1,
  // "Laser blast has 10% chance to start fire in the hit room".
  fireChance: 0.1,
  cooldown: null,
};
