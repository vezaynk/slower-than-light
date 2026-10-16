/**
 * Printed ranges on a page.
 * A fixed band has the same ends and does not roll.
 * The handler rolls one at the call site it already used.
 * A missing band pays or grants nothing.
 * An upgrade row is the same id with a scrap band and a level band. Document order is the pick order.
 */
import { eventDef } from "@stl/pack";
import type { EventBand } from "@stl/pack";

export const PRINTED_BANDS: Record<string, EventBand[]> = {
  // Three equal results. The handler picks one, rolls scrap, then rolls the level after the ship can pay.
  "pirate-ship-selling-drones": [
    { id: "low", k: "scrap", lo: 15, hi: 20 },
    { id: "low", k: "level", lo: 2, hi: 3 },
    { id: "mid", k: "scrap", lo: 25, hi: 33 },
    { id: "mid", k: "level", lo: 4, hi: 5 },
    { id: "high", k: "scrap", lo: 50, hi: 65 },
    { id: "high", k: "level", lo: 6, hi: 7 },
  ],
  // Scrap granted after the drone parts are spent. Weapons still grants its packed fuel.
  "merchant-s-request": [
    { id: "paltry", k: "scrap", lo: 20, hi: 30 },
    { id: "full", k: "scrap", lo: 40, hi: 55 },
    { id: "weapons", k: "scrap", lo: 55, hi: 70 },
  ],
  // The 5-missile thanks, then the 15-missile thanks. Hull 5 rides with the second pay.
  "asteroid-mining-colony": [
    { id: "thanks", k: "scrap", lo: 15, hi: 25 },
    { id: "wow", k: "scrap", lo: 30, hi: 40 },
  ],
  // One of the three scan results. Not a scrap tier.
  "destroyed-cargo-ship": [{ id: "scan", k: "scrap", lo: 20, hi: 35 }],
  // The drink's trap. A Rock's trap is the fight and does not use this band.
  "slug-drink": [{ id: "trap", k: "scrap", lo: 25, hi: 35 }],
  // Granted after the packed fuel gift.
  "refueling-platform-garbled-broadcast": [{ id: "sensors3", k: "parts", lo: 1, hi: 3 }],
};

function legal(band: EventBand): boolean {
  return (
    (band.k === "scrap" || band.k === "fuel" || band.k === "missiles" || band.k === "parts" || band.k === "level") &&
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

/**
 * The amount this page rolls for one printed range.
 * A fixed band does not call `roll`. A missing band rolls nothing.
 */
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

/**
 * Upgrade rows in document order. A row needs both a scrap band and a level band.
 * One row is the whole table. An empty table is not a pick.
 */
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
