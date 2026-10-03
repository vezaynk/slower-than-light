import type { WeaponDef } from "../content.ts";

/**
 * Bomb rows other than Fire Bomb.
 * Wiki page "Bomb (Weapons)", "List of Bomb weapons".
 * Lead: "They cost missile ammunition to fire".
 * "Comparing bombs to missiles": "Both bombs and missile weapons use 1 missile ammunition every time they fire".
 * A section that does not restate a missile cost still sets ammo from that lead.
 * Lead: "They deal no hull damage". `damage` is the section's system damage, not hull.
 * Crew damage, stun, breach wording, and heals are in BOMB_GAPS.
 */
export const BOMB_WEAPONS: WeaponDef[] = [
  {
    id: "smallbomb",
    name: "Small Bomb",
    kind: "bomb",
    // Bomb (Weapons) "Small Bomb": power requirement 1. Charge time 13 seconds.
    power: 1,
    charge: 13,
    // Bomb (Weapons) "Small Bomb" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Small Bomb" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Small Bomb": system damage 2. Hull damage is 0 (see BOMB_GAPS).
    damage: 2,
    // Bomb (Weapons) "Small Bomb" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Small Bomb": "low chance of fire". No percent is printed, so fire is 0.
    fire: 0,
    // Bomb (Weapons) "Small Bomb" prints no breach chance. breach 0.
    breach: 0,
    // Bomb (Weapons) "Small Bomb" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Small Bomb": purchase price 45 (store rarity 1).
    price: 45,
    blurb:
      "Self-teleporting explosive that damages systems and crew but not the hull. Can target your own ship.",
  },
  {
    id: "breach1",
    name: "Breach Bomb Mark I",
    kind: "bomb",
    // Bomb (Weapons) "Breach Bomb Mark I": power requirement 1. Charge time 9 seconds.
    power: 1,
    charge: 9,
    // Bomb (Weapons) "Breach Bomb Mark I" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Breach Bomb Mark I" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Breach Bomb Mark I": system damage 1. Hull damage is 0 (see BOMB_GAPS).
    damage: 1,
    // Bomb (Weapons) "Breach Bomb Mark I" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Breach Bomb Mark I" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Breach Bomb Mark I": "guaranteed breach". breach 1.
    breach: 1,
    // Bomb (Weapons) "Breach Bomb Mark I" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Breach Bomb Mark I": sells for 25, "cannot be bought". price 0. Sell value is not the purchase price.
    price: 0,
    blurb:
      "Self-teleporting explosive designed to damage systems and causes a breach. Can target your own ship.",
  },
  {
    id: "breach2",
    name: "Breach Bomb Mark II",
    kind: "bomb",
    // Bomb (Weapons) "Breach Bomb Mark II": power requirement 2. Charge time 17 seconds.
    power: 2,
    charge: 17,
    // Bomb (Weapons) "Breach Bomb Mark II" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Breach Bomb Mark II" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Breach Bomb Mark II": system damage 3. Hull damage is 0 (see BOMB_GAPS).
    damage: 3,
    // Bomb (Weapons) "Breach Bomb Mark II" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Breach Bomb Mark II" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Breach Bomb Mark II": "guaranteed breach". breach 1.
    breach: 1,
    // Bomb (Weapons) "Breach Bomb Mark II" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Breach Bomb Mark II": purchase price 60 (store rarity 4).
    price: 60,
    blurb:
      "Slower than Mark 1 but breaches and does more damage to systems. Can target your own ship.",
  },
  {
    id: "ionbomb",
    name: "Ion Bomb",
    kind: "bomb",
    // Bomb (Weapons) "Ion Bomb": power requirement 1. Charge time 22 seconds.
    power: 1,
    charge: 22,
    // Bomb (Weapons) "Ion Bomb" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Ion Bomb" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Ion Bomb": system damage 0. Hull damage is 0 (see BOMB_GAPS).
    damage: 0,
    // Bomb (Weapons) "Ion Bomb": causes 4 ion damage.
    ion: 4,
    // Bomb (Weapons) "Ion Bomb" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Ion Bomb" prints no breach chance. breach 0.
    breach: 0,
    // Bomb (Weapons) "Ion Bomb" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Ion Bomb": purchase price 55 (store rarity 3).
    price: 55,
    blurb:
      "Self-teleporting explosive that uses ion damage to disable systems. Can target your own ship.",
  },
  {
    id: "stunbomb",
    name: "Stun Bomb",
    kind: "bomb",
    // Bomb (Weapons) "Stun Bomb": power requirement 1. Charge time 17 seconds.
    power: 1,
    charge: 17,
    // Bomb (Weapons) "Stun Bomb" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Stun Bomb" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Stun Bomb": system damage 0. Hull damage is 0 (see BOMB_GAPS).
    damage: 0,
    // Bomb (Weapons) "Stun Bomb": causes 1 ion damage.
    ion: 1,
    // Bomb (Weapons) "Stun Bomb" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Stun Bomb" prints no breach chance. breach 0.
    breach: 0,
    // Bomb (Weapons) "Stun Bomb" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Stun Bomb": purchase price 45 (store rarity 2, Advanced Edition).
    price: 45,
    blurb:
      "Self-teleporting explosive that does 1 ion damage and stuns all crew inside the room. Can target your own ship.",
  },
  {
    id: "healburst",
    name: "Healing Burst",
    kind: "bomb",
    // Bomb (Weapons) "Healing Burst": power requirement 1. Charge time 18 seconds.
    power: 1,
    charge: 18,
    // Bomb (Weapons) "Healing Burst" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Healing Burst" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Healing Burst": system damage 0. The 150-point heal is not damage (see BOMB_GAPS).
    damage: 0,
    // Bomb (Weapons) "Healing Burst" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Healing Burst" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Healing Burst" prints no breach chance. breach 0.
    breach: 0,
    // Bomb (Weapons) "Healing Burst" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Healing Burst": purchase price 40 (store rarity 3).
    price: 40,
    blurb:
      "Self-teleporting healing unit that instantly heals all friendly crew in the room. Can target your own ship.",
  },
  {
    id: "repairburst",
    name: "Repair Burst",
    kind: "bomb",
    // Bomb (Weapons) "Repair Burst": power requirement 1. Charge time 14 seconds.
    power: 1,
    charge: 14,
    // Bomb (Weapons) "Repair Burst" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Repair Burst" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Repair Burst": system damage 0. The 8-bar repair is not damage (see BOMB_GAPS).
    damage: 0,
    // Bomb (Weapons) "Repair Burst" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Repair Burst" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Repair Burst" prints no breach chance. It does not seal breaches. breach 0.
    breach: 0,
    // Bomb (Weapons) "Repair Burst" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Repair Burst": purchase price 40 (store rarity 3, Advanced Edition).
    price: 40,
    blurb:
      "Self-teleporting unit that floods a room with nano-bots capable of completely repairing all system damage.",
  },
  {
    id: "lockdown",
    name: "Crystal Lockdown Bomb",
    kind: "bomb",
    // Bomb (Weapons) "Crystal Lockdown Bomb": power requirement 1. Charge time 15 seconds.
    power: 1,
    charge: 15,
    // Bomb (Weapons) "Crystal Lockdown Bomb" gives no shot count. shots 1.
    shots: 1,
    // INFERRED: Bomb (Weapons) "Crystal Lockdown Bomb" does not state a gap. gap 0.
    gap: 0,
    // Bomb (Weapons) "Crystal Lockdown Bomb": system damage 0. Hull damage is 0 (see BOMB_GAPS).
    damage: 0,
    // Bomb (Weapons) "Crystal Lockdown Bomb" gives no ion amount. ion 0.
    ion: 0,
    // Bomb (Weapons) "Crystal Lockdown Bomb" prints no fire percent. fire 0.
    fire: 0,
    // Bomb (Weapons) "Crystal Lockdown Bomb" prints no breach chance. breach 0.
    breach: 0,
    // Bomb (Weapons) "Crystal Lockdown Bomb" is silent on ammo. Lead: they cost missile ammunition to fire. "Comparing bombs to missiles": 1 missile every time they fire.
    ammo: true,
    // Bomb (Weapons) "Crystal Lockdown Bomb": purchase price 45. Rarity is not one number (0*, with a sector tooltip).
    price: 45,
    blurb:
      "Self-teleporting explosive that does no damage but creates a dense wall preventing movement in or out of the room. Can target your own ship.",
  },
];

/**
 * Published effects WeaponDef cannot store.
 * Each note: wiki hull damage is 0, and `damage` is system damage.
 * Wiki page "Bomb (Weapons)" and the matching === heading.
 */
export const BOMB_GAPS: Record<string, string> = {
  // Bomb (Weapons) "Small Bomb": crew damage 30. Effect: low chance of fire (no percent). No stun number. No breach percent.
  smallbomb:
    "Hull damage is 0. damage is system damage 2, not hull. Crew damage 30. No stun duration is printed. No breach guarantee and no breach percent. Effect: low chance of fire, no percent.",
  // Bomb (Weapons) "Breach Bomb Mark I": crew damage 30. Effect: guaranteed breach. Sells for 25; cannot be bought.
  breach1:
    "Hull damage is 0. damage is system damage 1, not hull. Crew damage 30. Effect: guaranteed breach. Sells for 25. Cannot be bought, so price is 0. No stun number. No fire percent.",
  // Bomb (Weapons) "Breach Bomb Mark II": crew damage 45. Effect: guaranteed breach.
  breach2:
    "Hull damage is 0. damage is system damage 3, not hull. Crew damage 45. Effect: guaranteed breach. No stun number. No fire percent.",
  // Bomb (Weapons) "Ion Bomb": crew damage 0. Effect: low chance to stun (Advanced Edition), no duration. Lead: Ion Bombs deal double damage to Zoltan Shields.
  ionbomb:
    "Hull damage is 0. damage is system damage 0, not hull. Crew damage 0. Ion damage 4 is WeaponDef.ion. Effect: low chance to stun crew, no stun duration printed. No fire percent. No breach percent. Lead: Ion Bombs deal double damage to Zoltan Shields.",
  // Bomb (Weapons) "Stun Bomb": crew damage 0. Effect: stun 15 seconds. Lead: Stun Bombs deal double damage to Zoltan Shields.
  stunbomb:
    "Hull damage is 0. damage is system damage 0, not hull. Crew damage 0. Ion damage 1 is WeaponDef.ion. Effect: stuns all enemy and player crew and drones in the room for 15 seconds. No fire percent. No breach percent. Lead: Stun Bombs deal double damage to Zoltan Shields.",
  // Bomb (Weapons) "Healing Burst": heals 150. Not stored as damage. Lead: Healing Burst has no effect on Zoltan Shields.
  healburst:
    "Hull damage is 0. damage is system damage 0, not hull. Crew damage 0. Heals personnel for 150 points (not stored as damage). Also heals mind-controlled crew, enemy or your own. No stun number. No fire percent. No breach percent. Lead: Healing Burst has no effect on Zoltan Shields.",
  // Bomb (Weapons) "Repair Burst": repairs 8 bars. Not stored as damage. Does not put out fires or seal hull breaches.
  repairburst:
    "Hull damage is 0. damage is system damage 0, not hull. Crew damage 0. Repairs 8 bars of system damage (not stored as damage). Does not put out fires or seal hull breaches. No stun number. No fire percent. No breach percent. Lead: Repair Burst has no effect on Zoltan Shields.",
  // Bomb (Weapons) "Crystal Lockdown Bomb": lockdown 12 seconds. Broken by 4-5 crew. Resets door health.
  lockdown:
    "Hull damage is 0. damage is system damage 0, not hull. Crew damage 0. Room lockdown lasts 12 seconds. Lockdown resets door health. Lockdown can be broken by 4-5 crew. No stun number. No fire percent. No breach percent. Lead: Lockdown Bombs have no effect on Zoltan Shields.",
};
