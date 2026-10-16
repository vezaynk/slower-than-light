/**
 * Overlay a label that prints a packed stock count, when the card is shown.
 * The page tables keep the campaign sentence. A missing row drops that button.
 * A label that does not print the count is left as it was.
 */
import { tx } from "../../i18n/index.ts";
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

function scrapForFuel(id: string, key: string): string | null | undefined {
  const n = stockCount(id, "scrap");
  if (n == null) return null;
  const fuel = fixedFuel(id);
  if (fuel == null) return undefined;
  return tx(key, { n, fuel });
}

/**
 * undefined keeps the button. null drops it. A string replaces the label.
 */
function stockLabel(id: string): string | null | undefined {
  if (id === "q:lanius-translator:buy") {
    const n = stockCount(id, "scrap");
    return n == null ? null : tx("wiki.quests.purchase-the-translator-for-n-scrap", { n });
  }
  if (id === "s:zoltan-raft:hire") {
    const n = stockCount(id, "scrap");
    return n == null ? null : tx("wiki.quests.offer-to-hire-him-for-n-scrap", { n });
  }
  if (id === "q:engi-distress:scrap") {
    const n = stockCount(id, "scrap");
    return n == null ? null : tx("wiki.quests.give-them-n-scrap", { n });
  }
  if (id === "q:engi-distress:supplies") {
    const scrap = stockCount(id, "scrap");
    const missiles = stockCount(id, "missiles");
    const fuel = stockCount(id, "fuel");
    if (scrap == null || missiles == null || fuel == null) return null;
    return tx("wiki.quests.give-them-n-scrap-n-missiles", { scrap, missiles, fuel });
  }
  if (id === "c:no-fuel-slug-fuel-trader:pay") return scrapForFuel(id, "wiki.cited-missing.pay-n-for-n");
  if (id === "c:no-fuel-refugee-trading:trade") return scrapForFuel(id, "wiki.cited-missing.trade-n-for-n");
  if (id === "c:no-fuel-refugee-trading:better" || id === "c:no-fuel-refugee-trading:again") {
    return scrapForFuel(id, "wiki.cited-missing.accept-n-for-n");
  }
  if (id === "c:slug-repair-station:fuel") {
    const n = stockCount(id, "fuel");
    return n == null ? null : tx("wiki.cited-missing.give-n-fuel", { n });
  }
  if (id === "c:slug-repair-station:scrap50") {
    const n = stockCount(id, "scrap");
    return n == null ? null : tx("wiki.cited-missing.give-n-scrap", { n });
  }
  if (id === "c:refueling-station:0" || id === "c:refueling-station:1" || id === "c:refueling-station:2") {
    const n = stockCount(id, "scrap");
    if (n == null) return null;
    return tx("wiki.filler-events.buy-n-fuel-for-n-scrap", { fuel: REFUEL_FUEL[id], n });
  }
  if (id === "c:asteroid-mining-colony:1") {
    const n = stockCount(id, "missiles");
    return n == null ? null : tx("wiki.filler-events.give-them-the-requested-n-missiles", { n });
  }
  if (id === "c:asteroid-mining-colony:2") {
    const n = stockCount(id, "missiles");
    return n == null ? null : tx("wiki.filler-events.give-them-n-missiles", { n });
  }
  if (id === "q:station:fuel4") {
    const n = stockCount(id, "fuel");
    return n == null ? null : tx("wiki.quests.give-them-the-requested-n-fuel", { n });
  }
  if (id === "q:station:fuel1") {
    const n = stockCount(id, "fuel");
    return n == null ? null : tx("wiki.quests.give-them-n-fuel", { n });
  }
  return undefined;
}

/** Replace priced labels, and drop a button whose printed count has no stock row. */
export function stampStockLabels<T extends { id: string; label: string }>(choices: readonly T[]): T[] {
  const out: T[] = [];
  for (const choice of choices) {
    const label = stockLabel(choice.id);
    if (label === undefined) out.push(choice);
    else if (label !== null) out.push(label === choice.label ? choice : { ...choice, label });
  }
  return out;
}
