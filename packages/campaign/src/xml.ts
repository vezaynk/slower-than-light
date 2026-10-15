import {
  allAugments,
  allCrew,
  allDrones,
  allHulls,
  allSectors,
  allStores,
  allSystems,
  allTunes,
  allWeapons,
  emitPack,
} from "@stl/pack";

/**
 * The assembler is imported by file URL. A static import would pull the game
 * into this package's typecheck.
 */
async function loadCampaign(): Promise<void> {
  const assembler = new URL("../../../apps/game/src/game/pack/base.ts", import.meta.url);
  await import(assembler.href);
}

/** The campaign document: `emitPack` of the records `base.ts` loads. */
export async function campaignXml(): Promise<string> {
  await loadCampaign();
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
  });
}
