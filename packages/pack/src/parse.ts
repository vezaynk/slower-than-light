import {
  DOMParser,
  Node,
  type Document as XmlDocument,
  type Element as XmlElement,
} from "@xmldom/xmldom";
import type {
  AugmentDef,
  ChoiceGift,
  ChoiceReq,
  ContentPack,
  CrewDef,
  DroneDef,
  EmptyBeaconDef,
  EventPrice,
  EventBand,
  TradeStep,
  EventGrade,
  GradePay,
  EventCard,
  EventChoice,
  EventDef,
  EventEffect,
  EventResource,
  EventTier,
  FactionSurrender,
  FillerEntry,
  FillerListDef,
  HullDef,
  HullGrid,
  HullKitDef,
  HullRoom,
  OfferPay,
  OfferRes,
  OfferRow,
  RollEntry,
  NamedReward,
  ResourceReward,
  RewardKind,
  RewardLevel,
  RewardResource,
  RewardScaling,
  RewardTable,
  SectorDef,
  StoreDef,
  StoreLine,
  SurrenderChoice,
  SurrenderOfferDef,
  SurrenderReward,
  SystemDef,
  TuneDef,
  TuneStep,
  WeaponBlueprint,
  WeaponKind,
} from "./types.ts";

const KINDS: Record<string, WeaponKind> = {
  LASER: "laser",
  MISSILE: "missile",
  // FTL 1.6 writes this spelling on missile blueprints.
  MISSILES: "missile",
  BEAM: "beam",
  BOMB: "bomb",
  ION: "ion",
  BURST: "flak",
  FLAK: "flak",
};

/**
 * xmldom keeps parsing after a warning or a non-fatal error unless this throws.
 * A mod file that is not well-formed fails the load.
 */
const parser = new DOMParser({
  onError(level, message) {
    throw new Error(`${level}: ${message}`);
  },
});

export function readDocument(xml: string): XmlDocument {
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`pack XML is not well-formed: ${detail}`);
  }
}

export function elements(node: XmlElement | undefined): XmlElement[] {
  if (!node) return [];
  const found: XmlElement[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children.item(i);
    if (child) found.push(child);
  }
  return found;
}

export function child(node: XmlElement | undefined, tag: string): XmlElement | undefined {
  return elements(node).find((item) => item.tagName === tag);
}

export function ownText(node: XmlElement): string {
  let text = "";
  for (let i = 0; i < node.childNodes.length; i++) {
    const item = node.childNodes.item(i);
    if (!item) continue;
    if (item.nodeType === Node.TEXT_NODE || item.nodeType === Node.CDATA_SECTION_NODE)
      text += item.nodeValue ?? "";
  }
  return text;
}

export function textOf(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found ? ownText(found).trim() : "";
  return text ? text : undefined;
}

export function numOf(node: XmlElement, tag: string): number | undefined {
  const text = textOf(node, tag);
  if (text == null) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

export function attr(node: XmlElement, name: string): string | undefined {
  const value = node.getAttribute(name);
  return value == null ? undefined : value;
}

function attrNum(raw: string | null): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function boolOf(node: XmlElement, tag: string): boolean | undefined {
  const text = textOf(node, tag)?.toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return undefined;
}

function blankCrew(id: string): CrewDef {
  return {
    id,
    name: id,
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
}

function readCrew(node: XmlElement): CrewDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const row = blankCrew(id);
  const title = textOf(node, "title");
  if (title) row.name = title;
  const detail = textOf(node, "desc");
  if (detail) row.detail = detail;
  const cost = numOf(node, "cost");
  if (cost != null) row.cost = cost;
  readCrewCombat(node, row);
  return row;
}

/** Copies Hyperspace combat children onto a crew row. Missing children keep the row's current values. */
export function readCrewCombat(node: XmlElement, row: CrewDef): void {
  const hp = numOf(node, "maxHealth");
  if (hp != null) row.hp = hp;
  const move = numOf(node, "moveSpeedMultiplier");
  if (move != null) row.move = move;
  const repair = numOf(node, "repairSpeed");
  if (repair != null) row.repair = repair;
  const fight = numOf(node, "damageMultiplier");
  if (fight != null) row.fight = fight;
  if (boolOf(node, "canSuffocate") === false) row.suffocate = 0;
  const suffocate = numOf(node, "suffocationModifier");
  if (suffocate != null) row.suffocate = suffocate;
  if (boolOf(node, "canBurn") === false) row.fireTaken = 0;
  const fire = numOf(node, "fireDamageMultiplier");
  if (fire != null) row.fireTaken = fire;
  const extinguish = numOf(node, "fireRepairMultiplier");
  if (extinguish != null) row.fireRepairMultiplier = extinguish;
  const bonus = numOf(node, "bonusPower");
  if (bonus != null) row.bonusPower = bonus;
  if (boolOf(node, "hasDeathExplosion") === true) row.hasDeathExplosion = true;
  const oxygen = numOf(node, "oxygenChangeSpeed");
  if (oxygen != null && oxygen < 0) row.drainsOxygen = true;
  if (boolOf(node, "detectsLifeforms") === true) row.detectsLifeforms = true;
  if (boolOf(node, "resistsMindControl") === true) row.resistsMindControl = true;
  const power = child(node, "powerEffect");
  if (power) {
    if (boolOf(power, "lockdown") === true) row.lockdown = true;
    const cooldown = numOf(power, "cooldown");
    if (cooldown != null) row.lockCooldown = cooldown;
  }
}

export function readWeapon(node: XmlElement): WeaponBlueprint | undefined {
  const id = attr(node, "name")?.trim();
  const kind = KINDS[(textOf(node, "type") ?? "").toUpperCase()];
  if (!id || !kind) return undefined;
  const row: WeaponBlueprint = {
    id,
    name: textOf(node, "title") ?? id,
    kind,
    power: numOf(node, "power") ?? 0,
    charge: numOf(node, "cooldown") ?? 0,
    shots: numOf(node, "shots") ?? 0,
    gap: numOf(node, "shotGap") ?? 0,
    damage: numOf(node, "damage") ?? 0,
    ion: numOf(node, "ion") ?? 0,
    fire: (numOf(node, "fireChance") ?? 0) / 10,
    breach: (numOf(node, "breachChance") ?? 0) / 10,
    ammo: kind === "missile" || (numOf(node, "missiles") ?? 0) > 0,
    price: numOf(node, "cost") ?? 0,
    blurb: textOf(node, "tooltip") ?? textOf(node, "desc") ?? "",
  };
  const length = numOf(node, "length");
  if (length != null) row.lengthTiles = length / 45;
  const speed = numOf(node, "speed");
  if (speed != null) row.speed = speed;
  const crew = numOf(node, "crewDamage");
  if (crew != null) row.crewDamage = crew;
  const pierce = numOf(node, "sp");
  if (pierce != null) row.pierce = pierce;
  const art = textOf(node, "weaponArt");
  if (art) row.art = art;
  const image = textOf(node, "image");
  if (image) row.image = image;
  return row;
}

export function readAugment(node: XmlElement): AugmentDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    detail: textOf(node, "desc") ?? "",
    cost: numOf(node, "cost") ?? 0,
  };
}

export function readDrone(node: XmlElement): DroneDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const row: DroneDef = {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
  };
  const image = textOf(node, "droneImage");
  if (image) row.image = image;
  return row;
}

const SHELF_KIND: Record<string, string> = {
  WEAPONS: "weapons",
  DRONES: "drones",
  AUGMENTS: "augments",
  CREW: "crew",
  SYSTEMS: "systems",
};

/**
 * A store listing needs a cost child, so a tune-only blueprint stays a tune.
 * A slot child of kit is a kit. startPower or one upgradeCost list is the tune.
 */
function readSystemBlueprint(node: XmlElement): { system?: SystemDef; tune?: TuneDef } {
  const id = attr(node, "name")?.trim();
  if (!id) return {};
  const found: { system?: SystemDef; tune?: TuneDef } = {};
  if (child(node, "cost")) {
    const written = textOf(node, "slot");
    found.system = {
      id,
      name: textOf(node, "title") ?? id,
      cost: numOf(node, "cost") ?? 0,
      slot: written === "kit" || written === "sys" ? written : "sys",
    };
  }
  const tune = readBlueprintTune(node, id);
  if (tune) found.tune = tune;
  return found;
}

/**
 * One upgradeCost block. Each level's text is the scrap.
 * n sets that level. A level without n takes the next count, starting at 1.
 */
export function readUpgradeCosts(node: XmlElement): TuneStep[] {
  const costs: TuneStep[] = [];
  let next = 1;
  for (const item of elements(child(node, "upgradeCost"))) {
    if (item.tagName !== "level") continue;
    const cost = Number(ownText(item).trim());
    if (!Number.isFinite(cost)) continue;
    const named = attrNum(item.getAttribute("n"));
    const level = named ?? next;
    costs.push({ level, cost });
    next = level + 1;
  }
  return costs;
}

/** A tune is startPower or one upgradeCost list. A blueprint with neither is only a listing. */
export function readBlueprintTune(node: XmlElement, id: string): TuneDef | undefined {
  if (!child(node, "startPower") && !child(node, "upgradeCost")) return undefined;
  return { id, start: numOf(node, "startPower") ?? 1, costs: readUpgradeCosts(node) };
}

export function readFaction(node: XmlElement): FactionSurrender | undefined {
  const id = attr(node, "name")?.trim();
  if (!id || attr(node, "layout")?.trim()) return undefined;
  const offer = child(node, "surrender");
  if (!offer) return undefined;
  const chance = attrNum(offer.getAttribute("chance"));
  const min = attrNum(offer.getAttribute("min"));
  const max = attrNum(offer.getAttribute("max"));
  if (chance == null || min == null || max == null) return undefined;
  return { id, chance, min, max };
}

function readCount(node: XmlElement): { min: number; max: number } {
  const count = child(node, "count");
  if (!count) return { min: 0, max: 0 };
  const text = Number(ownText(count).trim());
  const min = attrNum(count.getAttribute("min")) ?? (Number.isFinite(text) ? text : 0);
  return { min, max: attrNum(count.getAttribute("max")) ?? min };
}

function itemBlueprint(item: XmlElement): { empty: boolean; id: string } | undefined {
  const blueprint = child(item, "blueprint");
  if (!blueprint) return undefined;
  const id = ownText(blueprint).trim();
  return id ? { empty: false, id } : { empty: true, id: "" };
}

function readNamedItem(item: XmlElement, kind: string): StoreLine | undefined {
  const blueprint = itemBlueprint(item);
  if (!blueprint || blueprint.empty) return undefined;
  const count = readCount(item);
  return {
    id: blueprint.id,
    kind,
    name: textOf(item, "title") ?? blueprint.id,
    cost: numOf(item, "price") ?? 0,
    min: count.min,
    max: count.max,
  };
}

function readResourceLine(node: XmlElement): StoreLine | undefined {
  const type = textOf(node, "type");
  const kind = type === "drones" ? "parts" : type;
  if (kind !== "fuel" && kind !== "missiles" && kind !== "parts") return undefined;
  const count = readCount(node);
  return {
    id: kind,
    kind,
    name: textOf(node, "title") ?? kind,
    cost: numOf(node, "price") ?? 0,
    min: count.min,
    max: count.max,
  };
}

function readRepairLine(node: XmlElement): StoreLine | undefined {
  const count = readCount(node);
  return {
    id: "repair",
    kind: "repair",
    name: textOf(node, "title") ?? "repair",
    cost: numOf(node, "price") ?? 0,
    min: count.min,
    max: count.max,
  };
}

function emptyBlueprints(node: XmlElement): number {
  let count = 0;
  for (const item of elements(node)) {
    if (item.tagName !== "item") continue;
    const blueprint = itemBlueprint(item);
    if (blueprint?.empty) count += 1;
  }
  return count;
}

export function readStore(node: XmlElement): StoreDef | undefined {
  const id = attr(node, "id")?.trim();
  if (!id) return undefined;
  const sections: string[] = [];
  const lines: StoreLine[] = [];
  let weapons = 2;
  let slot = 3;
  let sawWeapons = false;
  let sawSlot = false;
  for (const item of elements(node)) {
    if (item.tagName === "resource") {
      const line = readResourceLine(item);
      if (line) lines.push(line);
      continue;
    }
    if (item.tagName === "hullRepair") {
      const line = readRepairLine(item);
      if (line) lines.push(line);
      continue;
    }
    if (item.tagName === "category") {
      const type = attr(item, "type")?.trim() ?? "";
      const kind = SHELF_KIND[type] ?? type;
      if (kind && !sections.includes(kind)) sections.push(kind);
      const empties = emptyBlueprints(item);
      if (kind === "weapons") {
        if (!sawWeapons) {
          weapons = empties;
          sawWeapons = true;
        }
      } else if (!sawSlot) {
        slot = empties;
        sawSlot = true;
      }
      for (const entry of elements(item)) {
        if (entry.tagName !== "item") continue;
        const line = readNamedItem(entry, kind);
        if (line) lines.push(line);
      }
      continue;
    }
    if (item.tagName === "item" && item.hasAttribute("kind")) {
      const line = readNamedItem(item, attr(item, "kind")?.trim() ?? "");
      if (line) lines.push(line);
    }
  }
  return {
    id,
    name: textOf(node, "title") ?? id,
    slot,
    weapons,
    sections,
    lines,
  };
}

function readSector(node: XmlElement): SectorDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const notes: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "note") continue;
    const text = ownText(item).trim();
    if (text) notes.push(text);
  }
  const tracks: string[] = [];
  for (const item of elements(child(node, "trackList"))) {
    if (item.tagName !== "track") continue;
    const text = ownText(item).trim();
    if (text) tracks.push(text);
  }
  const sector: SectorDef = {
    id,
    name: textOf(node, "title") ?? id,
    group: textOf(node, "type") ?? "",
    notes,
  };
  if (tracks.length > 0) sector.tracks = tracks;
  return sector;
}

export function tagged(doc: XmlDocument, tag: string): XmlElement[] {
  const list = doc.getElementsByTagName(tag);
  const found: XmlElement[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list.item(i);
    if (item) found.push(item);
  }
  return found;
}

function isLevel(value: string | undefined): value is RewardLevel {
  return value === "LOW" || value === "MED" || value === "HIGH";
}

function isRewardKind(value: string | undefined): value is RewardKind {
  return value === "scrap" || value === "fuel" || value === "missiles" || value === "droneparts";
}

function readScaling(node: XmlElement): RewardScaling | undefined {
  const difficulty = attr(node, "difficulty")?.trim();
  if (difficulty != null && difficulty !== "" && difficulty !== "0" && difficulty !== "2")
    return undefined;
  const scrap = child(node, "scrap");
  if (!scrap) return undefined;
  const baseAmount = attrNum(scrap.getAttribute("baseAmount"));
  const sectorAmount = attrNum(scrap.getAttribute("sectorAmount"));
  if (baseAmount == null || sectorAmount == null) return undefined;
  const row: RewardScaling = {
    baseAmount,
    sectorAmount,
    difficultyAmount: attrNum(scrap.getAttribute("difficultyAmount")) ?? 0,
  };
  if (difficulty === "0" || difficulty === "2") row.difficulty = difficulty === "0" ? 0 : 2;
  return row;
}

function readResourceReward(node: XmlElement): ResourceReward | undefined {
  if (!isRewardKind(node.tagName)) return undefined;
  const level = attr(node, "level")?.trim();
  if (!isLevel(level)) return undefined;
  const min = attrNum(node.getAttribute("min"));
  const max = attrNum(node.getAttribute("max"));
  if (min == null || max == null) return undefined;
  return { kind: node.tagName, level, min, max };
}

function readRewardResource(node: XmlElement): RewardResource | undefined {
  const name = attr(node, "name")?.trim();
  if (!isRewardKind(name)) return undefined;
  const level = attr(node, "level")?.trim();
  if (level && !isLevel(level)) return undefined;
  const row: RewardResource = { name };
  if (isLevel(level)) row.level = level;
  return row;
}

function readNamedReward(node: XmlElement): NamedReward | undefined {
  const name = attr(node, "name")?.trim();
  const body = child(node, "reward");
  if (!name || !body) return undefined;
  const resources: RewardResource[] = [];
  for (const item of elements(body)) {
    if (item.tagName !== "resource") continue;
    const row = readRewardResource(item);
    if (row) resources.push(row);
  }
  const reward: NamedReward = { name, resources };
  const minResources = attrNum(body.getAttribute("minResources"));
  const maxResources = attrNum(body.getAttribute("maxResources"));
  if (minResources != null) reward.minResources = minResources;
  if (maxResources != null) reward.maxResources = maxResources;
  const bonus = child(body, "bonus");
  const item = bonus ? child(bonus, "item") : undefined;
  const roll = bonus ? attrNum(bonus.getAttribute("roll")) : undefined;
  const chance = item ? attrNum(item.getAttribute("chance")) : undefined;
  if (roll != null && chance != null) reward.bonus = { roll, chance };
  return reward;
}

/** Direct children of the root rewards block. A surrender reward is not this tag. */
export function readRewards(node: XmlElement): RewardTable | undefined {
  const scaling: RewardScaling[] = [];
  const resources: ResourceReward[] = [];
  const rewards: NamedReward[] = [];
  for (const item of elements(node)) {
    if (item.tagName === "rewardScaling") {
      const row = readScaling(item);
      if (row) scaling.push(row);
      continue;
    }
    if (item.tagName === "resourceRewards") {
      for (const band of elements(item)) {
        const row = readResourceReward(band);
        if (row) resources.push(row);
      }
      continue;
    }
    if (item.tagName !== "reward") continue;
    const row = readNamedReward(item);
    if (row) rewards.push(row);
  }
  if (scaling.length === 0 && resources.length === 0 && rewards.length === 0) return undefined;
  return { scaling, resources, rewards };
}

/** Reads the crew, weapon, augment, drone, system, hull, sector, store, reward, faction, event, filler list, and empty beacon tags this milestone stores. Other tags are ignored. */
export function parsePack(xml: string): ContentPack {
  const doc = readDocument(xml);
  const crew: CrewDef[] = [];
  const weapons: WeaponBlueprint[] = [];
  const augments: AugmentDef[] = [];
  const drones: DroneDef[] = [];
  const systems: SystemDef[] = [];
  const factions: FactionSurrender[] = [];
  const sectors: SectorDef[] = [];
  const stores: StoreDef[] = [];
  const tunes: TuneDef[] = [];
  const events: EventDef[] = [];
  const lists: FillerListDef[] = [];
  const empties: EmptyBeaconDef[] = [];
  for (const node of tagged(doc, "race")) {
    const row = readCrew(node);
    if (row) crew.push(row);
  }
  for (const node of tagged(doc, "weaponBlueprint")) {
    const row = readWeapon(node);
    if (row) weapons.push(row);
  }
  for (const node of tagged(doc, "augBlueprint")) {
    const row = readAugment(node);
    if (row) augments.push(row);
  }
  for (const node of tagged(doc, "droneBlueprint")) {
    const row = readDrone(node);
    if (row) drones.push(row);
  }
  for (const node of tagged(doc, "systemBlueprint")) {
    const row = readSystemBlueprint(node);
    if (row.system) systems.push(row.system);
    if (row.tune) tunes.push(row.tune);
  }
  for (const node of tagged(doc, "shipBlueprint")) {
    const faction = readFaction(node);
    if (faction) factions.push(faction);
  }
  for (const node of tagged(doc, "sectorDescription")) {
    const row = readSector(node);
    if (row) sectors.push(row);
  }
  for (const node of tagged(doc, "customStore")) {
    const row = readStore(node);
    if (row) stores.push(row);
  }
  for (const node of tagged(doc, "event")) {
    const row = readEvent(node);
    if (row) events.push(row);
  }
  for (const node of tagged(doc, "eventList")) {
    const row = readList(node);
    if (row) lists.push(row);
  }
  for (const node of tagged(doc, "emptyBeacon")) {
    const row = readEmpty(node);
    if (row) empties.push(row);
  }
  const rewardsNode = elements(doc.documentElement ?? undefined).find(
    (item) => item.tagName === "rewards",
  );
  const rewards = rewardsNode ? readRewards(rewardsNode) : undefined;
  const pack: ContentPack = {
    crew,
    weapons,
    augments,
    drones,
    systems,
    sectors,
    stores,
    tunes,
    events,
    lists,
    empties,
  };
  if (rewards) pack.rewards = rewards;
  if (factions.length > 0) pack.factions = factions;
  return pack;
}

function readList(node: XmlElement): FillerListDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const entries: FillerEntry[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    const eventId = attr(item, "load")?.trim() || attr(item, "name")?.trim();
    if (!eventId) continue;
    entries.push({ id: eventId, unique: item.getAttribute("unique") === "true" });
  }
  if (entries.length === 0) return undefined;
  return { id, entries };
}

export function readEmpty(node: XmlElement): EmptyBeaconDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const sectors: string[] = [];
  const texts: string[] = [];
  for (const item of elements(node)) {
    if (item.tagName === "sector") {
      const text = ownText(item).trim();
      if (text) sectors.push(text);
      continue;
    }
    if (item.tagName !== "text") continue;
    const text = ownText(item).trim();
    if (text) texts.push(text);
  }
  if (texts.length === 0) return undefined;
  const page: EmptyBeaconDef = {
    id,
    dest: textOf(node, "title") ?? id,
    sectors,
    texts,
  };
  if (node.getAttribute("nebula") === "true") page.nebula = true;
  return page;
}

export function readEvent(node: XmlElement): EventDef | undefined {
  const parent = node.parentNode as XmlElement | null;
  if (parent?.tagName === "eventList") return undefined;
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const aliases: string[] = [];
  const sectors: string[] = [];
  const choices: EventChoice[] = [];
  const lines: string[] = [];
  const offers: OfferRow[] = [];
  const rolls: RollEntry[] = [];
  const cards: EventCard[] = [];
  const prices: EventPrice[] = [];
  const bands: EventBand[] = [];
  const trades: TradeStep[] = [];
  let grade: EventGrade | undefined;
  let surrender: SurrenderOfferDef | undefined;
  for (const item of elements(node)) {
    if (item.tagName === "text") {
      lines.push(ownText(item).trim());
      continue;
    }
    if (item.tagName === "eventList") {
      const name = attr(item, "name")?.trim();
      if (name && OFFER_LISTS.has(name)) {
        for (const offer of readOfferRows(name, item)) offers.push(offer);
      } else if (!name) {
        for (const band of readBandRows(item)) keepBand(bands, band);
      }
      continue;
    }
    if (item.tagName === "item_modify") {
      keepPrice(prices, readNamedPrice(item));
      continue;
    }
    if (item.tagName === "roll") {
      const roll = readRoll(item);
      if (roll) rolls.push(roll);
      continue;
    }
    if (item.tagName === "trade") {
      keepTrade(trades, readTrade(item));
      continue;
    }
    if (item.tagName === "grade") {
      grade ??= readGrade(item);
      continue;
    }
    if (item.tagName === "card") {
      const card = readCard(item);
      if (card) cards.push(card);
      continue;
    }
    if (item.tagName === "surrender") {
      surrender = readSurrender(item);
      continue;
    }
    if (item.tagName !== "choice") continue;
    const choiceId = attr(item, "name")?.trim();
    if (!choiceId) continue;
    const fx = readChoiceEffects(item);
    const choice: EventChoice = { id: choiceId, label: textOf(item, "text") ?? choiceId, fx };
    const reqs = readReqs(item);
    if (reqs) choice.reqs = reqs;
    const gift = readGift(item, "page");
    if (gift) choice.gift = gift;
    choices.push(choice);
  }
  const event: EventDef = {
    id,
    dest: textOf(node, "title") ?? id,
    flag: id,
    aliases,
    sectors,
    body: lines[0] ?? "",
    choices,
  };
  const texts = openingTexts(node, lines);
  if (texts) event.texts = texts;
  if (offers.length > 0) event.offers = offers;
  if (rolls.length > 0) event.rolls = rolls;
  if (prices.length > 0) event.prices = prices;
  if (bands.length > 0) event.bands = bands;
  if (trades.length > 0) event.trades = trades;
  if (grade) event.grade = grade;
  if (cards.length > 0) event.cards = cards;
  if (surrender) event.surrender = surrender;
  if (elements(node).some((item) => item.tagName === "store")) event.store = true;
  return event;
}

const OFFER_LISTS = new Set(["trade", "high", "pt2", "base", "better", "supply"]);

/** Rows of one offer list. A row whose items do not match that list is skipped. */
function readOfferRows(name: string, node: XmlElement): OfferRow[] {
  const rows: OfferRow[] = [];
  for (const event of elements(node)) {
    if (event.tagName !== "event") continue;
    if (attr(event, "name")?.trim() || attr(event, "id")?.trim()) continue;
    const row = readOfferRow(name, event);
    if (row) rows.push(row);
  }
  return rows;
}

function readOfferRow(name: string, event: XmlElement): OfferRow | undefined {
  const modify = child(event, "item_modify");
  if (!modify) return undefined;
  const items = readModifyItems(modify);
  if (!items) return undefined;
  if (name === "trade") return tradeRow(items);
  if (name === "high" || name === "pt2") return fuelRow(name, items);
  if (name === "base" || name === "better") return laniusRow(name, items);
  if (name === "supply") return supplyRow(items);
  return undefined;
}

function readModifyItems(modify: XmlElement): EventEffect[] | undefined {
  const found = elements(modify).filter((item) => item.tagName === "item");
  const items: EventEffect[] = [];
  for (const item of found) {
    const parsed = readResourceItem(item);
    if (!parsed || parsed.k !== "res") return undefined;
    items.push(parsed);
  }
  return items;
}

function tradeRow(items: EventEffect[]): OfferRow | undefined {
  if (items.length !== 2) return undefined;
  const pay = items[0];
  const gain = items[1];
  if (!pay || pay.k !== "res" || !gain || gain.k !== "res") return undefined;
  if (pay.sign !== -1 || gain.sign !== 1) return undefined;
  if (!isOfferRes(pay.id) || !isOfferRes(gain.id)) return undefined;
  return {
    k: "trade",
    pay: pay.id,
    cost: [pay.lo, pay.hi],
    get: gain.id,
    gain: [gain.lo, gain.hi],
  };
}

function fuelRow(band: "high" | "pt2", items: EventEffect[]): OfferRow | undefined {
  if (items.length !== 2) return undefined;
  const fuel = items[0];
  const pay = items[1];
  if (!fuel || fuel.k !== "res" || !pay || pay.k !== "res") return undefined;
  if (fuel.sign !== 1 || fuel.id !== "fuel" || pay.sign !== -1) return undefined;
  if (!isOfferPay(pay.id)) return undefined;
  return { k: "fuel", band, fuel: [fuel.lo, fuel.hi], pay: pay.id, amt: [pay.lo, pay.hi] };
}

function laniusRow(band: "base" | "better", items: EventEffect[]): OfferRow | undefined {
  if (items.length !== 2) return undefined;
  const cost = items[0];
  const scrap = items[1];
  if (!cost || cost.k !== "res" || !scrap || scrap.k !== "res") return undefined;
  if (cost.sign !== -1 || scrap.sign !== 1 || scrap.id !== "scrap") return undefined;
  if (!isOfferRes(cost.id)) return undefined;
  return {
    k: "lanius",
    band,
    res: cost.id,
    cost: [cost.lo, cost.hi],
    scrap: [scrap.lo, scrap.hi],
  };
}

function supplyRow(items: EventEffect[]): OfferRow | undefined {
  if (items.length !== 3) return undefined;
  const missiles = items[0];
  const parts = items[1];
  const fuel = items[2];
  if (
    !missiles ||
    missiles.k !== "res" ||
    !parts ||
    parts.k !== "res" ||
    !fuel ||
    fuel.k !== "res"
  ) {
    return undefined;
  }
  if (missiles.sign !== 1 || parts.sign !== 1 || fuel.sign !== 1) return undefined;
  if (missiles.id !== "missiles" || parts.id !== "parts" || fuel.id !== "fuel") return undefined;
  return {
    k: "supply",
    missiles: [missiles.lo, missiles.hi],
    parts: [parts.lo, parts.hi],
    fuel: [fuel.lo, fuel.hi],
  };
}

function isOfferRes(value: string): value is OfferRes {
  return value === "fuel" || value === "missiles" || value === "parts";
}

function isOfferPay(value: string): value is OfferPay {
  return value === "parts" || value === "missiles" || value === "scrap";
}

/** One direct card child. A card with no body or no button is skipped. */
function readCard(node: XmlElement): EventCard | undefined {
  const body = (textOf(node, "text") ?? "").trim();
  const choices = elements(node).flatMap((item) => {
    if (item.tagName !== "choice") return [];
    const id = attr(item, "name")?.trim();
    if (!id) return [];
    const reqs = readReqs(item);
    const gift = readGift(item, "card");
    const choice: EventCard["choices"][number] = { id, label: choiceLabel(item, id) };
    if (reqs) choice.reqs = reqs;
    if (gift) choice.gift = gift;
    return [choice];
  });
  if (!body || choices.length === 0) return undefined;
  return { body, choices };
}

/** One direct roll child. An entry with no text is skipped. A repeated hull stays repeated. */
function readRoll(node: XmlElement): RollEntry | undefined {
  const kind = attr(node, "k");
  const text = ownText(node).trim();
  if (kind === "hull") return text ? { k: "hull", id: text } : undefined;
  if (kind === "label") return text ? { k: "label", text } : undefined;
  if (kind === "count") {
    const n = attrNum(node.getAttribute("n"));
    if (n == null || !Number.isInteger(n) || !text) return undefined;
    return { k: "count", n, word: text };
  }
  return undefined;
}

/** Sentences after the page body. One text is just the body. */
function openingTexts(node: XmlElement, lines: string[]): string[] | undefined {
  if (lines.length < 2) return undefined;
  const aside = node.getAttribute("intro") === "after" || lines[0] === "";
  const texts = aside ? lines.slice(1) : lines;
  return texts.length > 1 ? texts : undefined;
}

function levelTier(level: string | undefined): EventTier | undefined {
  if (level === "LOW") return "low";
  if (level === "MED") return "medium";
  if (level === "HIGH") return "high";
  return undefined;
}

function emptyBlueprint(node: XmlElement | undefined): boolean {
  if (!node) return false;
  return !attr(node, "name")?.trim() && ownText(node).trim() === "";
}

/** A missing reward child is none. A bad autoReward skips the whole offer. */
function readSurrenderReward(node: XmlElement): SurrenderReward | undefined {
  const autos = elements(node).filter((item) => item.tagName === "autoReward");
  const weapons = elements(node).filter((item) => item.tagName === "weapon");
  const drones = elements(node).filter((item) => item.tagName === "drone");
  const augments = elements(node).filter((item) => item.tagName === "augment");
  const crews = elements(node).filter((item) => item.tagName === "crewMember");
  const repairs = elements(node).filter((item) => item.tagName === "fuelRepairs");
  const present =
    autos.length + weapons.length + drones.length + augments.length + crews.length + repairs.length;
  if (present === 0) return { k: "none" };
  if (autos.length > 0) {
    const text = ownText(autos[0]!).trim();
    const level = attr(autos[0]!, "level")?.trim();
    const tier = levelTier(level);
    if (level && !tier) return undefined;
    if (text === "stuff") return tier ? { k: "stuff", tier } : { k: "stuff" };
    if (text === "standard") {
      if (!tier) return undefined;
      const race = crews[0] ? ownText(crews[0]).trim() : "";
      return race ? { k: "standard", tier, race } : { k: "standard", tier };
    }
    if (text === "scrap_only") {
      if (!tier) return undefined;
      const unnamed = emptyBlueprint(weapons[0])
        ? "weapon"
        : emptyBlueprint(drones[0])
          ? "drone"
          : emptyBlueprint(augments[0])
            ? "augment"
            : undefined;
      return unnamed ? { k: "scrap", tier, unnamed } : { k: "scrap", tier };
    }
    return undefined;
  }
  const named = weapons.find((item) => attr(item, "name")?.trim());
  const weaponName = named ? attr(named, "name")?.trim() : undefined;
  if (weaponName) return { k: "weapon", name: weaponName };
  if (crews.length > 0) {
    const race = ownText(crews[0]!).trim();
    return race ? { k: "crew", race } : { k: "crew" };
  }
  if (repairs.length > 0) {
    const n = attrNum(repairs[0]!.getAttribute("repairs"));
    if (n == null) return undefined;
    return { k: "fuel-repairs", repairs: n };
  }
  return undefined;
}

function readSurrender(node: XmlElement): SurrenderOfferDef | undefined {
  const chance = attrNum(node.getAttribute("chance"));
  const low = attrNum(node.getAttribute("min"));
  const high = attrNum(node.getAttribute("max"));
  const reward = readSurrenderReward(node);
  const hails = elements(node)
    .filter((item) => item.tagName === "text")
    .map((item) => ownText(item).trim())
    .filter((text) => text.length > 0);
  const accept = readNamedChoice(node, "surrender-accept");
  if (chance == null || low == null || high == null || !reward || hails.length === 0 || !accept)
    return undefined;
  const offer: SurrenderOfferDef = {
    chance,
    low,
    high,
    reward,
    hail: hails[0]!,
    accept: accept.label,
    refuse: readNamedChoice(node, "surrender-refuse")?.label ?? "",
  };
  if (hails.length > 1) offer.hails = hails;
  if (node.getAttribute("continues") === "true") offer.continues = true;
  if (node.getAttribute("forced") === "true") offer.forced = true;
  const quest = attr(node, "quest")?.trim();
  if (quest) offer.quest = quest;
  const result = textOf(node, "result");
  if (result) offer.result = result;
  const extra = elements(node).find(
    (item) =>
      item.tagName === "choice" &&
      attr(item, "name")?.trim() &&
      attr(item, "name") !== "surrender-accept" &&
      attr(item, "name") !== "surrender-refuse",
  );
  if (extra) {
    const id = attr(extra, "name")?.trim();
    if (id) offer.extra = { id, label: choiceLabel(extra, id) };
  }
  const cardNode = child(node, "card");
  if (cardNode) {
    const body = textOf(cardNode, "text") ?? ownText(cardNode).trim();
    const choices = elements(cardNode)
      .filter((item) => item.tagName === "choice")
      .flatMap((item) => {
        const id = attr(item, "name")?.trim();
        return id ? [{ id, label: choiceLabel(item, id) }] : [];
      });
    if (body) offer.card = { body, choices };
  }
  return offer;
}

function readNamedChoice(node: XmlElement, name: string): SurrenderChoice | undefined {
  const found = elements(node).find(
    (item) => item.tagName === "choice" && attr(item, "name") === name,
  );
  if (!found) return undefined;
  return { id: name, label: choiceLabel(found, name) };
}

function choiceLabel(node: XmlElement, fallback: string): string {
  return textOf(node, "text") ?? (ownText(node).trim() || fallback);
}

/** The first grade with a hire and a payment. An empty hire or a bad payment is skipped. */
function readGrade(node: XmlElement): EventGrade | undefined {
  const hire = attr(node, "hire")?.trim();
  if (!hire) return undefined;
  const pays: GradePay[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "pay") continue;
    const pay = readPay(item);
    if (pay) pays.push(pay);
  }
  if (pays.length === 0) return undefined;
  return { hire, pays };
}

function readPay(node: XmlElement): GradePay | undefined {
  const k = attr(node, "k")?.trim();
  if (k !== "scrap" && k !== "fuel" && k !== "parts") return undefined;
  const lo = intAttr(node, "lo");
  const hi = intAttr(node, "hi");
  if (lo == null || hi == null || lo > hi) return undefined;
  return { k, lo, hi };
}

/** The first valid price for an id. A blank id, an unknown kind, or a backwards band is skipped. */
function keepPrice(prices: EventPrice[], price: EventPrice | undefined) {
  if (!price || prices.some((row) => row.id === price.id)) return;
  prices.push(price);
}

/** A direct named item_modify. The first scrap or fuel item is the price. */
function readNamedPrice(node: XmlElement): EventPrice | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  for (const item of elements(node)) {
    if (item.tagName !== "item") continue;
    const parsed = readResourceItem(item);
    if (!parsed || parsed.k !== "res" || parsed.sign !== 1) continue;
    if (parsed.id !== "scrap" && parsed.id !== "fuel") continue;
    return { id, k: parsed.id, lo: parsed.lo, hi: parsed.hi };
  }
  return undefined;
}

/** The first valid band for a specialty and the level already owned. */
function keepTrade(trades: TradeStep[], step: TradeStep | undefined) {
  if (!step || trades.some((row) => tradeKey(row) === tradeKey(step))) return;
  trades.push(step);
}

function tradeKey(step: TradeStep): string {
  return step.level == null ? `${step.id}:*` : `${step.id}:${step.level}`;
}

function readTrade(node: XmlElement): TradeStep | undefined {
  const id = attr(node, "id")?.trim();
  if (!id) return undefined;
  const lo = intAttr(node, "lo");
  const hi = intAttr(node, "hi");
  if (lo == null || hi == null || lo > hi) return undefined;
  const levelText = attr(node, "level");
  if (levelText == null || levelText.trim() === "") return { id, lo, hi };
  const level = intAttr(node, "level");
  if (level == null || level < 0) return undefined;
  return { id, level, lo, hi };
}

/** The first valid printed range for an id and a kind. */
function keepBand(bands: EventBand[], band: EventBand | undefined) {
  if (!band || bands.some((row) => row.id === band.id && row.k === band.k)) return;
  bands.push(band);
}

/** Bands live in a nameless eventList. A negative range is not a printed band. */
function readBandRows(node: XmlElement): EventBand[] {
  const bands: EventBand[] = [];
  for (const event of elements(node)) {
    if (event.tagName !== "event") continue;
    if (attr(event, "name")?.trim() || attr(event, "id")?.trim()) continue;
    const modify = child(event, "item_modify");
    if (!modify) continue;
    const id = attr(modify, "name")?.trim();
    if (!id) continue;
    for (const item of elements(modify)) {
      if (item.tagName !== "item") continue;
      const band = readBandItem(id, item);
      if (!band) continue;
      bands.push(band);
      break;
    }
  }
  return bands;
}

function readBandItem(id: string, node: XmlElement): EventBand | undefined {
  const type = attr(node, "type")?.trim();
  const k = type === "drones" ? "parts" : type;
  if (k !== "scrap" && k !== "fuel" && k !== "missiles" && k !== "parts" && k !== "level") {
    return undefined;
  }
  const lo = intAttr(node, "min");
  const hi = intAttr(node, "max");
  if (lo == null || hi == null || lo > hi || lo < 0) return undefined;
  return { id, k, lo, hi };
}

/**
 * A page gift is fuel inside the empty result.
 * A card has no results, so a direct fuel item_modify is the gift.
 * A direct fuel item on a page stays a resource effect.
 */
function readGift(node: XmlElement, where: "page" | "card"): ChoiceGift | undefined {
  if (where === "card") {
    for (const item of elements(node)) {
      if (item.tagName !== "item_modify") continue;
      const gift = fuelGift(item);
      if (gift) return gift;
    }
    return undefined;
  }
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    if (attr(item, "load")?.trim()) continue;
    if (textOf(item, "text") != null) continue;
    const modify = child(item, "item_modify");
    if (!modify) continue;
    const gift = fuelGift(modify);
    if (gift) return gift;
  }
  return undefined;
}

function fuelGift(modify: XmlElement): ChoiceGift | undefined {
  const items = elements(modify).filter((item) => item.tagName === "item");
  if (items.length !== 1) return undefined;
  const item = items[0];
  if (!item || attr(item, "type")?.trim() !== "fuel") return undefined;
  const lo = intAttr(item, "min");
  const hi = intAttr(item, "max");
  if (lo == null || hi == null || lo > hi || lo < 0) return undefined;
  return { k: "fuel", lo, hi };
}

/** Direct req children. An unknown kind, a blank refusal, or a bad number is skipped. */
function readReqs(node: XmlElement): ChoiceReq[] | undefined {
  const reqs: ChoiceReq[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "req") continue;
    const req = readReq(item);
    if (req) reqs.push(req);
  }
  return reqs.length > 0 ? reqs : undefined;
}

function intAttr(node: XmlElement, name: string): number | undefined {
  const value = attrNum(node.getAttribute(name));
  if (value == null || !Number.isInteger(value)) return undefined;
  return value;
}

function readReq(node: XmlElement): ChoiceReq | undefined {
  const text = ownText(node).trim();
  if (!text) return undefined;
  const crew = namedChild(node, "crewMember");
  if (crew) return { k: "crew", id: crew, text };
  const augment = namedChild(node, "augment");
  if (augment) return { k: "augment", id: augment, text };
  const drone = namedChild(node, "drone");
  if (drone) return { k: "drone", id: drone, text };
  const weapon = child(node, "weapon");
  if (weapon) {
    const name = attr(weapon, "name")?.trim();
    if (name) return { k: "weapon", id: name, text };
    const family = attr(node, "req")?.trim();
    if (!family) return undefined;
    return { k: "family", id: family, text };
  }
  const stock = readStockReq(node);
  if (stock) return { k: "stock", id: stock.id, n: stock.n, text };
  const id = attr(node, "req")?.trim();
  const lvl = intAttr(node, "lvl");
  const max = intAttr(node, "max_lvl");
  if (max != null) {
    if (!id || lvl == null || lvl > max) return undefined;
    return { k: "band", id, lo: lvl, hi: max, text };
  }
  if (lvl != null && id) return { k: "system", id, level: lvl, text };
  return undefined;
}

function namedChild(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const name = found ? attr(found, "name")?.trim() : undefined;
  return name ? name : undefined;
}

/** An exact negative resource. A range is not a stock lock. */
function readStockReq(node: XmlElement): { id: string; n: number } | undefined {
  const modify = child(node, "item_modify");
  if (!modify) return undefined;
  const items = elements(modify).filter((item) => item.tagName === "item");
  if (items.length !== 1) return undefined;
  const item = items[0];
  if (!item) return undefined;
  const type = attr(item, "type")?.trim();
  const id = type === "drones" ? "parts" : type;
  if (id !== "scrap" && id !== "fuel" && id !== "missiles" && id !== "parts") return undefined;
  const min = intAttr(item, "min");
  const max = intAttr(item, "max");
  if (min == null || max == null || min !== max || min >= 0) return undefined;
  return { id, n: -min };
}

/** Choice results, in document order. */
function readChoiceEffects(node: XmlElement): EventEffect[] {
  const fx: EventEffect[] = [];
  for (const child of elements(node)) {
    for (const effect of readChoiceEffect(child) ?? []) fx.push(effect);
  }
  return fx;
}

function readChoiceEffect(node: XmlElement): EventEffect[] | undefined {
  if (node.tagName === "effect") {
    const parsed = readEffect(node);
    return parsed ? [parsed] : undefined;
  }
  if (node.tagName === "item_modify") {
    const rows: EventEffect[] = [];
    for (const item of elements(node)) {
      if (item.tagName !== "item") continue;
      const parsed = readResourceItem(item);
      if (parsed) rows.push(parsed);
    }
    return rows;
  }
  if (node.tagName === "ship") {
    const tier = attr(node, "load")?.trim();
    if (!tier) return undefined;
    const effect: EventEffect = { k: "fight", tier };
    if (node.getAttribute("asteroid") === "true") effect.asteroid = true;
    return [effect];
  }
  if (node.tagName === "event") {
    const load = attr(node, "load")?.trim();
    if (load) return [{ k: "goto", id: load }];
    const text = textOf(node, "text");
    if (text != null) return [{ k: "note", text }];
    return [{ k: "nothing" }];
  }
  if (node.tagName === "damage") {
    const amount = intAttr(node, "amount");
    if (amount == null) return undefined;
    return [{ k: "hull", n: -amount }];
  }
  if (node.tagName === "modifyPursuit") {
    const amount = intAttr(node, "amount");
    if (amount == null) return undefined;
    const faster = node.getAttribute("faster") === "true";
    const effect: EventEffect = { k: "fleet", n: faster ? amount : -amount };
    if (node.getAttribute("double") === "true") effect.double = true;
    if (faster) effect.faster = true;
    if (node.getAttribute("lastStand") === "true") effect.lastStand = true;
    return [effect];
  }
  if (node.tagName === "weapon" || node.tagName === "drone" || node.tagName === "augment") {
    return [
      {
        k: "item",
        item: node.tagName === "weapon" ? "weapon" : node.tagName === "drone" ? "drone" : "augment",
      },
    ];
  }
  return undefined;
}

function readResourceItem(node: XmlElement): EventEffect | undefined {
  const type = attr(node, "type")?.trim();
  const id = type === "drones" ? "parts" : type;
  if (!isResource(id)) return undefined;
  const min = intAttr(node, "min");
  const max = intAttr(node, "max");
  if (min == null || max == null || min > max) return undefined;
  if (max < 0 || (max === 0 && min < 0)) return { k: "res", id, sign: -1, lo: -max, hi: -min };
  return { k: "res", id, sign: 1, lo: min, hi: max };
}

function readEffect(node: XmlElement): EventEffect | undefined {
  const kind = attr(node, "k");
  if (kind === "tier") {
    const tier = attr(node, "tier");
    if (!isTier(tier)) return undefined;
    const effect: EventEffect = { k: "tier", tier };
    if (node.hasAttribute("resources"))
      effect.resources = node.getAttribute("resources") === "true";
    return effect;
  }
  if (kind === "quest") {
    const id = attr(node, "id")?.trim();
    if (!id) return undefined;
    return { k: "quest", id };
  }
  if (kind === "close") return { k: "close" };
  return undefined;
}

function isResource(value: string | undefined): value is EventResource {
  return value === "scrap" || value === "fuel" || value === "missiles" || value === "parts";
}

function isTier(value: string | undefined): value is EventTier {
  return value === "low" || value === "medium" || value === "high";
}
