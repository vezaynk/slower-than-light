import { loadCatalog } from "@stl/catalog";
import {
  allAugments,
  allCrew,
  allEmptyBeacons,
  allEvents,
  allFillerLists,
  allDrones,
  allHulls,
  allSectors,
  allStores,
  allSystems,
  allTunes,
  allWeapons,
  emitPack,
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
    sectors: allSectors(),
    stores: allStores(),
    tunes: allTunes(),
    events: allEvents(),
    lists: allFillerLists(),
    empties: allEmptyBeacons(),
  });
}
