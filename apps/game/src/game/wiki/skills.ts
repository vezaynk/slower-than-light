/**
 * Crew skill speed tables. RULE: FTL keeps these multipliers in its executable, not in the archive. They stay as code
 * until step 5 of wiki/README.md moves the numbers to the campaign gap mod.
 * Pirate and random crew races are not here: they come from the archive's rarities (game/rarity.ts).
 */

/**
 * Wiki "Skills", "Repair skill" table: "Level 0 (White) | Default repair speed", "Level 1 (Green) | 10% faster
 * repair", "Level 2 (Gold) | 20% faster repair" (Skills table: Repair "- | 10 | 20 | % faster repair").
 * Read as a rate multiplier (the same reading the page gives Shields: "The bonus is an increase to recharge rate").
 * INFERRED: "faster repair" is a rate increase (×1.1, ×1.2), not a time cut; the Repair section does not say which.
 * Template:Crew races (comparison), fire-fighting note: "crewRepairMult * crewFireMult * repairSkillMult * 8", and
 * Skills: "Repair skill and racial aptitude for repairs also apply to fire-fighting." So this is repairSkillMult.
 */
export const REPAIR_SKILL_MULT = [1, 1.1, 1.2] as const;

export function repairSkillMult(rank: 0 | 1 | 2): number {
  return REPAIR_SKILL_MULT[rank] ?? 1;
}

/**
 * Wiki page "Crew skills", section "Combat skill": "Level 0 (White) | Default crew damage",
 * "Level 1 (Green) | 10% more crew damage", "Level 2 (Gold) | 20% more crew damage".
 * "The combat skill works as a multiplier when calculating the hand-to-hand damage" to crew and onboard drones.
 * "doesn't increase the sabotage damage to (sub-)systems", so sabotage does not read this.
 */
export const COMBAT_SKILL_MULT = [1, 1.1, 1.2] as const;

export function combatSkillMult(rank: 0 | 1 | 2): number {
  return COMBAT_SKILL_MULT[rank] ?? 1;
}
