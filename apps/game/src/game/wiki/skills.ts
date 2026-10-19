/**
 * Crew skill speed tables and the per-sector crew race lists used for pirate crews.
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

/**
 * Wiki "Sectors", each sector's "Crewmembers" paragraph: "In this sector, crewmembers of the following races can be
 * purchased or received as a crew kill reward. By rarity (only affects the store assortment probability), from common
 * to rare". Race names as enemy-gen.ts spells them ("Rockmen" -> "Rock").
 * Hidden Crystal Worlds: "only Crystal crewmembers can be purchased or received as a crew kill reward."
 */
export const SECTOR_CREW_RACES: Record<string, string[]> = {
  STANDARD_SPACE: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
  CIVILIAN_SECTOR: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
  ENGI_SECTOR: ["Engi", "Human", "Zoltan"],
  ENGI_HOME: ["Engi", "Human", "Zoltan"],
  ZOLTAN_SECTOR: ["Zoltan", "Human", "Engi", "Mantis", "Rock", "Slug"],
  ZOLTAN_HOME: ["Zoltan", "Human", "Engi", "Mantis", "Rock", "Slug"],
  LANIUS_SECTOR: ["Lanius", "Human", "Engi", "Mantis", "Rock", "Zoltan", "Slug"],
  MANTIS_SECTOR: ["Mantis", "Human", "Engi", "Rock"],
  MANTIS_HOME: ["Mantis", "Human", "Engi", "Rock"],
  PIRATE_SECTOR: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
  REBEL_SECTOR: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
  REBEL_SECTOR_MINIBOSS: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
  ROCK_SECTOR: ["Rock", "Human", "Zoltan"],
  ROCK_HOME: ["Rock", "Human", "Zoltan"],
  SLUG_SECTOR: ["Slug", "Human", "Engi", "Mantis", "Zoltan", "Rock"],
  SLUG_HOME: ["Slug", "Human", "Engi", "Mantis", "Zoltan", "Rock"],
  NEBULA_SECTOR: ["Human", "Slug", "Engi", "Mantis", "Zoltan", "Rock"],
  CRYSTAL_HOME: ["Crystal"],
  FINAL: ["Human", "Engi", "Mantis", "Rock", "Zoltan"],
};

/** Every race enemy-gen.ts can crew a ship with; the fallback where a sector has no list. */
export const ALL_CREW_RACES = [
  "Human",
  "Engi",
  "Mantis",
  "Slug",
  "Rock",
  "Zoltan",
  "Crystal",
  "Lanius",
];

/**
 * Enemy Ships, "Pirated ships": "Typically pirate crews are randomly chosen from the races that can be encountered in
 * that sector, but a few events specify the crew instead." The race list is the sector's Sectors "Crewmembers" list.
 * INFERRED: each crew member is an even pick from that list (the printed rarity "only affects the store assortment
 * probability"). INFERRED: a sector name with no list (e.g. the invented content.ts SECTOR_NAMES) draws from every race.
 */
export function pirateCrewRaces(sectorId: string): string[] {
  return SECTOR_CREW_RACES[sectorId] ?? ALL_CREW_RACES;
}

export function rollPirateCrew(sectorId: string, count: number, rand: () => number): string[] {
  const list = pirateCrewRaces(sectorId);
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(list[Math.floor(rand() * list.length) % list.length]);
  return out;
}
