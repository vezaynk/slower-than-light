import { Node, type Document as XmlDocument, type Element as XmlElement } from "@xmldom/xmldom";
import type {
  ArchiveBoarders,
  ArchiveGrant,
  ArchiveReward,
  ArchiveShip,
  ContentPack,
  CrewColor,
  CrewDef,
  EventChoice,
  EventDef,
  EventEffect,
  EventResource,
  FillerListDef,
  HullCrewCount,
  HullDef,
  HullGrid,
  HullInstall,
  SectorDef,
  SectorQuota,
  SectorRarity,
  SystemDef,
  SystemSlot,
  TuneDef,
  TuneStep,
} from "./types.ts";
import { cloneGrid, readGrids } from "./grid.ts";
import { attachPictures } from "./picture.ts";
import {
  attr,
  child,
  elements,
  numOf,
  readAugment,
  readDocument,
  readDrone,
  readWeapon,
  tagged,
  textOf,
} from "./parse.ts";

/**
 * FTL system ids that install into a kit slot. Artillery ids share that slot.
 * Every other system id installs as a system.
 */
const KIT_SYSTEMS = new Set([
  "battery",
  "cloaking",
  "clonebay",
  "drones",
  "hacking",
  "mind",
  "teleporter",
]);

export type FtlBlueprintFile = {
  path: string;
  xml: string;
};

/** One layout file. `path` is the archive path, such as `data/kestral.txt`. */
export type FtlTextFile = {
  path: string;
  text: string;
};

/**
 * Blueprint catalogs, ships, sectors, and events from archive XML.
 * Files are applied in order, and a later record with the same id replaces the earlier one.
 * Crew combat stats stay at neutral defaults. A `<facts/>` marker and a `<names>` list are kept.
 * Stores and the numeric rewards table are not in the archive, and this catalog does not invent them.
 * `layouts` are the `data/*.txt` room grids. A ship keeps its layout file name, and the grid is
 * attached when that file is in the list. Layout text is not inside the XML.
 * `data/<layout>.xml` contributes the `<img>` box. Image bytes stay off this catalog.
 */
export function packFromFtl(
  documents: readonly FtlBlueprintFile[],
  layouts: readonly FtlTextFile[] = [],
): ContentPack {
  const weapons = new Catalog<NonNullable<ContentPack["weapons"]>[number]>();
  const augments = new Catalog<NonNullable<ContentPack["augments"]>[number]>();
  const drones = new Catalog<NonNullable<ContentPack["drones"]>[number]>();
  const systems = new Catalog<SystemDef>();
  const tunes = new Catalog<TuneDef>();
  const crew = new Catalog<CrewDef>();
  const hulls = new Catalog<HullDef>();
  const sectors = new Catalog<SectorDef>();
  const events = new Catalog<EventDef>();
  const lists = new Catalog<FillerListDef>();
  const strings = new Map<string, string>();
  const grids = readGrids(layouts);
  let facts = false;
  let names: ContentPack["names"];
  const parsed: XmlDocument[] = [];
  for (const source of documents) {
    try {
      parsed.push(readDocument(source.xml));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`${source.path}: ${detail}`);
    }
  }
  for (const doc of parsed) collectStrings(doc, strings);
  for (const doc of parsed) {
    for (const node of tagged(doc, "weaponBlueprint")) {
      const row = readWeapon(node);
      if (row) weapons.put(row);
    }
    for (const node of tagged(doc, "augBlueprint")) {
      const row = readAugment(node);
      if (row) augments.put(row);
    }
    for (const node of tagged(doc, "droneBlueprint")) {
      const row = readDrone(node);
      if (row) drones.put(row);
    }
    for (const node of tagged(doc, "systemBlueprint")) {
      const read = readFtlSystem(node);
      if (!read) continue;
      systems.put(read.system);
      tunes.put(read.tune);
    }
    for (const node of tagged(doc, "crewBlueprint")) {
      const row = readFtlCrew(node);
      if (row) crew.put(row);
    }
    if (tagged(doc, "facts").length > 0) facts = true;
    const read = readNames(doc);
    if (read) names = read;
    for (const node of tagged(doc, "shipBlueprint")) {
      const row = readFtlHull(node, strings, grids);
      if (row) hulls.put(row);
    }
    for (const node of tagged(doc, "sectorDescription")) {
      const row = readFtlSector(node, strings);
      if (row) sectors.put(row);
    }
    for (const node of tagged(doc, "event")) {
      const row = readFtlEvent(node, strings);
      if (row) events.put(row);
    }
    for (const node of tagged(doc, "eventList")) {
      const row = readFtlList(node, strings);
      if (row) lists.put(row);
    }
  }
  const pack: ContentPack = {
    weapons: weapons.rows,
    augments: augments.rows,
    drones: drones.rows,
    systems: systems.rows,
    tunes: tunes.rows,
  };
  if (crew.rows.length > 0) pack.crew = crew.rows;
  if (hulls.rows.length > 0) pack.hulls = hulls.rows;
  if (sectors.rows.length > 0) pack.sectors = sectors.rows;
  if (events.rows.length > 0) pack.events = events.rows;
  if (lists.rows.length > 0) pack.lists = lists.rows;
  if (facts) pack.facts = true;
  if (names) pack.names = names;
  attachPictures(pack.hulls, documents);
  return pack;
}

function readNames(doc: XmlDocument): ContentPack["names"] | undefined {
  const node = tagged(doc, "names")[0];
  if (!node) return undefined;
  const pool: string[] = [];
  const syllables: string[] = [];
  for (const item of elements(node)) {
    const text = item.textContent?.trim() ?? "";
    if (!text) continue;
    if (item.tagName === "pool") pool.push(text);
    if (item.tagName === "syllable") syllables.push(text);
  }
  if (!pool.length && !syllables.length) return undefined;
  return { pool, syllables };
}

function readFtlCrew(node: XmlElement): CrewDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const row: CrewDef = {
    id,
    name: textOf(node, "title") ?? id,
    hp: 100,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
    bonusPower: 0,
    hasDeathExplosion: false,
    drainsOxygen: false,
    detectsLifeforms: false,
    resistsMindControl: false,
    lockdown: false,
    lockCooldown: 0,
    fireRepairMultiplier: 1,
  };
  const detail = textOf(node, "desc");
  if (detail) row.detail = detail;
  const cost = numOf(node, "cost");
  if (cost != null) row.cost = cost;
  const colors = readCrewColors(child(node, "colorList"));
  if (colors.length > 0) row.colors = colors;
  return row;
}

/** `<colorList><layer><color r g b a/>…</layer>…</colorList>`. A colour missing a channel is skipped. */
function readCrewColors(list: XmlElement | undefined): CrewColor[][] {
  const layers: CrewColor[][] = [];
  for (const layer of elements(list)) {
    if (layer.tagName !== "layer") continue;
    const colors: CrewColor[] = [];
    for (const node of elements(layer)) {
      if (node.tagName !== "color") continue;
      const [r, g, b, a] = ["r", "g", "b", "a"].map((name) => Number(attr(node, name) ?? NaN));
      if (![r, g, b, a].every((value) => Number.isFinite(value))) continue;
      colors.push({ r: r!, g: g!, b: b!, a: a! });
    }
    layers.push(colors);
  }
  return layers;
}

class Catalog<T extends { id: string }> {
  readonly rows: T[] = [];
  private readonly index = new Map<string, number>();

  put(row: T) {
    const at = this.index.get(row.id);
    if (at == null) {
      this.index.set(row.id, this.rows.length);
      this.rows.push(row);
      return;
    }
    this.rows[at] = row;
  }
}

function readFtlSystem(node: XmlElement): { system: SystemDef; tune: TuneDef } | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const system: SystemDef = {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
    slot: systemSlot(id, node),
  };
  const detail = textOf(node, "desc");
  if (detail) system.detail = detail;
  return {
    system,
    tune: {
      id,
      start: numOf(node, "startPower") ?? 1,
      costs: upgradeCosts(node),
    },
  };
}

function systemSlot(id: string, node: XmlElement): SystemSlot {
  const written = textOf(node, "slot");
  if (written === "kit" || written === "sys") return written;
  if (KIT_SYSTEMS.has(id) || id.startsWith("artillery")) return "kit";
  return "sys";
}

/** The first upgradeCost level is the scrap to leave level 1. */
function upgradeCosts(node: XmlElement): TuneStep[] {
  const costs: TuneStep[] = [];
  let level = 1;
  for (const item of elements(child(node, "upgradeCost"))) {
    if (item.tagName !== "level") continue;
    const cost = Number(item.textContent?.trim());
    if (!Number.isFinite(cost)) continue;
    costs.push({ level, cost });
    level += 1;
  }
  return costs;
}

function collectStrings(doc: XmlDocument, strings: Map<string, string>) {
  for (const node of tagged(doc, "text")) {
    if (attr(node, "language")?.trim()) continue;
    const key = attr(node, "name")?.trim();
    if (!key) continue;
    const value = ownText(node).trim();
    if (value) strings.set(key, value);
  }
}

function ownText(node: XmlElement): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const item = node.childNodes.item(i);
    if (!item) continue;
    if (item.nodeType === Node.TEXT_NODE || item.nodeType === Node.CDATA_SECTION_NODE)
      text += item.nodeValue ?? "";
  }
  return text;
}

function intAttr(node: XmlElement | undefined, name: string): number | undefined {
  if (!node) return undefined;
  const raw = node.getAttribute(name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

/** Written text, or the string table entry for an id. An unknown id stays the key. */
function resolveText(node: XmlElement, strings: Map<string, string>): string | undefined {
  const written = ownText(node).trim();
  if (written) return written;
  const key = attr(node, "id")?.trim();
  if (!key) return undefined;
  return strings.get(key) ?? key;
}

function elementString(
  node: XmlElement,
  tag: string,
  strings: Map<string, string>,
): string | undefined {
  const found = child(node, tag);
  return found ? resolveText(found, strings) : undefined;
}

function rootChild(node: XmlElement): boolean {
  return node.parentNode === node.ownerDocument?.documentElement;
}

function amountOf(node: XmlElement, tag: string): number | undefined {
  return intAttr(child(node, tag), "amount");
}

function readFtlHull(
  node: XmlElement,
  strings: Map<string, string>,
  grids: Map<string, HullGrid>,
): HullDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  const layout = attr(node, "layout")?.trim();
  if (!id || !layout) return undefined;
  const weapons = namedTags(child(node, "weaponList"), "weapon");
  const drones = namedTags(child(node, "droneList"), "drone");
  const augments: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "aug") continue;
    const augment = attr(item, "name")?.trim();
    if (augment) augments.push(augment);
  }
  const hull: HullDef = {
    id,
    cruiser: elementString(node, "class", strings) ?? "",
    layout,
    name: elementString(node, "name", strings) ?? elementString(node, "title", strings) ?? id,
    quote: elementString(node, "desc", strings) ?? "",
    unlock: elementString(node, "unlock", strings) ?? "",
    source: "",
    reactor: amountOf(node, "maxPower") ?? numOf(node, "reactor") ?? 0,
    fuel: numOf(node, "fuel") ?? 0,
    missiles: intAttr(child(node, "weaponList"), "missiles") ?? numOf(node, "missiles") ?? 0,
    parts: intAttr(child(node, "droneList"), "drones") ?? numOf(node, "parts") ?? 0,
    systems: {},
    weapons,
    crew: [],
    kits: {},
    augments,
    unfitted: [],
  };
  const health = amountOf(node, "health");
  if (health != null) hull.health = health;
  const img = attr(node, "img")?.trim();
  if (img) hull.img = img;
  const cloak = textOf(node, "cloakImage");
  if (cloak) hull.cloak = cloak;
  const shield = textOf(node, "shieldImage");
  if (shield) hull.shield = shield;
  const floor = textOf(node, "floorImage");
  if (floor) hull.floor = floor;
  const installs = readInstalls(node);
  if (installs.length > 0) hull.installs = installs;
  const crewCounts = readCrewCounts(node);
  if (crewCounts.length > 0) hull.crewCounts = crewCounts;
  if (drones.length > 0) hull.drones = drones;
  const listedWeapons = child(node, "weaponList");
  const weaponLoad = listedWeapons ? attr(listedWeapons, "load")?.trim() : undefined;
  if (weaponLoad) hull.weaponLoad = weaponLoad;
  const listedDrones = child(node, "droneList");
  const droneLoad = listedDrones ? attr(listedDrones, "load")?.trim() : undefined;
  if (droneLoad) hull.droneLoad = droneLoad;
  const weaponSlots = numOf(node, "weaponSlots");
  if (weaponSlots != null) hull.weaponSlots = weaponSlots;
  const droneSlots = numOf(node, "droneSlots");
  if (droneSlots != null) hull.droneSlots = droneSlots;
  const minSector = numOf(node, "minSector");
  if (minSector != null) hull.minSector = minSector;
  const maxSector = numOf(node, "maxSector");
  if (maxSector != null) hull.maxSector = maxSector;
  const grid = grids.get(layout);
  if (grid) hull.grid = cloneGrid(grid);
  return hull;
}

function namedTags(node: XmlElement | undefined, tag: string): string[] {
  const ids: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== tag) continue;
    const id = attr(item, "name")?.trim() || ownText(item).trim();
    if (id) ids.push(id);
  }
  return ids;
}

function readInstalls(node: XmlElement): HullInstall[] {
  const installs: HullInstall[] = [];
  for (const item of elements(child(node, "systemList"))) {
    const power = intAttr(item, "power");
    const install: HullInstall = {
      id: item.tagName,
      power: power ?? 0,
      start: item.getAttribute("start") !== "false",
    };
    const room = intAttr(item, "room");
    if (room != null) install.room = room;
    const max = intAttr(item, "max");
    if (max != null) install.max = max;
    const img = attr(item, "img")?.trim();
    if (img) install.img = img;
    const carried = child(item, "weapon");
    const weaponId =
      attr(item, "weapon")?.trim() || (carried ? attr(carried, "name")?.trim() : undefined);
    if (weaponId) install.weapon = weaponId;
    installs.push(install);
  }
  return installs;
}

function readCrewCounts(node: XmlElement): HullCrewCount[] {
  const rows: HullCrewCount[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "crewCount") continue;
    const amount = intAttr(item, "amount");
    const kin = attr(item, "class")?.trim();
    if (amount == null || !kin) continue;
    const row: HullCrewCount = { amount, class: kin };
    const max = intAttr(item, "max");
    if (max != null) row.max = max;
    rows.push(row);
  }
  return rows;
}

function readFtlSector(node: XmlElement, strings: Map<string, string>): SectorDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const title = sectorTitle(node, id, strings);
  const sector: SectorDef = { id, name: title.name, group: "", notes: [] };
  if (title.short) sector.short = title.short;
  const minSector = intAttr(node, "minSector");
  if (minSector != null) sector.minSector = minSector;
  const unique = attr(node, "unique")?.trim();
  if (unique === "true") sector.unique = true;
  if (unique === "false") sector.unique = false;
  const start = textOf(node, "startEvent");
  if (start) sector.startEvent = start;
  const tracks = readTracks(node);
  if (tracks.length > 0) sector.tracks = tracks;
  const quotas: SectorQuota[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    const quota = readQuota(item);
    if (quota) quotas.push(quota);
  }
  if (quotas.length > 0) sector.quotas = quotas;
  const rarities = readRarities(node);
  if (rarities.length > 0) sector.rarities = rarities;
  return sector;
}

function sectorTitle(
  node: XmlElement,
  id: string,
  strings: Map<string, string>,
): { name: string; short?: string } {
  const list = child(node, "nameList");
  const named = (list ? child(list, "name") : undefined) ?? child(node, "name");
  if (!named) return { name: id };
  const written = ownText(named).trim();
  const key = attr(named, "id")?.trim();
  const name = written || (key ? (strings.get(key) ?? key) : id);
  const shortKey = attr(named, "short")?.trim();
  if (!shortKey) return { name };
  return { name, short: strings.get(shortKey) ?? shortKey };
}

function readTracks(node: XmlElement): string[] {
  const tracks: string[] = [];
  for (const item of elements(child(node, "trackList"))) {
    if (item.tagName !== "track") continue;
    const text = ownText(item).trim();
    if (text) tracks.push(text);
  }
  return tracks;
}

function readQuota(node: XmlElement): SectorQuota | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const min = intAttr(node, "min");
  const max = intAttr(node, "max");
  if (min == null && max == null) return undefined;
  return { id, min: min ?? max ?? 0, max: max ?? min ?? 0 };
}

function readRarities(node: XmlElement): SectorRarity[] {
  const rows: SectorRarity[] = [];
  for (const item of elements(child(node, "rarityList"))) {
    if (item.tagName !== "blueprint") continue;
    const id = attr(item, "name")?.trim();
    const rarity = intAttr(item, "rarity");
    if (!id || rarity == null) continue;
    rows.push({ id, rarity });
  }
  return rows;
}

function readFtlEvent(node: XmlElement, strings: Map<string, string>): EventDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return readEventBody(node, id, strings);
}

function readEventBody(node: XmlElement, id: string, strings: Map<string, string>): EventDef {
  const lines: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "text") continue;
    const text = resolveText(item, strings);
    if (text) lines.push(text);
  }
  const event: EventDef = {
    id,
    dest: textOf(node, "title") ?? id,
    flag: id,
    aliases: [],
    sectors: [],
    body: lines[0] ?? "",
    choices: readChoices(node, strings),
  };
  if (lines.length > 1) event.texts = lines;
  const fx: EventEffect[] = [];
  const grants: ArchiveGrant[] = [];
  for (const item of elements(node)) {
    if (item.tagName === "text" || item.tagName === "choice") continue;
    if (item.tagName === "ship") {
      const ship = readShipLoad(item);
      if (ship) event.ship = ship;
      continue;
    }
    if (item.tagName === "autoReward") {
      const reward = readReward(item);
      if (reward) event.reward = reward;
      continue;
    }
    if (item.tagName === "boarders") {
      const boarders = readBoarders(item);
      if (boarders) event.boarders = boarders;
      continue;
    }
    const grant = readGrant(item);
    if (grant) {
      grants.push(grant);
      continue;
    }
    pushEffects(fx, item);
  }
  if (fx.length > 0) event.fx = fx;
  if (grants.length > 0) event.grants = grants;
  return event;
}

function readFtlList(node: XmlElement, strings: Map<string, string>): FillerListDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const entries: FillerListDef["entries"] = [];
  let index = 0;
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    const eventId = attr(item, "name")?.trim();
    const unique = item.getAttribute("unique") === "true";
    const inline = elements(item).length > 0 || Boolean(attr(item, "load")?.trim());
    if (eventId && !inline) {
      entries.push({ id: eventId, unique });
    } else {
      const pageId = eventId || `${id}:${index}`;
      entries.push({ id: pageId, unique, page: readEventBody(item, pageId, strings) });
    }
    index += 1;
  }
  if (entries.length === 0) return undefined;
  return { id, entries };
}

function readChoices(node: XmlElement, strings: Map<string, string>): EventChoice[] {
  const choices: EventChoice[] = [];
  let index = 0;
  for (const item of elements(node)) {
    if (item.tagName !== "choice") continue;
    choices.push(readChoice(item, index, strings));
    index += 1;
  }
  return choices;
}

function readChoice(node: XmlElement, index: number, strings: Map<string, string>): EventChoice {
  const choice: EventChoice = {
    id: attr(node, "name")?.trim() || String(index),
    label: elementString(node, "text", strings) ?? "",
    fx: [],
  };
  if (node.getAttribute("hidden") === "true") choice.hidden = true;
  const result = elements(node).find((item) => item.tagName === "event");
  if (!result) {
    const fx: EventEffect[] = [];
    const grants: ArchiveGrant[] = [];
    for (const item of elements(node)) {
      if (item.tagName === "text") continue;
      takeResultChild(item, choice, fx, grants, strings);
    }
    if (fx.length === 0 && !choice.reward && !choice.ship && grants.length === 0)
      fx.push({ k: "nothing" });
    choice.fx = fx;
    if (grants.length > 0) choice.grants = grants;
    return choice;
  }
  const fx: EventEffect[] = [];
  const grants: ArchiveGrant[] = [];
  const load = attr(result, "load")?.trim();
  if (load) fx.push({ k: "goto", id: load });
  for (const item of elements(result)) takeResultChild(item, choice, fx, grants, strings);
  const nested = readChoices(result, strings);
  if (nested.length > 0) choice.choices = nested;
  const bare = elements(result).length === 0 && !load;
  if (
    fx.length === 0 &&
    !choice.reward &&
    !choice.ship &&
    grants.length === 0 &&
    nested.length === 0 &&
    bare
  )
    fx.push({ k: "nothing" });
  choice.fx = fx;
  if (grants.length > 0) choice.grants = grants;
  return choice;
}

function takeResultChild(
  item: XmlElement,
  choice: EventChoice,
  fx: EventEffect[],
  grants: ArchiveGrant[],
  strings: Map<string, string>,
) {
  if (item.tagName === "text") {
    const text = resolveText(item, strings);
    if (text) fx.push({ k: "note", text });
    return;
  }
  if (item.tagName === "choice") return;
  if (item.tagName === "autoReward") {
    const reward = readReward(item);
    if (reward) choice.reward = reward;
    return;
  }
  if (item.tagName === "ship") {
    const ship = readShipLoad(item);
    if (!ship) return;
    if (ship.hostile) fx.push({ k: "fight", tier: ship.load });
    else choice.ship = ship;
    return;
  }
  const grant = readGrant(item);
  if (grant) {
    grants.push(grant);
    return;
  }
  pushEffects(fx, item);
}

function readShipLoad(node: XmlElement): ArchiveShip | undefined {
  const load = attr(node, "load")?.trim();
  if (!load) return undefined;
  return { load, hostile: node.getAttribute("hostile") !== "false" };
}

function readReward(node: XmlElement): ArchiveReward | undefined {
  const level = attr(node, "level")?.trim();
  if (!level) return undefined;
  return { level, name: ownText(node).trim() };
}

function readBoarders(node: XmlElement): ArchiveBoarders | undefined {
  const min = intAttr(node, "min");
  const max = intAttr(node, "max");
  const kin = attr(node, "class")?.trim();
  if (min == null && max == null && !kin) return undefined;
  const row: ArchiveBoarders = { min: min ?? max ?? 0, max: max ?? min ?? 0 };
  if (kin) row.class = kin;
  return row;
}

function readGrant(node: XmlElement): ArchiveGrant | undefined {
  if (node.tagName === "crewMember") {
    const id = attr(node, "class")?.trim() || attr(node, "id")?.trim();
    if (!id) return undefined;
    const grant: ArchiveGrant = { kind: "crew", id };
    const amount = intAttr(node, "amount");
    if (amount != null) grant.amount = amount;
    return grant;
  }
  if (node.tagName !== "weapon" && node.tagName !== "drone" && node.tagName !== "augment")
    return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return { kind: node.tagName, id };
}

/** The same effect the campaign reader builds for this tag. */
function pushEffects(fx: EventEffect[], node: XmlElement) {
  if (node.tagName === "item_modify") {
    for (const item of elements(node)) {
      if (item.tagName !== "item") continue;
      const effect = resourceEffect(item);
      if (effect) fx.push(effect);
    }
    return;
  }
  if (node.tagName === "damage") {
    const amount = intAttr(node, "amount");
    if (amount != null) fx.push({ k: "hull", n: -amount });
    return;
  }
  if (node.tagName === "modifyPursuit") {
    const amount = intAttr(node, "amount");
    if (amount == null) return;
    const faster = node.getAttribute("faster") === "true";
    const effect: EventEffect = { k: "fleet", n: faster ? amount : -amount };
    if (node.getAttribute("double") === "true") effect.double = true;
    if (faster) effect.faster = true;
    if (node.getAttribute("lastStand") === "true") effect.lastStand = true;
    fx.push(effect);
    return;
  }
  if (node.tagName === "weapon" || node.tagName === "drone" || node.tagName === "augment") {
    if (attr(node, "name")?.trim()) return;
    fx.push({
      k: "item",
      item: node.tagName === "weapon" ? "weapon" : node.tagName === "drone" ? "drone" : "augment",
    });
  }
}

function resourceEffect(node: XmlElement): EventEffect | undefined {
  const type = attr(node, "type")?.trim();
  const id = type === "drones" ? "parts" : type;
  if (!isResource(id)) return undefined;
  const min = intAttr(node, "min");
  const max = intAttr(node, "max");
  if (min == null || max == null || min > max) return undefined;
  if (max < 0 || (max === 0 && min < 0)) return { k: "res", id, sign: -1, lo: -max, hi: -min };
  return { k: "res", id, sign: 1, lo: min, hi: max };
}

function isResource(value: string | undefined): value is EventResource {
  return value === "scrap" || value === "fuel" || value === "missiles" || value === "parts";
}
