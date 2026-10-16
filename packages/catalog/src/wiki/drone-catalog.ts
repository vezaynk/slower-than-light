/**
 * Drone Control purchase-price bullets, one number each.
 * Template:Purchasable drones prints the same number, except the Fire Drone.
 * Drone Control prices that drone at 50. The template prices it at 60.
 * Two printed prices, so that schematic is not in this list.
 * Shield Overcharger + prints "Sells for: 30" and no purchase price, so it is not here.
 * Drone Control itself is the system bundle, not a schematic row.
 */
export const CITED_DRONES: readonly { ref: string; name: string; cost: number }[] = [
  { ref: "striker", name: "Combat Drone Mark I", cost: 50 },
  { ref: "combat2", name: "Combat Drone Mark II", cost: 75 },
  { ref: "beam", name: "Anti-Ship Beam Drone I", cost: 50 },
  { ref: "beam2", name: "Anti-Ship Beam Drone II", cost: 60 },
  { ref: "ward", name: "Defense Drone Mark I", cost: 50 },
  { ref: "ward2", name: "Defense Drone Mark II", cost: 70 },
  { ref: "wardcut", name: "Anti-Combat Drone", cost: 35 },
  { ref: "overcharger", name: "Shield Overcharger", cost: 60 },
  { ref: "antipersonnel", name: "Anti-Personnel Drone", cost: 35 },
  { ref: "patch", name: "System Repair Drone", cost: 30 },
  { ref: "hull", name: "Hull Repair Drone", cost: 85 },
  { ref: "board", name: "Boarding Drone", cost: 70 },
  { ref: "ionintruder", name: "Ion Intruder Drone", cost: 65 },
];
