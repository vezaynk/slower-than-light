/**
 * Overlay a label that prints a packed stock count, when the card is shown.
 * The words are functional: what the button spends and gains. A missing row drops that button.
 * A label that does not print the count is left as it was.
 */
import { stockCount } from "./choice-locks.ts";
import { fuelBand } from "./fuel-gifts.ts";

const REFUEL_FUEL: Record<string, number> = {
  "c:refueling-station:0": 6,
  "c:refueling-station:1": 3,
  "c:refueling-station:2": 1,
};

/** A fixed fuel gift. A missing or rolled band stays off the label. */
function fixedFuel(id: string): number | null {
  const band = fuelBand(id);
  if (!band || band[0] !== band[1]) return null;
  return band[0];
}

function scrapForFuel(
  id: string,
  label: (n: number, fuel: number) => string,
): string | null | undefined {
  const n = stockCount(id, "scrap");
  if (n == null) return null;
  const fuel = fixedFuel(id);
  if (fuel == null) return undefined;
  return label(n, fuel);
}

/**
 * undefined keeps the button. null drops it. A string replaces the label.
 */
function stockLabel(id: string): string | null | undefined {
  if (id === "q:lanius-translator:buy") {
    const n = stockCount(id, "scrap");
    return n == null ? null : `Lose ${n} scrap. Gain 1 Lanius crew.`;
  }
  if (id === "s:zoltan-raft:hire") {
    const n = stockCount(id, "scrap");
    return n == null ? null : `Lose ${n} scrap. Gain 1 crew.`;
  }
  if (id === "q:engi-distress:scrap") {
    const n = stockCount(id, "scrap");
    return n == null ? null : `Lose ${n} scrap.`;
  }
  if (id === "q:engi-distress:supplies") {
    const scrap = stockCount(id, "scrap");
    const missiles = stockCount(id, "missiles");
    const fuel = stockCount(id, "fuel");
    if (scrap == null || missiles == null || fuel == null) return null;
    return `Lose ${scrap} scrap, ${missiles} missiles, and ${fuel} fuel.`;
  }
  if (id === "c:no-fuel-slug-fuel-trader:pay") {
    return scrapForFuel(id, (n, fuel) => `Lose ${n} scrap. Gain ${fuel} fuel.`);
  }
  if (id === "c:no-fuel-refugee-trading:trade") {
    return scrapForFuel(id, (n, fuel) => `Lose ${n} scrap. Gain ${fuel} fuel.`);
  }
  if (id === "c:no-fuel-refugee-trading:better" || id === "c:no-fuel-refugee-trading:again") {
    return scrapForFuel(id, (n, fuel) => `Lose ${n} scrap. Gain ${fuel} fuel.`);
  }
  if (id === "c:slug-repair-station:fuel") {
    const n = stockCount(id, "fuel");
    return n == null ? null : `Lose ${n} fuel.`;
  }
  if (id === "c:slug-repair-station:scrap50") {
    const n = stockCount(id, "scrap");
    return n == null ? null : `Lose ${n} scrap.`;
  }
  if (
    id === "c:refueling-station:0" ||
    id === "c:refueling-station:1" ||
    id === "c:refueling-station:2"
  ) {
    const n = stockCount(id, "scrap");
    if (n == null) return null;
    return `Lose ${n} scrap. Gain ${REFUEL_FUEL[id]} fuel.`;
  }
  if (id === "c:asteroid-mining-colony:1") {
    const n = stockCount(id, "missiles");
    return n == null ? null : `Lose ${n} missiles. A reward follows.`;
  }
  if (id === "c:asteroid-mining-colony:2") {
    const n = stockCount(id, "missiles");
    return n == null ? null : `Lose ${n} missiles. A reward follows.`;
  }
  if (id === "q:station:fuel4") {
    const n = stockCount(id, "fuel");
    return n == null ? null : `Lose ${n} fuel. Gain medium scrap.`;
  }
  if (id === "q:station:fuel1") {
    const n = stockCount(id, "fuel");
    return n == null ? null : `Lose ${n} fuel.`;
  }
  return undefined;
}

/** Replace priced labels, and drop a button whose printed count has no stock row. */
export function stampStockLabels<T extends { id: string; label: string }>(
  choices: readonly T[],
): T[] {
  const out: T[] = [];
  for (const choice of choices) {
    const label = stockLabel(choice.id);
    if (label === undefined) out.push(choice);
    else if (label !== null) out.push(label === choice.label ? choice : { ...choice, label });
  }
  return out;
}
