import type { AugmentId } from "../ids.ts";

export type Listing = { id: AugmentId; name: string; detail: string; cost: number };

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
 */
export const CATALOG: Listing[] = [
  // Augmentations, "Offensive Augmentations", Automated Re-loader. Store cost 40.
  {
    id: "AUTO_COOLDOWN",
    name: "Automated Re-loader",
    detail: "Weapon charge speed rises 10% per copy. Charge time is divided by 1 + copies / 10.",
    cost: 40,
  },
  // Augmentations, "Offensive Augmentations", Explosive Replicator. Store cost 60.
  {
    id: "EXPLOSIVE_REPLICATOR",
    name: "Explosive Replicator",
    detail: "A missile has a 50% chance not to be spent.",
    cost: 60,
  },
  // Augmentations, "Offensive Augmentations", Stealth Weapons. Store cost 50.
  {
    id: "CLOAK_FIRE",
    name: "Stealth Weapons",
    detail: "Firing does not drop cloaking.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Store cost 120.
  {
    id: "WEAPON_PREIGNITE",
    name: "Weapon Pre-Igniter",
    detail: "After a jump, enabled weapons that have power start fully charged.",
    cost: 120,
  },
  // Augmentations, "Defensive Augmentations", Repair Arm. Store cost 50.
  {
    id: "REPAIR_ARM",
    name: "Repair Arm",
    detail: "Scrap gain repairs 2 hull and is cut 15% while the hull is not already full.",
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Reverse Ion Field. Store cost 45.
  {
    id: "ION_ARMOR",
    name: "Reverse Ion Field",
    detail: "50% chance to ignore an ion hit. Two or more ignore every ion hit.",
    cost: 45,
  },
  // Augmentations, "Defensive Augmentations", Shield Charge Booster. Store cost 45.
  {
    id: "SHIELD_RECHARGE",
    name: "Shield Charge Booster",
    detail: "Shields recharge 15% faster per copy.",
    cost: 45,
  },
  // Augmentations, "FTL Augmentations", FTL Recharge Booster. Store cost 50.
  {
    id: "FTL_BOOSTER",
    name: "FTL Recharge Booster",
    detail: "One copy makes FTL charge take 80% as long. Two take 67%. Three take 57%.",
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Scrap Recovery Arm. Store cost 50.
  {
    id: "SCRAP_COLLECTOR",
    name: "Scrap Recovery Arm",
    detail: "Scrap gain is 10% higher per copy, applied before a weld cut, then rounded down.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Rock Plating. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "ROCK_ARMOR",
    name: "Rock Plating",
    detail:
      "15% chance to ignore hull damage. Systems still take the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Titanium System Casing. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "SYSTEM_CASING",
    name: "Titanium System Casing",
    detail:
      "15% chance to ignore system damage. The hull still takes the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Battery Charger. Store cost 40.
  {
    id: "BATTERY_BOOSTER",
    name: "Battery Charger",
    detail: "The Backup Battery cooldown is cut in half.",
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Emergency Respirators. Store cost 50.
  {
    id: "O2_MASKS",
    name: "Emergency Respirators",
    detail: "Suffocation damage is halved, including while boarding. A Crystal takes a quarter.",
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Fire Suppression. Store cost 65.
  {
    id: "FIRE_EXTINGUISHERS",
    name: "Fire Suppression",
    detail: "Fires on your ship die down faster than a person can put them out.",
    cost: 65,
  },
  // Augmentations, "FTL Augmentations", Distraction Buoys. Store cost 55.
  {
    id: "FLEET_DISTRACTION",
    name: "Distraction Buoys",
    detail: "At sector start, before sector 8, the fleet falls back one jump.",
    cost: 55,
  },
  // Augmentations, "Misc. Augmentations", Long-Ranged Scanners. Store cost 30.
  {
    id: "ADV_SCANNERS",
    name: "Long-Ranged Scanners",
    detail:
      "Adjacent beacons show an environmental hazard and possible ship presence. Selling or swapping the scanners hides that again.",
    cost: 30,
  },
  // Augmentations, "FTL Augmentations", FTL Jammer. Store cost 30.
  {
    id: "FTL_JAMMER",
    name: "FTL Jammer",
    detail: "Enemy ships take twice as long to charge FTL.",
    cost: 30,
  },
  // Augmentations, "Misc. Augmentations", Drone Recovery Arm. Store cost 50.
  {
    id: "DRONE_RECOVERY",
    name: "Drone Recovery Arm",
    detail:
      "A powered defense drone gives its part back when the jump starts. A powered combat drone gives it back only after the fight. Boarding, ion, crew, and hacking drones do not.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Hacking Stun. Store cost 60.
  {
    id: "HACKING_STUN",
    name: "Hacking Stun",
    detail: "Everyone in a room during a hacking pulse is stunned for that pulse.",
    cost: 60,
  },
  // Augmentations, "Crew Augmentations", Backup DNA Bank. Store cost 40.
  {
    id: "BACKUP_DNA",
    name: "Backup DNA Bank",
    detail: "A waiting body stays in the clone bay queue even when the clone bay is off or broken.",
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Reconstructive Teleport. Store cost 70.
  {
    id: "TELEPORT_HEAL",
    name: "Reconstructive Teleport",
    detail: "A person sent through the teleporter is fully healed.",
    cost: 70,
  },
  // Augmentations, "Misc. Augmentations", Lifeform Scanner. Store cost 40.
  {
    id: "LIFE_SCANNER",
    name: "Lifeform Scanner",
    detail: "Living crew show up even when sensors do not.",
    cost: 40,
  },
  // Augmentations, "FTL Augmentations", "Adv. FTL Navigation". Purchase price 50.
  {
    id: "FTL_JUMPER",
    name: "Adv. FTL Navigation",
    detail:
      "The ship can jump to any previously visited beacon, including beacons later overtaken by the Rebel Fleet.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Defense Scrambler. Purchase price 80.
  {
    id: "DEFENSE_SCRAMBLER",
    name: "Defense Scrambler",
    detail:
      "Enemy Defense Drone I, Defense Drone II, and Anti-Combat drones cannot acquire or shoot down targets. Your own defense drones still fire.",
    cost: 80,
  },
  // Augmentations, "Offensive Augmentations", Zoltan Shield Bypass. Purchase price 55.
  {
    id: "ZOLTAN_BYPASS",
    name: "Zoltan Shield Bypass",
    detail: "Crew teleportation, bomb teleportation, and mind control work through Zoltan Shields.",
    cost: 55,
  },
];
