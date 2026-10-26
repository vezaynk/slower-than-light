import { WEAPONS } from "../content.ts";
import { CATALOG } from "../extras/augment-catalog.ts";
import { KIN, type KinId } from "../extras/kin.ts";
import { HULLS, type HullSpec } from "../hulls.ts";
import { crystalExtinguishScale } from "../wiki/cited-crystal-fire.ts";
import { rockExtinguishScale } from "../wiki/cited-rock-fire.ts";
import { CITED_DRONES } from "../wiki/drone-catalog.ts";
import { SECTOR_TYPES, sectorRarities, type SectorType } from "../wiki/sectors.ts";
import { ACHIEVEMENTS, type AchievementRow } from "../wiki/achievements.ts";
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
import { ftlEventId } from "../wiki/ftl-event-ids.ts";
import { sectorQuotaPack } from "../wiki/beacon-quotas.ts";
import { FACTION_SURRENDER, REWARD_TABLE } from "../wiki/rewards.ts";
import { SYSTEM_TUNES } from "../wiki/system-tunes.ts";
import { BEAM_CREW, BEAM_SPEED, BEAM_TILES } from "../wiki/weapons-beam.ts";
import { ENEMY_BLUEPRINTS } from "../enemy-blueprints.ts";
import { ENEMY_LAYOUTS, enemyLayoutFile } from "../enemy-layouts.ts";
import {
  FLAGSHIP_LAYOUTS,
  flagshipBlueprintId,
  flagshipLayoutStem,
  type FlagshipDifficulty,
} from "../flagship-layouts.ts";
import { LAYOUT_FILE, SHIP_LAYOUTS } from "../ship-layouts.ts";
import { standInSheet } from "../ship-art.ts";
import { mountsFor } from "../weapon-mounts.ts";
import { SECTOR_TRACKS, gridFromLayout, loadPack, pictureForRooms } from "@stl/pack";
import type {
  AchievementDef,
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
  HullCrewCount,
  HullDef,
  HullInstall,
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
  const hire = STORES.flatMap((store) => store.lines).find(
    (line) => line.kind === "crew" && line.id === id,
  );
  const row: CrewDef = {
    id,
    name: kin.name,
    hp: kin.hp,
    move: kin.move,
    repair: kin.repair,
    fight: kin.fight,
    suffocate: kin.suffocate,
    fireTaken: kin.fireTaken,
    bonusPower: id === "energy" ? 1 : 0,
    hasDeathExplosion: id === "energy",
    drainsOxygen: id === "anaerobic",
    detectsLifeforms: id === "slug",
    resistsMindControl: id === "slug",
    lockdown: id === "crystal",
    lockCooldown: id === "crystal" ? 50 : 0,
    fireRepairMultiplier:
      id === "rock" ? rockExtinguishScale() : id === "crystal" ? crystalExtinguishScale() : 1,
  };
  if (hire) row.cost = hire.cost;
  return row;
}

function augmentRow(row: (typeof CATALOG)[number]): AugmentDef {
  return { id: row.id, name: row.name, detail: row.detail, cost: row.cost };
}

function droneRow(row: (typeof CITED_DRONES)[number]): DroneDef {
  return { id: row.ref, name: row.name, cost: row.cost, image: row.ref };
}

function systemRow(row: (typeof CITED_SYSTEMS)[number]): SystemDef {
  return { id: row.ref, name: row.name, cost: row.cost, slot: row.slot };
}

/**
 * A sector as ftl.dat's sector_data.xml carries it. The colour group is the sectorType list it is in; Hidden Crystal
 * Worlds and The Last Stand are in none.
 */
function sectorRow(row: SectorType): SectorDef {
  const track = SECTOR_TRACKS[row.id];
  const group = row.group === "hidden" || row.group === "last-stand" ? "" : row.group;
  const sector: SectorDef = {
    id: row.id,
    name: row.name,
    group,
    notes: [...row.notes],
    minSector: row.minSector,
    unique: row.unique,
  };
  if (track) sector.tracks = [track];
  const rarities = sectorRarities(row.notes);
  if (rarities.length > 0) sector.rarities = rarities;
  return sector;
}

/** An achievement as data/achievements.xml carries it, with the gap mod's condition. The old slug stays off. */
function achievementRow(row: AchievementRow): AchievementDef {
  const def: AchievementDef = { id: row.id, name: row.name, desc: row.desc };
  if (row.ship) def.ship = row.ship;
  if (row.multiDifficulty) def.multiDifficulty = true;
  if (row.condition) def.condition = structuredClone(row.condition);
  return def;
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

/** The wiki names a page's sectors by heading; the pack keys them by ftl.dat sector id, as sector_data.xml does. */
const SECTOR_ID = new Map(SECTOR_TYPES.map((row) => [row.name, row.id]));

function sectorIds(names: readonly string[]): string[] {
  return names.map((name) => SECTOR_ID.get(name) ?? name);
}

function emptyRow(row: EmptyBeaconDef): EmptyBeaconDef {
  const copy: EmptyBeaconDef = {
    id: row.id,
    dest: row.dest,
    sectors: sectorIds(row.sectors),
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
    sectors: sectorIds(row.sectors),
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
  const row: HullDef = {
    id: spec.id,
    cruiser: spec.cruiser,
    layout: LAYOUT_FILE[spec.id] ?? spec.layout,
    name: spec.name,
    quote: spec.quote,
    unlock: spec.unlock,
    weaponSlots: spec.weaponSlots,
    droneSlots: spec.droneSlots,
    health: spec.health,
    reactor: spec.reactor,
    missiles: spec.missiles,
    parts: spec.parts,
    weapons: [...spec.weapons],
    augments: [...spec.augments],
  };
  const source = SHIP_LAYOUTS[spec.id];
  if (source) row.grid = gridFromLayout(source);
  blueprintFields(row, spec, source?.rooms ?? []);
  return paintHull(row, LAYOUT_FILE[spec.id]);
}

/** Kits in the order the game seats them (sim.ts applyHull fills ship.kits in this order). */
const KIT_ORDER = [
  "cloaking",
  "teleporter",
  "hacking",
  "drones",
  "mind",
  "clonebay",
  "battery",
  "artillery",
];

/** Preferred square counts for a kit with no traced room, best first (the game's layouts.ts KIT_SQUARES). */
const KIT_SQUARES: Record<string, number[]> = {
  teleporter: [2, 4],
  clonebay: [4, 2],
  mind: [4, 2],
  drones: [4, 2],
  cloaking: [4, 2],
  hacking: [4, 2, 1],
  battery: [2, 4],
  artillery: [2, 4],
};

/**
 * The room for a fitted kit whose traced layout has no room labelled for it, by the game's own seating rule
 * (layouts.ts kitSeat): Clone Bay takes the medical room when Medbay is not fitted, otherwise the first empty hall
 * whose square count comes earliest in KIT_SQUARES, then any empty hall.
 */
function kitHall(
  rooms: readonly (TracedRoom & { index: number })[],
  kit: string,
  medbayLevel: number,
  taken: Map<string, number>,
): number | undefined {
  const used = new Set(taken.values());
  if (kit === "clonebay" && medbayLevel <= 0) {
    const bay = rooms.find(
      (room) => !used.has(room.index) && (room.system === "medbay" || room.reserve === "Medbay"),
    );
    if (bay) return bay.index;
  }
  const empty = rooms.filter(
    (room) =>
      !used.has(room.index) &&
      !room.system &&
      !room.reserve &&
      (room.title === "Hall" || room.title === "Hold"),
  );
  for (const n of KIT_SQUARES[kit] ?? []) {
    const hit = empty.find((room) => room.w * room.h === n);
    if (hit) return hit.index;
  }
  return empty[0]?.index;
}

/** A room as the traced layouts label it: the names, titles, and icons are the catalog's, not the layout file's. */
type TracedRoom = {
  id: string;
  title: string;
  system: string | null;
  w: number;
  h: number;
  reserve?: string;
};

/** Room name for each system's room in the traced layouts (`p-<slug>`), as hull-fit's roomNames writes it. */
const ROOM_SLUG: Record<string, string> = {
  cloaking: "cloak",
  teleporter: "tele",
  hacking: "hack",
  clonebay: "clone",
};

/** Systems a player hull's rooms can hold. Medbay and clone bay share one room, as in ftl.dat. */
const ROOM_SYSTEMS = [
  "pilot",
  "doors",
  "sensors",
  "medbay",
  "clonebay",
  "oxygen",
  "shields",
  "engines",
  "weapons",
  "drones",
  "teleporter",
  "cloaking",
  "battery",
  "mind",
  "hacking",
  "artillery",
];

/**
 * The page's fit as an ftl.dat blueprint: each system is an install at its level in its traced room (start false when
 * the room is only kept for it), the crew are counts per race, and drone control's schematics are the drone list.
 */
function blueprintFields(row: HullDef, spec: HullSpec, traced: readonly TracedRoom[]): void {
  // A traced room's index is its id in the layout file, as the blueprint's room attribute counts.
  const rooms = traced.map((room, id) => ({ ...room, index: id }));
  const roomOf = (id: string) =>
    rooms.find((room) => room.id === `p-${ROOM_SLUG[id] ?? id}`)?.index;
  const sharedRoom = (id: string) =>
    id === "medbay" ? roomOf("clonebay") : id === "clonebay" ? roomOf("medbay") : undefined;
  const levels = new Map<string, number>();
  for (const [id, pair] of Object.entries(spec.systems))
    if (pair && pair[0] > 0) levels.set(id, pair[0]);
  for (const [id, kit] of Object.entries(spec.kits)) if (kit) levels.set(id, kit.level);
  const seated = new Map<string, number>();
  for (const id of KIT_ORDER) {
    if (!spec.kits[id as keyof HullSpec["kits"]] || roomOf(id) != null) continue;
    const room = kitHall(rooms, id, levels.get("medbay") ?? 0, seated);
    if (room != null) seated.set(id, room);
  }
  const installs: HullInstall[] = [];
  for (const id of ROOM_SYSTEMS) {
    const level = levels.get(id);
    const room = roomOf(id) ?? seated.get(id) ?? sharedRoom(id);
    if (room == null && level == null) continue;
    const install: HullInstall = { id, power: level ?? 0, start: level != null };
    if (room != null) install.room = room;
    const weapon = id === "artillery" ? spec.kits.artillery?.weapon : undefined;
    if (weapon) install.weapon = weapon;
    installs.push(install);
  }
  row.installs = installs;
  const counts: HullCrewCount[] = [];
  for (const seat of spec.crew) {
    const last = counts[counts.length - 1];
    if (last?.class === seat.kin) last.amount += 1;
    else counts.push({ amount: 1, class: seat.kin });
  }
  row.crewCounts = counts;
  const droneKit = spec.kits.drones;
  const drones = [...(droneKit?.loadout ?? (droneKit?.target ? [droneKit.target] : []))];
  // A drone the page names but this build does not fly is still on the blueprint's list (ftl.dat's Engi B lists BATTLE).
  for (const label of spec.unfitted) {
    const ref = CITED_DRONES.find((drone) => drone.name === label)?.ref;
    if (ref) drones.push(ref);
  }
  if (drones.length > 0) row.drones = drones;
}

/** The image name is the layout stem. The box is that grid plus one cell. */
function paintHull(row: HullDef, stem: string | undefined): HullDef {
  if (!stem) return row;
  row.img = stem;
  // Cloak, floor, and shield files are `<stem>_cloak.png`, `_floor.png`, and `_shields1.png`.
  row.cloak = stem;
  row.floor = stem;
  row.shield = stem;
  const picture = row.grid ? pictureForRooms(row.grid.rooms) : undefined;
  if (picture) row.picture = picture;
  const mounts = mountsFor(stem);
  if (mounts) row.mounts = mounts.map((mount) => ({ ...mount }));
  if (picture) {
    const sheet = standInSheet(picture, mounts);
    if (sheet.glow) row.glow = { ...sheet.glow };
    if (sheet.cloakOffset) row.cloakOffset = { ...sheet.cloakOffset };
    if (sheet.floorOffset) row.floorOffset = { ...sheet.floorOffset };
    if (sheet.gibs) row.gibs = sheet.gibs.map((gib) => ({ ...gib }));
  }
  return row;
}

/**
 * One hull per archive blueprint. A shared id keeps the later class's interior.
 * A pirate picture that differs uses that trace. Otherwise it copies the regular interior.
 * Enemy hulls omit health. The class table still rolls the hull range.
 */
function enemyHulls(): HullDef[] {
  const regular = new Map<string, string>();
  for (const row of ENEMY_BLUEPRINTS) regular.set(row.blueprint, row.classId);
  const plans = new Map<string, string>(regular);
  for (const row of ENEMY_BLUEPRINTS) {
    if (!row.pirateBlueprint) continue;
    const pirateKey = `${row.classId}:pirate`;
    const shared = regular.get(row.blueprint);
    plans.set(row.pirateBlueprint, ENEMY_LAYOUTS[pirateKey] ? pirateKey : (shared ?? row.classId));
  }
  return [...plans.entries()].map(([id, interior]) => enemyHull(id, interior));
}

/** A traced enemy interior. The pictured icons are rooms, not a starting loadout. */
function enemyHull(id: string, interior: string): HullDef {
  const source = ENEMY_LAYOUTS[interior];
  if (!source) throw new Error(`No enemy interior for ${interior}`);
  const layout = enemyLayoutFile(interior);
  return paintHull(
    {
      id,
      cruiser: "",
      layout,
      name: id,
      quote: "",
      unlock: "",
      reactor: 0,
      missiles: 0,
      parts: 0,
      weapons: [],
      augments: [],
      // Each pictured system icon is an install in its room, as an ftl.dat blueprint's systemList places it.
      installs: source.rooms.flatMap((room, index): HullInstall[] =>
        room.system ? [{ id: room.system, power: 1, room: index, start: true }] : [],
      ),
      grid: gridFromLayout({
        cols: source.cols,
        rows: source.rows,
        rooms: source.rooms.map((room) => ({
          id: "",
          title: "",
          system: room.system,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
        })),
        marks: source.marks,
      }),
    },
    layout,
  );
}

/** Wiki page "The Rebel Flagship": 1st Stage 20, 2nd stage 22, Final stage 20. */
const FLAGSHIP_HEALTH: Record<1 | 2 | 3, number> = {
  1: 20,
  2: 22,
  3: 20,
};

const FLAGSHIP_STAGES = [1, 2, 3] as const;
const FLAGSHIP_DIFFICULTIES = [
  "easy",
  "normal",
  "hard",
] as const satisfies readonly FlagshipDifficulty[];

/** Systems a traced flagship room holds, by the room's name. The weapon pods are artillery, as in ftl.dat's BOSS_*. */
const FLAGSHIP_ROOM: Record<string, { id: string; weapon?: string }> = {
  pilot: { id: "pilot" },
  shields: { id: "shields" },
  oxygen: { id: "oxygen" },
  engines: { id: "engines" },
  medbay: { id: "medbay" },
  doors: { id: "doors" },
  cloak: { id: "cloaking" },
  hack: { id: "hacking" },
  drone: { id: "drones" },
  teleporter: { id: "teleporter" },
  mind: { id: "mind" },
  laser: { id: "artillery", weapon: "ARTILLERY_BOSS_1" },
  missile: { id: "artillery", weapon: "ARTILLERY_BOSS_2" },
  beam: { id: "artillery", weapon: "ARTILLERY_BOSS_3" },
  ion: { id: "artillery", weapon: "ARTILLERY_BOSS_4" },
};

function flagshipInstalls(rooms: readonly { id: string }[]): HullInstall[] {
  return rooms.flatMap((room, index): HullInstall[] => {
    const held = FLAGSHIP_ROOM[room.id.replace(/^f[123]-/, "")];
    if (!held) return [];
    const install: HullInstall = { id: held.id, power: 1, room: index, start: true };
    if (held.weapon) install.weapon = held.weapon;
    return [install];
  });
}

/** One Advanced Edition blueprint. The three difficulties of a stage share its traced interior. */
function flagshipHull(stage: 1 | 2 | 3, difficulty: FlagshipDifficulty): HullDef {
  const layout = flagshipLayoutStem(stage);
  const source = FLAGSHIP_LAYOUTS[layout];
  if (!source) throw new Error(`No flagship interior for ${layout}`);
  const id = flagshipBlueprintId(stage, difficulty);
  return paintHull(
    {
      id,
      cruiser: "",
      layout,
      name: id,
      quote: "",
      unlock: "",
      reactor: 0,
      missiles: 0,
      parts: 0,
      health: FLAGSHIP_HEALTH[stage],
      weapons: [],
      augments: [],
      installs: flagshipInstalls(source.rooms),
      grid: gridFromLayout({
        cols: source.cols,
        rows: source.rows,
        rooms: source.rooms.map((room) => ({
          id: room.id,
          title: room.title,
          system: room.system,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
        })),
        marks: source.marks,
      }),
    },
    layout,
  );
}

/** Shield layers the weapon pages print. Other guns print no pierce. */
const PIERCE_ONE: Record<string, number> = {
  LASER_HEAVY_1_SP: 1,
  CRYSTAL_BURST_1: 1,
  CRYSTAL_BURST_2: 1,
  CRYSTAL_HEAVY_1: 1,
  CRYSTAL_HEAVY_2: 1,
};

function weaponRow(id: string): WeaponBlueprint {
  const row: WeaponBlueprint = { ...WEAPONS[id] };
  // The stand-in sheet is named with the blueprint id. The projectile clip is `<id>_shot`.
  row.art = id;
  row.image = `${id}_shot`;
  if (Object.prototype.hasOwnProperty.call(PIERCE_ONE, id)) row.pierce = PIERCE_ONE[id];
  if (Object.prototype.hasOwnProperty.call(BEAM_TILES, id)) row.lengthTiles = BEAM_TILES[id];
  if (Object.prototype.hasOwnProperty.call(BEAM_SPEED, id)) row.speed = BEAM_SPEED[id];
  if (id === "BEAM_LONG") row.crewDamage = BEAM_CREW.BEAM_LONG;
  else if (Object.prototype.hasOwnProperty.call(BEAM_CREW, id)) row.crewDamage = BEAM_CREW[id];
  return row;
}

/** Quest arrivals and surrender-only holders keep their ids. Every other page takes the datafile id. */
function ftlIdFor(event: EventDef): string {
  if (
    event.id.startsWith("arrive-") ||
    event.flag.startsWith("quest:") ||
    event.flag.startsWith("surrender:")
  )
    return event.id;
  if (event.id === "blue-button-reqs" || event.id === "fuel-gifts") return event.id;
  return ftlEventId(event.dest) ?? event.id;
}

function mapGoto(fx: EventDef["choices"][number]["fx"][number], ids: Map<string, string>) {
  if (fx.k !== "goto") return fx;
  return { k: "goto" as const, id: ids.get(fx.id) ?? fx.id };
}

function mapChoices(choices: EventChoice[], ids: Map<string, string>): EventChoice[] {
  return choices.map((choice) => {
    const next: EventChoice = { ...choice, fx: choice.fx.map((fx) => mapGoto(fx, ids)) };
    if (choice.choices) next.choices = mapChoices(choice.choices, ids);
    return next;
  });
}

function renameEvent(event: EventDef, ids: Map<string, string>): EventDef {
  const id = ids.get(event.id) ?? event.id;
  return { ...event, id, flag: id, choices: mapChoices(event.choices, ids) };
}

const STORE_PAGE: EventDef = {
  id: "STORE",
  dest: "Store",
  flag: "STORE",
  aliases: [],
  sectors: [],
  body: "A trading post hangs at this beacon, open for business.",
  choices: [],
  store: true,
};

/**
 * Large trade station. EXIT_ITEMS loads this id.
 * A list draw stays an ordinary beacon, so this is not a `<store/>` page.
 */
const REBEL_TRADE: EventDef = {
  id: "STORE_REBELSIDE",
  dest: "Large trade station",
  flag: "STORE_REBELSIDE",
  aliases: [],
  sectors: [],
  body: 'You come across a large trade station. However, as soon as you approach a warning goes out to all ships in the region: "Do not associate with the Federation sympathizer. All who oppose the Rebels will be punished."',
  choices: [
    {
      id: "c:large-trade-station:1",
      label: "Leave.",
      fx: [
        {
          k: "note",
          text: "You decide it's better not to push your luck and move on.",
        },
      ],
    },
  ],
};

/** Sector lists are quotas now. Alias and sector tags are not written, so the pack does not keep them. */
function storedEvent(event: EventDef): EventDef {
  return { ...event, aliases: [], sectors: [] };
}

function campaignEvents(): EventDef[] {
  const cited = citedEventRecords().map(eventRow);
  const taken = new Set(cited.map((row) => row.id));
  const takenFtl = new Set(cited.map((row) => ftlIdFor(row)));
  // A filler card whose slug or datafile id is already a sector page stays that page.
  const filler = fillerPageRecords()
    .filter((row) => !taken.has(row.id) && !takenFtl.has(ftlIdFor(row)))
    .map(eventRow);
  const reqs = reqHolder(takenReqIds([...cited, ...filler]));
  const gifts = fuelHolder(choiceIds([...cited, ...filler, reqs]));
  const rows = [...cited, ...filler, reqs, ...(gifts.choices.length > 0 ? [gifts] : [])];
  const ids = new Map(rows.map((row) => [row.id, ftlIdFor(row)]));
  const seen = new Set<string>();
  const named: EventDef[] = [];
  for (const row of rows) {
    const event = renameEvent(row, ids);
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    named.push(event);
  }
  return named;
}

export function loadCatalog(): void {
  const named = campaignEvents();
  const empties = emptyBeaconRecords().map(emptyRow);
  const { quotas, lists } = sectorQuotaPack(named, empties);
  const events = named.map(storedEvent);
  // The STORE quota names a page, as in ftl.dat. Its <store/> opens the shop.
  if (!events.some((event) => event.id === "STORE")) events.push(STORE_PAGE);
  if (!events.some((event) => event.id === "STORE_REBELSIDE")) events.push(REBEL_TRADE);
  loadPack(
    {
      // Ghost stays off the stand-in. crewDef supplies it when no crewBlueprint uses that id.
      crew: (Object.keys(KIN) as KinId[]).filter((id) => id !== "ghost").map(crewRow),
      weapons: Object.keys(WEAPONS).map(weaponRow),
      augments: CATALOG.map(augmentRow),
      drones: CITED_DRONES.map(droneRow),
      systems: CITED_SYSTEMS.map(systemRow),
      hulls: [
        ...HULLS.map(hullRow),
        ...enemyHulls(),
        ...FLAGSHIP_STAGES.flatMap((stage) =>
          FLAGSHIP_DIFFICULTIES.map((difficulty) => flagshipHull(stage, difficulty)),
        ),
      ],
      sectors: SECTOR_TYPES.map((row) => {
        const sector = sectorRow(row);
        const quota = quotas.get(sector.id);
        if (quota) sector.quotas = quota;
        return sector;
      }),
      achievements: ACHIEVEMENTS.map(achievementRow),
      stores: STORES.map(storeRow),
      tunes: SYSTEM_TUNES.map(tuneRow),
      rewards: REWARD_TABLE,
      factions: FACTION_SURRENDER.map((row) => ({ ...row })),
      events,
      lists: [...fillerListRecords().map(listRow), ...lists],
      empties,
    },
    "base",
  );
}
