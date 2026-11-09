import type { Stalemate } from "@stl/pack";

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)": "when the enemy ship is below a certain hull threshold (likely below
 * 50%, closer to 30-40%) and doesn't receive any more hull damage for 1 minute, the fight will end by granting you 2 fuel."
 * INFERRED: 40%, the top of the "closer to 30-40%" range. The minute is 60 seconds.
 *
 * The gap mod writes these as `<stalemate threshold seconds fuel>`.
 * Faction surrender chance and hull band stay on `<shipBlueprint>` › `<surrender>` (wiki/rewards.ts).
 * Rebel Elite and Flagship blueprints name no surrender row, so "never surrender" for boss and elite stays a tier check.
 */
export const STALEMATE: Required<Stalemate> = { threshold: 40, seconds: 60, fuel: 2 };
