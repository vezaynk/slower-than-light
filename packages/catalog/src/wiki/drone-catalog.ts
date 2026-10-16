/**
 * Drone Control purchase-price bullets, one number each.
 * Template:Purchasable drones prints the same number, except the Fire Drone.
 * Drone Control prices that drone at 50. The template prices it at 60.
 * Two printed prices, so that schematic is not in this list.
 * Shield Overcharger + prints "Sells for: 30" and no purchase price, so it is not here.
 * Drone Control itself is the system bundle, not a schematic row.
 */
export const CITED_DRONES: readonly { ref: string; name: string; cost: number }[] = [
  { ref: "COMBAT_1", name: "Combat Drone Mark I", cost: 50 },
  { ref: "COMBAT_2", name: "Combat Drone Mark II", cost: 75 },
  { ref: "COMBAT_BEAM", name: "Anti-Ship Beam Drone I", cost: 50 },
  { ref: "COMBAT_BEAM_2", name: "Anti-Ship Beam Drone II", cost: 60 },
  { ref: "DEFENSE_1", name: "Defense Drone Mark I", cost: 50 },
  { ref: "DEFENSE_2", name: "Defense Drone Mark II", cost: 70 },
  { ref: "ANTI_DRONE", name: "Anti-Combat Drone", cost: 35 },
  { ref: "DRONE_SHIELD", name: "Shield Overcharger", cost: 60 },
  { ref: "BATTLE", name: "Anti-Personnel Drone", cost: 35 },
  { ref: "REPAIR", name: "System Repair Drone", cost: 30 },
  { ref: "SHIP_REPAIR", name: "Hull Repair Drone", cost: 85 },
  { ref: "BOARDER", name: "Boarding Drone", cost: 70 },
  { ref: "BOARDER_ION", name: "Ion Intruder Drone", cost: 65 },
];
