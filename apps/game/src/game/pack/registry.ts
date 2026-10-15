import type { AugmentDef, ContentPack, CrewDef, DroneDef, SystemDef, WeaponBlueprint } from "./types.ts";

const crew = new Map<string, CrewDef>();
const weapons = new Map<string, WeaponBlueprint>();
const augments = new Map<string, AugmentDef>();
const drones = new Map<string, DroneDef>();
const systems = new Map<string, SystemDef>();
let baseCrew: CrewDef[] = [];
let baseWeapons: WeaponBlueprint[] = [];
let baseAugments: AugmentDef[] = [];
let baseDrones: DroneDef[] = [];
let baseSystems: SystemDef[] = [];

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

/** `"base"` replaces the maps. `"append"` adds or overwrites by id. */
export function loadPack(pack: ContentPack, mode: "base" | "append"): void {
  if (mode === "base") {
    crew.clear();
    weapons.clear();
    augments.clear();
    drones.clear();
    systems.clear();
    baseCrew = (pack.crew ?? []).map(copyCrew);
    baseWeapons = (pack.weapons ?? []).map(copyWeapon);
    baseAugments = (pack.augments ?? []).map(copyAugment);
    baseDrones = (pack.drones ?? []).map(copyDrone);
    baseSystems = (pack.systems ?? []).map(copySystem);
  }
  for (const row of mode === "base" ? baseCrew : (pack.crew ?? [])) crew.set(row.id, copyCrew(row));
  for (const row of mode === "base" ? baseWeapons : (pack.weapons ?? [])) weapons.set(row.id, copyWeapon(row));
  for (const row of mode === "base" ? baseAugments : (pack.augments ?? [])) augments.set(row.id, copyAugment(row));
  for (const row of mode === "base" ? baseDrones : (pack.drones ?? [])) drones.set(row.id, copyDrone(row));
  for (const row of mode === "base" ? baseSystems : (pack.systems ?? [])) systems.set(row.id, copySystem(row));
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

/** Puts the campaign rows back. Appends made by tests do not survive this. */
export function resetPackForTests(): void {
  crew.clear();
  weapons.clear();
  augments.clear();
  drones.clear();
  systems.clear();
  for (const row of baseCrew) crew.set(row.id, copyCrew(row));
  for (const row of baseWeapons) weapons.set(row.id, copyWeapon(row));
  for (const row of baseAugments) augments.set(row.id, copyAugment(row));
  for (const row of baseDrones) drones.set(row.id, copyDrone(row));
  for (const row of baseSystems) systems.set(row.id, copySystem(row));
}
