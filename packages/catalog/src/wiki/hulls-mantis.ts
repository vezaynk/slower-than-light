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
    id: "PLAYER_SHIP_MANTIS",
    cruiser: "Mantis Cruiser",
    layout: "A",
    name: "The Gila Monster",
    quote: "This warship is designed to enhance its crew for close combat missions.",
    unlock: "See Legendary Thief KazaaakplethKilik random event.\nAlternatively, defeat The Rebel Flagship with the Zoltan Cruiser.",
    weaponSlots: 3,
    droneSlots: 2,
    health: 30,
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
    weapons: ["BOMB_1", "LASER_BURST_1"],
    // Seating is INFERRED. Wiki page "The Mantis Cruiser", section "Layout A": Starting Crew: 3 Mantis, 1 Engi. No chairs are assigned.
    crew: [
      { kin: "mantis", room: "p-pilot" },
      { kin: "mantis", room: "p-engines" },
      { kin: "mantis", room: "p-weapons" },
      { kin: "engi", room: "p-shields" },
    ],
    // Wiki page "The Mantis Cruiser", section "Layout A": Teleporter (1). Medbay power is the bar left empty. INFERRED.
    kits: { teleporter: { level: 1, power: 1 } },
    augments: ["CREW_STIMS"],
    unfitted: [],
  },
  {
    id: "PLAYER_SHIP_MANTIS_2",
    cruiser: "Mantis Cruiser",
    layout: "B",
    name: "The Basilisk",
    quote: "This warship encourages sending massive boarding parties and keeping strong defense.",
    unlock: "Earning two of the three Mantis Cruiser achievements will unlock Layout B.",
    weaponSlots: 3,
    droneSlots: 2,
    health: 30,
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
      { kin: "mantis", room: "p-pilot" },
      { kin: "mantis", room: "p-engines" },
    ],
    kits: {
      // Wiki page "The Mantis Cruiser", section "Layout B": Drones (3); Starting Drones: Boarding Drone, Defense Drone I.
      // Both schematics are fitted (loadout). Boarding Drone is the one deployed first and takes the 3 power. INFERRED:
      // the player kit flies one drone at a time (extras/swarm.ts deploy), so Defense Drone I is a switch, not a second flyer.
      drones: { level: 3, power: 3, target: "BOARDER", loadout: ["BOARDER", "DEFENSE_1"] },
      // Wiki page "The Mantis Cruiser", section "Layout B": Teleporter (1).
      // The empty weapon bar is left off so this pad can take one bar. INFERRED.
      teleporter: { level: 1, power: 1 },
    },
    augments: ["CREW_STIMS"],
    unfitted: [],
  },
  {
    id: "PLAYER_SHIP_MANTIS_3",
    cruiser: "Mantis Cruiser",
    layout: "C",
    name: "The Theseus",
    quote:
      "With a large teleporter and weapons designed to impede enemy crew, this ship is deadly in the hands of a capable boarding party.",
    unlock: "Reaching Sector 8 with the Mantis Cruiser B and Advanced Edition Content enabled will unlock layout C.",
    weaponSlots: 3,
    droneSlots: 2,
    health: 30,
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
    weapons: ["BOMB_LOCK", "BOMB_STUN"],
    // Seating is INFERRED. Wiki page "The Mantis Cruiser", section "Layout C": Starting Crew: 1 Engi, 1 Mantis, 1 Lanius. No chairs are assigned.
    crew: [
      { kin: "engi", room: "p-pilot" },
      { kin: "mantis", room: "p-engines" },
      { kin: "anaerobic", room: "p-weapons" },
    ],
    kits: {
      // Wiki page "The Mantis Cruiser", section "Layout C": Clone Bay (2).
      // One bar is left after shields, engines, oxygen, and weapons. It goes to the teleporter. Clone bay stays at 0. INFERRED.
      clonebay: { level: 2, power: 0 },
      // Wiki page "The Mantis Cruiser", section "Layout C": Teleporter (1). The layout quote is the boarding party.
      teleporter: { level: 1, power: 1 },
    },
    augments: ["CREW_STIMS"],
    unfitted: [],
  },
];
