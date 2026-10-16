import { WEAPONS } from "../content.ts";
import { CATALOG } from "../extras/augment-catalog.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { HULLS, type HullSpec } from "../hulls.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";
import { rockExtinguishScale } from "../wiki/cited-rock-fire.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import { SECTOR_TYPES, type SectorType } from "../wiki/sectors.ts";
import { STORES } from "../wiki/store-catalog.ts";
import { CITED_SYSTEMS } from "../wiki/system-catalog.ts";
import { citedEventRecords } from "../wiki/event-catalog.ts";
import { OPENING_TEXTS } from "../wiki/event-intros.ts";
import { OFFER_ROWS } from "../wiki/event-offers.ts";
import { ROLL_LISTS } from "../wiki/event-rolls.ts";
import { PRICE_BANDS } from "../wiki/event-prices.ts";
import { PRINTED_BANDS } from "../wiki/event-bands.ts";
import { TRADE_STEPS } from "../wiki/event-trades.ts";
import { GRADES } from "../wiki/event-grades.ts";
import { CARD_LISTS } from "../wiki/event-cards.ts";
import { CHOICE_REQS } from "../wiki/choice-reqs.ts";
import { FUEL_GIFTS } from "../wiki/fuel-gifts.ts";
import { emptyBeaconRecords, fillerListRecords } from "../wiki/filler-lists.ts";
import { fillerPageRecords } from "../wiki/filler-pages.ts";
import { SYSTEM_TUNES } from "../wiki/system-tunes.ts";
import { BEAM_CREW, BEAM_SPEED, BEAM_TILES } from "../wiki/weapons-beam.ts";
import { loadPack } from "@stl/pack";
import type {
  AugmentDef,
  ChoiceGift,
  ChoiceReq,
  CrewDef,
  DroneDef,
  EmptyBeaconDef,
  EventCard,
  EventChoice,
  EventDef,
  FillerListDef,
  HullDef,
  HullKitDef,
  OfferRow,
  RollEntry,
  SectorDef,
  StoreDef,
  SurrenderOfferDef,
  SystemDef,
  TradeStep,
  TuneDef,
  WeaponBlueprint,
} from "@stl/pack";

/**
 * Ability flags the sim used to select by race id. The numbers stay the authored ones:
 * one Zoltan bar, the 15 HP / 7.5 drone burst, Lanius counted as a drain, Slug sight
 * and mind-control immunity, Crystal lockdown at 50s, Rock and Crystal fire-fighting.
 */
function crewRow(id: KinId): CrewDef {
  const kin = KIN[id];
  return {
    id,
    name: kin.name,
    hp: kin.hp,
    move: kin.move,
    repair: kin.repair,
    fight: kin.fight,
    suffocate: kin.suffocate,
    fireTaken: kin.fireTaken,
    bonusPower: id === "spark" ? 1 : 0,
    hasDeathExplosion: id === "spark",
    drainsOxygen: id === "voidlung",
    detectsLifeforms: id === "gel",
    resistsMindControl: id === "gel",
    lockdown: id === "shard",
    lockCooldown: id === "shard" ? 50 : 0,
    fireRepairMultiplier:
      id === "stone" ? rockExtinguishScale() : id === "shard" ? crystalExtinguishScale() : 1,
  };
}

function augmentRow(row: (typeof CATALOG)[number]): AugmentDef {
  return { id: row.id, name: row.name, detail: row.detail, cost: row.cost };
}

function droneRow(row: (typeof CITED_DRONES)[number]): DroneDef {
  return { id: row.ref, name: row.name, cost: row.cost };
}

function systemRow(row: (typeof CITED_SYSTEMS)[number]): SystemDef {
  return { id: row.ref, name: row.name, cost: row.cost, slot: row.slot };
}

function sectorRow(row: SectorType): SectorDef {
  return { id: row.id, name: row.name, group: row.group, notes: [...row.notes] };
}

function storeRow(row: StoreDef): StoreDef {
  return {
    id: row.id,
    name: row.name,
    slot: row.slot,
    weapons: row.weapons,
    sections: [...row.sections],
    lines: row.lines.map((line) => ({ ...line })),
  };
}

function tuneRow(row: TuneDef): TuneDef {
  return { id: row.id, start: row.start, costs: row.costs.map((step) => ({ ...step })) };
}

function surrenderRow(row: SurrenderOfferDef): SurrenderOfferDef {
  const copy: SurrenderOfferDef = {
    chance: row.chance,
    low: row.low,
    high: row.high,
    reward: { ...row.reward },
    hail: row.hail,
    accept: row.accept,
    refuse: row.refuse,
  };
  if (row.hails) copy.hails = [...row.hails];
  if (row.continues) copy.continues = true;
  if (row.forced) copy.forced = true;
  if (row.quest) copy.quest = row.quest;
  if (row.result) copy.result = row.result;
  if (row.extra) copy.extra = { id: row.extra.id, label: row.extra.label };
  if (row.card) {
    copy.card = {
      body: row.card.body,
      choices: row.card.choices.map((choice) => ({ id: choice.id, label: choice.label })),
    };
  }
  return copy;
}

function listRow(row: FillerListDef): FillerListDef {
  return {
    id: row.id,
    entries: row.entries.map((entry) => ({ id: entry.id, unique: entry.unique })),
  };
}

function emptyRow(row: EmptyBeaconDef): EmptyBeaconDef {
  const copy: EmptyBeaconDef = {
    id: row.id,
    dest: row.dest,
    sectors: [...row.sectors],
    texts: [...row.texts],
  };
  if (row.nebula) copy.nebula = true;
  return copy;
}

function eventRow(row: EventDef): EventDef {
  const copy: EventDef = {
    id: row.id,
    dest: row.dest,
    flag: row.flag,
    aliases: [...row.aliases],
    sectors: [...row.sectors],
    body: row.body,
    choices: row.choices.map((choice) =>
      stampedChoice({
        id: choice.id,
        label: choice.label,
        fx: choice.fx.map((fx) => ({ ...fx })),
      }),
    ),
  };
  const texts = OPENING_TEXTS[row.id];
  if (texts && texts.length > 1) copy.texts = [...texts];
  const offers = OFFER_ROWS[row.id];
  if (offers && offers.length > 0) copy.offers = offers.map(copyOffer);
  const rolls = ROLL_LISTS[row.id];
  if (rolls && rolls.length > 0) copy.rolls = rolls.map(copyRoll);
  const prices = PRICE_BANDS[row.id];
  if (prices?.length)
    copy.prices = prices.map((price) => ({ id: price.id, k: price.k, lo: price.lo, hi: price.hi }));
  const bands = PRINTED_BANDS[row.id];
  if (bands?.length)
    copy.bands = bands.map((band) => ({ id: band.id, k: band.k, lo: band.lo, hi: band.hi }));
  const trades = TRADE_STEPS[row.id];
  if (trades?.length) copy.trades = trades.map(copyTrade);
  const grade = GRADES[row.id];
  if (grade) {
    copy.grade = {
      hire: grade.hire,
      pays: grade.pays.map((pay) => ({ k: pay.k, lo: pay.lo, hi: pay.hi })),
    };
  }
  const cards = CARD_LISTS[row.id];
  if (cards && cards.length > 0) copy.cards = cards.map(copyCard);
  if (row.surrender) copy.surrender = surrenderRow(row.surrender);
  return copy;
}

function copyTrade(step: TradeStep): TradeStep {
  const next: TradeStep = { id: step.id, lo: step.lo, hi: step.hi };
  if (step.level != null) next.level = step.level;
  return next;
}

function copyBand(band: [number, number]): [number, number] {
  return [band[0], band[1]];
}

function copyReq(req: ChoiceReq): ChoiceReq {
  if (req.k === "system") return { k: "system", id: req.id, level: req.level, text: req.text };
  if (req.k === "band") return { k: "band", id: req.id, lo: req.lo, hi: req.hi, text: req.text };
  if (req.k === "stock") return { k: "stock", id: req.id, n: req.n, text: req.text };
  return { k: req.k, id: req.id, text: req.text };
}

function copyGift(gift: ChoiceGift): ChoiceGift {
  return { k: "fuel", lo: gift.lo, hi: gift.hi };
}

/** A button stores the locks and the fuel gift authored for its id. The tables are not mutated. */
function stampedChoice(choice: EventChoice): EventChoice {
  const reqs = CHOICE_REQS[choice.id];
  const gift = FUEL_GIFTS[choice.id];
  if (!reqs?.length && !gift) return choice;
  const next: EventChoice = { ...choice };
  if (reqs?.length) next.reqs = reqs.map(copyReq);
  if (gift) next.gift = copyGift(gift);
  return next;
}

function copyCard(row: EventCard): EventCard {
  return {
    body: row.body,
    choices: row.choices.map((choice) => {
      const reqs = CHOICE_REQS[choice.id];
      const gift = FUEL_GIFTS[choice.id];
      const copy: EventCard["choices"][number] = { id: choice.id, label: choice.label };
      if (reqs?.length) copy.reqs = reqs.map(copyReq);
      if (gift) copy.gift = copyGift(gift);
      return copy;
    }),
  };
}

function takenReqIds(events: readonly EventDef[]): Set<string> {
  const seen = new Set<string>();
  for (const ev of events) {
    for (const choice of ev.choices) if (choice.reqs?.length) seen.add(choice.id);
    for (const card of ev.cards ?? [])
      for (const choice of card.choices) if (choice.reqs?.length) seen.add(choice.id);
  }
  return seen;
}

/**
 * Locks whose button is not on a loaded page or card.
 * Empty sectors keep the chart from placing this page. The sim looks the lock up by id.
 * The title is the id: a blank title would come back as the id on the next read.
 */
function reqHolder(taken: ReadonlySet<string>): EventDef {
  const choices: EventChoice[] = [];
  for (const [id, reqs] of Object.entries(CHOICE_REQS)) {
    if (taken.has(id) || reqs.length === 0) continue;
    choices.push(stampedChoice({ id, label: id, fx: [{ k: "nothing" }] }));
  }
  return {
    id: "blue-button-reqs",
    dest: "blue-button-reqs",
    flag: "reqs:blue-button-reqs",
    aliases: [],
    sectors: [],
    body: "",
    choices,
  };
}

function choiceIds(events: readonly EventDef[]): Set<string> {
  const seen = new Set<string>();
  for (const ev of events) {
    for (const choice of ev.choices) seen.add(choice.id);
    for (const card of ev.cards ?? []) for (const choice of card.choices) seen.add(choice.id);
  }
  return seen;
}

/**
 * Fuel gifts whose button is not already on a loaded page, card, or lock holder.
 * Empty sectors keep the chart from placing this page. The sim looks the gift up by id.
 */
function fuelHolder(taken: ReadonlySet<string>): EventDef {
  const choices: EventChoice[] = [];
  for (const [id, gift] of Object.entries(FUEL_GIFTS)) {
    if (taken.has(id)) continue;
    choices.push({
      id,
      label: id,
      fx: [{ k: "nothing" }],
      gift: copyGift(gift),
    });
  }
  return {
    id: "fuel-gifts",
    dest: "fuel-gifts",
    flag: "gift:fuel-gifts",
    aliases: [],
    sectors: [],
    body: "",
    choices,
  };
}

function copyRoll(row: RollEntry): RollEntry {
  if (row.k === "hull") return { k: "hull", id: row.id };
  if (row.k === "label") return { k: "label", text: row.text };
  return { k: "count", n: row.n, word: row.word };
}

function copyOffer(row: OfferRow): OfferRow {
  if (row.k === "trade")
    return {
      k: "trade",
      pay: row.pay,
      cost: copyBand(row.cost),
      get: row.get,
      gain: copyBand(row.gain),
    };
  if (row.k === "fuel")
    return {
      k: "fuel",
      band: row.band,
      fuel: copyBand(row.fuel),
      pay: row.pay,
      amt: copyBand(row.amt),
    };
  if (row.k === "lanius")
    return {
      k: "lanius",
      band: row.band,
      res: row.res,
      cost: copyBand(row.cost),
      scrap: copyBand(row.scrap),
    };
  return {
    k: "supply",
    missiles: copyBand(row.missiles),
    parts: copyBand(row.parts),
    fuel: copyBand(row.fuel),
  };
}

function hullRow(spec: HullSpec): HullDef {
  const systems: Record<string, [number, number]> = {};
  for (const [id, pair] of Object.entries(spec.systems)) {
    if (!pair) continue;
    systems[id] = [pair[0], pair[1]];
  }
  const kits: Record<string, HullKitDef> = {};
  for (const [id, kit] of Object.entries(spec.kits)) {
    if (!kit) continue;
    const copy: HullKitDef = { level: kit.level, power: kit.power };
    if (kit.target !== undefined) copy.target = kit.target;
    if (kit.loadout) copy.loadout = [...kit.loadout];
    if (kit.on !== undefined) copy.on = kit.on;
    kits[id] = copy;
  }
  return {
    id: spec.id,
    cruiser: spec.cruiser,
    layout: spec.layout,
    name: spec.name,
    quote: spec.quote,
    unlock: spec.unlock,
    source: spec.source,
    reactor: spec.reactor,
    fuel: spec.fuel,
    missiles: spec.missiles,
    parts: spec.parts,
    systems,
    weapons: [...spec.weapons],
    crew: spec.crew.map((seat) => ({ kin: seat.kin, room: seat.room })),
    kits,
    augments: [...spec.augments],
    unfitted: [...spec.unfitted],
  };
}

function weaponRow(id: string): WeaponBlueprint {
  const row: WeaponBlueprint = { ...WEAPONS[id] };
  if (Object.prototype.hasOwnProperty.call(BEAM_TILES, id)) row.lengthTiles = BEAM_TILES[id];
  if (Object.prototype.hasOwnProperty.call(BEAM_SPEED, id)) row.speed = BEAM_SPEED[id];
  if (id === "shear") row.crewDamage = BEAM_CREW.pike;
  else if (Object.prototype.hasOwnProperty.call(BEAM_CREW, id)) row.crewDamage = BEAM_CREW[id];
  return row;
}

const citedEvents = citedEventRecords().map(eventRow);
const takenEventIds = new Set(citedEvents.map((row) => row.id));
// A filler card whose slug is already a sector page stays that page.
const fillerEvents = fillerPageRecords()
  .filter((row) => !takenEventIds.has(row.id))
  .map(eventRow);
const reqEvents = reqHolder(takenReqIds([...citedEvents, ...fillerEvents]));
const giftEvents = fuelHolder(choiceIds([...citedEvents, ...fillerEvents, reqEvents]));
const campaignEvents = [
  ...citedEvents,
  ...fillerEvents,
  reqEvents,
  ...(giftEvents.choices.length > 0 ? [giftEvents] : []),
];

export function loadCatalog(): void {
  loadPack(
    {
      crew: (Object.keys(KIN) as KinId[]).map(crewRow),
      weapons: Object.keys(WEAPONS).map(weaponRow),
      augments: CATALOG.map(augmentRow),
      drones: CITED_DRONES.map(droneRow),
      systems: CITED_SYSTEMS.map(systemRow),
      hulls: HULLS.map(hullRow),
      sectors: SECTOR_TYPES.map(sectorRow),
      stores: STORES.map(storeRow),
      tunes: SYSTEM_TUNES.map(tuneRow),
      events: campaignEvents,
      lists: fillerListRecords().map(listRow),
      empties: emptyBeaconRecords().map(emptyRow),
    },
    "base",
  );
}
