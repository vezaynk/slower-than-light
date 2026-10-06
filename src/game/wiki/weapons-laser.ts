import type { WeaponDef } from "../content.ts";

/**
 * Laser (Weapons). Rows not already fitted.
 * Omitted: Basic Laser, Dual Lasers, Burst Laser Mark II, Heavy Laser Mark I.
 * Boss Laser is BLOCKED because the section states no power requirement, same rule as Boss Beam in weapons-beam.ts.
 * kind is "laser". ammo is false: no section lists a missile cost.
 * ion is 0: no section states ion.
 */

export const LASER_WEAPONS: WeaponDef[] = [
  {
    id: "burst1",
    name: "Burst Laser Mark I",
    kind: "laser",
    // Laser (Weapons), "Burst Laser Mark I": "Power requirement: 2 power".
    power: 2,
    // Laser (Weapons), "Burst Laser Mark I": "Charge time: 11 seconds".
    charge: 11,
    // Laser (Weapons), "Burst Laser Mark I": "Shots: 2".
    shots: 2,
    // Laser (Weapons), "Types of lasers": Burst Lasers fire "in quick succession", which is not a number. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Burst Laser Mark I": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Burst Laser Mark I": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Burst Laser Mark I": "Effect: low chance of fire". The section gives no percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Burst Laser Mark I": no breach bullet. The section gives no percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Burst Laser Mark I": "Purchase price: 50".
    price: 50,
    blurb: "This simple burst laser isn't flashy but it gets the job done.",
  },
  {
    id: "burst3",
    name: "Burst Laser Mark III",
    kind: "laser",
    // Laser (Weapons), "Burst Laser Mark III": "Power requirement: 4 power".
    power: 4,
    // Laser (Weapons), "Burst Laser Mark III": "Charge time: 19 seconds".
    charge: 19,
    // Laser (Weapons), "Burst Laser Mark III": "Shots: 5".
    shots: 5,
    // Laser (Weapons), "Types of lasers": Burst Lasers fire "in quick succession", which is not a number. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Burst Laser Mark III": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Burst Laser Mark III": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Burst Laser Mark III": "Unlike most lasers, it cannot start fires". Stated zero, not a missing percent.
    fire: 0,
    // Laser (Weapons), "Burst Laser Mark III": "Effect: -". The section gives no breach percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Burst Laser Mark III": "Purchase price: 95".
    price: 95,
    blurb: "Powerful burst laser that fires off an impressive barrage.",
  },
  {
    id: "heavypierce",
    name: "Heavy Pierce Laser Mark I",
    kind: "laser",
    // Laser (Weapons), "Heavy Pierce Laser Mark I": "Power requirement: 2 power".
    power: 2,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": "Charge time: 10 seconds".
    charge: 10,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": "Shots: 1".
    shots: 1,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": the section does not give a gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": "Damage per shot: 2".
    damage: 2,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Types of lasers": "the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance."
    fire: 0.3,
    // Laser (Weapons), "Types of lasers": same sentence, 30% breach after the fire roll. The weapon line only says "moderate chance of fire or breach" and gives no percent.
    breach: 0.3,
    ammo: false,
    // Laser (Weapons), "Heavy Pierce Laser Mark I": "Sells for: 27 (cannot be bought or found)". price is 0. Sell value 27 is not stored in price.
    price: 0,
    blurb:
      "Heavy lasers can wreak more havoc than their smaller, burst laser counterparts. This modified version pierces 1 shield.",
  },
  {
    id: "heavy2",
    name: "Heavy Laser Mark II",
    kind: "laser",
    // Laser (Weapons), "Heavy Laser Mark II": "Power requirement: 3 power".
    power: 3,
    // Laser (Weapons), "Heavy Laser Mark II": "Charge time: 13 seconds".
    charge: 13,
    // Laser (Weapons), "Heavy Laser Mark II": "Shots: 2".
    shots: 2,
    // Laser (Weapons), "Heavy Laser Mark II": "fires two shots in quick succession" is not a number. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Heavy Laser Mark II": "Damage per shot: 2".
    damage: 2,
    // Laser (Weapons), "Heavy Laser Mark II": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Types of lasers": "the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance."
    fire: 0.3,
    // Laser (Weapons), "Types of lasers": same sentence, 30% breach after the fire roll. The weapon line only says "moderate chance of fire or breach" and gives no percent.
    breach: 0.3,
    ammo: false,
    // Laser (Weapons), "Heavy Laser Mark II": "Purchase price: 65".
    price: 65,
    blurb: "This heavy laser fires two shots in quick succession, each dealing 2 damage",
  },
  {
    id: "hullsmash",
    name: "Hull Smasher Laser",
    kind: "laser",
    // Laser (Weapons), "Hull Smasher Laser": "Power requirement: 2 power".
    power: 2,
    // Laser (Weapons), "Hull Smasher Laser": "Charge time: 14 seconds".
    charge: 14,
    // Laser (Weapons), "Hull Smasher Laser": "Shots: 2".
    shots: 2,
    // Laser (Weapons), "Hull Smasher Laser": the section does not give a gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Hull Smasher Laser": "Damage per shot: 1 (to system rooms) or 2 (to systemless rooms)". damage is the system-room 1.
    damage: 1,
    // Laser (Weapons), "Hull Smasher Laser": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Hull Smasher Laser": "Effect: moderate-low chance of breach". No fire percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Hull Smasher Laser": "moderate-low chance of breach". The section gives no percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Hull Smasher Laser": "Purchase price: 55".
    price: 55,
    blurb: "A powerful laser designed to maximize hull damage.",
  },
  {
    id: "hullsmash2",
    name: "Hull Smasher Laser Mark II",
    kind: "laser",
    // Laser (Weapons), "Hull Smasher Laser Mark II": "Power requirement: 3 power".
    power: 3,
    // Laser (Weapons), "Hull Smasher Laser Mark II": "Charge time: 15 seconds".
    charge: 15,
    // Laser (Weapons), "Hull Smasher Laser Mark II": "Shots: 3".
    shots: 3,
    // Laser (Weapons), "Hull Smasher Laser Mark II": the section does not give a gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Hull Smasher Laser Mark II": "Damage per shot: 1 (to system rooms) or 2 (to systemless rooms)". damage is the system-room 1.
    damage: 1,
    // Laser (Weapons), "Hull Smasher Laser Mark II": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Hull Smasher Laser Mark II": "low chance of fire or moderate chance of breach". The section gives no percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Hull Smasher Laser Mark II": same effect line. The section gives no breach percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Hull Smasher Laser Mark II": "Purchase price: 75".
    price: 75,
    blurb: "This powerful counterpart to the Hull Smasher Mark I fires more projectiles per shot.",
  },
  {
    id: "chainlaser",
    name: "Chain Burst Laser",
    kind: "laser",
    // Laser (Weapons), "Chain Burst Laser": "Power requirement: 2 power".
    power: 2,
    // Laser (Weapons), "Chain Burst Laser": "Charge-up profile: 16s/13s/10s/7s (-3s per step, 3 steps total)". charge is the first step, 16.
    charge: 16,
    // Laser (Weapons), "Chain Burst Laser": "Shots: 2".
    shots: 2,
    // Laser (Weapons), "Chain Burst Laser": the section does not give a shot gap. "in quick succession" is not on this row. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Chain Burst Laser": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Chain Burst Laser": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Chain Burst Laser": "Effect: low chance of fire". The section gives no percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Chain Burst Laser": no breach bullet. The section gives no percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Chain Burst Laser": "Purchase price: 65".
    price: 65,
    blurb:
      "This dual shot laser decreases in cooldown the more it fires. After 3 volleys it only takes 7 seconds to charge.",
  },
  {
    id: "vulcan",
    name: "Chain Vulcan",
    kind: "laser",
    // Laser (Weapons), "Chain Vulcan": "Power requirement: 4 power".
    power: 4,
    // Laser (Weapons), "Chain Vulcan": "Charge-up profile: 11.1s / 9.1s / 7.1s / 5.1s / 3.1s / 1.1s (-2s per step, 5 steps total)". charge is the first step, 11.1.
    charge: 11.1,
    // Laser (Weapons), "Chain Vulcan": "Shots: 1".
    shots: 1,
    // Laser (Weapons), "Chain Vulcan": the section does not give a gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Chain Vulcan": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Chain Vulcan": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Chain Vulcan": "Effect: low chance of fire". The section gives no percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Chain Vulcan": no breach bullet. The section gives no percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Chain Vulcan": "Purchase price: 95".
    price: 95,
    blurb:
      "This laser weapon takes a long time to warm up. Each time it fires it decreases the cooldown, eventually able to take down any amount of shields.",
  },
  {
    id: "chargers",
    name: "Laser Charger (S)",
    kind: "laser",
    // Laser (Weapons), "Laser Charger (S)": "Power requirement: 1 power".
    power: 1,
    // Laser (Weapons), "Laser Charger (S)": "Charge time: 5.5 seconds per shot, up to 2 shots". charge is the first / per-shot time, 5.5.
    charge: 5.5,
    // Laser (Weapons), "Laser Charger (S)": "Shots: 1-2" and "up to 2 shots". shots stores the full charge, 2.
    shots: 2,
    // Laser (Weapons), "Laser Charger (S)": the section does not give a shot gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Laser Charger (S)": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Laser Charger (S)": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Laser Charger (S)": "Unlike most lasers, it cannot start fires". Stated zero, not a missing percent.
    fire: 0,
    // Laser (Weapons), "Laser Charger (S)": "Effect: -". The section gives no breach percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Laser Charger (S)": "Sells for: 15 (cannot be bought or found)". price is 0. Sell value 15 is not stored in price.
    price: 0,
    blurb:
      "This laser weapon can charge two times, giving it an additional projectile. This improved version only requires 1 power.",
  },
  {
    id: "charger",
    name: "Laser Charger",
    kind: "laser",
    // Laser (Weapons), "Laser Charger": "Power requirement: 2 power".
    power: 2,
    // Laser (Weapons), "Laser Charger": "Charge time: 6 seconds per shot, up to 2 shots". charge is the first / per-shot time, 6.
    charge: 6,
    // Laser (Weapons), "Laser Charger": "Shots: 1-2" and "up to 2 shots". shots stores the full charge, 2.
    shots: 2,
    // Laser (Weapons), "Laser Charger": the section does not give a shot gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Laser Charger": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Laser Charger": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Laser Charger": "Unlike most lasers, it cannot start fires". Stated zero, not a missing percent.
    fire: 0,
    // Laser (Weapons), "Laser Charger": "Effect: -". The section gives no breach percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Laser Charger": "Purchase price: 55".
    price: 55,
    blurb: "This laser weapon can charge two times, giving it an extra projectile.",
  },
  {
    id: "charger2",
    name: "Laser Charger Mark II",
    kind: "laser",
    // Laser (Weapons), "Laser Charger Mark II": "Power requirement: 3 power".
    power: 3,
    // Laser (Weapons), "Laser Charger Mark II": "Charge time: 5 seconds per shot, up to 4 shots". charge is the first / per-shot time, 5.
    charge: 5,
    // Laser (Weapons), "Laser Charger Mark II": "Shots: 1-4" and "up to 4 shots". shots stores the full charge, 4.
    shots: 4,
    // Laser (Weapons), "Laser Charger Mark II": the section does not give a shot gap. gap 0 INFERRED.
    gap: 0,
    // Laser (Weapons), "Laser Charger Mark II": "Damage per shot: 1".
    damage: 1,
    // Laser (Weapons), "Laser Charger Mark II": the section does not state ion.
    ion: 0,
    // Laser (Weapons), "Laser Charger Mark II": "Effect: low chance of fire". The section gives no percent. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Laser (Weapons), "Laser Charger Mark II": no breach bullet. The section gives no percent. 0 means no number was published, not a measured zero chance.
    breach: 0,
    ammo: false,
    // Laser (Weapons), "Laser Charger Mark II": "Purchase price: 70".
    price: 70,
    blurb: "This laser weapon can charge multiple times, giving it additional projectiles.",
  },
];

export const LASER_GAPS: { id: string; note: string }[] = [
  {
    id: "heavypierce",
    note: 'Laser (Weapons), "Heavy Pierce Laser Mark I": "Special: 1 shield piercing". "Types of lasers": "ignores one shield layer". WeaponDef has no pierce field.',
  },
  {
    id: "heavypierce",
    note: 'Laser (Weapons), "Types of lasers": "the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance." fire and breach store 0.3 each; the roll order is not a field. "51% chance of causing either a fire or a breach."',
  },
  {
    id: "heavy2",
    note: 'Laser (Weapons), "Types of lasers": "the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance." fire and breach store 0.3 each; the roll order is not a field.',
  },
  {
    id: "heavy2",
    note: 'Laser (Weapons), "Heavy Laser Mark II": "Moderate-low chance to stun crew". No stun percent is published. WeaponDef has no stun field.',
  },
  {
    id: "hullsmash",
    note: 'Laser (Weapons), "Hull Smasher Laser": "Damage per shot: 1 (to system rooms) or 2 (to systemless rooms)". damage stores the system-room 1. Systemless rooms take 2.',
  },
  {
    id: "hullsmash2",
    note: 'Laser (Weapons), "Hull Smasher Laser Mark II": "Damage per shot: 1 (to system rooms) or 2 (to systemless rooms)". damage stores the system-room 1. Systemless rooms take 2.',
  },
  {
    id: "chainlaser",
    note: 'Laser (Weapons), "Chain Burst Laser": "Charge-up profile: 16s/13s/10s/7s (-3s per step, 3 steps total)". charge stores the first step, 16. Later steps are 13, 10, and 7. "Charge time resets to 16 seconds if the weapon goes offline". cited-chain.ts steps combat through that profile.',
  },
  {
    id: "vulcan",
    note: 'Laser (Weapons), "Chain Vulcan": "Charge-up profile: 11.1s / 9.1s / 7.1s / 5.1s / 3.1s / 1.1s (-2s per step, 5 steps total)". charge stores the first step, 11.1. Later steps are 9.1, 7.1, 5.1, 3.1, and 1.1. "Charge time resets to 11.1 seconds if the weapon goes offline". "It takes 35.5 seconds before the Vulcan gets up to full speed". cited-chain.ts steps combat through that profile.',
  },
  {
    id: "chargers",
    note: 'Laser (Weapons), "Laser Charger (S)": "Charge time: 5.5 seconds per shot, up to 2 shots". "Shots: 1-2". shots stores the full charge, 2. "Autofire" causes continuous fire, disables charging. "Weapon Pre-Igniter will only charge one shot by default".',
  },
  {
    id: "charger",
    note: 'Laser (Weapons), "Laser Charger": "Charge time: 6 seconds per shot, up to 2 shots". "Shots: 1-2". shots stores the full charge, 2. "Autofire" causes continuous fire, disables charging. "Weapon Pre-Igniter will only charge one shot by default".',
  },
  {
    id: "charger2",
    note: 'Laser (Weapons), "Laser Charger Mark II": "Charge time: 5 seconds per shot, up to 4 shots". "Shots: 1-4". shots stores the full charge, 4. "Autofire" causes continuous fire, disables charging. "Weapon Pre-Igniter will only charge one shot by default".',
  },
  {
    id: "bosslaser",
    // Laser (Weapons), "Boss Laser": no power requirement is stated.
    // BLOCKED: missing field is power. Do not invent a power or a single charge.
    // Charge is 25s / 20s / 15s / 10s by artillery level.
    note: 'BLOCKED: missing field: power. Laser (Weapons), "Boss Laser" states no power requirement, so no WeaponDef is emitted. Charge time 25s for level 1, 20s for level 2, 15s for level 3, 10s for level 4. Shots: 3. Damage per shot: 1. Artillery system with 4 system levels maximum. Only used by the Rebel Flagship in phase 1-3. Effect: low chance of fire or breach. The section gives no percent.',
  },
];
