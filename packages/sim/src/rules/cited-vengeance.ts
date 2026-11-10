/**
 * Augmentations, "Crystal Vengeance". No purchase price.
 * Description: "there is a 10 percent chance to break off a shard".
 * Bullet: 1 damage, 10% breach, 20% stun for 3s (with Advanced Edition),
 * ignores shields, affected by evasion, defense drones can shoot it down.
 * The Crystal Cruiser, Layout A and Layout B, list it under Augmentations, so those hulls start with it.
 * strikeRoom rolls this when the player hull actually drops.
 * The shard names no room, so breach and stun are not applied.
 *
 * The 10 percent and the shard's damage, breach, and stun are gap
 * `<crystalVengeance chance damage breach stunChance stun>`. Ignoring shields, facing evasion, and being
 * shot down are the shot's behaviour.
 */
import { crystalVengeanceStat } from "@stl/pack";

/** Augmentations, "Crystal Vengeance": chance when the ship takes damage. Gap `<crystalVengeance chance>`. */
export function vengeanceChance(): number {
  return crystalVengeanceStat("chance");
}

/**
 * Augmentations, "Crystal Vengeance" shot bullet.
 * Stun is "for 3s (with Advanced Edition)". The page states no other numbers.
 * The booleans are the shot's behaviour. The numbers are the gap tag.
 */
export function vengeanceShot(): {
  damage: number;
  breach: number;
  stunChance: number;
  stunSeconds: number;
  ignoresShields: true;
  evasion: true;
  defenseDrone: true;
} {
  return {
    damage: crystalVengeanceStat("damage"),
    breach: crystalVengeanceStat("breach"),
    stunChance: crystalVengeanceStat("stunChance"),
    stunSeconds: crystalVengeanceStat("stun"),
    ignoresShields: true,
    evasion: true,
    defenseDrone: true,
  };
}

/** True when roll is in [0, chance). A roll equal to the chance does not fire. The caller supplies the roll. */
export function vengeanceFires(roll: number): boolean {
  return roll >= 0 && roll < vengeanceChance();
}
