import type { AugmentId } from "../ids.ts";

export type Listing = {
  id: AugmentId;
  name: string;
  detail: string;
  cost: number;
  /** `<value>`. The effect switch still decides what this magnitude scales. */
  value?: number;
  /** `<stackable>`. A duplicate that is not stackable pays 25 scrap. */
  stackable?: boolean;
};

/**
 * Augmentations, purchase price under each heading below.
 * The three-slot cap is the sentence above "Offensive Augmentations":
 * a ship can have only up to three augmentations. That paragraph has no heading.
 * Stackable on the wiki (Automated Re-loader, Shield Charge Booster, FTL Recharge Booster,
 * Scrap Recovery Arm, Reverse Ion Field) still share that cap.
 * INVENTED: installAugment refuses a second copy, so those stacks only happen if
 * a test writes the array directly.
 * Rock Plating and Titanium System Casing are under "Non-Purchasable Augmentations"
 * and are not sold; their sell prices are 40. The 50 scrap store cost below is INVENTED.
 * The other non-purchasable augments (ship and event grants) come last. The page prints only their sell price,
 * and a sale pays half the blueprint cost, so their cost is twice that price. Their store rarity is 0.
 */
export const CATALOG: Listing[] = [
  // Augmentations, "Offensive Augmentations", Automated Re-loader. Store cost 40.
  {
    id: "AUTO_COOLDOWN",
    name: "Automated Re-loader",
    detail: "Weapons charge 10% faster per copy.",
    cost: 40,
    value: 0.1,
    stackable: true,
  },
  // Augmentations, "Offensive Augmentations", Explosive Replicator. Store cost 60.
  {
    id: "EXPLOSIVE_REPLICATOR",
    name: "Explosive Replicator",
    detail: "50% chance a missile or bomb shot uses no missile.",
    cost: 60,
    value: 0.5,
  },
  // Augmentations, "Offensive Augmentations", Stealth Weapons. Store cost 50.
  {
    id: "CLOAK_FIRE",
    name: "Stealth Weapons",
    detail: "Firing does not end cloaking.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Store cost 120.
  {
    id: "WEAPON_PREIGNITE",
    name: "Weapon Pre-Igniter",
    detail: "Powered weapons start fully charged after each jump.",
    cost: 120,
  },
  // Augmentations, "Defensive Augmentations", Repair Arm. Store cost 50.
  {
    id: "REPAIR_ARM",
    name: "Repair Arm",
    detail: "Scrap gains repair 2 hull. Scrap gains are 15% lower while hull is damaged.",
    cost: 50,
    value: 0.15,
  },
  // Augmentations, "Defensive Augmentations", Reverse Ion Field. Store cost 45.
  {
    id: "ION_ARMOR",
    name: "Reverse Ion Field",
    detail: "50% chance to ignore ion damage. 2 or more copies: ignore all ion damage.",
    cost: 45,
    value: 0.5,
    stackable: true,
  },
  // Augmentations, "Defensive Augmentations", Shield Charge Booster. Store cost 45.
  {
    id: "SHIELD_RECHARGE",
    name: "Shield Charge Booster",
    detail: "Shields recharge 15% faster per copy.",
    cost: 45,
    value: 0.15,
    stackable: true,
  },
  // Augmentations, "FTL Augmentations", FTL Recharge Booster. Store cost 50.
  {
    id: "FTL_BOOSTER",
    name: "FTL Recharge Booster",
    detail: "FTL charges 25% faster per copy.",
    cost: 50,
    value: 0.25,
    stackable: true,
  },
  // Augmentations, "Misc. Augmentations", Scrap Recovery Arm. Store cost 50.
  {
    id: "SCRAP_COLLECTOR",
    name: "Scrap Recovery Arm",
    detail: "Scrap gains 10% higher per copy.",
    cost: 50,
    value: 0.1,
    stackable: true,
  },
  // Augmentations, "Non-Purchasable Augmentations", Rock Plating. Sell price 40.
  // ftl.dat `<cost>` is 80. Sell is half of that. Rarity 0 keeps it off the shelf.
  {
    id: "ROCK_ARMOR",
    name: "Rock Plating",
    detail: "15% chance to ignore hull damage. Not sold.",
    cost: 80,
    value: 0.15,
  },
  // Augmentations, "Non-Purchasable Augmentations", Titanium System Casing. Sell price 40.
  // ftl.dat `<cost>` is 80. Sell is half of that. Rarity 0 keeps it off the shelf.
  {
    id: "SYSTEM_CASING",
    name: "Titanium System Casing",
    detail: "15% chance to ignore system damage. Not sold.",
    cost: 80,
    value: 0.15,
  },
  // Augmentations, "Misc. Augmentations", Battery Charger. Store cost 40.
  {
    id: "BATTERY_BOOSTER",
    name: "Battery Charger",
    detail: "Backup Battery cooldown halved.",
    cost: 40,
    value: 0.5,
  },
  // Augmentations, "Crew Augmentations", Emergency Respirators. Store cost 50.
  {
    id: "O2_MASKS",
    name: "Emergency Respirators",
    detail: "Crew take half suffocation damage.",
    cost: 50,
    value: 0.5,
  },
  // Augmentations, "Defensive Augmentations", Fire Suppression. Store cost 65.
  {
    id: "FIRE_EXTINGUISHERS",
    name: "Fire Suppression",
    detail: "Fires on your ship burn out faster.",
    cost: 65,
  },
  // Augmentations, "FTL Augmentations", Distraction Buoys. Store cost 55.
  {
    id: "FLEET_DISTRACTION",
    name: "Distraction Buoys",
    detail: "Rebel fleet starts each sector 1 jump further back, before sector 8.",
    cost: 55,
    value: 1,
  },
  // Augmentations, "Misc. Augmentations", Long-Ranged Scanners. Store cost 30.
  {
    id: "ADV_SCANNERS",
    name: "Long-Ranged Scanners",
    detail: "Adjacent beacons show hazards and ships.",
    cost: 30,
  },
  // Augmentations, "FTL Augmentations", FTL Jammer. Store cost 30.
  {
    id: "FTL_JAMMER",
    name: "FTL Jammer",
    detail: "Enemy FTL charges at half speed.",
    cost: 30,
    value: 2,
  },
  // Augmentations, "Misc. Augmentations", Drone Recovery Arm. Store cost 50.
  {
    id: "DRONE_RECOVERY",
    name: "Drone Recovery Arm",
    detail: "Powered defense and combat drones return their drone part. Boarding drones do not.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Hacking Stun. Store cost 60.
  {
    id: "HACKING_STUN",
    name: "Hacking Stun",
    detail: "Hacking pulses stun crew in the hacked room.",
    cost: 60,
  },
  // Augmentations, "Crew Augmentations", Backup DNA Bank. Store cost 40.
  {
    id: "BACKUP_DNA",
    name: "Backup DNA Bank",
    detail: "Clone Bay keeps dead crew queued while unpowered or damaged.",
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Reconstructive Teleport. Store cost 70.
  {
    id: "TELEPORT_HEAL",
    name: "Reconstructive Teleport",
    detail: "Crew are fully healed when teleported.",
    cost: 70,
  },
  // Augmentations, "Misc. Augmentations", Lifeform Scanner. Store cost 40.
  {
    id: "LIFE_SCANNER",
    name: "Lifeform Scanner",
    detail: "Shows crew on enemy ships without Sensors.",
    cost: 40,
  },
  // Augmentations, "FTL Augmentations", "Adv. FTL Navigation". Purchase price 50.
  {
    id: "FTL_JUMPER",
    name: "Adv. FTL Navigation",
    detail: "Jump to any visited beacon, including ones the fleet has taken.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Defense Scrambler. Purchase price 80.
  {
    id: "DEFENSE_SCRAMBLER",
    name: "Defense Scrambler",
    detail: "Enemy defense drones cannot fire.",
    cost: 80,
  },
  // Augmentations, "Offensive Augmentations", Zoltan Shield Bypass. Purchase price 55.
  {
    id: "ZOLTAN_BYPASS",
    name: "Zoltan Shield Bypass",
    detail: "Teleporter, bombs, and Mind Control work through Zoltan Shields.",
    cost: 55,
  },
  // Augmentations, "Non-Purchasable Augmentations", Crystal Vengeance. "Sell price: 40", so the blueprint cost is 80.
  // Augmentations, "Crystal Vengeance": "there is a 10 percent chance to break off a shard" and the bullet on the shot.
  {
    id: "CRYSTAL_SHARDS",
    name: "Crystal Vengeance",
    detail:
      "10% chance per hit taken to fire a shard: 1 damage, ignores shields, 10% breach, 20% stun. Not sold.",
    cost: 80,
  },
  // Augmentations, "Non-Purchasable Augmentations", Damaged Stasis Pod. "Sell price: 15", so the blueprint cost is 30.
  // Augmentations, "Damaged Stasis Pod": "More than one Stasis Pod can be acquired and held at a time", so it stacks.
  {
    id: "STASIS_POD",
    name: "Damaged Stasis Pod",
    detail: "Crystal crew pod. Opened by a Zoltan sector event. Stacks. Not sold.",
    cost: 30,
    stackable: true,
  },
  // Augmentations, "Non-Purchasable Augmentations", Drone Reactor Booster. "Sell price: 25", so the blueprint cost is 50.
  // Augmentations, "Drone Reactor Booster": "Increases the speed of crew drones by 25%".
  {
    id: "DRONE_SPEED",
    name: "Drone Reactor Booster",
    detail: "Crew drones move 25% faster. Not sold.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Engi Med-bot Dispersal. "Sell price: 30", so the blueprint cost is 60.
  // Augmentations, "Engi Med-bot Dispersal": heals 1.6 per second, needs a powered medbay, no clone bay.
  {
    id: "NANO_MEDBAY",
    name: "Engi Med-bot Dispersal",
    detail: "Heals crew 1.6 HP/s anywhere on your ship while Medbay is powered. Not sold.",
    cost: 60,
  },
  // Augmentations, "Non-Purchasable Augmentations", Mantis Pheromones. "Sell price: 25", so the blueprint cost is 50.
  // Augmentations, "Mantis Pheromones": "Your crew's movement speed is increased by 25 percent."
  {
    id: "CREW_STIMS",
    name: "Mantis Pheromones",
    detail: "Crew move 25% faster. Not sold.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Slug Repair Gel. "Sell price: 30", so the blueprint cost is 60.
  // Augmentations, "Slug Repair Gel": "Fixes all breaches simultaneously, at 75% regular crew speed."
  {
    id: "SLUG_GEL",
    name: "Slug Repair Gel",
    detail: "Repairs all breaches at once, at 75% crew repair speed. Not sold.",
    cost: 60,
  },
  // Augmentations, "Non-Purchasable Augmentations", Zoltan Shield. "Sell price: 40", so the blueprint cost is 80.
  // Zoltan Shield: 5 points of shielding, recharged on a jump. Its figures win over the Augmentations wording.
  {
    id: "ENERGY_SHIELD",
    name: "Zoltan Shield",
    detail:
      "5-point shield over regular shields. Refills on each jump. Blocks teleporter, bombs, and Mind Control. Not sold.",
    cost: 80,
  },
];
