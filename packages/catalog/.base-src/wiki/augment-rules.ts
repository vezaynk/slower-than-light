import type { CrystalVengeanceRule, IonIntruderRule, OverchargerWaits } from "@stl/pack";

/**
 * Drone Control, "Shield Overcharger": "Each additional layer has longer cool-down time: 8s/10s/13s/16s/20s for
 * 0/1/2/3/4 existing layers." Five or more existing layers has no printed wait. Power and speed are the
 * droneBlueprint's `<power>` and `<speed>`, not this table.
 *
 * The gap mod writes these as `<overchargerWaits layer0 layer1 layer2 layer3 layer4>`.
 */
export const OVERCHARGER_WAITS: Required<OverchargerWaits> = {
  layer0: 8,
  layer1: 10,
  layer2: 13,
  layer3: 16,
  layer4: 20,
};

/**
 * Drone Control, "Ion Intruder Drone": "Periodically emits an ion blast that deals 3 ion damage to the system and
 * stuns enemy crew", "Pulse time varies between 8.2 and 10 seconds. Stun lasts for 6 seconds". Power and the space
 * speed are the droneBlueprint's `<power>` and `<speed>`.
 *
 * The gap mod writes these as `<ionIntruder ion stun pulseMin pulseMax>`.
 */
export const ION_INTRUDER: Required<IonIntruderRule> = {
  ion: 3,
  stun: 6,
  pulseMin: 8.2,
  pulseMax: 10,
};

/**
 * Augmentations, "Crystal Vengeance": "there is a 10 percent chance to break off a shard".
 * Bullet: 1 damage, 10% breach, 20% stun for 3s (with Advanced Edition). Ignoring shields, facing evasion, and
 * being shot down by a defense drone are the shot's behaviour, not numbers here.
 *
 * The gap mod writes these as `<crystalVengeance chance damage breach stunChance stun>`.
 */
export const CRYSTAL_VENGEANCE: Required<CrystalVengeanceRule> = {
  chance: 0.1,
  damage: 1,
  breach: 0.1,
  stunChance: 0.2,
  stun: 3,
};
