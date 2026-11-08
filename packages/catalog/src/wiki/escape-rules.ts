import type { EscapeTimers, FactionEscape } from "@stl/pack";

/**
 * Enemy Ships, "Surrender/escape values for ships of various factions with 'Default rewards'":
 * Slug ("JELLY") 50% at 30-40% hull; Lanius ("LANIUS_SHIP") 80% at 20-40%; Pirate ("PIRATE") 50% at 20-40%;
 * Rebel ("REBEL") 50% at 30-40%. The page warns the percent may really be hull points scaled by sector.
 * "Remember that pirates are different from their regular counterparts", so a pirate uses the Pirate row.
 *
 * Enemy Ships, "Never run away, never surrender": Auto-ships, Engi, Mantis, Zoltan; "Never run away": Crystal, Rock.
 * They have no row, so they never run on their own (their exceptions are event pages).
 *
 * The gap mod writes these as `<shipBlueprint name>` › `<escape chance min max>`.
 */
export const FACTION_ESCAPE: FactionEscape[] = [
  { id: "slug", chance: 50, min: 30, max: 40 },
  { id: "lanius", chance: 80, min: 20, max: 40 },
  { id: "pirate", chance: 50, min: 20, max: 40 },
  { id: "rebel", chance: 50, min: 30, max: 40 },
];

/**
 * Enemy Ships: hull-triggered runs: "the typical escape timer here is 15 seconds".
 * Enemy Ships: "After jumping to a beacon with your last fuel ... start running with an escape timer of 90 seconds."
 *
 * The gap mod writes these as `<escapeTimers hull lastFuel>`.
 */
export const ESCAPE_TIMERS: Required<EscapeTimers> = { hull: 15, lastFuel: 90 };
