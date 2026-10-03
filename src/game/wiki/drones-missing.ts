/**
 * Wiki page "Drone Control", section "Drone Schematics".
 * Schematic headings that are not the eight SwarmKind ids in swarm.ts.
 * Boarding Drone Mark II is not a heading on the page.
 */

export type DroneRow = {
  id: string;
  name: string;
  power: number | null;
  cooldown: string | null;
  note: string;
  source: string;
};

function cite(heading: string): string {
  return `Wiki page "Drone Control", section "${heading}"`;
}

/** Printed under Shield Overcharger. The + heading says that schematic is identical except power. */
const OVERCHARGER_COOLDOWN = "8s/10s/13s/16s/20s for 0/1/2/3/4 existing layers";

export const MISSING_DRONES: DroneRow[] = [
  {
    id: "ionintruder",
    name: "Ion Intruder Drone",
    power: 3,
    cooldown: "Pulse time varies between 8.2 and 10 seconds",
    note: "Periodically emits an ion blast that deals 3 ion damage to the system and stuns enemy crew for 6 seconds.",
    source: cite("Ion Intruder Drone"),
  },
  {
    id: "combat2",
    name: "Combat Drone Mark II",
    power: 4,
    cooldown: null,
    note: "Fires a laser blast that deals 1 hull/system damage per projectile, with a 10% chance to start fire in the hit room.",
    source: cite("Combat Drone Mark II"),
  },
  {
    id: "beam2",
    name: "Anti-Ship Beam Drone II",
    power: 3,
    cooldown: null,
    note: "A beam of length 40 (0.9 tile diagonally) and speed 8 deals 1 hull/system damage per room crossed and 2 damage to a Zoltan Shield, with a 10% chance to set a tile on fire.",
    source: cite("Anti-Ship Beam Drone II"),
  },
  {
    id: "firedrone",
    name: "Anti-Ship Fire Drone",
    power: 3,
    cooldown: null,
    note: "A fire beam of length 10 (0.2 tile diagonally) and speed 2 deals 1 damage to a Zoltan Shield and no hull damage unless the fire destroys a targeted system, with a 90% chance to set a tile on fire.",
    source: cite("Anti-Ship Fire Drone"),
  },
  {
    id: "antipersonnel",
    name: "Anti-Personnel Drone",
    power: 2,
    cooldown: null,
    note: "Attacks intruders, dealing the same damage as an untrained Human.",
    source: cite("Anti-Personnel Drone"),
  },
  {
    id: "overcharger",
    name: "Shield Overcharger",
    power: 3,
    cooldown: OVERCHARGER_COOLDOWN,
    note: "Periodically adds 1 point of Zoltan Shield to regular shields.",
    source: cite("Shield Overcharger"),
  },
  {
    id: "overchargerplus",
    name: "Shield Overcharger +",
    power: 2,
    cooldown: OVERCHARGER_COOLDOWN,
    note: "Totally identical to a regular Shield Overcharger Drone, except for the lower power requirement.",
    source: cite("Shield Overcharger +"),
  },
];
