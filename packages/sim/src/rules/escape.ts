/**
 * When an enemy tries to jump away, and how long it takes.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "an enemy ship may run away from the start of the fight, or after taking enough damage
 * to put them below a hull threshold." Runners from the start use the event's timer, "in most cases
 * 40 seconds". Hull-triggered runs are "often just a chance", and "the typical escape timer here is
 * 15 seconds". "Enemy escape time is not affected by their engines level."
 * Enemy Ships: "the timer is paused while the enemy ship engines or piloting is disabled or destroyed."
 *
 * This module is the rule. Its numbers come from the archive:
 * - each faction's hull-triggered odds and band: gap `<shipBlueprint name>` › `<escape chance min max>`
 *   (@stl/pack `factionEscape`);
 * - the 15 s hull-triggered timer and the 90 s last-fuel timer: gap `<escapeTimers hull lastFuel>` (`escapeTimer`);
 * - a ship event's own `<escape>` (ftl.dat events_ships.xml), read in sim.ts `archiveEscapePlan`.
 *   A hull already at or below that band is running. A gotaway `<modifyPursuit amount="1">` is `pursuit`.
 */
import { escapeTimer, factionEscape } from "@stl/pack";

export type EscapeMode = "never" | "start" | "hull";

export type EscapePlan = {
  mode: EscapeMode;
  /** Seconds of uninterrupted charging before the ship is gone. */
  seconds: number;
  /** Hull-triggered only: percent chance of a run, rolled once when hull first drops to `threshold`. */
  chance: number;
  /** Hull-triggered only: percent of max hull. Hull points when `hullPoints` is set. */
  threshold: number;
  /**
   * Archive ship event. `threshold` is hull points and `chance` is a probability.
   * Omitted chance on the definition is stored here as 1. Absent on the wiki percent path.
   */
  hullPoints?: boolean;
  /** The one roll has happened. */
  rolled: boolean;
  /** The ship is charging its escape. */
  running: boolean;
  /** The escape announcement has been shown. */
  shown?: boolean;
  /** Rebel Fleet: an escape from this event doubles the fleet's next advance. */
  pursuit: boolean;
};

export type EscapeContext = {
  /** makeEnemy tier: "boss", "elite", or a pool request. */
  tier: string;
  /** The ship's faction, from the gap's <shipList> rows (@stl/pack shipAllegiance). */
  faction?: string;
  /** The ship is a pirate version. */
  pirate?: boolean;
  /** Slug of the cited event page that started the fight, when one did. */
  event?: string;
  /** The ship has no fuel left at the start of the fight. */
  lastFuel?: boolean;
};

/**
 * Enemy Ships: "the typical escape timer here is 15 seconds" for a hull-triggered run. Also the timer of a ship event's
 * `<escape>` that names none. Gap `<escapeTimers hull>`.
 */
export function hullRunSeconds(): number {
  return escapeTimer("hull");
}

/**
 * Enemy Ships: "After jumping to a beacon with your last fuel ... start running with an escape timer of 90 seconds."
 * Gap `<escapeTimers lastFuel>`.
 */
export function lastFuelSeconds(): number {
  return escapeTimer("lastFuel");
}

/**
 * Environmental Hazards, Anti-Ship Battery: 0 fuel after a jump to an overtaken nebula, or that nebula's exit.
 * The enemy runs at the last-fuel timer. Enemy Ships leaves Rebel Elites out of the general last-fuel rule (INFERRED
 * there). This page prints the timer for this arrival, so the Elite runs here.
 * INFERRED: kind "exit" is that nebula exit. An exit is not also marked nebula.
 */
export function overtakenArrivalEscape(): EscapePlan {
  return plan("start", lastFuelSeconds());
}

function plan(mode: EscapeMode, seconds: number, extra: Partial<EscapePlan> = {}): EscapePlan {
  return {
    mode,
    seconds,
    chance: 0,
    threshold: 0,
    rolled: false,
    running: mode === "start",
    pursuit: false,
    ...extra,
  };
}

export function escapePlan(ctx: EscapeContext, rand: () => number): EscapePlan {
  // Enemy Ships, "Never run away, never surrender": "Rebel Elite ships".
  // INFERRED for the boss: "The Rebel Flagship" is on no run list, and Template:SurrenderEscape reads a ship with
  // no escape data as "should not escape". The 90-second last-fuel rule names "non-friendly ships that usually
  // don't start running"; the flagship and the Elite are left out of it here. INFERRED.
  if (ctx.tier === "boss" || ctx.tier === "elite") return plan("never", 0);
  if (ctx.lastFuel) return plan("start", lastFuelSeconds());
  // Enemy Ships, "Surrender/escape values for ships of various factions with 'Default rewards'". "Remember that
  // pirates are different from their regular counterparts", so a pirate uses the Pirate row. INFERRED: a ship with no
  // faction is a generic Rebel. Enemy Ships, "Never run away": a faction with no gap row (Auto, Engi, Mantis, Zoltan,
  // Crystal, Rock) never runs on its own.
  const row = factionEscape(ctx.pirate ? "pirate" : (ctx.faction ?? "rebel"));
  if (!row) return plan("never", 0);
  const threshold = row.min + rand() * (row.max - row.min);
  return plan("hull", hullRunSeconds(), { chance: row.chance, threshold });
}

/** Cited event choice ids look like "c:<slug>:<n>". */
export function eventSlugOf(choiceId: string): string | undefined {
  const m = /^c:([^:]+):/.exec(choiceId);
  return m?.[1];
}
