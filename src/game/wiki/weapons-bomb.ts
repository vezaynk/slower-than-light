import { tx } from "../../i18n/index.ts";
import type { WeaponDef } from "../content.ts";

/**
 * Bomb rows other than Fire Bomb.
 * Wiki page "Bomb (Weapons)", "List of Bomb weapons".
 * Lead: "They cost missile ammunition to fire".
 * "Comparing bombs to missiles": "Both bombs and missile weapons use 1 missile ammunition every time they fire".
 * A section that does not restate a missile cost still sets ammo from that lead.
 * Lead: "They deal no hull damage". `damage` is the section's system damage, not hull.
 * Each section's "Crew damage" number is BOMB_CREW. WeaponDef has no crew-damage field.
 * Stun, breach wording, heals, and repairs stay in BOMB_GAPS.
 */
export const BOMB_WEAPONS: WeaponDef[] = [
  {
    id: "smallbomb",
    name: tx("wiki.weapons-bomb.small-bomb"),
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
      tx("wiki.weapons-bomb.self-teleporting-explosive-that-damages-systems"),
  },
  {
    id: "breach1",
    name: tx("wiki.weapons-bomb.breach-bomb-mark-i"),
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
      tx("wiki.weapons-bomb.self-teleporting-explosive-designed-to-damage"),
  },
  {
    id: "breach2",
    name: tx("wiki.weapons-bomb.breach-bomb-mark-ii"),
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
      tx("wiki.weapons-bomb.slower-than-mark-1-but-breaches"),
  },
  {
    id: "ionbomb",
    name: tx("wiki.weapons-bomb.ion-bomb"),
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
      tx("wiki.weapons-bomb.self-teleporting-explosive-that-uses-ion"),
  },
  {
    id: "stunbomb",
    name: tx("wiki.weapons-bomb.stun-bomb"),
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
      tx("wiki.weapons-bomb.self-teleporting-explosive-that-does-1"),
  },
  {
    id: "healburst",
    name: tx("wiki.weapons-bomb.healing-burst"),
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
      tx("wiki.weapons-bomb.self-teleporting-healing-unit-that-instantly"),
  },
  {
    id: "repairburst",
    name: tx("wiki.weapons-bomb.repair-burst"),
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
      tx("wiki.weapons-bomb.self-teleporting-unit-that-floods-a"),
  },
  {
    id: "lockdown",
    name: tx("wiki.weapons-bomb.crystal-lockdown-bomb"),
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
      tx("wiki.weapons-bomb.self-teleporting-explosive-that-does-no"),
  },
];

/**
 * "Crew damage" numbers from Bomb (Weapons), one per section.
 * Fire Bomb is not a row above. ordnance.ts fits it as cask.
 * Healing Burst's 150 and Repair Burst's 8 bars are not crew-damage numbers.
 */
export const BOMB_CREW: Record<string, number> = {
  // Bomb (Weapons) "Small Bomb": Crew damage: 30.
  smallbomb: 30,
  // Bomb (Weapons) "Breach Bomb Mark I": Crew damage: 30.
  breach1: 30,
  // Bomb (Weapons) "Breach Bomb Mark II": Crew damage: 45.
  breach2: 45,
  // Bomb (Weapons) "Fire Bomb": Crew damage: 30. Fitted id is cask.
  cask: 30,
  // Bomb (Weapons) "Ion Bomb": Crew damage: 0.
  ionbomb: 0,
  // Bomb (Weapons) "Stun Bomb": Crew damage: 0.
  stunbomb: 0,
  // Bomb (Weapons) "Healing Burst": Crew damage: 0. The 150-point heal is BOMB_GAPS, not this number.
  healburst: 0,
  // Bomb (Weapons) "Repair Burst": Crew damage: 0. The 8-bar repair is BOMB_GAPS, not this number.
  repairburst: 0,
  // Bomb (Weapons) "Crystal Lockdown Bomb": Crew damage: 0.
  lockdown: 0,
};

/**
 * Published effects WeaponDef cannot store.
 * Each note: wiki hull damage is 0, and `damage` is system damage.
 * Wiki page "Bomb (Weapons)" and the matching === heading.
 */
export const BOMB_GAPS: Record<string, string> = {
  // Bomb (Weapons) "Small Bomb": crew damage 30. Effect: low chance of fire (no percent). No stun number. No breach percent.
  smallbomb:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is"),
  // Bomb (Weapons) "Breach Bomb Mark I": crew damage 30. Effect: guaranteed breach. Sells for 25; cannot be bought.
  breach1:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-2"),
  // Bomb (Weapons) "Breach Bomb Mark II": crew damage 45. Effect: guaranteed breach.
  breach2:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-3"),
  // Bomb (Weapons) "Ion Bomb": crew damage 0. Effect: low chance to stun (Advanced Edition), no duration. Lead: Ion Bombs deal double damage to Zoltan Shields.
  ionbomb:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-4"),
  // Bomb (Weapons) "Stun Bomb": crew damage 0. Effect: stun 15 seconds. Lead: Stun Bombs deal double damage to Zoltan Shields.
  stunbomb:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-5"),
  // Bomb (Weapons) "Healing Burst": heals 150. Not stored as damage. Lead: Healing Burst has no effect on Zoltan Shields.
  healburst:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-6"),
  // Bomb (Weapons) "Repair Burst": repairs 8 bars. Not stored as damage. Does not put out fires or seal hull breaches.
  repairburst:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-7"),
  // Bomb (Weapons) "Crystal Lockdown Bomb": lockdown 12 seconds. Broken by 4-5 crew. Resets door health.
  lockdown:
    tx("wiki.weapons-bomb.hull-damage-is-0-damage-is-8"),
};
