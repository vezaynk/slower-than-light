import type { TuneDef } from "../pack/types.ts";

/**
 * Scrap to raise a system, keyed by the level already owned, and the level a purchase installs.
 * Weapon Control, Engines, Shields, Medbay, and Piloting "System Upgrades" tables.
 * Reactor bars stay a formula in upgradeCost. Kit upgrade tables stay in the effect files.
 * Power assignment stays in upgrade().
 */
export const SYSTEM_TUNES: readonly TuneDef[] = [
  // Shields: 100 is Shields-1 to Shields-2 (Zoltan B). 125 is the store price of a missing Shields system, not this row.
  // start 2: The Stealth Cruiser installs shields with two bars, one shield layer once they are powered.
  {
    id: "shields",
    start: 2,
    costs: [
      { level: 1, cost: 100 },
      { level: 2, cost: 20 },
      { level: 3, cost: 30 },
      { level: 4, cost: 40 },
      { level: 5, cost: 60 },
      { level: 6, cost: 80 },
      { level: 7, cost: 100 },
    ],
  },
  // Engines: costs to reach levels 2–8 are 10, 15, 30, 40, 60, 80, 120.
  {
    id: "engines",
    start: 1,
    costs: [
      { level: 1, cost: 10 },
      { level: 2, cost: 15 },
      { level: 3, cost: 30 },
      { level: 4, cost: 40 },
      { level: 5, cost: 60 },
      { level: 6, cost: 80 },
      { level: 7, cost: 120 },
    ],
  },
  // Oxygen, "System Upgrades": level 2 costs 25, level 3 costs 50.
  {
    id: "oxygen",
    start: 1,
    costs: [
      { level: 1, cost: 25 },
      { level: 2, cost: 50 },
    ],
  },
  // Medbay, "System Upgrades": level 2 costs 35, level 3 costs 45. The 50 on level 1 is the store purchase.
  {
    id: "medbay",
    start: 1,
    costs: [
      { level: 1, cost: 35 },
      { level: 2, cost: 45 },
    ],
  },
  // Weapon Control, "System Upgrades": level 2 is 40, then 25, 35, 50, 75, 90, 100 through level 8.
  {
    id: "weapons",
    start: 1,
    costs: [
      { level: 1, cost: 40 },
      { level: 2, cost: 25 },
      { level: 3, cost: 35 },
      { level: 4, cost: 50 },
      { level: 5, cost: 75 },
      { level: 6, cost: 90 },
      { level: 7, cost: 100 },
    ],
  },
  // Piloting, "System Upgrades": level 2 costs 20, level 3 costs 50.
  {
    id: "pilot",
    start: 1,
    costs: [
      { level: 1, cost: 20 },
      { level: 2, cost: 50 },
    ],
  },
  // Sensors, "System Upgrades": level 2 costs 25, level 3 costs 40.
  // The 40 on level 1 is the store purchase. Level 4 is manned only, so it has no scrap row.
  {
    id: "sensors",
    start: 1,
    costs: [
      { level: 1, cost: 25 },
      { level: 2, cost: 40 },
    ],
  },
  // Door System, "System Upgrades": level 2 costs 35, level 3 costs 50.
  // The 60 is the store purchase. A missing system stays at level 0, and upgrade() will not spend that 60.
  {
    id: "doors",
    start: 1,
    costs: [
      { level: 0, cost: 60 },
      { level: 1, cost: 35 },
      { level: 2, cost: 50 },
    ],
  },
];
