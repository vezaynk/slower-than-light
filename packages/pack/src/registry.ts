import type { AugmentDef, ContentPack, CrewDef, DroneDef, EmptyBeaconDef, EventChoice, EventDef, EventEffect, FillerListDef, HullDef, HullKitDef, SectorDef, StoreDef, StoreLine, SurrenderOfferDef, SystemDef, TuneDef, TuneStep, WeaponBlueprint } from "./types.ts";

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
  return copy;
}

function copySector(row: SectorDef): SectorDef {
  return { ...row, notes: [...row.notes] };
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

function copyChoice(choice: EventChoice): EventChoice {
  return { id: choice.id, label: choice.label, fx: choice.fx.map(copyEffect) };
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
  return { id: row.id, entries: row.entries.map((entry) => ({ id: entry.id, unique: entry.unique })) };
}

function copyEmpty(row: EmptyBeaconDef): EmptyBeaconDef {
  const copy: EmptyBeaconDef = { id: row.id, dest: row.dest, sectors: [...row.sectors], texts: [...row.texts] };
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
  if (row.surrender) copy.surrender = copySurrender(row.surrender);
  return copy;
}

function copyHull(row: HullDef): HullDef {
  const systems: Record<string, [number, number]> = {};
  for (const [id, pair] of Object.entries(row.systems)) systems[id] = [pair[0], pair[1]];
  const kits: Record<string, HullKitDef> = {};
  for (const [id, kit] of Object.entries(row.kits)) kits[id] = copyKit(kit);
  return {
    ...row,
    systems,
    weapons: [...row.weapons],
    crew: row.crew.map((seat) => ({ kin: seat.kin, room: seat.room })),
    kits,
    augments: [...row.augments],
    unfitted: [...row.unfitted],
  };
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
  for (const row of mode === "base" ? baseCrew : (pack.crew ?? [])) crew.set(row.id, copyCrew(row));
  for (const row of mode === "base" ? baseWeapons : (pack.weapons ?? [])) weapons.set(row.id, copyWeapon(row));
  for (const row of mode === "base" ? baseAugments : (pack.augments ?? [])) augments.set(row.id, copyAugment(row));
  for (const row of mode === "base" ? baseDrones : (pack.drones ?? [])) drones.set(row.id, copyDrone(row));
  for (const row of mode === "base" ? baseSystems : (pack.systems ?? [])) systems.set(row.id, copySystem(row));
  for (const row of mode === "base" ? baseHulls : (pack.hulls ?? [])) hulls.set(row.id, copyHull(row));
  for (const row of mode === "base" ? baseSectors : (pack.sectors ?? [])) sectors.set(row.id, copySector(row));
  for (const row of mode === "base" ? baseStores : (pack.stores ?? [])) stores.set(row.id, copyStore(row));
  for (const row of mode === "base" ? baseTunes : (pack.tunes ?? [])) tunes.set(row.id, copyTune(row));
  for (const row of mode === "base" ? baseEvents : (pack.events ?? [])) events.set(row.id, copyEvent(row));
  for (const row of mode === "base" ? baseLists : (pack.lists ?? [])) lists.set(row.id, copyList(row));
  for (const row of mode === "base" ? baseEmpties : (pack.empties ?? [])) empties.set(row.id, copyEmpty(row));
}

/** The loaded race, or the plain race when the id is missing. */
export function crewDef(id: string | undefined): CrewDef {
  const row = id ? crew.get(id) : undefined;
  if (row) return row;
  const plain = crew.get("plain");
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
}
