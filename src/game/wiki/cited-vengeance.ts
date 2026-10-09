/**
 * Augmentations, "Crystal Vengeance". No purchase price.
 * Description: "there is a 10 percent chance to break off a shard".
 * Bullet: 1 damage, 10% breach, 20% stun for 3s (with Advanced Edition),
 * ignores shields, affected by evasion, defense drones can shoot it down.
 * The Crystal Cruiser, Layout A and Layout B, list it under Augmentations, so those hulls start with it.
 * strikeRoom rolls this when the player hull actually drops.
 * The shard names no room, so breach and stun are not applied.
 */

/** Augmentations, "Crystal Vengeance": 10 percent chance when the ship takes damage. */
export const VENGEANCE_CHANCE = 0.1;

/**
 * Augmentations, "Crystal Vengeance" shot bullet.
 * Stun is "for 3s (with Advanced Edition)". The page states no other numbers.
 */
export const VENGEANCE_SHOT = {
  damage: 1,
  breach: 0.1,
  stunChance: 0.2,
  stunSeconds: 3,
  ignoresShields: true,
  evasion: true,
  defenseDrone: true,
} as const;

/** True when roll is in [0, VENGEANCE_CHANCE). A roll of 0.1 does not fire. The caller supplies the roll. */
export function vengeanceFires(roll: number): boolean {
  return roll >= 0 && roll < VENGEANCE_CHANCE;
}
