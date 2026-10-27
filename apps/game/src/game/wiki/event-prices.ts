/**
 * Named price bands on a loaded page.
 * A fixed band has the same ends and does not roll.
 */
import { eventDef } from "@stl/pack";
import type { EventPrice } from "@stl/pack";

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
 * A fixed band does not call `roll`. A page with no such price rolls nothing.
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
