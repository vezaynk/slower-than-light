import { tx } from "../../i18n/index.ts";
import type { EmptyBeaconDef, FillerListDef } from "@stl/pack";

/**
 * Filler lists and the sentences for a quiet beacon.
 * `base.ts` loads these records. This file does not import the sim.
 * A row id is the page slug the draw already resolves. Large trade station has no card;
 * its id is that same slug, and a draw skips it until a page with that id exists.
 * Choice handlers stay in filler-events.ts. Remembering a unique page stays in the sim.
 */

export type FillerRow = { id: string; dest: string; unique: boolean };

/** Category:Filler Events ("OVERRIDE_NEUTRAL"): every page with alsooccur=filler or exitandfiller, and its unique=. */
export const FILLER: FillerRow[] = [
  { id: "abandoned-station", dest: "Abandoned station", unique: true },
  { id: "auto-ship-attacking-outpost", dest: "Auto-ship attacking outpost", unique: true },
  { id: "auto-ship-near-storage-station", dest: "Auto-ship near storage station", unique: true },
  { id: "battlefield-wreckage", dest: "Battlefield wreckage", unique: false },
  { id: "deactivated-auto-ship", dest: "Deactivated Auto-ship", unique: true },
  { id: "intelligent-ponies", dest: "Intelligent ponies", unique: true },
  { id: "large-asteroid-field", dest: "Large asteroid field", unique: true },
  { id: "pirate-briber", dest: "Pirate briber", unique: true },
  { id: "pirate-ship-attacking-civilian", dest: "Pirate ship attacking civilian", unique: false },
  { id: "pirate-ship-selling-drones", dest: "Pirate ship selling drones", unique: true },
  { id: "plagued-station", dest: "Plagued station", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  { id: "rebel-fight-chance", dest: "Rebel fight chance", unique: false },
  { id: "rebel-ship-supplying-civilians", dest: "Rebel ship supplying civilians", unique: false },
  { id: "rebel-transport-ship", dest: "Rebel transport ship", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "refugee", dest: "Refugee", unique: false },
  { id: "slaver-friendly", dest: "Slaver (friendly)", unique: true },
  { id: "terraforming-scan", dest: "Terraforming scan", unique: true },
  { id: "the-mercenary", dest: "The mercenary", unique: false },
];

/** Template:EventList NEBULA (the "nebula filler" rows), Event name (wiki) and Unique? columns. */
export const NEBULA: FillerRow[] = [
  { id: "auto-ship-fight-in-nebula", dest: "Auto-ship fight in nebula", unique: false },
  { id: "auto-ship-near-storage-station-in-nebula", dest: "Auto-ship near storage station in nebula", unique: true },
  { id: "auto-ship-warning-in-nebula", dest: "Auto-ship warning in nebula", unique: true },
  { id: "boarders-humans-in-nebula", dest: "Boarders: Humans in nebula", unique: true },
  { id: "empty-nebula-beacon", dest: "Empty nebula beacon", unique: false },
  { id: "nebula-lost-ship", dest: "Nebula lost ship", unique: true },
  { id: "mantis-fight-in-nebula", dest: "Mantis fight in nebula", unique: false },
  { id: "pirate-smuggler", dest: "Pirate smuggler", unique: false },
  { id: "rebel-fight-in-nebula", dest: "Rebel fight in nebula", unique: false },
  { id: "trade-resources-in-nebula", dest: "Trade resources in nebula", unique: true },
  { id: "pirate-ship-selling-weapon", dest: "Pirate ship selling weapon", unique: true },
  { id: "auto-ship-fight-in-plasma-storm", dest: "Auto-ship fight in plasma storm", unique: true },
  { id: "boarders-humans-in-plasma-storm", dest: "Boarders: Humans in plasma storm", unique: true },
  { id: "plasma-storm-incapacitated-ships", dest: "Plasma storm incapacitated ships", unique: true },
  { id: "rebel-fight-in-plasma-storm", dest: "Rebel fight in plasma storm", unique: true },
];

/** Template:EventList DISTRESS BEACON, Event name (wiki) and Unique? columns. */
export const DISTRESS: FillerRow[] = [
  { id: "asteroid-belt-distress", dest: "Asteroid belt distress", unique: true },
  { id: "giant-alien-spiders", dest: "Giant alien spiders", unique: true },
  { id: "malfunctioning-defense-system", dest: "Malfunctioning defense system", unique: true },
  { id: "unknown-disease-on-mining-colony", dest: "Unknown disease on mining colony", unique: true },
  { id: "fire-on-research-station", dest: "Fire on research station", unique: true },
  { id: "crushed-pirate", dest: "Crushed pirate", unique: true },
  { id: "escort-civilians-ftl-haywire", dest: "Escort civilians FTL haywire", unique: true },
  { id: "friendly-ship-out-of-fuel", dest: "Friendly ship out of fuel", unique: false },
  { id: "pirate-ship-attacking-civilian-distress", dest: "Pirate ship attacking civilian distress", unique: false },
  { id: "refugee-distress", dest: "Refugee distress", unique: false },
  { id: "refugee-comms-down", dest: "Refugee comms down", unique: false },
  { id: "single-life-form-on-moon", dest: "Single life form on moon", unique: true },
  { id: "pirate-ship-distress-trap", dest: "Pirate ship distress trap", unique: true },
];

/** Template:EventList ITEMS (OVERRIDE_ITEMS adds Large trade station), Event name (wiki) and Unique? columns. */
export const ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Asteroid mining colony", unique: true },
  { id: "refueling-station", dest: "Refueling station", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Sell drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Sell missiles for scrap", unique: true },
  { id: "crew-hiring-station", dest: "Crew hiring station", unique: true },
  { id: "trade-resources", dest: "Trade resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Improve reactor for supplies", unique: true },
];

/**
 * Exit beacons (Template:EventList EXIT LIST): "This event list is actually comprised of 2 event lists - NEUTRAL_EXIT and
 * ITEMS (OVERRIDE_NEUTRAL_EXIT and OVERRIDE_ITEMS - when Advanced Edition Content is enabled)". This game is AE.
 * Rows are Template:EventList OVERRIDE NEUTRAL EXIT and Template:EventList OVERRIDE ITEMS, Event name (wiki) and Unique?.
 */
export const EXIT_NEUTRAL: FillerRow[] = [
  { id: "large-asteroid-field", dest: "Large asteroid field", unique: true },
  { id: "auto-ship-near-storage-station", dest: "Auto-ship near storage station", unique: true },
  { id: "auto-ship-attacking-outpost", dest: "Auto-ship attacking outpost", unique: true },
  { id: "plagued-station", dest: "Plagued station", unique: true },
  { id: "intelligent-ponies", dest: "Intelligent ponies", unique: true },
  { id: "abandoned-station", dest: "Abandoned station", unique: true },
  { id: "slaver-friendly", dest: "Slaver (friendly)", unique: true },
  { id: "refueling-platform", dest: "Refueling platform", unique: true },
  { id: "pirate-briber", dest: "Pirate briber", unique: true },
  { id: "pirate-ship-attacking-civilian", dest: "Pirate ship attacking civilian", unique: false },
  { id: "pirate-ship-selling-drones", dest: "Pirate ship selling drones", unique: true },
  { id: "rebel-checkpoint", dest: "Rebel checkpoint", unique: false },
  { id: "rebel-ship-supplying-civilians", dest: "Rebel ship supplying civilians", unique: false },
  { id: "rebel-transport-ship", dest: "Rebel transport ship", unique: true },
  { id: "refugee", dest: "Refugee", unique: false },
  { id: "rebel-fight-chance", dest: "Rebel fight chance", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "battlefield-wreckage", dest: "Battlefield wreckage", unique: false },
];

export const EXIT_ITEMS: FillerRow[] = [
  { id: "free-drone-schematic", dest: "Free drone schematic", unique: false },
  { id: "free-weapon", dest: "Free weapon", unique: false },
  { id: "free-scrap-with-resources", dest: "Free scrap with resources", unique: false },
  { id: "trade-fuel-for-drone-parts", dest: "Trade fuel for drone parts", unique: false },
  { id: "asteroid-mining-colony", dest: "Asteroid mining colony", unique: true },
  { id: "refueling-station", dest: "Refueling station", unique: true },
  { id: "repair-station", dest: "Repair station", unique: true },
  { id: "sell-drone-parts-for-scrap", dest: "Sell drone parts for scrap", unique: true },
  { id: "sell-missiles-for-scrap", dest: "Sell missiles for scrap", unique: true },
  { id: "large-trade-station", dest: "Large trade station", unique: true },
  { id: "crew-hiring-station", dest: "Crew hiring station", unique: true },
  { id: "trade-resources", dest: "Trade resources", unique: false },
  { id: "trade-scrap-for-upgrades", dest: "Trade scrap for upgrades", unique: true },
  { id: "improve-reactor-for-supplies", dest: "Improve reactor for supplies", unique: true },
];

export type FillerList = "filler" | "nebula" | "distress" | "items" | "exitNeutral" | "exitItems";

/** "Empty beacon (...)" pages: {{Locations}} sectors and the intro texts. Every one ends "Nothing happens." */
export type EmptyPage = { id: string; dest: string; sectors: string[]; texts: string[]; nebula?: boolean };

export const EMPTY_PAGES: EmptyPage[] = [
  {
    id: "empty-beacon-civilian",
    dest: "Empty beacon (Civilian)",
    sectors: ["Civilian Sector"],
    texts: [
      tx("wiki.filler-events.your-jump-leads-you-to-nothing"),
      tx("wiki.filler-events.you-jump-into-an-unremarkable-system"),
      tx("wiki.filler-events.your-scans-reveal-a-mining-base"),
      tx("wiki.filler-events.your-scans-reveal-an-ore-refinery"),
      tx("wiki.filler-events.you-discover-a-nearby-planet-speckled"),
      tx("wiki.filler-events.this-beacon-has-been-built-for"),
      tx("wiki.filler-events.the-nearby-planet-shows-sign-of"),
      tx("wiki.filler-events.your-jump-leads-to-a-completely"),
      tx("wiki.filler-events.your-jump-leads-to-a-remarkable"),
    ],
  },
  {
    id: "empty-beacon-crystal",
    dest: "Empty beacon (Crystal)",
    sectors: ["Hidden Crystal Worlds"],
    texts: [
      tx("wiki.filler-events.as-soon-as-you-arrive-all"),
      tx("wiki.filler-events.no-ships-are-in-range-so"),
      tx("wiki.filler-events.there-appears-to-be-no-one"),
      tx("wiki.filler-events.you-arrive-near-a-civilian-settlement"),
      tx("wiki.filler-events.a-few-merchant-ships-pass-nearby"),
      tx("wiki.filler-events.a-number-of-civilian-ships-seem"),
    ],
  },
  {
    id: "empty-beacon-engi",
    dest: "Empty beacon (Engi)",
    sectors: ["Engi Controlled Sector", "Engi Homeworlds"],
    texts: [
      tx("wiki.filler-events.the-complex-arrangements-of-ship-hulls"),
      tx("wiki.filler-events.you-arrive-at-a-green-planet"),
      tx("wiki.filler-events.you-have-arrived-near-an-engi"),
      tx("wiki.filler-events.even-though-each-individual-engi-is"),
      tx("wiki.filler-events.you-see-a-number-of-engi"),
      tx("wiki.filler-events.this-system-appears-quite-peaceful-you"),
      tx("wiki.filler-events.there-are-a-number-of-merchant"),
      tx("wiki.filler-events.you-see-a-small-rebel-carrier"),
      tx("wiki.filler-events.the-engi-seem-to-have-avoided"),
      tx("wiki.filler-events.a-cluster-of-engi-satellites-in"),
    ],
  },
  {
    id: "empty-beacon-lanius",
    dest: "Empty beacon (Lanius)",
    sectors: ["Abandoned Sector"],
    texts: [
      tx("wiki.filler-events.the-charts-indicate-this-was-the"),
      tx("wiki.filler-events.scans-show-no-signs-of-any"),
      tx("wiki.filler-events.a-few-refugee-ships-are-preparing"),
      tx("wiki.filler-events.you-pass-a-civilian-ship-that"),
      tx("wiki.filler-events.you-question-a-local-settlement-and"),
      tx("wiki.filler-events.you-come-across-a-human-civilian"),
    ],
  },
  {
    id: "empty-beacon-last-stand",
    dest: "Empty beacon (Last Stand)",
    sectors: ["The Last Stand"],
    texts: [
      tx("wiki.filler-events.you-arrive-to-see-a-number"),
      tx("wiki.filler-events.there-are-a-few-federation-fleets"),
      tx("wiki.filler-events.a-few-scattered-heavy-vessels-are"),
      tx("wiki.filler-events.a-large-host-of-federation-heavy"),
      tx("wiki.filler-events.a-battalion-of-federation-fighters-are"),
    ],
  },
  {
    id: "empty-beacon-mantis",
    dest: "Empty beacon (Mantis)",
    sectors: ["Mantis Controlled Sector", "Mantis Homeworlds"],
    texts: [
      tx("wiki.filler-events.at-this-point-you-almost-expect"),
      tx("wiki.filler-events.the-only-thing-this-beacon-offers"),
      tx("wiki.filler-events.a-nearby-mantis-mining-operation-is"),
      tx("wiki.filler-events.there-aren-t-so-many-parts"),
      tx("wiki.filler-events.there-s-nothing-here-but-space"),
      tx("wiki.filler-events.you-fancy-you-see-something-moving"),
    ],
  },
  {
    id: "empty-beacon-pirate",
    dest: "Empty beacon (Pirate)",
    sectors: ["Pirate Controlled Sector"],
    texts: [
      tx("wiki.filler-events.as-soon-as-you-arrive-a"),
      tx("wiki.filler-events.a-small-pirate-ship-messages-you"),
      tx("wiki.filler-events.the-only-thing-within-scanning-range"),
      tx("wiki.filler-events.you-arrive-to-have-a-small"),
    ],
  },
  {
    id: "empty-beacon-rebel",
    dest: "Empty beacon (Rebel)",
    sectors: ["Rebel Controlled Sector", "Rebel Stronghold"],
    texts: [
      tx("wiki.filler-events.you-enter-a-system-bustling-with"),
      tx("wiki.filler-events.you-arrive-near-a-small-rebel"),
      tx("wiki.filler-events.there-is-not-much-of-interest"),
      tx("wiki.filler-events.there-are-no-other-ships-near"),
      tx("wiki.filler-events.there-is-a-small-planet-nearby"),
    ],
  },
  {
    id: "empty-beacon-rock",
    dest: "Empty beacon (Rock)",
    sectors: ["Rock Controlled Sector", "Rock Homeworlds"],
    texts: [
      tx("wiki.filler-events.you-receive-a-message-meant-to"),
      tx("wiki.filler-events.no-one-bothers-your-ship-as"),
      tx("wiki.filler-events.you-arrive-and-detect-signs-of"),
      tx("wiki.filler-events.there-s-not-much-at-this"),
      tx("wiki.filler-events.a-few-freighters-pass-by-but"),
      tx("wiki.filler-events.you-see-a-small-trading-post"),
      tx("wiki.filler-events.you-see-a-zoltan-merchant-and"),
    ],
  },
  {
    id: "empty-beacon-slug",
    dest: "Empty beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      tx("wiki.filler-events.you-arrive-at-the-beacon-and"),
      tx("wiki.filler-events.this-beacon-marks-a-small-gap"),
      tx("wiki.filler-events.you-are-relieved-to-see-your"),
      tx("wiki.filler-events.the-slugs-rely-heavily-on-their"),
      tx("wiki.filler-events.you-arrive-in-an-area-clear"),
    ],
  },
  {
    id: "empty-beacon-zoltan",
    dest: "Empty beacon (Zoltan)",
    sectors: ["Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      tx("wiki.filler-events.there-are-some-mineral-rich-asteroids"),
      tx("wiki.filler-events.you-have-to-admit-zoltan-space"),
      tx("wiki.filler-events.a-light-asteroid-field-is-entering"),
      tx("wiki.filler-events.you-stumble-upon-some-zoltan-military"),
      tx("wiki.filler-events.you-don-t-have-time-to"),
      tx("wiki.filler-events.a-zoltan-shipyard-is-stationed-at"),
      tx("wiki.filler-events.a-message-broadcast-from-a-nearby"),
    ],
  },
  {
    // Template:EventList NEBULA row NEBULA_EMPTY; also an "empty nebula beacons" slot outside the Slug sectors.
    id: "empty-nebula-beacon",
    nebula: true,
    dest: "Empty nebula beacon",
    sectors: ["Civilian Sector", "Pirate Controlled Sector", "Rebel Controlled Sector", "Rebel Stronghold", "Uncharted Nebula", "Zoltan Controlled Sector", "Zoltan Homeworlds"],
    texts: [
      tx("wiki.filler-events.you-can-t-see-anything-through"),
      tx("wiki.filler-events.without-active-sensors-you-have-no"),
      tx("wiki.filler-events.as-you-wait-for-the-ftl"),
      tx("wiki.filler-events.you-feel-naked-without-functioning-sensors"),
      tx("wiki.filler-events.your-crew-are-constantly-looking-out"),
      tx("wiki.filler-events.you-nervously-glance-out-the-windows"),
      tx("wiki.filler-events.you-cycle-through-wide-band-comm"),
      tx("wiki.filler-events.with-the-sensors-down-you-spend"),
      tx("wiki.filler-events.there-s-nothing-here-save-for"),
    ],
  },
  {
    id: "empty-nebula-beacon-slug",
    nebula: true,
    dest: "Empty nebula beacon (Slug)",
    sectors: ["Slug Controlled Nebula", "Slug Home Nebula"],
    texts: [
      tx("wiki.filler-events.when-it-comes-to-slugs-no"),
      tx("wiki.filler-events.it-s-not-unusual-to-feel"),
      tx("wiki.filler-events.either-this-part-of-slug-space"),
      tx("wiki.filler-events.this-area-of-the-nebula-seems"),
      tx("wiki.filler-events.you-explore-around-the-beacon-and"),
      tx("wiki.filler-events.there-are-a-number-of-small"),
    ],
  },
];

function listEntry(row: FillerRow): { id: string; unique: boolean } {
  return { id: row.id, unique: row.unique };
}

/** The six lists, in authored order. A draw walks that order. */
export function fillerListRecords(): FillerListDef[] {
  return [
    { id: "filler", entries: FILLER.map(listEntry) },
    { id: "nebula", entries: NEBULA.map(listEntry) },
    { id: "distress", entries: DISTRESS.map(listEntry) },
    { id: "items", entries: ITEMS.map(listEntry) },
    { id: "exitNeutral", entries: EXIT_NEUTRAL.map(listEntry) },
    { id: "exitItems", entries: EXIT_ITEMS.map(listEntry) },
  ];
}

/** Quiet-beacon sentences. Civilian is first. The two nebula pages are marked. */
export function emptyBeaconRecords(): EmptyBeaconDef[] {
  return EMPTY_PAGES.map((page) => {
    const copy: EmptyBeaconDef = {
      id: page.id,
      dest: page.dest,
      sectors: [...page.sectors],
      texts: [...page.texts],
    };
    if (page.nebula) copy.nebula = true;
    return copy;
  });
}
