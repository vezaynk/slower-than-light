import { log, powerMask, rand } from "../sim.ts";
import type { AugmentId, BeaconKind, Game } from "../types.ts";

type Listing = { id: AugmentId; name: string; detail: string; cost: number };

/**
 * Augmentations page, store costs under each heading.
 * Stackable on the wiki (Re-loader, Shield Charge Booster, FTL Recharge Booster,
 * Scrap Recovery Arm, Reverse Ion Field) still share the three-slot cap.
 * INVENTED: installAugment refuses a second copy, so those stacks only happen if
 * a test writes the array directly. Keel Plate and Bulkhead Casing are not sold;
 * their sell prices are 40. The 50 scrap cost below is not on the page.
 */
export const CATALOG: Listing[] = [
  {
    id: "feed",
    name: "Automated Re-loader",
    detail: "Weapon charge speed rises 10% per copy. Charge time is divided by 1 + copies / 10.",
    cost: 40,
  },
  {
    id: "echo",
    name: "Explosive Replicator",
    detail: "A missile has a 50% chance not to be spent.",
    cost: 60,
  },
  {
    id: "quiet",
    name: "Stealth Weapons",
    detail: "Firing does not drop cloaking.",
    cost: 50,
  },
  {
    id: "hot",
    name: "Weapon Pre-Igniter",
    detail: "After a jump, enabled weapons that have power start fully charged.",
    cost: 120,
  },
  {
    id: "weld",
    name: "Repair Arm",
    detail: "Scrap gain repairs 2 hull when the hull is not full, and the scrap is cut 15%.",
    cost: 50,
  },
  {
    id: "baffle",
    name: "Reverse Ion Field",
    detail: "50% chance to ignore an ion hit. Two or more ignore every ion hit.",
    cost: 45,
  },
  {
    id: "coil",
    name: "Shield Charge Booster",
    detail: "Shields recharge 15% faster per copy.",
    cost: 45,
  },
  {
    id: "spool",
    name: "FTL Recharge Booster",
    detail: "One copy makes FTL charge take 80% as long. Two take 67%. Three take 57%.",
    cost: 50,
  },
  {
    id: "hook",
    name: "Scrap Recovery Arm",
    detail: "Scrap gain is 10% higher per copy, applied before a weld cut, then rounded down.",
    cost: 50,
  },
  {
    id: "keel",
    name: "Rock Plating",
    detail: "15% chance to ignore hull damage. Systems still take the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  {
    id: "casing",
    name: "Titanium System Casing",
    detail: "15% chance to ignore system damage. The hull still takes the hit. Not a store item on the wiki; 50 scrap is invented.",
    cost: 50,
  },
  {
    id: "tap",
    name: "Battery Charger",
    detail: "The Backup Battery cooldown is cut in half.",
    cost: 40,
  },
  {
    id: "lung",
    name: "Emergency Respirators",
    detail: "Suffocation damage is halved.",
    cost: 50,
  },
  {
    id: "squall",
    name: "Fire Suppression",
    detail: "Fires on your ship die down faster than a person can put them out.",
    cost: 65,
  },
  {
    id: "falsebuoy",
    name: "Distraction Buoys",
    detail: "At sector start, before sector 8, the fleet falls back one jump.",
    cost: 55,
  },
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
    detail: "A powered drone that is still out gives its drone part back. Destroyed is not tracked.",
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
  const mask = powerMask(g.player);
  let primed = false;
  g.player.weapons.forEach((w, i) => {
    if (!w.enabled || !mask[i]) return;
    w.charge = 1;
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

/** Augmentations, "Non-Purchasable", Rock Plating: 15% chance to negate hull damage. Store price is INVENTED. */
export function keelHolds(g: Game): boolean {
  if (!has(g, "keel")) return false;
  return rand(g) < 0.15;
}

/** Augmentations, "Non-Purchasable", Titanium System Casing: 15% chance to negate system damage. Store price is INVENTED. */
export function casingHolds(g: Game): boolean {
  if (!has(g, "casing")) return false;
  return rand(g) < 0.15;
}

/** Augmentations, "Crew Augmentations", Emergency Respirators: half suffocation damage. Crystal's further cut is not implemented. */
export function lungScale(g: Game, aboard: "player" | "enemy"): number {
  if (aboard !== "player") return 1;
  return has(g, "lung") ? 0.5 : 1;
}

/**
 * Augmentations, "Defensive Augmentations", Fire Suppression.
 * INFERRED: 2 fire-units per second. The page says fires go out at Crystal crew speed and does not give this rate.
 */
export function tickSquall(g: Game, dt: number) {
  if (!has(g, "squall")) return;
  for (const room of g.player.rooms) {
    if (room.fire <= 0) continue;
    room.fire = Math.max(0, room.fire - dt * 2);
  }
}

/**
 * Augmentations, "FTL Augmentations", Distraction Buoys:
 * "Leaves a false signal at sector start to delay Rebels 1 jump."
 * No effect in the final sector. A line already at 0 stays at 0.
 */
export function onNewSector(g: Game) {
  if (g.sector >= 8 || !has(g, "falsebuoy")) return;
  if (g.fleet <= 0) return;
  g.fleet -= 1;
  log(g, "Distraction Buoys. The fleet loses a jump.");
}

/** Augmentations, "Misc. Augmentations", Long-Ranged Scanners. INFERRED: every beacon kind is revealed, not only hazards and ship presence. */
export function reveals(g: Game, beaconKind: BeaconKind): boolean {
  void beaconKind;
  return has(g, "glass");
}

/**
 * Augmentations, Scrap Recovery Arm (+10% per copy, before rounding) then Repair Arm
 * (15% less scrap, and 2 hull when the hull is not already full).
 */
export function adjustScrapAmount(g: Game, scrap: number): number {
  let n = scrap * (1 + 0.1 * copies(g, "hook"));
  if (has(g, "weld")) {
    n *= 0.85;
    if (g.player.hull < g.player.hullMax) {
      g.player.hull += 2;
      log(g, "Repair Arm seals 2 hull.");
    }
  }
  return Math.floor(n);
}

/** Augmentations: three slots is the cap. INVENTED: a second copy of a stackable augment is refused. */
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
