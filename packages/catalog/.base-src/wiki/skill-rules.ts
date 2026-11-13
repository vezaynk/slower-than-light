import type { SkillSpeed } from "@stl/pack";

/**
 * Skills, "Repair skill": "Level 0 (White) | Default repair speed", "Level 1 (Green) | 10% faster repair",
 * "Level 2 (Gold) | 20% faster repair". Read as a rate multiplier, the same reading the page gives Shields.
 * Skills, "Combat skill": "Level 0 | Default crew damage", "Level 1 | 10% more crew damage", "Level 2 | 20% more
 * crew damage". Sabotage does not use this table.
 *
 * Gap `<skillSpeed>` also carries piloting and engines evasion (+5 / +7 / +10), shields recharge
 * (×1.1 / ×1.2 / ×1.3), and weapons charge time (×0.9 / ×0.85 / ×0.8).
 */
export const SKILL_SPEED: Required<SkillSpeed> = {
  repair0: 1,
  repair1: 1.1,
  repair2: 1.2,
  combat0: 1,
  combat1: 1.1,
  combat2: 1.2,
  pilot0: 5,
  pilot1: 7,
  pilot2: 10,
  engines0: 5,
  engines1: 7,
  engines2: 10,
  shields0: 1.1,
  shields1: 1.2,
  shields2: 1.3,
  weapons0: 0.9,
  weapons1: 0.85,
  weapons2: 0.8,
};
