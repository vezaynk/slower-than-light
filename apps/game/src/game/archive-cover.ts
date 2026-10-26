/**
 * Every record in an unpacked archive has to be in the loaded pack, and a play function has to use it.
 * The stand-in and any dat passed as FTL_DAT or STL_DATS share this path. Translation files stay unread,
 * matching the English-only loader.
 */
import {
  allInterfaceLines,
  crewCopy,
  droneCopy,
  helpListLines,
  itemLines,
  tutorialLines,
  verdictListLines,
  weaponCopy,
} from "./interface-copy.ts";
import { listWasPlayed, resetPlayedLists } from "./played-lists.ts";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import type { AugmentId, KitId, SysId } from "@stl/pack";
import type { FtlExtract } from "@stl/ftldat";
import {
  CJK_FACES,
  FONT_FACES,
  achievementDef,
  allAchievements,
  allAugments,
  allCrew,
  allDrones,
  allEmptyBeacons,
  allEvents,
  allFillerLists,
  allHulls,
  allSectors,
  allShipEvents,
  allStores,
  allSystems,
  allWeapons,
  augmentDef,
  blueprintList,
  civilianSectorTitle,
  crewDef,
  droneDef,
  emptyBeacon,
  eventDef,
  factionSurrender,
  fillerList,
  hullDef,
  mergeAnimations,
  mergeSounds,
  pickOpening,
  pictureFrame,
  readBitmapFont,
  readGrid,
  rewardTable,
  scrapRange,
  sectorDef,
  shipEventDef,
  storeDef,
  systemDef,
  textList,
  tuneDef,
  weaponDef,
  type ArchiveMark,
  type EventChoice,
  type EventDef,
} from "@stl/pack";
import {
  exerciseExtras,
  extraOwnsTag,
  extraPlaysAudio,
  extraSectorType,
  extraTextFile,
} from "./archive-cover-extra.ts";
import "./cover/register.ts";
import { freshGame, PLAY_SEED, playerHull } from "./archive-play.ts";
import { applyChoiceArchive, archiveSnap, showArchivePage } from "./archive-pay.ts";
import { upgradeCost } from "./content.ts";
import { installAugment } from "./extras/augments.ts";
import { installCell } from "./extras/cell.ts";
import { installCradle } from "./extras/cradle.ts";
import { installLance } from "./extras/lance.ts";
import { installLeash } from "./extras/leash.ts";
import { installSling } from "./extras/sling.ts";
import { installSpike } from "./extras/spike.ts";
import { sensorLevel } from "./extras/sensors.ts";
import { canDeploy, deploy, installSwarmBundle } from "./extras/swarm.ts";
import { installVeil } from "./extras/veil.ts";
import {
  archiveBlob,
  archiveImage,
  clipFrame,
  clipLength,
  crewPoseFrame,
  droneLayerUrl,
  musicTrack,
  rememberArchive,
  roomIconUrl,
  soundCue,
  weaponFrame,
} from "./pack/media.ts";
import { mountPose } from "./mount-place.ts";
import { gibImage, gibImages, rememberShipArt, shipImage } from "./pack/ship-art.ts";
import { CRYSTAL_SECTOR } from "./sector-ids.ts";
import {
  choose,
  createGame,
  doorLevel,
  enterSector,
  jumpBlocked,
  leaveStore,
  openStoreHere,
  powerUp,
  startCombat,
  step,
  upgrade,
} from "./sim.ts";
import type { Game } from "./types.ts";
import { conditionMet, isTracked } from "./wiki/achievement-track.ts";
import { mixBeacons } from "./wiki/beacon-mix.ts";
import { citedOwns } from "./wiki/cited-events.ts";
import { emptyPageFor } from "./wiki/filler-events.ts";
import { surrenderPlan } from "./wiki/surrender.ts";
import { playerShipIds } from "./unlocks.ts";

/** `text-<code>.xml`, including a hyphenated locale such as `text-zh-Hans.xml`. */
const TRANSLATION = /^text-.+\.xml(?:\.append)?$/i;
/** English string tables. `text_lists.xml` is a textList file, not one of these. */
const STRING_TABLE = /^text_(?!lists)[A-Za-z0-9_]*\.xml(?:\.append)?$/i;
/** Chart colours from `<sectorType>`. An `OVERRIDE_` list replaces its base list. */
const SECTOR_TYPE_GROUPS: Record<string, string> = {
  CIVILIAN: "civilian",
  HOSTILE: "hostile",
  NEBULA: "nebula",
};
const DRAWING_TAGS = new Set(["img", "glowOffset", "offsets", "weaponMounts", "explosion"]);
const MAINS: readonly SysId[] = ["shields", "engines", "oxygen", "medbay", "weapons"];
const SUBSYSTEMS = ["pilot", "sensors", "doors"] as const;
const KIT_INSTALL: Partial<Record<KitId, (g: Game) => boolean | void>> = {
  cloaking: installVeil,
  teleporter: installSling,
  hacking: installSpike,
  drones: (g) => installSwarmBundle(g, "COMBAT_1"),
  mind: installLeash,
  clonebay: installCradle,
  battery: installCell,
  artillery: installLance,
};

const require = createRequire(new URL("../../../../packages/pack/package.json", import.meta.url));
const { DOMParser } = require("@xmldom/xmldom") as {
  DOMParser: new (options?: { errorHandler?: () => void }) => {
    parseFromString(xml: string, type: string): { documentElement: XmlEl | null };
  };
};

type XmlNode = {
  nodeType: number;
  childNodes: { readonly length: number; item(index: number): XmlNode | null };
};

type XmlEl = XmlNode & {
  tagName: string;
  getAttribute(name: string): string | null;
};

type SectorTypeList = { name: string; sectors: string[] };

type DrawingBits = {
  path: string;
  img: boolean;
  glow: boolean;
  cloak: boolean;
  floor: boolean;
  mounts: number;
  gibs: number[];
};

type Inventory = {
  weapons: Set<string>;
  augments: Set<string>;
  drones: Set<string>;
  systems: Set<string>;
  crew: Set<string>;
  hulls: Set<string>;
  bareShips: Set<string>;
  events: Set<string>;
  lists: Set<string>;
  blueprints: Set<string>;
  texts: Set<string>;
  sectors: Set<string>;
  ships: Set<string>;
  stores: Set<string>;
  achievements: Set<string>;
  empties: Set<string>;
  rewards: boolean;
  names: boolean;
  facts: boolean;
  strings: Map<string, string>;
  sectorTypes: SectorTypeList[];
  drawings: Map<string, DrawingBits>;
  unknown: string[];
};

let shown: Game | undefined;

/** Loads the merged archive the way the title screen does, then plays every record from `raw`. */
export async function assertArchiveCovered(raw: FtlExtract, merged: FtlExtract): Promise<void> {
  shown = undefined;
  weaponGame = undefined;
  resetPlayedLists();
  polyfillObjectUrl();
  await rememberArchive(merged.documents, merged.assets);
  await rememberShipArt(merged.assets);
  const problems: string[] = [];
  const inventory = scan(raw, problems);
  exerciseRecords(inventory, problems);
  await exerciseFiles(raw, merged, problems);
  await exerciseExtras(raw, merged, problems);
  const lines = reportLines(problems);
  const head = lines.slice(0, 200);
  const rest = lines.length - head.length;
  assert.equal(
    problems.length,
    0,
    `${problems.length} archive pieces are not used\n${head.join("\n")}${rest > 0 ? `\n… ${rest} more` : ""}`,
  );
}

/** Identical findings stay one line, with how many times that finding happened. */
function reportLines(problems: string[]): string[] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const row of problems) {
    const seen = counts.get(row) ?? 0;
    if (seen === 0) order.push(row);
    counts.set(row, seen + 1);
  }
  return order.map((row) => {
    const count = counts.get(row) ?? 1;
    return count === 1 ? row : `${row} (${count})`;
  });
}

function exerciseRecords(inventory: Inventory, problems: string[]): void {
  for (const id of inventory.events) exerciseEvent(eventDef(id), id, problems);
  for (const id of inventory.lists) exerciseList(id, problems);
  for (const id of inventory.ships) exerciseShip(id, problems);
  for (const id of inventory.hulls) exerciseHull(id, problems);
  for (const id of inventory.bareShips) exerciseFaction(id, problems);
  for (const id of inventory.weapons) exerciseWeapon(id, problems);
  for (const id of inventory.drones) exerciseDrone(id, problems);
  for (const id of inventory.augments) exerciseAugment(id, problems);
  for (const id of inventory.crew) exerciseCrew(id, problems);
  for (const id of inventory.systems) exerciseSystem(id, problems);
  for (const id of inventory.sectors) exerciseSector(id, problems);
  for (const id of inventory.stores) exerciseStore(id, problems);
  for (const id of inventory.empties) exerciseEmpty(id, problems);
  for (const id of inventory.achievements) exerciseAchievement(id, problems);
  for (const id of inventory.blueprints) exerciseBlueprintList(id, problems);
  for (const id of inventory.texts) exerciseTextList(id, problems);
  if (inventory.rewards) exerciseRewards(problems);
  if (inventory.names)
    problems.push("the archive crew-name list is not used when someone joins the crew");
  if (inventory.facts) problems.push("the archive facts marker is not used");
  exerciseSectorTypes(inventory.sectorTypes, problems);
  exerciseDrawings(inventory.drawings, problems);
  exerciseStrings(inventory.strings, problems);
}

function exerciseEvent(page: EventDef | undefined, id: string, problems: string[]): void {
  if (!page) {
    problems.push(`event ${id} was not loaded`);
    return;
  }
  showPage(page, `event ${id}`, problems);
  walkChoices(page.choices, (choice) => pressChoice(id, choice, problems));
}

function exerciseList(id: string, problems: string[]): void {
  const list = fillerList(id);
  if (!list || list.entries.length < 1) {
    problems.push(`event list ${id} was not loaded`);
    return;
  }
  for (const entry of list.entries) {
    if (entry.page) {
      showPage(entry.page, `list ${id} page ${entry.id}`, problems);
      walkChoices(entry.page.choices, (choice) => pressChoice(entry.id, choice, problems));
      continue;
    }
    if (entry.id.endsWith("__HOSTILE_SHIP")) {
      exerciseHostileList(id, problems);
      continue;
    }
    if (!eventDef(entry.id) && !fillerList(entry.id)?.entries.length)
      problems.push(`event list ${id} entry ${entry.id} does not resolve`);
  }
}

function exerciseShip(id: string, problems: string[]): void {
  const def = shipEventDef(id);
  if (!def) {
    problems.push(`ship event ${id} was not loaded`);
    return;
  }
  const g = richGame();
  try {
    startCombat(g, id);
    step(g, 0.05);
  } catch (err) {
    problems.push(`ship event ${id}: ${message(err)}`);
    return;
  }
  if (g.fightShip !== id || !g.enemy) problems.push(`ship event ${id} did not start a fight`);
  for (const ending of [def.surrender, def.escape, def.destroyed, def.deadCrew, def.gotaway]) {
    if (!ending) continue;
    if (ending.page) {
      showPage(ending.page, `ship ${id} ending`, problems);
      walkChoices(ending.page.choices, (choice) => pressChoice(id, choice, problems));
    }
    if (ending.load && !eventDef(ending.load) && !(fillerList(ending.load)?.entries.length ?? 0))
      problems.push(`ship event ${id} loads missing ${ending.load}`);
  }
}

function exerciseHull(id: string, problems: string[]): void {
  if (!hullDef(id)) {
    problems.push(`hull ${id} was not loaded`);
    return;
  }
  const g = richGame();
  try {
    startCombat(g, id);
    step(g, 0.05);
  } catch (err) {
    problems.push(`hull ${id}: ${message(err)}`);
    return;
  }
  if (!g.enemy) {
    problems.push(`hull ${id} did not produce an enemy`);
    return;
  }
  if (id !== "boss" && !/flagship/i.test(id) && g.enemy.classId !== id)
    problems.push(`hull ${id} fought as ${g.enemy.classId ?? "an unnamed ship"}`);
}

function exerciseFaction(id: string, problems: string[]): void {
  const row = factionSurrender(id);
  if (!row) {
    problems.push(`ship blueprint ${id} is not a hull or a faction surrender`);
    return;
  }
  const plan = surrenderPlan(
    { tier: "scout", faction: id === "pirate" ? "rebel" : id, pirate: id === "pirate" },
    () => 0,
  );
  if (plan.chance !== row.chance || plan.threshold !== row.min)
    problems.push(`faction ${id} surrender is not what a fight offers`);
}

let weaponGame: Game | undefined;

function exerciseWeapon(id: string, problems: string[]): void {
  if (!weaponDef(id)) {
    problems.push(`weapon ${id} was not loaded`);
    return;
  }
  const g = weaponMount();
  const slot = g?.player.weapons[0];
  if (!g || !slot) {
    problems.push(`weapon ${id} has no slot to mount in`);
    return;
  }
  slot.defId = id;
  slot.charge = 0;
  try {
    step(g, 0.05);
  } catch (err) {
    problems.push(`weapon ${id}: ${message(err)}`);
    weaponGame = undefined;
    return;
  }
  if (slot.defId !== id) problems.push(`weapon ${id} did not stay mounted`);
  const anim = weaponDef(id)?.art ?? id;
  if (weaponFrame(id) == null && weaponFrame(anim) == null && clipLength(anim) > 0)
    problems.push(`weapon ${id} does not draw`);
}

function weaponMount(): Game | undefined {
  if (weaponGame && weaponGame.phase === "combat" && weaponGame.player.hull > 0 && weaponGame.enemy)
    return weaponGame;
  weaponGame = richGame();
  const foe = allHulls().find((hull) => hull.id !== playerHull().id) ?? playerHull();
  try {
    startCombat(weaponGame, foe.id);
  } catch {
    weaponGame = undefined;
    return undefined;
  }
  return weaponGame.player.weapons.length > 0 ? weaponGame : undefined;
}

function exerciseDrone(id: string, problems: string[]): void {
  const row = droneDef(id);
  if (!row) {
    problems.push(`drone ${id} was not loaded`);
    return;
  }
  const image = row.image ?? id;
  if (archiveBlob(`img/ship/drones/${image}_base.png`) && !droneLayerUrl(id, "base"))
    problems.push(`drone ${id} picture is not drawn`);
  if (canDeploy(id)) {
    const g = droneControlGame();
    if (!g?.player.kits.drones) {
      problems.push(`drone ${id} has no drone control to launch from`);
      return;
    }
    g.player.parts = 20;
    const foe = allHulls().find((hull) => hull.id !== playerHull().id) ?? playerHull();
    try {
      startCombat(g, foe.id);
      if (!deploy(g, id)) problems.push(`drone ${id} did not deploy`);
      else step(g, 0.05);
    } catch (err) {
      problems.push(`drone ${id}: ${message(err)}`);
    }
    return;
  }
  const carrier = allHulls().find(
    (hull) =>
      (hull.drones ?? []).includes(id) || (blueprintList(hull.droneLoad)?.includes(id) ?? false),
  );
  if (!carrier) {
    problems.push(`drone ${id} is not flown`);
    return;
  }
  const g = richGame();
  try {
    startCombat(g, carrier.id);
    step(g, 0.05);
  } catch (err) {
    problems.push(`drone ${id}: ${message(err)}`);
    return;
  }
  const kinds = [
    ...(g.enemy?.drones ?? []).map((unit) => unit.kind),
    ...(g.enemy?.kits.drones?.loadout ?? []),
    g.enemy?.kits.drones?.target,
  ];
  if (!kinds.includes(id))
    problems.push(`hull ${carrier.id} listed drone ${id} and did not fly it`);
}

function exerciseAugment(id: string, problems: string[]): void {
  const row = augmentDef(id);
  if (!row) {
    problems.push(`augment ${id} was not loaded`);
    return;
  }
  const carrier = allHulls().find((hull) => hull.augments.includes(id));
  if (carrier?.health != null) {
    const g = createGame(PLAY_SEED, carrier.id);
    if (!g.augments.includes(id)) problems.push(`hull ${carrier.id} did not fit ${id}`);
    else {
      try {
        step(g, 0.05);
      } catch (err) {
        problems.push(`augment ${id}: ${message(err)}`);
      }
    }
    return;
  }
  const g = richGame();
  g.augments = [];
  g.scrap = Math.max(g.scrap, row.cost + 1);
  if (installAugment(g, id as AugmentId)) {
    try {
      step(g, 0.05);
    } catch (err) {
      problems.push(`augment ${id}: ${message(err)}`);
    }
    return;
  }
  if (carrier) {
    const fight = richGame();
    try {
      startCombat(fight, carrier.id);
    } catch (err) {
      problems.push(`augment ${id}: ${message(err)}`);
      return;
    }
    if (!fight.enemy?.augments?.includes(id))
      problems.push(`enemy ${carrier.id} did not fit ${id}`);
    return;
  }
  problems.push(`augment ${id} cannot be fitted`);
}

function exerciseCrew(id: string, problems: string[]): void {
  const row = crewDef(id);
  if (row.id !== id) {
    problems.push(`crew ${id} was not loaded`);
    return;
  }
  const g = richGame();
  const before = g.crew.length;
  // A page grant is how an archive race comes aboard. The title (Rockman) is not the join name.
  const page: EventDef = {
    id: `cover-crew-${id}`,
    dest: row.name,
    flag: "",
    aliases: [],
    sectors: [],
    body: "",
    choices: [],
    grants: [{ kind: "crew", id }],
  };
  try {
    showArchivePage(g, page);
  } catch (err) {
    problems.push(`crew ${id}: ${message(err)}`);
    return;
  }
  const added = g.crew[g.crew.length - 1];
  if (g.crew.length !== before + 1 || !added)
    problems.push(`crew ${id} is not a race a grant can bring aboard`);
  else if (id !== "human" && added.kin === "human") problems.push(`crew ${id} joins as a human`);
  if (clipLength(`${id}_walk_down`) > 0 && !crewPoseFrame(id, "idle", 0))
    problems.push(`crew ${id} does not draw`);
}

function exerciseSystem(id: string, problems: string[]): void {
  if (!systemDef(id) && !tuneDef(id)) {
    problems.push(`system ${id} was not loaded`);
    return;
  }
  if ((MAINS as readonly string[]).includes(id)) {
    const g = richGame();
    for (const sys of MAINS) g.player.systems[sys].power = 0;
    g.player.reactor = 80;
    powerUp(g, id as SysId);
    if (g.player.systems[id as SysId].power <= 0) problems.push(`system ${id} did not take power`);
    const stepCost = tuneDef(id)?.costs[0];
    if (stepCost && upgradeCost(id as SysId, stepCost.level) !== stepCost.cost)
      problems.push(`system ${id} upgrade does not charge the archive price`);
    return;
  }
  if ((SUBSYSTEMS as readonly string[]).includes(id)) {
    exerciseSubsystem(id as (typeof SUBSYSTEMS)[number], problems);
    return;
  }
  const install = KIT_INSTALL[id as KitId];
  if (!install) {
    problems.push(`system ${id} has no power or install path`);
    return;
  }
  const hullId = id === "artillery" ? "PLAYER_SHIP_FED" : playerHull().id;
  if (id === "artillery" && !hullDef(hullId)) {
    problems.push("artillery has no Federation hull to mount on");
    return;
  }
  const g = createGame(PLAY_SEED, hullId);
  g.scrap = 1_000_000;
  const kit = id as KitId;
  if (!g.player.kits[kit]) install(g);
  if (!g.player.kits[kit]) problems.push(`system ${id} did not fit`);
  const tune = tuneDef(id);
  if (tune?.costs.length && upgradeCost(id as SysId, tune.costs[0]!.level) == null)
    problems.push(`system ${id} tune is not what an upgrade charges`);
}

/** Piloting, sensors, and doors take no reactor bars. The upgrade menu raises their level, and the fight reads it. */
function exerciseSubsystem(id: (typeof SUBSYSTEMS)[number], problems: string[]): void {
  const g = richGame();
  const sys = g.player.systems[id];
  if (sys.level <= 0) {
    problems.push(`system ${id} is not installed`);
    return;
  }
  const before = sys.level;
  g.scrap = 1_000_000;
  g.phase = "map";
  try {
    upgrade(g, id);
  } catch (err) {
    problems.push(`system ${id}: ${message(err)}`);
    return;
  }
  const price = tuneDef(id)?.costs.find((step) => step.level === before);
  if (price && upgradeCost(id, before) !== price.cost)
    problems.push(`system ${id} upgrade does not charge the archive price`);
  if (price && sys.level !== before + 1) problems.push(`system ${id} did not upgrade`);
  if (id === "doors" && doorLevel(g, g.player, "player") <= 0)
    problems.push(`system ${id} is not read`);
  if (id === "sensors" && sensorLevel(g, g.player, "player") <= 0)
    problems.push(`system ${id} is not read`);
  if (id === "pilot" && jumpBlocked(g) === "Piloting is down.")
    problems.push(`system ${id} does not let the ship jump`);
}

/**
 * A list entry ending in `__HOSTILE_SHIP` is not an event. The beacon mix marks that beacon hostile.
 * One sector mix covers every such entry in the lists that sector places.
 */
function exerciseHostileList(listId: string, problems: string[]): void {
  const list = fillerList(listId);
  const sector = allSectors().find((row) => row.quotas?.some((quota) => quota.id === listId));
  if (!list || !sector) {
    problems.push(`event list ${listId} hostile ship is not placed by a sector`);
    return;
  }
  const g = createGame(PLAY_SEED, playerHull().id);
  enterSector(g, sector.id);
  // A new array: the sector's first mix is remembered per beacon list, and the opening sector is already dealt.
  g.beacons = g.beacons.map((beacon) => ({ ...beacon, links: [...beacon.links] }));
  const sample = g.beacons.find(
    (beacon) => beacon.kind !== "start" && beacon.kind !== "exit" && beacon.kind !== "boss",
  );
  if (!sample) {
    problems.push(`event list ${listId} hostile ship is not placed`);
    return;
  }
  for (const beacon of g.beacons) {
    if (beacon.kind === "start" || beacon.kind === "exit" || beacon.kind === "boss") continue;
    beacon.kind = "empty";
    beacon.flag = "";
  }
  let n = 0;
  const add = (flag: string) => {
    n += 1;
    g.beacons.push({
      ...sample,
      id: `cover-${n}`,
      flag,
      kind: "event",
      links: [],
    });
  };
  // Every other entry is already on the map, so the mix's draw from this list is the hostile ship.
  for (const entry of list.entries) {
    if (!entry.id.endsWith("__HOSTILE_SHIP")) add(entry.id);
  }
  for (let i = 0; i < 40; i += 1) add("");
  if (!mixBeacons(g) || !g.beacons.some((beacon) => beacon.kind === "hostile"))
    problems.push(`event list ${listId} hostile ship is not placed`);
}

/** A hull that starts with Drone Control. The naked install is refused, so the bundle is the other way on. */
function droneControlGame(): Game | undefined {
  const carrier = allHulls().find(
    (hull) =>
      hull.health != null &&
      hull.installs?.some((item) => item.id === "drones" && item.start && item.power > 0),
  );
  const g = carrier ? createGame(PLAY_SEED, carrier.id) : richGame();
  g.scrap = 1_000_000;
  g.player.hull = 1_000_000;
  g.player.hullMax = 1_000_000;
  if (!g.player.kits.drones) installSwarmBundle(g, "COMBAT_1");
  return g.player.kits.drones ? g : undefined;
}

function exerciseSector(id: string, problems: string[]): void {
  const row = sectorDef(id);
  if (!row) {
    problems.push(`sector ${id} was not loaded`);
    return;
  }
  const g = richGame();
  enterSector(g, id);
  if (g.sectorId !== id || !g.sectorName.trim()) problems.push(`sector ${id} did not open`);
  if (row.quotas?.length && !mixBeacons(g)) problems.push(`sector ${id} quotas were not placed`);
  for (const track of row.tracks ?? []) {
    if (!musicTrack(track)?.explore) problems.push(`sector ${id} track ${track} does not play`);
  }
  if (row.startEvent) {
    const page = eventDef(row.startEvent);
    if (page) showPage(page, `sector ${id} start`, problems);
    else if (!(fillerList(row.startEvent)?.entries.length ?? 0))
      problems.push(`sector ${id} starts missing ${row.startEvent}`);
  }
}

function exerciseStore(id: string, problems: string[]): void {
  if (!storeDef(id)) {
    problems.push(`store ${id} was not loaded`);
    return;
  }
  const g = richGame();
  openStoreHere(g, id);
  if (g.phase !== "store" || (g.stock?.length ?? 0) < 1)
    problems.push(`store ${id} opened with nothing on the shelf`);
  leaveStore(g);
}

function exerciseEmpty(id: string, problems: string[]): void {
  const page = emptyBeacon(id);
  if (!page) {
    problems.push(`empty beacon ${id} was not loaded`);
    return;
  }
  try {
    if (page.nebula) {
      const slug = emptyPageFor("SLUG_HOME", true);
      const other = emptyPageFor("CIVILIAN", true);
      if (slug.id !== id && other.id !== id) problems.push(`empty beacon ${id} is never shown`);
      return;
    }
    const sector = page.sectors[0] ?? "NOT_A_REAL_SECTOR";
    if (emptyPageFor(sector, false).id !== id) problems.push(`empty beacon ${id} is never shown`);
  } catch (err) {
    problems.push(`empty beacon ${id}: ${message(err)}`);
  }
}

function exerciseAchievement(id: string, problems: string[]): void {
  const row = achievementDef(id);
  if (!row || !row.name.trim()) {
    problems.push(`achievement ${id} was not loaded`);
    return;
  }
  if (row.img && !archiveImage(row.img)) problems.push(`achievement ${id} image is not shown`);
  if (!isTracked(id) || !row.condition) {
    problems.push(`achievement ${id} has no condition the game can earn`);
    return;
  }
  try {
    conditionMet(richGame(), row.condition);
  } catch (err) {
    problems.push(`achievement ${id}: ${message(err)}`);
  }
}

function exerciseBlueprintList(id: string, problems: string[]): void {
  const names = blueprintList(id);
  if (!names) {
    problems.push(`blueprint list ${id} was not loaded`);
    return;
  }
  for (const name of names) {
    if (!knownBlueprint(name))
      problems.push(
        `blueprint list ${id} names ${name}, which is not a ship, weapon, drone, augment, crew, or system`,
      );
  }
  if (!listIsDrawn(id)) problems.push(`blueprint list ${id} is never drawn`);
}

function exerciseTextList(id: string, problems: string[]): void {
  const row = textList(id);
  if (!row) {
    problems.push(`text list ${id} was not loaded`);
    return;
  }
  if (
    row.lines.length > 0 &&
    !pickOpening(
      row.lines,
      (listId) => textList(listId)?.lines,
      () => 0,
    )
  )
    problems.push(`text list ${id} does not draw a line`);
}

function exerciseRewards(problems: string[]): void {
  if (!rewardTable()) {
    problems.push("the reward table was not loaded");
    return;
  }
  try {
    const [lo, hi] = scrapRange("normal", 1, "low");
    if (lo > hi) problems.push("the reward table scrap band is inverted");
  } catch (err) {
    problems.push(`reward table: ${message(err)}`);
  }
}

function exerciseStrings(strings: Map<string, string>, problems: string[]): void {
  if (strings.size === 0) return;
  const haystack = shownText();
  const missing: string[] = [];
  for (const [key, value] of strings) {
    if (value.trim().length < 6) continue;
    if (!haystack.includes(value)) missing.push(key);
  }
  if (missing.length === 0) return;
  const sample = missing.slice(0, 12).join(", ");
  problems.push(
    `${missing.length} string keys are never shown (${sample}${missing.length > 12 ? ", …" : ""})`,
  );
}

async function exerciseFiles(
  raw: FtlExtract,
  merged: FtlExtract,
  problems: string[],
): Promise<void> {
  const mergedAssets = new Set([...merged.assets.keys()].map((path) => path.toLowerCase()));
  const mergedText = new Map([...merged.text].map(([path, text]) => [path.toLowerCase(), text]));
  const audio = new Set<string>();
  for (const [path] of raw.assets) {
    const key = path.toLowerCase();
    if (!mergedAssets.has(key)) {
      problems.push(`${path} was dropped before the game loaded it`);
      continue;
    }
    if (key.endsWith(".png")) exerciseImage(path, problems);
    else if (key.endsWith(".wav") || key.endsWith(".ogg")) audio.add(key);
    else if (key.endsWith(".font") || key.endsWith(".ttf") || key.endsWith(".otf"))
      await exerciseFont(path, problems);
    else problems.push(`${path} has no reader`);
  }
  exerciseSounds(merged, audio, problems);
  exerciseAnimations(merged, problems);
  for (const [path] of raw.text) {
    const key = path.toLowerCase();
    const body = mergedText.get(key);
    if (body == null) {
      problems.push(`${path} was dropped before the game loaded it`);
      continue;
    }
    if (!key.endsWith(".txt")) {
      problems.push(`${path} is not a ship layout`);
      continue;
    }
    exerciseLayout(path, body, problems);
  }
}

function exerciseImage(path: string, problems: string[]): void {
  if (!archiveImage(path)) problems.push(`image ${path} is not shown`);
  const interior = /^img\/ship\/interior\/(.+)\.png$/i.exec(path);
  if (interior && !roomIconUrl(interior[1] ?? "")) problems.push(`room icon ${path} is not drawn`);
  const ship = /^img\/ship\/(.+)_(base|cloak|floor|shields1|gib(\d+))\.png$/i.exec(path);
  if (!ship) return;
  const stem = ship[1] ?? "";
  const hull = allHulls().find((row) => row.img === stem);
  if (!hull) return;
  const layer = (ship[2] ?? "").toLowerCase();
  const frame =
    layer === "base"
      ? shipImage(hull.id, "base")
      : layer === "cloak"
        ? shipImage(hull.id, "cloak")
        : layer === "floor"
          ? shipImage(hull.id, "floor")
          : layer === "shields1"
            ? shipImage(hull.id, "shield")
            : gibImage(hull.id, Number(ship[3]));
  if (!frame) problems.push(`ship image ${path} is not drawn on ${hull.id}`);
}

async function exerciseFont(path: string, problems: string[]): Promise<void> {
  const faces = new Set([...FONT_FACES, ...CJK_FACES].map((face) => face.path.toLowerCase()));
  if (!faces.has(path.toLowerCase())) problems.push(`font ${path} is not installed`);
  if (!path.toLowerCase().endsWith(".font")) return;
  const blob = archiveBlob(path);
  if (!blob) {
    problems.push(`font ${path} was not stored`);
    return;
  }
  const font = readBitmapFont(new Uint8Array(await blob.arrayBuffer()));
  if (!font || font.glyphs.length < 1) problems.push(`font ${path} does not parse`);
}

function exerciseSounds(merged: FtlExtract, audio: Set<string>, problems: string[]): void {
  const xml = merged.documents
    .filter((doc) => doc.path.toLowerCase().endsWith("sounds.xml"))
    .map((doc) => doc.xml);
  const sounds = mergeSounds(xml);
  const used = new Set<string>();
  for (const cue of sounds.cues) {
    used.add(cue.file.toLowerCase());
    const clip = soundCue(cue.name);
    if (!clip || clip.blob.size < 1) problems.push(`sound ${cue.name} is not played`);
  }
  for (const track of sounds.tracks) {
    used.add(track.explore.toLowerCase());
    if (track.combat) used.add(track.combat.toLowerCase());
    if (!musicTrack(track.name)?.explore) problems.push(`music ${track.name} does not play`);
  }
  for (const file of audio) {
    if (!used.has(file) && !extraPlaysAudio(file)) problems.push(`audio ${file} is never played`);
  }
}

function exerciseAnimations(merged: FtlExtract, problems: string[]): void {
  const xml = merged.documents
    .filter((doc) => doc.path.toLowerCase().endsWith("animations.xml"))
    .map((doc) => doc.xml);
  const anim = mergeAnimations(xml);
  for (const sheet of anim.sheets) {
    if (!archiveBlob(sheet.file)) problems.push(`sheet ${sheet.name} is missing ${sheet.file}`);
  }
  for (const clip of anim.clips) {
    if (!clipFrame(clip.name, 0)) problems.push(`animation ${clip.name} does not draw`);
  }
  for (const weapon of anim.weapons) {
    if (!weaponFrame(weapon.name)) problems.push(`weapon animation ${weapon.name} does not draw`);
  }
}

function exerciseLayout(path: string, text: string, problems: string[]): void {
  const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
  const stem = base.replace(/\.txt$/i, "");
  const hulls = allHulls().filter((hull) => hull.layout === stem);
  if (hulls.length === 0) {
    if (extraTextFile(path, text, problems)) return;
    problems.push(`layout ${stem} is not a hull`);
    return;
  }
  const grid = readGrid(text);
  if (!grid) {
    problems.push(`layout ${stem} did not parse`);
    return;
  }
  if (!hulls.some((hull) => hull.grid && hull.grid.rooms.length === grid.rooms.length))
    problems.push(`layout ${stem} is not on its hull`);
}

function showPage(page: EventDef, label: string, problems: string[]): void {
  const g = ready();
  for (const mark of page.marks ?? []) {
    if (mark.k !== "unlockShip") continue;
    const hullId = playerShipIds()[mark.id];
    if (hullId) g.unlocked = (g.unlocked ?? []).filter((id) => id !== hullId);
  }
  g.phase = "event";
  g.paused = true;
  g.event = {
    title: page.dest,
    body: page.body,
    choices: page.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  };
  let result: true | false | "unpaid";
  try {
    result = showArchivePage(g, page);
  } catch (err) {
    problems.push(`${label}: ${message(err)}`);
    return;
  }
  if (result === "unpaid") problems.push(`${label} could not be paid`);
  if (page.img && !archiveImage(page.img)) problems.push(`${label} image ${page.img} is not shown`);
  assertMarks(g, page.marks, label, problems);
  // A sector quota is not the only way in. Arrival itself opens the shop.
  if (page.store && !sectorPlaces(page.id) && (g.phase !== "store" || (g.stock?.length ?? 0) < 1))
    problems.push(`${label} opens a store and no sector places it`);
}

function pressChoice(pageId: string, choice: EventChoice, problems: string[]): void {
  const label = `choice ${choice.id} on ${pageId}`;
  if (!citedOwns(choice.id)) {
    if (!payload(choice)) {
      problems.push(`${label} is not a button the game can press`);
      return;
    }
    const g = ready();
    try {
      applyChoiceArchive(g, choice.id, archiveSnap(g));
    } catch (err) {
      problems.push(`${label}: ${message(err)}`);
      return;
    }
    assertMarks(g, choice.marks, label, problems);
    return;
  }
  const g = ready();
  g.phase = "event";
  g.paused = true;
  g.event = { title: pageId, body: "", choices: [{ id: choice.id, label: choice.label }] };
  for (const mark of choice.marks ?? []) {
    if (mark.k !== "unlockShip") continue;
    const hullId = playerShipIds()[mark.id];
    if (hullId) g.unlocked = (g.unlocked ?? []).filter((id) => id !== hullId);
  }
  try {
    choose(g, choice.id);
  } catch (err) {
    problems.push(`${label}: ${message(err)}`);
    return;
  }
  const refused = g.event?.choices.some((button) => button.id === choice.id) ?? false;
  if (!refused) assertMarks(g, choice.marks, label, problems);
}

function assertMarks(
  g: Game,
  marks: readonly ArchiveMark[] | undefined,
  label: string,
  problems: string[],
): void {
  if (g.phase === "defeat") return;
  const here = g.beacons.find((beacon) => beacon.id === g.here);
  for (const mark of marks ?? []) {
    if (mark.k === "quest" && !questPlaced(g, mark.event))
      problems.push(`${label} did not place quest ${mark.event}`);
    else if (mark.k === "distressBeacon" && here && here.kind !== "distress")
      problems.push(`${label} did not mark a distress beacon`);
    else if (mark.k === "repair" && !here?.repair)
      problems.push(`${label} did not mark a repair beacon`);
    else if (mark.k === "fleet" && g.fleet <= 0)
      problems.push(`${label} did not advance the fleet`);
    else if (mark.k === "revealMap" && g.beacons.some((beacon) => !beacon.known))
      problems.push(`${label} did not reveal the map`);
    else if (mark.k === "secretSector" && !g.secretSector && g.sectorId !== CRYSTAL_SECTOR)
      problems.push(`${label} did not open the secret sector`);
    else if (mark.k === "unlockShip") {
      const hullId = playerShipIds()[mark.id];
      if (!hullId) problems.push(`${label} unlock ${mark.id} is past the player ship list`);
      else if (!g.unlocked?.includes(hullId)) problems.push(`${label} did not unlock a ship`);
    }
  }
}

function scan(raw: FtlExtract, problems: string[]): Inventory {
  const inventory: Inventory = {
    weapons: new Set(),
    augments: new Set(),
    drones: new Set(),
    systems: new Set(),
    crew: new Set(),
    hulls: new Set(),
    bareShips: new Set(),
    events: new Set(),
    lists: new Set(),
    blueprints: new Set(),
    texts: new Set(),
    sectors: new Set(),
    ships: new Set(),
    stores: new Set(),
    achievements: new Set(),
    empties: new Set(),
    rewards: false,
    names: false,
    facts: false,
    strings: new Map(),
    sectorTypes: [],
    drawings: new Map(),
    unknown: [],
  };
  const parser = new DOMParser({ errorHandler: () => {} });
  for (const doc of raw.documents) {
    const name = fileName(doc.path);
    if (TRANSLATION.test(name)) continue;
    const root = parser.parseFromString(doc.xml, "text/xml").documentElement;
    if (!root) {
      problems.push(`${doc.path} did not parse`);
      continue;
    }
    if (!STRING_TABLE.test(name) && !mediaFile(name)) {
      for (const node of children(root)) readRecord(node, doc.path, inventory);
      walk(root, (node) => {
        if (node.tagName !== "textList") return;
        const id = attr(node, "name");
        if (id) inventory.texts.add(id);
      });
    }
    if (!TRANSLATION.test(name)) {
      walk(root, (node) => {
        if (node.tagName !== "text") return;
        const key = attr(node, "name");
        const value = textOf(node);
        if (key && value) inventory.strings.set(key, value);
      });
    }
  }
  for (const row of inventory.unknown) problems.push(row);
  return inventory;
}

function readRecord(node: XmlEl, path: string, inventory: Inventory): void {
  const tag = node.tagName;
  const name = attr(node, "name");
  const id = attr(node, "id");
  if (tag === "weaponBlueprint" && name) inventory.weapons.add(name);
  else if (tag === "augBlueprint" && name) inventory.augments.add(name);
  else if (tag === "droneBlueprint" && name) inventory.drones.add(name);
  else if (tag === "systemBlueprint" && name) inventory.systems.add(name);
  else if (tag === "crewBlueprint" && name) inventory.crew.add(name);
  else if (tag === "shipBlueprint" && name) {
    if (attr(node, "layout")) inventory.hulls.add(name);
    else inventory.bareShips.add(name);
  } else if (tag === "event" && name) inventory.events.add(name);
  else if (tag === "eventList" && name) {
    // An empty list is a placeholder. The loader skips it, and there is no page to play.
    if (children(node).some((item) => item.tagName === "event")) inventory.lists.add(name);
  } else if (tag === "blueprintList" && name) inventory.blueprints.add(name);
  else if (tag === "textList" && name) inventory.texts.add(name);
  else if (tag === "sectorDescription" && name) inventory.sectors.add(name);
  else if (tag === "ship" && name) inventory.ships.add(name);
  else if (tag === "customStore" && id) inventory.stores.add(id);
  else if (tag === "emptyBeacon" && name) inventory.empties.add(name);
  else if (tag === "achievement" && id) inventory.achievements.add(id);
  else if (tag === "rewards") inventory.rewards = true;
  else if (tag === "names") inventory.names = true;
  else if (tag === "facts") inventory.facts = true;
  else if (tag === "text" && name) return;
  else if (tag === "sectorType") noteSectorType(node, inventory);
  else if (DRAWING_TAGS.has(tag)) noteDrawing(node, path, inventory);
  else if (extraOwnsTag(tag)) return;
  else inventory.unknown.push(`${path} has unused <${tag}>`);
}

/** Colour lists the chart draws from. The winning list is `OVERRIDE_` when that name is present. */
function noteSectorType(node: XmlEl, inventory: Inventory): void {
  const sectors = children(node)
    .filter((item) => item.tagName === "sector")
    .map((item) => textOf(item))
    .filter(Boolean);
  inventory.sectorTypes.push({ name: attr(node, "name"), sectors });
}

function exerciseSectorTypes(lists: readonly SectorTypeList[], problems: string[]): void {
  const byName = new Map(lists.map((row) => [row.name, row.sectors]));
  const expected = new Map<string, string>();
  for (const [type, group] of Object.entries(SECTOR_TYPE_GROUPS)) {
    for (const id of byName.get(`OVERRIDE_${type}`) ?? byName.get(type) ?? []) {
      if (!expected.has(id)) expected.set(id, group);
    }
  }
  for (const row of lists) {
    const base = row.name.replace(/^OVERRIDE_/, "");
    if (!SECTOR_TYPE_GROUPS[base]) {
      if (extraSectorType(row.name, row.sectors, problems)) continue;
      problems.push(`sector type ${row.name || "(unnamed)"} is not a chart colour`);
      continue;
    }
    const winning = byName.has(`OVERRIDE_${base}`) ? `OVERRIDE_${base}` : base;
    if (row.name !== winning) continue;
    for (const id of row.sectors) {
      const sector = sectorDef(id);
      const colour = expected.get(id);
      if (!sector) problems.push(`sector type ${row.name} names ${id}, which was not loaded`);
      else if (sector.group !== colour)
        problems.push(`sector ${id} is not coloured ${colour ?? "from its list"}`);
    }
  }
}

/**
 * `data/<layout>.xml` is the hull picture, mounts, glow, offsets, and explosion.
 * A file whose stem is not a hull layout was not attached.
 */
function noteDrawing(node: XmlEl, path: string, inventory: Inventory): void {
  const stem = drawingStem(path);
  if (!stem) {
    inventory.unknown.push(`${path} has unused <${node.tagName}>`);
    return;
  }
  const drawing = inventory.drawings.get(stem) ?? {
    path,
    img: false,
    glow: false,
    cloak: false,
    floor: false,
    mounts: 0,
    gibs: [],
  };
  const tag = node.tagName;
  if (tag === "img" && boxComplete(node)) drawing.img = true;
  else if (tag === "glowOffset" && intAttr(node, "x") != null && intAttr(node, "y") != null)
    drawing.glow = true;
  else if (tag === "offsets") {
    for (const item of children(node)) {
      if (intAttr(item, "x") == null || intAttr(item, "y") == null) continue;
      if (item.tagName === "cloak") drawing.cloak = true;
      if (item.tagName === "floor") drawing.floor = true;
    }
  } else if (tag === "weaponMounts") {
    drawing.mounts = children(node).filter(
      (item) => item.tagName === "mount" && mountComplete(item),
    ).length;
  } else if (tag === "explosion") {
    drawing.gibs = children(node)
      .filter((item) => gibComplete(item))
      .map((item) => Number(/^gib(\d+)$/i.exec(item.tagName)?.[1]));
  }
  inventory.drawings.set(stem, drawing);
}

function exerciseDrawings(drawings: ReadonlyMap<string, DrawingBits>, problems: string[]): void {
  for (const [stem, drawing] of drawings) {
    const hulls = allHulls().filter((hull) => hull.layout === stem);
    if (hulls.length === 0) {
      problems.push(`drawing ${drawing.path} is not a hull`);
      continue;
    }
    if (drawing.img) {
      const hull = hulls.find((row) => row.picture);
      if (!hull?.picture) problems.push(`drawing ${stem} image box is not on a hull`);
      else {
        const frame = pictureFrame(hull.picture);
        if (!(frame.width > 0) || !(frame.height > 0))
          problems.push(`drawing ${stem} image box does not place`);
        else if (
          hull.img &&
          archiveBlob(`img/ship/${hull.img}_base.png`) &&
          !shipImage(hull.id, "base")
        )
          problems.push(`drawing ${stem} is not drawn`);
      }
    }
    if (drawing.glow && !hulls.some((row) => row.glow))
      problems.push(`drawing ${stem} glow is not on a hull`);
    if (drawing.cloak) exerciseOffset(hulls, stem, "cloak", problems);
    if (drawing.floor) exerciseOffset(hulls, stem, "floor", problems);
    if (drawing.mounts > 0) {
      const hull = hulls.find((row) => row.mounts?.length === drawing.mounts && row.picture);
      if (!hull?.picture || !hull.mounts) problems.push(`drawing ${stem} mounts are not on a hull`);
      else {
        for (const mount of hull.mounts) {
          const pose = mountPose(hull.picture, mount, true, {
            x: hull.grid?.x,
            y: hull.grid?.y,
          });
          if (!Number.isFinite(pose.x) || !Number.isFinite(pose.y)) {
            problems.push(`drawing ${stem} mount does not place a gun`);
            break;
          }
        }
      }
    }
    if (drawing.gibs.length > 0) {
      const hull = hulls.find((row) =>
        drawing.gibs.every((id) => row.gibs?.some((gib) => gib.id === id)),
      );
      if (!hull) {
        problems.push(`drawing ${stem} explosion is not on a hull`);
        continue;
      }
      const frames = new Set(gibImages(hull.id).map((frame) => frame.url));
      for (const id of drawing.gibs) {
        if (!hull.img || !archiveBlob(`img/ship/${hull.img}_gib${id}.png`)) continue;
        if (!gibImage(hull.id, id) || frames.size < 1)
          problems.push(`drawing ${stem} gib ${id} is not drawn`);
      }
    }
  }
}

function exerciseOffset(
  hulls: readonly {
    id: string;
    img?: string;
    cloak?: string;
    floor?: string;
    cloakOffset?: { x: number; y: number };
    floorOffset?: { x: number; y: number };
  }[],
  stem: string,
  layer: "cloak" | "floor",
  problems: string[],
): void {
  const hull = hulls.find((row) => (layer === "cloak" ? row.cloakOffset : row.floorOffset));
  if (!hull) {
    problems.push(`drawing ${stem} ${layer} offset is not on a hull`);
    return;
  }
  const name = layer === "cloak" ? (hull.cloak ?? hull.img) : (hull.floor ?? hull.img);
  if (name && archiveBlob(`img/ship/${name}_${layer}.png`) && !shipImage(hull.id, layer))
    problems.push(`drawing ${stem} ${layer} offset is not drawn`);
}

function shownText(): string {
  const parts: string[] = [];
  const push = (value: string | undefined) => {
    if (value) parts.push(value);
  };
  const pushPage = (page: EventDef | undefined) => {
    push(page?.dest);
    push(page?.body);
    for (const line of page?.texts ?? []) push(line);
    for (const line of page?.openings ?? []) if ("text" in line) push(line.text);
    for (const fx of page?.fx ?? []) if (fx.k === "note") push(fx.text);
    for (const grant of page?.grants ?? []) push(grant.name);
    for (const alter of page?.alters ?? []) if (alter.k === "removeCrew") push(alter.text);
    walkChoices(page?.choices, (choice) => {
      push(choice.label);
      for (const fx of choice.fx) if (fx.k === "note") push(fx.text);
      for (const grant of choice.grants ?? []) push(grant.name);
      for (const alter of choice.alters ?? []) if (alter.k === "removeCrew") push(alter.text);
    });
  };
  for (const event of allEvents()) pushPage(event);
  for (const list of allFillerLists()) for (const entry of list.entries) pushPage(entry.page);
  for (const ship of allShipEvents()) {
    for (const ending of [ship.surrender, ship.escape, ship.destroyed, ship.deadCrew, ship.gotaway])
      pushPage(ending?.page);
  }
  for (const row of allWeapons()) {
    push(row.name);
    push(row.blurb);
    for (const line of weaponCopy(row)) push(line);
  }
  for (const row of allAugments()) {
    push(row.name);
    push(row.detail);
  }
  for (const row of allDrones()) {
    push(row.name);
    for (const line of droneCopy(row)) push(line);
  }
  for (const row of allCrew()) {
    push(row.name);
    for (const line of crewCopy(row)) push(line);
  }
  for (const row of allSystems()) {
    push(row.name);
    push(row.detail);
  }
  for (const row of allHulls()) {
    push(row.name);
    push(row.cruiser);
    push(row.quote);
    push(row.unlock);
  }
  for (const row of allSectors()) {
    push(row.name);
    push(row.short);
    for (const note of row.notes) push(note);
  }
  push(civilianSectorTitle());
  for (const row of allAchievements()) {
    push(row.name);
    push(row.short);
    push(row.desc);
  }
  for (const row of allStores()) {
    push(row.name);
    for (const line of row.lines) push(line.name);
  }
  for (const row of allEmptyBeacons()) {
    push(row.dest);
    for (const line of row.texts) push(line);
  }
  for (const line of tutorialLines()) push(line);
  for (const line of helpListLines()) push(line);
  for (const line of verdictListLines()) push(line);
  for (const line of itemLines()) push(line);
  for (const line of allInterfaceLines()) push(line);
  return parts.join("\n");
}

function knownBlueprint(name: string): boolean {
  return Boolean(
    hullDef(name) ||
    weaponDef(name) ||
    droneDef(name) ||
    augmentDef(name) ||
    systemDef(name) ||
    crewDef(name).id === name,
  );
}

function listRefs(): string[] {
  const refs: string[] = [];
  const add = (id: string | undefined) => {
    if (id) refs.push(id);
  };
  const addPage = (page: EventDef | undefined) => {
    if (!page) return;
    add(page.ship?.autoBlueprint);
    for (const grant of page.grants ?? []) add(grant.id);
    walkChoices(page.choices, (choice) => {
      add(choice.ship?.autoBlueprint);
      for (const grant of choice.grants ?? []) add(grant.id);
      for (const req of choice.reqs ?? []) if (req.k === "list") add(req.id);
    });
  };
  for (const hull of allHulls()) {
    add(hull.weaponLoad);
    add(hull.droneLoad);
  }
  for (const ship of allShipEvents()) {
    add(ship.autoBlueprint);
    for (const ending of [ship.surrender, ship.escape, ship.destroyed, ship.deadCrew, ship.gotaway])
      addPage(ending?.page);
  }
  for (const event of allEvents()) addPage(event);
  for (const list of allFillerLists()) for (const entry of list.entries) addPage(entry.page);
  return refs;
}

/**
 * A list is drawn when a hull load or a ship autoBlueprint names it.
 * Advanced Edition substitutes `OVERRIDE_` plus that id when the override list exists,
 * and that substituted id is the list `listNames` and `fightHull` read.
 */
function listIsDrawn(id: string): boolean {
  if (listWasPlayed(id)) return true;
  for (const ref of listRefs()) {
    if (ref === id) return true;
    if (!ref.startsWith("OVERRIDE_") && `OVERRIDE_${ref}` === id && blueprintList(id)) return true;
  }
  return false;
}

function sectorPlaces(id: string): boolean {
  for (const sector of allSectors()) {
    if (sector.startEvent === id) return true;
    for (const quota of sector.quotas ?? []) {
      if (quota.id === id) return true;
      if (fillerList(quota.id)?.entries.some((entry) => entry.id === id)) return true;
    }
  }
  return false;
}

function ready(): Game {
  if (
    !shown ||
    shown.phase === "defeat" ||
    shown.player.hull <= 0 ||
    (shown.phase !== "map" && shown.phase !== "event")
  ) {
    shown = richGame();
  }
  const here = shown.beacons.find((beacon) => beacon.id === shown!.here);
  if (here && here.kind !== "start" && here.kind !== "exit" && here.kind !== "boss") {
    here.kind = "event";
    here.repair = false;
  }
  shown.fleet = 0;
  shown.secretSector = false;
  shown.questsNext = [];
  for (const beacon of shown.beacons) {
    beacon.known = false;
    delete beacon.quest;
  }
  shown.scrap = 1_000_000;
  shown.fuel = 1_000;
  shown.missiles = 1_000;
  shown.player.parts = 1_000;
  return shown;
}

function richGame(): Game {
  const g = freshGame();
  g.scrap = 1_000_000;
  g.fuel = 1_000;
  g.missiles = 1_000;
  g.player.parts = 1_000;
  g.player.hull = 1_000_000;
  g.player.hullMax = 1_000_000;
  g.player.reactor = 80;
  const spot = g.beacons.find(
    (beacon) => beacon.kind !== "start" && beacon.kind !== "exit" && beacon.kind !== "boss",
  );
  if (spot) g.here = spot.id;
  return g;
}

function questPlaced(g: Game, id: string): boolean {
  return (g.questsNext ?? []).includes(id) || g.beacons.some((beacon) => beacon.quest === id);
}

function payload(choice: EventChoice): boolean {
  return Boolean(
    choice.marks?.length ||
    choice.ship ||
    choice.boarders ||
    choice.grants?.length ||
    choice.reward ||
    choice.alters?.length ||
    choice.environment ||
    choice.img,
  );
}

function walkChoices(
  choices: readonly EventChoice[] | undefined,
  visit: (choice: EventChoice) => void,
): void {
  for (const choice of choices ?? []) {
    visit(choice);
    walkChoices(choice.choices, visit);
  }
}

function polyfillObjectUrl(): void {
  const url = URL as typeof URL & {
    createObjectURL?: (blob: Blob) => string;
    revokeObjectURL?: (objectUrl: string) => void;
  };
  if (typeof url.createObjectURL === "function") return;
  let n = 0;
  url.createObjectURL = () => `blob:archive/${(n += 1)}`;
  url.revokeObjectURL = () => {};
}

function mediaFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith("animations.xml") || lower.endsWith("sounds.xml");
}

function fileName(path: string): string {
  return path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
}

function children(node: XmlEl): XmlEl[] {
  const out: XmlEl[] = [];
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes.item(i);
    if (child && child.nodeType === 1) out.push(child as XmlEl);
  }
  return out;
}

function walk(node: XmlEl, visit: (node: XmlEl) => void): void {
  visit(node);
  for (const child of children(node)) walk(child, visit);
}

function attr(node: XmlEl, name: string): string {
  return node.getAttribute(name)?.trim() ?? "";
}

function textOf(node: XmlEl): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes.item(i);
    if (child && child.nodeType === 3)
      text += (child as { nodeValue?: string | null }).nodeValue ?? "";
  }
  return text.trim();
}

/** Drawing files are `data/<layout>.xml`. An append is patched onto that file before pictures attach. */
function drawingStem(path: string): string {
  const name = fileName(path);
  const lower = name.toLowerCase();
  if (!lower.endsWith(".xml") || lower.endsWith(".xml.append")) return "";
  return name.slice(0, -".xml".length);
}

function boxComplete(node: XmlEl): boolean {
  const w = numAttr(node, "w");
  const h = numAttr(node, "h");
  return (
    numAttr(node, "x") != null &&
    numAttr(node, "y") != null &&
    w != null &&
    h != null &&
    w > 0 &&
    h > 0
  );
}

function mountComplete(node: XmlEl): boolean {
  const rotate = attr(node, "rotate");
  const mirror = attr(node, "mirror");
  return (
    intAttr(node, "x") != null &&
    intAttr(node, "y") != null &&
    intAttr(node, "gib") != null &&
    (rotate === "true" || rotate === "false") &&
    (mirror === "true" || mirror === "false")
  );
}

function gibComplete(node: XmlEl): boolean {
  const id = Number(/^gib(\d+)$/i.exec(node.tagName)?.[1]);
  if (!Number.isInteger(id) || id < 1) return false;
  if (intText(node, "x") == null || intText(node, "y") == null) return false;
  return ["velocity", "direction", "angular"].every((tag) => {
    const found = children(node).find((item) => item.tagName === tag);
    return found != null && numAttr(found, "min") != null && numAttr(found, "max") != null;
  });
}

function intText(node: XmlEl, tag: string): number | undefined {
  const found = children(node).find((item) => item.tagName === tag);
  if (!found) return undefined;
  const value = Number(textOf(found));
  return Number.isInteger(value) ? value : undefined;
}

function intAttr(node: XmlEl, name: string): number | undefined {
  const value = numAttr(node, name);
  return value != null && Number.isInteger(value) ? value : undefined;
}

function numAttr(node: XmlEl, name: string): number | undefined {
  const raw = node.getAttribute(name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
