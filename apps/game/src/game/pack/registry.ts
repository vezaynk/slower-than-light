import type { AugmentDef, ContentPack, CrewDef, DroneDef, HullDef, HullKitDef, SectorDef, SystemDef, WeaponBlueprint } from "./types.ts";

const crew = new Map<string, CrewDef>();
const weapons = new Map<string, WeaponBlueprint>();
const augments = new Map<string, AugmentDef>();
const drones = new Map<string, DroneDef>();
const systems = new Map<string, SystemDef>();
const hulls = new Map<string, HullDef>();
const sectors = new Map<string, SectorDef>();
let baseCrew: CrewDef[] = [];
let baseWeapons: WeaponBlueprint[] = [];
let baseAugments: AugmentDef[] = [];
let baseDrones: DroneDef[] = [];
let baseSystems: SystemDef[] = [];
let baseHulls: HullDef[] = [];
let baseSectors: SectorDef[] = [];

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
    baseCrew = (pack.crew ?? []).map(copyCrew);
    baseWeapons = (pack.weapons ?? []).map(copyWeapon);
    baseAugments = (pack.augments ?? []).map(copyAugment);
    baseDrones = (pack.drones ?? []).map(copyDrone);
    baseSystems = (pack.systems ?? []).map(copySystem);
    baseHulls = (pack.hulls ?? []).map(copyHull);
    baseSectors = (pack.sectors ?? []).map(copySector);
  }
  for (const row of mode === "base" ? baseCrew : (pack.crew ?? [])) crew.set(row.id, copyCrew(row));
  for (const row of mode === "base" ? baseWeapons : (pack.weapons ?? [])) weapons.set(row.id, copyWeapon(row));
  for (const row of mode === "base" ? baseAugments : (pack.augments ?? [])) augments.set(row.id, copyAugment(row));
  for (const row of mode === "base" ? baseDrones : (pack.drones ?? [])) drones.set(row.id, copyDrone(row));
  for (const row of mode === "base" ? baseSystems : (pack.systems ?? [])) systems.set(row.id, copySystem(row));
  for (const row of mode === "base" ? baseHulls : (pack.hulls ?? [])) hulls.set(row.id, copyHull(row));
  for (const row of mode === "base" ? baseSectors : (pack.sectors ?? [])) sectors.set(row.id, copySector(row));
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

/** Puts the campaign rows back. Appends made by tests do not survive this. */
export function resetPackForTests(): void {
  crew.clear();
  weapons.clear();
  augments.clear();
  drones.clear();
  systems.clear();
  hulls.clear();
  sectors.clear();
  for (const row of baseCrew) crew.set(row.id, copyCrew(row));
  for (const row of baseWeapons) weapons.set(row.id, copyWeapon(row));
  for (const row of baseAugments) augments.set(row.id, copyAugment(row));
  for (const row of baseDrones) drones.set(row.id, copyDrone(row));
  for (const row of baseSystems) systems.set(row.id, copySystem(row));
  for (const row of baseHulls) hulls.set(row.id, copyHull(row));
  for (const row of baseSectors) sectors.set(row.id, copySector(row));
}
