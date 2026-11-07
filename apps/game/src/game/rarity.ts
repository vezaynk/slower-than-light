/**
 * FTL's rarity draws, read from the executable. The rarities themselves are archive data: each blueprint's
 * `<rarity>` and each sector's `<rarityList>`.
 */
import { allCrew, sectorDef, warnPack } from "@stl/pack";

/**
 * FTL GetRandomWeapon, GetRandomDrone, GetRandomAugment, and GetRandomCrew with count 1 (BlueprintManager::RandomItems).
 * Rarity 0 is excluded. Weight is `6 - rarity`. Ids are sorted, matching std::map order.
 */
export function weightedBlueprint(
  rows: readonly { id: string; rarity?: number }[],
  roll: () => number,
): string | undefined {
  const pool: { id: string; weight: number }[] = [];
  for (const row of rows) {
    if (row.rarity == null || row.rarity === 0) continue;
    const weight = 6 - row.rarity;
    if (weight <= 0) continue;
    pool.push({ id: row.id, weight });
  }
  pool.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let total = 0;
  for (const row of pool) total += row.weight;
  if (total <= 0) return undefined;
  let mark = roll() * total;
  for (const row of pool) {
    mark -= row.weight;
    if (mark < 0) return row.id;
  }
  return pool[pool.length - 1]?.id;
}

/** Crew blueprint ids, as `<crewCount class>` and `<rarityList>` name them, and the race name the game spawns. */
export const RACE_OF: Readonly<Record<string, string>> = {
  human: "Human",
  engi: "Engi",
  mantis: "Mantis",
  slug: "Slug",
  rock: "Rock",
  energy: "Zoltan",
  crystal: "Crystal",
  anaerobic: "Lanius",
  ghost: "Ghost",
};

/**
 * Each crew race's rarity while the player is in `sectorId`.
 * FTL StarMap::GenerateMap calls BlueprintManager::ResetRarities, which puts every blueprint back to its own
 * `<rarity>`, then SetRarity for each `<blueprint name rarity>` in the sector's `<rarityList>`. So a listed race takes
 * the sector's number and an unlisted one keeps its blueprint's. A sector the archive does not define sets nothing.
 */
export function sectorCrewRarities(sectorId: string | undefined): { id: string; rarity: number }[] {
  const set = new Map<string, number>();
  for (const row of sectorDef(sectorId)?.rarities ?? []) set.set(row.id, row.rarity);
  return allCrew().map((race) => ({ id: race.id, rarity: set.get(race.id) ?? race.rarity ?? 0 }));
}

/**
 * One crew race from the sector's rarities: FTL BlueprintManager::GetRandomCrew(1). ShipGenerator::GetPossibleCrewList
 * calls it once per seat of a `random` crewCount, and EventGenerator::CreateEvent once per crew reward that names no
 * race. Returns the game's race name.
 * A drawable race the game has no crew for is left out of the draw with a warning. Undefined when nothing is left.
 */
export function rollSectorRace(
  sectorId: string | undefined,
  roll: () => number,
): string | undefined {
  const rows = sectorCrewRarities(sectorId).filter((row) => {
    if (RACE_OF[row.id] || !row.rarity) return true;
    warnPack(
      `crewBlueprint ${row.id} has rarity ${row.rarity}, but the game has no crew of that race; it is not drawn.`,
    );
    return false;
  });
  const id = weightedBlueprint(rows, roll);
  return id ? RACE_OF[id] : undefined;
}
