/**
 * When an enemy tries to jump away, and how long it takes.
 * Wiki page "Enemy Ships", section "Surrenders and escape attempts", unless a line says otherwise.
 *
 * Enemy Ships: "an enemy ship may run away from the start of the fight, or after taking enough damage
 * to put them below a hull threshold." Runners from the start use the event's timer, "in most cases
 * 40 seconds". Hull-triggered runs are "often just a chance", and "the typical escape timer here is
 * 15 seconds". "Enemy escape time is not affected by their engines level."
 * Enemy Ships: "the timer is paused while the enemy ship engines or piloting is disabled or destroyed."
 */

export type EscapeMode = "never" | "start" | "hull";

export type EscapePlan = {
  mode: EscapeMode;
  /** Seconds of uninterrupted charging before the ship is gone. */
  seconds: number;
  /** Hull-triggered only: percent chance of a run, rolled once when hull first drops to `threshold`. */
  chance: number;
  /** Hull-triggered only: percent of max hull. */
  threshold: number;
  /** The one roll has happened. */
  rolled: boolean;
  /** The ship is charging its escape. */
  running: boolean;
  /** Rebel Fleet: an escape from this event doubles the fleet's next advance. */
  pursuit: boolean;
};

export type EscapeContext = {
  /** makeEnemy tier: "boss", "elite", or a pool request. */
  tier: string;
  /** Faction of the documented class (wiki/enemy-ships.ts). */
  faction?: string;
  /** The ship is a pirate version. */
  pirate?: boolean;
  /** Slug of the cited event page that started the fight, when one did. */
  event?: string;
  /** The ship has no fuel left at the start of the fight. */
  lastFuel?: boolean;
};

/**
 * Enemy Ships, "Always run away from the start", seconds per event page.
 * Pursuit: Category "Rebel Fleet advancement hazard" lists Auto-ship warning, Auto-ship warning in nebula,
 * No fuel: Auto-ship warning, and Rebel ship warning. "Rebel transport ship": "Fleet pursuit is not doubled."
 */
const RUN_FROM_START: Record<string, { seconds: number; pursuit: boolean }> = {
  "auto-ship-warning": { seconds: 40, pursuit: true },
  "auto-ship-warning-in-nebula": { seconds: 40, pursuit: true },
  // Enemy Ships: "exception: No fuel: Auto-ship warning has 40 seconds escape timer".
  "no-fuel-auto-ship-warning": { seconds: 40, pursuit: true },
  "rebel-ship-warning": { seconds: 40, pursuit: true },
  "rebel-transport-ship": { seconds: 40, pursuit: false },
  "engi-fleet-discussion": { seconds: 40, pursuit: false },
  "rock-war-vessel-encounter": { seconds: 32, pursuit: false },
  "slug-home-nebula-surrender": { seconds: 35, pursuit: false },
};

/** Enemy Ships: the typical hull-triggered escape timer. */
export const HULL_RUN_SECONDS = 15;
/** Enemy Ships: "When you are out of fuel and WAIT ... all ships start running with an escape timer of 80 seconds". */
export const OUT_OF_FUEL_WAIT_SECONDS = 80;
/** Enemy Ships: "After jumping to a beacon with your last fuel ... start running with an escape timer of 90 seconds." */
export const LAST_FUEL_SECONDS = 90;

/**
 * Environmental Hazards, Anti-Ship Battery: 0 fuel after a jump to an overtaken nebula, or that nebula's exit.
 * The enemy runs at 90 seconds. Enemy Ships leaves Rebel Elites out of the general last-fuel rule (INFERRED there).
 * This page prints the timer for this arrival, so the Elite runs here.
 * INFERRED: kind "exit" is that nebula exit. An exit is not also marked nebula.
 */
export function overtakenArrivalEscape(): EscapePlan {
  return plan("start", LAST_FUEL_SECONDS);
}

/**
 * Enemy Ships, "Surrender/escape values for ships of various factions with 'Default rewards'":
 * Slug ("JELLY") 50% at 30-40% hull; Lanius ("LANIUS_SHIP") 80% at 20-40%; Pirate ("PIRATE") 50% at 20-40%;
 * Rebel ("REBEL") 50% at 30-40%. The page warns the percent may really be hull points scaled by sector.
 * "Remember that pirates are different from their regular counterparts", so a pirate uses the Pirate row.
 */
const HULL_ROWS: Record<string, { chance: number; low: number; high: number }> = {
  slug: { chance: 50, low: 30, high: 40 },
  lanius: { chance: 80, low: 20, high: 40 },
  pirate: { chance: 50, low: 20, high: 40 },
  rebel: { chance: 50, low: 30, high: 40 },
};

/**
 * Enemy Ships, "Never run away, never surrender": Auto-ships, Engi, Mantis, Zoltan; "Never run away": Crystal, Rock.
 * Their exceptions are events (Auto-ship warning, Rock war vessel, Mantis ship-collectors, Zoltan science ship,
 * Unarmed Zoltan transport); the scripted ones are in RUN_FROM_START.
 */
const NEVER_RUN = new Set(["auto", "engi", "mantis", "zoltan", "crystal", "rock"]);

function plan(mode: EscapeMode, seconds: number, extra: Partial<EscapePlan> = {}): EscapePlan {
  return { mode, seconds, chance: 0, threshold: 0, rolled: false, running: mode === "start", pursuit: false, ...extra };
}

/** Event pages that print their own hull-triggered escape row, keyed by the cited event slug. */
const EVENT_HULL_ROWS: Record<string, { chance: number; low: number; high: number; seconds?: number }> = {
  // Pirate briber: "has 60% chance to try to escape at 30-40% hull".
  "pirate-briber": { chance: 60, low: 30, high: 40 },
  // "Pirate smuggler", Fight the Pirate ship: "(enemy ship starts to escape at 30-40% hull with 35 seconds countdown timer)".
  // INFERRED: no percent is printed, so the run always begins once hull is in that range.
  "pirate-smuggler": { chance: 100, low: 30, high: 40, seconds: 35 },
};

export function escapePlan(ctx: EscapeContext, rand: () => number): EscapePlan {
  const scripted = ctx.event ? RUN_FROM_START[ctx.event] : undefined;
  if (scripted) return plan("start", scripted.seconds, { pursuit: scripted.pursuit });
  const own = ctx.event ? EVENT_HULL_ROWS[ctx.event] : undefined;
  if (own) return plan("hull", own.seconds ?? HULL_RUN_SECONDS, { chance: own.chance, threshold: own.low + rand() * (own.high - own.low) });
  // Rebel fight among Rebel fleet. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  if (ctx.event === "rebel-fight-among-rebel-fleet") return plan("never", 0);
  // Rebel fight among Federation and Rebel fleets. The page prints surrenderno+escapeno.
  if (ctx.event === "rebel-fight-among-federation-and-rebel-fleets") return plan("never", 0);
  // Rebel ship attacking Federation loyalists. The page prints never surrenders, never escapes. Surrender is already listed elsewhere.
  if (ctx.event === "rebel-ship-attacking-federation-loyalists") return plan("never", 0);
  // Pirate ship attacking civilian distress. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  if (ctx.event === "pirate-ship-attacking-civilian-distress") return plan("never", 0);
  // Pirate ship attacking civilian. The page prints surrenderno+escapeno. Surrender is already listed elsewhere.
  if (ctx.event === "pirate-ship-attacking-civilian") return plan("never", 0);
  // Lanius ship attacking civilian distress. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never runs away. Surrender is already listed elsewhere.
  if (ctx.event === "lanius-ship-attacking-civilian-distress") return plan("never", 0);
  // Lanius ship attacking civilian. {{SurrenderEscape(alt)|no|LANIUS_CIVILIAN}} prints never runs away. Surrender is already listed elsewhere.
  if (ctx.event === "lanius-ship-attacking-civilian") return plan("never", 0);
  // Lanius ship attacking Rock. {{SurrenderEscape(alt)|no|LANIUS_ROCK_DISTRESS_SHIP}} prints never runs away. Surrender is already listed elsewhere.
  if (ctx.event === "lanius-ship-attacking-rock") return plan("never", 0);
  // Enemy Ships: out of fuel and WAIT, "all ships start running" at 80 seconds. The "No fuel: …" event
  // pages are the ones reached by waiting with no fuel, so their slug marks the rule.
  if (ctx.event?.startsWith("no-fuel-")) return plan("start", OUT_OF_FUEL_WAIT_SECONDS);
  // Enemy Ships, "Never run away, never surrender": "Rebel Elite ships".
  // INFERRED for the boss: "The Rebel Flagship" is on no run list, and Template:SurrenderEscape reads a ship with
  // no escape data as "should not escape". The 90-second last-fuel rule names "non-friendly ships that usually
  // don't start running"; the flagship and the Elite are left out of it here. INFERRED.
  if (ctx.tier === "boss" || ctx.tier === "elite") return plan("never", 0);
  if (ctx.lastFuel) return plan("start", LAST_FUEL_SECONDS);
  const row = HULL_ROWS[ctx.pirate ? "pirate" : (ctx.faction ?? "rebel")];
  if (!row || (!ctx.pirate && NEVER_RUN.has(ctx.faction ?? ""))) return plan("never", 0);
  const threshold = row.low + rand() * (row.high - row.low);
  return plan("hull", HULL_RUN_SECONDS, { chance: row.chance, threshold });
}

/** Cited event choice ids look like "c:<slug>:<n>". */
export function eventSlugOf(choiceId: string): string | undefined {
  const m = /^c:([^:]+):/.exec(choiceId);
  return m?.[1];
}
