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
  emitPack,
  rewardTable,
} from "@stl/pack";

/** The campaign document: `emitPack` of the records the catalog loads. */
export async function campaignXml(): Promise<string> {
  loadCatalog();
  return emitPack({
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
  });
}
