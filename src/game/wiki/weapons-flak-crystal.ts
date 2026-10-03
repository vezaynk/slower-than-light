import type { WeaponDef } from "../content.ts";

/**
 * Unfitted rows from page titles "Flak (Weapons)" and "Crystal (Weapons)".
 * Flak Gun Mark I is already fitted as scatter. Flak Artillery is not a weapon
 * row; flakart.ts owns that system, and the extra numbers sit in the gaps.
 */
export type FlakCrystalGap = {
  id: string;
  note: string;
  radius?: number;
  fake?: number;
  pierce?: number;
  /** Adv. Flak sells for this scrap and is not a store purchase. */
  sell?: number;
  rooms?: readonly string[];
};

/**
 * Flak (Weapons) lead: "they never cause fires or breaches."
 * INFERRED: gap 0 because that page says the shots arrive almost simultaneously,
 * and neither weapon section gives a per-shot gap. Ion 0 and ammo false: no ion
 * and no missile cost are listed. Shots are the projectile count.
 */
const FLAK_FAMILY = {
  gap: 0,
  ion: 0,
  fire: 0,
  breach: 0,
  ammo: false,
} as const;

export const FLAK_CRYSTAL_WEAPONS: WeaponDef[] = [
  {
    id: "advflak",
    name: "Adv. Flak Gun",
    kind: "flak",
    // Flak (Weapons) "Adv. Flak Gun": 1 power, 8s, 3 shots, 1 damage.
    // Sells for 30 and cannot be bought or found, so price is 0, not the sell scrap.
    power: 1,
    charge: 8,
    shots: 3,
    // INFERRED: gap 0. The shots arrive almost simultaneously, and the section gives no gap.
    gap: FLAK_FAMILY.gap,
    damage: 1,
    ion: FLAK_FAMILY.ion,
    // Flak (Weapons) lead: they never cause fires or breaches.
    fire: FLAK_FAMILY.fire,
    breach: FLAK_FAMILY.breach,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: FLAK_FAMILY.ammo,
    price: 0,
    blurb:
      "Fires a blast of debris across a random area doing up to 3 damage. Good at taking down shields but hard to aim.",
  },
  {
    id: "flak2",
    name: "Flak Gun Mark II",
    kind: "flak",
    // Flak (Weapons) "Flak Gun Mark II": 3 power, 21s, 7 shots, 1 damage, purchase price 80.
    power: 3,
    charge: 21,
    shots: 7,
    // INFERRED: gap 0. The shots arrive almost simultaneously, and the section gives no gap.
    gap: FLAK_FAMILY.gap,
    damage: 1,
    ion: FLAK_FAMILY.ion,
    // Flak (Weapons) lead: they never cause fires or breaches.
    fire: FLAK_FAMILY.fire,
    breach: FLAK_FAMILY.breach,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: FLAK_FAMILY.ammo,
    price: 80,
    blurb:
      "Fires a blast of debris across a random area doing up to 7 damage. Good at taking down shields but hard to aim.",
  },
  {
    id: "crystalburst",
    name: "Crystal Burst Mark I",
    // Shards are projectiles. WeaponKind has no crystal kind.
    // kind "laser" is the closest stored kind and pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Crystal Burst Mark I": 2 power, 15s, 2 shots, 1 damage, purchase price 20.
    power: 2,
    charge: 15,
    shots: 2,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 1,
    // INFERRED: ion 0. The row lists no ion.
    ion: 0,
    // INFERRED: fire 0. The row lists no fire chance.
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    // INFERRED: ammo false. The section lists no missile cost.
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "crystalburst2",
    name: "Crystal Burst Mark II",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Crystal Burst Mark II": 3 power, 17s, 3 shots, 1 damage, purchase price 20.
    power: 3,
    charge: 17,
    shots: 3,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 1,
    ion: 0,
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "heavycrystal",
    name: "Heavy Crystal Mark I",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Heavy Crystal Mark I": 1 power, 13s, 1 shot, 2 damage, purchase price 20.
    power: 1,
    charge: 13,
    shots: 1,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 2,
    ion: 0,
    fire: 0,
    // "low chance of breach" and no percent is given.
    breach: 0,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
  {
    id: "heavycrystal2",
    name: "Heavy Crystal Mark II",
    // Same stored kind as Crystal Burst Mark I. Pierce is NOT modeled by kind.
    kind: "laser",
    // Crystal (Weapons) "Heavy Crystal Mark II": 3 power, 19s, 1 shot, 4 damage, purchase price 20.
    power: 3,
    charge: 19,
    shots: 1,
    // INFERRED: gap 0. Crystal (Weapons) gives no gap.
    gap: 0,
    damage: 4,
    ion: 0,
    fire: 0,
    // "guaranteed breach" is certain, so this is 1 rather than a guessed percent.
    breach: 1,
    ammo: false,
    price: 20,
    blurb: "Modified projectile weapon that fires shield piercing crystals.",
  },
];

export const FLAK_CRYSTAL_GAPS: FlakCrystalGap[] = [
  {
    id: "advflak",
    radius: 40,
    fake: 3,
    sell: 30,
    rooms: [
      "When fired at 1x2 room: 48.74% in main room, 11.51% in each tile next to long sides, 2.57% in each tile next to short sides, 0.02% in each tile next to corners.",
      "When fired at 2x2 room: 89.59% in main room, 1.30% in each tile next to sides.",
    ],
    note: 'Flak (Weapons) "Adv. Flak Gun": targeting area radius 40 and 3 additional fake flak are not on WeaponDef. Sells for 30 and cannot be bought or found, so price is 0. Enemies never use it. Only on Lanius B. Room odds are copied and not simulated.',
  },
  {
    id: "flak2",
    radius: 55,
    fake: 6,
    rooms: [
      "When fired at 1x2 room: 25.78% in main room, 12.06% in each tile next to long sides, 7.02% in each tile next to short sides, 2.70% in each tile next to corners, 0.29% in each tile after the tiles next to long sides.",
      "When fired at 2x2 room: 51.56% in main room, 5.90% in each tile next to sides, 0.31% in each tile next to corners.",
    ],
    note: 'Flak (Weapons) "Flak Gun Mark II": targeting area radius 55 and 6 additional fake flak are not on WeaponDef. Store rarity 4. Room odds are copied and not simulated.',
  },
  {
    id: "flak-artillery",
    radius: 35,
    fake: 7,
    rooms: [
      "When fired at 1x2 room: 60.90% in main room, 9.78% in each tile next to long sides.",
      "When fired at 2x2 room: 100% in main room.",
    ],
    note: 'flakart.ts owns the system. Flak (Weapons) "Flak Artillery" matches that file on 4 levels, charge 50/40/30/20, shots 7, damage 1, and auto-fire. This section is more than that reminder: radius 35 (each flak projectile is auto-targeted at a random room), additional fake flak 7, and the room odds below are not applied there.',
  },
  {
    id: "crystalburst",
    pierce: 1,
    note: 'Crystal (Weapons) "Crystal Burst Mark I": pierce one shield layer. kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Low chance to stun crew; no percent is given. Store rarity 1.',
  },
  {
    id: "crystalburst2",
    pierce: 1,
    note: 'Crystal (Weapons) "Crystal Burst Mark II": pierce one shield layer. kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Low chance to stun crew; no percent is given. Store rarity 4.',
  },
  {
    id: "heavycrystal",
    pierce: 1,
    note: 'Crystal (Weapons) "Heavy Crystal Mark I": pierce one shield layer. kind "laser" does not apply pierce. Effect: low chance of breach; no percent is given. Moderate-low chance to stun crew; no percent is given. Store rarity 2.',
  },
  {
    id: "heavycrystal2",
    pierce: 1,
    note: 'Crystal (Weapons) "Heavy Crystal Mark II": pierce one shield layer. kind "laser" does not apply pierce. Effect: guaranteed breach, stored as breach 1. Moderate-low chance to stun crew; no percent is given. Store rarity 5.',
  },
];
