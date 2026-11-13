import type { FactionSurrender, Stalemate } from "@stl/pack";
import { flagshipBlueprintId, type FlagshipDifficulty } from "../flagship-layouts.ts";

/**
 * Enemy Ships, "Note (anti-stalemate mechanism)": "when the enemy ship is below a certain hull threshold (likely below
 * 50%, closer to 30-40%) and doesn't receive any more hull damage for 1 minute, the fight will end by granting you 2 fuel."
 * INFERRED: 40%, the top of the "closer to 30-40%" range. The minute is 60 seconds.
 *
 * The gap mod writes these as `<stalemate threshold seconds fuel>`.
 * Faction surrender chance and hull band stay on `<shipBlueprint>` › `<surrender>` (wiki/rewards.ts).
 * Rebel Elite and Flagship blueprints name `<surrender chance="0">` (`NO_SURRENDER_SHIPS`), so they never offer.
 * A later file can replace that row, or put `<surrender>` on the hull. Tier is not the rule.
 */
export const STALEMATE: Required<Stalemate> = { threshold: 40, seconds: 60, fuel: 2 };

const DIFFICULTIES = ["easy", "normal", "hard"] as const satisfies readonly FlagshipDifficulty[];
const STAGES = [1, 2, 3] as const;

function neverShip(id: string): FactionSurrender {
  return { id, chance: 0, min: 0, max: 0 };
}

/**
 * Layout-less gap rows. Chance 0 means the blueprint never offers. The plain `BOSS_*` ids are ftl.dat without
 * Advanced Edition. The `_DLC` ids are the ones the stand-in fights.
 */
export const NO_SURRENDER_SHIPS: FactionSurrender[] = [
  neverShip("REBEL_SKINNY_ELITE"),
  neverShip("ROCK_ASSAULT_ELITE"),
  ...STAGES.flatMap((stage) =>
    DIFFICULTIES.flatMap((difficulty) => {
      const dlc = flagshipBlueprintId(stage, difficulty);
      return [neverShip(dlc.replace(/_DLC$/, "")), neverShip(dlc)];
    }),
  ),
];
