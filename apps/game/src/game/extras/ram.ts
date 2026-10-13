/**
 * Gate Ram phase and surge timing, taken only from the wiki page
 * "The Rebel Flagship". No player-facing copy lives in this file.
 *
 * Headings consulted:
 * - "Global behavior"
 * - "1st Stage" → "General"
 * - "2nd stage" → "General", "Power Surge"
 * - "Final stage" → "General", "Power Surge"
 *
 * "1st Stage" / "General" lists "Hull : 20".
 * "2nd stage" / "General" lists "Hull : 22".
 * "Final stage" / "General" lists "Hull : 20".
 * Those are each stage's own hull pool, not cuts on one bar.
 * "Global behavior": "Hull and system damage of the Rebel Flagship will be
 * repaired on the next stage." A stage ends when that stage is destroyed;
 * the page never gives a remaining-hull fraction or a fixed point at which
 * the current hull changes phase.
 */

/**
 * INFERRED: no hull band is stated, so this is null rather than a made-up
 * split of hull / hullMax. The 20 / 22 / 20 figures above are stage hull
 * pools, not thresholds, and phase 2's pool is larger than phase 1's, so
 * they cannot be ordered into bands.
 */
export const PHASE_BANDS: null = null;

/**
 * INFERRED: with PHASE_BANDS null, every hull reading is phase 1.
 * Do not treat 20 or 22 as a phase cut.
 */
export function phaseOf(hull: number, hullMax: number): 1 | 2 | 3 {
  void hull;
  void hullMax;
  return 1;
}

/**
 * "Global behavior": Power Surge exists on the second and third stage only.
 * "2nd stage" / "Power Surge": "The cooldown of the Power Surge varies
 * randomly each time, between 20 and 30 seconds." Warning at 5 seconds.
 * Surge length "is about 7 seconds" — a duration, not the interval.
 * "Final stage" / "Power Surge": cooldown "randomly between 20 and 30
 * seconds." Warning "exactly 5 seconds beforehand."
 * None of those is one fixed interval, so this returns null.
 * bossThink's 16s is INVENTED.
 */
export function surgeSeconds(phase: 1 | 2 | 3): number | null {
  void phase;
  return null;
}

/** "1st Stage" / "General": Hull 20. "2nd stage": Hull 22. "Final stage": Hull 20. Each is that stage's own pool. */
export const STAGE_HULL = [20, 22, 20] as const;

export function stageHull(stage: 1 | 2 | 3): number {
  return STAGE_HULL[stage - 1];
}

/**
 * "2nd stage" / "Power Surge" and "Final stage" / "Power Surge": cooldown is random, 20 to 30 seconds.
 * Stage 1 has no surge ("Global behavior": the surge is on the second and third stage only).
 * This is a roll, not one fixed interval. surgeSeconds stays null for that reason.
 */
export function rollSurge(stage: 1 | 2 | 3, roll: number): number | null {
  if (stage < 2) return null;
  const t = Math.min(1, Math.max(0, roll));
  return 20 + t * 10;
}
