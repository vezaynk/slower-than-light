import type { Game } from "../types.ts";

/**
 * Ancient device: "only the Crystal Crew from the Stasis Pod (Ruwen) will mark the entry
 * beacon as a quest in the Rock Homeworlds sector."
 * "This event usually occurs at a normal beacon but will turn into a quest beacon if you
 * have the Crystal Crew from the Stasis Pod (Ruwen)."
 * The Ancient device card still opens. This id only paints the QUEST tag.
 * INVENTED: the page does not name a quest id.
 */
export const RUWEN_ENTRY = "ruwen-entry";

/** Marks the Ancient device beacon when a living Crystal named Ruwen is aboard. */
export function markRuwenEntry(g: Game): void {
  if (g.sectorName !== "Rock Homeworlds") return;
  // INFERRED: a dead Ruwen does not count as having that crew. The page prints no health check.
  const alive = g.crew.some((c) => c.side === "player" && c.kin === "shard" && c.name === "Ruwen" && c.hp > 0);
  if (!alive) return;
  for (const b of g.beacons) {
    if (b.flag !== "cited:ancient-device" || b.resolved) continue;
    if (b.quest && b.quest !== RUWEN_ENTRY) continue;
    b.quest = RUWEN_ENTRY;
  }
}
