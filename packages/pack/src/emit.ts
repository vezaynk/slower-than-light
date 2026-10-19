import {
  DOMImplementation,
  XMLSerializer,
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
  EventCard,
  EventDef,
  EventEffect,
  FactionSurrender,
  FillerListDef,
  HullDef,
  NamedReward,
  OfferRow,
  RewardTable,
  RollEntry,
  SectorDef,
  StoreDef,
  StoreLine,
  SurrenderOfferDef,
  SurrenderReward,
  SystemDef,
  TuneDef,
  WeaponBlueprint,
  WeaponKind,
} from "./types.ts";
import { prettyXml } from "./format.ts";

const TYPE: Record<WeaponKind, string> = {
  laser: "LASER",
  missile: "MISSILE",
  beam: "BEAM",
  bomb: "BOMB",
  ion: "ION",
  flak: "BURST",
};

/** Hyperspace's anaerobic sample uses this. Any negative value sets drainsOxygen. */
const OXYGEN_DRAIN = -0.5;

const HEADER = `
  Base pack written from the loaded crew, weapon, augment, drone, system, hull, sector, store, reward, faction, event, filler list, and empty beacon records.
  Race tags are Hyperspace names. Weapon tags are FTL blueprint names.
  Augment tags are the listing id, title, description, and store cost.
  Drone tags are the listing id, title, and store cost.
  A systemBlueprint with a cost is a store listing. subSystem marks a kit.
  startPower is the level a purchase installs. upgradeCost is the scrap for the level already owned.
  Hull tags are the ship id, class, layout file, and starting loadout. The layout file is data/<layout>.txt. A roomList names the rooms. A system's room attribute is the room index.
  A shipBlueprint with no layout and a surrender tag is a faction's default offer.
  Sector tags are the sector id, title, colour group, and page notes. Depth gates stay in code.
  A customStore holds resource lines, hull repair, and one category per section.
  Empty blueprint items are the weapon shelf and the other section size.
  A rewards block is the scrap scaling and the fuel, missile, and drone-part bands.
  An event tag is a page. flag, title, alias, and sector are extra names this sim looks up.
  A resource result is item_modify. Drone parts use type drones. A loss stores the negative range.
  A fight is a hostile ship. Its load is the ship name this sim already fights.
  An empty nested event is an empty result. A nested event with text is a result sentence. load opens another page.
  Hull change is damage. A positive amount hurts. A negative amount repairs.
  A plain fleet delay is modifyPursuit with a negative amount. faster and lastStand are extra.
  Several text tags are the opening sentences. The first is the page body.
  An empty first text keeps that body blank. intro="after" means the body is its own sentence and the list follows.
  The sim still picks one sentence when the card opens.
  An offer table is an eventList named trade, high, pt2, base, better, or supply.
  Each row is a nameless event with one item_modify. The sim still picks the row and still rolls its bands.
  A trade row spends a resource and gains a resource. A fuel row gains fuel, then spends parts, missiles, or scrap.
  A Lanius row spends a resource and gains scrap. A supply row holds missiles, drone parts, and fuel. A band may be 0-0.
  high and pt2 are the fuel lists. base and better are the Lanius lists.
  A roll tag is one entry of a list the card draws. A repeated hull is a heavier weight.
  A hull entry is a ship id. A label entry is a button sentence. A count entry is a number and its word.
  A card tag is one whole opening the page draws. The sim still draws one with between.
  The buttons on that opening stay handlers in code.
  Filler opening cards use that same event tag. A slug a sector page already uses stays that sector page.
  A choice is its id, label, effects, req locks, and an optional fuel gift.
  A req is checked in order. Its text is the refusal. A system lock is req and lvl. A band lock also sets max_lvl.
  A stock lock is a negative item_modify inside the req. Crew, augment, drone, and weapon locks name that blueprint.
  A weapon family is an empty weapon tag and the req attribute.
  A gift is the fuel the handler pays. On a page it sits inside the empty result. On a card it is a fuel item_modify.
  A fixed gift has the same ends and does not roll.
  A named price is a direct item_modify. The name is the price. The item is scrap or fuel.
  A fixed price does not roll. A missing price omits that button and pays nothing.
  A button that shows the amount still reads it from the choice id.
  Printed bands are item_modify rows inside a nameless eventList. The name is the row. Level is an item type.
  A fixed band does not roll. A missing band pays or grants nothing and does not roll.
  An upgrade row uses the same name twice, once for scrap and once for level.
  A trade tag is one scrap band for a specialty and the level already owned.
  The reactor row omits the level. The sim still picks one open specialty and still rolls that band.
  A fixed trade does not roll. The handler still reads the amount from the choice id.
  A grade tag hires a crew when the picked count matches, and pays its bands when it does not.
  A fixed payment does not roll. The handler still compares the two numbers on the choice id.
  A quest effect names a marker. A goto effect opens another page.
  An arrival page has an empty sector list and the flag quest: plus the quest id.
  A surrender tag on a fight page stores the chance, the hull band as min and max, the hail, and the reward.
  An autoReward names stuff, standard, or scrap_only. A weapon names that blueprint. A crewMember is the race.
  The sim still checks the hull and still hands that reward over.
  An event list with page names is drawn in that order. unique means the page can appear once per sector.
  The sim still remembers which unique page already appeared.
  A list with no page ids is an offer table or the printed bands.
  An empty beacon stores the sentences for a quiet jump and the sectors that use them.
  sp is shield layers pierced. power is reactor bars.
  shotGap is the seconds between shots in one volley. FTL keeps that delay in the animation.
  A negative oxygenChangeSpeed means the race drains air. The air model does not use the magnitude.
`;

const implementation = new DOMImplementation();
const serializer = new XMLSerializer();

/**
 * Writes the pack as FTL weapon blueprints, Hyperspace race tags, and the store listings.
 * shotGap is the seconds between shots in one volley. FTL keeps that delay in the animation.
 * A negative oxygenChangeSpeed means the race drains air. The magnitude is not the vent rate.
 * sp is shield layers pierced. power is reactor bars.
 * An augment listing is its id, title, description, and store cost.
 * A drone listing is its id, title, and store cost.
 * A system listing is its id, title, store cost, and subSystem when it installs as a kit.
 * startPower and upgradeCost on that same blueprint are the tune.
 * A hull is its id, class, layout file, name, and starting loadout. The layout file is data/<layout>.txt. A roomList names the rooms.
 * A ship with no layout and a surrender tag is a faction row.
 * A sector is its id, title, colour group, and page notes. Depth gates stay in the chart code.
 * A store is a customStore. Empty blueprint items set the shelf sizes.
 * A rewards block derives scrap and stores the resource bands.
 * Section count, the hull-repair rate, and the reactor formula stay in code.
 */
/** Which crew and sector fields a document keeps. The default writes both. */
export type EmitSlice = {
  crew?: "full" | "identity" | "stats";
  sector?: "full" | "body" | "gap";
};

export function emitPack(pack: ContentPack, slice: EmitSlice = {}): string {
  const crewPart = slice.crew ?? "full";
  const sectorPart = slice.sector ?? "full";
  const doc = implementation.createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("pack document has no root");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  doc.insertBefore(doc.createComment(HEADER), root);

  const crew = doc.createElement("crew");
  for (const race of pack.crew ?? []) add(crew, raceElement(doc, race, crewPart));
  add(root, crew);
  for (const weapon of pack.weapons ?? []) add(root, weaponElement(doc, weapon));
  for (const augment of pack.augments ?? []) add(root, augmentElement(doc, augment));
  for (const drone of pack.drones ?? []) add(root, droneElement(doc, drone));
  const systems = pack.systems ?? [];
  const tunes = pack.tunes ?? [];
  const systemById = new Map(systems.map((row) => [row.id, row]));
  const tuneById = new Map(tunes.map((row) => [row.id, row]));
  for (const id of mergeIds(systems, tunes)) {
    add(root, systemElement(doc, systemById.get(id), tuneById.get(id)));
  }
  for (const faction of pack.factions ?? []) add(root, factionElement(doc, faction));
  for (const sector of pack.sectors ?? []) add(root, sectorElement(doc, sector, sectorPart));
  for (const store of pack.stores ?? []) add(root, storeElement(doc, store));
  if (pack.rewards) add(root, rewardsElement(doc, pack.rewards));
  for (const event of pack.events ?? []) add(root, eventElement(doc, event));
  for (const list of pack.lists ?? []) add(root, listElement(doc, list));
  for (const empty of pack.empties ?? []) add(root, emptyElement(doc, empty));
  return prettyXml(serializer.serializeToString(doc));
}

function listElement(doc: XmlDocument, list: FillerListDef): XmlElement {
  const node = element(doc, "eventList", { name: list.id });
  for (const entry of list.entries) {
    add(node, element(doc, "event", { name: entry.id, unique: entry.unique ? "true" : "false" }));
  }
  return node;
}

function emptyElement(doc: XmlDocument, page: EmptyBeaconDef): XmlElement {
  const attrs: Record<string, string> = { name: page.id };
  if (page.nebula) attrs.nebula = "true";
  const node = element(doc, "emptyBeacon", attrs);
  add(node, leaf(doc, "title", page.dest));
  for (const sector of page.sectors) add(node, leaf(doc, "sector", sector));
  for (const text of page.texts) add(node, leaf(doc, "text", text));
  return node;
}

function eventElement(doc: XmlDocument, event: EventDef): XmlElement {
  const texts = event.texts ?? [];
  const attrs: Record<string, string> = { name: event.id, flag: event.flag };
  if (texts.length > 1 && event.body !== "" && event.body !== texts[0]) attrs.intro = "after";
  const node = element(doc, "event", attrs);
  add(node, leaf(doc, "title", event.dest));
  for (const alias of event.aliases) add(node, leaf(doc, "alias", alias));
  for (const sector of event.sectors) add(node, leaf(doc, "sector", sector));
  const lines =
    texts.length > 1 ? (event.body === texts[0] ? texts : [event.body, ...texts]) : [event.body];
  for (const line of lines) add(node, leaf(doc, "text", line));
  for (const list of offerLists(doc, event.offers ?? [])) add(node, list);
  for (const roll of event.rolls ?? []) add(node, rollElement(doc, roll));
  for (const price of event.prices ?? []) add(node, priceElement(doc, price));
  if (event.bands?.length) add(node, bandListElement(doc, event.bands));
  for (const step of event.trades ?? []) add(node, tradeElement(doc, step));
  if (event.grade) add(node, gradeElement(doc, event.grade));
  for (const card of event.cards ?? []) add(node, cardElement(doc, card));
  for (const choice of event.choices) {
    const choiceNode = element(doc, "choice", { name: choice.id });
    add(choiceNode, leaf(doc, "text", choice.label));
    for (const req of choice.reqs ?? []) add(choiceNode, reqElement(doc, req));
    let placedGift = false;
    for (const fx of choice.fx) {
      if (fx.k === "nothing" && choice.gift && !placedGift) {
        add(choiceNode, nothingEvent(doc, choice.gift));
        placedGift = true;
      } else {
        add(choiceNode, effectElement(doc, fx));
      }
    }
    add(node, choiceNode);
  }
  if (event.surrender) add(node, surrenderElement(doc, event.surrender));
  return node;
}

/** Consecutive rows that share a list name stay in one eventList. Document order is the flat row order. */
function offerLists(doc: XmlDocument, offers: OfferRow[]): XmlElement[] {
  const lists: XmlElement[] = [];
  let current: { name: string; node: XmlElement } | undefined;
  for (const offer of offers) {
    const name = offerListName(offer);
    if (!current || current.name !== name) {
      const node = element(doc, "eventList", { name });
      lists.push(node);
      current = { name, node };
    }
    add(current.node, offerEvent(doc, offer));
  }
  return lists;
}

function offerListName(offer: OfferRow): string {
  if (offer.k === "trade") return "trade";
  if (offer.k === "fuel" || offer.k === "lanius") return offer.band;
  return "supply";
}

function offerEvent(doc: XmlDocument, offer: OfferRow): XmlElement {
  const event = element(doc, "event", {});
  const modify = element(doc, "item_modify", {});
  if (offer.k === "trade") {
    add(modify, resourceItem(doc, offer.pay, offer.cost[0], offer.cost[1], -1));
    add(modify, resourceItem(doc, offer.get, offer.gain[0], offer.gain[1], 1));
  } else if (offer.k === "fuel") {
    add(modify, resourceItem(doc, "fuel", offer.fuel[0], offer.fuel[1], 1));
    add(modify, resourceItem(doc, offer.pay, offer.amt[0], offer.amt[1], -1));
  } else if (offer.k === "lanius") {
    add(modify, resourceItem(doc, offer.res, offer.cost[0], offer.cost[1], -1));
    add(modify, resourceItem(doc, "scrap", offer.scrap[0], offer.scrap[1], 1));
  } else {
    add(modify, resourceItem(doc, "missiles", offer.missiles[0], offer.missiles[1], 1));
    add(modify, resourceItem(doc, "parts", offer.parts[0], offer.parts[1], 1));
    add(modify, resourceItem(doc, "fuel", offer.fuel[0], offer.fuel[1], 1));
  }
  add(event, modify);
  return event;
}

function cardElement(doc: XmlDocument, card: EventCard): XmlElement {
  const node = element(doc, "card", {});
  add(node, leaf(doc, "text", card.body));
  for (const choice of card.choices)
    add(node, choiceElement(doc, choice.id, choice.label, choice.reqs, choice.gift));
  return node;
}

function rollElement(doc: XmlDocument, roll: RollEntry): XmlElement {
  const text = roll.k === "hull" ? roll.id : roll.k === "label" ? roll.text : roll.word;
  const attrs: Record<string, string> = { k: roll.k };
  if (roll.k === "count") attrs.n = num(roll.n);
  const node = element(doc, "roll", attrs);
  node.appendChild(doc.createTextNode(text));
  return node;
}

function surrenderElement(doc: XmlDocument, offer: SurrenderOfferDef): XmlElement {
  const attrs: Record<string, string> = {
    chance: num(offer.chance),
    min: num(offer.low),
    max: num(offer.high),
  };
  if (offer.continues) attrs.continues = "true";
  if (offer.forced) attrs.forced = "true";
  if (offer.quest) attrs.quest = offer.quest;
  const node = element(doc, "surrender", attrs);
  for (const hail of offer.hails?.length ? offer.hails : [offer.hail])
    add(node, leaf(doc, "text", hail));
  for (const child of surrenderReward(doc, offer.reward)) add(node, child);
  if (offer.result) add(node, leaf(doc, "result", offer.result));
  add(node, choiceElement(doc, "surrender-accept", offer.accept));
  if (offer.refuse) add(node, choiceElement(doc, "surrender-refuse", offer.refuse));
  if (offer.extra) add(node, choiceElement(doc, offer.extra.id, offer.extra.label));
  if (offer.card) {
    const card = element(doc, "card", {});
    add(card, leaf(doc, "text", offer.card.body));
    for (const choice of offer.card.choices) add(card, choiceElement(doc, choice.id, choice.label));
    add(node, card);
  }
  return node;
}

function choiceElement(
  doc: XmlDocument,
  id: string,
  label: string,
  reqs?: ChoiceReq[],
  gift?: ChoiceGift,
): XmlElement {
  const node = element(doc, "choice", { name: id });
  add(node, leaf(doc, "text", label));
  for (const req of reqs ?? []) add(node, reqElement(doc, req));
  if (gift) add(node, fuelModify(doc, gift));
  return node;
}

/** A page gift lives inside the empty result, so a direct fuel item stays a resource effect. */
function nothingEvent(doc: XmlDocument, gift: ChoiceGift): XmlElement {
  const node = element(doc, "event", {});
  add(node, fuelModify(doc, gift));
  return node;
}

function fuelModify(doc: XmlDocument, gift: ChoiceGift): XmlElement {
  const node = element(doc, "item_modify", {});
  add(node, resourceItem(doc, "fuel", gift.lo, gift.hi, 1));
  return node;
}

function priceElement(doc: XmlDocument, price: EventPrice): XmlElement {
  const node = element(doc, "item_modify", { name: price.id });
  add(node, resourceItem(doc, price.k, price.lo, price.hi, 1));
  return node;
}

function bandListElement(doc: XmlDocument, bands: EventBand[]): XmlElement {
  const list = element(doc, "eventList", {});
  for (const band of bands) {
    const event = element(doc, "event", {});
    const modify = element(doc, "item_modify", { name: band.id });
    add(modify, resourceItem(doc, band.k, band.lo, band.hi, 1));
    add(event, modify);
    add(list, event);
  }
  return list;
}

function resourceItem(
  doc: XmlDocument,
  type: string,
  lo: number,
  hi: number,
  sign: 1 | -1,
): XmlElement {
  const loss = sign === -1;
  return element(doc, "item", {
    type: type === "parts" ? "drones" : type,
    min: num(loss ? -hi : lo),
    max: num(loss ? -lo : hi),
  });
}

function tradeElement(doc: XmlDocument, step: TradeStep): XmlElement {
  const attrs: Record<string, string> = { id: step.id };
  if (step.level != null) attrs.level = num(step.level);
  attrs.lo = num(step.lo);
  attrs.hi = num(step.hi);
  return element(doc, "trade", attrs);
}

function gradeElement(doc: XmlDocument, grade: EventGrade): XmlElement {
  const node = element(doc, "grade", { hire: grade.hire });
  for (const pay of grade.pays) {
    add(node, element(doc, "pay", { k: pay.k, lo: num(pay.lo), hi: num(pay.hi) }));
  }
  return node;
}

function reqElement(doc: XmlDocument, req: ChoiceReq): XmlElement {
  if (req.k === "system") return reqText(doc, { req: req.id, lvl: num(req.level) }, req.text);
  if (req.k === "band") {
    return reqText(doc, { req: req.id, lvl: num(req.lo), max_lvl: num(req.hi) }, req.text);
  }
  if (req.k === "stock") {
    const node = element(doc, "req", {});
    const modify = element(doc, "item_modify", {});
    add(modify, resourceItem(doc, req.id, req.n, req.n, -1));
    add(node, modify);
    node.appendChild(doc.createTextNode(req.text));
    return node;
  }
  if (req.k === "crew") return blueprintReq(doc, "crewMember", req.id, req.text);
  if (req.k === "augment") return blueprintReq(doc, "augment", req.id, req.text);
  if (req.k === "drone") return blueprintReq(doc, "drone", req.id, req.text);
  if (req.k === "weapon") return blueprintReq(doc, "weapon", req.id, req.text);
  const node = element(doc, "req", { req: req.id });
  add(node, element(doc, "weapon", {}));
  node.appendChild(doc.createTextNode(req.text));
  return node;
}

function reqText(doc: XmlDocument, attrs: Record<string, string>, text: string): XmlElement {
  const node = element(doc, "req", attrs);
  node.appendChild(doc.createTextNode(text));
  return node;
}

function blueprintReq(doc: XmlDocument, tag: string, id: string, text: string): XmlElement {
  const node = element(doc, "req", {});
  add(node, element(doc, tag, { name: id }));
  node.appendChild(doc.createTextNode(text));
  return node;
}

const REWARD_LEVEL: Record<"low" | "medium" | "high", string> = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
};

function autoReward(doc: XmlDocument, word: string, level?: string): XmlElement {
  const node = element(doc, "autoReward", level ? { level } : {});
  node.appendChild(doc.createTextNode(word));
  return node;
}

function crewReward(doc: XmlDocument, race?: string): XmlElement {
  const node = element(doc, "crewMember", {});
  if (race) node.appendChild(doc.createTextNode(race));
  return node;
}

function surrenderReward(doc: XmlDocument, reward: SurrenderReward): XmlElement[] {
  if (reward.k === "none") return [];
  if (reward.k === "stuff")
    return [autoReward(doc, "stuff", reward.tier ? REWARD_LEVEL[reward.tier] : undefined)];
  if (reward.k === "standard") {
    const nodes = [autoReward(doc, "standard", REWARD_LEVEL[reward.tier])];
    if (reward.race) nodes.push(crewReward(doc, reward.race));
    return nodes;
  }
  if (reward.k === "scrap") {
    const nodes = [autoReward(doc, "scrap_only", REWARD_LEVEL[reward.tier])];
    if (reward.unnamed) nodes.push(element(doc, reward.unnamed, {}));
    return nodes;
  }
  if (reward.k === "weapon") return [element(doc, "weapon", { name: reward.name })];
  if (reward.k === "crew") return [crewReward(doc, reward.race)];
  return [element(doc, "fuelRepairs", { repairs: num(reward.repairs) })];
}

function effectElement(doc: XmlDocument, fx: EventEffect): XmlElement {
  if (fx.k === "nothing") return element(doc, "event", {});
  if (fx.k === "note") {
    const node = element(doc, "event", {});
    add(node, leaf(doc, "text", fx.text));
    return node;
  }
  if (fx.k === "quest") return element(doc, "effect", { k: "quest", id: fx.id });
  if (fx.k === "goto") return element(doc, "event", { load: fx.id });
  if (fx.k === "close") return element(doc, "effect", { k: "close" });
  if (fx.k === "item") return element(doc, fx.item, {});
  if (fx.k === "hull") return element(doc, "damage", { amount: num(-fx.n) });
  if (fx.k === "res") {
    const node = element(doc, "item_modify", {});
    add(node, resourceItem(doc, fx.id, fx.lo, fx.hi, fx.sign));
    return node;
  }
  if (fx.k === "tier") {
    const attrs: Record<string, string> = { k: "tier", tier: fx.tier };
    if (fx.resources !== undefined) attrs.resources = String(fx.resources);
    return element(doc, "effect", attrs);
  }
  if (fx.k === "fleet") {
    const attrs: Record<string, string> = {
      amount: num(fx.faster ? fx.n : -fx.n),
    };
    if (fx.double) attrs.double = "true";
    if (fx.faster) attrs.faster = "true";
    if (fx.lastStand) attrs.lastStand = "true";
    return element(doc, "modifyPursuit", attrs);
  }
  const attrs: Record<string, string> = { hostile: "true", load: fx.tier };
  if (fx.asteroid) attrs.asteroid = "true";
  return element(doc, "ship", attrs);
}

const SHELF: Record<string, string> = {
  weapons: "WEAPONS",
  drones: "DRONES",
  augments: "AUGMENTS",
  crew: "CREW",
  systems: "SYSTEMS",
};

function countElement(doc: XmlDocument, min: number, max: number): XmlElement {
  return element(doc, "count", { min: num(min), max: num(max) });
}

function resourceLine(doc: XmlDocument, line: StoreLine): XmlElement {
  const node = element(doc, "resource", {});
  add(node, leaf(doc, "type", line.kind === "parts" ? "drones" : line.kind));
  add(node, countElement(doc, line.min, line.max));
  add(node, leaf(doc, "price", line.cost));
  add(node, leaf(doc, "title", line.name));
  return node;
}

function repairLine(doc: XmlDocument, line: StoreLine): XmlElement {
  const node = element(doc, "hullRepair", {});
  add(node, leaf(doc, "price", line.cost));
  add(node, countElement(doc, line.min, line.max));
  add(node, leaf(doc, "title", line.name));
  return node;
}

function stockItem(doc: XmlDocument, line: StoreLine, direct: boolean): XmlElement {
  const item = element(doc, "item", direct ? { kind: line.kind } : {});
  add(item, leaf(doc, "blueprint", line.id));
  add(item, leaf(doc, "price", line.cost));
  add(item, countElement(doc, line.min, line.max));
  add(item, leaf(doc, "title", line.name));
  return item;
}

function emptyItem(doc: XmlDocument): XmlElement {
  const item = element(doc, "item", {});
  add(item, element(doc, "blueprint", {}));
  return item;
}

function storeElement(doc: XmlDocument, store: StoreDef): XmlElement {
  const node = element(doc, "customStore", { id: store.id });
  add(node, leaf(doc, "title", store.name));
  for (const line of store.lines) {
    if (line.kind === "fuel" || line.kind === "missiles" || line.kind === "parts") {
      add(node, resourceLine(doc, line));
    }
  }
  for (const line of store.lines) {
    if (line.kind === "repair") add(node, repairLine(doc, line));
  }
  for (const section of store.sections) {
    const category = element(doc, "category", { type: SHELF[section] ?? section });
    const empties = section === "weapons" ? store.weapons : store.slot;
    for (let i = 0; i < empties; i++) add(category, emptyItem(doc));
    for (const line of store.lines) {
      if (line.kind !== section) continue;
      if (
        line.kind === "fuel" ||
        line.kind === "missiles" ||
        line.kind === "parts" ||
        line.kind === "repair"
      ) {
        continue;
      }
      add(category, stockItem(doc, line, false));
    }
    add(node, category);
  }
  for (const line of store.lines) {
    if (
      line.kind === "fuel" ||
      line.kind === "missiles" ||
      line.kind === "parts" ||
      line.kind === "repair"
    ) {
      continue;
    }
    if (store.sections.includes(line.kind)) continue;
    add(node, stockItem(doc, line, true));
  }
  return node;
}

/** Tune order is the spine. System-only ids land before the next shared system. */
function mergeIds(systems: SystemDef[], tunes: TuneDef[]): string[] {
  const index = new Map(systems.map((row, i) => [row.id, i]));
  const emitted = new Set<string>();
  const out: string[] = [];
  const emit = (id: string) => {
    if (emitted.has(id)) return;
    emitted.add(id);
    out.push(id);
  };
  for (const tune of tunes) {
    const at = index.get(tune.id);
    if (at != null) {
      for (let i = 0; i < at; i++) emit(systems[i]!.id);
    }
    emit(tune.id);
  }
  for (const system of systems) emit(system.id);
  return out;
}

function factionElement(doc: XmlDocument, row: FactionSurrender): XmlElement {
  const node = element(doc, "shipBlueprint", { name: row.id });
  add(
    node,
    element(doc, "surrender", { chance: num(row.chance), min: num(row.min), max: num(row.max) }),
  );
  return node;
}

function rewardsElement(doc: XmlDocument, table: RewardTable): XmlElement {
  const node = element(doc, "rewards", {});
  for (const row of table.scaling) {
    const attrs: Record<string, string> = {};
    if (row.difficulty !== undefined) attrs.difficulty = num(row.difficulty);
    const scaling = element(doc, "rewardScaling", attrs);
    const scrap: Record<string, string> = {
      baseAmount: num(row.baseAmount),
      sectorAmount: num(row.sectorAmount),
    };
    if (row.difficultyAmount !== 0) scrap.difficultyAmount = num(row.difficultyAmount);
    add(scaling, element(doc, "scrap", scrap));
    add(node, scaling);
  }
  const resources = element(doc, "resourceRewards", {});
  for (const row of table.resources) {
    add(
      resources,
      element(doc, row.kind, { level: row.level, min: num(row.min), max: num(row.max) }),
    );
  }
  add(node, resources);
  for (const reward of table.rewards) add(node, namedRewardElement(doc, reward));
  return node;
}

function namedRewardElement(doc: XmlDocument, reward: NamedReward): XmlElement {
  const node = element(doc, "reward", { name: reward.name });
  const attrs: Record<string, string> = {};
  if (reward.minResources != null) attrs.minResources = num(reward.minResources);
  if (reward.maxResources != null) attrs.maxResources = num(reward.maxResources);
  const body = element(doc, "reward", attrs);
  for (const resource of reward.resources) {
    const resourceAttrs: Record<string, string> = { name: resource.name };
    if (resource.level) resourceAttrs.level = resource.level;
    add(body, element(doc, "resource", resourceAttrs));
  }
  if (reward.bonus) {
    const bonus = element(doc, "bonus", { roll: num(reward.bonus.roll) });
    add(bonus, element(doc, "item", { chance: num(reward.bonus.chance) }));
    add(body, bonus);
  }
  add(node, body);
  return node;
}

function sectorElement(
  doc: XmlDocument,
  sector: SectorDef,
  part: NonNullable<EmitSlice["sector"]>,
): XmlElement {
  const node = element(doc, "sectorDescription", { name: sector.id });
  if (part !== "gap") add(node, leaf(doc, "title", sector.name));
  if (part !== "body") add(node, leaf(doc, "type", sector.group));
  if (part !== "body") for (const note of sector.notes) add(node, leaf(doc, "note", note));
  // Track names belong on the stand-in body. The gap file (base.xml) leaves them out.
  if (part !== "gap" && sector.tracks && sector.tracks.length > 0) {
    const list = element(doc, "trackList", {});
    for (const name of sector.tracks) add(list, leaf(doc, "track", name));
    add(node, list);
  }
  return node;
}

function systemElement(doc: XmlDocument, system?: SystemDef, tune?: TuneDef): XmlElement {
  const id = system?.id ?? tune?.id ?? "";
  const attrs: Record<string, string> = { name: id };
  if (system?.slot === "kit") attrs.subSystem = "true";
  const node = element(doc, "systemBlueprint", attrs);
  if (system) {
    add(node, leaf(doc, "title", system.name));
    add(node, leaf(doc, "cost", system.cost));
  }
  if (tune) {
    add(node, leaf(doc, "startPower", tune.start));
    for (const step of tune.costs) {
      const upgrade = element(doc, "upgradeCost", {});
      add(upgrade, leaf(doc, "level", step.level));
      add(upgrade, leaf(doc, "cost", step.cost));
      add(node, upgrade);
    }
  }
  return node;
}

function droneElement(doc: XmlDocument, drone: DroneDef): XmlElement {
  const node = element(doc, "droneBlueprint", { name: drone.id });
  add(node, leaf(doc, "title", drone.name));
  add(node, leaf(doc, "cost", drone.cost));
  return node;
}

function augmentElement(doc: XmlDocument, augment: AugmentDef): XmlElement {
  const node = element(doc, "augBlueprint", { name: augment.id });
  add(node, leaf(doc, "title", augment.name));
  add(node, leaf(doc, "desc", augment.detail));
  add(node, leaf(doc, "cost", augment.cost));
  return node;
}

function weaponElement(doc: XmlDocument, weapon: WeaponBlueprint): XmlElement {
  const node = element(doc, "weaponBlueprint", { name: weapon.id });
  add(node, leaf(doc, "type", TYPE[weapon.kind]));
  add(node, leaf(doc, "title", weapon.name));
  add(node, leaf(doc, "tooltip", weapon.blurb));
  add(node, leaf(doc, "damage", weapon.damage));
  add(node, leaf(doc, "shots", weapon.shots));
  add(node, leaf(doc, "power", weapon.power));
  add(node, leaf(doc, "cooldown", weapon.charge));
  add(node, leaf(doc, "cost", weapon.price));
  add(node, leaf(doc, "fireChance", tenths(weapon.fire)));
  add(node, leaf(doc, "breachChance", tenths(weapon.breach)));
  add(node, leaf(doc, "ion", weapon.ion));
  add(node, leaf(doc, "shotGap", weapon.gap));
  if (weapon.ammo) add(node, leaf(doc, "missiles", 1));
  if (weapon.lengthTiles != null) add(node, leaf(doc, "length", scaled(weapon.lengthTiles, 45)));
  if (weapon.speed != null) add(node, leaf(doc, "speed", weapon.speed));
  if (weapon.crewDamage != null) add(node, leaf(doc, "crewDamage", weapon.crewDamage));
  if (weapon.pierce != null) add(node, leaf(doc, "sp", weapon.pierce));
  return node;
}

function raceElement(
  doc: XmlDocument,
  race: CrewDef,
  part: NonNullable<EmitSlice["crew"]>,
): XmlElement {
  const node = element(doc, "race", { name: race.id });
  if (part !== "stats") {
    add(node, leaf(doc, "title", race.name));
    if (race.detail) add(node, leaf(doc, "desc", race.detail));
    if (race.cost != null) add(node, leaf(doc, "cost", race.cost));
  }
  if (part === "identity") return node;
  add(node, leaf(doc, "maxHealth", race.hp));
  add(node, leaf(doc, "moveSpeedMultiplier", race.move));
  add(node, leaf(doc, "repairSpeed", race.repair));
  add(node, leaf(doc, "damageMultiplier", race.fight));
  add(node, leaf(doc, "suffocationModifier", race.suffocate));
  add(node, leaf(doc, "fireDamageMultiplier", race.fireTaken));
  add(node, leaf(doc, "fireRepairMultiplier", race.fireRepairMultiplier));
  add(node, leaf(doc, "bonusPower", race.bonusPower));
  add(node, leaf(doc, "hasDeathExplosion", race.hasDeathExplosion));
  add(node, leaf(doc, "oxygenChangeSpeed", race.drainsOxygen ? OXYGEN_DRAIN : 0));
  add(node, leaf(doc, "detectsLifeforms", race.detectsLifeforms));
  add(node, leaf(doc, "resistsMindControl", race.resistsMindControl));
  const power = doc.createElement("powerEffect");
  add(power, leaf(doc, "lockdown", race.lockdown));
  add(power, leaf(doc, "cooldown", race.lockCooldown));
  add(node, power);
  return node;
}

function element(doc: XmlDocument, tag: string, attrs: Record<string, string>): XmlElement {
  const node = doc.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function leaf(doc: XmlDocument, tag: string, value: string | number | boolean): XmlElement {
  const node = doc.createElement(tag);
  const text = typeof value === "number" ? num(value) : String(value);
  node.appendChild(doc.createTextNode(text));
  return node;
}

function add(parent: XmlElement, child: XmlElement): void {
  parent.appendChild(child);
}

function num(value: number): string {
  if (Object.is(value, -0)) return "0";
  return String(value);
}

/** FTL stores fire and breach chance in tenths. */
function tenths(fraction: number): string {
  return scaled(fraction, 10);
}

/** A decimal that divides back to the same number. */
function scaled(value: number, factor: number): string {
  const raw = value * factor;
  const text = num(raw);
  if (Number(text) / factor === value) return text;
  for (let digits = 0; digits <= 12; digits++) {
    const candidate = raw.toFixed(digits);
    if (Number(candidate) / factor === value) return candidate;
  }
  return text;
}
