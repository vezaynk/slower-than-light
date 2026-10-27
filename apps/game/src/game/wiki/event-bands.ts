/**
 * Printed ranges on a loaded page.
 * A fixed band has the same ends and does not roll.
 */
import { eventDef } from "@stl/pack";
import type { EventBand } from "@stl/pack";

function legal(band: EventBand): boolean {
  return (
    (band.k === "scrap" ||
      band.k === "fuel" ||
      band.k === "missiles" ||
      band.k === "parts" ||
      band.k === "level") &&
    Number.isInteger(band.lo) &&
    Number.isInteger(band.hi) &&
    band.lo <= band.hi
  );
}

/** The packed range, or null when the page has none of that id and kind. */
export function printedBand(eventId: string, id: string, k: EventBand["k"]): EventBand | null {
  const band = eventDef(eventId)?.bands?.find((row) => row.id === id && row.k === k);
  if (!band || !legal(band)) return null;
  return band;
}

/** The amount this page rolls for one printed range. A fixed band does not call `roll`. */
export function rollBand(
  eventId: string,
  id: string,
  k: EventBand["k"],
  roll: (lo: number, hi: number) => number,
): number | null {
  const band = printedBand(eventId, id, k);
  if (!band) return null;
  if (band.lo === band.hi) return band.lo;
  return roll(band.lo, band.hi);
}

/** Upgrade rows in document order. A row needs both a scrap band and a level band. */
export function upgradeRows(eventId: string): string[] {
  const order: string[] = [];
  const scrap = new Set<string>();
  const level = new Set<string>();
  for (const band of eventDef(eventId)?.bands ?? []) {
    if (!legal(band) || (band.k !== "scrap" && band.k !== "level")) continue;
    const id = band.id.trim();
    if (!id) continue;
    if (band.k === "scrap") scrap.add(id);
    else level.add(id);
    if (!order.includes(id)) order.push(id);
  }
  return order.filter((id) => scrap.has(id) && level.has(id));
}
