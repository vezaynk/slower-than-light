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
  EventGrade,
  GradePay,
  EventCard,
  EventChoice,
  EventDef,
  EventEffect,
  EventItem,
  EventResource,
  EventTier,
  FillerEntry,
  FillerListDef,
  HullDef,
  HullKitDef,
  HullLayout,
  OfferPay,
  OfferRes,
  OfferRow,
  RollEntry,
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

function readDocument(xml: string): XmlDocument {
  try {
    const doc = parser.parseFromString(xml, "text/xml");
    if (!doc.documentElement) throw new Error("the document has no root element");
    return doc;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`pack XML is not well-formed: ${detail}`);
  }
}

function elements(node: XmlElement | undefined): XmlElement[] {
  if (!node) return [];
  const found: XmlElement[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children.item(i);
    if (child) found.push(child);
  }
  return found;
}

function child(node: XmlElement, tag: string): XmlElement | undefined {
  return elements(node).find((item) => item.tagName === tag);
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

function textOf(node: XmlElement, tag: string): string | undefined {
  const found = child(node, tag);
  const text = found ? ownText(found).trim() : "";
  return text ? text : undefined;
}

function numOf(node: XmlElement, tag: string): number | undefined {
  const text = textOf(node, tag);
  if (text == null) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function attr(node: XmlElement, name: string): string | undefined {
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
  return row;
}

function readWeapon(node: XmlElement): WeaponBlueprint | undefined {
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
  // FTL names shield pierce <sp>. <pierce> is the same field.
  const pierce = numOf(node, "sp") ?? numOf(node, "pierce");
  if (pierce != null) row.pierce = pierce;
  return row;
}

function readAugment(node: XmlElement): AugmentDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    detail: textOf(node, "desc") ?? "",
    cost: numOf(node, "cost") ?? 0,
  };
}

function readDrone(node: XmlElement): DroneDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
  };
}

function readSystem(node: XmlElement): SystemDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  return {
    id,
    name: textOf(node, "title") ?? id,
    cost: numOf(node, "cost") ?? 0,
    slot: textOf(node, "slot") === "kit" ? "kit" : "sys",
  };
}

function hullLayout(value: string | undefined): HullLayout {
  return value === "B" || value === "C" ? value : "A";
}

function readHull(node: XmlElement): HullDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const systems: Record<string, [number, number]> = {};
  for (const item of elements(child(node, "systemList"))) {
    if (item.tagName !== "system") continue;
    const sysId = attr(item, "name")?.trim();
    if (!sysId) continue;
    systems[sysId] = [numOf(item, "level") ?? 0, numOf(item, "power") ?? 0];
  }
  const weapons: string[] = [];
  for (const item of elements(child(node, "weaponList"))) {
    if (item.tagName !== "weapon") continue;
    const weaponId = (ownText(item).trim() || attr(item, "name")?.trim()) ?? "";
    if (weaponId) weapons.push(weaponId);
  }
  const crew: HullDef["crew"] = [];
  for (const item of elements(child(node, "crewList"))) {
    if (item.tagName !== "crewMember") continue;
    const kin = attr(item, "kin")?.trim();
    const room = attr(item, "room")?.trim();
    if (!kin || !room) continue;
    crew.push({ kin, room });
  }
  const kits: Record<string, HullKitDef> = {};
  for (const item of elements(child(node, "kitList"))) {
    if (item.tagName !== "kit") continue;
    const kitId = attr(item, "name")?.trim();
    if (!kitId) continue;
    const kit: HullKitDef = { level: numOf(item, "level") ?? 0, power: numOf(item, "power") ?? 0 };
    const target = textOf(item, "target");
    if (target != null) kit.target = target;
    const loadout = child(item, "loadout");
    if (loadout) {
      kit.loadout = elements(loadout)
        .filter((entry) => entry.tagName === "schematic")
        .map((entry) => ownText(entry).trim())
        .filter((entry) => entry.length > 0);
    }
    const on = boolOf(item, "on");
    if (on !== undefined) kit.on = on;
    kits[kitId] = kit;
  }
  const augments: string[] = [];
  for (const item of elements(child(node, "augmentList"))) {
    if (item.tagName !== "augment") continue;
    const augmentId = ownText(item).trim();
    if (augmentId) augments.push(augmentId);
  }
  const unfitted: string[] = [];
  for (const item of elements(child(node, "unfitted"))) {
    if (item.tagName !== "item") continue;
    const label = ownText(item).trim();
    if (label) unfitted.push(label);
  }
  return {
    id,
    cruiser: textOf(node, "class") ?? "",
    layout: hullLayout(attr(node, "layout")?.trim()),
    name: textOf(node, "title") ?? id,
    quote: textOf(node, "desc") ?? "",
    unlock: textOf(node, "unlock") ?? "",
    source: textOf(node, "source") ?? "",
    reactor: numOf(node, "reactor") ?? 0,
    fuel: numOf(node, "fuel") ?? 0,
    missiles: numOf(node, "missiles") ?? 0,
    parts: numOf(node, "parts") ?? 0,
    systems,
    weapons,
    crew,
    kits,
    augments,
    unfitted,
  };
}

function readStore(node: XmlElement): StoreDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const sections: string[] = [];
  const lines: StoreLine[] = [];
  for (const item of elements(node)) {
    if (item.tagName === "section") {
      const text = ownText(item).trim();
      if (text) sections.push(text);
      continue;
    }
    if (item.tagName !== "stock") continue;
    const lineId = attr(item, "id")?.trim();
    if (!lineId) continue;
    const min = attrNum(item.getAttribute("min")) ?? 0;
    lines.push({
      id: lineId,
      kind: attr(item, "kind")?.trim() ?? "",
      name: textOf(item, "title") ?? lineId,
      cost: numOf(item, "cost") ?? 0,
      min,
      max: attrNum(item.getAttribute("max")) ?? min,
    });
  }
  return {
    id,
    name: textOf(node, "title") ?? id,
    slot: numOf(node, "slot") ?? 3,
    weapons: numOf(node, "weapons") ?? 2,
    sections,
    lines,
  };
}

function readTune(node: XmlElement): TuneDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const costs: TuneStep[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "upgrade") continue;
    const level = attrNum(item.getAttribute("level"));
    if (level == null) continue;
    const cost = Number(ownText(item).trim());
    if (!Number.isFinite(cost)) continue;
    costs.push({ level, cost });
  }
  return {
    id,
    start: numOf(node, "start") ?? 1,
    costs,
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
  return {
    id,
    name: textOf(node, "title") ?? id,
    group: textOf(node, "type") ?? "",
    notes,
  };
}

function tagged(doc: XmlDocument, tag: string): XmlElement[] {
  const list = doc.getElementsByTagName(tag);
  const found: XmlElement[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list.item(i);
    if (item) found.push(item);
  }
  return found;
}

/** Reads the crew, weapon, augment, drone, system, hull, sector, store, tune, event, filler list, and empty beacon tags this milestone stores. Other tags are ignored. */
export function parsePack(xml: string): ContentPack {
  const doc = readDocument(xml);
  const crew: CrewDef[] = [];
  const weapons: WeaponBlueprint[] = [];
  const augments: AugmentDef[] = [];
  const drones: DroneDef[] = [];
  const systems: SystemDef[] = [];
  const hulls: HullDef[] = [];
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
    const row = readSystem(node);
    if (row) systems.push(row);
  }
  for (const node of tagged(doc, "shipBlueprint")) {
    const row = readHull(node);
    if (row) hulls.push(row);
  }
  for (const node of tagged(doc, "sectorDescription")) {
    const row = readSector(node);
    if (row) sectors.push(row);
  }
  for (const node of tagged(doc, "storeBlueprint")) {
    const row = readStore(node);
    if (row) stores.push(row);
  }
  for (const node of tagged(doc, "systemTune")) {
    const row = readTune(node);
    if (row) tunes.push(row);
  }
  for (const node of tagged(doc, "eventBlueprint")) {
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
  return {
    crew,
    weapons,
    augments,
    drones,
    systems,
    hulls,
    sectors,
    stores,
    tunes,
    events,
    lists,
    empties,
  };
}

function readList(node: XmlElement): FillerListDef | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const entries: FillerEntry[] = [];
  for (const item of elements(node)) {
    if (item.tagName !== "event") continue;
    const eventId = attr(item, "id")?.trim();
    if (!eventId) continue;
    entries.push({ id: eventId, unique: item.getAttribute("unique") === "true" });
  }
  return { id, entries };
}

function readEmpty(node: XmlElement): EmptyBeaconDef | undefined {
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

function readEvent(node: XmlElement): EventDef | undefined {
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
  let grade: EventGrade | undefined;
  let surrender: SurrenderOfferDef | undefined;
  for (const item of elements(node)) {
    if (item.tagName === "text") {
      lines.push(ownText(item).trim());
      continue;
    }
    if (item.tagName === "offer") {
      const offer = readOffer(item);
      if (offer) offers.push(offer);
      continue;
    }
    if (item.tagName === "roll") {
      const roll = readRoll(item);
      if (roll) rolls.push(roll);
      continue;
    }
    if (item.tagName === "price") {
      keepPrice(prices, readPrice(item));
      continue;
    }
    if (item.tagName === "bribe") {
      keepPrice(prices, readBribe(item));
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
    if (item.tagName === "alias") {
      const text = ownText(item).trim();
      if (text) aliases.push(text);
      continue;
    }
    if (item.tagName === "sector") {
      const text = ownText(item).trim();
      if (text) sectors.push(text);
      continue;
    }
    if (item.tagName !== "choice") continue;
    const choiceId = attr(item, "name")?.trim();
    if (!choiceId) continue;
    const fx: EventEffect[] = [];
    for (const effect of elements(item)) {
      if (effect.tagName !== "effect") continue;
      const parsed = readEffect(effect);
      if (parsed) fx.push(parsed);
    }
    const choice: EventChoice = { id: choiceId, label: textOf(item, "text") ?? choiceId, fx };
    const reqs = readReqs(item);
    if (reqs) choice.reqs = reqs;
    const gift = readGift(item);
    if (gift) choice.gift = gift;
    choices.push(choice);
  }
  const event: EventDef = {
    id,
    dest: textOf(node, "title") ?? id,
    flag: attr(node, "flag")?.trim() || `cited:${id}`,
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
  if (grade) event.grade = grade;
  if (cards.length > 0) event.cards = cards;
  if (surrender) event.surrender = surrender;
  return event;
}

function bandOf(raw: string | undefined): [number, number] | undefined {
  if (!raw) return undefined;
  const match = /^(-?\d+)-(-?\d+)$/.exec(raw.trim());
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2])];
}

function offerRes(raw: string | undefined): OfferRes | undefined {
  if (raw === "fuel" || raw === "missiles" || raw === "parts") return raw;
  return undefined;
}

function offerPay(raw: string | undefined): OfferPay | undefined {
  if (raw === "parts" || raw === "missiles" || raw === "scrap") return raw;
  return undefined;
}

/** One direct offer child. A row missing its bands is skipped. */
function readOffer(node: XmlElement): OfferRow | undefined {
  const kind = attr(node, "k");
  if (kind === "trade") {
    const pay = offerRes(attr(node, "pay"));
    const get = offerRes(attr(node, "get"));
    const cost = bandOf(attr(node, "cost"));
    const gain = bandOf(attr(node, "gain"));
    if (!pay || !get || !cost || !gain) return undefined;
    return { k: "trade", pay, cost, get, gain };
  }
  if (kind === "fuel") {
    const band = attr(node, "band");
    const fuel = bandOf(attr(node, "fuel"));
    const pay = offerPay(attr(node, "pay"));
    const amt = bandOf(attr(node, "amt"));
    if ((band !== "high" && band !== "pt2") || !fuel || !pay || !amt) return undefined;
    return { k: "fuel", band, fuel, pay, amt };
  }
  if (kind === "lanius") {
    const band = attr(node, "band");
    const res = offerRes(attr(node, "res"));
    const cost = bandOf(attr(node, "cost"));
    const scrap = bandOf(attr(node, "scrap"));
    if ((band !== "base" && band !== "better") || !res || !cost || !scrap) return undefined;
    return { k: "lanius", band, res, cost, scrap };
  }
  if (kind === "supply") {
    const missiles = bandOf(attr(node, "missiles"));
    const parts = bandOf(attr(node, "parts"));
    const fuel = bandOf(attr(node, "fuel"));
    if (!missiles || !parts || !fuel) return undefined;
    return { k: "supply", missiles, parts, fuel };
  }
  return undefined;
}

/** One direct card child. A card with no body or no button is skipped. */
function readCard(node: XmlElement): EventCard | undefined {
  const body = (textOf(node, "text") ?? "").trim();
  const choices = elements(node).flatMap((item) => {
    if (item.tagName !== "choice") return [];
    const id = attr(item, "name")?.trim();
    if (!id) return [];
    const reqs = readReqs(item);
    const gift = readGift(item);
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

function readSurrender(node: XmlElement): SurrenderOfferDef | undefined {
  const chance = attrNum(node.getAttribute("chance"));
  const low = attrNum(node.getAttribute("low"));
  const high = attrNum(node.getAttribute("high"));
  const rewardNode = child(node, "reward");
  const reward = rewardNode ? readReward(rewardNode) : undefined;
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

function readPrice(node: XmlElement): EventPrice | undefined {
  const id = attr(node, "id")?.trim();
  return id ? readBand(node, id) : undefined;
}

/** A bribe tag is the scrap price named bribe. */
function readBribe(node: XmlElement): EventPrice | undefined {
  if (attr(node, "k")?.trim() !== "scrap") return undefined;
  return readBand(node, "bribe");
}

function readBand(node: XmlElement, id: string): EventPrice | undefined {
  const k = attr(node, "k")?.trim();
  if (k !== "scrap" && k !== "fuel") return undefined;
  const lo = intAttr(node, "lo");
  const hi = intAttr(node, "hi");
  if (lo == null || hi == null || lo > hi) return undefined;
  return { id, k, lo, hi };
}

/** The first fuel gift. An unknown kind, a bad number, or a backwards band is skipped. */
function readGift(node: XmlElement): ChoiceGift | undefined {
  for (const item of elements(node)) {
    if (item.tagName !== "gift") continue;
    if (attr(item, "k")?.trim() !== "fuel") continue;
    const lo = intAttr(item, "lo");
    const hi = intAttr(item, "hi");
    if (lo == null || hi == null || lo > hi) continue;
    return { k: "fuel", lo, hi };
  }
  return undefined;
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
  const kind = attr(node, "k")?.trim();
  const id = attr(node, "id")?.trim();
  const text = ownText(node).trim();
  if (!kind || !id || !text) return undefined;
  if (
    kind === "crew" ||
    kind === "augment" ||
    kind === "weapon" ||
    kind === "family" ||
    kind === "drone"
  ) {
    return { k: kind, id, text };
  }
  if (kind === "system") {
    const level = intAttr(node, "level");
    if (level == null) return undefined;
    return { k: "system", id, level, text };
  }
  if (kind === "band") {
    const lo = intAttr(node, "lo");
    const hi = intAttr(node, "hi");
    if (lo == null || hi == null || lo > hi) return undefined;
    return { k: "band", id, lo, hi, text };
  }
  if (kind === "stock") {
    const n = intAttr(node, "n");
    if (n == null) return undefined;
    return { k: "stock", id, n, text };
  }
  return undefined;
}

function readReward(node: XmlElement): SurrenderReward | undefined {
  const kind = attr(node, "k");
  if (kind === "none") return { k: "none" };
  if (kind === "crew") {
    const race = attr(node, "race")?.trim();
    return race ? { k: "crew", race } : { k: "crew" };
  }
  if (kind === "stuff") {
    const tier = attr(node, "tier");
    if (!tier) return { k: "stuff" };
    if (!isTier(tier)) return undefined;
    return { k: "stuff", tier };
  }
  if (kind === "fuel-repairs") {
    const repairs = attrNum(node.getAttribute("repairs"));
    if (repairs == null) return undefined;
    return { k: "fuel-repairs", repairs };
  }
  if (kind === "weapon") {
    const name = attr(node, "name")?.trim();
    if (!name) return undefined;
    return { k: "weapon", name };
  }
  if (kind === "standard") {
    const tier = attr(node, "tier");
    if (!isTier(tier)) return undefined;
    const race = attr(node, "race")?.trim();
    return race ? { k: "standard", tier, race } : { k: "standard", tier };
  }
  if (kind === "scrap") {
    const tier = attr(node, "tier");
    if (!isTier(tier)) return undefined;
    const unnamed = attr(node, "unnamed");
    if (!unnamed) return { k: "scrap", tier };
    if (!isItem(unnamed)) return undefined;
    return { k: "scrap", tier, unnamed };
  }
  return undefined;
}

function isItem(value: string): value is EventItem {
  return value === "weapon" || value === "augment" || value === "drone";
}

function readEffect(node: XmlElement): EventEffect | undefined {
  const kind = attr(node, "k");
  if (kind === "nothing") return { k: "nothing" };
  if (kind === "note") return { k: "note", text: ownText(node).trim() };
  if (kind === "item") {
    const item = attr(node, "item");
    if (item !== "weapon" && item !== "augment" && item !== "drone") return undefined;
    return { k: "item", item };
  }
  if (kind === "hull") {
    const n = attrNum(node.getAttribute("n"));
    if (n == null) return undefined;
    return { k: "hull", n };
  }
  if (kind === "res") {
    const id = attr(node, "id");
    if (!isResource(id)) return undefined;
    const lo = attrNum(node.getAttribute("lo"));
    const hi = attrNum(node.getAttribute("hi"));
    if (lo == null || hi == null) return undefined;
    const sign = attrNum(node.getAttribute("sign"));
    return { k: "res", id, sign: sign === -1 ? -1 : 1, lo, hi };
  }
  if (kind === "tier") {
    const tier = attr(node, "tier");
    if (!isTier(tier)) return undefined;
    const effect: EventEffect = { k: "tier", tier };
    if (node.hasAttribute("resources"))
      effect.resources = node.getAttribute("resources") === "true";
    return effect;
  }
  if (kind === "fleet") {
    const n = attrNum(node.getAttribute("n"));
    if (n == null) return undefined;
    const effect: EventEffect = { k: "fleet", n };
    if (node.hasAttribute("double")) effect.double = node.getAttribute("double") === "true";
    if (node.hasAttribute("faster")) effect.faster = node.getAttribute("faster") === "true";
    if (node.hasAttribute("lastStand"))
      effect.lastStand = node.getAttribute("lastStand") === "true";
    return effect;
  }
  if (kind === "fight") {
    const tier = attr(node, "tier")?.trim();
    if (!tier) return undefined;
    const effect: EventEffect = { k: "fight", tier };
    if (node.hasAttribute("asteroid")) effect.asteroid = node.getAttribute("asteroid") === "true";
    return effect;
  }
  if (kind === "quest" || kind === "goto") {
    const id = attr(node, "id")?.trim();
    if (!id) return undefined;
    return { k: kind, id };
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
