import type { TuneDef } from "@stl/pack";

/**
 * Scrap to raise a system, keyed by the level already owned, and the level a purchase installs.
 * Weapon Control, Engines, Shields, Medbay, and Piloting "System Upgrades" tables.
 * Reactor bars stay a formula in upgradeCost. Kit charge times stay in the effect files.
 * `max` is `<maxPower>`. An owned level at or above it has no next purchase.
 * Power assignment stays in upgrade().
 */
export const SYSTEM_TUNES: readonly TuneDef[] = [
  // Shields: 100 is Shields-1 to Shields-2 (Zoltan B). 125 is the store price of a missing Shields system, not this row.
  // start 2: The Stealth Cruiser installs shields with two bars, one shield layer once they are powered.
  // Wiki citations:
  // > "Zoltan Cruiser Noether (Layout B) starts with Shields system at level 1 (or, simply, Shields-1), which can be upgraded to Shields-2 for 100 scrap without a need to visit a store." — [[Shields#System Upgrades]]
  // > "2 100*/125** Ftlgame-scrap.png 1 layer" — [[Shields#System Upgrades]]
  // > "Stealth Cruisers start without Shields system, and can buy one at a store for 125 scrap. This gives them Shields-2." — [[Shields#System Upgrades]]
  // > "3 20 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
  // > "4 30 Ftlgame-scrap.png 2 layers" — [[Shields#System Upgrades]]
  // > "5 40 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
  // > "6 60 Ftlgame-scrap.png 3 layers" — [[Shields#System Upgrades]]
  // > "7 80 Ftlgame-scrap.png" — [[Shields#System Upgrades]]
  // > "8 100 Ftlgame-scrap.png 4 layers" — [[Shields#System Upgrades]]
  {
    id: "shields",
    max: 8,
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
  // Wiki citations:
  // > "Level Cost Evasion 1 - 5% 2 10 Ftlgame-scrap.png 10% 3 15 Ftlgame-scrap.png 15% 4 30 Ftlgame-scrap.png 20% 5 40 Ftlgame-scrap.png 25% 6 60 Ftlgame-scrap.png 28% 7 80 Ftlgame-scrap.png 31% 8 120 Ftlgame-scrap.png 35%" — [[Engines#System Upgrades]]
  {
    id: "engines",
    max: 8,
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
  // Wiki citations:
  // > "2 25 Ftlgame-scrap.png 4.8%/sec" — [[Oxygen#System Upgrades]]
  // > "3 50 Ftlgame-scrap.png 8.4%/sec" — [[Oxygen#System Upgrades]]
  {
    id: "oxygen",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 25 },
      { level: 2, cost: 50 },
    ],
  },
  // Medbay, "System Upgrades": level 2 costs 35, level 3 costs 45. The 50 on level 1 is the store purchase.
  // Wiki citations:
  // > "2 35 Ftlgame-scrap.png 9.6 HP/sec Crew can heal in an airless Medbay" — [[Medbay#System Upgrades]]
  // > "3 45 Ftlgame-scrap.png 19.2 HP/sec" — [[Medbay#System Upgrades]]
  {
    id: "medbay",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 35 },
      { level: 2, cost: 45 },
    ],
  },
  // Weapon Control, "System Upgrades": level 2 is 40, then 25, 35, 50, 75, 90, 100 through level 8.
  // Wiki citations:
  // > "Level Cost Power 1 - 1 2 40 Ftlgame-scrap.png 2 3 25 Ftlgame-scrap.png 3 4 35 Ftlgame-scrap.png 4 5 50 Ftlgame-scrap.png 5 6 75 Ftlgame-scrap.png 6 7 90 Ftlgame-scrap.png 7 8 100 Ftlgame-scrap.png 8" — [[Weapon Control#System Upgrades]]
  {
    id: "weapons",
    max: 8,
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
  // Wiki citations:
  // > "Level Cost Evasion % of the total available Engines evasion with crew without crew 1 - 100% 0% 2 20 Ftlgame-scrap.png 100% 50% 3 50 Ftlgame-scrap.png 100% 80%" — [[Piloting#System Upgrades]]
  {
    id: "pilot",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 20 },
      { level: 2, cost: 50 },
    ],
  },
  // These five listings sit before Sensors in the system catalog, so the blueprint
  // file writes them here, in that catalog order. Install scrap stays on the store listing.
  // Clone Bay: level 2 costs 35, level 3 costs 45. The 50 is the store price.
  {
    id: "clonebay",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 35 },
      { level: 2, cost: 45 },
    ],
  },
  // Crew Teleporter: level 2 costs 30, level 3 costs 60. The 90 is the store price.
  {
    id: "teleporter",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 30 },
      { level: 2, cost: 60 },
    ],
  },
  // Cloaking: level 2 costs 30, level 3 costs 50. The 150 is the store price, not a row here.
  {
    id: "cloaking",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 30 },
      { level: 2, cost: 50 },
    ],
  },
  // Mind Control: level 2 costs 30, level 3 costs 60. The 75 is the store price.
  {
    id: "mind",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 30 },
      { level: 2, cost: 60 },
    ],
  },
  // Hacking: level 2 costs 35, level 3 costs 60. The 80 is the store price.
  {
    id: "hacking",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 35 },
      { level: 2, cost: 60 },
    ],
  },
  // Sensors, "System Upgrades": level 2 costs 25, level 3 costs 40.
  // The 40 on level 1 is the store purchase. Level 4 is manned only, so it has no scrap row.
  // Wiki citations:
  // > "2 25 Ftlgame-scrap.png See interior of all rooms on your and enemy ship" — [[Sensors#System Upgrades]]
  // > "3 40 Ftlgame-scrap.png See interior of all rooms on your and enemy ship, see enemy weapons charge" — [[Sensors#System Upgrades]]
  // > "4 N/A* (Additionally) See enemy systems level, power usage, ion damage, cooldown, repair and sabotage progress" — [[Sensors#System Upgrades]]
  // > "Only available when Level 3 Sensors subsystem is manned." — [[Sensors#System Upgrades]]
  {
    id: "sensors",
    max: 3,
    start: 1,
    costs: [
      { level: 1, cost: 25 },
      { level: 2, cost: 40 },
    ],
  },
  // Door System, "System Upgrades": level 2 costs 35, level 3 costs 50.
  // The 60 is the store purchase. A missing system stays at level 0, and upgrade() will not spend that 60.
  // Wiki citations:
  // > "1 60* Ftlgame-scrap.png Normal Doors Remote opening/closing of doors" — [[Door System#System Upgrades]]
  // > "2 35 Ftlgame-scrap.png Blast Doors Significantly slows down fires spread between rooms, impedes boarders movement" — [[Door System#System Upgrades]]
  // > "3 50 Ftlgame-scrap.png Improved Blast Doors Significantly slows down fires spread between rooms, impedes boarders movement more" — [[Door System#System Upgrades]]
  {
    id: "doors",
    max: 3,
    start: 1,
    costs: [
      { level: 0, cost: 60 },
      { level: 1, cost: 35 },
      { level: 2, cost: 50 },
    ],
  },
  // Backup Battery: one step, 50 scrap, from level 1 to level 2. The 35 is the store price.
  {
    id: "battery",
    max: 2,
    start: 1,
    costs: [{ level: 1, cost: 50 }],
  },
  // Artillery Beam and Flak Artillery share this id. Level 1 is not sold. Then 30, 50, 80. Cap 4.
  // Charge seconds stay in the effect files.
  {
    id: "artillery",
    max: 4,
    start: 1,
    costs: [
      { level: 1, cost: 30 },
      { level: 2, cost: 50 },
      { level: 3, cost: 80 },
    ],
  },
];
