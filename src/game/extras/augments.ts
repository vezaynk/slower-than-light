import { bars, chargerCap, log, powerMask, rand, zoltanBars } from "../sim.ts";
import type { AugmentId, BeaconKind, Crew, Game } from "../types.ts";

type Listing = { id: AugmentId; name: string; detail: string; cost: number };

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
    name: "Automated Re-loader",
    detail: "Weapon charge speed rises 10% per copy. Charge time is divided by 1 + copies / 10.",
    cost: 40,
  },
  // Augmentations, "Offensive Augmentations", Explosive Replicator. Store cost 60.
  {
    id: "echo",
    name: "Explosive Replicator",
    detail: "A missile has a 50% chance not to be spent.",
    cost: 60,
  },
  // Augmentations, "Offensive Augmentations", Stealth Weapons. Store cost 50.
  {
    id: "quiet",
    name: "Stealth Weapons",
    detail: "Firing does not drop cloaking.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Store cost 120.
  {
    id: "hot",
    name: "Weapon Pre-Igniter",
    detail: "After a jump, enabled weapons that have power start fully charged.",
    cost: 120,
  },
  // Augmentations, "Defensive Augmentations", Repair Arm. Store cost 50.
  {
    id: "weld",
    name: "Repair Arm",
    detail: "Scrap gain repairs 2 hull and is cut 15% while the hull is not already full.",
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Reverse Ion Field. Store cost 45.
  {
    id: "baffle",
    name: "Reverse Ion Field",
    detail: "50% chance to ignore an ion hit. Two or more ignore every ion hit.",
    cost: 45,
  },
  // Augmentations, "Defensive Augmentations", Shield Charge Booster. Store cost 45.
  {
    id: "coil",
    name: "Shield Charge Booster",
    detail: "Shields recharge 15% faster per copy.",
    cost: 45,
  },
  // Augmentations, "FTL Augmentations", FTL Recharge Booster. Store cost 50.
  {
    id: "spool",
    name: "FTL Recharge Booster",
    detail: "One copy makes FTL charge take 80% as long. Two take 67%. Three take 57%.",
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Scrap Recovery Arm. Store cost 50.
  {
    id: "hook",
    name: "Scrap Recovery Arm",
    detail: "Scrap gain is 10% higher per copy, applied before a weld cut, then rounded down.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Rock Plating. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "keel",
    name: "Rock Plating",
    detail: "15% chance to ignore hull damage. Systems still take the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  // Augmentations, "Non-Purchasable Augmentations", Titanium System Casing. Sell price 40. Store cost 50 is INVENTED.
  {
    id: "casing",
    name: "Titanium System Casing",
    detail: "15% chance to ignore system damage. The hull still takes the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  // Augmentations, "Misc. Augmentations", Battery Charger. Store cost 40.
  {
    id: "tap",
    name: "Battery Charger",
    detail: "The Backup Battery cooldown is cut in half.",
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Emergency Respirators. Store cost 50.
  {
    id: "lung",
    name: "Emergency Respirators",
    detail: "Suffocation damage is halved, including while boarding. A Crystal takes a quarter.",
    cost: 50,
  },
  // Augmentations, "Defensive Augmentations", Fire Suppression. Store cost 65.
  {
    id: "squall",
    name: "Fire Suppression",
    detail: "Fires on your ship die down faster than a person can put them out.",
    cost: 65,
  },
  // Augmentations, "FTL Augmentations", Distraction Buoys. Store cost 55.
  {
    id: "falsebuoy",
    name: "Distraction Buoys",
    detail: "At sector start, before sector 8, the fleet falls back one jump.",
    cost: 55,
  },
  // Augmentations, "Misc. Augmentations", Long-Ranged Scanners. Store cost 30.
  {
    id: "glass",
    name: "Long-Ranged Scanners",
    detail: "Beacons show what is waiting there.",
    cost: 30,
  },
  // Augmentations, "FTL Augmentations", FTL Jammer. Store cost 30.
  {
    id: "jammer",
    name: "FTL Jammer",
    detail: "Enemy ships take twice as long to charge FTL.",
    cost: 30,
  },
  // Augmentations, "Misc. Augmentations", Drone Recovery Arm. Store cost 50.
  {
    id: "recover",
    name: "Drone Recovery Arm",
    detail: "A powered drone that is still out gives its drone part back. A Hull Repair drone that already broke apart does not.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Hacking Stun. Store cost 60.
  {
    id: "stun",
    name: "Hacking Stun",
    detail: "Everyone in a room during a hacking pulse is stunned for that pulse.",
    cost: 60,
  },
  // Augmentations, "Crew Augmentations", Backup DNA Bank. Store cost 40.
  {
    id: "dna",
    name: "Backup DNA Bank",
    detail: "A waiting body stays in the clone bay queue even when the clone bay is off or broken.",
    cost: 40,
  },
  // Augmentations, "Crew Augmentations", Reconstructive Teleport. Store cost 70.
  {
    id: "mend",
    name: "Reconstructive Teleport",
    detail: "A person sent through the teleporter is fully healed.",
    cost: 70,
  },
  // Augmentations, "Misc. Augmentations", Lifeform Scanner. Store cost 40.
  {
    id: "pulseeye",
    name: "Lifeform Scanner",
    detail: "Living crew show up even when sensors do not.",
    cost: 40,
  },
  // Augmentations, "FTL Augmentations", "Adv. FTL Navigation". Purchase price 50.
  {
    id: "nav",
    name: "Adv. FTL Navigation",
    detail: "The ship can jump to any previously visited beacon, including beacons later overtaken by the Rebel Fleet.",
    cost: 50,
  },
  // Augmentations, "Offensive Augmentations", Defense Scrambler. Purchase price 80.
  {
    id: "scrambler",
    name: "Defense Scrambler",
    detail:
      "Enemy Defense Drone I, Defense Drone II, and Anti-Combat drones cannot acquire or shoot down targets. Your own defense drones still fire.",
    cost: 80,
  },
  // Augmentations, "Offensive Augmentations", Zoltan Shield Bypass. Purchase price 55.
  {
    id: "bypass",
    name: "Zoltan Shield Bypass",
    detail: "Crew teleportation, bomb teleportation, and mind control work through Zoltan Shields.",
    cost: 55,
  },
];

function copies(g: Game, id: AugmentId): number {
  let n = 0;
  for (const have of g.augments) if (have === id) n += 1;
  return n;
}

function has(g: Game, id: AugmentId): boolean {
  return g.augments.includes(id);
}

/** Augmentations, "Offensive Augmentations", Automated Re-loader: firing rate +10% per copy. */
export function feedRate(g: Game, from: "player" | "enemy"): number {
  if (from !== "player") return 1;
  return 1 + copies(g, "feed") / 10;
}

/** Augmentations, "Offensive Augmentations", Explosive Replicator: 50% chance not to spend a missile. */
export function saveMissile(g: Game): boolean {
  if (!has(g, "echo")) return false;
  return rand(g) < 0.5;
}

/** Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Artillery is a separate kit and is not primed. */
export function primeWeapons(g: Game) {
  if (!has(g, "hot")) return;
  const mask = powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
  let primed = false;
  g.player.weapons.forEach((w, i) => {
    if (!w.enabled || !mask[i]) return;
    // Augmentations, Weapon Pre-Igniter: "Only gives one charge to charge weapons, by default."
    // That covers Ion Charger, the Laser Chargers, and Swarm Missiles. The pause-and-jump trick is not applied.
    if (chargerCap(w.defId) != null) {
      w.loaded = 1;
      w.charge = 0;
    } else w.charge = 1;
    primed = true;
  });
  if (primed) log(g, "Weapon Pre-Igniter: weapons are charged.");
}

/** Augmentations, "Defensive Augmentations", Reverse Ion Field: 50% per copy, two or more ignore every ion. */
export function baffleHolds(g: Game): boolean {
  const n = copies(g, "baffle");
  if (n >= 2) return true;
  if (n <= 0) return false;
  return rand(g) < 0.5;
}

/** Augmentations, "Defensive Augmentations", Shield Charge Booster: +15% recharge rate per copy, additive. */
export function coilRate(g: Game, aboard: "player" | "enemy"): number {
  if (aboard !== "player") return 1;
  return 1 + 0.15 * copies(g, "coil");
}

/**
 * Augmentations, "FTL Augmentations", FTL Recharge Booster:
 * charge time is 80% / 67% / 57% for one, two, and three copies.
 * MISMATCH if read as 0.8^n (that would be 64% and 51%).
 */
export function spoolRate(g: Game): number {
  const n = copies(g, "spool");
  if (n <= 0) return 1;
  if (n === 1) return 0.8;
  if (n === 2) return 0.67;
  return 0.57;
}

/** Augmentations, "Non-Purchasable Augmentations", Rock Plating: 15% chance to negate hull damage. Store price is INVENTED. */
export function keelHolds(g: Game): boolean {
  if (!has(g, "keel")) return false;
  return rand(g) < 0.15;
}

/** Augmentations, "Non-Purchasable Augmentations", Titanium System Casing: 15% chance to negate system damage. Store price is INVENTED. */
export function casingHolds(g: Game): boolean {
  if (!has(g, "casing")) return false;
  return rand(g) < 0.15;
}

/**
 * Augmentations, "Crew Augmentations", Emergency Respirators: "Crew take half damage from low oxygen."
 * "The effect also works when boarding enemy ships."
 * Crystal's printed 25% is this half times the racial half in kin.ts, including while boarding.
 * Oxygen: "halves the suffocation damage of your crew."
 * INFERRED: the half follows the crew member's own side, not a mind-control leash.
 * The Oxygen page leaves a mind-controlled enemy as an untested note. Enemy hulls do not carry this augment.
 * Boarders: Humans (Abandoned) names the augment on those humans after a Lanius fight.
 * INFERRED: that is this same half, on the boarder (`crew.lungs`), not an enemy-hull augment.
 */
export function lungScale(g: Game, crew: Crew): number {
  if (crew.lungs) return 0.5;
  if (crew.side !== "player" || !has(g, "lung")) return 1;
  return 0.5;
}

/**
 * Augmentations, "Defensive Augmentations", Fire Suppression.
 * INFERRED: 2 fire-units per second. The page says fires go out at Crystal crew speed and does not give this rate.
 */
export function tickSquall(g: Game, dt: number) {
  if (has(g, "squall")) {
    for (const room of g.player.rooms) {
      if (room.fire <= 0) continue;
      room.fire = Math.max(0, room.fire - dt * 2);
    }
  }
  tickMedbot(g, dt);
}

/**
 * Augmentations, "Non-Purchasable Augmentations", Engi Med-bot Dispersal.
 * 1.6 HP per second, outside the medbay, and only while that medbay is powered.
 * Medbay level does not change the 1.6. Crew on another ship are not healed.
 * A clone bay on the ship makes this do nothing. No purchase price, so it is not in CATALOG.
 */
export function tickMedbot(g: Game, dt: number) {
  if (!(dt > 0) || !has(g, "medbot")) return;
  if (g.player.kits.cradle) return;
  if (bars(g.player.systems.medbay, zoltanBars(g.crew, g.player, "player", "medbay")) <= 0) return;
  for (const crew of g.crew) {
    if (crew.side !== "player" || crew.aboard !== "player" || crew.hp <= 0) continue;
    const room = g.player.rooms.find((item) => item.id === crew.room);
    if (!room || room.system === "medbay") continue;
    crew.hp = Math.min(crew.maxHp, crew.hp + 1.6 * dt);
  }
}

/**
 * Augmentations, "FTL Augmentations", Distraction Buoys:
 * "Leaves a false signal at sector start to delay Rebels 1 jump."
 * No effect in the final sector. A fleet already at 0 skips its next advance.
 */
export function onNewSector(g: Game) {
  if (g.sector >= 8 || !has(g, "falsebuoy")) {
    g.buoyDelay = 0;
    return;
  }
  // The map starts the fleet at 0, so a subtraction would do nothing. Hold the next advance instead.
  if (g.fleet <= 0) {
    g.buoyDelay = 1;
    log(g, "Distraction Buoys. The fleet loses a jump.");
    return;
  }
  g.buoyDelay = 0;
  g.fleet -= 1;
  log(g, "Distraction Buoys. The fleet loses a jump.");
}

/** Augmentations, "Misc. Augmentations", Long-Ranged Scanners. INFERRED: every beacon kind is revealed, not only hazards and ship presence. */
export function reveals(g: Game, beaconKind: BeaconKind): boolean {
  void beaconKind;
  return has(g, "glass");
}

/**
 * Augmentations, "Misc. Augmentations", Scrap Recovery Arm: +10% per copy, stacked before rounding down.
 * Augmentations, "Defensive Augmentations", Repair Arm: 15% less scrap, and 2 hull when the hull is not already full.
 * "Does not reduce scrap gain if your hull is at maximum."
 * INFERRED: the two are applied in that order. The page never states a combined formula.
 */
export function adjustScrapAmount(g: Game, scrap: number): number {
  let n = scrap * (1 + 0.1 * copies(g, "hook"));
  if (has(g, "weld") && g.player.hull < g.player.hullMax) {
    n *= 0.85;
    g.player.hull += 2;
    log(g, "Repair Arm seals 2 hull.");
  }
  return Math.floor(n);
}

/**
 * Augmentations, the paragraph above "Offensive Augmentations": up to three augmentations.
 * That paragraph has no heading. INVENTED: a second copy of a stackable augment is refused.
 */
export function installAugment(g: Game, id: AugmentId): boolean {
  const row = CATALOG.find((item) => item.id === id);
  if (!row) return false;
  if (has(g, id)) {
    log(g, "Already fitted.");
    return false;
  }
  if (g.augments.length >= 3) {
    log(g, "Three augments is the cap.");
    return false;
  }
  if (g.scrap < row.cost) {
    log(g, "Not enough scrap.");
    return false;
  }
  g.scrap -= row.cost;
  g.augments.push(id);
  log(g, `${row.name} fitted.`);
  return true;
}
