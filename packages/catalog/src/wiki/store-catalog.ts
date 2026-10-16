import { KIN, type KinId } from "../extras/kin.ts";
import type { StoreDef } from "@stl/pack";

/**
 * The campaign store. Section count, the systems coin-flip, drone stand-ins, crystal
 * shelves, sell prices, and the hull-repair rate stay in the store code.
 * `slot` is how many items a rolled section holds. `weapons` is that shelf's length.
 * A repair line's cost is stored; the sector rate still prices the row.
 */
const CREW: readonly { id: KinId; cost: number }[] = [
  { id: "human", cost: 45 },
  { id: "engi", cost: 50 },
  { id: "mantis", cost: 55 },
  { id: "rock", cost: 55 },
  { id: "energy", cost: 60 },
  { id: "slug", cost: 45 },
  { id: "crystal", cost: 60 },
  { id: "anaerobic", cost: 50 },
];

export const STORES: StoreDef[] = [
  {
    id: "standard",
    name: "Store",
    slot: 3,
    weapons: 2,
    sections: ["weapons", "drones", "augments", "crew", "systems"],
    lines: [
      { id: "fuel", kind: "fuel", name: "Fuel", cost: 3, min: 3, max: 7 },
      { id: "missiles", kind: "missiles", name: "Missiles", cost: 6, min: 2, max: 6 },
      { id: "parts", kind: "parts", name: "Drone parts", cost: 8, min: 2, max: 4 },
      { id: "repair", kind: "repair", name: "Hull patch +5", cost: 0, min: 5, max: 5 },
      ...CREW.map((row) => ({
        id: row.id,
        kind: "crew",
        name: KIN[row.id].name,
        cost: row.cost,
        min: 1,
        max: 1,
      })),
    ],
  },
];
