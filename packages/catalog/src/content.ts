import type { WeaponKind } from "@stl/pack";
import type { SysId } from "./ids.ts";
import { ORDNANCE } from "./extras/ordnance.ts";
import { BEAM_WEAPONS } from "./wiki/weapons-beam.ts";
import { BOMB_WEAPONS } from "./wiki/weapons-bomb.ts";
import { FLAK_CRYSTAL_WEAPONS } from "./wiki/weapons-flak-crystal.ts";
import { ION_WEAPONS } from "./wiki/weapons-ion.ts";
import { LASER_WEAPONS } from "./wiki/weapons-laser.ts";
import { MISSILE_WEAPONS } from "./wiki/weapons-missile.ts";
import { registerFlagshipWeapons } from "./wiki/flagship-weapons.ts";

export type WeaponDef = {
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
};

/**
 * Fitted weapons. Each object is cited on the comment above it.
 * Dart stays Dart: its charge is not a wiki missile. INVENTED name.
 * Pike Beam is archive blueprint BEAM_LONG. The display name stays Pike Beam.
 */
export const WEAPONS: Record<string, WeaponDef> = {
  // Laser (Weapons), "Burst Laser Mark II": purchase price 80, power 2, charge 12 seconds, shots 3, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.1, not on the page.
  // Breach is not stated. gap 0.28 is not on the page and is left in place.
  LASER_BURST_3: {
    id: "LASER_BURST_3",
    name: "Burst Laser II",
    kind: "laser",
    power: 2,
    charge: 12,
    shots: 3,
    gap: 0.28,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 80,
    blurb: "Three bolts. The first one only buys down a shield layer.",
  },
  // Laser (Weapons), "Basic Laser": "Sells for: 10 (cannot be bought or found)". price 0, not the sell value.
  // Power 1, charge 10 seconds, shots 1, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.08, not on the page.
  LASER_BURST_1: {
    id: "LASER_BURST_1",
    name: "Basic Laser",
    kind: "laser",
    power: 1,
    charge: 10,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "One bolt. A shield layer stops it whole.",
  },
  // Laser (Weapons), "Dual Lasers": "Sells for: 12 (cannot be bought or found)". price 0, not the sell value.
  // Power 1, charge 10 seconds, shots 2, damage per shot 1.
  // Effect: low chance of fire. No percent is published. INFERRED removed: fire was 0.08, not on the page.
  // gap 0.3 is not on the page and is left in place.
  LASER_BURST_2: {
    id: "LASER_BURST_2",
    name: "Dual Lasers",
    kind: "laser",
    power: 1,
    charge: 10,
    shots: 2,
    gap: 0.3,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "Two bolts from a single power bar.",
  },
  // Laser (Weapons), "Heavy Laser Mark I": purchase price 50, power 1, charge 9 seconds, shots 1, damage per shot 2.
  // Laser (Weapons), "Types of lasers": the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance.
  LASER_HEAVY_1: {
    id: "LASER_HEAVY_1",
    name: "Heavy Laser",
    kind: "laser",
    power: 1,
    charge: 9,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0.3,
    breach: 0.3,
    ammo: false,
    price: 50,
    blurb: "Two hull if it lands. One shield layer still eats the entire shot.",
  },
  // INVENTED. Charge is 14 seconds, which is not Artemis (Missile (Weapons), "Artemis Missiles", 11 seconds) or Leto ("Leto Missiles", 9 seconds), so it is not renamed.
  dart: {
    id: "dart",
    name: "Dart",
    kind: "missile",
    power: 1,
    charge: 14,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0.1,
    breach: 0.25,
    ammo: true,
    price: 40,
    blurb: "Ignores shields. Spends one missile. Can still miss.",
  },
  // Ion (Weapons), "Ion Blast": purchase price 30, power 1, charge 8 seconds, shots 1, ion damage per shot 1.
  // The section and the page lead give no hull damage, so damage is 0. Effect: low chance to stun. No percent is published. Stun is not a field.
  ION_1: {
    id: "ION_1",
    name: "Ion Blast",
    kind: "ion",
    power: 1,
    charge: 8,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 30,
    blurb: "No hull damage. A shield blocks it. If it lands, it locks one power bar for 5 seconds.",
  },
  // Missile (Weapons), "Artemis Missiles": sells for 19 (cannot be bought or found), so price is 0, not 19.
  // Power 1, charge 11 seconds, shots 1, damage per shot 2.
  // Effect: low chance of fire or breach. No percent is published. INFERRED removed: fire 0.1 and breach 0.09 were not on the page.
  // Low chance to stun is not a field. The lead says a missile spends 1 ammunition.
  MISSILES_2_PLAYER: {
    id: "MISSILES_2_PLAYER",
    name: "Artemis Missiles",
    kind: "missile",
    power: 1,
    charge: 11,
    shots: 1,
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: true,
    price: 0,
    blurb: "Ignores shields. Two damage. Spends one missile. Can still miss.",
  },
  // Missile (Weapons), "Leto Missiles": sells for 10 (cannot be bought or found), so price is 0, not 10.
  // Power 1, charge 9 seconds, shots 1, damage per shot 1.
  // Effect: low chance of fire or breach. No percent is published. INFERRED removed: fire 0.1 and breach 0.09 were not on the page.
  // Low chance to stun is not a field. The lead says a missile spends 1 ammunition.
  MISSILES_1: {
    id: "MISSILES_1",
    name: "Leto Missiles",
    kind: "missile",
    power: 1,
    charge: 9,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: true,
    price: 0,
    blurb: "Ignores shields. One damage. Spends one missile. Can still miss.",
  },
  // Ion (Weapons), "Ion Blast Mark II": purchase price 70, power 3, charge 4 seconds, shots 1, ion damage per shot 1.
  // No hull damage is stated, so damage is 0. Effect: low chance to stun. No percent is published. Stun is not a field.
  ION_4: {
    id: "ION_4",
    name: "Ion Blast II",
    kind: "ion",
    power: 3,
    charge: 4,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 70,
    blurb: "No hull damage. Locks one power bar for 5 seconds if it gets past the shields.",
  },
  // Ion (Weapons), "Heavy Ion": purchase price 45, power 2, charge 13 seconds, shots 1, ion damage per shot 2.
  // No hull damage is stated, so damage is 0. Effect: moderate-low chance to stun. No percent is published. Stun is not a field.
  ION_2: {
    id: "ION_2",
    name: "Heavy Ion",
    kind: "ion",
    power: 2,
    charge: 13,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 2,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 45,
    blurb: "No hull damage. Two ion if it lands, which is two locked bars.",
  },
  // Ion (Weapons), "Ion Stunner": purchase price 35, power 1, charge 10 seconds, shots 1, ion damage per shot 1.
  // No hull damage is stated, so damage is 0. Boarding, "Stun effect": the room stun is 5 seconds (sim.ts).
  ION_STUN: {
    id: "ION_STUN",
    name: "Ion Stunner",
    kind: "ion",
    power: 1,
    charge: 10,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 35,
    blurb: "No hull damage. One ion if it lands. Stuns the room for 5 seconds.",
  },
  // Beam (Weapons), "Pike Beam": purchase price 55, power 2, charge 16 seconds, damage 1 per room.
  // Archive blueprint BEAM_LONG. The display name stays Pike Beam.
  // Halberd Beam is a different row: 65 scrap, 3 power, 17 seconds, 2 damage. It is registered from weapons-beam.ts.
  BEAM_LONG: {
    id: "BEAM_LONG",
    name: "Pike Beam",
    kind: "beam",
    power: 2,
    charge: 16,
    shots: 1,
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 55,
    blurb: "One evade roll for the whole sweep. Shields subtract damage and stay up.",
  },
};

// Wiki page "Flak (Weapons)", section "Flak Gun Mark I", and wiki page "Bomb (Weapons)", section "Fire Bomb".
for (const extra of ORDNANCE) WEAPONS[extra.id] = extra;
// Ids already stored are left as they are. The added rows are wiki page "Laser (Weapons)", section "List of Laser weapons"; "Beam (Weapons)", section "List of Beam weapons"; "Ion (Weapons)", section "List of Ion weapons"; "Missile (Weapons)", section "List of Missile weapons"; "Bomb (Weapons)", section "List of Bomb weapons"; "Flak (Weapons)", section "List of Flak weapons"; "Crystal (Weapons)", section "List of Crystal weapons".
// The unregistered pike row shares BEAM_LONG with the Pike Beam above, so it is skipped.
for (const extra of [
  ...LASER_WEAPONS,
  ...BEAM_WEAPONS,
  ...ION_WEAPONS,
  ...MISSILE_WEAPONS,
  ...BOMB_WEAPONS,
  ...FLAK_CRYSTAL_WEAPONS,
]) {
  if (extra.id === "BEAM_LONG" || WEAPONS[extra.id]) continue;
  WEAPONS[extra.id] = extra;
}
// @agent:flagship. Boss Laser and Boss Beam, and the flagship page's Boss Missile breach (wiki/flagship-weapons.ts).
registerFlagshipWeapons(WEAPONS);

export const SYS_LABEL: Record<SysId, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  medbay: "Medbay",
  weapons: "Weapons",
  pilot: "Piloting",
  sensors: "Sensors",
  doors: "Doors",
};

/** INVENTED personal names. Hangar crew cards repeat the wiki race count and do not use this pool. */
export const CREW_POOL = ["Ada Voss", "Ivo Park", "Nen Hale", "Brin Sol", "Quill Ade", "Mara Kent"];
