/**
 * When an enemy surrenders, and when a quiet fight breaks off.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "Enemies may also surrender after dropping below a hull threshold."
 * Enemy Ships: "When enemies run or surrender in reaction to hull damage, it's often just a chance for that to happen
 * rather than a guarantee." "Enemies will never start running away if they have already offered a surrender."
 *
 * This module is the rule. Its numbers come from the archive:
 * - each faction's chance and hull band: gap `<shipBlueprint name>` › `<surrender chance min max>`
 *   (@stl/pack `factionSurrender`);
 * - the anti-stalemate break-off: gap `<stalemate threshold seconds fuel>` (`stalemateStat`);
 * - a fight page's own surrender row, read from the event (`eventDef`);
 * - the offer text, boarders, and what is paid stay in wiki/surrender.ts.
 *
 * A ship's own `<surrender>` decides. That is the tag on its hull, or a layout-less blueprint of the same name
 * (gap `<shipBlueprint name="REBEL_SKINNY_ELITE">` and the `BOSS_*` rows are chance 0). Chance 0 never offers.
 * The hull tag wins, so a mod can give the Flagship an offer without a code change. With no tag, the faction row
 * is used. A ship with no faction does not borrow Rebel. Tier is not the rule.
 *
 * Hooks in sim.ts (marked @agent:surrender): startCombat sets the plan, step calls surrenderTick before
 * enemyEscapeStep.
 */
import {
  eventDef,
  factionSurrender,
  hullDef,
  stalemateStat,
  storedId,
  type SurrenderOfferDef,
} from "@stl/pack";
import { log, rand } from "../sim.ts";
import type { Game } from "../types.ts";
import { flagshipHullId } from "../wiki/flagship-layout.ts";
import type { SurrenderOffer } from "../wiki/surrender.ts";
import { closeFight, here, openOffer } from "../wiki/surrender.ts";

export type SurrenderPlan = {
  /** Percent chance of an offer, rolled once when hull first drops to `threshold`. 0 means never. */
  chance: number;
  /** Percent of max hull. Hull points when `hullPoints` is set. */
  threshold: number;
  rolled: boolean;
  /** The offer is on screen, or was made and answered. */
  offered: boolean;
  /** The player said no. The fight goes on. */
  refused: boolean;
  offer: SurrenderOffer | null;
  /**
   * Archive ship event. `threshold` is hull points and `chance` is a probability.
   * Omitted chance on the definition is stored here as 1. Absent on the wiki percent path.
   */
  hullPoints?: boolean;
  /** Slug of the event page whose scripted surrender this fight uses (SCRIPTED_SURRENDERS). */
  event?: string;
  /** A "continues" surrender was accepted: its reward is paid and the fight goes on. */
  accepted?: boolean;
};

export type SurrenderContext = {
  tier: string;
  faction?: string;
  pirate?: boolean;
  event?: string;
  /**
   * Ship blueprint id. Its `<surrender>` replaces the faction row. Chance 0 never offers.
   * Absent, and with no faction, the fight does not borrow Rebel.
   */
  ship?: string;
};

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
  // @agent:sector-hostiles. The wired event slugs for those three pages are plural ("Rock pirates fight", ...).
  "rock-pirates-fight",
  "rock-pirates-fight-near-sun",
  "rock-pirates-fight-in-asteroid-field",
  // Event pages whose fight carries {{SurrenderEscape|surrenderno...}} ("no surrender"): Rebel ship warning, Rebel
  // transport ship, Pirate ship attacking civilian (and its distress variant), Rebel fight among Rebel fleet, Rebel fight
  // among Federation and Rebel fleets, Rebel ship attacking Crystal ship ("CRYSTAL_SHIP_NO_SURRENDER"),
  // No fuel: Engi ship repair, No fuel: Slug fuel depot.
  "rebel-ship-warning",
  "rebel-transport-ship",
  "pirate-ship-attacking-civilian",
  "pirate-ship-attacking-civilian-distress",
  // Lanius ship attacking civilian distress. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never surrenders. Escape is not this line.
  "lanius-ship-attacking-civilian-distress",
  // Lanius ship attacking civilian. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never surrenders. Escape is not this line.
  "lanius-ship-attacking-civilian",
  // Lanius ship attacking Rock. {{SurrenderEscape(alt)|no|LANIUS_ROCK_DISTRESS_SHIP}} prints never surrenders. Escape is not this line.
  "lanius-ship-attacking-rock",
  // Lanius ship attacking Mantis. {{SurrenderEscape(alt)|no|LANIUS_MANTIS_DISTRESS_SHIP}} prints never surrenders. Escape is not this line.
  "lanius-ship-attacking-mantis",
  // Lanius ship attacking Slug. {{SurrenderEscape(alt)|no|LANIUS_SLUG_DISTRESS_SHIP}} prints never surrenders. Escape is not this line.
  "lanius-ship-attacking-slug",
  // Lanius ship in rich debris field. {{SurrenderEscape(alt)|no|LANIUS_HARVESTER_SHIP}} prints never surrenders. Escape is not this line.
  "lanius-ship-in-rich-debris-field",
  // Lanius fight with friendly ASB support. {{SurrenderEscape(alt)|no|LANIUS_BOARDERS_PDS}} prints never surrenders. Escape is not this line.
  "lanius-fight-with-friendly-asb-support",
  // Wiki citations:
  // > "no surrender offers, no escape attempts" — [[Rebel fight among Rebel fleet]]
  "rebel-fight-among-rebel-fleet",
  "rebel-fight-among-federation-and-rebel-fleets",
  "rebel-ship-attacking-crystal-ship",
  // Wiki citations:
  // > "(no surrender offers)" — [[No fuel: Engi ship repair]]
  "no-fuel-engi-ship-repair",
  // > "Fight a Slug ship that is running away. (80 seconds escape countdown timer if not interrupted)(no surrender offers)" — [[No fuel: Slug fuel depot]]
  "no-fuel-slug-fuel-depot",
  // Category:Ship surrender Events: "There are no surrenders in the 1st fight of [[Mantis ship-collectors]]". The wired
  // choice is that first fight (the Mantis Fighter).
  "mantis-ship-collectors",
  // @agent:quests. Quest-marker fights (wiki/quests.ts). {{SurrenderEscape(alt)|no|...}}: Space station under
  // construction (QUEST_CONSTRUCTIONYARD_SHIP), Engi fleet discussion final marker (MANTIS_ENGI_UNLOCK_3), Mantis war camp
  // (MANTIS_LANDING_PARTY). Settlement mercenary work Trivia: "The "SQUAT_STORE_RESCUE" ship ... doesn't surrender".
  // INFERRED (the page prints no surrender result): Slug comm tapping "Head for the cache." pirate, the Slug Home Nebula
  // platform guard and interceptor.
  "quest-space-station-rebel",
  "quest-engi-final",
  "quest-mantis-war-camp",
  // Wiki citations:
  // > "The \"SQUAT_STORE_RESCUE\" ship assaulting the space dock doesn't surrender, nor tries to escape." — [[Settlement mercenary work#Trivia]]
  "quest-store-rescue",
  // Lanius ship absorbing automated scout: {{SurrenderEscape(alt)|escapechance|...|80|20-40|2-4}}.
  // escapechance is an escape attempt only. The 2-4 is the hull tooltip, not a timer.
  "lanius-ship-absorbing-automated-scout",
  "quest-slug-pirate-trap-cache",
  "quest-slug-platform",
  "quest-slug-interceptor",
  // Mantis ship attacking Slug ship, the Slug fight: {{SurrenderEscape(alt)|no|SLUG_DISTRESS_MANTIS_SLUG}}.
  "mantis-ship-attacking-slug-ship-slug",
  // Pirate ships in plasma storm: both cargo fights "never surrenders".
  "pirate-ships-in-plasma-storm",
  "pirate-ships-in-plasma-storm-ammo",
  // Crystal fight choice, Engage the Rebel ship: {{SurrenderEscape(alt)|no|CRYSTAL_SHIP_NO_SURRENDER}}.
  // `|no` is "never runs away, never surrenders." Crystal ships already never run (NEVER_RUN).
  "crystal-fight-choice",
  // Pirate engine hacker. The page prints the ship ("PIRATE_NO_ESCAPE") doesn't surrender. Escape is already handled elsewhere.
  "pirate-engine-hacker",
  // Slug hacker (oxygen). The page prints the enemy ship doesn't surrender. Escape is already handled elsewhere.
  "slug-hacker-oxygen",
  // Crystal ship attacking Federation loyalists. {{SurrenderEscape(alt)|no|CRYSTAL_FED}} prints never surrenders.
  // Crystal ships already never run. The page prints no percent.
  "crystal-ship-attacking-federation-loyalists",
  // Crystalline men buried and Crystalline research facility: {{SurrenderEscape(alt)|no|CRYSTAL_SHIP_NO_SURRENDER}}.
  "crystalline-men-buried",
  "crystalline-research-facility",
  // Fight in Last Stand: {{SurrenderEscape(alt)|no|REBEL_AND_AUTO}}.
  "fight-in-last-stand",
]);

function never(): SurrenderPlan {
  return { chance: 0, threshold: 0, rolled: false, offered: false, refused: false, offer: null };
}

type SurrenderBand = { chance: number; min: number; max: number };

/** The hull's `<surrender>` wins over a layout-less blueprint of the same name. */
function taggedSurrender(id: string | undefined): SurrenderBand | undefined {
  if (!id) return undefined;
  const onHull = hullDef(id)?.surrender;
  if (onHull) return onHull;
  return factionSurrender(id);
}

/** Chance 0 does not roll a threshold. A positive chance draws one point in the band. */
function bandPlan(row: SurrenderBand, roll: () => number): SurrenderPlan {
  if (!(row.chance > 0)) return never();
  const threshold = row.min + roll() * (row.max - row.min);
  return { ...never(), chance: row.chance, threshold };
}

/**
 * Blueprint the offer is read from. The Flagship keeps no classId (a classId would end the fight when its crew
 * dies, before the AI takes over), so its stage blueprint is the id.
 */
export function surrenderBlueprintId(
  ship: { classId?: string; flagship?: { stage: 1 | 2 | 3 } },
  difficulty: string | undefined,
): string | undefined {
  if (ship.flagship) return flagshipHullId(ship.flagship.stage, difficulty);
  return ship.classId;
}

/** The fight page's offer, once the pack has loaded it. */
function scriptedFor(id: string | undefined): SurrenderOfferDef | undefined {
  return id ? eventDef(storedId(id))?.surrender : undefined;
}

export function surrenderPlan(ctx: SurrenderContext, roll: () => number): SurrenderPlan {
  if (ctx.event && NO_SURRENDER_EVENTS.has(ctx.event)) return never();
  // @agent:sector-hostiles. The event page's own surrender row replaces the ship's row.
  const scripted = scriptedFor(ctx.event);
  if (scripted) {
    const threshold = scripted.low + roll() * (scripted.high - scripted.low);
    return { ...never(), chance: scripted.chance, threshold, event: ctx.event };
  }
  // The ship's own tag. Chance 0 is never. A hull tag wins over the layout-less row of the same name.
  const own = taggedSurrender(ctx.ship);
  if (own) return bandPlan(own, roll);
  // No tag on this blueprint: the faction row, which is itself a `<surrender>`. Pirates use the pirate row.
  // A ship with no faction does not borrow Rebel.
  const row = factionSurrender(ctx.pirate ? "pirate" : ctx.faction);
  if (!row) return never();
  return bandPlan(row, roll);
}

function ratio(g: Game): number {
  const ship = g.enemy;
  if (!ship) return 1;
  return (ship.hull / Math.max(1, ship.hullMax)) * 100;
}

/** The break-off line. "A minute" is the loaded 60s; any other gap duration says how long it was. */
function quietSpan(seconds: number): string {
  if (seconds === 60) return "A minute";
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
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
    g.enemySurrender = surrenderPlan(
      {
        tier: "pool",
        faction: ship.faction,
        pirate: ship.pirate,
        ship: surrenderBlueprintId(ship, g.difficulty),
      },
      () => rand(g),
    );
  }
  const plan = g.enemySurrender;
  if (plan?.hullPoints) {
    if (!plan.rolled && ship.hull > 0 && ship.hull <= plan.threshold) {
      plan.rolled = true;
      if (plan.chance >= 1 || rand(g) < plan.chance) {
        plan.offered = true;
        // Same hold as openOffer: an offer on screen spends a hull escape that has not started.
        if (g.enemyEscape && !g.enemyEscape.running) g.enemyEscape.rolled = true;
        return true;
      }
    }
    return stalemateTick(g, h);
  }
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
 * Gap `<stalemate threshold seconds fuel>`.
 */
export function stalemateTick(g: Game, h: number): boolean {
  const ship = g.enemy;
  if (!ship || g.phase !== "combat" || here(g)?.kind === "boss") return false;
  const clock =
    g.stalemate && g.stalemate.ship === ship.name
      ? g.stalemate
      : { ship: ship.name, hull: ship.hull, quiet: 0 };
  g.stalemate = clock;
  if (ship.hull < clock.hull) clock.quiet = 0;
  clock.hull = ship.hull;
  // "below a certain hull threshold (likely below 50%, closer to 30-40%)". Gap `<stalemate threshold>`.
  if (ship.hull <= 0 || ratio(g) >= stalemateStat("threshold")) {
    clock.quiet = 0;
    return false;
  }
  clock.quiet += h;
  // "doesn't receive any more hull damage for 1 minute". Gap `<stalemate seconds>`.
  if (clock.quiet < stalemateStat("seconds")) return false;
  // "the fight will end by granting you 2 fuel." INFERRED: no scrap, and it does not count as a kill.
  // Gap `<stalemate fuel>`.
  const fuel = stalemateStat("fuel");
  const seconds = stalemateStat("seconds");
  closeFight(g);
  g.fuel += fuel;
  log(g, `${quietSpan(seconds)} without a hit. The fight breaks off. +${fuel} fuel.`);
  g.reward = {
    scrap: 0,
    note: "Neither ship can finish it. Both crews break off.",
    res: { fuel },
  };
  g.phase = "reward";
  g.paused = true;
  g.sfx.push("win");
  return true;
}
