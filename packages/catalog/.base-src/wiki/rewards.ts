import type { FactionSurrender, NamedReward, RewardResource, RewardTable } from "@stl/pack";

/**
 * Hyperspace's default scrap scaling and resource bands.
 * Scrap ends are derived. Fuel, missiles, and drone parts are the absolute min and max.
 * The roller stays between on those integers.
 */
const SCRAP: RewardResource = { name: "scrap" };

function named(name: string, resources: RewardResource[], bonus?: number): NamedReward {
  const row: NamedReward = { name, resources };
  if (bonus != null) {
    row.minResources = 2;
    row.maxResources = 2;
    row.bonus = { roll: 100, chance: bonus };
  }
  return row;
}

export const REWARD_TABLE: RewardTable = {
  scaling: [
    { baseAmount: 15, sectorAmount: 6, difficultyAmount: 0 },
    { difficulty: 0, baseAmount: 15, sectorAmount: 6, difficultyAmount: 1 },
    { difficulty: 2, baseAmount: 15, sectorAmount: 6, difficultyAmount: -1 },
  ],
  resources: [
    { kind: "scrap", level: "LOW", min: 500, max: 700 },
    { kind: "scrap", level: "MED", min: 800, max: 1300 },
    { kind: "scrap", level: "HIGH", min: 1300, max: 1550 },
    { kind: "fuel", level: "LOW", min: 1, max: 3 },
    { kind: "fuel", level: "MED", min: 2, max: 4 },
    { kind: "fuel", level: "HIGH", min: 3, max: 6 },
    { kind: "missiles", level: "LOW", min: 1, max: 2 },
    { kind: "missiles", level: "MED", min: 2, max: 4 },
    { kind: "missiles", level: "HIGH", min: 4, max: 8 },
    { kind: "droneparts", level: "LOW", min: 1, max: 1 },
    { kind: "droneparts", level: "MED", min: 1, max: 1 },
    { kind: "droneparts", level: "HIGH", min: 1, max: 2 },
  ],
  rewards: [
    named(
      "standard",
      [
        SCRAP,
        { name: "fuel", level: "LOW" },
        { name: "missiles", level: "LOW" },
        { name: "droneparts", level: "LOW" },
      ],
      3,
    ),
    named(
      "stuff",
      [
        { name: "scrap", level: "LOW" },
        { name: "fuel" },
        { name: "missiles" },
        { name: "droneparts" },
      ],
      6,
    ),
    named("scrap_only", [SCRAP]),
    named("fuel", [SCRAP, { name: "fuel" }]),
    named("missiles", [SCRAP, { name: "missiles" }]),
    named("droneparts", [SCRAP, { name: "droneparts" }]),
    named("fuel_only", [{ name: "fuel" }]),
    named("missiles_only", [{ name: "missiles" }]),
    named("droneparts_only", [{ name: "droneparts" }]),
  ],
};

/**
 * Enemy Ships, default surrender rows.
 * Auto, Engi, Mantis, Zoltan, and Federation have no row, so they do not offer.
 */
export const FACTION_SURRENDER: FactionSurrender[] = [
  { id: "crystal", chance: 40, min: 30, max: 40 },
  { id: "slug", chance: 50, min: 30, max: 40 },
  { id: "lanius", chance: 80, min: 30, max: 40 },
  { id: "pirate", chance: 50, min: 30, max: 40 },
  { id: "rebel", chance: 50, min: 20, max: 30 },
  { id: "rock", chance: 30, min: 30, max: 40 },
];
