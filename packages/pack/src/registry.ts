import { cloneGrid } from "./grid.ts";
import { bonusChance, resourceBounds, scrapBounds, type RewardDifficulty } from "./rewards.ts";
import type {
  AugmentDef,
  ChoiceGift,
  ChoiceReq,
  ContentPack,
  CrewDef,
  DroneDef,
  EmptyBeaconDef,
  EventCard,
  EventChoice,
  EventDef,
  EventEffect,
  EventTier,
  FactionSurrender,
  FillerListDef,
  HullDef,
  HullKitDef,
  NamedReward,
  OfferRow,
  ResourceReward,
  RewardResource,
  RewardScaling,
  RewardTable,
  RollEntry,
  SectorDef,
  StoreDef,
  StoreLine,
  SurrenderOfferDef,
  SystemDef,
  TuneDef,
  TuneStep,
  WeaponBlueprint,
} from "./types.ts";

const crew = new Map<string, CrewDef>();
const weapons = new Map<string, WeaponBlueprint>();
const augments = new Map<string, AugmentDef>();
const drones = new Map<string, DroneDef>();
const systems = new Map<string, SystemDef>();
const hulls = new Map<string, HullDef>();
const sectors = new Map<string, SectorDef>();
const stores = new Map<string, StoreDef>();
const tunes = new Map<string, TuneDef>();
const events = new Map<string, EventDef>();
const lists = new Map<string, FillerListDef>();
const empties = new Map<string, EmptyBeaconDef>();
const factions = new Map<string, FactionSurrender>();
let reward: RewardTable | undefined;
let baseReward: RewardTable | undefined;
let baseCrew: CrewDef[] = [];
let baseWeapons: WeaponBlueprint[] = [];
let baseAugments: AugmentDef[] = [];
let baseDrones: DroneDef[] = [];
let baseSystems: SystemDef[] = [];
let baseHulls: HullDef[] = [];
let baseSectors: SectorDef[] = [];
let baseStores: StoreDef[] = [];
let baseTunes: TuneDef[] = [];
let baseEvents: EventDef[] = [];
let baseLists: FillerListDef[] = [];
let baseEmpties: EmptyBeaconDef[] = [];
let baseFactions: FactionSurrender[] = [];

function copyCrew(row: CrewDef): CrewDef {
  return { ...row };
}

function copyWeapon(row: WeaponBlueprint): WeaponBlueprint {
  return { ...row };
}

function copyAugment(row: AugmentDef): AugmentDef {
  return { ...row };
}

function copyDrone(row: DroneDef): DroneDef {
  return { ...row };
}

function copySystem(row: SystemDef): SystemDef {
  return { ...row };
}

function copyKit(kit: HullKitDef): HullKitDef {
  const copy: HullKitDef = { level: kit.level, power: kit.power };
  if (kit.target !== undefined) copy.target = kit.target;
  if (kit.loadout) copy.loadout = [...kit.loadout];
  if (kit.on !== undefined) copy.on = kit.on;
  if (kit.weapon) copy.weapon = kit.weapon;
  return copy;
}

function copySector(row: SectorDef): SectorDef {
  const copy: SectorDef = { ...row, notes: [...row.notes] };
  if (row.quotas) copy.quotas = row.quotas.map((quota) => ({ ...quota }));
  if (row.tracks) copy.tracks = [...row.tracks];
  if (row.rarities) copy.rarities = row.rarities.map((rarity) => ({ ...rarity }));
  return copy;
}

function copyLine(line: StoreLine): StoreLine {
  return { ...line };
}

function copyStore(row: StoreDef): StoreDef {
  return { ...row, sections: [...row.sections], lines: row.lines.map(copyLine) };
}

function copyStep(step: TuneStep): TuneStep {
  return { ...step };
}

function copyTune(row: TuneDef): TuneDef {
  return { ...row, costs: row.costs.map(copyStep) };
}

function copyScaling(row: RewardScaling): RewardScaling {
  const copy: RewardScaling = {
    baseAmount: row.baseAmount,
    sectorAmount: row.sectorAmount,
    difficultyAmount: row.difficultyAmount,
  };
  if (row.difficulty !== undefined) copy.difficulty = row.difficulty;
  return copy;
}

function copyResourceReward(row: ResourceReward): ResourceReward {
  return { ...row };
}

function copyRewardResource(row: RewardResource): RewardResource {
  const copy: RewardResource = { name: row.name };
  if (row.level !== undefined) copy.level = row.level;
  return copy;
}

function copyNamedReward(row: NamedReward): NamedReward {
  const copy: NamedReward = { name: row.name, resources: row.resources.map(copyRewardResource) };
  if (row.minResources !== undefined) copy.minResources = row.minResources;
  if (row.maxResources !== undefined) copy.maxResources = row.maxResources;
  if (row.bonus) copy.bonus = { ...row.bonus };
  return copy;
}

function copyReward(row: RewardTable): RewardTable {
  return {
    scaling: row.scaling.map(copyScaling),
    resources: row.resources.map(copyResourceReward),
    rewards: row.rewards.map(copyNamedReward),
  };
}

function copyFaction(row: FactionSurrender): FactionSurrender {
  return { ...row };
}

function copyEffect(fx: EventEffect): EventEffect {
  if (fx.k === "res") return { k: "res", id: fx.id, sign: fx.sign, lo: fx.lo, hi: fx.hi };
  if (fx.k === "tier") {
    const copy: EventEffect = { k: "tier", tier: fx.tier };
    if (fx.resources !== undefined) copy.resources = fx.resources;
    return copy;
  }
  if (fx.k === "hull") return { k: "hull", n: fx.n };
  if (fx.k === "fleet") {
    const copy: EventEffect = { k: "fleet", n: fx.n };
    if (fx.double !== undefined) copy.double = fx.double;
    if (fx.faster !== undefined) copy.faster = fx.faster;
    if (fx.lastStand !== undefined) copy.lastStand = fx.lastStand;
    return copy;
  }
  if (fx.k === "fight") {
    const copy: EventEffect = { k: "fight", tier: fx.tier };
    if (fx.asteroid !== undefined) copy.asteroid = fx.asteroid;
    return copy;
  }
  if (fx.k === "note") return { k: "note", text: fx.text };
  if (fx.k === "item") return { k: "item", item: fx.item };
  if (fx.k === "quest") return { k: "quest", id: fx.id };
  if (fx.k === "goto") return { k: "goto", id: fx.id };
  if (fx.k === "close") return { k: "close" };
  return { k: "nothing" };
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

function copyChoice(choice: EventChoice): EventChoice {
  const copy: EventChoice = { id: choice.id, label: choice.label, fx: choice.fx.map(copyEffect) };
  if (choice.reqs?.length) copy.reqs = choice.reqs.map(copyReq);
  if (choice.gift?.k === "fuel") copy.gift = copyGift(choice.gift);
  if (choice.hidden) copy.hidden = true;
  if (choice.reward) copy.reward = { ...choice.reward };
  if (choice.ship) copy.ship = { ...choice.ship };
  if (choice.grants?.length) copy.grants = choice.grants.map((grant) => ({ ...grant }));
  if (choice.choices?.length) copy.choices = choice.choices.map(copyChoice);
  return copy;
}

function copySurrender(row: SurrenderOfferDef): SurrenderOfferDef {
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

function copyList(row: FillerListDef): FillerListDef {
  return {
    id: row.id,
    entries: row.entries.map((entry) => {
      const copy: FillerListDef["entries"][number] = { id: entry.id, unique: entry.unique };
      if (entry.page) copy.page = copyEvent(entry.page);
      return copy;
    }),
  };
}

function copyEmpty(row: EmptyBeaconDef): EmptyBeaconDef {
  const copy: EmptyBeaconDef = {
    id: row.id,
    dest: row.dest,
    sectors: [...row.sectors],
    texts: [...row.texts],
  };
  if (row.nebula) copy.nebula = true;
  return copy;
}

function copyEvent(row: EventDef): EventDef {
  const copy: EventDef = {
    id: row.id,
    dest: row.dest,
    flag: row.flag,
    aliases: [...row.aliases],
    sectors: [...row.sectors],
    body: row.body,
    choices: row.choices.map(copyChoice),
  };
  if (row.texts && row.texts.length > 1) copy.texts = [...row.texts];
  if (row.offers && row.offers.length > 0) copy.offers = row.offers.map(copyOffer);
  if (row.rolls && row.rolls.length > 0) copy.rolls = row.rolls.map(copyRoll);
  const prices: EventDef["prices"] = [];
  const seen = new Set<string>();
  for (const price of row.prices ?? []) {
    const id = price.id.trim();
    if (!id || seen.has(id)) continue;
    if ((price.k !== "scrap" && price.k !== "fuel") || price.lo > price.hi) continue;
    seen.add(id);
    prices.push({ id, k: price.k, lo: price.lo, hi: price.hi });
  }
  if (prices.length > 0) copy.prices = prices;
  const bands: EventDef["bands"] = [];
  const bandSeen = new Set<string>();
  for (const band of row.bands ?? []) {
    const id = band.id.trim();
    const kind = band.k;
    if (
      !id ||
      (kind !== "scrap" &&
        kind !== "fuel" &&
        kind !== "missiles" &&
        kind !== "parts" &&
        kind !== "level") ||
      !Number.isInteger(band.lo) ||
      !Number.isInteger(band.hi) ||
      band.lo > band.hi
    ) {
      continue;
    }
    const key = `${id}:${kind}`;
    if (bandSeen.has(key)) continue;
    bandSeen.add(key);
    bands.push({ id, k: kind, lo: band.lo, hi: band.hi });
  }
  if (bands.length > 0) copy.bands = bands;
  const trades: EventDef["trades"] = [];
  const tradeSeen = new Set<string>();
  for (const step of row.trades ?? []) {
    const id = step.id.trim();
    if (!id || step.lo > step.hi) continue;
    if (step.level != null && (!Number.isInteger(step.level) || step.level < 0)) continue;
    const key = step.level == null ? `${id}:*` : `${id}:${step.level}`;
    if (tradeSeen.has(key)) continue;
    tradeSeen.add(key);
    const next: { id: string; level?: number; lo: number; hi: number } = {
      id,
      lo: step.lo,
      hi: step.hi,
    };
    if (step.level != null) next.level = step.level;
    trades.push(next);
  }
  if (trades.length > 0) copy.trades = trades;
  const hire = row.grade?.hire.trim();
  const pays = (row.grade?.pays ?? []).filter(
    (pay) => (pay.k === "scrap" || pay.k === "fuel" || pay.k === "parts") && pay.lo <= pay.hi,
  );
  if (hire && pays.length > 0) {
    copy.grade = { hire, pays: pays.map((pay) => ({ k: pay.k, lo: pay.lo, hi: pay.hi })) };
  }
  if (row.cards && row.cards.length > 0) copy.cards = row.cards.map(copyCard);
  if (row.surrender) copy.surrender = copySurrender(row.surrender);
  if (row.fx?.length) copy.fx = row.fx.map(copyEffect);
  if (row.ship) copy.ship = { ...row.ship };
  if (row.reward) copy.reward = { ...row.reward };
  if (row.boarders) copy.boarders = { ...row.boarders };
  if (row.grants?.length) copy.grants = row.grants.map((grant) => ({ ...grant }));
  return copy;
}

function copyBand(band: [number, number]): [number, number] {
  return [band[0], band[1]];
}

function copyCard(row: EventCard): EventCard {
  return {
    body: row.body,
    choices: row.choices.map((choice) => {
      const copy: EventCard["choices"][number] = { id: choice.id, label: choice.label };
      if (choice.reqs?.length) copy.reqs = choice.reqs.map(copyReq);
      if (choice.gift?.k === "fuel") copy.gift = copyGift(choice.gift);
      return copy;
    }),
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

function copyGrid(grid: NonNullable<HullDef["grid"]>): NonNullable<HullDef["grid"]> {
  return cloneGrid(grid);
}

function copyHull(row: HullDef): HullDef {
  const systems: Record<string, [number, number]> = {};
  for (const [id, pair] of Object.entries(row.systems)) systems[id] = [pair[0], pair[1]];
  const kits: Record<string, HullKitDef> = {};
  for (const [id, kit] of Object.entries(row.kits)) kits[id] = copyKit(kit);
  const copy: HullDef = {
    ...row,
    systems,
    weapons: [...row.weapons],
    crew: row.crew.map((seat) => ({ kin: seat.kin, room: seat.room })),
    kits,
    augments: [...row.augments],
    unfitted: [...row.unfitted],
  };
  if (row.grid) copy.grid = copyGrid(row.grid);
  if (row.picture) copy.picture = { ...row.picture };
  if (row.mounts) copy.mounts = row.mounts.map((mount) => ({ ...mount }));
  if (row.glow) copy.glow = { ...row.glow };
  if (row.cloakOffset) copy.cloakOffset = { ...row.cloakOffset };
  if (row.floorOffset) copy.floorOffset = { ...row.floorOffset };
  if (row.gibs) copy.gibs = row.gibs.map((gib) => ({ ...gib }));
  if (row.installs) copy.installs = row.installs.map((item) => ({ ...item }));
  if (row.crewCounts) copy.crewCounts = row.crewCounts.map((item) => ({ ...item }));
  if (row.drones) copy.drones = [...row.drones];
  return copy;
}

/** `"base"` replaces the maps. `"append"` adds or overwrites by id. */
export function loadPack(pack: ContentPack, mode: "base" | "append"): void {
  if (mode === "base") {
    crew.clear();
    weapons.clear();
    augments.clear();
    drones.clear();
    systems.clear();
    hulls.clear();
    sectors.clear();
    stores.clear();
    tunes.clear();
    events.clear();
    lists.clear();
    empties.clear();
    factions.clear();
    reward = pack.rewards ? copyReward(pack.rewards) : undefined;
    baseReward = reward ? copyReward(reward) : undefined;
    baseFactions = (pack.factions ?? []).map(copyFaction);
    baseCrew = (pack.crew ?? []).map(copyCrew);
    baseWeapons = (pack.weapons ?? []).map(copyWeapon);
    baseAugments = (pack.augments ?? []).map(copyAugment);
    baseDrones = (pack.drones ?? []).map(copyDrone);
    baseSystems = (pack.systems ?? []).map(copySystem);
    baseHulls = (pack.hulls ?? []).map(copyHull);
    baseSectors = (pack.sectors ?? []).map(copySector);
    baseStores = (pack.stores ?? []).map(copyStore);
    baseTunes = (pack.tunes ?? []).map(copyTune);
    baseEvents = (pack.events ?? []).map(copyEvent);
    baseLists = (pack.lists ?? []).map(copyList);
    baseEmpties = (pack.empties ?? []).map(copyEmpty);
  }
  if (mode === "append" && pack.rewards) {
    reward = copyReward(pack.rewards);
  }
  for (const row of mode === "base" ? baseCrew : (pack.crew ?? [])) crew.set(row.id, copyCrew(row));
  for (const row of mode === "base" ? baseWeapons : (pack.weapons ?? []))
    weapons.set(row.id, copyWeapon(row));
  for (const row of mode === "base" ? baseAugments : (pack.augments ?? []))
    augments.set(row.id, copyAugment(row));
  for (const row of mode === "base" ? baseDrones : (pack.drones ?? []))
    drones.set(row.id, copyDrone(row));
  for (const row of mode === "base" ? baseSystems : (pack.systems ?? []))
    systems.set(row.id, copySystem(row));
  for (const row of mode === "base" ? baseHulls : (pack.hulls ?? []))
    hulls.set(row.id, copyHull(row));
  for (const row of mode === "base" ? baseSectors : (pack.sectors ?? []))
    sectors.set(row.id, copySector(row));
  for (const row of mode === "base" ? baseStores : (pack.stores ?? []))
    stores.set(row.id, copyStore(row));
  for (const row of mode === "base" ? baseTunes : (pack.tunes ?? []))
    tunes.set(row.id, copyTune(row));
  for (const row of mode === "base" ? baseEvents : (pack.events ?? []))
    events.set(row.id, copyEvent(row));
  for (const row of mode === "base" ? baseLists : (pack.lists ?? []))
    lists.set(row.id, copyList(row));
  for (const row of mode === "base" ? baseEmpties : (pack.empties ?? []))
    empties.set(row.id, copyEmpty(row));
  for (const row of mode === "base" ? baseFactions : (pack.factions ?? []))
    factions.set(row.id, copyFaction(row));
}

/** The loaded race, or the plain race when the id is missing. */
export function crewDef(id: string | undefined): CrewDef {
  const row = id ? crew.get(id) : undefined;
  if (row) return row;
  const plain = crew.get("human");
  if (plain) return plain;
  throw new Error("crew pack is not loaded");
}

export function weaponDef(id: string | undefined): WeaponBlueprint | undefined {
  if (!id) return undefined;
  return weapons.get(id);
}

export function allCrew(): CrewDef[] {
  return [...crew.values()];
}

export function allWeapons(): WeaponBlueprint[] {
  return [...weapons.values()];
}

export function augmentDef(id: string | undefined): AugmentDef | undefined {
  if (!id) return undefined;
  return augments.get(id);
}

/** Catalog order. An appended id sits at the end, so the store's first rows stay put. */
export function allAugments(): AugmentDef[] {
  return [...augments.values()];
}

export function droneDef(id: string | undefined): DroneDef | undefined {
  if (!id) return undefined;
  return drones.get(id);
}

/** Catalog order. An appended id sits at the end, so a campaign-length seed window stays put. */
export function allDrones(): DroneDef[] {
  return [...drones.values()];
}

export function systemDef(id: string | undefined): SystemDef | undefined {
  if (!id) return undefined;
  return systems.get(id);
}

/** Catalog order. An appended id sits at the end. */
export function allSystems(): SystemDef[] {
  return [...systems.values()];
}

export function hullDef(id: string | undefined): HullDef | undefined {
  if (!id) return undefined;
  return hulls.get(id);
}

/** Authored order. An appended id sits at the end, so the campaign hangar rows stay put. */
export function allHulls(): HullDef[] {
  return [...hulls.values()];
}

export function sectorDef(id: string | undefined): SectorDef | undefined {
  if (!id) return undefined;
  return sectors.get(id);
}

/** Page order. An appended id sits at the end, so the campaign chart rows stay put. */
export function allSectors(): SectorDef[] {
  return [...sectors.values()];
}

export function storeDef(id: string | undefined): StoreDef | undefined {
  if (!id) return undefined;
  return stores.get(id);
}

/** Catalog order. An appended id sits at the end, so the campaign store stays put. */
export function allStores(): StoreDef[] {
  return [...stores.values()];
}

export function tuneDef(id: string | undefined): TuneDef | undefined {
  if (!id) return undefined;
  return tunes.get(id);
}

/** Authored order. An appended id sits at the end. These rows are not the store shelf. */
export function allTunes(): TuneDef[] {
  return [...tunes.values()];
}

export function eventDef(id: string | undefined): EventDef | undefined {
  if (!id) return undefined;
  return events.get(id);
}

/** Page order. An appended id sits at the end, so the campaign pages stay put. */
export function allEvents(): EventDef[] {
  return [...events.values()];
}

/** A filler list by id. An append replaces that whole list. A new id sits at the end. */
export function fillerList(id: string | undefined): FillerListDef | undefined {
  if (!id) return undefined;
  return lists.get(id);
}

/** List order. An appended id sits at the end, so the campaign lists stay put. */
export function allFillerLists(): FillerListDef[] {
  return [...lists.values()];
}

/** The loaded reward table, if this pack has one. */
export function rewardTable(): RewardTable | undefined {
  return reward ? copyReward(reward) : undefined;
}

/**
 * Inclusive scrap band. Sector 1 is the first row. A sector past 8 uses sector 8.
 * This does not roll.
 */
export function scrapRange(
  difficulty: RewardDifficulty,
  sector: number,
  tier: EventTier,
): [number, number] {
  if (!reward) throw new Error("reward table is not loaded");
  return scrapBounds(reward, difficulty, sector, tier);
}

/** Absolute fuel, missile, or drone-part band for a tier. This does not roll. */
export function resourceRange(
  kind: "fuel" | "missiles" | "parts",
  tier: EventTier,
): [number, number] {
  if (!reward) throw new Error("reward table is not loaded");
  return resourceBounds(reward, kind, tier);
}

/** chance / roll for a named reward. Undefined when that reward has no bonus. */
export function rewardBonus(name: string): number | undefined {
  if (!reward) throw new Error("reward table is not loaded");
  return bonusChance(reward, name);
}

/** A faction's default surrender, or undefined when that faction does not offer. */
export function factionSurrender(id: string | undefined): FactionSurrender | undefined {
  if (!id) return undefined;
  const row = factions.get(id);
  return row ? copyFaction(row) : undefined;
}

/** Faction order. An appended id sits at the end. */
export function allFactions(): FactionSurrender[] {
  return [...factions.values()].map(copyFaction);
}

export function emptyBeacon(id: string | undefined): EmptyBeaconDef | undefined {
  if (!id) return undefined;
  return empties.get(id);
}

/** Page order. Civilian stays first. An appended id sits at the end. */
export function allEmptyBeacons(): EmptyBeaconDef[] {
  return [...empties.values()];
}

/** Puts the campaign rows back. Appends made by tests do not survive this. */
export function resetPackForTests(): void {
  crew.clear();
  weapons.clear();
  augments.clear();
  drones.clear();
  systems.clear();
  hulls.clear();
  sectors.clear();
  stores.clear();
  tunes.clear();
  events.clear();
  lists.clear();
  empties.clear();
  factions.clear();
  reward = baseReward ? copyReward(baseReward) : undefined;
  for (const row of baseCrew) crew.set(row.id, copyCrew(row));
  for (const row of baseWeapons) weapons.set(row.id, copyWeapon(row));
  for (const row of baseAugments) augments.set(row.id, copyAugment(row));
  for (const row of baseDrones) drones.set(row.id, copyDrone(row));
  for (const row of baseSystems) systems.set(row.id, copySystem(row));
  for (const row of baseHulls) hulls.set(row.id, copyHull(row));
  for (const row of baseSectors) sectors.set(row.id, copySector(row));
  for (const row of baseStores) stores.set(row.id, copyStore(row));
  for (const row of baseTunes) tunes.set(row.id, copyTune(row));
  for (const row of baseEvents) events.set(row.id, copyEvent(row));
  for (const row of baseLists) lists.set(row.id, copyList(row));
  for (const row of baseEmpties) empties.set(row.id, copyEmpty(row));
  for (const row of baseFactions) factions.set(row.id, copyFaction(row));
}
