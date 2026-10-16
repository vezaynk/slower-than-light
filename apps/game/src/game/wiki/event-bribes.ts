/**
 * Scrap rolled onto a bribe button when the card opens.
 * A fixed band has the same ends and does not roll.
 * The handler still reads the amount from the choice id.
 */
import { eventDef } from "@stl/pack";
import type { EventBribe } from "@stl/pack";

export const BRIBE_BANDS: Record<string, EventBribe> = {
  "rebel-checkpoint": { k: "scrap", lo: 10, hi: 15 },
};

/** The packed scrap band for this page, or null when the page rolls none. */
export function bribeBand(id: string): [number, number] | null {
  const bribe = eventDef(id)?.bribe;
  if (bribe?.k !== "scrap" || bribe.lo > bribe.hi) return null;
  return [bribe.lo, bribe.hi];
}

/**
 * The scrap this page rolls onto its bribe button.
 * A fixed band does not call `roll`, so a price that does not vary spends no random number.
 * A page with no bribe rolls nothing.
 */
export function rollBribe(id: string, roll: (lo: number, hi: number) => number): number | null {
  const band = bribeBand(id);
  if (!band) return null;
  if (band[0] === band[1]) return band[0];
  return roll(band[0], band[1]);
}
