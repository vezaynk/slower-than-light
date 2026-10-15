import { tx } from "../../i18n/index.ts";

/**
 * Drone Control purchase-price bullets, one number each.
 * Template:Purchasable drones prints the same number, except the Fire Drone.
 * Drone Control prices that drone at 50. The template prices it at 60.
 * Two printed prices, so that schematic is not in this list.
 * Shield Overcharger + prints "Sells for: 30" and no purchase price, so it is not here.
 * Drone Control itself is the system bundle, not a schematic row.
 */
export const CITED_DRONES: readonly { ref: string; name: string; cost: number }[] = [
  { ref: "striker", name: tx("wiki.cited-stores.combat-drone-mark-i"), cost: 50 },
  { ref: "combat2", name: tx("wiki.cited-stores.combat-drone-mark-ii"), cost: 75 },
  { ref: "beam", name: tx("wiki.cited-stores.anti-ship-beam-drone-i"), cost: 50 },
  { ref: "beam2", name: tx("wiki.cited-stores.anti-ship-beam-drone-ii"), cost: 60 },
  { ref: "ward", name: tx("wiki.cited-stores.defense-drone-mark-i"), cost: 50 },
  { ref: "ward2", name: tx("wiki.cited-stores.defense-drone-mark-ii"), cost: 70 },
  { ref: "wardcut", name: tx("wiki.cited-stores.anti-combat-drone"), cost: 35 },
  { ref: "overcharger", name: tx("wiki.cited-stores.shield-overcharger"), cost: 60 },
  { ref: "antipersonnel", name: tx("wiki.cited-stores.anti-personnel-drone"), cost: 35 },
  { ref: "patch", name: tx("wiki.cited-stores.system-repair-drone"), cost: 30 },
  { ref: "hull", name: tx("wiki.cited-stores.hull-repair-drone"), cost: 85 },
  { ref: "board", name: tx("wiki.cited-stores.boarding-drone"), cost: 70 },
  { ref: "ionintruder", name: tx("wiki.cited-stores.ion-intruder-drone"), cost: 65 },
];
