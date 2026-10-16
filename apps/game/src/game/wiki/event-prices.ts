/**
 * Named price bands on a page.
 * A fixed band has the same ends and does not roll.
 * The handler pays the rolled amount. A button that shows the amount reads it from the choice id.
 */
import { eventDef } from "@stl/pack";
import type { EventPrice } from "@stl/pack";

export const PRICE_BANDS: Record<string, EventPrice[]> = {
  "rebel-checkpoint": [{ id: "bribe", k: "scrap", lo: 10, hi: 15 }],
  "rock-and-slug-standoff": [
    { id: "debt", k: "scrap", lo: 10, hi: 15 },
    { id: "upgrade", k: "scrap", lo: 10, hi: 15 },
  ],
  "friendly-ship-out-of-fuel": [{ id: "give", k: "fuel", lo: 2, hi: 4 }],
  "no-fuel-drifting-debris": [{ id: "ransom", k: "scrap", lo: 25, hi: 40 }],
  "terraforming-scan": [{ id: "scan", k: "scrap", lo: 15, hi: 25 }],
  // Rolled when the dock offer is accepted. The button does not print the amount.
  // Scrap stock 5 on that button is only the floor.
  "refueling-platform": [{ id: "offer", k: "scrap", lo: 5, hi: 10 }],
};

/** The packed band for this button, or null when the page rolls none. */
export function priceBand(eventId: string, priceId: string): EventPrice | null {
  const price = eventDef(eventId)?.prices?.find((row) => row.id === priceId);
  if (!price) return null;
  if ((price.k !== "scrap" && price.k !== "fuel") || price.lo > price.hi) return null;
  return price;
}

/** True when `n` is an integer inside the packed band of that kind. */
export function priced(eventId: string, priceId: string, n: number, k: "scrap" | "fuel"): boolean {
  const price = priceBand(eventId, priceId);
  return !!price && price.k === k && Number.isInteger(n) && n >= price.lo && n <= price.hi;
}

/**
 * The amount this page rolls onto one button.
 * A fixed band does not call `roll`, so a price that does not vary spends no random number.
 * A page with no such price rolls nothing.
 */
export function rollPrice(
  eventId: string,
  priceId: string,
  roll: (lo: number, hi: number) => number,
): number | null {
  const price = priceBand(eventId, priceId);
  if (!price) return null;
  if (price.lo === price.hi) return price.lo;
  return roll(price.lo, price.hi);
}
