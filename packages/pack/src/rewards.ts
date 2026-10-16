import type { EventTier, RewardLevel, RewardTable } from "./types.ts";

const LEVELS: Record<EventTier, RewardLevel> = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
};

export type RewardDifficulty = "easy" | "normal" | "hard";

/**
 * Inclusive scrap band for a difficulty, sector, and tier.
 * scale = baseAmount + max(0, (sector - 1) + difficultyAmount) * sectorAmount.
 * The ends are floor(min / 1000 * scale) and floor(max / 1000 * scale).
 * This does not roll.
 */
export function scrapBounds(
  table: RewardTable,
  difficulty: RewardDifficulty,
  sector: number,
  tier: EventTier,
): [number, number] {
  const scaling = scalingFor(table, difficulty);
  const band = resourceFor(table, "scrap", LEVELS[tier]);
  const world = Math.min(7, Math.max(0, sector - 1));
  const scale = scaling.baseAmount + Math.max(0, world + scaling.difficultyAmount) * scaling.sectorAmount;
  return [Math.floor((band.min / 1000) * scale), Math.floor((band.max / 1000) * scale)];
}

/** Absolute fuel, missile, or drone-part band. A fixed band still has equal ends. */
export function resourceBounds(
  table: RewardTable,
  kind: "fuel" | "missiles" | "parts",
  tier: EventTier,
): [number, number] {
  const band = resourceFor(table, kind === "parts" ? "droneparts" : kind, LEVELS[tier]);
  return [band.min, band.max];
}

/** chance / roll for a named reward. Absent when that reward has no bonus. */
export function bonusChance(table: RewardTable, name: string): number | undefined {
  const reward = table.rewards.find((row) => row.name === name);
  if (!reward?.bonus || reward.bonus.roll === 0) return undefined;
  return reward.bonus.chance / reward.bonus.roll;
}

function scalingFor(table: RewardTable, difficulty: RewardDifficulty) {
  const wanted = difficulty === "easy" ? 0 : difficulty === "hard" ? 2 : undefined;
  const found = table.scaling.find((row) => row.difficulty === wanted);
  if (!found) throw new Error(`reward table has no ${difficulty} scrap scaling`);
  return found;
}

function resourceFor(table: RewardTable, kind: "scrap" | "fuel" | "missiles" | "droneparts", level: RewardLevel) {
  const found = table.resources.find((row) => row.kind === kind && row.level === level);
  if (!found) throw new Error(`reward table has no ${kind} ${level}`);
  return found;
}
