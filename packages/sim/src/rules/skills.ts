/**
 * Crew skill speed tables.
 * Wiki "Skills", "Repair skill": "Level 0 (White) | Default repair speed", "Level 1 (Green) | 10% faster
 * repair", "Level 2 (Gold) | 20% faster repair" (Skills table: Repair "- | 10 | 20 | % faster repair").
 * Read as a rate multiplier (the same reading the page gives Shields: "The bonus is an increase to recharge rate").
 * INFERRED: "faster repair" is a rate increase (×1.1, ×1.2), not a time cut; the Repair section does not say which.
 * Template:Crew races (comparison), fire-fighting note: "crewRepairMult * crewFireMult * repairSkillMult * 8", and
 * Skills: "Repair skill and racial aptitude for repairs also apply to fire-fighting." So this is repairSkillMult.
 *
 * Wiki page "Crew skills", section "Combat skill": "Level 0 (White) | Default crew damage",
 * "Level 1 (Green) | 10% more crew damage", "Level 2 (Gold) | 20% more crew damage".
 * "The combat skill works as a multiplier when calculating the hand-to-hand damage" to crew and onboard drones.
 * "doesn't increase the sabotage damage to (sub-)systems", so sabotage does not read this.
 *
 * The numbers are gap `<skillSpeed>`. Pirate and random crew races are not here (game/rarity.ts).
 */
import { skillMult } from "@stl/pack";

export function repairSkillMult(rank: 0 | 1 | 2): number {
  return skillMult("repair", rank);
}

export function combatSkillMult(rank: 0 | 1 | 2): number {
  return skillMult("combat", rank);
}

/** Piloting, manning: +5 / +7 / +10 evasion. Gap `<skillSpeed pilot0 pilot1 pilot2>`. */
export function pilotEvasion(rank: 0 | 1 | 2): number {
  return skillMult("pilot", rank);
}

/** Engines, manning: the same +5 / +7 / +10. Gap `<skillSpeed engines0 engines1 engines2>`. */
export function enginesEvasion(rank: 0 | 1 | 2): number {
  return skillMult("engines", rank);
}

/** Shields, manning: recharge rate ×1.1 / ×1.2 / ×1.3. Gap `<skillSpeed shields0 shields1 shields2>`. */
export function shieldsRecharge(rank: 0 | 1 | 2): number {
  return skillMult("shields", rank);
}

/** Weapons, manning: charge time ×0.9 / ×0.85 / ×0.8. Gap `<skillSpeed weapons0 weapons1 weapons2>`. */
export function weaponsCharge(rank: 0 | 1 | 2): number {
  return skillMult("weapons", rank);
}
