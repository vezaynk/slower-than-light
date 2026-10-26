/**
 * Template:Purchasable systems (WIKI-SPEC section 7):
 * Shields 125, Medbay 50, Clone Bay 50, Crew Teleporter 90, Cloaking 150,
 * Mind Control 75, Hacking 80, Sensors 40, Door System 60, Backup Battery 35.
 * Drone Control is a bundle, not a row of this list: 75 with a System Repair Drone,
 * 85 with a Defense Drone Mark I or a Combat Drone Mark I. The naked 60 is not a shelf price.
 * Artillery Beam and Flak Artillery have kit ids and no purchase price on that list.
 * `slot` says whether the install lands on a system or a kit. Power stays in the effect code.
 * Starting level and upgrade scrap live on the tune record.
 */
export const CITED_SYSTEMS: readonly {
  ref: string;
  name: string;
  cost: number;
  slot: "sys" | "kit";
}[] = [
  // Wiki citations:
  // > "Additional systems and subsystems can only be purchased at a store." — [[Systems]]
  // > "Stealth Cruisers start without Shields system, and can buy one at a store for 125 scrap. This gives them Shields-2." — [[Shields#System Upgrades]]
  { slot: "sys", ref: "shields", name: "Shields", cost: 125 },
  // Wiki citations:
  // > "1 50 Ftlgame-scrap.png 6.4 HP/sec The healing rate is equal to the suffocation rate" — [[Medbay#System Upgrades]]
  { slot: "sys", ref: "medbay", name: "Medbay", cost: 50 },
  // Wiki citations:
  // > "1 50** Ftlgame-scrap.png 12 sec" — [[Clone Bay#System Upgrades]]
  // > "Purchasing or switching cost. (Medbay system upgrades are transferred to Clone Bay, and vice versa, automatically)" — [[Clone Bay#System Upgrades]]
  { slot: "kit", ref: "clonebay", name: "Clone Bay", cost: 50 },
  // Wiki citations:
  // > "1 90 Ftlgame-scrap.png 20 sec" — [[Crew Teleporter#System Upgrades]]
  { slot: "kit", ref: "teleporter", name: "Crew Teleporter", cost: 90 },
  // Wiki citations:
  // > "1 150 Ftlgame-scrap.png 5 sec" — [[Cloaking#System Upgrades]]
  { slot: "kit", ref: "cloaking", name: "Cloaking", cost: 150 },
  // Wiki citations:
  // > "1 75 Ftlgame-scrap.png Mind control 1 enemy crew" — [[Mind Control#System Upgrades]]
  { slot: "kit", ref: "mind", name: "Mind Control", cost: 75 },
  // Wiki citations:
  // > "1 80 Ftlgame-scrap.png 4 sec" — [[Hacking#System upgrades]]
  { slot: "kit", ref: "hacking", name: "Hacking", cost: 80 },
  // Wiki citations:
  // > "1 40 Ftlgame-scrap.png See interior of all rooms on your ship" — [[Sensors#System Upgrades]]
  { slot: "sys", ref: "sensors", name: "Sensors", cost: 40 },
  // Wiki citations:
  // > "1 60* Ftlgame-scrap.png Normal Doors Remote opening/closing of doors" — [[Door System#System Upgrades]]
  // > "Only the Rock Cruiser layout B (Shivan) does not have the Door System pre-installed." — [[Door System#System Upgrades]]
  { slot: "sys", ref: "doors", name: "Door System", cost: 60 },
  // Wiki citations:
  // > "1 35 Ftlgame-scrap.png 2 temporary power bars" — [[Backup Battery#System Upgrades]]
  { slot: "kit", ref: "battery", name: "Backup Battery", cost: 35 },
];
