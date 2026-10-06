/**
 * Wiki page "Drone Control", sections "Shield Overcharger" and "Shield Overcharger +".
 * The caller in swarm.ts adds one Zoltan Shield point when a printed wait finishes.
 * Waits are the printed table. No wait is printed for 5 or more existing layers.
 * "Speed: 5" is the same flight figure as Defense Drone Mark I and the Anti-Combat Drone.
 * INFERRED: that figure is not seconds. This drone never leaves its orbit and never fires,
 * so the number does not change the printed waits. Shield Overcharger + is "Totally identical"
 * apart from power, so it uses the same 5.
 * SwarmKind is not extended. Neither schematic is stocked.
 * Shield Overcharger + prints "Sells for: 30 (cannot be bought or found)."
 * A fitted copy quotes that 30. The schematic is not stocked.
 */

/** Drone Control, Shield Overcharger: "Speed: 5". Not a layer wait. */
export const OVERCHARGER_SPEED = 5;

export const OVERCHARGER = {
  // "Power requirement: 3 power"
  power: 3,
  // "Each additional layer has longer cool-down time: 8s/10s/13s/16s/20s for 0/1/2/3/4 existing layers."
  waits: [8, 10, 13, 16, 20],
} as const;

export const OVERCHARGER_PLUS = {
  // "Power requirement: 2 power". "This modified schematic requires 1 less power."
  power: 2,
  // "Sells for: 30 (cannot be bought or found)." Not a store row. A fitted drone quotes it.
  sell: 30,
} as const;
