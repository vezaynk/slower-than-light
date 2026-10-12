import { tx } from "../../i18n/index.ts";
/**
 * Wiki page "Sectors".
 * Each note is a mechanic from that heading. Counts below are the figures
 * printed there, not extra beacon chances. Event outcomes are not filled in.
 */

export type SectorType = {
  id: string;
  name: string;
  group: "civilian" | "hostile" | "nebula" | "hidden" | "last-stand";
  /** Facts copied from that section. No invented beacon odds. */
  notes: string[];
};

export const SECTOR_TYPES: SectorType[] = [
  // wiki page "Sectors", heading "Civilian (Starting) Sector"
  {
    id: "civilian-start",
    name: tx("wiki.sectors.civilian-starting-sector"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.always-and-only-sector-1-it"),
      tx("wiki.sectors.the-beacon-list-gives-1-2"),
      tx("wiki.sectors.crew-bought-or-received-as-a"),
    ],
  },
  // wiki page "Sectors", heading "Civilian Sector"
  {
    id: "civilian",
    name: tx("wiki.sectors.civilian-sector"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game"),
      tx("wiki.sectors.the-beacon-list-gives-2-3"),
      tx("wiki.sectors.crew-bought-or-received-as-a"),
    ],
  },
  // wiki page "Sectors", heading "Engi Controlled Sector"
  {
    id: "engi",
    name: tx("wiki.sectors.engi-controlled-sector"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.the-beacon-list-gives-2-3-2"),
      tx("wiki.sectors.crew-bought-or-received-as-a-2"),
    ],
  },
  // wiki page "Sectors", heading "Engi Homeworlds"
  {
    id: "engi-home",
    name: tx("wiki.sectors.engi-homeworlds"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only"),
      tx("wiki.sectors.the-beacon-list-places-1-engi"),
      tx("wiki.sectors.crew-bought-or-received-as-a-2"),
    ],
  },
  // wiki page "Sectors", heading "Zoltan Controlled Sector"
  {
    id: "zoltan",
    name: tx("wiki.sectors.zoltan-controlled-sector"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.the-beacon-list-places-1-zoltan"),
      tx("wiki.sectors.crew-bought-or-received-as-a-3"),
    ],
  },
  // wiki page "Sectors", heading "Zoltan Homeworlds"
  {
    id: "zoltan-home",
    name: tx("wiki.sectors.zoltan-homeworlds"),
    group: "civilian",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only"),
      tx("wiki.sectors.the-beacon-list-places-1-zoltan-2"),
      tx("wiki.sectors.crew-bought-or-received-as-a-3"),
    ],
  },
  // wiki page "Sectors", heading "Abandoned Sector"
  {
    id: "abandoned",
    name: tx("wiki.sectors.abandoned-sector"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.advanced-edition-sector-can-occur-multiple"),
      tx("wiki.sectors.the-beacon-list-gives-2-stores"),
      tx("wiki.sectors.crew-bought-or-received-as-a-4"),
    ],
  },
  // wiki page "Sectors", heading "Mantis Controlled Sector"
  {
    id: "mantis",
    name: tx("wiki.sectors.mantis-controlled-sector"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.the-beacon-list-gives-1-2-2"),
      tx("wiki.sectors.crew-bought-or-received-as-a-5"),
    ],
  },
  // wiki page "Sectors", heading "Mantis Homeworlds"
  {
    id: "mantis-home",
    name: tx("wiki.sectors.mantis-homeworlds"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only"),
      tx("wiki.sectors.the-beacon-list-places-1-legendary"),
      tx("wiki.sectors.crew-bought-or-received-as-a-5"),
    ],
  },
  // wiki page "Sectors", heading "Pirate Controlled Sector"
  {
    id: "pirate",
    name: tx("wiki.sectors.pirate-controlled-sector"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.the-beacon-list-gives-1-2-3"),
      tx("wiki.sectors.crew-bought-or-received-as-a"),
    ],
  },
  // wiki page "Sectors", heading "Rebel Controlled Sector"
  {
    id: "rebel",
    name: tx("wiki.sectors.rebel-controlled-sector"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.the-beacon-list-gives-1-2-4"),
      tx("wiki.sectors.crew-bought-or-received-as-a"),
    ],
  },
  // wiki page "Sectors", heading "Rebel Stronghold"
  {
    id: "rebel-stronghold",
    name: tx("wiki.sectors.rebel-stronghold"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only-2"),
      tx("wiki.sectors.the-beacon-list-places-1-rebel"),
      tx("wiki.sectors.crew-bought-or-received-as-a"),
    ],
  },
  // wiki page "Sectors", heading "Rock Controlled Sector"
  {
    id: "rock",
    name: tx("wiki.sectors.rock-controlled-sector"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.crystal-lockdown-bombs-can-be-found"),
      tx("wiki.sectors.the-beacon-list-gives-2-stores"),
      tx("wiki.sectors.crew-bought-or-received-as-a-6"),
    ],
  },
  // wiki page "Sectors", heading "Rock Homeworlds"
  {
    id: "rock-home",
    name: tx("wiki.sectors.rock-homeworlds"),
    group: "hostile",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only-2"),
      tx("wiki.sectors.crystal-lockdown-bombs-can-be-found-2"),
      tx("wiki.sectors.the-beacon-list-places-1-ancient"),
      tx("wiki.sectors.crew-bought-or-received-as-a-6"),
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Slug Controlled Nebula"
  {
    id: "slug-nebula",
    name: tx("wiki.sectors.slug-controlled-nebula"),
    group: "nebula",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-3"),
      tx("wiki.sectors.visiting-a-nebula-beacon-slows-the"),
      tx("wiki.sectors.the-beacon-list-gives-0-1"),
      tx("wiki.sectors.crew-bought-or-received-as-a-7"),
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Slug Home Nebula"
  {
    id: "slug-home",
    name: tx("wiki.sectors.slug-home-nebula"),
    group: "nebula",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only-3"),
      tx("wiki.sectors.visiting-a-nebula-beacon-slows-the"),
      tx("wiki.sectors.the-beacon-list-places-1-slug"),
      tx("wiki.sectors.crew-bought-or-received-as-a-7"),
    ],
  },
  // wiki page "Sectors", headings "Nebula Sectors" and "Uncharted Nebula"
  {
    id: "uncharted",
    name: tx("wiki.sectors.uncharted-nebula"),
    group: "nebula",
    notes: [
      tx("wiki.sectors.can-occur-multiple-times-per-game-2"),
      tx("wiki.sectors.visiting-a-nebula-beacon-slows-the"),
      tx("wiki.sectors.in-normal-circumstances-the-sector-has"),
      tx("wiki.sectors.the-beacon-list-also-shows-0"),
      tx("wiki.sectors.crew-bought-or-received-as-a-8"),
    ],
  },
  // wiki page "Sectors", heading "Hidden Crystal Worlds"
  {
    id: "crystal-worlds",
    name: tx("wiki.sectors.hidden-crystal-worlds"),
    group: "hidden",
    notes: [
      tx("wiki.sectors.only-once-per-game-and-only-4"),
      tx("wiki.sectors.it-is-a-standalone-sector-separate"),
      tx("wiki.sectors.exiting-sends-you-to-a-random"),
      tx("wiki.sectors.stores-and-crew-kill-rewards-offer"),
      tx("wiki.sectors.the-beacon-list-gives-2-3-3"),
      tx("wiki.sectors.restarting-while-still-in-this-sector"),
    ],
  },
  // wiki page "Sectors", heading "The Last Stand"
  {
    id: "last-stand",
    name: tx("wiki.sectors.the-last-stand"),
    group: "last-stand",
    notes: [
      tx("wiki.sectors.always-sector-8-as-the-final"),
      tx("wiki.sectors.at-the-start-the-ship-receives"),
      tx("wiki.sectors.the-rebel-flagship-spawns-on-the"),
      tx("wiki.sectors.the-rebel-fleet-does-not-advance"),
      tx("wiki.sectors.the-federation-base-sits-slightly-right"),
      tx("wiki.sectors.the-base-is-never-overtaken-if"),
      tx("wiki.sectors.waiting-is-allowed-even-with-fuel"),
      tx("wiki.sectors.each-repair-beacon-gives-15-repairs"),
      tx("wiki.sectors.the-beacon-list-gives-1-store"),
      tx("wiki.sectors.crew-bought-or-received-as-a-9"),
    ],
  },
];

/**
 * Wiki page "Sectors" does not state a full generation order.
 * Per-heading depth gates are on each sector above; they are not a path.
 */
export const SECTOR_ORDER: null = null;
