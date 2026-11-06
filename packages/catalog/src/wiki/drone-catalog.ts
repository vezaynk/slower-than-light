/**
 * Drone Control purchase-price bullets, one number each.
 * Template:Purchasable drones prints the same number, except the Fire Drone.
 * Drone Control prices that drone at 50. The template prices it at 60.
 * Two printed prices, so that schematic is not in this list.
 * Shield Overcharger + prints "Sells for: 30" and no purchase price, so it is not here.
 * Drone Control itself is the system bundle, not a schematic row.
 * Power, speed, and cooldown are the figures the sim already flew. Cooldown is milliseconds.
 * Enemy-only schematics (Fire Drone, boss boarder, hacking drone) stay out of this shelf.
 */
export const CITED_DRONES: readonly {
  ref: string;
  name: string;
  cost: number;
  type: string;
  power: number;
  /** Milliseconds. Omitted when the schematic prints no cooldown. */
  cooldown?: number;
  speed?: number;
}[] = [
  // Combat Drone Mark I: power 2, speed 15.
  { ref: "COMBAT_1", name: "Combat Drone Mark I", cost: 50, type: "COMBAT", power: 2, speed: 15 },
  // Combat Drone Mark II: power 4, speed 28.
  { ref: "COMBAT_2", name: "Combat Drone Mark II", cost: 75, type: "COMBAT", power: 4, speed: 28 },
  // Anti-Ship Beam Drone I: power 2, speed 15.
  {
    ref: "COMBAT_BEAM",
    name: "Anti-Ship Beam Drone I",
    cost: 50,
    type: "COMBAT",
    power: 2,
    speed: 15,
  },
  // Anti-Ship Beam Drone II: power 3, speed 11.
  {
    ref: "COMBAT_BEAM_2",
    name: "Anti-Ship Beam Drone II",
    cost: 60,
    type: "COMBAT",
    power: 3,
    speed: 11,
  },
  // Defense Drone Mark I: power 2, cooldown 1000 ms.
  {
    ref: "DEFENSE_1",
    name: "Defense Drone Mark I",
    cost: 50,
    type: "DEFENSE",
    power: 2,
    cooldown: 1000,
  },
  // Defense Drone Mark II: power 3, cooldown 880 ms.
  {
    ref: "DEFENSE_2",
    name: "Defense Drone Mark II",
    cost: 70,
    type: "DEFENSE",
    power: 3,
    cooldown: 880,
  },
  // Anti-Combat Drone: power 1, cooldown 7000 ms.
  {
    ref: "ANTI_DRONE",
    name: "Anti-Combat Drone",
    cost: 35,
    type: "DEFENSE",
    power: 1,
    cooldown: 7000,
  },
  // Shield Overcharger: power 3. The layer table stays in the sim.
  { ref: "DRONE_SHIELD", name: "Shield Overcharger", cost: 60, type: "SHIELD", power: 3 },
  // Anti-Personnel Drone. The archive id is BATTLE. Power 2.
  { ref: "BATTLE", name: "Anti-Personnel Drone", cost: 35, type: "BATTLE", power: 2 },
  // System Repair Drone: power 1.
  { ref: "REPAIR", name: "System Repair Drone", cost: 30, type: "REPAIR", power: 1 },
  // Hull Repair Drone: power 2.
  { ref: "SHIP_REPAIR", name: "Hull Repair Drone", cost: 85, type: "SHIP_REPAIR", power: 2 },
  // Boarding Drone: power 3, speed 18. The attack interval stays one second in the sim.
  { ref: "BOARDER", name: "Boarding Drone", cost: 70, type: "BOARDER", power: 3, speed: 18 },
  // Ion Intruder Drone: power 3, speed 18. The pulse window stays in the sim.
  {
    ref: "BOARDER_ION",
    name: "Ion Intruder Drone",
    cost: 65,
    type: "BOARDER",
    power: 3,
    speed: 18,
  },
];

/**
 * The guns offensive drone blueprints name with `<weaponBlueprint>`, as ftl.dat's DRONE_LASER and DRONE_BEAM do.
 * apps/game/src/game/extras/swarm.ts droneGun reads damage, ion, fire, and breach from these rows.
 * Drone Control, Combat Drones (offensive drones): "Drones deal 1 hull/system damage per projectile" and
 * "1 hull/system damage ... per room crossed by the beam". Combat Drone Mark I: "Laser blast has 10% chance to start
 * fire in the hit room". Anti-Ship Beam Drone I: "10% chance to set a tile on fire". Anti-Ship Beam Drone II prints
 * the same figures. No breach or ion is printed, so both are 0.
 * The guns are never sold or fitted: no power, charge, or price. Names and blurbs are INVENTED.
 * Defense drones shoot projectiles down and carry no hit figures, so they name no gun.
 */
export const DRONE_GUNS: readonly {
  id: string;
  name: string;
  kind: "laser" | "beam";
  damage: number;
  fire: number;
  blurb: string;
}[] = [
  {
    id: "DRONE_LASER",
    name: "Drone Laser",
    kind: "laser",
    damage: 1,
    fire: 0.1,
    blurb: "A combat drone's bolt.",
  },
  {
    id: "DRONE_BEAM",
    name: "Drone Beam",
    kind: "beam",
    damage: 1,
    fire: 0.1,
    blurb: "A beam drone's swipe.",
  },
  {
    id: "DRONE_BEAM2",
    name: "Drone Beam II",
    kind: "beam",
    damage: 1,
    fire: 0.1,
    blurb: "A longer beam drone swipe.",
  },
];

/** The gun each offensive drone fires. Combat Drone Mark II shares Mark I's laser, as its page prints the same bolt. */
export const DRONE_GUN_OF: Readonly<Record<string, string>> = {
  COMBAT_1: "DRONE_LASER",
  COMBAT_2: "DRONE_LASER",
  COMBAT_BEAM: "DRONE_BEAM",
  COMBAT_BEAM_2: "DRONE_BEAM2",
};
