import type { WeaponDef } from "../content.ts";

/**
 * Missile rows other than Leto and the player Artemis.
 * Wiki page "Missile (Weapons)".
 * ===Leto Missiles=== and ===Artemis Missiles=== are not emitted.
 * ===Artemis Missiles (enemy)=== is power 2 and 10s, not power 1 and 11s, so it is artemisEnemy.
 * kind is "missile". That already ignores shields. No extra field.
 * Lead: "Missile weapons consume 1 missile ammunition each time they fire." ammo is true.
 * Swarm and Pegasus still spend 1 per volley. No section says otherwise.
 */
export const MISSILE_WEAPONS: WeaponDef[] = [
  {
    id: "artemisEnemy",
    name: "Artemis Missiles (enemy)",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===.
    // "Power requirement: 2 power". Player ===Artemis Missiles=== is 1 power.
    power: 2,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===.
    // "Charge time: 10 seconds". Player ===Artemis Missiles=== is 11 seconds.
    charge: 10,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===: "Shots: 1".
    shots: 1,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)=== gives no gap.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===: "Damage per shot: 2".
    damage: 2,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===: "low chance of fire". No percent is printed. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===: "low chance of fire or breach". No breach percent is printed. 0 means no number was published, not a measured zero chance.
    breach: 0,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)=== is silent on ammo. Lead: missiles consume 1 missile each time they fire.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)=== lists no purchase price. price 0. Player sells for 19; that sell value is not this row.
    price: 0,
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)=== has no italic quote.
    blurb: "",
  },
  {
    id: "hermes",
    name: "Hermes Missile",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "Power requirement: 3 power".
    power: 3,
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "Charge time: 14 seconds".
    charge: 14,
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "Shots: 1".
    shots: 1,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Hermes Missile=== gives no gap.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "Damage per shot: 3".
    damage: 3,
    // Wiki page "Missile (Weapons)", ===Hermes Missile=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)" lead: "Hermes, Pegasus, Breach, and Boss Missiles have the highest chance for fires (30%)".
    fire: 0.3,
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "moderate-low chance of breach". No breach percent is printed. 0 means no number was published, not a measured zero chance.
    breach: 0,
    // Wiki page "Missile (Weapons)", ===Hermes Missile=== is silent on ammo. Lead: missiles consume 1 missile each time they fire.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Hermes Missile===: "Purchase price: 45". Store rarity 2 is not a field.
    price: 45,
    blurb: "Standard but powerful missile.",
  },
  {
    id: "breachmissiles",
    name: "Breach Missiles",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Breach Missiles===: "Power requirement: 3 power".
    power: 3,
    // Wiki page "Missile (Weapons)", ===Breach Missiles===: "Charge time: 22 seconds".
    charge: 22,
    // Wiki page "Missile (Weapons)", ===Breach Missiles===: "Shots: 1".
    shots: 1,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Breach Missiles=== gives no gap.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Breach Missiles===: "Damage per shot: 4".
    damage: 4,
    // Wiki page "Missile (Weapons)", ===Breach Missiles=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)" lead: Breach Missiles are in the 30% fire group with Hermes, Pegasus, and Boss.
    fire: 0.3,
    // Wiki page "Missile (Weapons)" lead: "Hull and Breach Missiles have the highest breach chance (27% and 56% correspondingly)". Breach Missiles are 56%.
    breach: 0.56,
    // Wiki page "Missile (Weapons)", ===Breach Missiles=== is silent on ammo. Lead: missiles consume 1 missile each time they fire.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Breach Missiles===: "Purchase price: 65". Store rarity 3 is not a field.
    price: 65,
    blurb: "These missiles are designed to cause maximum destruction to ship hull armor.",
  },
  {
    id: "hullmissile",
    name: "Hull Missile",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "Power requirement: 2 power".
    power: 2,
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "Charge time: 17 seconds".
    charge: 17,
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "Shots: 1".
    shots: 1,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Hull Missile=== gives no gap.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "Damage per shot: 2 (to system rooms) or 4 (to systemless rooms)". damage is the system-room 2.
    damage: 2,
    // Wiki page "Missile (Weapons)", ===Hull Missile=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "low chance of fire". No fire percent is printed. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Wiki page "Missile (Weapons)" lead: "Hull and Breach Missiles have the highest breach chance (27% and 56% correspondingly)". Hull Missile is 27%.
    breach: 0.27,
    // Wiki page "Missile (Weapons)", ===Hull Missile=== is silent on ammo. Lead: missiles consume 1 missile each time they fire.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Hull Missile===: "Purchase price: 65". Store rarity 3 is not a field.
    price: 65,
    blurb: "High hull damage plus a decent breach chance.",
  },
  {
    id: "swarmmissiles",
    name: "Swarm Missiles",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Power requirement: 2 power".
    power: 2,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Charge time: 7 seconds per shot". charge is that per-shot time.
    charge: 7,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Shots: 1-3" and "up to three missiles".
    // shots is the bank. sim.ts stores one shot every 7 seconds. A click fires the bank.
    shots: 3,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Swarm Missiles=== gives no gap between the missiles.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Damage per shot: 1".
    damage: 1,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "low chance of fire". No fire percent is printed. 0 means no number was published, not a measured zero chance.
    fire: 0,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "low chance of fire or breach". No breach percent is printed. 0 means no number was published, not a measured zero chance.
    breach: 0,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Only consumes one missile per volley, with a maximum efficiency of 3 shots per missile".
    // That is still 1 missile when it fires, not a different cost. ammo stays true.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===: "Purchase price: 65". Store rarity 4. Advanced Edition. Neither is a field.
    price: 65,
    blurb: "If given time to prepare, the 'Swarm' launcher can replicate multiple warheads.",
  },
  {
    id: "pegasus",
    name: "Pegasus Missile",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Power requirement: 3 power".
    power: 3,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Charge time: 20 seconds".
    charge: 20,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Shots: 2".
    shots: 2,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Pegasus Missile=== gives no gap between the two projectiles.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Damage per shot: 2".
    damage: 2,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)" lead: Pegasus is in the 30% fire group with Hermes, Breach, and Boss.
    fire: 0.3,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "moderate-low chance of breach". No breach percent is printed. 0 means no number was published, not a measured zero chance.
    breach: 0,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Only consumes one missile per volley".
    // The lead's 1 missile per firing still holds. The section does not say the volley is free. ammo stays true.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===: "Purchase price: 60". Store rarity 3 is not a field.
    price: 60,
    blurb: "Creative missile design allows for two projectiles for the cost of one!",
  },
  {
    id: "bossmissile",
    name: "Boss Missile",
    kind: "missile",
    // Wiki page "Missile (Weapons)", ===Boss Missile===.
    // "Artillery system: with 4 system levels maximum." No "Power requirement" line. power is that 4.
    power: 4,
    // Wiki page "Missile (Weapons)", ===Boss Missile===: "28.75s for level 1, 23s for level 2, 17.25s for level 3, 11.5s for level 4".
    // charge is the level-1 base, 28.75. The other times are in MISSILE_GAPS.
    charge: 28.75,
    // Wiki page "Missile (Weapons)", ===Boss Missile===: "Fires 3 missile".
    shots: 3,
    // INFERRED: gap 0. Wiki page "Missile (Weapons)", ===Boss Missile=== gives no gap.
    gap: 0,
    // Wiki page "Missile (Weapons)", ===Boss Missile===: "at 1 damage".
    damage: 1,
    // Wiki page "Missile (Weapons)", ===Boss Missile=== does not state ion.
    ion: 0,
    // Wiki page "Missile (Weapons)" lead: Boss Missiles are in the 30% fire group with Hermes, Pegasus, and Breach.
    fire: 0.3,
    // Wiki page "Missile (Weapons)", ===Boss Missile===: "moderate-low chance of breach". No breach percent is printed. 0 means no number was published, not a measured zero chance.
    breach: 0,
    // Wiki page "Missile (Weapons)", ===Boss Missile=== is silent on ammo. Lead: missiles consume 1 missile each time they fire. The section does not say otherwise.
    ammo: true,
    // Wiki page "Missile (Weapons)", ===Boss Missile===: only the Rebel Flagship (and its shipyard prototype). No purchase price. price 0.
    price: 0,
    // Wiki page "Missile (Weapons)", ===Boss Missile=== has no italic quote.
    blurb: "",
  },
];

/**
 * Facts that do not fit WeaponDef.
 * Wiki page "Missile (Weapons)" and the === heading named on each note.
 */
export const MISSILE_GAPS = {
  artemisEnemy: {
    // Wiki page "Missile (Weapons)", ===Artemis Missiles (enemy)===.
    // Compared with ===Artemis Missiles===, which is not emitted.
    note: "Power 2 instead of 1. Charge 10 seconds instead of 11. Shots 1 and damage 2 match. No fire percent and no breach percent are printed on the enemy section. Player Artemis sells for 19; the enemy section lists no price.",
    playerPower: 1,
    playerCharge: 11,
    playerShots: 1,
    playerDamage: 2,
  },
  hullmissile: {
    // Wiki page "Missile (Weapons)", ===Hull Missile===.
    // "Damage per shot: 2 (to system rooms) or 4 (to systemless rooms)". damage stores 2.
    // sim.ts applies 4 as hull damage. Crew stay on the system-room 2.
    // INFERRED from Laser (Weapons), "Types of lasers": Hull Laser crew damage is not increased on a systemless room.
    systemlessDamage: 4,
    // "BUGGED: not considered a missile weapon for events." kind stays missile.
    countedAsMissileInEvents: false,
    // "Enemies never use this weapon".
    enemiesNeverUse: true,
  },
  swarmmissiles: {
    // Wiki page "Missile (Weapons)", ===Swarm Missiles===.
    // "Shots: 1-3". shots stores the bank, 3. "7 seconds per shot". The bank runs in sim.ts.
    minShots: 1,
    maxShots: 3,
    // "Targeting area radius: 31". swarm-aim.ts uses the printed room percents.
    // The radius is not resimulated as pixels. Other room shapes have no printed percent.
    radius: 31,
    // "When fired at 1x2 room: 67.85% in main room, 8.04% in each tile next to long sides."
    aim1x2MainPercent: 67.85,
    aim1x2LongSidePercent: 8.04,
    // "When fired at 2x2 room: 100% in main room."
    aim2x2MainPercent: 100,
    // "Only consumes one missile per volley, with a maximum efficiency of 3 shots per missile".
    oneMissilePerVolley: true,
    // "If the autofire setting is on, it will fire a charge as soon as it is gained".
    autofireFiresWhenCharged: true,
    // Lead: Swarm Missiles do not have the stun effect. "Enemies never use this weapon".
    noStun: true,
    enemiesNeverUse: true,
  },
  pegasus: {
    // Wiki page "Missile (Weapons)", ===Pegasus Missile===.
    // "Only consumes one missile per volley" while shots is 2. ammo stays true.
    oneMissilePerVolley: true,
    // "Enemies never use this weapon".
    enemiesNeverUse: true,
  },
  bossmissile: {
    // Wiki page "Missile (Weapons)", ===Boss Missile===.
    // charge stores level 1. The other printed times:
    chargeByLevel: { 1: 28.75, 2: 23, 3: 17.25, 4: 11.5 },
    // Lead: Boss Missiles do not have the stun effect.
    noStun: true,
  },
  breachmissiles: {
    // Wiki page "Missile (Weapons)", ===Breach Missiles===.
    // "Capable of killing a Zoltan, if the missile causes 2 fires and stuns the crew."
    note: "Capable of killing a Zoltan, if the missile causes 2 fires and stuns the crew.",
  },
  roll: {
    // Wiki page "Missile (Weapons)", lead, before the === headings.
    // "A missile can either start 1-2 fires or cause a hull breach: the fire chance is rolled first, and if it fails, the hull breach chance is rolled next".
    fireBeforeBreach: true,
    // "Low chance to stun" on Hermes, Breach, Hull, Pegasus, and enemy Artemis. No stun percent is printed. WeaponDef has no stun field.
    // A source comment says the stun lasts 3 seconds. That duration is not printed, so it is not stored.
    stunPercentPrinted: false,
  },
} as const;
