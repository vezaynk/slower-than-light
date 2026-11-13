import type { TradeStep } from "@stl/pack";

/** Scrap for the level already owned. The reactor row has no level. */
export const TRADE_STEPS: Record<string, TradeStep[]> = {
  "trade-scrap-for-upgrades": [
    { id: "oxygen", level: 1, lo: 15, hi: 20 },
    { id: "oxygen", level: 2, lo: 25, hi: 40 },
    { id: "pilot", level: 1, lo: 8, hi: 15 },
    { id: "pilot", level: 2, lo: 25, hi: 40 },
    { id: "doors", level: 1, lo: 8, hi: 15 },
    { id: "doors", level: 2, lo: 25, hi: 40 },
    { id: "sensors", level: 1, lo: 10, hi: 20 },
    { id: "sensors", level: 2, lo: 35, hi: 45 },
    { id: "reactor", lo: 15, hi: 25 },
  ],
};
