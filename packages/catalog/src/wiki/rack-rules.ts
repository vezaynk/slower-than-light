import type { BonusItemWeights, CargoSlots } from "@stl/pack";

/**
 * Environmental Hazards names a "cargo bay to swap weapons and drone schematics". The hold has 4 slots and takes what
 * does not fit on the weapon or drone rack. The slot count is FTL's, not a blueprint field.
 *
 * The gap mod writes this as `<cargoSlots slots>`.
 */
export const CARGO_SLOTS: Required<CargoSlots> = { slots: 4 };

/**
 * Rewards, "Standard" (3%) and "Stuff" (6%): "a bonus weapon, augmentation, or drone schematic".
 * The 3% and 6% are the reward table's `<bonus>`. The page does not split the three kinds, so each has equal odds.
 *
 * The gap mod writes the kind weights as `<bonusItem weapon augment drone>`.
 */
export const BONUS_ITEM_WEIGHTS: Required<BonusItemWeights> = {
  weapon: 1,
  augment: 1,
  drone: 1,
};
