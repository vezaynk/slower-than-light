import { loadCatalog } from "@stl/catalog";
import { eventXmlFile } from "@stl/catalog/src/wiki/beacon-quotas.ts";
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
  emitBlueprintAppend,
  emitFtlSectors,
  emitFtlShips,
  emitGapDocument,
  emitNoteAppend,
  emitPack,
  rewardTable,
  type ContentPack,
  type EventDef,
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
 * Body is the stand-in. Gap is the Slipstream mod.
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

/**
 * Ship blueprints, then weapon, augment, drone, and system blueprints, then each crew's title,
 * description, and store cost. Combat and shotGap stay on the append.
 */
export function standInShipsXml(): string {
  const pack = campaignPack();
  return emitFtlShips(pack.hulls ?? [], pack.crew ?? [], {
    weapons: pack.weapons,
    augments: pack.augments,
    drones: pack.drones,
    systems: pack.systems,
    tunes: pack.tunes,
  });
}

/** The catalog's sectors, written as ftl.dat's data/sector_data.xml writes them. */
export function standInSectorsXml(): string {
  return emitFtlSectors(campaignPack().sectors ?? []);
}

const EVENT_FILES = [
  "data/events.xml",
  "data/events_ships.xml",
  "data/events_boss.xml",
  "data/dlcEvents_anaerobic.xml",
];

/**
 * Event pages in FTL's event files. Lists sit on events.xml.
 * An empty group is omitted. Blueprints and sectors are their own files.
 */
export function standInEventFiles(): { path: string; xml: string }[] {
  const { events, lists } = splitCampaign(campaignPack()).body;
  const groups = new Map<string, EventDef[]>();
  for (const event of events ?? []) {
    const path = eventXmlFile(event);
    const bag = groups.get(path) ?? [];
    bag.push(event);
    groups.set(path, bag);
  }
  return EVENT_FILES.flatMap((path) => {
    const group = groups.get(path) ?? [];
    if (group.length === 0) return [];
    return [
      {
        path,
        xml: emitPack({
          events: group,
          lists: path === "data/events.xml" ? lists : undefined,
        }),
      },
    ];
  });
}

/**
 * The gap mod. The blueprint append overwrites crew combat and weapon shotGap.
 * Vanilla keeps Lanius in dlcBlueprints.xml and some weapons in that file too.
 * The same finds go in both appends. A find in a file that has no such blueprint does nothing.
 * The sector append adds notes. `data/gap.xml` adds the store, the rewards block, faction offers,
 * and empty beacons.
 */
export function gapModFiles(): { path: string; xml: string }[] {
  const pack = campaignPack();
  const { gap } = splitCampaign(pack);
  const blueprints = emitBlueprintAppend(gap.crew ?? [], pack.weapons ?? []);
  return [
    { path: "data/blueprints.xml.append", xml: blueprints },
    { path: "data/dlcBlueprints.xml.append", xml: blueprints },
    { path: "data/sector_data.xml.append", xml: emitNoteAppend(gap.sectors ?? []) },
    { path: "data/gap.xml", xml: emitGapDocument(gap) },
  ];
}
