import type { OfferRow } from "@stl/pack";

/**
 * Offer tables a beacon page rolls when the card opens.
 * The sim still picks the row and still rolls the bands, in the same order as before.
 * A fuel page stores the high list and the second-visit list.
 * The Lanius trader stores the base band and the better band. The translator page stores the base band.
 */

const TRADE: OfferRow[] = [
  { k: "trade", pay: "parts", cost: [1, 2], get: "fuel", gain: [5, 10] },
  { k: "trade", pay: "fuel", cost: [1, 2], get: "missiles", gain: [4, 5] },
  { k: "trade", pay: "missiles", cost: [2, 3], get: "parts", gain: [2, 3] },
  { k: "trade", pay: "missiles", cost: [2, 4], get: "fuel", gain: [4, 10] },
];

/** Template:Fuel Trader High List, then Template:Fuel Trader Pt2. */
const FUEL: OfferRow[] = [
  { k: "fuel", band: "high", fuel: [2, 4], pay: "parts", amt: [1, 2] },
  { k: "fuel", band: "high", fuel: [2, 5], pay: "missiles", amt: [2, 4] },
  { k: "fuel", band: "high", fuel: [2, 5], pay: "scrap", amt: [15, 25] },
  { k: "fuel", band: "pt2", fuel: [4, 7], pay: "parts", amt: [1, 2] },
  { k: "fuel", band: "pt2", fuel: [4, 7], pay: "missiles", amt: [1, 2] },
  { k: "fuel", band: "pt2", fuel: [3, 7], pay: "scrap", amt: [5, 12] },
];

/** Base scrap is 15-30 fuel, 20-40 missiles, 20-40 drone parts. The cost band is 3-7. */
const LANIUS_BASE: OfferRow[] = [
  { k: "lanius", band: "base", res: "fuel", cost: [3, 7], scrap: [15, 30] },
  { k: "lanius", band: "base", res: "missiles", cost: [3, 7], scrap: [20, 40] },
  { k: "lanius", band: "base", res: "parts", cost: [3, 7], scrap: [20, 40] },
];

/** A Lanius asks again for 20-35, 25-50, and 25-50. */
const LANIUS_BETTER: OfferRow[] = [
  { k: "lanius", band: "better", res: "fuel", cost: [3, 7], scrap: [20, 35] },
  { k: "lanius", band: "better", res: "missiles", cost: [3, 7], scrap: [25, 50] },
  { k: "lanius", band: "better", res: "parts", cost: [3, 7], scrap: [25, 50] },
];

/** Missiles, drone parts, fuel. A 0-wide band stays 0. */
const SUPPLY: OfferRow[] = [
  { k: "supply", missiles: [3, 5], parts: [0, 2], fuel: [0, 0] },
  { k: "supply", missiles: [0, 2], parts: [2, 3], fuel: [0, 0] },
  { k: "supply", missiles: [0, 2], parts: [0, 2], fuel: [2, 3] },
];

export const OFFER_ROWS: Record<string, readonly OfferRow[]> = {
  "trade-resources": TRADE,
  "trade-resources-in-nebula": TRADE,
  refugee: TRADE,
  "refugee-distress": TRADE,
  "refugee-zoltan": TRADE,
  "refugee-distress-zoltan": TRADE,
  "refugee-pirate": TRADE,
  "refugee-distress-pirate": TRADE,
  "refugee-slug": TRADE,
  "refugee-distress-slug": TRADE,
  "no-fuel-fuel-trader-distress-off": FUEL,
  "no-fuel-fuel-trader-distress-on": FUEL,
  "no-fuel-prepare-to-dock": FUEL,
  "lanius-trader": [...LANIUS_BASE, ...LANIUS_BETTER],
  "lanius-trader-with-translator": LANIUS_BASE,
  "improve-reactor-for-supplies": SUPPLY,
};
