import { tx } from "../../i18n/index.ts";
import { bars, chargerCap, FIRE_FIGHT_SHARE, log, powerMask, rand, zoltanBars } from "../sim.ts";
import type { AugmentId, BeaconKind, Crew, Game, Ship } from "../types.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";

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
  if (primed) log(g, tx("extras.augments.weapon-pre-igniter-weapons-are-charged"));
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
 * The printed values, not 0.8^n (that would be 64% and 51%).
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
 * Augmentations, "Defensive Augmentations", Fire Suppression:
 * "Puts out all fires at once, at the same speed as a Crystal crew (slightly slower than a Human)."
 * That Crystal rate is FIRE_FIGHT_SHARE * crystalExtinguishScale(), on every burning player room.
 * Crew in the room keep their own extinguish. This rate is not scaled by a Rock or by repair skill.
 * The enemy hull is ignored.
 */
export function tickSquall(g: Game, dt: number) {
  if (has(g, "squall")) {
    for (const room of g.player.rooms) {
      if (room.fire <= 0) continue;
      room.fire = Math.max(0, room.fire - dt * FIRE_FIGHT_SHARE * crystalExtinguishScale());
    }
  }
  tickMedbot(g, dt);
}

/**
 * Augmentations, Engi Med-bot Dispersal: "Heals 1.6 health points per second."
 * "Medbay must be powered for it to work." "Not affected by Medbay upgrades."
 * "Does not work on crew that is on another ship (teleported)."
 * "Does nothing if you have a Clone Bay."
 * "Engi nano med-bots heal the crew outside of the med-bay (at a reduced speed)."
 * Engi Ships lead: "They have the Engi Med-bot Dispersal augment, but it only functions when they have a Medbay."
 * The player copy is g.augments "medbot". An Engi enemy uses the same heal and does not gain that id.
 * No purchase price, so it is not in CATALOG.
 */
function medbotHeal(g: Game, dt: number, ship: Ship, side: "player" | "enemy") {
  if (ship.kits.cradle) return;
  if (bars(ship.systems.medbay, zoltanBars(g.crew, ship, side, "medbay")) <= 0) return;
  for (const crew of g.crew) {
    if (crew.side !== side || crew.aboard !== side || crew.hp <= 0) continue;
    const room = ship.rooms.find((item) => item.id === crew.room);
    if (!room || room.system === "medbay") continue;
    crew.hp = Math.min(crew.maxHp, crew.hp + 1.6 * dt);
  }
}

export function tickMedbot(g: Game, dt: number) {
  if (!(dt > 0)) return;
  if (has(g, "medbot")) medbotHeal(g, dt, g.player, "player");
  if (g.enemy && g.enemy.faction === "engi") medbotHeal(g, dt, g.enemy, "enemy");
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
    log(g, tx("extras.augments.distraction-buoys-the-fleet-loses-a"));
    return;
  }
  g.buoyDelay = 0;
  g.fleet -= 1;
  log(g, tx("extras.augments.distraction-buoys-the-fleet-loses-a"));
}

/**
 * Augmentations, "Misc. Augmentations", Long-Ranged Scanners.
 * "Reveal environmental hazards and possible ship presence of adjacent beacons."
 * "If the scanners don't indicate a ship presence at a beacon, it may still result in a ship fight.
 * Likewise, even if a ship is detected, there may be options to avoid a fight."
 * False when glass is not fitted.
 * INFERRED: possible ship presence is "hostile", "distress", or "boss", plus a quest marker whose
 * shipdetected line is ship. A quest marker is kind "event", so the kind alone would hide it.
 * INFERRED: "event", "store", "empty", "cache", "exit", "start", and "nebula" are not a ship on their own.
 */
const SHIP_PRESENCE: readonly BeaconKind[] = ["hostile", "distress", "boss"];

/** Quest ids whose marker page prints shipdetected=ship (or ship plus a hazard). noship markers stay dark. */
const QUEST_SHIPS = new Set([
  "zoltan-peace",
  "fed-assist",
  "capture-ship",
  "engi-real",
  "engi-fake",
  "engi-final",
  "rock-sun",
  "rock-shipyard",
  "mantis-chase",
]);

export function reveals(g: Game, beaconKind: BeaconKind): boolean {
  if (!has(g, "glass")) return false;
  return SHIP_PRESENCE.includes(beaconKind);
}

/**
 * Augmentations, "Misc. Augmentations", Long-Ranged Scanners.
 * "Work proactively and retroactively: adjacent beacons left far behind will also have the information
 * revealed after acquiring the scanners, all previously revealed information won't be shown anymore if
 * the scanners are sold (or swapped out)."
 * Read live from the fitted augments. No revealed set is stored.
 * "Environment hazards, which may occur due to some event choices after arrival at the beacon, are not shown."
 * A nebula beacon kind is not an environmental hazard by itself.
 * INFERRED: a hazard is beacon.asteroid === true, or flag or name containing
 * "asteroid", "sun", "red giant", "pulsar", "plasma storm", or "ion storm" (case insensitive).
 */
const HAZARD_TEXT = ["asteroid", "sun", "red giant", "pulsar", "plasma storm", "ion storm"];

function textHasHazard(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HAZARD_TEXT.some((mark) => lower.includes(mark));
}

export function scanMark(
  g: Game,
  beacon: { kind: BeaconKind; asteroid?: boolean; flag?: string; name?: string; quest?: string },
): { ship: boolean; hazard: boolean } {
  if (!has(g, "glass")) return { ship: false, hazard: false };
  return {
    ship: reveals(g, beacon.kind) || (!!beacon.quest && QUEST_SHIPS.has(beacon.quest)),
    hazard: beacon.asteroid === true || textHasHazard(beacon.flag) || textHasHazard(beacon.name),
  };
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
    log(g, tx("extras.augments.repair-arm-seals-2-hull"));
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
    log(g, tx("extras.augments.already-fitted"));
    return false;
  }
  if (g.augments.length >= 3) {
    log(g, tx("extras.augments.three-augments-is-the-cap"));
    return false;
  }
  if (g.scrap < row.cost) {
    log(g, tx("extras.augments.not-enough-scrap"));
    return false;
  }
  g.scrap -= row.cost;
  g.augments.push(id);
  log(g, `${row.name} fitted.`);
  return true;
}
