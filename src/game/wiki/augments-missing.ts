export type MissingAugment = {
  id: string;
  name: string;
  detail: string;
  cost: number | null;
  purchasable: boolean;
};

/**
 * Augmentations headings that are not already names in the extras catalog.
 * cost is the Purchase price bullet, never a sell price and never an invented 50.
 */
export const MISSING_AUGMENTS: MissingAugment[] = [
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Crystal Vengeance". No purchase price.
   * Augmentations, "Crystal Vengeance", description "there is a 10 percent chance to break off a shard".
   * Augmentations, "Crystal Vengeance", bullet "Fires a crystal shot that does 1 damage, has a 10% chance to breach, has a 20% chance to stun for 3s (with Advanced Edition), completely ignores shields, and is affected by evasion; can be shot down by defense drones."
   */
  {
    id: "vengeance",
    name: "Crystal Vengeance",
    detail:
      "Each time the ship takes damage there is a 10 percent chance to fire a crystal shot that does 1 damage, has a 10 percent chance to breach, has a 20 percent chance to stun for 3 seconds, ignores shields, is affected by evasion, and can be shot down by defense drones.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Damaged Stasis Pod". No purchase price.
   * Augmentations, "Damaged Stasis Pod", bullet "This augment is used to acquire a Crystal crewmember (named Ruwen)".
   * Augmentations, "Damaged Stasis Pod", bullet "Can only be acquired in the Dense asteroid field distress call event. More than one Stasis Pod can be acquired and held at a time (each one will occupy an augmentation slot)."
   * Augmentations, "Damaged Stasis Pod", bullet "each one will open a single pod."
   */
  {
    id: "stasis",
    name: "Damaged Stasis Pod",
    detail:
      "More than one can be held at a time with each copy in an augmentation slot, each can be acquired only from the Dense asteroid field distress call, and each Zoltan research facility opens a single pod to yield a Crystal crewmember.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Drone Reactor Booster". No purchase price.
   * Augmentations, "Drone Reactor Booster", bullet "Increases the speed of crew drones by 25%, however, the actual crew drone speed is increased from 50% of regular crew speed to 62.5%."
   */
  {
    id: "booster",
    name: "Drone Reactor Booster",
    detail:
      "Crew drone movement speed is increased by 25 percent, from 50 percent of regular crew speed to 62.5 percent.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Engi Med-bot Dispersal". No purchase price.
   * Augmentations, "Engi Med-bot Dispersal", bullet "Heals 1.6 health points per second."
   * Augmentations, "Engi Med-bot Dispersal", bullet "Medbay must be powered for it to work."
   * Augmentations, "Engi Med-bot Dispersal", bullet "Not affected by Medbay upgrades."
   * Augmentations, "Engi Med-bot Dispersal", bullet "Does not work on crew that is on another ship (teleported)."
   * Augmentations, "Engi Med-bot Dispersal", bullet "Does nothing if you have a Clone Bay."
   */
  {
    id: "medbot",
    name: "Engi Med-bot Dispersal",
    detail:
      "It heals 1.6 health points per second when the medbay is powered, medbay upgrades do not affect it, it does not heal crew on another ship, and it does nothing with a clone bay.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Mantis Pheromones". No purchase price.
   * Augmentations, "Mantis Pheromones", description "Your crew's movement speed is increased by 25 percent."
   * Augmentations, "Mantis Pheromones", bullet "Applies both on your ship and when boarding an enemy."
   */
  {
    id: "pheromone",
    name: "Mantis Pheromones",
    detail: "Crew movement speed increases by 25 percent on your ship and while boarding an enemy.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Slug Repair Gel". No purchase price.
   * Augmentations, "Slug Repair Gel", bullet "Fixes all breaches simultaneously, at 75% regular crew speed."
   * Augmentations, "Slug Repair Gel", bullet "Stacks with crew repairs."
   */
  {
    id: "gel",
    name: "Slug Repair Gel",
    detail:
      "It fixes all breaches simultaneously at 75 percent of regular crew speed and stacks with crew repairs.",
    cost: null,
    purchasable: false,
  },
  /**
   * Augmentations, "Non-Purchasable Augmentations", "Zoltan Shield". No purchase price.
   * Augmentations and Zoltan Shield disagree: Augmentations, "Zoltan Shield", bullet "Upon arrival at a beacon, you start with an additional green energy shield that will absorb 5 points of damage" and "Beam weapons deal their room damage twice to the shield (including the Artillery Beam)."
   * Zoltan Shield, bullet "Zoltan Shield has 5 points of energy shielding that absorbs any kind of damage from all weapon types and hazards."
   * Zoltan Shield, bullet "Upon making an FTL jump, Zoltan Shields are completely recharged."
   * Zoltan Shield, bullet "Enemy Zoltan Shields are replenished upon revisiting the beacon."
   * Zoltan Shield, bullet "Boarding events (including those with enemy ship present; only initial boarding party bypasses the Zoltan Shields)."
   * Zoltan Shield, bullet "Zoltan Shield Bypass augmentation allows crew and bomb teleportation and mind control to work through Zoltan Shields."
   * Bubble hit points, recharge, and what passes through follow Zoltan Shield, not the arrival wording or the beam-twice claim on Augmentations. Anti-Bio Beam, Fire Beam, and Artillery Beam deal 2 damage in total on Zoltan Shield, which is not this bubble's hit points.
   */
  {
    id: "zshield",
    name: "Zoltan Shield",
    detail:
      "It has 5 points of energy shielding that are completely recharged on an FTL jump, enemy shields are replenished on revisiting the beacon, only the initial boarding party of a boarding event passes through it, and Zoltan Shield Bypass lets crew teleportation, bomb teleportation, and mind control pass through it.",
    cost: null,
    purchasable: false,
  },
];
