/**
 * Environmental Hazards, ==Asteroid Field==.
 * "The interval between each asteroid is random, but scales according to your ship's shield system level:
 * asteroids will come more frequently if your shields are highly upgraded."
 * "the asteroid frequency will not decrease when your shields are down."
 *
 * The page prints no seconds. INFERRED: the old fixed 8 second gap is the center at shield system level 0.
 * Each system level shortens that center by 0.75 seconds, and the center does not drop below 2.
 * INFERRED: one uniform roll covers 75 percent of the center up to, but not including, 125 percent.
 * The level is the Shields system level, not the powered bars and not the bubbles that are up.
 */
export function asteroidIntervalSeconds(shieldLevel: number, roll: number): number {
  const level = Math.max(0, Math.floor(shieldLevel));
  const center = Math.max(2, 8 - 0.75 * level);
  const t = Math.min(0.999999, Math.max(0, roll));
  return center * (0.75 + t * 0.5);
}
