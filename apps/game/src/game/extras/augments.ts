import { augmentDef } from "@stl/pack";
import { bars, chargerCap, FIRE_FIGHT_SHARE, log, powerMask, rand, zoltanBars } from "../sim.ts";
import type { AugmentId, BeaconKind, Crew, Game, Ship } from "../types.ts";

/** Fires, Crystal crew: they put out fires at 83% of the normal rate. */
export function crystalExtinguishScale(): number {
  return 0.83;
}

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
  return 1 + copies(g, "AUTO_COOLDOWN") / 10;
}

/** Augmentations, "Offensive Augmentations", Explosive Replicator: 50% chance not to spend a missile. */
export function saveMissile(g: Game): boolean {
  if (!has(g, "EXPLOSIVE_REPLICATOR")) return false;
  return rand(g) < 0.5;
}

/** Augmentations, "Offensive Augmentations", Weapon Pre-Igniter. Artillery is a separate kit and is not primed. */
export function primeWeapons(g: Game) {
  if (!has(g, "WEAPON_PREIGNITE")) return;
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
  const n = copies(g, "ION_ARMOR");
  if (n >= 2) return true;
  if (n <= 0) return false;
  return rand(g) < 0.5;
}

/** Augmentations, "Defensive Augmentations", Shield Charge Booster: +15% recharge rate per copy, additive. */
export function coilRate(g: Game, aboard: "player" | "enemy"): number {
  if (aboard !== "player") return 1;
  return 1 + 0.15 * copies(g, "SHIELD_RECHARGE");
}

/**
 * Augmentations, "FTL Augmentations", FTL Recharge Booster:
 * charge time is 80% / 67% / 57% for one, two, and three copies.
 * The printed values, not 0.8^n (that would be 64% and 51%).
 */
export function spoolRate(g: Game): number {
  const n = copies(g, "FTL_BOOSTER");
  if (n <= 0) return 1;
  if (n === 1) return 0.8;
  if (n === 2) return 0.67;
  return 0.57;
}

/** Augmentations, "Non-Purchasable Augmentations", Rock Plating: 15% chance to negate hull damage. Store price is INVENTED. */
export function keelHolds(g: Game): boolean {
  if (!has(g, "ROCK_ARMOR")) return false;
  return rand(g) < 0.15;
}

/** Augmentations, "Non-Purchasable Augmentations", Titanium System Casing: 15% chance to negate system damage. Store price is INVENTED. */
export function casingHolds(g: Game): boolean {
  if (!has(g, "SYSTEM_CASING")) return false;
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
  if (crew.side !== "player" || !has(g, "O2_MASKS")) return 1;
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
  if (has(g, "FIRE_EXTINGUISHERS")) {
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
 * The player copy is g.augments "NANO_MEDBAY". An Engi enemy uses the same heal and does not gain that id.
 * No purchase price, so it is not in CATALOG.
 */
function medbotHeal(g: Game, dt: number, ship: Ship, side: "player" | "enemy") {
  if (ship.kits.clonebay) return;
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
  if (has(g, "NANO_MEDBAY")) medbotHeal(g, dt, g.player, "player");
  if (g.enemy && g.enemy.faction === "engi") medbotHeal(g, dt, g.enemy, "enemy");
}

/**
 * Augmentations, "FTL Augmentations", Distraction Buoys:
 * "Leaves a false signal at sector start to delay Rebels 1 jump."
 * No effect in the final sector. A fleet already at 0 skips its next advance.
 */
export function onNewSector(g: Game) {
  if (g.sector >= 8 || !has(g, "FLEET_DISTRACTION")) {
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
  if (!has(g, "ADV_SCANNERS")) return false;
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
  if (!has(g, "ADV_SCANNERS")) return { ship: false, hazard: false };
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
  let n = scrap * (1 + 0.1 * copies(g, "SCRAP_COLLECTOR"));
  if (has(g, "REPAIR_ARM") && g.player.hull < g.player.hullMax) {
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
  const row = augmentDef(id);
  if (!row || row.cost <= 0) return false;
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
