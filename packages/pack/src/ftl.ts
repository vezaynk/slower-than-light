import { Node, type Document as XmlDocument, type Element as XmlElement } from "@xmldom/xmldom";
import { applyArchiveExtras } from "./archive-extras.ts";
import "./extras/register.ts";
import type {
  AchievementCondition,
  AchievementDef,
  ArchiveAlter,
  ArchiveMark,
  ArchiveBoarders,
  ArchiveEnvironment,
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
  BlueprintListDef,
  HullCrewCount,
  HullDef,
  HullGrid,
  HullInstall,
  OpeningLine,
  SectorDef,
  SectorQuota,
  ShipClassDef,
  SectorRarity,
  EmptyBeaconDef,
  FactionSurrender,
  RewardTable,
  ShipCrewRow,
  ShipEventChance,
  ShipEventDef,
  ShipEventEnding,
  ShipEventEscape,
  ShipWeaponOverride,
  StoreDef,
  SystemDef,
  SystemSlot,
  TextListDef,
  TuneDef,
} from "./types.ts";
import { cloneGrid, readGrids } from "./grid.ts";
import { attachPictures } from "./picture.ts";
import { warnPack } from "./warnings.ts";
import {
  attr,
  child,
  elements,
  numOf,
  readAugment,
  readBlueprintTune,
  readCrewCombat,
  readDocument,
  readDrone,
  readEmpty,
  readChoiceGates,
  readEvent,
  readFaction,
  readRewards,
  readStore,
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
 * String tables stay English. `text-<code>.xml` and its `.append` contribute no strings.
 * A later English file still replaces the same key. A `<text>` node with a language
 * attribute is skipped.
 * `<textList>` rows are kept. A flat list becomes the event's sentences.
 * A list entry that loads another list stays one draw, picked when the page is shown.
 * Crew combat children fill the combat fields. A blueprint without them keeps neutral defaults.
 * A `<facts/>` marker and a `<names>` list are kept.
 * A root `<customStore>`, `<rewards>`, `<emptyBeacon>`, or surrender-only `<shipBlueprint>` is kept.
 * A root `<ship name>` is a ship event (hull list and endings), not a hull.
 * A `<note>` on a sector is kept. This catalog does not invent a store or a rewards table.
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
  const ships = new Catalog<ShipEventDef>();
  const lists = new Catalog<FillerListDef>();
  const blueprints = new Catalog<BlueprintListDef>();
  const stores = new Catalog<StoreDef>();
  const achievements = new Catalog<AchievementDef>();
  const factions = new Catalog<FactionSurrender>();
  const empties = new Catalog<EmptyBeaconDef>();
  const shipClasses = new Catalog<ShipClassDef>();
  let rewards: RewardTable | undefined;
  const strings = new Map<string, string>();
  const locales = new Map<string, Map<string, string>>();
  const grids = readGrids(layouts);
  let facts = false;
  let names: ContentPack["names"];
  const parsed = readSources(documents);
  for (const source of parsed) {
    const code = localeCode(source.path);
    if (code) {
      const table = locales.get(code) ?? new Map<string, string>();
      collectStrings(source.doc, table);
      locales.set(code, table);
      continue;
    }
    if (translationFile(source.path)) continue;
    collectStrings(source.doc, strings);
  }
  const docs = parsed.map((source) => source.doc);
  for (const doc of docs) inlineStringIds(doc, strings);
  const textLists = readTextLists(parsed);
  for (const doc of docs) expandTextLoads(doc, textLists);
  for (const doc of docs) {
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
      if (!row) continue;
      // The attribute's presence is the flag. Stand-in drones omit it, so their rooms stay visible.
      if (node.getAttribute("NOLOC") != null) row.noloc = true;
      drones.put(row);
    }
    for (const node of tagged(doc, "systemBlueprint")) {
      const read = readFtlSystem(node);
      if (!read) continue;
      if (read.system) systems.put(read.system);
      if (read.tune) tunes.put(read.tune);
    }
    for (const node of tagged(doc, "crewBlueprint")) {
      const row = readFtlCrew(node);
      if (row) crew.put(row);
    }
    if (tagged(doc, "facts").length > 0) facts = true;
    const read = readNames(doc);
    if (read) names = read;
    for (const node of tagged(doc, "shipBlueprint")) {
      if (!rootChild(node)) continue;
      const row = readFtlHull(node, strings, grids);
      if (row) hulls.put(row);
      const faction = readFaction(node);
      if (faction) factions.put(faction);
    }
    const root = doc.documentElement;
    for (const node of elements(root ?? undefined)) {
      if (node.tagName === "achievement") {
        const row = readAchievement(node, strings);
        if (row) achievements.put(row);
      } else if (node.tagName === "customStore") {
        const row = readStore(node);
        if (row) stores.put(row);
      } else if (node.tagName === "emptyBeacon") {
        const row = readEmpty(node);
        if (row) empties.put(row);
      } else if (node.tagName === "rewards") {
        const table = readRewards(node);
        if (table) rewards = table;
      } else if (node.tagName === "shipClass") {
        const row = readShipClass(node);
        if (row) shipClasses.put(row);
      } else if (node.tagName === "ship") {
        const row = readShipEvent(node, strings, textLists);
        if (row) {
          const prev = ships.get(row.id);
          if (prev) keepShipEndings(prev, row);
          ships.put(row);
        }
      }
    }
    for (const node of tagged(doc, "sectorDescription")) {
      const row = readFtlSector(node, strings);
      if (row) sectors.put(row);
    }
    for (const node of tagged(doc, "event")) {
      const row = readFtlEvent(node, strings, textLists);
      if (row) events.put(row);
    }
    for (const node of tagged(doc, "eventList")) {
      const row = readFtlList(node, strings, textLists);
      if (row) lists.put(row);
    }
    for (const node of tagged(doc, "blueprintList")) {
      const row = readBlueprintList(node);
      if (row) blueprints.put(row);
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
  const colours = readSectorTypes(docs);
  for (const row of sectors.rows) row.group ||= colours.get(row.id) ?? "";
  if (sectors.rows.length > 0) pack.sectors = sectors.rows;
  if (events.rows.length > 0) pack.events = events.rows;
  if (ships.rows.length > 0) pack.shipEvents = ships.rows;
  if (lists.rows.length > 0) pack.lists = lists.rows;
  if (blueprints.rows.length > 0) pack.blueprints = blueprints.rows;
  if (stores.rows.length > 0) pack.stores = stores.rows;
  if (achievements.rows.length > 0) pack.achievements = achievements.rows;
  if (rewards) pack.rewards = rewards;
  if (factions.rows.length > 0) pack.factions = factions.rows;
  if (empties.rows.length > 0) pack.empties = empties.rows;
  if (shipClasses.rows.length > 0) pack.shipClasses = shipClasses.rows;
  if (textLists.size > 0) {
    pack.textLists = [...textLists.entries()].map(([id, lines]) => ({ id, lines }));
  }
  checkCrewClasses(hulls.rows, crew.rows);
  if (facts) pack.facts = true;
  if (names) pack.names = names;
  const civilianSectorTitle = strings.get("sectorname_CIVILIAN_SECTOR");
  if (civilianSectorTitle) pack.civilianSectorTitle = civilianSectorTitle;
  if (locales.size > 0) {
    pack.locales = [...locales.entries()].map(([code, table]) => ({
      code,
      strings: Object.fromEntries(table),
    }));
  }
  attachPictures(pack.hulls, documents);
  applyArchiveExtras(pack, parsed, layouts);
  return pack;
}

function readShipClass(node: XmlElement): ShipClassDef | undefined {
  const id = attr(node, "name")?.trim();
  const blueprint = attr(node, "blueprint")?.trim();
  if (!id || !blueprint) return undefined;
  const row: ShipClassDef = {
    id,
    classId: attr(node, "class")?.trim() || id,
    blueprint,
  };
  const pirate = attr(node, "pirate")?.trim();
  if (pirate) row.pirate = pirate;
  return row;
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

/**
 * Every crewCount class should be "random", "ghost", or a crewBlueprint in the same archive.
 * Ghost is a race CrewMemberFactory builds with no crewBlueprint. Others are warned about.
 */
function checkCrewClasses(hulls: readonly HullDef[], crew: readonly CrewDef[]): void {
  const races = new Set(crew.map((row) => row.id));
  for (const hull of hulls) {
    for (const row of hull.crewCounts ?? []) {
      if (row.class === "random" || row.class === "ghost" || races.has(row.class)) continue;
      warnPack(`shipBlueprint ${hull.id}: crewCount class "${row.class}" is not a crewBlueprint.`);
    }
  }
}

function readBlueprintList(node: XmlElement): BlueprintListDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const names: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "name") continue;
    const name = (item.textContent ?? "").trim();
    if (name) names.push(name);
  }
  return { id, names };
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
  const short = textOf(node, "short");
  if (short) row.short = short;
  const powers: string[] = [];
  for (const item of elements(child(node, "powerList"))) {
    if (item.tagName !== "power") continue;
    const line = ownText(item).trim();
    if (line) powers.push(line);
  }
  if (powers.length > 0) row.powers = powers;
  const cost = numOf(node, "cost");
  if (cost != null) row.cost = cost;
  const colors = readCrewColors(child(node, "colorList"));
  if (colors.length > 0) row.colors = colors;
  readCrewCombat(node, row);
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

  get(id: string): T | undefined {
    const at = this.index.get(id);
    return at == null ? undefined : this.rows[at];
  }

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

function readFtlSystem(node: XmlElement): { system?: SystemDef; tune?: TuneDef } | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const tune = readBlueprintTune(node, id);
  // A blueprint with only startPower and upgradeCost is a tune. A title, cost, description, or slot is a listing.
  const listed =
    child(node, "title") || child(node, "cost") || child(node, "desc") || child(node, "slot");
  if (!listed && !tune) return undefined;
  if (!listed) return { tune };
  const system: SystemDef = {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
    slot: systemSlot(id, node),
  };
  const detail = textOf(node, "desc");
  if (detail) system.detail = detail;
  const max = numOf(node, "maxPower");
  if (max != null) system.max = max;
  return tune ? { system, tune } : { system };
}

function systemSlot(id: string, node: XmlElement): SystemSlot {
  const written = textOf(node, "slot");
  if (written === "kit" || written === "sys") return written;
  if (KIT_SYSTEMS.has(id) || id.startsWith("artillery")) return "kit";
  return "sys";
}

/**
 * `text-<code>.xml` is a translation. English tables are `text_<kind>.xml`.
 * A locale code may contain a hyphen, as in `text-zh-Hans.xml`.
 */
function translationFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return /^text-.+\.xml(?:\.append)?$/i.test(name);
}

/** `text-eo.xml` is `eo`. `text-zh-Hans.xml.append` is `zh-Hans`. Underscore tables are English. */
function localeCode(path: string): string | undefined {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const match = /^text-(.+)\.xml(?:\.append)?$/i.exec(name);
  const code = match?.[1];
  return code ? code : undefined;
}

/**
 * ftl.dat writes most player-facing text as a reference: `<title id="weapon_LASER_BURST_1_title"/>`, with the words in
 * text_blueprints.xml. Every element with an `id` the strings know, and no text or children of its own, gets that text,
 * so the readers find it where a stand-in or mod writes it inline. The id attribute stays.
 */
function inlineStringIds(doc: XmlDocument, strings: Map<string, string>): void {
  // A snapshot. Appending a text node bumps xmldom's revision, and a live list then re-walks the whole document on
  // every read: 106 s for a real ftl.dat instead of well under one.
  const live = doc.getElementsByTagName("*");
  const all: XmlElement[] = [];
  for (let i = 0, n = live.length; i < n; i++) {
    const node = live.item(i);
    if (node) all.push(node);
  }
  for (const node of all) {
    if (!node || attr(node, "load")?.trim()) continue;
    if (elements(node).length > 0 || ownText(node).trim()) continue;
    const key = attr(node, "id")?.trim();
    const value = key ? strings.get(key) : undefined;
    if (value) node.appendChild(doc.createTextNode(value));
  }
}

/** `<textList name>`: the lines an event's `<text load="name"/>` picks from. A later file replaces the same name. */
function readTextLists(
  sources: readonly { path: string; doc: XmlDocument }[],
): Map<string, OpeningLine[]> {
  const lists = new Map<string, OpeningLine[]>();
  for (const source of sources) {
    if (translationFile(source.path)) continue;
    for (const node of tagged(source.doc, "textList")) {
      const name = attr(node, "name")?.trim();
      if (!name) continue;
      const lines: OpeningLine[] = [];
      for (const item of elements(node)) {
        if (item.tagName !== "text") continue;
        const line = readOpeningLine(item);
        if (line) lines.push(line);
      }
      lists.set(name, lines);
    }
  }
  return lists;
}

function readOpeningLine(item: XmlElement): OpeningLine | undefined {
  if (attr(item, "language")?.trim()) return undefined;
  const written = ownText(item).trim();
  const load = attr(item, "load")?.trim();
  if (load && !written) return { load };
  if (written) return { text: written };
  return undefined;
}

/**
 * A flat `<text load="LIST"/>` becomes one `<text>` per line. The sim picks one when the page is shown.
 * A list that itself loads another list stays one node, so that load remains one draw.
 * A load inside a textList stays put for the same reason. A missing list is warned about and left out.
 */
function expandTextLoads(doc: XmlDocument, lists: Map<string, OpeningLine[]>): void {
  const loads: XmlElement[] = [];
  const texts = doc.getElementsByTagName("text");
  for (let i = 0; i < texts.length; i++) {
    const node = texts.item(i);
    if (!node || insideTextList(node) || !loadName(node)) continue;
    loads.push(node);
  }
  for (const node of loads) {
    const name = loadName(node)!;
    const lines = lists.get(name);
    const parent = node.parentNode;
    if (!parent) continue;
    const flat = lines ? flatTexts(lines) : undefined;
    if (!lines) {
      warnPack(`<text load="${name}"/> names no textList; that text is left out.`);
      continue;
    }
    if (!flat) continue;
    for (const line of flat) {
      const copy = doc.createElement("text");
      copy.appendChild(doc.createTextNode(line));
      parent.insertBefore(copy, node);
    }
    parent.removeChild(node);
  }
}

function flatTexts(lines: readonly OpeningLine[]): string[] | undefined {
  const texts: string[] = [];
  for (const line of lines) {
    if ("load" in line) return undefined;
    if (line.text) texts.push(line.text);
  }
  return texts;
}

function insideTextList(node: XmlElement): boolean {
  let parent: Node | null = node.parentNode;
  while (parent) {
    if (parent.nodeType === Node.ELEMENT_NODE && (parent as XmlElement).tagName === "textList")
      return true;
    parent = parent.parentNode;
  }
  return false;
}

function loadName(node: XmlElement): string | undefined {
  const name = attr(node, "load")?.trim();
  if (!name || ownText(node).trim()) return undefined;
  return name;
}

function nestedList(lines: readonly OpeningLine[] | undefined): boolean {
  return Boolean(lines?.some((line) => "load" in line));
}

/**
 * Draws one line. A `load` spends another draw inside that list.
 * A list that loads itself leaves the sentence blank.
 */
export function pickOpening(
  lines: readonly OpeningLine[],
  list: (id: string) => readonly OpeningLine[] | undefined,
  roll: (count: number) => number,
  seen = new Set<string>(),
): string {
  if (!lines.length) return "";
  const index = roll(lines.length);
  const line = lines[Math.min(lines.length - 1, Math.max(0, index))];
  if (!line || "text" in line) return line?.text ?? "";
  if (seen.has(line.load)) {
    warnPack(`textList ${line.load} loads itself; the sentence is left blank.`);
    return "";
  }
  const next = list(line.load);
  if (!next?.length) {
    warnPack(`<text load="${line.load}"/> names no textList; that text is left out.`);
    return "";
  }
  seen.add(line.load);
  return pickOpening(next, list, roll, seen);
}

/**
 * Adds text lists from sibling documents. An id the pack already has stays.
 * Events in those documents are not copied onto the pack.
 */
export function attachTextLists(pack: ContentPack, documents: readonly FtlBlueprintFile[]): void {
  if (!documents.length) return;
  const found = textListRows(documents);
  if (!found.length) return;
  const have = new Set((pack.textLists ?? []).map((row) => row.id));
  const added = found.filter((row) => !have.has(row.id));
  if (!added.length) return;
  pack.textLists = [...(pack.textLists ?? []), ...added];
}

function textListRows(documents: readonly FtlBlueprintFile[]): TextListDef[] {
  const parsed = readSources(documents);
  const strings = new Map<string, string>();
  for (const source of parsed) {
    if (translationFile(source.path)) continue;
    collectStrings(source.doc, strings);
  }
  for (const source of parsed) inlineStringIds(source.doc, strings);
  return [...readTextLists(parsed).entries()].map(([id, lines]) => ({ id, lines }));
}

function readSources(documents: readonly FtlBlueprintFile[]): { path: string; doc: XmlDocument }[] {
  const parsed: { path: string; doc: XmlDocument }[] = [];
  for (const source of documents) {
    try {
      parsed.push({ path: source.path, doc: readDocument(source.xml) });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`${source.path}: ${detail}`);
    }
  }
  return parsed;
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

function childTexts(node: XmlElement, tag: string): string[] {
  const texts: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== tag) continue;
    const text = ownText(item).trim();
    if (text) texts.push(text);
  }
  return texts;
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
    reactor: amountOf(node, "maxPower") ?? 0,
    missiles: intAttr(child(node, "weaponList"), "missiles") ?? 0,
    parts: intAttr(child(node, "droneList"), "drones") ?? 0,
    weapons,
    augments,
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
  const weaponCount = intAttr(listedWeapons, "count");
  if (weaponCount != null) hull.weaponCount = weaponCount;
  const listedDrones = child(node, "droneList");
  const droneLoad = listedDrones ? attr(listedDrones, "load")?.trim() : undefined;
  // A droneList that names drones also says how many parts the ship carries. Only BOSS_1 in ftl.dat has a
  // droneList without `drones`, and it names none. Without it the ship carries 0 parts.
  if (listedDrones && (droneLoad || drones.length > 0) && intAttr(listedDrones, "drones") == null) {
    warnPack(
      `shipBlueprint ${id}: its droneList names drones but has no drones (parts) attribute; it carries 0 parts.`,
    );
  }
  if (droneLoad) hull.droneLoad = droneLoad;
  const droneCount = intAttr(listedDrones, "count");
  if (droneCount != null) hull.droneCount = droneCount;
  const weaponSlots = numOf(node, "weaponSlots");
  if (weaponSlots != null) hull.weaponSlots = weaponSlots;
  const droneSlots = numOf(node, "droneSlots");
  if (droneSlots != null) hull.droneSlots = droneSlots;
  const minSector = numOf(node, "minSector");
  if (minSector != null) hull.minSector = minSector;
  const maxSector = numOf(node, "maxSector");
  if (maxSector != null) hull.maxSector = maxSector;
  const boardingAI = textOf(node, "boardingAI");
  if (boardingAI === "sabotage" || boardingAI === "invasion") hull.boardingAI = boardingAI;
  else if (boardingAI)
    warnPack(
      `shipBlueprint ${id}: boardingAI "${boardingAI}" is not sabotage or invasion; it is left unset.`,
    );
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

/**
 * `<crewCount amount max class>` rows. A row with no amount, or with crew but no class, is skipped with a warning.
 * ftl.dat's ghost ships write `<crewCount amount="0"/>`, which is no crew and needs no class.
 */
function readCrewCounts(node: XmlElement): HullCrewCount[] {
  const rows: HullCrewCount[] = [];
  const ship = attr(node, "name") ?? "?";
  for (const item of elements(node)) {
    if (item.tagName !== "crewCount") continue;
    const amount = intAttr(item, "amount");
    const kin = attr(item, "class")?.trim();
    if (amount == null) {
      warnPack(`shipBlueprint ${ship}: a crewCount has no amount; it is skipped.`);
      continue;
    }
    if (!kin) {
      if (amount !== 0) {
        warnPack(`shipBlueprint ${ship}: a crewCount of ${amount} names no class; it is skipped.`);
      }
      continue;
    }
    const row: HullCrewCount = { amount, class: kin };
    const max = intAttr(item, "max");
    if (max != null) row.max = max;
    rows.push(row);
  }
  return rows;
}

const SECTOR_TYPE_GROUPS: Record<string, string> = {
  CIVILIAN: "civilian",
  HOSTILE: "hostile",
  NEBULA: "nebula",
};

/**
 * Sector colour from sector_data.xml's `<sectorType>` lists, which StarMap::GenerateSectorMap draws each column from.
 * An `OVERRIDE_` list replaces its base list (Advanced Edition adds the Lanius sector to hostile this way). UNKNOWN is
 * read and is not a colour: those sectors stay hidden unless a colour list also names them. A sector in no list
 * (Hidden Crystal Worlds, The Last Stand) keeps no group, so the chart never rolls it.
 */
export function readSectorTypes(docs: readonly XmlDocument[]): Map<string, string> {
  const lists = new Map<string, string[]>();
  for (const doc of docs) {
    for (const node of tagged(doc, "sectorType")) {
      const name = attr(node, "name")?.trim();
      if (!name) continue;
      const ids = elements(node)
        .filter((item) => item.tagName === "sector")
        .map((item) => ownText(item).trim())
        .filter(Boolean);
      lists.set(name, ids);
    }
  }
  const colours = new Map<string, string>();
  for (const [type, group] of Object.entries(SECTOR_TYPE_GROUPS)) {
    for (const id of lists.get(`OVERRIDE_${type}`) ?? lists.get(type) ?? []) {
      if (!colours.has(id)) colours.set(id, group);
    }
  }
  // Not a chart colour. A colour list that also names the sector wins, so this does not relabel it.
  for (const id of lists.get("OVERRIDE_UNKNOWN") ?? lists.get("UNKNOWN") ?? []) {
    if (!colours.has(id)) colours.set(id, "");
  }
  return colours;
}

/**
 * `<achievement id>` from data/achievements.xml: name and description (written text or a string id), the `<ship>` it
 * belongs to, `<multiDifficulty>`, `<img>`, and the gap mod's `<condition>`.
 */
function readAchievement(
  node: XmlElement,
  strings: Map<string, string>,
): AchievementDef | undefined {
  const id = attr(node, "id")?.trim();
  if (!id) return undefined;
  const row: AchievementDef = {
    id,
    name: elementString(node, "name", strings) ?? id,
    desc: elementString(node, "desc", strings) ?? "",
  };
  const short = elementString(node, "shortname", strings);
  if (short) row.short = short;
  const ship = textOf(node, "ship");
  if (ship) row.ship = ship;
  const multi = textOf(node, "multiDifficulty");
  if (multi === "1" || multi === "true") row.multiDifficulty = true;
  const img = textOf(node, "img");
  if (img) row.img = img;
  const slug = textOf(node, "slug");
  if (slug) row.slug = slug;
  const condition = child(node, "condition");
  if (condition) {
    const read = readConditionList(condition, id);
    if (read.length > 0) row.condition = read.length === 1 ? read[0]! : { all: read };
  }
  return row;
}

/** The children of `<condition>`, `<all>`, or `<any>`. An unknown tag is warned about and dropped. */
function readConditionList(node: XmlElement, id: string): AchievementCondition[] {
  const rows: AchievementCondition[] = [];
  for (const item of elements(node)) {
    const row = readCondition(item, id);
    if (row) rows.push(row);
  }
  return rows;
}

function readCondition(node: XmlElement, id: string): AchievementCondition | undefined {
  if (node.tagName === "all") return { all: readConditionList(node, id) };
  if (node.tagName === "any") return { any: readConditionList(node, id) };
  if (node.tagName === "not") {
    const inner = readConditionList(node, id);
    if (inner.length === 0) {
      warnPack(`achievement ${id}: an empty <not> is skipped.`);
      return undefined;
    }
    return { not: inner.length === 1 ? inner[0]! : { all: inner } };
  }
  if (node.tagName === "value") {
    const name = attr(node, "name")?.trim();
    if (!name) {
      warnPack(`achievement ${id}: a <value> has no name; it is skipped.`);
      return undefined;
    }
    const row: AchievementCondition = { value: name };
    const min = numAttr(node, "min");
    if (min != null) row.min = min;
    const max = numAttr(node, "max");
    if (max != null) row.max = max;
    return row;
  }
  warnPack(`achievement ${id}: <${node.tagName}> is not a condition tag; it is skipped.`);
  return undefined;
}

function numAttr(node: XmlElement, name: string): number | undefined {
  const raw = node.getAttribute(name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function readFtlSector(node: XmlElement, strings: Map<string, string>): SectorDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const title = sectorTitle(node, id, strings);
  const notes: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "note") continue;
    const text = ownText(item).trim();
    if (text) notes.push(text);
  }
  const sector: SectorDef = { id, name: title.name, group: "", notes };
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

/**
 * Nested loads stay one slot each. A page whose only text is one nested list
 * draws among that list's own entries, so the outer name is not an extra roll.
 */
function openingLines(
  textNodes: readonly XmlElement[],
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): OpeningLine[] | undefined {
  const sole = textNodes.length === 1 ? loadName(textNodes[0]!) : undefined;
  if (sole) {
    const list = lists.get(sole);
    if (!list || !nestedList(list)) return undefined;
    return list.map((line) => ({ ...line }));
  }
  const ordered: OpeningLine[] = [];
  let nested = false;
  for (const item of textNodes) {
    const name = loadName(item);
    if (name) {
      const list = lists.get(name);
      if (!list) continue;
      if (nestedList(list)) {
        ordered.push({ load: name });
        nested = true;
      } else {
        for (const line of list) if ("text" in line && line.text) ordered.push({ text: line.text });
      }
      continue;
    }
    const text = resolveText(item, strings);
    if (text) ordered.push({ text });
  }
  if (!nested) return undefined;
  return ordered;
}

function sentenceLines(
  textNodes: readonly XmlElement[],
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): string[] {
  const lines: string[] = [];
  for (const item of textNodes) {
    const name = loadName(item);
    if (name) {
      const list = lists.get(name);
      if (!list || nestedList(list)) continue;
      for (const line of list) if ("text" in line && line.text) lines.push(line.text);
      continue;
    }
    const text = resolveText(item, strings);
    if (text) lines.push(text);
  }
  return lines;
}

function readFtlEvent(
  node: XmlElement,
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): EventDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  // Campaign pages carry a title, a named choice, or a campaign-only child.
  // A vanilla choice has no name and often a ship, so a bare choice stays a ship event.
  if (campaignEvent(node)) return readEvent(node);
  return readEventBody(node, id, strings, lists);
}

const CAMPAIGN_LISTS = new Set(["trade", "high", "pt2", "base", "better", "supply"]);

function campaignEvent(node: XmlElement): boolean {
  for (const item of elements(node)) {
    if (
      item.tagName === "title" ||
      item.tagName === "card" ||
      item.tagName === "roll" ||
      item.tagName === "trade" ||
      item.tagName === "grade" ||
      item.tagName === "surrender"
    )
      return true;
    if (item.tagName === "choice" && attr(item, "name")?.trim()) return true;
    if (item.tagName === "eventList") {
      const name = attr(item, "name")?.trim() ?? "";
      if (!name || CAMPAIGN_LISTS.has(name)) return true;
    }
  }
  return false;
}

function readEventBody(
  node: XmlElement,
  id: string,
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): EventDef {
  const textNodes = elements(node).filter((item) => item.tagName === "text");
  const openings = openingLines(textNodes, strings, lists);
  const lines = openings ? [] : sentenceLines(textNodes, strings, lists);
  const event: EventDef = {
    id,
    dest: textOf(node, "title") ?? id,
    flag: id,
    aliases: childTexts(node, "alias"),
    sectors: childTexts(node, "sector"),
    body: openings ? "" : (lines[0] ?? ""),
    choices: readChoices(node, strings, id),
  };
  if (!openings && lines.length > 1) event.texts = lines;
  if (openings?.length) event.openings = openings;
  const fx: EventEffect[] = [];
  const grants: ArchiveGrant[] = [];
  const alters: ArchiveAlter[] = [];
  const marks: ArchiveMark[] = [];
  for (const item of elements(node)) {
    if (
      item.tagName === "text" ||
      item.tagName === "choice" ||
      item.tagName === "alias" ||
      item.tagName === "sector" ||
      item.tagName === "title"
    )
      continue;
    if (item.tagName === "img") {
      const name = resolveText(item, strings)?.trim();
      if (name && !event.img) event.img = name;
      continue;
    }
    if (item.tagName === "store") {
      event.store = true;
      continue;
    }
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
    if (item.tagName === "environment") continue;
    const alter = readAlter(item, strings);
    if (alter === "skip") continue;
    if (alter) {
      alters.push(alter);
      continue;
    }
    const mark = readMark(item);
    if (mark === "skip") continue;
    if (mark) {
      marks.push(mark);
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
  if (alters.length > 0) event.alters = alters;
  if (marks.length > 0) event.marks = marks;
  const environment = readEnvironment(node);
  if (environment) event.environment = environment;
  return event;
}

function readFtlList(
  node: XmlElement,
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): FillerListDef | undefined {
  if (!rootChild(node)) return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const entries: FillerListDef["entries"] = [];
  let index = 0;
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    const eventId = attr(item, "name")?.trim();
    const load = attr(item, "load")?.trim();
    const unique = item.getAttribute("unique") === "true";
    // ftl.dat lists name their pages as <event load="PIRATE"/>. A childless load is that page, not a new one.
    if (load && elements(item).length === 0) {
      entries.push({ id: load, unique });
    } else if (eventId && elements(item).length === 0) {
      entries.push({ id: eventId, unique });
    } else {
      const pageId = eventId || `${id}:${index}`;
      entries.push({ id: pageId, unique, page: readEventBody(item, pageId, strings, lists) });
    }
    index += 1;
  }
  return { id, entries };
}

function readChoices(node: XmlElement, strings: Map<string, string>, page?: string): EventChoice[] {
  const choices: EventChoice[] = [];
  let index = 0;
  for (const item of elements(node)) {
    if (item.tagName !== "choice") continue;
    const choice = readChoice(item, index, strings);
    if (page) scopeChoice(choice, page);
    choices.push(choice);
    index += 1;
  }
  return choices;
}

/**
 * ftl.dat choices have no names, so their index is the id. The game finds a choice by id across every page,
 * so an unnamed choice is `<page>:<index>`, and a nested one `<parent>:<index>`. A named choice keeps its name.
 */
function scopeChoice(choice: EventChoice, parent: string): void {
  if (/^\d+$/.test(choice.id)) choice.id = `${parent}:${choice.id}`;
  for (const nested of choice.choices ?? []) scopeChoice(nested, choice.id);
}

function readChoice(node: XmlElement, index: number, strings: Map<string, string>): EventChoice {
  const choice: EventChoice = {
    id: attr(node, "name")?.trim() || String(index),
    label: elementString(node, "text", strings) ?? "",
    fx: [],
  };
  readChoiceGates(choice, node);
  const result = elements(node).find((item) => item.tagName === "event");
  const environment = readEnvironment(result ?? node);
  if (environment) choice.environment = environment;
  if (!result) {
    const fx: EventEffect[] = [];
    const grants: ArchiveGrant[] = [];
    const alters: ArchiveAlter[] = [];
    const marks: ArchiveMark[] = [];
    for (const item of elements(node)) {
      if (item.tagName === "text") continue;
      takeResultChild(item, choice, fx, grants, alters, marks, strings);
    }
    if (alters.length > 0) choice.alters = alters;
    if (marks.length > 0) choice.marks = marks;
    if (
      fx.length === 0 &&
      !choice.reward &&
      !choice.ship &&
      grants.length === 0 &&
      !choice.boarders
    )
      fx.push({ k: "nothing" });
    choice.fx = fx;
    if (grants.length > 0) choice.grants = grants;
    return choice;
  }
  const fx: EventEffect[] = [];
  const grants: ArchiveGrant[] = [];
  const alters: ArchiveAlter[] = [];
  const marks: ArchiveMark[] = [];
  const load = attr(result, "load")?.trim();
  if (load) fx.push({ k: "goto", id: load });
  for (const item of elements(result))
    takeResultChild(item, choice, fx, grants, alters, marks, strings);
  if (alters.length > 0) choice.alters = alters;
  if (marks.length > 0) choice.marks = marks;
  const nested = readChoices(result, strings);
  if (nested.length > 0) choice.choices = nested;
  const bare = elements(result).length === 0 && !load;
  if (
    fx.length === 0 &&
    !choice.reward &&
    !choice.ship &&
    grants.length === 0 &&
    !choice.boarders &&
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
  alters: ArchiveAlter[],
  marks: ArchiveMark[],
  strings: Map<string, string>,
) {
  if (item.tagName === "text") {
    const text = resolveText(item, strings);
    if (text) fx.push({ k: "note", text });
    return;
  }
  if (item.tagName === "choice") return;
  if (item.tagName === "img") {
    const name = resolveText(item, strings)?.trim();
    if (name && !choice.img) choice.img = name;
    return;
  }
  const alter = readAlter(item, strings);
  if (alter === "skip") return;
  if (alter) {
    alters.push(alter);
    return;
  }
  const mark = readMark(item);
  if (mark === "skip") return;
  if (mark) {
    marks.push(mark);
    return;
  }
  if (item.tagName === "autoReward") {
    const reward = readReward(item);
    if (reward) choice.reward = reward;
    return;
  }
  if (item.tagName === "boarders") {
    const boarders = readBoarders(item);
    if (boarders) choice.boarders = boarders;
    return;
  }
  if (item.tagName === "environment") return;
  if (item.tagName === "ship") {
    const ship = readShipLoad(item);
    if (!ship) return;
    if (ship.hostile && ship.load) {
      const fight: EventEffect = { k: "fight", tier: ship.load };
      if (ship.asteroid) fight.asteroid = true;
      if (ship.autoBlueprint) fight.autoBlueprint = ship.autoBlueprint;
      fx.push(fight);
    } else choice.ship = ship;
    return;
  }
  const grant = readGrant(item);
  if (grant) {
    grants.push(grant);
    return;
  }
  pushEffects(fx, item);
}

const STATUS_TYPES = new Set(["limit", "divide", "clear", "loss"]);
const STATUS_TARGETS = new Set(["player", "enemy"]);
const STATUS_SYSTEMS = new Set([
  "shields",
  "engines",
  "weapons",
  "oxygen",
  "hacking",
  "doors",
  "medbay",
  "clonebay",
  "sensors",
  "drones",
  "pilot",
]);

/** `<status>`, `<upgrade>`, `<removeCrew>`, or `<remove>`. `"skip"` is one of those tags that does not apply. */
function readAlter(
  item: XmlElement,
  strings: Map<string, string>,
): ArchiveAlter | "skip" | undefined {
  if (item.tagName === "status") {
    const type = attr(item, "type")?.trim() ?? "";
    const target = attr(item, "target")?.trim() ?? "";
    const system = attr(item, "system")?.trim() ?? "";
    const amount = intAttr(item, "amount");
    if (!STATUS_TYPES.has(type)) {
      warnPack(`A <status> type "${type}" is not limit, divide, clear, or loss; it is skipped.`);
      return "skip";
    }
    if (!STATUS_TARGETS.has(target)) {
      warnPack(`A <status> target "${target}" is not player or enemy; it is skipped.`);
      return "skip";
    }
    if (!STATUS_SYSTEMS.has(system)) {
      warnPack(`A <status> system "${system}" is not one this ship uses; it is skipped.`);
      return "skip";
    }
    const targetId = target as "player" | "enemy";
    // ClearStatus ignores amount. The six vanilla clears on weapons and hacking omit it.
    if (type === "clear") {
      return amount == null
        ? { k: "status", type: "clear", target: targetId, system }
        : { k: "status", type: "clear", target: targetId, system, amount };
    }
    if (amount == null) {
      warnPack(`A <status> on ${system} has no whole-number amount; it is skipped.`);
      return "skip";
    }
    return {
      k: "status",
      type: type as "limit" | "divide" | "loss",
      target: targetId,
      system,
      amount,
    };
  }
  if (item.tagName === "upgrade") {
    const system = attr(item, "system")?.trim() ?? "";
    const amount = intAttr(item, "amount");
    if (!system || amount == null) {
      warnPack("An <upgrade> needs a system and a whole-number amount; it is skipped.");
      return "skip";
    }
    return { k: "upgrade", system, amount };
  }
  if (item.tagName === "removeCrew") {
    const clone = textOf(item, "clone");
    if (clone !== "true" && clone !== "false") {
      warnPack("A <removeCrew> clone is not true or false; it is skipped.");
      return "skip";
    }
    const text = elementString(item, "text", strings);
    return text
      ? { k: "removeCrew", clone: clone === "true", text }
      : { k: "removeCrew", clone: clone === "true" };
  }
  if (item.tagName === "remove") {
    const name = attr(item, "name")?.trim() ?? "";
    if (!name) {
      warnPack("A <remove> has no name; it is skipped.");
      return "skip";
    }
    return { k: "remove", name };
  }
  return undefined;
}

/** Quest, secret sector, and map marks. A quest with no event, or an unlock id that is not a whole number, is skipped. */
function readMark(item: XmlElement): ArchiveMark | "skip" | undefined {
  if (item.tagName === "quest") {
    const event = attr(item, "event")?.trim() ?? "";
    if (!event) {
      warnPack("A <quest> has no event; it places nothing.");
      return "skip";
    }
    return { k: "quest", event };
  }
  if (item.tagName === "secretSector") return { k: "secretSector" };
  if (item.tagName === "distressBeacon") return { k: "distressBeacon" };
  if (item.tagName === "repair") return { k: "repair" };
  if (item.tagName === "fleet") return { k: "fleet" };
  if (item.tagName === "reveal_map") return { k: "revealMap" };
  if (item.tagName === "unlockShip") {
    const id = intAttr(item, "id");
    if (id == null || id < 0) {
      warnPack("An <unlockShip> id is not a whole number; it grants nothing.");
      return "skip";
    }
    return { k: "unlockShip", id };
  }
  return undefined;
}

const ENVIRONMENT_TYPES = new Set(["asteroid", "nebula", "pulsar", "sun", "storm", "PDS"]);
const PDS_TARGETS = new Set(["player", "enemy", "all"]);

/** The first `<environment type>` on this event. A type this game does not play is skipped. */
function readEnvironment(node: XmlElement): ArchiveEnvironment | undefined {
  for (const item of elements(node)) {
    if (item.tagName !== "environment") continue;
    const type = attr(item, "type")?.trim();
    if (!type || !ENVIRONMENT_TYPES.has(type)) {
      warnPack(
        `An <environment> type "${type ?? ""}" is not asteroid, nebula, pulsar, sun, storm, or PDS; it is skipped.`,
      );
      return undefined;
    }
    const environment: ArchiveEnvironment = { type: type as ArchiveEnvironment["type"] };
    if (type !== "PDS") return environment;
    const target = item.getAttribute("target")?.trim();
    if (!target) return environment;
    if (!PDS_TARGETS.has(target)) {
      warnPack(
        `An <environment type="PDS"> target "${target}" is not player, enemy, or all; it is skipped.`,
      );
      return undefined;
    }
    environment.target = target as "player" | "enemy" | "all";
    return environment;
  }
  return undefined;
}

function readShipLoad(node: XmlElement): ArchiveShip | undefined {
  const load = attr(node, "load")?.trim();
  const hostile = node.getAttribute("hostile");
  if (!load && hostile == null) return undefined;
  const ship: ArchiveShip = { hostile: hostile !== "false" };
  if (load) ship.load = load;
  const list = attr(node, "auto_blueprint")?.trim();
  if (list) ship.autoBlueprint = list;
  const asteroid = node.getAttribute("asteroid");
  if (asteroid != null && asteroid !== "false") ship.asteroid = true;
  return ship;
}

const SHIP_ENDINGS = ["surrender", "escape", "destroyed", "deadCrew", "gotaway"] as const;

function shipEndingTag(tag: string): (typeof SHIP_ENDINGS)[number] | undefined {
  return SHIP_ENDINGS.find((name) => name === tag);
}

/** A later ship file replaces the record. An ending it leaves blank keeps the earlier sentence. */
function keepEnding<T extends { page?: EventDef }>(
  older: T | undefined,
  newer: T | undefined,
): T | undefined {
  if (!newer) return older;
  if (!older?.page?.body || newer.page?.body) return newer;
  if (newer.page) newer.page.body = older.page.body;
  else newer.page = older.page;
  return newer;
}

function shipEnding(
  row: ShipEventDef,
  tag: (typeof SHIP_ENDINGS)[number],
): ShipEventEnding | undefined {
  if (tag === "surrender") return row.surrender;
  if (tag === "escape") return row.escape;
  if (tag === "destroyed") return row.destroyed;
  if (tag === "deadCrew") return row.deadCrew;
  return row.gotaway;
}

/** The sentence on a second tag of the same ending, when the first tag left the page blank. */
function fillEndingPage(current: ShipEventEnding, extra: ShipEventEnding): void {
  const told = extra.page?.body?.trim();
  if (!told) return;
  if (!current.page?.body?.trim()) {
    current.page = extra.page;
    return;
  }
  if (current.page.body.includes(told)) return;
  current.page.texts = [...(current.page.texts ?? []), told];
}

function keepShipEndings(prev: ShipEventDef, next: ShipEventDef): void {
  next.surrender = keepEnding(prev.surrender, next.surrender);
  next.escape = keepEnding(prev.escape, next.escape);
  next.destroyed = keepEnding(prev.destroyed, next.destroyed);
  next.deadCrew = keepEnding(prev.deadCrew, next.deadCrew);
  next.gotaway = keepEnding(prev.gotaway, next.gotaway);
}

/**
 * A root `<ship name>`. The first of each ending, crew block, and weapon override wins.
 * A later duplicate ending that carries a sentence fills an earlier ending that had none,
 * so a timer-only escape still announces the text written on the second tag.
 */
function readShipEvent(
  node: XmlElement,
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): ShipEventDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const row: ShipEventDef = { id };
  const list = attr(node, "auto_blueprint")?.trim();
  if (list) row.autoBlueprint = list;
  const seen = new Set<string>();
  let crewSeen = false;
  let weaponsSeen = false;
  for (const item of elements(node)) {
    if (item.tagName === "crew") {
      if (crewSeen) continue;
      crewSeen = true;
      const crew = readShipCrew(item);
      if (crew.length > 0) row.crew = crew;
      continue;
    }
    if (item.tagName === "weaponOverride") {
      if (weaponsSeen) continue;
      weaponsSeen = true;
      const override = readWeaponOverride(item);
      if (override) row.weaponOverride = override;
      continue;
    }
    const tag = shipEndingTag(item.tagName);
    if (!tag) continue;
    if (seen.has(tag)) {
      const extra = readShipEnding(item, id, tag, strings, lists);
      const current = shipEnding(row, tag);
      if (extra && current) fillEndingPage(current, extra);
      continue;
    }
    seen.add(tag);
    const ending = readShipEnding(item, id, tag, strings, lists);
    if (!ending) continue;
    if (tag === "surrender") row.surrender = ending as ShipEventChance;
    else if (tag === "escape") row.escape = ending as ShipEventEscape;
    else if (tag === "destroyed") row.destroyed = ending;
    else if (tag === "deadCrew") row.deadCrew = ending;
    else row.gotaway = ending;
  }
  return row;
}

/** `<crewMember type>` or `class`, plus `prop`. A row without a race or a weight is skipped. */
function readShipCrew(node: XmlElement): ShipCrewRow[] {
  const rows: ShipCrewRow[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "crewMember") continue;
    const race = attr(item, "type")?.trim() || attr(item, "class")?.trim() || "";
    const prop = numberAttr(item, "prop");
    if (!race || prop == null) {
      warnPack("A <crewMember> needs a type and a prop; it is skipped.");
      continue;
    }
    rows.push({ race, prop });
  }
  return rows;
}

/** `<weaponOverride count>` and its `<name>` children, in order. A missing count is skipped. */
function readWeaponOverride(node: XmlElement): ShipWeaponOverride | undefined {
  const count = intAttr(node, "count");
  if (count == null || count < 1) {
    warnPack("A <weaponOverride> count is not a whole number above 0; it is skipped.");
    return undefined;
  }
  const names: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "name") continue;
    const name = ownText(item).trim();
    if (name) names.push(name);
  }
  if (names.length === 0) return undefined;
  return { count, names };
}

function readShipEnding(
  node: XmlElement,
  shipId: string,
  tag: (typeof SHIP_ENDINGS)[number],
  strings: Map<string, string>,
  lists: Map<string, OpeningLine[]>,
): ShipEventEnding | undefined {
  const kids = elements(node);
  const load = attr(node, "load")?.trim();
  const ending: ShipEventEnding = {};
  if (kids.length > 0) ending.page = readEventBody(node, `${shipId}:${tag}`, strings, lists);
  else if (load) ending.load = load;
  if (tag !== "surrender" && tag !== "escape") {
    if (!ending.page && !ending.load) return undefined;
    return ending;
  }
  const min = intAttr(node, "min");
  const max = intAttr(node, "max");
  if (min == null || max == null) return ending.page || ending.load ? ending : undefined;
  const band: ShipEventChance = { min, max };
  if (ending.page) band.page = ending.page;
  const chance = numberAttr(node, "chance");
  if (chance != null) band.chance = chance;
  if (!ending.page && ending.load) band.load = ending.load;
  if (tag === "surrender") return band;
  const escape: ShipEventEscape = { ...band };
  const timer = intAttr(node, "timer");
  if (timer != null) escape.timer = timer;
  return escape;
}

function numberAttr(node: XmlElement, name: string): number | undefined {
  const raw = node.getAttribute(name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
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
    const race = attr(node, "class")?.trim() || attr(node, "type")?.trim();
    const named = ownText(node).trim();
    const idAttr = attr(node, "id")?.trim();
    // A name id inlines to the person's name and leaves the race off the tag. Those people join as human.
    const id = race || (named && idAttr && idAttr !== named ? "human" : idAttr);
    if (!id) return undefined;
    const grant: ArchiveGrant = { kind: "crew", id };
    if (named && named !== id) grant.name = named;
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
