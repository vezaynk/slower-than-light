import type { AugmentDef, ContentPack, CrewDef, WeaponBlueprint } from "./types.ts";

const crew = new Map<string, CrewDef>();
const weapons = new Map<string, WeaponBlueprint>();
const augments = new Map<string, AugmentDef>();
let baseCrew: CrewDef[] = [];
let baseWeapons: WeaponBlueprint[] = [];
let baseAugments: AugmentDef[] = [];

function copyCrew(row: CrewDef): CrewDef {
  return { ...row };
}

function copyWeapon(row: WeaponBlueprint): WeaponBlueprint {
  return { ...row };
}

function copyAugment(row: AugmentDef): AugmentDef {
  return { ...row };
}

/** `"base"` replaces the maps. `"append"` adds or overwrites by id. */
export function loadPack(pack: ContentPack, mode: "base" | "append"): void {
  if (mode === "base") {
    crew.clear();
    weapons.clear();
    augments.clear();
    baseCrew = (pack.crew ?? []).map(copyCrew);
    baseWeapons = (pack.weapons ?? []).map(copyWeapon);
    baseAugments = (pack.augments ?? []).map(copyAugment);
  }
  for (const row of mode === "base" ? baseCrew : (pack.crew ?? [])) crew.set(row.id, copyCrew(row));
  for (const row of mode === "base" ? baseWeapons : (pack.weapons ?? [])) weapons.set(row.id, copyWeapon(row));
  for (const row of mode === "base" ? baseAugments : (pack.augments ?? [])) augments.set(row.id, copyAugment(row));
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

/** Puts the campaign rows back. Appends made by tests do not survive this. */
export function resetPackForTests(): void {
  crew.clear();
  weapons.clear();
  augments.clear();
  for (const row of baseCrew) crew.set(row.id, copyCrew(row));
  for (const row of baseWeapons) weapons.set(row.id, copyWeapon(row));
  for (const row of baseAugments) augments.set(row.id, copyAugment(row));
}
