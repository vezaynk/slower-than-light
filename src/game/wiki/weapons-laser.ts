import { tx } from "../../i18n/index.ts";
import type { WeaponDef } from "../content.ts";

/**
 * Laser (Weapons). Rows not already fitted.
 * Omitted: Basic Laser, Dual Lasers, Burst Laser Mark II, Heavy Laser Mark I.
 * Boss Laser is not in this list. flagship-weapons.ts stores power 4 as the artillery maximum.
 * INFERRED: that 4 is not a Weapons-pool cost. The section states no power requirement.
 * kind is "laser". ammo is false: no section lists a missile cost.
 * ion is 0: no section states ion.
 */

export const LASER_WEAPONS: WeaponDef[] = [
  {
    id: "burst1",
    name: tx("wiki.weapons-laser.burst-laser-mark-i"),
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
    blurb: tx("wiki.weapons-laser.this-simple-burst-laser-isn-t"),
  },
  {
    id: "burst3",
    name: tx("wiki.weapons-laser.burst-laser-mark-iii"),
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
    blurb: tx("wiki.weapons-laser.powerful-burst-laser-that-fires-off"),
  },
  {
    id: "heavypierce",
    name: tx("wiki.weapons-laser.heavy-pierce-laser-mark-i"),
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
      tx("wiki.weapons-laser.heavy-lasers-can-wreak-more-havoc"),
  },
  {
    id: "heavy2",
    name: tx("wiki.weapons-laser.heavy-laser-mark-ii"),
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
    blurb: tx("wiki.weapons-laser.this-heavy-laser-fires-two-shots"),
  },
  {
    id: "hullsmash",
    name: tx("wiki.weapons-laser.hull-smasher-laser"),
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
    blurb: tx("wiki.weapons-laser.a-powerful-laser-designed-to-maximize"),
  },
  {
    id: "hullsmash2",
    name: tx("wiki.weapons-laser.hull-smasher-laser-mark-ii"),
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
    blurb: tx("wiki.weapons-laser.this-powerful-counterpart-to-the-hull"),
  },
  {
    id: "chainlaser",
    name: tx("wiki.weapons-laser.chain-burst-laser"),
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
      tx("wiki.weapons-laser.this-dual-shot-laser-decreases-in"),
  },
  {
    id: "vulcan",
    name: tx("wiki.weapons-laser.chain-vulcan"),
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
      tx("wiki.weapons-laser.this-laser-weapon-takes-a-long"),
  },
  {
    id: "chargers",
    name: tx("wiki.weapons-laser.laser-charger-s"),
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
      tx("wiki.weapons-laser.this-laser-weapon-can-charge-two"),
  },
  {
    id: "charger",
    name: tx("wiki.weapons-laser.laser-charger"),
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
    blurb: tx("wiki.weapons-laser.this-laser-weapon-can-charge-two-2"),
  },
  {
    id: "charger2",
    name: tx("wiki.weapons-laser.laser-charger-mark-ii"),
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
    blurb: tx("wiki.weapons-laser.this-laser-weapon-can-charge-multiple"),
  },
];

export const LASER_GAPS: { id: string; note: string }[] = [
  {
    id: "heavypierce",
    note: tx("wiki.weapons-laser.laser-weapons-heavy-pierce-laser-mark"),
  },
  {
    id: "heavypierce",
    note: 'Laser (Weapons), "Types of lasers": "the 30% fire chance is rolled first, then (if no fires started) the 30% breach chance." fire and breach store 0.3 each; the roll order is not a field. "51% chance of causing either a fire or a breach."',
  },
  {
    id: "heavy2",
    note: tx("wiki.weapons-laser.laser-weapons-types-of-lasers-the"),
  },
  {
    id: "heavy2",
    note: tx("wiki.weapons-laser.laser-weapons-heavy-laser-mark-ii"),
  },
  {
    id: "hullsmash",
    note: tx("wiki.weapons-laser.laser-weapons-hull-smasher-laser-damage"),
  },
  {
    id: "hullsmash2",
    note: tx("wiki.weapons-laser.laser-weapons-hull-smasher-laser-mark"),
  },
  {
    id: "chainlaser",
    note: tx("wiki.weapons-laser.laser-weapons-chain-burst-laser-charge"),
  },
  {
    id: "vulcan",
    note: tx("wiki.weapons-laser.laser-weapons-chain-vulcan-charge-up"),
  },
  {
    id: "chargers",
    note: tx("wiki.weapons-laser.laser-weapons-laser-charger-s-charge"),
  },
  {
    id: "charger",
    note: tx("wiki.weapons-laser.laser-weapons-laser-charger-charge-time"),
  },
  {
    id: "charger2",
    note: tx("wiki.weapons-laser.laser-weapons-laser-charger-mark-ii"),
  },
  {
    id: "bosslaser",
    // Laser (Weapons), "Boss Laser": "Artillery system: with 4 system levels maximum". No power requirement.
    // INFERRED: that maximum is the WeaponDef power in flagship-weapons.ts, and it is not a Weapons-pool cost.
    note: tx("wiki.weapons-laser.inferred-the-artillery-maximum-is-4"),
  },
];
