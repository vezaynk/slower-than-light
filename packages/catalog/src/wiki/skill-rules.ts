import type { SkillSpeed } from "@stl/pack";

/**
 * Skills, "Repair skill": "Level 0 (White) | Default repair speed", "Level 1 (Green) | 10% faster repair",
 * "Level 2 (Gold) | 20% faster repair". Read as a rate multiplier, the same reading the page gives Shields.
 * Skills, "Combat skill": "Level 0 | Default crew damage", "Level 1 | 10% more crew damage", "Level 2 | 20% more
 * crew damage". Sabotage does not use this table.
 *
 * Gap `<skillSpeed repair0 repair1 repair2 combat0 combat1 combat2>`.
 */
export const SKILL_SPEED: Required<SkillSpeed> = {
  repair0: 1,
  repair1: 1.1,
  repair2: 1.2,
  combat0: 1,
  combat1: 1.1,
  combat2: 1.2,
};
