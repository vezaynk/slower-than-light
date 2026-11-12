import type { AchievementRules } from "@stl/pack";

/**
 * Thresholds FTL's executable hard-codes. The gap writes them as `<achievementRules>`.
 * Full Arsenal is 11 systems. "Givin' her all she's got" is 29 powered bars.
 * Stealth's clean run is sector 8. Diplomatic Immunity is 4 crew-blue events by sector 5.
 * Lanius oxygen breaks above a net of 20. Engines-full is level 8. A beam slices rooms inside 5 seconds.
 */
export const ACHIEVEMENT_RULES: Required<AchievementRules> = {
  systems: 11,
  power: 29,
  stealthSector: 8,
  blueEvents: 4,
  blueSector: 5,
  oxygen: 20,
  engines: 8,
  beamSeconds: 5,
};
