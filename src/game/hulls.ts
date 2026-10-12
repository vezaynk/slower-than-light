import { tx } from "../i18n/index.ts";
import type { KinId } from "./extras/kin.ts";
import type { AugmentId, KitId, SysId } from "./types.ts";
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
    id: "kestrel-a",
    cruiser: tx("game.hulls.kestrel-cruiser"),
    layout: "A",
    name: tx("game.hulls.the-kestrel"),
    quote:
      tx("game.hulls.this-class-of-ship-was-decommissioned"),
    unlock: tx("game.hulls.available-from-the-start-it-is"),
    source: tx("game.hulls.the-kestrel-cruiser-layout-a"),
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
    weapons: ["lineburst", "artemis"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "plain", room: "p-weapons" },
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
    id: "kestrel-b",
    cruiser: tx("game.hulls.kestrel-cruiser"),
    layout: "B",
    name: "Red-Tail",
    quote: tx("game.hulls.this-modified-kestrel-class-ship-was"),
    unlock: tx("game.hulls.earn-at-least-two-of-the"),
    source: tx("game.hulls.the-kestrel-cruiser-layout-b"),
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
    weapons: ["spark", "spark", "spark", "spark"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "blade", room: "p-weapons" },
      { kin: "spark", room: "p-shields" },
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
    id: "kestrel-c",
    cruiser: tx("game.hulls.kestrel-cruiser"),
    layout: "C",
    name: tx("game.hulls.the-swallow"),
    quote:
      tx("game.hulls.this-model-was-modified-by-pirates"),
    unlock: tx("game.hulls.reach-the-final-sector-with-kestrel"),
    source: tx("game.hulls.the-kestrel-cruiser-layout-c"),
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
    weapons: ["twin", "stunner"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "voidlung", room: "p-weapons" },
    ],
    // Clone Bay is installed. No reactor left for its bar. INFERRED: it starts unpowered.
    kits: { cradle: { level: 1, power: 0 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "engi-a",
    cruiser: tx("game.hulls.engi-cruiser"),
    layout: "A",
    name: tx("game.hulls.the-torus"),
    quote:
      tx("game.hulls.although-it-may-look-like-a"),
    unlock: tx("game.hulls.reach-sector-5-with-any-kestrel"),
    source: tx("game.hulls.the-engi-cruiser-layout-a"),
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
    weapons: ["ion2"],
    crew: [
      { kin: "shell", room: "p-pilot" },
      { kin: "shell", room: "p-engines" },
      { kin: "plain", room: "p-weapons" },
    ],
    // Drone Control (3). Combat Drone Mark I takes 2 of those bars.
    kits: { swarm: { level: 3, power: 2, target: "striker" } },
    augments: ["medbot"],
    unfitted: [],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "engi-b",
    cruiser: tx("game.hulls.engi-cruiser"),
    layout: "B",
    name: tx("game.hulls.the-vortex"),
    quote: tx("game.hulls.heavily-understaffed-this-ship-relies-on"),
    unlock: tx("game.hulls.earn-at-least-two-of-the-2"),
    source: tx("game.hulls.the-engi-cruiser-layout-b"),
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
    weapons: ["heavyion", "heavy"],
    crew: [{ kin: "shell", room: "p-pilot" }],
    // The Engi Cruiser, Layout B: Augmentations lists Drone Reactor Booster.
    // Drones (3 slots): Anti-Personnel, and System Repair (x2). Both repair schematics are fitted.
    // Anti-Personnel stays a name. This build does not fly that third schematic.
    kits: { swarm: { level: 3, power: 1, loadout: ["patch", "patch"] } },
    augments: ["booster"],
    unfitted: [tx("game.hulls.anti-personnel-drone")],
  },
  /**
   * Wiki page "The Engi Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "engi-c",
    cruiser: tx("game.hulls.engi-cruiser"),
    layout: "C",
    name: tx("game.hulls.tetragon"),
    quote:
      tx("game.hulls.the-engi-were-quick-to-adapt"),
    unlock: tx("game.hulls.reach-the-final-sector-with-engi"),
    source: tx("game.hulls.the-engi-cruiser-layout-c"),
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
    weapons: ["twin"],
    crew: [
      { kin: "voidlung", room: "p-pilot" },
      { kin: "shell", room: "p-engines" },
      { kin: "shell", room: "p-weapons" },
    ],
    kits: {
      swarm: { level: 2, power: 2, target: "beam" },
      spike: { level: 1, power: 1 },
      cradle: { level: 1, power: 0 },
    },
    // The Engi Cruiser, Layout C: Augmentations lists Defense Scrambler.
    augments: ["scrambler"],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "fed-a",
    cruiser: tx("game.hulls.federation-cruiser"),
    layout: "A",
    name: tx("game.hulls.the-osprey"),
    quote:
      tx("game.hulls.this-ship-features-the-latest-in"),
    unlock: tx("game.hulls.defeat-the-flagship-prototype-in-the"),
    source: tx("game.hulls.the-federation-cruiser-layout-a"),
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
    weapons: ["lineburst"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "blade", room: "p-engines" },
      { kin: "stone", room: "p-weapons" },
      { kin: "shell", room: "p-shields" },
    ],
    kits: { lance: { level: 1, power: 1 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "fed-b",
    cruiser: tx("game.hulls.federation-cruiser"),
    layout: "B",
    name: tx("game.hulls.nisos"),
    quote: tx("game.hulls.this-ship-features-additional-artillery-power"),
    unlock: tx("game.hulls.earn-two-of-the-three-federation"),
    source: tx("game.hulls.the-federation-cruiser-layout-b"),
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
    weapons: ["twin", "leto"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "gel", room: "p-engines" },
      { kin: "spark", room: "p-weapons" },
    ],
    kits: { lance: { level: 2, power: 1 } },
    augments: [],
    unfitted: [],
  },
  /**
   * Wiki page "The Federation Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "fed-c",
    cruiser: tx("game.hulls.federation-cruiser"),
    layout: "C",
    name: tx("game.hulls.the-fregatidae"),
    quote:
      tx("game.hulls.with-a-flak-artillery-weapon-and"),
    unlock: tx("game.hulls.reach-sector-8-with-federation-layout"),
    source: tx("game.hulls.the-federation-cruiser-layout-c"),
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
      { kin: "plain", room: "p-pilot" },
      { kin: "spark", room: "p-engines" },
      { kin: "spark", room: "p-shields" },
      { kin: "blade", room: "p-weapons" },
    ],
    kits: {
      cradle: { level: 2, power: 1 },
      sling: { level: 1, power: 1 },
      // Flak Artillery tick keys off `on`, and the module comment says reactor bars are not taken off the hull.
      // Power stays 0 so the 7-bar reactor can cover shields, engines, oxygen, clone bay, and teleporter.
      flak: { level: 1, power: 0, on: true },
    },
    augments: ["lung"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "zoltan-a",
    cruiser: tx("game.hulls.zoltan-cruiser"),
    layout: "A",
    name: tx("game.hulls.the-adjudicator"),
    quote: tx("game.hulls.the-zoltan-s-advanced-shields-technology"),
    unlock: tx("game.hulls.see-the-unarmed-zoltan-transport-or"),
    source: tx("game.hulls.the-zoltan-cruiser-layout-a"),
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
    weapons: ["leto", "halberd"],
    crew: [
      { kin: "spark", room: "p-pilot" },
      { kin: "spark", room: "p-engines" },
      { kin: "spark", room: "p-weapons" },
    ],
    kits: {},
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["zshield"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "zoltan-b",
    cruiser: tx("game.hulls.zoltan-cruiser"),
    layout: "B",
    name: tx("game.hulls.noether"),
    quote: tx("game.hulls.this-ship-starts-with-a-weakened"),
    unlock: tx("game.hulls.earn-two-of-the-three-zoltan"),
    source: tx("game.hulls.the-zoltan-cruiser-layout-b"),
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
    weapons: ["needle", "needle", "shear"],
    crew: [
      { kin: "spark", room: "p-pilot" },
      { kin: "spark", room: "p-engines" },
      { kin: "spark", room: "p-shields" },
    ],
    kits: {},
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["zshield"],
    unfitted: [],
  },
  /**
   * Wiki page "The Zoltan Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "zoltan-c",
    cruiser: tx("game.hulls.zoltan-cruiser"),
    layout: "C",
    name: tx("game.hulls.cerenkov"),
    quote: tx("game.hulls.the-designer-of-this-ship-was"),
    unlock: tx("game.hulls.reach-sector-8-with-zoltan-layout"),
    source: tx("game.hulls.the-zoltan-cruiser-layout-c"),
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
    weapons: ["ioncharger"],
    crew: [
      { kin: "spark", room: "p-pilot" },
      { kin: "spark", room: "p-engines" },
      { kin: "spark", room: "p-shields" },
      { kin: "spark", room: "p-weapons" },
    ],
    kits: {
      cradle: { level: 1, power: 0 },
      swarm: { level: 3, power: 0, target: "beam" },
      cell: { level: 2, power: 0 },
    },
    // Zoltan Shield, lead: "Zoltan Shield is an augmentation" with 5 points of energy shielding.
    // Augmentations: "Your ship can have only up to three augmentations". This one occupies a slot.
    augments: ["zshield"],
    unfitted: [],
  },
  /**
   * Wiki page "The Slug Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "slug-a",
    cruiser: tx("game.hulls.slug-cruiser"),
    layout: "A",
    name: tx("game.hulls.man-of-war"),
    quote: tx("game.hulls.designed-for-use-inside-nebula-this"),
    unlock: tx("game.hulls.see-the-slug-home-nebula-surrender"),
    source: tx("game.hulls.the-slug-cruiser-layout-a"),
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
    weapons: ["twin", "antibio", "breach1"],
    crew: [
      { kin: "gel", room: "p-pilot" },
      { kin: "gel", room: "p-engines" },
    ],
    kits: {},
    augments: ["gel"],
    unfitted: [],
  },
  /**
   * Wiki page "The Slug Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "slug-b",
    cruiser: tx("game.hulls.slug-cruiser"),
    layout: "B",
    name: tx("game.hulls.the-stormwalker"),
    quote: tx("game.hulls.this-boarding-ship-has-no-medical"),
    unlock: tx("game.hulls.earn-two-of-the-three-slug"),
    source: tx("game.hulls.the-slug-cruiser-layout-b"),
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
    weapons: ["artemis", "healburst"],
    crew: [
      { kin: "gel", room: "p-pilot" },
      { kin: "gel", room: "p-engines" },
      { kin: "gel", room: "p-weapons" },
    ],
    kits: { sling: { level: 1, power: 1 } },
    augments: ["gel"],
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
    id: "slug-c",
    cruiser: tx("game.hulls.slug-cruiser"),
    layout: "C",
    name: tx("game.hulls.ariolimax"),
    quote: tx("game.hulls.slugs-are-often-skilled-in-the"),
    unlock: tx("game.hulls.reach-sector-8-with-slug-layout"),
    source: tx("game.hulls.the-slug-cruiser-layout-c"),
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
    weapons: ["chainlaser"],
    crew: [
      { kin: "gel", room: "p-pilot" },
      { kin: "gel", room: "p-engines" },
      { kin: "gel", room: "p-weapons" },
    ],
    kits: {
      spike: { level: 1, power: 1 },
      leash: { level: 1, power: 1 },
      cradle: { level: 1, power: 0 },
    },
    augments: ["gel"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "rock-a",
    cruiser: tx("game.hulls.rock-cruiser"),
    layout: "A",
    name: tx("game.hulls.bulwark"),
    quote: tx("game.hulls.similar-to-its-designers-this-super"),
    unlock: tx("game.hulls.see-the-rock-war-vessel-encounter"),
    source: tx("game.hulls.the-rock-cruiser-layout-a"),
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
    weapons: ["artemis", "hullmissile"],
    crew: [
      { kin: "stone", room: "p-pilot" },
      { kin: "stone", room: "p-engines" },
      { kin: "stone", room: "p-weapons" },
    ],
    kits: {},
    augments: ["keel"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "rock-b",
    cruiser: tx("game.hulls.rock-cruiser"),
    layout: "B",
    name: tx("game.hulls.shivan"),
    quote: tx("game.hulls.with-no-airlocks-this-ship-must"),
    unlock: tx("game.hulls.earn-two-of-the-three-rock"),
    source: tx("game.hulls.the-rock-cruiser-layout-b"),
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
    weapons: ["cask", "heavypierce"],
    crew: [
      { kin: "stone", room: "p-pilot" },
      { kin: "stone", room: "p-engines" },
      { kin: "stone", room: "p-weapons" },
      { kin: "stone", room: "p-shields" },
    ],
    kits: {},
    augments: ["keel"],
    unfitted: [],
  },
  /**
   * Wiki page "The Rock Cruiser", section "Layout C": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "rock-c",
    cruiser: tx("game.hulls.rock-cruiser"),
    layout: "C",
    name: tx("game.hulls.tektite"),
    quote: tx("game.hulls.contact-has-been-made-with-the"),
    unlock: tx("game.hulls.reach-sector-8-with-rock-layout"),
    source: tx("game.hulls.the-rock-cruiser-layout-c"),
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
    weapons: ["swarmmissiles", "heavycrystal"],
    crew: [
      { kin: "stone", room: "p-pilot" },
      { kin: "stone", room: "p-engines" },
      { kin: "shard", room: "p-weapons" },
    ],
    kits: { cradle: { level: 1, power: 0 } },
    augments: ["keel"],
    unfitted: [],
  },
  /**
   * Wiki page "The Stealth Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "stealth-a",
    cruiser: tx("game.hulls.stealth-cruiser"),
    layout: "A",
    name: tx("game.hulls.the-nesasio"),
    quote: tx("game.hulls.constructed-for-the-federation-by-the"),
    unlock: tx("game.hulls.see-the-engi-fleet-discussion-event"),
    source: tx("game.hulls.the-stealth-cruiser-layout-a"),
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
    weapons: ["twin", "mini"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "plain", room: "p-weapons" },
    ],
    kits: { veil: { level: 1, power: 1 } },
    augments: ["casing", "glass"],
    unfitted: [],
  },
  /**
   * Wiki page "The Stealth Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "stealth-b",
    cruiser: tx("game.hulls.stealth-cruiser"),
    layout: "B",
    name: tx("game.hulls.da-sr-12"),
    quote: tx("game.hulls.built-like-a-glass-cannon-this"),
    unlock: tx("game.hulls.earn-two-of-the-three-stealth"),
    source: tx("game.hulls.the-stealth-cruiser-layout-b"),
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
    weapons: ["glaive"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "plain", room: "p-engines" },
      { kin: "spark", room: "p-weapons" },
    ],
    kits: { veil: { level: 2, power: 0 } },
    augments: ["glass"],
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
    id: "stealth-c",
    cruiser: tx("game.hulls.stealth-cruiser"),
    layout: "C",
    name: "Simo-H",
    quote: tx("game.hulls.this-ship-was-part-of-an"),
    unlock: tx("game.hulls.reach-sector-8-with-stealth-layout"),
    source: tx("game.hulls.the-stealth-cruiser-layout-c"),
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
    weapons: ["chargers", "mini"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "stone", room: "p-engines" },
      { kin: "gel", room: "p-weapons" },
    ],
    kits: {
      cradle: { level: 1, power: 0 },
      // Wiki page "The Stealth Cruiser", section "Layout C": Starting Drones: Shield Overcharger +, Anti-Drone.
      swarm: { level: 2, power: 0, target: "overchargerplus", loadout: ["overchargerplus", "wardcut"] },
    },
    augments: ["glass"],
    unfitted: [],
  },
  /**
   * Wiki page "The Lanius Cruiser", section "Layout A": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * Wiki page "The Lanius Cruiser", section "Layout A": Chain Burst Laser (2 power) and Ion Stunner (1). Weapon system is level 3 and already powered to 3.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "lanius-a",
    cruiser: tx("game.hulls.lanius-cruiser"),
    layout: "A",
    name: tx("game.hulls.kruos"),
    quote: tx("game.hulls.the-sharp-knife-like-structures-make"),
    unlock: tx("game.hulls.unlock-4-ships-besides-the-kestrel"),
    source: tx("game.hulls.the-lanius-cruiser-layout-a"),
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
    weapons: ["chainlaser", "stunner"],
    crew: [
      { kin: "plain", room: "p-pilot" },
      { kin: "voidlung", room: "p-engines" },
      { kin: "voidlung", room: "p-weapons" },
    ],
    kits: {
      spike: { level: 1, power: 1 },
      cradle: { level: 1, power: 0 },
    },
    augments: ["lung"],
    unfitted: [],
  },
  /**
   * Wiki page "The Lanius Cruiser", section "Layout B": reactor, fuel, missiles, drone parts, systems, weapons, crew.
   * Power fills are not on the page. INFERRED.
   * unlock is the page line; the gate is unlocks.ts (@agent:unlocks).
   */
  {
    id: "lanius-b",
    cruiser: tx("game.hulls.lanius-cruiser"),
    layout: "B",
    name: tx("game.hulls.the-shrike"),
    quote: tx("game.hulls.the-racial-ability-of-the-lanius"),
    unlock: tx("game.hulls.earn-two-of-the-three-lanius"),
    source: tx("game.hulls.the-lanius-cruiser-layout-b"),
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
    weapons: ["advflak"],
    crew: [
      { kin: "shell", room: "p-pilot" },
      { kin: "voidlung", room: "p-engines" },
      { kin: "voidlung", room: "p-weapons" },
    ],
    kits: {
      sling: { level: 1, power: 1 },
      leash: { level: 1, power: 1 },
      cradle: { level: 1, power: 0 },
    },
    augments: ["lung"],
    unfitted: [],
  },
  ...MANTIS_HULLS,
  ...CRYSTAL_HULLS,
];

export function hullById(id: string): HullSpec | undefined {
  return HULLS.find((h) => h.id === id);
}
