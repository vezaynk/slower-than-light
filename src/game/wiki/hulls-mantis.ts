import type { HullSpec } from "../hulls.ts";

/**
 * Wiki page "The Mantis Cruiser".
 * Power splits are INFERRED. The page lists system levels, not which bars start filled.
 * Boarding layouts power the teleporter before an empty weapon bar.
 * A bar that does not fit stays at 0.
 * Piloting, doors, and sensors do not draw reactor bars.
 * Seating is INFERRED. The page does not assign chairs.
 */

export const MANTIS_HULLS: HullSpec[] = [
  {
    id: "mantis-a",
    cruiser: "Mantis Cruiser",
    layout: "A",
    name: "The Gila Monster",
    quote: "This warship is designed to enhance its crew for close combat missions.",
    unlock:
      "See the Legendary Thief KazaaakplethKilik random event. Alternatively, defeat the Rebel Flagship with the Zoltan Cruiser.",
    source: "The Mantis Cruiser, Layout A",
    // Wiki page "The Mantis Cruiser", section "Layout A": Starting Reactor: 7.
    reactor: 7,
    // Wiki page "The Mantis Cruiser", section "Layout A": Starting Resources: 16 Fuel, 16 Missiles, 0 Drone parts.
    fuel: 16,
    missiles: 16,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      // Wiki page "The Mantis Cruiser", section "Layout A": Medbay (1). Power stays 0 so the teleporter can take the last bar. INFERRED.
      medbay: [1, 0],
      // Wiki page "The Mantis Cruiser", section "Layout A": Weapons (1) and two 1-power guns (Small Bomb, Basic Laser). System power stays 1.
      weapons: [1, 1],
      // Wiki page "The Mantis Cruiser", section "Layout A": Sensors is not listed.
      sensors: [0, 0],
      pilot: [1, 1],
      doors: [1, 1],
    },
    weapons: ["smallbomb", "spark"],
    // Seating is INFERRED. Wiki page "The Mantis Cruiser", section "Layout A": Starting Crew: 3 Mantis, 1 Engi. No chairs are assigned.
    crew: [
      { kin: "blade", room: "p-pilot" },
      { kin: "blade", room: "p-engines" },
      { kin: "blade", room: "p-weapons" },
      { kin: "shell", room: "p-shields" },
    ],
    // Wiki page "The Mantis Cruiser", section "Layout A": Teleporter (1). Medbay power is the bar left empty. INFERRED.
    kits: { sling: { level: 1, power: 1 } },
    augments: [],
    // Mantis Pheromones is not in the AugmentId union.
    unfitted: ["Mantis Pheromones"],
  },
  {
    id: "mantis-b",
    cruiser: "Mantis Cruiser",
    layout: "B",
    name: "The Basilisk",
    quote: "This warship encourages sending massive boarding parties and keeping strong defense.",
    unlock: "Earning two of the three Mantis Cruiser achievements will unlock Layout B.",
    source: "The Mantis Cruiser, Layout B",
    // Wiki page "The Mantis Cruiser", section "Layout B": Starting Reactor: 11.
    reactor: 11,
    // Wiki page "The Mantis Cruiser", section "Layout B": Starting Resources: 16 Fuel, 0 Missiles, 15 Drone parts.
    fuel: 16,
    missiles: 0,
    parts: 15,
    systems: {
      shields: [4, 4],
      engines: [1, 1],
      oxygen: [1, 1],
      medbay: [1, 1],
      // Wiki page "The Mantis Cruiser", section "Layout B": Weapons (1). The same section has no starting weapons.
      // Power stays 0. INFERRED: an empty weapon system does not need the bar, and the teleporter does.
      weapons: [1, 0],
      // Wiki page "The Mantis Cruiser", section "Layout B": Sensors (1). Sensors do not draw reactor bars.
      sensors: [1, 1],
      pilot: [1, 1],
      doors: [1, 1],
    },
    // Wiki page "The Mantis Cruiser", section "Layout B": this ship has no starting weapons.
    weapons: [],
    // Seating is INFERRED. Wiki page "The Mantis Cruiser", section "Layout B": Starting Crew: 2 Mantis. No chairs are assigned.
    crew: [
      { kin: "blade", room: "p-pilot" },
      { kin: "blade", room: "p-engines" },
    ],
    kits: {
      // Wiki page "The Mantis Cruiser", section "Layout B": Drones (3). Boarding Drone takes the one schematic slot and 3 power.
      swarm: { level: 3, power: 3, target: "board" },
      // Wiki page "The Mantis Cruiser", section "Layout B": Teleporter (1).
      // The empty weapon bar is left off so this pad can take one bar. INFERRED.
      sling: { level: 1, power: 1 },
    },
    augments: [],
    // Defense Drone I does not fit in the single schematic slot. Mantis Pheromones is not in the AugmentId union.
    unfitted: ["Defense Drone I", "Mantis Pheromones"],
  },
  {
    id: "mantis-c",
    cruiser: "Mantis Cruiser",
    layout: "C",
    name: "The Theseus",
    quote:
      "With a large teleporter and weapons designed to impede enemy crew, this ship is deadly in the hands of a capable boarding party.",
    unlock:
      "Reaching Sector 8 with the Mantis Cruiser B and Advanced Edition Content enabled will unlock layout C.",
    source: "The Mantis Cruiser, Layout C",
    // Wiki page "The Mantis Cruiser", section "Layout C": Starting Reactor: 8.
    reactor: 8,
    // Wiki page "The Mantis Cruiser", section "Layout C": Starting Resources: 16 Fuel, 20 Missiles, 0 Drone parts.
    fuel: 16,
    missiles: 20,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      // Wiki page "The Mantis Cruiser", section "Layout C": Clone Bay is listed instead of Medbay.
      medbay: [0, 0],
      // Wiki page "The Mantis Cruiser", section "Layout C": Weapons (2).
      weapons: [2, 2],
      // Wiki page "The Mantis Cruiser", section "Layout C": Sensors (1). Sensors do not draw reactor bars.
      sensors: [1, 1],
      pilot: [1, 1],
      doors: [1, 1],
    },
    weapons: ["lockdown", "stunbomb"],
    // Seating is INFERRED. Wiki page "The Mantis Cruiser", section "Layout C": Starting Crew: 1 Engi, 1 Mantis, 1 Lanius. No chairs are assigned.
    crew: [
      { kin: "shell", room: "p-pilot" },
      { kin: "blade", room: "p-engines" },
      { kin: "voidlung", room: "p-weapons" },
    ],
    kits: {
      // Wiki page "The Mantis Cruiser", section "Layout C": Clone Bay (2).
      // One bar is left after shields, engines, oxygen, and weapons. It goes to the teleporter. Clone bay stays at 0. INFERRED.
      cradle: { level: 2, power: 0 },
      // Wiki page "The Mantis Cruiser", section "Layout C": Teleporter (1). The layout quote is the boarding party.
      sling: { level: 1, power: 1 },
    },
    augments: [],
    // Mantis Pheromones is not in the AugmentId union.
    unfitted: ["Mantis Pheromones"],
  },
];
