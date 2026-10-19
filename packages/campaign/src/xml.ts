import { loadCatalog } from "@stl/catalog";
import {
  allAugments,
  allCrew,
  allEmptyBeacons,
  allEvents,
  allFactions,
  allFillerLists,
  allDrones,
  allHulls,
  allSectors,
  allStores,
  allSystems,
  allTunes,
  allWeapons,
  emitFtlSectors,
  emitFtlShips,
  emitPack,
  rewardTable,
  type ContentPack,
} from "@stl/pack";

/** The catalog as one pack. */
export function campaignPack(): ContentPack {
  loadCatalog();
  return {
    crew: allCrew(),
    weapons: allWeapons(),
    augments: allAugments(),
    drones: allDrones(),
    systems: allSystems(),
    hulls: allHulls(),
    factions: allFactions(),
    sectors: allSectors(),
    stores: allStores(),
    tunes: allTunes(),
    rewards: rewardTable(),
    events: allEvents(),
    lists: allFillerLists(),
    empties: allEmptyBeacons(),
  };
}

/**
 * Body is the stand-in. Gap is base.xml.
 * The two halves share the catalog rows. Emit omits the fields each file leaves out.
 */
export function splitCampaign(pack: ContentPack): { body: ContentPack; gap: ContentPack } {
  return {
    body: {
      crew: pack.crew,
      weapons: pack.weapons,
      augments: pack.augments,
      drones: pack.drones,
      systems: pack.systems,
      tunes: pack.tunes,
      events: pack.events,
      lists: pack.lists,
    },
    gap: {
      crew: pack.crew,
      sectors: pack.sectors,
      stores: pack.stores,
      rewards: pack.rewards,
      factions: pack.factions,
      empties: pack.empties,
    },
  };
}

/** The catalog's ship blueprints, written as ftl.dat's data/blueprints.xml writes them. */
export function standInShipsXml(): string {
  return emitFtlShips(campaignPack().hulls ?? []);
}

/** The catalog's sectors, written as ftl.dat's data/sector_data.xml writes them. */
export function standInSectorsXml(): string {
  return emitFtlSectors(campaignPack().sectors ?? []);
}

/**
 * Campaign records the archive can carry: names, blueprints, and pages. Ships and sectors are in standInShipsXml and
 * standInSectorsXml.
 */
export function standInXml(): string {
  return emitPack(splitCampaign(campaignPack()).body, { crew: "identity", sector: "body" });
}

/** Records the archive does not carry: crew combat, sector colour, the store, and reward bands. */
export function campaignXml(): string {
  return emitPack(splitCampaign(campaignPack()).gap, { crew: "stats", sector: "gap" });
}
