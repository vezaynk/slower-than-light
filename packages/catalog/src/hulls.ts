import type { KinId } from "./extras/kin.ts";
import type { AugmentId, KitId, SysId } from "./ids.ts";
import { CRYSTAL_HULLS } from "./wiki/hulls-crystal.ts";
import { MANTIS_HULLS } from "./wiki/hulls-mantis.ts";

/**
 * Hangar rows whose cruiser pages returned text.
 * Cruiser layout blocks, plus Mantis and Crystal from src/game/wiki.
 * Tile positions are not on those pages (they are pictures). Every hull uses the
 * shared original room grid. INFERRED coordinates. The hangar shows each page's
 * exterior file. Those files are not traced for room coordinates.
 *
 * Power splits are INFERRED. The pages list system levels, not which bars start filled.
 * Bars are filled until the reactor is spent, weapons first when the guns need them.
 * Scrap is not on these pages. The caller keeps the existing 10.
 *
 * @agent:unlocks. `unlock` is the page's line for the hangar lock card. The rules that gate START live in
 * unlocks.ts (pure) and unlock-store.ts (localStorage "stl:unlocks").
 */

export type HullCrew = {
  kin: KinId;
  room: string;
};

export type HullKit = {
  level: number;
  power: number;
  /** Swarm schematic id, when the kit is drone control. */
  target?: string | null;
  /** Fitted schematics, in slot order. Two of the same id are two drones. */
  loadout?: string[];
  /** Defaults to on when power is above 0. */
  on?: boolean;
  /** Archive weapon blueprint when this kit is artillery. */
  weapon?: string;
};

export type HullSpec = {
  id: string;
  cruiser: string;
  layout: "A" | "B" | "C";
  name: string;
  quote: string;
  unlock: string;
  /** Wiki page the numbers were taken from. */
  source: string;
  reactor: number;
  fuel: number;
  missiles: number;
  parts: number;
  systems: Partial<Record<SysId, [number, number]>>;
  weapons: string[];
  crew: HullCrew[];
  kits: Partial<Record<KitId, HullKit>>;
  augments: AugmentId[];
  /** Named on the page, with no matching id or slot in this build. */
  unfitted: string[];
};

const sub = {
  pilot: [1, 1] as [number, number],
  doors: [1, 1] as [number, number],
};

export const HULLS: HullSpec[] = [
  /**
   * Wiki page "The Kestrel Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_HARD",
    cruiser: "Kestrel Cruiser",
    layout: "A",
    name: "The Kestrel",
    quote:
      "This class of ship was decommissioned from Federation service years ago. After a number of refits and updating, this classic ship is ready for battle.",
    unlock: "Available from the start. It is the only layout that does not need an unlock.",
    source: "The Kestrel Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 8,
    parts: 2,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 3],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_BURST_3", "MISSILES_2_PLAYER"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "human", room: "p-engines" },
      { kin: "human", room: "p-weapons" },
    ],
    kits: {},
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Kestrel Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_HARD_2",
    cruiser: "Kestrel Cruiser",
    layout: "B",
    name: "Red-Tail",
    quote: "This modified Kestrel class ship was created by a laser weapon aficionado.",
    unlock: "Earn at least two of the three Kestrel Cruiser achievements.",
    source: "The Kestrel Cruiser, Layout B",
    reactor: 8,
    fuel: 16,
    missiles: 5,
    parts: 0,
    // Four lasers need 4 weapon bars. Shields 2 and engines 2 use the rest. Oxygen starts off. INFERRED.
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 0],
      medbay: [1, 0],
      weapons: [4, 4],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_BURST_1", "LASER_BURST_1", "LASER_BURST_1", "LASER_BURST_1"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "human", room: "p-engines" },
      { kin: "mantis", room: "p-weapons" },
      { kin: "energy", room: "p-shields" },
    ],
    kits: {},
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Kestrel Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_HARD_3",
    cruiser: "Kestrel Cruiser",
    layout: "C",
    name: "The Swallow",
    quote:
      "This model was modified by pirates to utilize newly discovered technology. It can clone lost crewmembers and stun enemies.",
    unlock: "Reach the final sector with Kestrel layout B, Advanced Edition on.",
    source: "The Kestrel Cruiser, Layout C",
    reactor: 7,
    fuel: 16,
    missiles: 4,
    parts: 3,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [0, 0],
      weapons: [2, 2],
      sensors: [2, 2],
      ...sub,
    },
    weapons: ["LASER_BURST_2", "ION_STUN"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "human", room: "p-engines" },
      { kin: "anaerobic", room: "p-weapons" },
    ],
    // Clone Bay is installed. No reactor left for its bar. INFERRED: it starts unpowered.
    kits: { clonebay: { level: 1, power: 0 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_CIRCLE",
    cruiser: "Engi Cruiser",
    layout: "A",
    name: "The Torus",
    quote:
      "Although it may look like a pile of junk loosely held together, this well designed ship relies on drones and ion weaponry.",
    unlock: "Reach sector 5 with any Kestrel layout.",
    source: "The Engi Cruiser, Layout A",
    reactor: 10,
    fuel: 16,
    missiles: 0,
    parts: 15,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 3],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["ION_4"],
    crew: [
      { kin: "engi", room: "p-pilot" },
      { kin: "engi", room: "p-engines" },
      { kin: "human", room: "p-weapons" },
    ],
    // Drone Control (3). Combat Drone Mark I takes 2 of those bars.
    kits: { drones: { level: 3, power: 2, target: "COMBAT_1" } },
    augments: ["NANO_MEDBAY"],
    unfitted: [],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_CIRCLE_2",
    cruiser: "Engi Cruiser",
    layout: "B",
    name: "The Vortex",
    quote: "Heavily understaffed, this ship relies on drones to keep the ship running.",
    unlock: "Earn at least two of the three Engi Cruiser achievements.",
    source: "The Engi Cruiser, Layout B",
    reactor: 9,
    fuel: 16,
    missiles: 0,
    parts: 6,
    // The page lists no Sensors.
    systems: {
      shields: [2, 2],
      engines: [1, 1],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 3],
      sensors: [0, 0],
      ...sub,
    },
    weapons: ["ION_2", "LASER_HEAVY_1"],
    crew: [{ kin: "engi", room: "p-pilot" }],
    // The Engi Cruiser, Layout B: Augmentations lists Drone Reactor Booster.
    // Drones (3 slots): Anti-Personnel, and System Repair (x2). Both repair schematics are fitted.
    // Anti-Personnel stays a name. This build does not fly that third schematic.
    kits: { drones: { level: 3, power: 1, loadout: ["REPAIR", "REPAIR"] } },
    augments: ["DRONE_SPEED"],
    unfitted: ["Anti-Personnel Drone"],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_CIRCLE_3",
    cruiser: "Engi Cruiser",
    layout: "C",
    name: "Tetragon",
    quote:
      "The Engi were quick to adapt to the sudden surge of hacking technology — this ship is the result of their research.",
    unlock: "Reach the final sector with Engi layout B, Advanced Edition on.",
    source: "The Engi Cruiser, Layout C",
    reactor: 9,
    fuel: 16,
    missiles: 0,
    parts: 25,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [0, 0],
      weapons: [1, 1],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_BURST_2"],
    crew: [
      { kin: "anaerobic", room: "p-pilot" },
      { kin: "engi", room: "p-engines" },
      { kin: "engi", room: "p-weapons" },
    ],
    kits: {
      drones: { level: 2, power: 2, target: "COMBAT_BEAM" },
      hacking: { level: 1, power: 1 },
      clonebay: { level: 1, power: 0 },
    },
    // The Engi Cruiser, Layout C: Augmentations lists Defense Scrambler.
    augments: ["DEFENSE_SCRAMBLER"],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_FED",
    cruiser: "Federation Cruiser",
    layout: "A",
    name: "The Osprey",
    quote:
      "This ship features the latest in federation technology: an advanced beam weapon that pierces through shields!",
    unlock:
      "Defeat the Flagship prototype in the Rebel Stronghold sector, or defeat the Rebel Flagship with the Engi Cruiser.",
    source: "The Federation Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 5,
    parts: 2,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [2, 2],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_BURST_3"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "mantis", room: "p-engines" },
      { kin: "rock", room: "p-weapons" },
      { kin: "engi", room: "p-shields" },
    ],
    kits: { artillery: { weapon: "ARTILLERY_FED",  level: 1, power: 1 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_FED_2",
    cruiser: "Federation Cruiser",
    layout: "B",
    name: "Nisos",
    quote: "This ship features additional Artillery power, encouraging heavy reliance on the beam.",
    unlock: "Earn two of the three Federation Cruiser achievements.",
    source: "The Federation Cruiser, Layout B",
    reactor: 9,
    fuel: 16,
    missiles: 9,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [2, 2],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_BURST_2", "MISSILES_1"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "slug", room: "p-engines" },
      { kin: "energy", room: "p-weapons" },
    ],
    kits: { artillery: { weapon: "ARTILLERY_FED",  level: 2, power: 1 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_FED_3",
    cruiser: "Federation Cruiser",
    layout: "C",
    name: "The Fregatidae",
    quote:
      "With a Flak Artillery weapon and an improved Clone Bay, only the most suicidal of infantry chooses to fly on this ship.",
    unlock: "Reach sector 8 with Federation layout B, Advanced Edition on.",
    source: "The Federation Cruiser, Layout C",
    reactor: 7,
    fuel: 16,
    missiles: 5,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [0, 0],
      weapons: [1, 0],
      sensors: [1, 1],
      ...sub,
    },
    weapons: [],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "energy", room: "p-engines" },
      { kin: "energy", room: "p-shields" },
      { kin: "mantis", room: "p-weapons" },
    ],
    kits: {
      clonebay: { level: 2, power: 1 },
      teleporter: { level: 1, power: 1 },
      // Flak Artillery tick keys off `on`, and the module comment says reactor bars are not taken off the hull.
      // Power stays 0 so the 7-bar reactor can cover shields, engines, oxygen, clone bay, and teleporter.
      artillery: { weapon: "ARTILLERY_FED_C",  level: 1, power: 0, on: true },
    },
    augments: ["O2_MASKS"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ENERGY",
    cruiser: "Zoltan Cruiser",
    layout: "A",
    name: "The Adjudicator",
    quote: "The Zoltan's advanced shields technology give this ship an edge during each battle.",
    unlock: "See the Unarmed Zoltan Transport, or defeat the Flagship with the Federation Cruiser.",
    source: "The Zoltan Cruiser, Layout A",
    reactor: 5,
    fuel: 16,
    missiles: 12,
    parts: 2,
    systems: {
      shields: [2, 2],
      engines: [1, 1],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 1],
      sensors: [1, 1],
      pilot: [1, 1],
      doors: [2, 2],
    },
    // Wiki page "The Zoltan Cruiser", section "Layout A": Leto Missiles and Halberd Beam.
    // Beam (Weapons), "Halberd Beam": power 3. Missile (Weapons), "Leto Missiles": power 1.
    // Together they need more than the starting weapon bars. powerMask powers the Leto first. The Halberd charges once the Leto is switched off or the weapon bars are raised.
    weapons: ["MISSILES_1", "BEAM_2"],
    crew: [
      { kin: "energy", room: "p-pilot" },
      { kin: "energy", room: "p-engines" },
      { kin: "energy", room: "p-weapons" },
    ],
    kits: {},
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["ENERGY_SHIELD"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ENERGY_2",
    cruiser: "Zoltan Cruiser",
    layout: "B",
    name: "Noether",
    quote: "This ship starts with a weakened Shield system and must rely on its Zoltan shield.",
    unlock: "Earn two of the three Zoltan Cruiser achievements.",
    source: "The Zoltan Cruiser, Layout B",
    reactor: 5,
    fuel: 16,
    missiles: 0,
    parts: 2,
    systems: {
      shields: [1, 1],
      // Beam (Weapons), "Pike Beam": power 2, stored as id shear. Ion (Weapons), "Ion Blast": power 1, twice.
      // Sum is 4, the weapon system level. Engines power 0 is INFERRED so reactor 5 can hold shields 1 + weapons 4.
      engines: [2, 0],
      oxygen: [1, 0],
      medbay: [1, 0],
      weapons: [4, 4],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["ION_1", "ION_1", "BEAM_LONG"],
    crew: [
      { kin: "energy", room: "p-pilot" },
      { kin: "energy", room: "p-engines" },
      { kin: "energy", room: "p-shields" },
    ],
    kits: {},
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["ENERGY_SHIELD"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ENERGY_3",
    cruiser: "Zoltan Cruiser",
    layout: "C",
    name: "Cerenkov",
    quote:
      "The designer of this ship was not willing to spend the money for a decent reactor. Instead it relies on its Zoltan crew and Backup Battery.",
    unlock: "Reach sector 8 with Zoltan layout B, Advanced Edition on.",
    source: "The Zoltan Cruiser, Layout C",
    reactor: 2,
    fuel: 16,
    missiles: 2,
    parts: 15,
    systems: {
      shields: [2, 2],
      engines: [2, 0],
      oxygen: [1, 0],
      medbay: [0, 0],
      weapons: [2, 0],
      sensors: [1, 1],
      ...sub,
    },
    // Wiki page "The Zoltan Cruiser", section "Layout C": Ion Charger. Ion (Weapons), "Ion Charger": power 2.
    // Weapon bars start at 0 because the reactor's 2 bars are in shields. The charger is mounted and waits for those bars.
    weapons: ["ION_CHARGEGUN"],
    crew: [
      { kin: "energy", room: "p-pilot" },
      { kin: "energy", room: "p-engines" },
      { kin: "energy", room: "p-shields" },
      { kin: "energy", room: "p-weapons" },
    ],
    kits: {
      clonebay: { level: 1, power: 0 },
      drones: { level: 3, power: 0, target: "COMBAT_BEAM" },
      battery: { level: 2, power: 0 },
    },
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["ENERGY_SHIELD"],
    unfitted: [],
  },
  /**
   * Wiki page "The Slug Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_JELLY",
    cruiser: "Slug Cruiser",
    layout: "A",
    name: "Man of War",
    quote:
      "Designed for use inside nebula, this cruiser lacks sensors and relies instead on the guile and cunning of the Slugs.",
    unlock:
      "See the Slug Home Nebula Surrender event, or defeat the Flagship with the Mantis Cruiser.",
    source: "The Slug Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 15,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      // Medbay power 0 is INFERRED so the weapon bars can sit at 3.
      // Dual Lasers 1 and Anti-Bio Beam 2 fill those bars. Breach Bomb Mark I is mounted and unpowered until one of them is switched off.
      medbay: [1, 0],
      weapons: [3, 3],
      sensors: [0, 0],
      pilot: [1, 1],
      doors: [2, 2],
    },
    // Wiki page "The Slug Cruiser", section "Layout A": Dual Lasers, Anti-Bio Beam, Breach Bomb Mark I.
    weapons: ["LASER_BURST_2", "BEAM_BIO", "BOMB_BREACH_1"],
    crew: [
      { kin: "slug", room: "p-pilot" },
      { kin: "slug", room: "p-engines" },
    ],
    kits: {},
    augments: ["SLUG_GEL"],
    unfitted: [],
  },
  /**
   * Wiki page "The Slug Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_JELLY_2",
    cruiser: "Slug Cruiser",
    layout: "B",
    name: "The Stormwalker",
    quote:
      "This boarding ship has no medical facilities and must manage its explosives carefully to keep the crew alive.",
    unlock: "Earn two of the three Slug Cruiser achievements.",
    source: "The Slug Cruiser, Layout B",
    reactor: 7,
    fuel: 16,
    missiles: 25,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 0],
      medbay: [0, 0],
      // Bomb (Weapons), "Healing Burst": power 1. Missile (Weapons), "Artemis Missiles": power 1.
      // Together they fill weapon level 2. Shields 2 + engines 2 + weapons 2 + teleporter 1 = reactor 7.
      weapons: [2, 2],
      sensors: [0, 0],
      pilot: [1, 1],
      doors: [2, 2],
    },
    weapons: ["MISSILES_2_PLAYER", "BOMB_HEAL"],
    crew: [
      { kin: "slug", room: "p-pilot" },
      { kin: "slug", room: "p-engines" },
      { kin: "slug", room: "p-weapons" },
    ],
    kits: { teleporter: { level: 1, power: 1 } },
    augments: ["SLUG_GEL"],
    unfitted: [],
  },
  /**
   * Wiki page "The Slug Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * Wiki page "The Slug Cruiser", section "Layout C": Sensors is not listed, so the level is 0.
   * Chain Burst Laser is the starting gun. It takes the 2 weapon bars the reactor can spare.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_JELLY_3",
    cruiser: "Slug Cruiser",
    layout: "C",
    name: "Ariolimax",
    quote:
      "Slugs are often skilled in the arts of misdirection and manipulation. With Hacking and Mind Control systems, this ship capitalizes on that fact.",
    unlock: "Reach sector 8 with Slug layout B, Advanced Edition on.",
    source: "The Slug Cruiser, Layout C",
    reactor: 9,
    fuel: 16,
    missiles: 1,
    parts: 15,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [0, 0],
      weapons: [2, 2],
      sensors: [0, 0],
      pilot: [1, 1],
      doors: [2, 2],
    },
    // Wiki page "The Slug Cruiser", section "Layout C": Chain Burst Laser. Id chainlaser.
    weapons: ["LASER_CHAINGUN"],
    crew: [
      { kin: "slug", room: "p-pilot" },
      { kin: "slug", room: "p-engines" },
      { kin: "slug", room: "p-weapons" },
    ],
    kits: {
      hacking: { level: 1, power: 1 },
      mind: { level: 1, power: 1 },
      clonebay: { level: 1, power: 0 },
    },
    augments: ["SLUG_GEL"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ROCK",
    cruiser: "Rock Cruiser",
    layout: "A",
    name: "Bulwark",
    quote:
      "Similar to its designers, this super dense behemoth uses brute force to overwhelm its foes.",
    unlock: "See the Rock war vessel encounter, or defeat the Flagship with the Slug Cruiser.",
    source: "The Rock Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 28,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      // Missile (Weapons), "Hull Missile": power 2. Missile (Weapons), "Artemis Missiles": power 1.
      // Medbay power 0 is INFERRED so both named guns fit in reactor 8 (shields 2 + engines 2 + oxygen 1 + weapons 3).
      medbay: [1, 0],
      weapons: [3, 3],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["MISSILES_2_PLAYER", "MISSILES_HULL"],
    crew: [
      { kin: "rock", room: "p-pilot" },
      { kin: "rock", room: "p-engines" },
      { kin: "rock", room: "p-weapons" },
    ],
    kits: {},
    augments: ["ROCK_ARMOR"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ROCK_2",
    cruiser: "Rock Cruiser",
    layout: "B",
    name: "Shivan",
    quote: "With no airlocks, this ship must rely entirely on its rock crew to put out fires.",
    unlock: "Earn two of the three Rock Cruiser achievements.",
    source: "The Rock Cruiser, Layout B",
    reactor: 8,
    fuel: 16,
    missiles: 18,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [2, 1],
      medbay: [1, 0],
      weapons: [3, 2],
      sensors: [1, 1],
      pilot: [1, 1],
      doors: [0, 0],
    },
    // Wiki page "The Rock Cruiser", section "Layout B": Fire Bomb and Heavy Pierce Laser Mark I. Each is 2 power.
    // Weapon bars start at 2, so the Fire Bomb takes them. The Heavy Pierce charges once the Fire Bomb is switched off.
    weapons: ["BOMB_FIRE", "LASER_HEAVY_1_SP"],
    crew: [
      { kin: "rock", room: "p-pilot" },
      { kin: "rock", room: "p-engines" },
      { kin: "rock", room: "p-weapons" },
      { kin: "rock", room: "p-shields" },
    ],
    kits: {},
    augments: ["ROCK_ARMOR"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ROCK_3",
    cruiser: "Rock Cruiser",
    layout: "C",
    name: "Tektite",
    quote:
      "Contact has been made with the Crystalline race and this cruiser was offered to the Federation as part of diplomatic discussions between the sister species.",
    unlock: "Reach sector 8 with Rock layout B, Advanced Edition on.",
    source: "The Rock Cruiser, Layout C",
    reactor: 8,
    fuel: 16,
    missiles: 15,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [0, 0],
      // Missile (Weapons), "Swarm Missiles": power 2. Crystal (Weapons), "Heavy Crystal Mark I": power 1.
      // Sum is 3, which is the weapon system level. Clone bay stays at power 0. Draw is shields 2 + engines 2 + oxygen 1 + weapons 3 = reactor 8.
      weapons: [3, 3],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["MISSILE_CHARGEGUN", "CRYSTAL_HEAVY_1"],
    crew: [
      { kin: "rock", room: "p-pilot" },
      { kin: "rock", room: "p-engines" },
      { kin: "crystal", room: "p-weapons" },
    ],
    kits: { clonebay: { level: 1, power: 0 } },
    augments: ["ROCK_ARMOR"],
    unfitted: [],
  },
  /**
   * Wiki page "The Stealth Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_STEALTH",
    cruiser: "Stealth Cruiser",
    layout: "A",
    name: "The Nesasio",
    quote:
      "Constructed for the Federation by the Engi, this ship is designed to use cloaking technology and speed to get behind enemy lines.",
    unlock: "See the Engi fleet discussion event, or defeat the Flagship with the Rock Cruiser.",
    source: "The Stealth Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 0,
    parts: 0,
    systems: {
      shields: [0, 0],
      engines: [4, 4],
      oxygen: [1, 1],
      medbay: [1, 0],
      // Beam (Weapons), "Mini Beam": power 1. Laser (Weapons), "Dual Lasers": power 1.
      // The spare reactor bar raises weapons power from 1 to 2. INFERRED which bar was the spare.
      weapons: [2, 2],
      sensors: [2, 2],
      ...sub,
    },
    weapons: ["LASER_BURST_2", "BEAM_1"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "human", room: "p-engines" },
      { kin: "human", room: "p-weapons" },
    ],
    kits: { cloaking: { level: 1, power: 1 } },
    augments: ["SYSTEM_CASING", "ADV_SCANNERS"],
    unfitted: [],
  },
  /**
   * Wiki page "The Stealth Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_STEALTH_2",
    cruiser: "Stealth Cruiser",
    layout: "B",
    name: "DA-SR 12",
    quote:
      "Built like a glass cannon, this ship is hard to handle. If its cloaking can keep it safe long enough to charge its weapon, few cruisers can withstand its might.",
    unlock: "Earn two of the three Stealth Cruiser achievements.",
    source: "The Stealth Cruiser, Layout B",
    reactor: 7,
    fuel: 16,
    missiles: 0,
    parts: 0,
    systems: {
      shields: [0, 0],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      // Beam (Weapons), "Glaive Beam": power 4.
      // Engines 2 + oxygen 1 + cloak 2 + glaive 4 = 9, and the reactor is 7.
      // INFERRED: the named gun takes the bars. Cloak stays installed at level 2 with power 0.
      weapons: [4, 4],
      sensors: [2, 2],
      ...sub,
    },
    weapons: ["BEAM_3"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "human", room: "p-engines" },
      { kin: "energy", room: "p-weapons" },
    ],
    kits: { cloaking: { level: 2, power: 0 } },
    augments: ["ADV_SCANNERS"],
    unfitted: [],
  },
  /**
   * Wiki page "The Stealth Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * Wiki page "The Stealth Cruiser", section "Layout C": Laser Charger (S) and Mini Beam. Both are 1 power, and the weapon system is level 2.
   * The Stealth Cruiser, Layout C: Starting Drones lists Shield Overcharger +.
   * Drone Control is level 2. Engines 3 + oxygen 1 + weapons 2 = 6, and the reactor is 7.
   * Shield Overcharger + needs 2 power. One spare bar cannot feed it, so power stays 0. INFERRED.
   * Starting Drones also lists Anti-Drone, the Anti-Combat Drone: Wiki page "Drone Control",
   * Combat Drone Mark II notes, "Anti-Combat Drone ... when playing Stealth C" (gear-look.ts "anti-drone" -> wardcut). Both
   * schematics are fitted as the loadout. INFERRED: the player kit flies one drone at a time (extras/swarm.ts deploy).
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_STEALTH_3",
    cruiser: "Stealth Cruiser",
    layout: "C",
    name: "Simo-H",
    quote:
      "This ship was part of an Engi experiment to make a power efficient version of the Zoltan shield. Unfortunately this required the removal of the Cloaking system.",
    unlock: "Reach sector 8 with Stealth layout B, Advanced Edition on.",
    source: "The Stealth Cruiser, Layout C",
    reactor: 7,
    fuel: 16,
    missiles: 0,
    parts: 16,
    systems: {
      shields: [0, 0],
      engines: [3, 3],
      oxygen: [1, 1],
      medbay: [0, 0],
      // Two 1-power guns. The reactor had three bars free (7 − engines 3 − oxygen 1). Two go to weapons. INFERRED.
      weapons: [2, 2],
      sensors: [0, 0],
      ...sub,
    },
    weapons: ["LASER_CHARGEGUN_PLAYER", "BEAM_1"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "rock", room: "p-engines" },
      { kin: "slug", room: "p-weapons" },
    ],
    kits: {
      clonebay: { level: 1, power: 0 },
      // Wiki page "The Stealth Cruiser", section "Layout C": Starting Drones: Shield Overcharger +, Anti-Drone.
      drones: {
        level: 2,
        power: 0,
        target: "DRONE_SHIELD_PLAYER",
        loadout: ["DRONE_SHIELD_PLAYER", "ANTI_DRONE"],
      },
    },
    augments: ["ADV_SCANNERS"],
    unfitted: [],
  },
  /**
   * Wiki page "The Lanius Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * Wiki page "The Lanius Cruiser", section "Layout A": Chain Burst Laser (2 power) and Ion Stunner (1). Weapon system is level 3 and already powered to 3.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ANAEROBIC",
    cruiser: "Lanius Cruiser",
    layout: "A",
    name: "Kruos",
    quote:
      "The sharp knife-like structures make Lanius ships a sight to behold. This cruiser was adapted to support the other races of the Federation.",
    unlock: "Unlock 4 ships besides The Kestrel.",
    source: "The Lanius Cruiser, Layout A",
    reactor: 8,
    fuel: 16,
    missiles: 3,
    parts: 9,
    systems: {
      shields: [2, 2],
      engines: [1, 1],
      oxygen: [1, 1],
      medbay: [0, 0],
      weapons: [3, 3],
      sensors: [1, 1],
      ...sub,
    },
    weapons: ["LASER_CHAINGUN", "ION_STUN"],
    crew: [
      { kin: "human", room: "p-pilot" },
      { kin: "anaerobic", room: "p-engines" },
      { kin: "anaerobic", room: "p-weapons" },
    ],
    kits: {
      hacking: { level: 1, power: 1 },
      clonebay: { level: 1, power: 0 },
    },
    augments: ["O2_MASKS"],
    unfitted: [],
  },
  /**
   * Wiki page "The Lanius Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "PLAYER_SHIP_ANAEROBIC_2",
    cruiser: "Lanius Cruiser",
    layout: "B",
    name: "The Shrike",
    quote:
      "The racial ability of the Lanius make them fearsome combatants in small quarters. Combine that with a Mind Control system and this ship is a force to be reckoned with.",
    unlock: "Earn two of the three Lanius Cruiser achievements.",
    source: "The Lanius Cruiser, Layout B",
    reactor: 8,
    fuel: 16,
    missiles: 0,
    parts: 0,
    systems: {
      shields: [2, 2],
      engines: [1, 1],
      oxygen: [1, 1],
      medbay: [0, 0],
      // Wiki page "Flak (Weapons)", "Adv. Flak Gun": 1 power. The weapon system is level 1.
      // One reactor bar was spare (8 − shields 2 − engines 1 − oxygen 1 − teleporter 1 − mind control 1). INFERRED that it powers this gun.
      weapons: [1, 1],
      sensors: [0, 0],
      ...sub,
    },
    weapons: ["SHOTGUN_PLAYER"],
    crew: [
      { kin: "engi", room: "p-pilot" },
      { kin: "anaerobic", room: "p-engines" },
      { kin: "anaerobic", room: "p-weapons" },
    ],
    kits: {
      teleporter: { level: 1, power: 1 },
      mind: { level: 1, power: 1 },
      clonebay: { level: 1, power: 0 },
    },
    augments: ["O2_MASKS"],
    unfitted: [],
  },
  ...MANTIS_HULLS,
  ...CRYSTAL_HULLS,
];

export function hullById(id: string): HullSpec | undefined {
  return HULLS.find((h) => h.id === id);
}
