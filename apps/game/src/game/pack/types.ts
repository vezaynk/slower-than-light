import type { WeaponKind } from "../types.ts";

/**
 * A weapon the sim can fire. The campaign rows are today's WeaponDef, plus the beam
 * length, swipe speed, crew damage, and shield pierce that used to live beside it.
 */
export type WeaponBlueprint = {
  id: string;
  name: string;
  kind: WeaponKind;
  power: number;
  charge: number;
  shots: number;
  gap: number;
  damage: number;
  ion: number;
  fire: number;
  breach: number;
  ammo: boolean;
  price: number;
  blurb: string;
  /** Beam length in tiles. Absent means the authored beam table. */
  lengthTiles?: number;
  /** FTL beam speed column. Absent means the authored speed table. */
  speed?: number;
  /** Flat crew-damage HP when this blueprint states one. */
  crewDamage?: number;
  /** Shield layers this shot bypasses. Absent means the authored pierce table. */
  pierce?: number;
};

/**
 * A crew race. Stat fields match extras/kin.ts. The flags are the id branches
 * the sim used for Zoltan power, the death burst, Lanius drain, Slug sight,
 * mind-control immunity, Crystal lockdown, and fire-fighting.
 */
export type CrewDef = {
  id: string;
  name: string;
  hp: number;
  move: number;
  repair: number;
  fight: number;
  suffocate: number;
  fireTaken: number;
  bonusPower: number;
  hasDeathExplosion: boolean;
  drainsOxygen: boolean;
  detectsLifeforms: boolean;
  resistsMindControl: boolean;
  lockdown: boolean;
  lockCooldown: number;
  fireRepairMultiplier: number;
};

/** A store listing. Effect code still switches on the campaign ids. */
export type AugmentDef = {
  id: string;
  name: string;
  detail: string;
  cost: number;
};

export type ContentPack = {
  crew?: CrewDef[];
  weapons?: WeaponBlueprint[];
  augments?: AugmentDef[];
};
