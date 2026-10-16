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
  { slot: "sys", ref: "shields", name: "Shields", cost: 125 },
  { slot: "sys", ref: "medbay", name: "Medbay", cost: 50 },
  { slot: "kit", ref: "cradle", name: "Clone Bay", cost: 50 },
  { slot: "kit", ref: "sling", name: "Crew Teleporter", cost: 90 },
  { slot: "kit", ref: "veil", name: "Cloaking", cost: 150 },
  { slot: "kit", ref: "leash", name: "Mind Control", cost: 75 },
  { slot: "kit", ref: "spike", name: "Hacking", cost: 80 },
  { slot: "sys", ref: "sensors", name: "Sensors", cost: 40 },
  { slot: "sys", ref: "doors", name: "Door System", cost: 60 },
  { slot: "kit", ref: "cell", name: "Backup Battery", cost: 35 },
];
