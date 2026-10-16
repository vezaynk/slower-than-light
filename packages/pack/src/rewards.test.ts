import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { loadPack, resetPackForTests, resourceRange, rewardBonus, scrapRange } from "./registry.ts";
import type { RewardTable } from "./types.ts";

/** The printed scrap tables, sectors 1–8, before the formula replaced the arrays. */
const LOW = {
  easy: [
    [10, 14],
    [13, 18],
    [16, 23],
    [19, 27],
    [22, 31],
    [25, 35],
    [28, 39],
    [31, 44],
  ],
  normal: [
    [7, 10],
    [10, 14],
    [13, 18],
    [16, 23],
    [19, 27],
    [22, 31],
    [25, 35],
    [28, 39],
  ],
  hard: [
    [7, 10],
    [7, 10],
    [10, 14],
    [13, 18],
    [16, 23],
    [19, 27],
    [22, 31],
    [25, 35],
  ],
} as const;
const MEDIUM = {
  easy: [
    [16, 27],
    [21, 35],
    [26, 42],
    [31, 50],
    [36, 58],
    [40, 66],
    [45, 74],
    [50, 81],
  ],
  normal: [
    [12, 19],
    [16, 27],
    [21, 35],
    [26, 42],
    [31, 50],
    [36, 58],
    [40, 66],
    [45, 74],
  ],
  hard: [
    [12, 19],
    [12, 19],
    [16, 27],
    [21, 35],
    [26, 42],
    [31, 50],
    [36, 58],
    [40, 66],
  ],
} as const;
const HIGH = {
  easy: [
    [27, 32],
    [35, 41],
    [42, 51],
    [50, 60],
    [58, 69],
    [66, 79],
    [74, 88],
    [81, 97],
  ],
  normal: [
    [19, 23],
    [27, 32],
    [35, 41],
    [42, 51],
    [50, 60],
    [58, 69],
    [66, 79],
    [74, 88],
  ],
  hard: [
    [19, 23],
    [19, 23],
    [27, 32],
    [35, 41],
    [42, 51],
    [50, 60],
    [58, 69],
    [66, 79],
  ],
} as const;

const TABLE: RewardTable = {
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
    {
      name: "standard",
      resources: [{ name: "scrap" }],
      minResources: 2,
      maxResources: 2,
      bonus: { roll: 100, chance: 3 },
    },
    {
      name: "stuff",
      resources: [{ name: "scrap", level: "LOW" }],
      minResources: 2,
      maxResources: 2,
      bonus: { roll: 100, chance: 6 },
    },
  ],
};

afterEach(() => resetPackForTests());

describe("reward bounds", () => {
  it("derives every printed scrap cell and keeps the resource bands", () => {
    loadPack({ rewards: TABLE }, "base");
    const tables = { low: LOW, medium: MEDIUM, high: HIGH } as const;
    for (const tier of ["low", "medium", "high"] as const) {
      for (const difficulty of ["easy", "normal", "hard"] as const) {
        for (let sector = 1; sector <= 8; sector++) {
          assert.deepEqual(scrapRange(difficulty, sector, tier), tables[tier][difficulty][sector - 1]);
        }
      }
    }
    assert.deepEqual(resourceRange("fuel", "low"), [1, 3]);
    assert.deepEqual(resourceRange("fuel", "medium"), [2, 4]);
    assert.deepEqual(resourceRange("fuel", "high"), [3, 6]);
    assert.deepEqual(resourceRange("missiles", "low"), [1, 2]);
    assert.deepEqual(resourceRange("missiles", "medium"), [2, 4]);
    assert.deepEqual(resourceRange("missiles", "high"), [4, 8]);
    assert.deepEqual(resourceRange("parts", "low"), [1, 1]);
    assert.deepEqual(resourceRange("parts", "medium"), [1, 1]);
    assert.deepEqual(resourceRange("parts", "high"), [1, 2]);
    assert.equal(rewardBonus("standard"), 0.03);
    assert.equal(rewardBonus("stuff"), 0.06);
    assert.equal(rewardBonus("fuel"), undefined);
  });
});
