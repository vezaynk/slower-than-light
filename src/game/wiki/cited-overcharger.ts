/**
 * Wiki page "Drone Control", sections "Shield Overcharger" and "Shield Overcharger +".
 * The caller in swarm.ts adds one Zoltan Shield point when a printed wait finishes.
 * Waits are the printed table. No wait is printed for 5 or more existing layers.
 * "Speed: 5" is movement, not a cooldown, and the caller does not move the drone.
 * SwarmKind is not extended. Neither schematic is stocked.
 * Shield Overcharger + prints "Sells for: 30 (cannot be bought or found)."
 * Game has no schematic sell quote, so that 30 is not offered.
 */

export const OVERCHARGER = {
  // "Power requirement: 3 power"
  power: 3,
  // "Each additional layer has longer cool-down time: 8s/10s/13s/16s/20s for 0/1/2/3/4 existing layers."
  waits: [8, 10, 13, 16, 20],
} as const;

export const OVERCHARGER_PLUS = {
  // "Power requirement: 2 power". "This modified schematic requires 1 less power."
  power: 2,
  // "Sells for: 30 (cannot be bought or found)." Not a store row and not a sell quote.
  sell: 30,
} as const;
