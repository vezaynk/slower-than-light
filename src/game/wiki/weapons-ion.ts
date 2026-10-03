import type { WeaponDef } from "../content.ts";

/**
 * Ion rows not already fitted. Wiki page "Ion (Weapons)".
 * The lead says "Ion weapons do not damage hull, systems, or crew." damage is 0.
 * No section lists a missile cost, so ammo is false.
 * Not here: Ion Blast, Ion Blast Mark II, Heavy Ion, Ion Stunner.
 * Chain Ion's later ion steps stay in ION_GAPS. WeaponDef has no chain field.
 */
export const ION_WEAPONS: WeaponDef[] = [
  {
    id: "ioncharger",
    name: "Ion Charger",
    kind: "ion",
    // Wiki page "Ion (Weapons)", ===Ion Charger===.
    // Purchase price 50. Power requirement: 2 power. Charge time: 6 seconds per shot.
    // Ion damage per shot: 1. Effect is a dash, so fire and breach are 0.
    // Shots: 1-3, "up to 3 shots". shots is that full volley. Firing early is in ION_GAPS.
    // Store rarity 3. Advanced Edition. The section prints no sell value.
    // INFERRED: gap 0. The section gives no gap.
    power: 2,
    charge: 6,
    shots: 3,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 50,
    blurb: "This ion weapon can charge multiple times, giving it additional projectiles.",
  },
  {
    id: "chainion",
    name: "Chain Ion",
    kind: "ion",
    // Wiki page "Ion (Weapons)", ===Chain Ion===.
    // Purchase price 55. Power requirement: 3 power. Charge time: 14 seconds. Shots: 1.
    // Ion damage per shot starts at 1. Later steps are in ION_GAPS.
    // Effect is a dash, so fire and breach are 0. Store rarity 4. Advanced Edition.
    // The section prints no sell value.
    // INFERRED: gap 0. The section gives no gap.
    power: 3,
    charge: 14,
    shots: 1,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 55,
    blurb: "This weapon's Ion damage increases each time it fires to a max of 4.",
  },
  {
    id: "bossion",
    name: "Boss Ion",
    kind: "ion",
    // Wiki page "Ion (Weapons)", ===Boss Ion===.
    // No purchase price is printed. Only the Rebel Flagship uses it, in Phase-1. price 0.
    // "Artillery system: with 3 system levels maximum." The ion table's Power cell is that 3.
    // Charge time: 35s at level 1, 28s at level 2, 21s at level 3. charge is the level-1 base.
    // Shots: 3. Ion damage per shot: 1. No fire or breach percent is printed.
    // The hidden description string is "1 damage ion 3 shots." That is ion, not hull damage.
    // INFERRED: gap 0. The section gives no gap.
    power: 3,
    charge: 35,
    shots: 3,
    gap: 0,
    damage: 0,
    ion: 1,
    fire: 0,
    breach: 0,
    ammo: false,
    price: 0,
    blurb: "Flagship artillery. Three shots of one ion. Not sold.",
  },
];

/**
 * Mechanics that do not fit WeaponDef.
 * Wiki page "Ion (Weapons)".
 */
export const ION_GAPS = {
  ioncharger: {
    // Wiki page "Ion (Weapons)", ===Ion Charger===.
    // Can fire early: a volley of 1 or 2, before the third charge.
    // "Autofire" causes continuous fire, disables charging.
    canFireEarly: true,
    minShots: 1,
    maxShots: 3,
    autofireDisablesCharging: true,
  },
  chainion: {
    // Wiki page "Ion (Weapons)", ===Chain Ion===.
    // "each subsequent shot dealing 1 additional ion damage, up to a maximum of 4".
    // WeaponDef has no chain field. ion stays the first printed shot, 1. Later steps:
    laterIon: [2, 3, 4],
    // "it takes 56 seconds to fully chain."
    secondsToFullChain: 56,
  },
  bossion: {
    // Wiki page "Ion (Weapons)", ===Boss Ion===.
    // Level 1 is the weapon charge, 35 seconds. The other printed times:
    chargeByLevel: { 1: 35, 2: 28, 3: 21 },
  },
} as const;
