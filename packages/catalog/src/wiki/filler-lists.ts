import type { EmptyBeaconDef, FillerListDef } from "@stl/pack";
import { ftlEventId } from "./ftl-event-ids.ts";

/**
 * Filler lists and the sentences for a quiet beacon.
 * `base.ts` loads these records. This file does not import the sim.
 * A packed row id is the datafile id of that page. The authored `id` stays the slug
 * choice handlers already use. Large trade station is the page STORE_REBELSIDE.
 * Choice handlers stay in filler-events.ts. Remembering a unique page stays in the sim.
 */

export type FillerRow = { id: string; dest: string; unique: boolean };

/** Category:Filler Events ("OVERRIDE_NEUTRAL"): every page with alsooccur=filler or exitandfiller, and its unique=. */
export const FILLER: FillerRow[] = [
  { id: "abandoned-station", dest: "Empty station", unique: true },
  {
    id: "auto-ship-attacking-outpost",
    dest: "Optional fight: Auto-ship and outpost",
    unique: true,
  },
  {
    id: "auto-ship-near-storage-station",
    dest: "Optional fight: Auto-ship at storage station",
    unique: true,
  },
  { id: "battlefield-wreckage", dest: "Wreckage: search", unique: false },
  { id: "deactivated-auto-ship", dest: "Deactivated Auto-ship", unique: true },
  { id: "intelligent-ponies", dest: "Unknown life forms on a planet", unique: true },
  { id: "large-asteroid-field", dest: "Asteroid field: explore", unique: true },
  { id: "pirate-briber", dest: "Pirate bribe", unique: true },
  {
    id: "pirate-ship-attacking-civilian",
    dest: "Optional fight: pirate ship and civilian",
    unique: false,
  },
  { id: "pirate-ship-selling-drones", dest: "Trade: scrap for drone parts (pirate)", unique: true },
  { id: "plagued-station", dest: "Station with life signs", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  { id: "rebel-fight-chance", dest: "Optional fight: hidden Rebel ship", unique: false },
  {
    id: "rebel-ship-supplying-civilians",
    dest: "Optional fight: Rebel supply ship",
    unique: false,
  },
  { id: "rebel-transport-ship", dest: "Optional fight: Rebel transport", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "refugee", dest: "Refugee ship", unique: false },
  { id: "slaver-friendly", dest: "Trade: scrap for crew", unique: true },
  { id: "terraforming-scan", dest: "Planet scan request", unique: true },
  { id: "the-mercenary", dest: "Mercenary", unique: false },
];

/** Template:EventList NEBULA (the "nebula filler" rows), Event name (wiki) and Unique? columns. */
export const NEBULA: FillerRow[] = [
  { id: "auto-ship-fight-in-nebula", dest: "Hostile Auto-ship in nebula", unique: false },
  {
    id: "auto-ship-near-storage-station-in-nebula",
    dest: "Optional fight: Auto-ship at station in nebula",
    unique: true,
  },
  { id: "auto-ship-warning-in-nebula", dest: "Fleeing Auto-ship in nebula", unique: true },
  { id: "boarders-humans-in-nebula", dest: "Boarders: Humans in nebula", unique: true },
  { id: "empty-nebula-beacon", dest: "Empty beacon in nebula", unique: false },
  { id: "nebula-lost-ship", dest: "Lost ship in nebula", unique: true },
  { id: "mantis-fight-in-nebula", dest: "Hostile Mantis ship in nebula", unique: false },
  { id: "pirate-smuggler", dest: "Optional fight: pirate smuggler", unique: false },
  { id: "rebel-fight-in-nebula", dest: "Hostile Rebel ship in nebula", unique: false },
  { id: "trade-resources-in-nebula", dest: "Trade: resources in nebula", unique: true },
  { id: "pirate-ship-selling-weapon", dest: "Trade: weapon for scrap (nebula)", unique: true },
  {
    id: "auto-ship-fight-in-plasma-storm",
    dest: "Hostile Auto-ship in plasma storm",
    unique: true,
  },
  { id: "boarders-humans-in-plasma-storm", dest: "Boarders: Humans in plasma storm", unique: true },
  {
    id: "plasma-storm-incapacitated-ships",
    dest: "Wrecks in plasma storm",
    unique: true,
  },
  { id: "rebel-fight-in-plasma-storm", dest: "Hostile Rebel ship in plasma storm", unique: true },
];

/** Template:EventList DISTRESS BEACON, Event name (wiki) and Unique? columns. */
export const DISTRESS: FillerRow[] = [
  { id: "asteroid-belt-distress", dest: "Distress: ship in asteroid belt", unique: true },
  { id: "giant-alien-spiders", dest: "Distress: station infestation", unique: true },
  { id: "malfunctioning-defense-system", dest: "Distress: defense satellites", unique: true },
  {
    id: "unknown-disease-on-mining-colony",
    dest: "Distress: colony riot",
    unique: true,
  },
  { id: "fire-on-research-station", dest: "Distress: station fire", unique: true },
  { id: "crushed-pirate", dest: "Distress: ship stuck in asteroids", unique: true },
  { id: "escort-civilians-ftl-haywire", dest: "Escort: low scrap and quest", unique: true },
  { id: "friendly-ship-out-of-fuel", dest: "Fuel request", unique: false },
  {
    id: "pirate-ship-attacking-civilian-distress",
    dest: "Optional fight: pirate ship (distress)",
    unique: false,
  },
  { id: "refugee-distress", dest: "Refugee ship distress", unique: false },
  { id: "refugee-comms-down", dest: "Refugee ship, no comms", unique: false },
  { id: "single-life-form-on-moon", dest: "Distress: life form on moon", unique: true },
  { id: "pirate-ship-distress-trap", dest: "Hostile pirate ship (distress)", unique: true },
];

/** Template:EventList ITEMS (OVERRIDE_ITEMS adds Large trade station), Event name (wiki) and Unique? columns. */
export const ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade: fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Trade: missiles for rewards", unique: true },
  { id: "refueling-station", dest: "Trade: scrap for fuel", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Trade: drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Trade: missiles for scrap", unique: true },
  { id: "crew-hiring-station", dest: "Crew for hire", unique: true },
  { id: "trade-resources", dest: "Trade: resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade: scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Trade: supplies for reactor", unique: true },
];

/**
 * Exit beacons (Template:EventList EXIT LIST): "This event list is actually comprised of 2 event lists - NEUTRAL_EXIT and
 * ITEMS (OVERRIDE_NEUTRAL_EXIT and OVERRIDE_ITEMS - when Advanced Edition Content is enabled)". This game is AE.
 * Rows are Template:EventList OVERRIDE NEUTRAL EXIT and Template:EventList OVERRIDE ITEMS, Event name (wiki) and Unique?.
 */
export const EXIT_NEUTRAL: FillerRow[] = [
  { id: "large-asteroid-field", dest: "Asteroid field: explore", unique: true },
  {
    id: "auto-ship-near-storage-station",
    dest: "Optional fight: Auto-ship at storage station",
    unique: true,
  },
  {
    id: "auto-ship-attacking-outpost",
    dest: "Optional fight: Auto-ship and outpost",
    unique: true,
  },
  { id: "plagued-station", dest: "Station with life signs", unique: true },
  { id: "intelligent-ponies", dest: "Unknown life forms on a planet", unique: true },
  { id: "abandoned-station", dest: "Empty station", unique: true },
  { id: "slaver-friendly", dest: "Trade: scrap for crew", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "pirate-briber", dest: "Pirate bribe", unique: true },
  {
    id: "pirate-ship-attacking-civilian",
    dest: "Optional fight: pirate ship and civilian",
    unique: false,
  },
  { id: "pirate-ship-selling-drones", dest: "Trade: scrap for drone parts (pirate)", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  {
    id: "rebel-ship-supplying-civilians",
    dest: "Optional fight: Rebel supply ship",
    unique: false,
  },
  { id: "rebel-transport-ship", dest: "Optional fight: Rebel transport", unique: true },
  { id: "refugee", dest: "Refugee ship", unique: false },
  { id: "rebel-fight-chance", dest: "Optional fight: hidden Rebel ship", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade: scrap for upgrades", unique: true },
  { id: "battlefield-wreckage", dest: "Wreckage: search", unique: false },
];

export const EXIT_ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade: fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Trade: missiles for rewards", unique: true },
  { id: "refueling-station", dest: "Trade: scrap for fuel", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Trade: drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Trade: missiles for scrap", unique: true },
  { id: "large-trade-station", dest: "Store (closed)", unique: true },
  { id: "crew-hiring-station", dest: "Crew for hire", unique: true },
  { id: "trade-resources", dest: "Trade: resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade: scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Trade: supplies for reactor", unique: true },
];

export type FillerList = "FILLER" | "NEBULA" | "DISTRESS" | "ITEMS" | "EXIT_NEUTRAL" | "EXIT_ITEMS";

/** "Empty beacon (...)" pages: {{Locations}} sectors and the intro texts. Every one ends "Nothing happens." */
export type EmptyPage = {
  id: string;
  dest: string;
  sectors: string[];
  texts: string[];
  nebula?: boolean;
};

export const EMPTY_PAGES: EmptyPage[] = [
  {
    id: "empty-beacon-civilian",
    dest: "Empty beacon (Civilian)",
    sectors: ["Civilian Sector"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-crystal",
    dest: "Empty beacon (Crystal)",
    sectors: ["Hidden Crystal Worlds"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-engi",
    dest: "Empty beacon (Engi)",
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-lanius",
    dest: "Empty beacon (Lanius)",
    sectors: ["Abandoned Sector"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-last-stand",
    dest: "Empty beacon (Last Stand)",
    sectors: ["The Last Stand"],
    texts: ["Nothing here.", "Nothing here.", "Nothing here.", "Nothing here.", "Nothing here."],
  },
  {
    id: "empty-beacon-mantis",
    dest: "Empty beacon (Mantis)",
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-pirate",
    dest: "Empty beacon (Pirate)",
    sectors: ["Pirate Controlled Sector"],
    texts: ["Nothing here.", "Nothing here.", "Nothing here.", "Nothing here."],
  },
  {
    id: "empty-beacon-rebel",
    dest: "Empty beacon (Rebel)",
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    texts: ["Nothing here.", "Nothing here.", "Nothing here.", "Nothing here.", "Nothing here."],
  },
  {
    id: "empty-beacon-rock",
    dest: "Empty beacon (Rock)",
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-beacon-slug",
    dest: "Empty beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: ["Nothing here.", "Nothing here.", "Nothing here.", "Nothing here.", "Nothing here."],
  },
  {
    id: "empty-beacon-zoltan",
    dest: "Empty beacon (Zoltan)",
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    // Template:EventList NEBULA row NEBULA_EMPTY; also an "empty nebula beacons" slot outside the Slug sectors.
    id: "empty-nebula-beacon",
    nebula: true,
    dest: "Empty beacon in nebula",
    sectors: [
      "Civilian Sector",
      "Pirate Controlled Sector",
      "Rebel Controlled Sector",
      "Rebel Stronghold",
      "Uncharted Nebula",
      "Zoltan Controlled Sector",
      "Zoltan Homeworlds",
    ],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
  {
    id: "empty-nebula-beacon-slug",
    nebula: true,
    dest: "Empty nebula beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
      "Nothing here.",
    ],
  },
];

function listEntry(row: FillerRow): { id: string; unique: boolean } {
  return { id: ftlEventId(row.dest) ?? row.id, unique: row.unique };
}

/** The six lists, in authored order. A draw walks that order. */
export function fillerListRecords(): FillerListDef[] {
  return [
    { id: "FILLER", entries: FILLER.map(listEntry) },
    { id: "NEBULA", entries: NEBULA.map(listEntry) },
    { id: "DISTRESS", entries: DISTRESS.map(listEntry) },
    { id: "ITEMS", entries: ITEMS.map(listEntry) },
    { id: "EXIT_NEUTRAL", entries: EXIT_NEUTRAL.map(listEntry) },
    { id: "EXIT_ITEMS", entries: EXIT_ITEMS.map(listEntry) },
  ];
}

/** Quiet-beacon sentences. Civilian is first. The two nebula pages are marked. */
export function emptyBeaconRecords(): EmptyBeaconDef[] {
  return EMPTY_PAGES.map((page) => {
    const copy: EmptyBeaconDef = {
      id: ftlEventId(page.dest) ?? page.id,
      dest: page.dest,
      sectors: [...page.sectors],
      texts: [...page.texts],
    };
    if (page.nebula) copy.nebula = true;
    return copy;
  });
}
