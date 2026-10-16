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
  TradeStep,
  EventGrade,
  EventCard,
  EventDef,
  EventEffect,
  FillerListDef,
  HullDef,
  OfferRow,
  RollEntry,
  SectorDef,
  StoreDef,
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
  Base pack written from the loaded crew, weapon, augment, drone, system, hull, sector, store, tune, event, filler list, and empty beacon records.
  Race tags are Hyperspace names. Weapon tags are FTL blueprint names.
  Augment tags are the listing id, title, description, and store cost.
  Drone tags are the listing id, title, and store cost.
  System tags are the listing id, title, store cost, and install slot.
  Hull tags are the ship id, class, layout letter, and starting loadout. Room tiles stay in code.
  Sector tags are the sector id, title, colour group, and page notes. Depth gates stay in code.
  Store tags are the store id, title, section size, weapon shelf, section kinds, and stock lines.
  Tune tags are the system id, the level a purchase installs, and the scrap cost of each owned level.
  Event tags are the page slug, beacon flag, title, aliases, sectors, text, and choices.
  Several text tags are the opening sentences. The first is the page body.
  An empty first text keeps that body blank. intro="after" means the body is its own sentence and the list follows.
  The sim still picks one sentence when the card opens.
  An offer tag is one row of the table that card rolls. The sim still picks the row and still rolls its bands.
  Fuel rows name band high or pt2. Lanius rows name band base or better. A supply row can hold a 0-0 band.
  A roll tag is one entry of a list the card draws. A repeated hull is a heavier weight.
  A hull entry is a ship id. A label entry is a button sentence. A count entry is a number and its word.
  A card tag is one whole opening the page draws. The sim still draws one with between.
  The buttons on that opening stay handlers in code.
  Filler opening cards use that same event tag. A slug a sector page already uses stays that sector page.
  A choice is its id, label, effects, req locks, and an optional fuel gift.
  A req is checked in order and its text is the refusal.
  A gift is the fuel the handler pays. A fixed gift has the same ends and does not roll.
  A price tag is a band rolled onto a button when that card opens. The id names the button.
  A fixed price does not roll. The handler still reads the amount from the choice id.
  A bribe tag is the scrap price named bribe.
  A trade tag is one scrap band for a specialty and the level already owned.
  The reactor row omits the level. The sim still picks one open specialty and still rolls that band.
  A fixed trade does not roll. The handler still reads the amount from the choice id.
  A grade tag hires a crew when the picked count matches, and pays its bands when it does not.
  A fixed payment does not roll. The handler still compares the two numbers on the choice id.
  A quest effect names a marker. A goto effect opens another page.
  An arrival page has an empty sector list and the flag quest: plus the quest id.
  A surrender tag on a fight page stores the chance, the hull band, the hail, and the reward.
  The sim still checks the hull and still hands that reward over.
  An event list is page ids in draw order. unique means the page can appear once per sector.
  The sim still remembers which unique page already appeared.
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
 * A system listing is its id, title, store cost, and whether it installs as a system or a kit.
 * A hull is its id, class, layout letter, name, and starting loadout. Room tiles are not in the document.
 * A sector is its id, title, colour group, and page notes. Depth gates stay in the chart code.
 * A store is its id, title, section size, weapon shelf, section kinds, and stock lines.
 * A tune is its system id, the level a purchase installs, and the scrap cost of each owned level.
 * Section count, the hull-repair rate, and the reactor formula stay in code.
 */
export function emitPack(pack: ContentPack): string {
  const doc = implementation.createDocument(null, "FTL", null);
  const root = doc.documentElement;
  if (!root) throw new Error("pack document has no root");
  doc.insertBefore(doc.createProcessingInstruction("xml", 'version="1.0" encoding="UTF-8"'), root);
  doc.insertBefore(doc.createComment(HEADER), root);

  const crew = doc.createElement("crew");
  for (const race of pack.crew ?? []) add(crew, raceElement(doc, race));
  add(root, crew);
  for (const weapon of pack.weapons ?? []) add(root, weaponElement(doc, weapon));
  for (const augment of pack.augments ?? []) add(root, augmentElement(doc, augment));
  for (const drone of pack.drones ?? []) add(root, droneElement(doc, drone));
  for (const system of pack.systems ?? []) add(root, systemElement(doc, system));
  for (const hull of pack.hulls ?? []) add(root, hullElement(doc, hull));
  for (const sector of pack.sectors ?? []) add(root, sectorElement(doc, sector));
  for (const store of pack.stores ?? []) add(root, storeElement(doc, store));
  for (const tune of pack.tunes ?? []) add(root, tuneElement(doc, tune));
  for (const event of pack.events ?? []) add(root, eventElement(doc, event));
  for (const list of pack.lists ?? []) add(root, listElement(doc, list));
  for (const empty of pack.empties ?? []) add(root, emptyElement(doc, empty));
  return prettyXml(serializer.serializeToString(doc));
}

function listElement(doc: XmlDocument, list: FillerListDef): XmlElement {
  const node = element(doc, "eventList", { name: list.id });
  for (const entry of list.entries) {
    add(node, element(doc, "event", { id: entry.id, unique: entry.unique ? "true" : "false" }));
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
  const node = element(doc, "eventBlueprint", attrs);
  add(node, leaf(doc, "title", event.dest));
  for (const alias of event.aliases) add(node, leaf(doc, "alias", alias));
  for (const sector of event.sectors) add(node, leaf(doc, "sector", sector));
  const lines =
    texts.length > 1 ? (event.body === texts[0] ? texts : [event.body, ...texts]) : [event.body];
  for (const line of lines) add(node, leaf(doc, "text", line));
  for (const offer of event.offers ?? []) add(node, offerElement(doc, offer));
  for (const roll of event.rolls ?? []) add(node, rollElement(doc, roll));
  for (const price of event.prices ?? []) add(node, priceElement(doc, price));
  for (const step of event.trades ?? []) add(node, tradeElement(doc, step));
  if (event.grade) add(node, gradeElement(doc, event.grade));
  for (const card of event.cards ?? []) add(node, cardElement(doc, card));
  for (const choice of event.choices) {
    const choiceNode = element(doc, "choice", { name: choice.id });
    add(choiceNode, leaf(doc, "text", choice.label));
    for (const req of choice.reqs ?? []) add(choiceNode, reqElement(doc, req));
    if (choice.gift) add(choiceNode, giftElement(doc, choice.gift));
    for (const fx of choice.fx) add(choiceNode, effectElement(doc, fx));
    add(node, choiceNode);
  }
  if (event.surrender) add(node, surrenderElement(doc, event.surrender));
  return node;
}

function span(band: [number, number]): string {
  return `${band[0]}-${band[1]}`;
}

function offerElement(doc: XmlDocument, offer: OfferRow): XmlElement {
  if (offer.k === "trade") {
    return element(doc, "offer", {
      k: "trade",
      pay: offer.pay,
      cost: span(offer.cost),
      get: offer.get,
      gain: span(offer.gain),
    });
  }
  if (offer.k === "fuel") {
    return element(doc, "offer", {
      k: "fuel",
      band: offer.band,
      fuel: span(offer.fuel),
      pay: offer.pay,
      amt: span(offer.amt),
    });
  }
  if (offer.k === "lanius") {
    return element(doc, "offer", {
      k: "lanius",
      band: offer.band,
      res: offer.res,
      cost: span(offer.cost),
      scrap: span(offer.scrap),
    });
  }
  return element(doc, "offer", {
    k: "supply",
    missiles: span(offer.missiles),
    parts: span(offer.parts),
    fuel: span(offer.fuel),
  });
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
    low: num(offer.low),
    high: num(offer.high),
  };
  if (offer.continues) attrs.continues = "true";
  if (offer.forced) attrs.forced = "true";
  if (offer.quest) attrs.quest = offer.quest;
  const node = element(doc, "surrender", attrs);
  for (const hail of offer.hails?.length ? offer.hails : [offer.hail])
    add(node, leaf(doc, "text", hail));
  add(node, rewardElement(doc, offer.reward));
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
  if (gift) add(node, giftElement(doc, gift));
  return node;
}

function giftElement(doc: XmlDocument, gift: ChoiceGift): XmlElement {
  return element(doc, "gift", { k: gift.k, lo: num(gift.lo), hi: num(gift.hi) });
}

function priceElement(doc: XmlDocument, price: EventPrice): XmlElement {
  return element(doc, "price", { id: price.id, k: price.k, lo: num(price.lo), hi: num(price.hi) });
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
  const attrs: Record<string, string> = { k: req.k, id: req.id };
  if (req.k === "system") attrs.level = num(req.level);
  if (req.k === "band") {
    attrs.lo = num(req.lo);
    attrs.hi = num(req.hi);
  }
  if (req.k === "stock") attrs.n = num(req.n);
  const node = element(doc, "req", attrs);
  node.appendChild(doc.createTextNode(req.text));
  return node;
}

function rewardElement(doc: XmlDocument, reward: SurrenderReward): XmlElement {
  const attrs: Record<string, string> = { k: reward.k };
  if (reward.k === "weapon") attrs.name = reward.name;
  if (reward.k === "fuel-repairs") attrs.repairs = num(reward.repairs);
  if (reward.k === "stuff" && reward.tier) attrs.tier = reward.tier;
  if (reward.k === "standard" || reward.k === "scrap") attrs.tier = reward.tier;
  if ((reward.k === "crew" || reward.k === "standard") && reward.race) attrs.race = reward.race;
  if (reward.k === "scrap" && reward.unnamed) attrs.unnamed = reward.unnamed;
  return element(doc, "reward", attrs);
}

function effectElement(doc: XmlDocument, fx: EventEffect): XmlElement {
  if (fx.k === "nothing") return element(doc, "effect", { k: "nothing" });
  if (fx.k === "note") {
    const node = element(doc, "effect", { k: "note" });
    node.appendChild(doc.createTextNode(fx.text));
    return node;
  }
  if (fx.k === "quest") return element(doc, "effect", { k: "quest", id: fx.id });
  if (fx.k === "goto") return element(doc, "effect", { k: "goto", id: fx.id });
  if (fx.k === "close") return element(doc, "effect", { k: "close" });
  if (fx.k === "item") return element(doc, "effect", { k: "item", item: fx.item });
  if (fx.k === "hull") return element(doc, "effect", { k: "hull", n: num(fx.n) });
  if (fx.k === "res") {
    return element(doc, "effect", {
      k: "res",
      id: fx.id,
      sign: num(fx.sign),
      lo: num(fx.lo),
      hi: num(fx.hi),
    });
  }
  if (fx.k === "tier") {
    const attrs: Record<string, string> = { k: "tier", tier: fx.tier };
    if (fx.resources !== undefined) attrs.resources = String(fx.resources);
    return element(doc, "effect", attrs);
  }
  if (fx.k === "fleet") {
    const attrs: Record<string, string> = { k: "fleet", n: num(fx.n) };
    if (fx.double !== undefined) attrs.double = String(fx.double);
    if (fx.faster !== undefined) attrs.faster = String(fx.faster);
    if (fx.lastStand !== undefined) attrs.lastStand = String(fx.lastStand);
    return element(doc, "effect", attrs);
  }
  const attrs: Record<string, string> = { k: "fight", tier: fx.tier };
  if (fx.asteroid !== undefined) attrs.asteroid = String(fx.asteroid);
  return element(doc, "effect", attrs);
}

function tuneElement(doc: XmlDocument, tune: TuneDef): XmlElement {
  const node = element(doc, "systemTune", { name: tune.id });
  add(node, leaf(doc, "start", tune.start));
  for (const step of tune.costs) {
    const upgrade = element(doc, "upgrade", { level: num(step.level) });
    upgrade.appendChild(doc.createTextNode(num(step.cost)));
    add(node, upgrade);
  }
  return node;
}

function storeElement(doc: XmlDocument, store: StoreDef): XmlElement {
  const node = element(doc, "storeBlueprint", { name: store.id });
  add(node, leaf(doc, "title", store.name));
  add(node, leaf(doc, "slot", store.slot));
  add(node, leaf(doc, "weapons", store.weapons));
  for (const section of store.sections) add(node, leaf(doc, "section", section));
  for (const line of store.lines) {
    const stock = element(doc, "stock", {
      id: line.id,
      kind: line.kind,
      min: num(line.min),
      max: num(line.max),
    });
    add(stock, leaf(doc, "title", line.name));
    add(stock, leaf(doc, "cost", line.cost));
    add(node, stock);
  }
  return node;
}

function sectorElement(doc: XmlDocument, sector: SectorDef): XmlElement {
  const node = element(doc, "sectorDescription", { name: sector.id });
  add(node, leaf(doc, "title", sector.name));
  add(node, leaf(doc, "type", sector.group));
  for (const note of sector.notes) add(node, leaf(doc, "note", note));
  return node;
}

function hullElement(doc: XmlDocument, hull: HullDef): XmlElement {
  const node = element(doc, "shipBlueprint", { name: hull.id, layout: hull.layout });
  add(node, leaf(doc, "class", hull.cruiser));
  add(node, leaf(doc, "title", hull.name));
  add(node, leaf(doc, "desc", hull.quote));
  add(node, leaf(doc, "unlock", hull.unlock));
  add(node, leaf(doc, "source", hull.source));
  add(node, leaf(doc, "reactor", hull.reactor));
  add(node, leaf(doc, "fuel", hull.fuel));
  add(node, leaf(doc, "missiles", hull.missiles));
  add(node, leaf(doc, "parts", hull.parts));

  const systems = doc.createElement("systemList");
  for (const [id, pair] of Object.entries(hull.systems)) {
    const system = element(doc, "system", { name: id });
    add(system, leaf(doc, "level", pair[0]));
    add(system, leaf(doc, "power", pair[1]));
    add(systems, system);
  }
  add(node, systems);

  const weapons = doc.createElement("weaponList");
  for (const id of hull.weapons) add(weapons, leaf(doc, "weapon", id));
  add(node, weapons);

  const crew = doc.createElement("crewList");
  for (const seat of hull.crew)
    add(crew, element(doc, "crewMember", { kin: seat.kin, room: seat.room }));
  add(node, crew);

  const kits = doc.createElement("kitList");
  for (const [id, kit] of Object.entries(hull.kits)) {
    const kitNode = element(doc, "kit", { name: id });
    add(kitNode, leaf(doc, "level", kit.level));
    add(kitNode, leaf(doc, "power", kit.power));
    if (kit.target != null) add(kitNode, leaf(doc, "target", kit.target));
    if (kit.loadout) {
      const loadout = doc.createElement("loadout");
      for (const schematic of kit.loadout) add(loadout, leaf(doc, "schematic", schematic));
      add(kitNode, loadout);
    }
    if (kit.on !== undefined) add(kitNode, leaf(doc, "on", kit.on));
    add(kits, kitNode);
  }
  add(node, kits);

  const augments = doc.createElement("augmentList");
  for (const id of hull.augments) add(augments, leaf(doc, "augment", id));
  add(node, augments);

  const unfitted = doc.createElement("unfitted");
  for (const label of hull.unfitted) add(unfitted, leaf(doc, "item", label));
  add(node, unfitted);

  return node;
}

function systemElement(doc: XmlDocument, system: SystemDef): XmlElement {
  const node = element(doc, "systemBlueprint", { name: system.id });
  add(node, leaf(doc, "title", system.name));
  add(node, leaf(doc, "cost", system.cost));
  add(node, leaf(doc, "slot", system.slot));
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

function raceElement(doc: XmlDocument, race: CrewDef): XmlElement {
  const node = element(doc, "race", { name: race.id });
  add(node, leaf(doc, "title", race.name));
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
