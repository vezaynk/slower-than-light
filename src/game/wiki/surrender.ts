/**
 * Enemy surrender offers and the anti-stalemate rule.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "Enemies may also surrender after dropping below a hull threshold."
 * Enemy Ships: "When enemies run or surrender in reaction to hull damage, it's often just a chance for that to happen
 * rather than a guarantee." "Enemies will never start running away if they have already offered a surrender."
 * Rewards, "Stuff": "This type of reward is most often used in non-scripted (i.e. not guaranteed to occur) ship
 * surrenders." Template:SurrenderEscape links every surrender offer to Rewards#Stuff.
 *
 * Hooks in sim.ts (marked @agent:surrender): startCombat sets the plan, step calls surrenderTick before
 * enemyEscapeStep, and choose routes the two offer choices here.
 */
import { WEAPONS, mediumScrapBand } from "../content.ts";
import { adjustScrap } from "../extras/index.ts";
import { clearEnemyLeash } from "../extras/leash.ts";
import { log, rand } from "../sim.ts";
import type { Difficulty, Game } from "../types.ts";

export type SurrenderTier = "low" | "medium" | "high";

/** What the enemy hands over if the player accepts. Rolled once, when the offer is made. */
export type SurrenderOffer = {
  tier: SurrenderTier;
  scrap: number;
  /** Score, s: the band amount before augment adjustments. */
  eligible: number;
  fuel: number;
  missiles: number;
  parts: number;
  /** Rewards, "Stuff": the bonus item, when the 6% roll lands and a slot is free. */
  weapon?: string;
};

export type SurrenderPlan = {
  /** Percent chance of an offer, rolled once when hull first drops to `threshold`. 0 means never. */
  chance: number;
  /** Percent of max hull. */
  threshold: number;
  rolled: boolean;
  /** The offer is on screen, or was made and answered. */
  offered: boolean;
  /** The player said no. The fight goes on. */
  refused: boolean;
  offer: SurrenderOffer | null;
};

export type SurrenderContext = {
  tier: string;
  faction?: string;
  pirate?: boolean;
  event?: string;
};

/**
 * Enemy Ships, "Surrender/escape values for ships of various factions with 'Default rewards'":
 * Crystal ("CRYSTAL_SHIP") "40% surrender offer chance at 30-40% hull"; Slug ("JELLY") "50% ... at 30-40% hull";
 * Lanius ("LANIUS_SHIP") "80% ... at 30-40% hull"; Pirate ("PIRATE") "50% ... at 30-40% hull";
 * Rebel ("REBEL") "50% ... at 20-30% hull"; Rock ("ROCK_SHIP") "30% ... at 30-40% hull".
 * "Remember that pirates are different from their regular counterparts", so a pirate uses the Pirate row.
 */
export const SURRENDER_ROWS: Record<string, { chance: number; low: number; high: number }> = {
  crystal: { chance: 40, low: 30, high: 40 },
  slug: { chance: 50, low: 30, high: 40 },
  lanius: { chance: 80, low: 30, high: 40 },
  pirate: { chance: 50, low: 30, high: 40 },
  rebel: { chance: 50, low: 20, high: 30 },
  rock: { chance: 30, low: 30, high: 40 },
};

/**
 * Enemy Ships, "Never run away, never surrender": Auto-ships, Engi ships, Mantis ships, Zoltan ships.
 * Federation has no row; Template:SurrenderEscape reads a ship with no data as "should not escape or offer surrender".
 * "Crystal ships (some ships only)" also appear there, but the page does not say which, so every Crystal ship uses
 * the 40% row. INFERRED.
 */
export const NEVER_SURRENDER = new Set(["auto", "engi", "mantis", "zoltan", "federation"]);

/**
 * Enemy Ships, "Never run away, never surrender": "Rebel ships in certain events ([[Rebel ship attacking Federation
 * loyalists]], [[Rebel ship attacking refueling outpost]], [[Rebel ship supplying civilians]], [[Engi distress Rebel
 * fight]], and some other events)" and "Rock pirate ships in events that specifically load a Rock pirate ([[Rock pirate
 * fight]], [[Rock pirate fight near sun]], [[Rock pirate fight in asteroid field]])". The "other events" are not named.
 */
export const NO_SURRENDER_EVENTS = new Set([
  "rebel-ship-attacking-federation-loyalists",
  "rebel-ship-attacking-refueling-outpost",
  "rebel-ship-supplying-civilians",
  "engi-distress-rebel-fight",
  "rock-pirate-fight",
  "rock-pirate-fight-near-sun",
  "rock-pirate-fight-in-asteroid-field",
]);

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)": "when the enemy ship is below a certain hull threshold (likely below
 * 50%, closer to 30-40%) and doesn't receive any more hull damage for 1 minute, the fight will end by granting you 2 fuel."
 * INFERRED: 40%, the top of the "closer to 30-40%" range.
 */
export const STALEMATE_THRESHOLD = 40;
export const STALEMATE_SECONDS = 60;
export const STALEMATE_FUEL = 2;

export const ACCEPT_ID = "surrender-accept";
export const REFUSE_ID = "surrender-refuse";

function never(): SurrenderPlan {
  return { chance: 0, threshold: 0, rolled: false, offered: false, refused: false, offer: null };
}

export function surrenderPlan(ctx: SurrenderContext, roll: () => number): SurrenderPlan {
  // Enemy Ships, "Never run away, never surrender": "Rebel Elite ships" and the Flagship.
  // INFERRED for the boss: the Flagship is on no surrender row (Template:SurrenderEscape "verify").
  if (ctx.tier === "boss" || ctx.tier === "elite") return never();
  if (ctx.event && NO_SURRENDER_EVENTS.has(ctx.event)) return never();
  if (!ctx.pirate && NEVER_SURRENDER.has(ctx.faction ?? "")) return never();
  // INFERRED: a ship with no faction field is a generic Rebel, as in wiki/escape.ts.
  const row = SURRENDER_ROWS[ctx.pirate ? "pirate" : (ctx.faction ?? "rebel")];
  if (!row) return never();
  // Enemy Ships, DISCLAIMER: the percent "may be incorrect as a concept"; read as a percent of max hull here.
  // INFERRED: one threshold drawn uniformly inside the row's range, like the escape threshold.
  const threshold = row.low + roll() * (row.high - row.low);
  return { ...never(), chance: row.chance, threshold };
}

/** Template:Scrap rewards, Low and High columns, sectors 1–8. Medium comes from content.ts. */
const SCRAP_LOW: Record<Difficulty, [number, number][]> = {
  easy: [[10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39], [31, 44]],
  normal: [[7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35], [28, 39]],
  hard: [[7, 10], [7, 10], [10, 14], [13, 18], [16, 23], [19, 27], [22, 31], [25, 35]],
};
const SCRAP_HIGH: Record<Difficulty, [number, number][]> = {
  easy: [[27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88], [81, 97]],
  normal: [[19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79], [74, 88]],
  hard: [[19, 23], [19, 23], [27, 32], [35, 41], [42, 51], [50, 60], [58, 69], [66, 79]],
};

function scrapBand(g: Game, tier: SurrenderTier): [number, number] {
  if (tier === "medium") return mediumScrapBand(g.difficulty ?? "normal", g.sector);
  const table = tier === "low" ? SCRAP_LOW : SCRAP_HIGH;
  return (table[g.difficulty] ?? table.normal)[Math.min(7, Math.max(0, g.sector - 1))];
}

/** Template:Resources rewards: Fuel 1–3 / 2–4 / 3–6, Missiles 1–2 / 2–4 / 4–8, Drone parts 1 / 1 / 1–2. */
const RESOURCES: Record<"fuel" | "missiles" | "parts", Record<SurrenderTier, [number, number]>> = {
  fuel: { low: [1, 3], medium: [2, 4], high: [3, 6] },
  missiles: { low: [1, 2], medium: [2, 4], high: [4, 8] },
  parts: { low: [1, 1], medium: [1, 1], high: [1, 2] },
};

function between(g: Game, [lo, hi]: [number, number]): number {
  return lo + Math.floor(rand(g) * (hi - lo + 1));
}

/**
 * Rewards, "Stuff": "T resources (2 random resources among fuel, missiles, and drone parts) + low scrap + roughly a 6%
 * chance to include a bonus weapon, augmentation, or drone schematic." "Ships surrender offers in fights with default
 * rewards ... are random tier." "A successful 6% bonus item roll modifies the scrap part of the reward to match the
 * resources tier."
 * INFERRED: "random tier" is low, medium or high with equal odds; the two resources are different ones.
 * INFERRED: the bonus item is a weapon the ship does not own, and is dropped when all three slots are full.
 */
export function rollSurrenderOffer(g: Game): SurrenderOffer {
  const tier = (["low", "medium", "high"] as const)[Math.min(2, Math.floor(rand(g) * 3))];
  const kinds = ["fuel", "missiles", "parts"] as const;
  const skip = Math.min(2, Math.floor(rand(g) * 3));
  const offer: SurrenderOffer = { tier, scrap: 0, eligible: 0, fuel: 0, missiles: 0, parts: 0 };
  kinds.forEach((k, i) => {
    if (i !== skip) offer[k] = between(g, RESOURCES[k][tier]);
  });
  const bonus = rand(g) < 0.06;
  if (bonus && g.player.weapons.length < 3) {
    const owned = new Set(g.player.weapons.map((w) => w.defId));
    const options = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
    if (options.length) offer.weapon = options[Math.min(options.length - 1, Math.floor(rand(g) * options.length))].id;
  }
  offer.eligible = between(g, scrapBand(g, bonus ? tier : "low"));
  offer.scrap = adjustScrap(g, offer.eligible);
  return offer;
}

/** The offer on screen, for the event card. Null when the open event is not a surrender. */
export function surrenderOfferView(g: Game): SurrenderOffer | null {
  const plan = g.enemySurrender;
  if (g.phase !== "event" || !g.enemy || !plan?.offered || plan.refused) return null;
  return plan.offer;
}

function ratio(g: Game): number {
  const ship = g.enemy;
  if (!ship) return 1;
  return (ship.hull / Math.max(1, ship.hullMax)) * 100;
}

/** The beacon the player is at. */
function here(g: Game) {
  return g.beacons.find((b) => b.id === g.here);
}

/**
 * Ends the fight without a wreck: the same clean-up winCombat does, minus its salvage.
 * Mind Control: an enemy hold ends with the fight.
 */
function closeFight(g: Game) {
  clearEnemyLeash(g);
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemy = null;
  g.enemyEscape = null;
  g.enemyFlee = 0;
  g.shots = [];
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  g.stalemate = null;
  const b = here(g);
  if (b) b.resolved = true;
  // Same as winCombat: a guarded exit opens once its guard is gone. INFERRED for a surrender or a stalemate.
  if (g.pending === "exit-clear" && b) b.flag = "";
  // A pending event bonus (crew, scrap) was for wrecking the ship, not for a surrender or a stalemate. INFERRED.
  g.pending = null;
}

function openOffer(g: Game) {
  const plan = g.enemySurrender;
  if (!plan) return;
  plan.offered = true;
  plan.offer = rollSurrenderOffer(g);
  // Enemy Ships: "Enemies will never start running away if they have already offered a surrender."
  // A hull-triggered escape that has not rolled yet is spent here. One already charging keeps charging. INFERRED.
  if (g.enemyEscape && !g.enemyEscape.running) g.enemyEscape.rolled = true;
  g.phase = "event";
  g.paused = true;
  g.targeting = false;
  // INVENTED: the hail text. The page gives no generic surrender line.
  g.event = {
    title: "Surrender",
    body: `${g.enemy?.name ?? "The enemy"} hails you: "Enough! We surrender. Take our cargo and let us go."`,
    choices: [
      { id: ACCEPT_ID, label: "Accept their surrender." },
      { id: REFUSE_ID, label: "Refuse. Keep firing." },
    ],
  };
  log(g, "The enemy is offering to surrender.");
  g.sfx.push("alarm");
}

/**
 * One combat tick, run before enemyEscapeStep. Returns true when the tick opened an offer or ended the fight,
 * so the rest of step should not run.
 *
 * Order when both thresholds are crossed on the same hit: the surrender roll goes first, because "Enemies will never
 * start running away if they have already offered a surrender". If no offer is made, the escape roll still happens on
 * this same tick. INFERRED: the page does not say which the game checks first.
 */
export function surrenderTick(g: Game, h: number): boolean {
  const ship = g.enemy;
  if (!ship || g.phase !== "combat") return false;
  if (g.enemySurrender === undefined) {
    // Saves from before this module: build the plan from the ship that is already here.
    const boss = here(g)?.kind === "boss";
    g.enemySurrender = surrenderPlan({ tier: boss ? "boss" : "pool", faction: ship.faction, pirate: ship.pirate }, () => rand(g));
  }
  const plan = g.enemySurrender;
  if (plan && plan.chance > 0 && !plan.rolled && ship.hull > 0 && ratio(g) <= plan.threshold) {
    // Enemy Ships: "it's often just a chance". One roll, the first time hull drops that low.
    plan.rolled = true;
    if (rand(g) * 100 < plan.chance) {
      openOffer(g);
      return true;
    }
  }
  return stalemateTick(g, h);
}

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)". The clock runs only while hull is below the threshold, and any hull
 * damage starts it over. INFERRED: not for the Flagship, whose fight is the run's ending; a paused game does not count.
 */
export function stalemateTick(g: Game, h: number): boolean {
  const ship = g.enemy;
  if (!ship || g.phase !== "combat" || here(g)?.kind === "boss") return false;
  const clock = g.stalemate && g.stalemate.ship === ship.name ? g.stalemate : { ship: ship.name, hull: ship.hull, quiet: 0 };
  g.stalemate = clock;
  if (ship.hull < clock.hull) clock.quiet = 0;
  clock.hull = ship.hull;
  if (ship.hull <= 0 || ratio(g) >= STALEMATE_THRESHOLD) {
    clock.quiet = 0;
    return false;
  }
  clock.quiet += h;
  if (clock.quiet < STALEMATE_SECONDS) return false;
  // "the fight will end by granting you 2 fuel." INFERRED: no scrap, and it does not count as a kill.
  closeFight(g);
  g.fuel += STALEMATE_FUEL;
  log(g, `A minute without a hit. The fight breaks off. +${STALEMATE_FUEL} fuel.`);
  g.reward = { scrap: 0, note: "Neither ship can finish it. Both crews break off.", res: { fuel: STALEMATE_FUEL } };
  g.phase = "reward";
  g.paused = true;
  g.sfx.push("win");
  return true;
}

/** choose() routes here first. Returns true when the id was a surrender choice. */
export function surrenderChoose(g: Game, id: string): boolean {
  if (id !== ACCEPT_ID && id !== REFUSE_ID) return false;
  const plan = g.enemySurrender;
  if (!plan?.offered || !g.enemy) {
    g.event = null;
    g.phase = g.enemy ? "combat" : "map";
    return true;
  }
  g.event = null;
  if (id === REFUSE_ID) {
    plan.refused = true;
    g.phase = "combat";
    g.paused = false;
    // Enemy Ships: "If you jump away after rejecting an enemy's surrender offer, then return, the enemy will not be
    // present. The enemy indicator on the map will also disappear after jumping away."
    const b = here(g);
    if (b && b.kind !== "boss") b.resolved = true;
    log(g, "Offer refused. They brace for more.");
    return true;
  }
  // Accepting ends the fight with the offered cargo. INFERRED: it counts as a defeated ship for the run's kill count.
  const offer = plan.offer ?? rollSurrenderOffer(g);
  g.kills += 1;
  closeFight(g);
  g.scrap += offer.scrap;
  g.scrapCollected = (g.scrapCollected ?? 0) + offer.eligible;
  g.fuel += offer.fuel;
  g.missiles += offer.missiles;
  g.player.parts += offer.parts;
  let weaponName: string | undefined;
  if (offer.weapon && g.player.weapons.length < 3 && !g.player.weapons.some((w) => w.defId === offer.weapon)) {
    // Same slot rule and id scheme as sim.ts giveWeapon.
    g.uid = (g.uid + 1) >>> 0;
    g.player.weapons.push({ uid: "u" + g.uid.toString(36), defId: offer.weapon, charge: 0, enabled: false, autofire: false, target: null });
    weaponName = WEAPONS[offer.weapon]?.name;
  }
  g.reward = {
    scrap: offer.scrap,
    note: weaponName ? `They hand over their cargo, and a ${weaponName}.` : "They hand over their cargo and limp away.",
    res: { fuel: offer.fuel, missiles: offer.missiles, parts: offer.parts },
  };
  g.phase = "reward";
  g.paused = true;
  g.sfx.push("win");
  log(g, "Surrender accepted.");
  return true;
}
