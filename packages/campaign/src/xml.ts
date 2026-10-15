import { loadCatalog } from "@stl/catalog";
import {
  allCrew,
  allEmptyBeacons,
  allEvents,
  allFillerLists,
  allHulls,
  allSectors,
  allStores,
  emitPack,
} from "@stl/pack";

/**
 * The rules document. Weapons, augments, drones, systems, and tunes come from
 * the player's ftl.dat, so this file does not restate them.
 */
export async function campaignXml(): Promise<string> {
  loadCatalog();
  return emitPack({
    crew: allCrew(),
    hulls: allHulls(),
    sectors: allSectors(),
    stores: allStores(),
    events: allEvents(),
    lists: allFillerLists(),
    empties: allEmptyBeacons(),
  });
}
