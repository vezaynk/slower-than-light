import { tx } from "../../i18n/index.ts";

/**
 * Template:Purchasable systems (WIKI-SPEC section 7):
 * Shields 125, Medbay 50, Clone Bay 50, Crew Teleporter 90, Cloaking 150,
 * Mind Control 75, Hacking 80, Sensors 40, Door System 60, Backup Battery 35.
 * Drone Control is a bundle, not a row of this list: 75 with a System Repair Drone,
 * 85 with a Defense Drone Mark I or a Combat Drone Mark I. The naked 60 is not a shelf price.
 * Artillery Beam and Flak Artillery have kit ids and no purchase price on that list.
 * `slot` says whether the install lands on a system or a kit. Power and starting level stay in the effect code.
 */
export const CITED_SYSTEMS: readonly { ref: string; name: string; cost: number; slot: "sys" | "kit" }[] = [
  { slot: "sys", ref: "shields", name: tx("wiki.cited-stores.shields"), cost: 125 },
  { slot: "sys", ref: "medbay", name: tx("wiki.cited-stores.medbay"), cost: 50 },
  { slot: "kit", ref: "cradle", name: tx("wiki.cited-stores.clone-bay"), cost: 50 },
  { slot: "kit", ref: "sling", name: tx("wiki.cited-stores.crew-teleporter"), cost: 90 },
  { slot: "kit", ref: "veil", name: tx("wiki.cited-stores.cloaking"), cost: 150 },
  { slot: "kit", ref: "leash", name: tx("wiki.cited-stores.mind-control"), cost: 75 },
  { slot: "kit", ref: "spike", name: tx("wiki.cited-stores.hacking"), cost: 80 },
  { slot: "sys", ref: "sensors", name: tx("wiki.cited-stores.sensors"), cost: 40 },
  { slot: "sys", ref: "doors", name: tx("wiki.cited-stores.door-system"), cost: 60 },
  { slot: "kit", ref: "cell", name: tx("wiki.cited-stores.backup-battery"), cost: 35 },
];
