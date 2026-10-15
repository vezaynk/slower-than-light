import { tx } from "../../i18n/index.ts";
import type { AugmentId } from "../types.ts";

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
    id: "feed",
    name: tx("extras.augments.automated-re-loader"),
    detail: tx("extras.augments.weapon-charge-speed-rises-10-per"),
    cost: 40,
  },
  // Augmentations, "Offensive Augmentations", Explosive Replicator. Store cost 60.
  {
    id: "echo",
    name: tx("extras.augments.explosive-replicator"),
    detail: tx("extras.augments.a-missile-has-a-50-chance"),
    cost: 60,
  },
  // Augmentations, "Offensive Augmentations", Stealth Weapons. Store cost 50.
  {
    id: "quiet",
    name: tx("extras.augments.stealth-weapons"),
    detail: tx("extras.augments.firing-does-not-drop-cloaking"),
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Store cost 120.
  {
    id: "hot",
    name: tx("extras.augments.weapon-pre-igniter"),
    detail: tx("extras.augments.after-a-jump-enabled-weapons-that"),
    cost: 120,
  },
  // Augmentations, "Defensive Augmentations", Repair Arm. Store cost 50.
  {
    id: "weld",
    name: tx("extras.augments.repair-arm"),
    detail: tx("extras.augments.scrap-gain-repairs-2-hull-and"),
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Reverse Ion Field. Store cost 45.
  {
    id: "baffle",
    name: tx("extras.augments.reverse-ion-field"),
    detail: tx("extras.augments.50-chance-to-ignore-an-ion"),
    cost: 45,
  },
  // Augmentations, "Defensive Augmentations", Shield Charge Booster. Store cost 45.
  {
    id: "coil",
    name: tx("extras.augments.shield-charge-booster"),
    detail: tx("extras.augments.shields-recharge-15-faster-per-copy"),
    cost: 45,
  },
  // Augmentations, "FTL Augmentations", FTL Recharge Booster. Store cost 50.
  {
    id: "spool",
    name: tx("extras.augments.ftl-recharge-booster"),
    detail: tx("extras.augments.one-copy-makes-ftl-charge-take"),
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Scrap Recovery Arm. Store cost 50.
  {
    id: "hook",
    name: tx("extras.augments.scrap-recovery-arm"),
    detail: tx("extras.augments.scrap-gain-is-10-higher-per"),
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Rock Plating. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "keel",
    name: tx("extras.augments.rock-plating"),
    detail: tx("extras.augments.15-chance-to-ignore-hull-damage"),
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Titanium System Casing. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "casing",
    name: tx("extras.augments.titanium-system-casing"),
    detail: tx("extras.augments.15-chance-to-ignore-system-damage"),
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Battery Charger. Store cost 40.
  {
    id: "tap",
    name: tx("extras.augments.battery-charger"),
    detail: tx("extras.augments.the-backup-battery-cooldown-is-cut"),
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Emergency Respirators. Store cost 50.
  {
    id: "lung",
    name: tx("extras.augments.emergency-respirators"),
    detail: tx("extras.augments.suffocation-damage-is-halved-including-while"),
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Fire Suppression. Store cost 65.
  {
    id: "squall",
    name: tx("extras.augments.fire-suppression"),
    detail: tx("extras.augments.fires-on-your-ship-die-down"),
    cost: 65,
  },
  // Augmentations, "FTL Augmentations", Distraction Buoys. Store cost 55.
  {
    id: "falsebuoy",
    name: tx("extras.augments.distraction-buoys"),
    detail: tx("extras.augments.at-sector-start-before-sector-8"),
    cost: 55,
  },
  // Augmentations, "Misc. Augmentations", Long-Ranged Scanners. Store cost 30.
  {
    id: "glass",
    name: tx("extras.augments.long-ranged-scanners"),
    detail: tx("extras.augments.adjacent-beacons-show-an-environmental-hazard"),
    cost: 30,
  },
  // Augmentations, "FTL Augmentations", FTL Jammer. Store cost 30.
  {
    id: "jammer",
    name: tx("extras.augments.ftl-jammer"),
    detail: tx("extras.augments.enemy-ships-take-twice-as-long"),
    cost: 30,
  },
  // Augmentations, "Misc. Augmentations", Drone Recovery Arm. Store cost 50.
  {
    id: "recover",
    name: tx("extras.augments.drone-recovery-arm"),
    detail: tx("extras.augments.a-powered-defense-drone-gives-its"),
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Hacking Stun. Store cost 60.
  {
    id: "stun",
    name: tx("extras.augments.hacking-stun"),
    detail: tx("extras.augments.everyone-in-a-room-during-a"),
    cost: 60,
  },
  // Augmentations, "Crew Augmentations", Backup DNA Bank. Store cost 40.
  {
    id: "dna",
    name: tx("extras.augments.backup-dna-bank"),
    detail: tx("extras.augments.a-waiting-body-stays-in-the"),
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Reconstructive Teleport. Store cost 70.
  {
    id: "mend",
    name: tx("extras.augments.reconstructive-teleport"),
    detail: tx("extras.augments.a-person-sent-through-the-teleporter"),
    cost: 70,
  },
  // Augmentations, "Misc. Augmentations", Lifeform Scanner. Store cost 40.
  {
    id: "pulseeye",
    name: tx("extras.augments.lifeform-scanner"),
    detail: tx("extras.augments.living-crew-show-up-even-when"),
    cost: 40,
  },
  // Augmentations, "FTL Augmentations", "Adv. FTL Navigation". Purchase price 50.
  {
    id: "nav",
    name: tx("extras.augments.adv-ftl-navigation"),
    detail: tx("extras.augments.the-ship-can-jump-to-any"),
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Defense Scrambler. Purchase price 80.
  {
    id: "scrambler",
    name: tx("extras.augments.defense-scrambler"),
    detail:
      tx("extras.augments.enemy-defense-drone-i-defense-drone"),
    cost: 80,
  },
  // Augmentations, "Offensive Augmentations", Zoltan Shield Bypass. Purchase price 55.
  {
    id: "bypass",
    name: tx("extras.augments.zoltan-shield-bypass"),
    detail: tx("extras.augments.crew-teleportation-bomb-teleportation-and-mind"),
    cost: 55,
  },
];

