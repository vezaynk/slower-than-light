/**
 * Read-only views for the combat UI (GameApp, CombatFx). Nothing here mutates the game.
 */
import { enemyHackView } from "./extras/spike.ts";
import type { Crew, Game, KitId } from "./types.ts";

/**
 * Player cloning queue, head first. Wiki page "Clone Bay", "Overview": "Portraits of the crew in the cloning queue are
 * shown above the system icon. Up to 3 portraits are shown; if the crew quantity in the cloning queue exceeds 3, then
 * only 2 portraits will be shown as the 3rd portrait is substituted by the "+number" of other crew in the queue."
 * "whatever crew dies earlier is the first one to be in the beginning of the cloning queue" (lowest cloneSeq first).
 */
export function playerCloneQueue(g: Game): {
  shown: Crew[];
  more: number;
  seconds: number;
  count: number;
} | null {
  const queued = g.crew
    .filter((c) => c.side === "player" && c.hp <= 0 && (c.cloneIn ?? 0) > 0)
    .sort((a, b) => (a.cloneSeq ?? 0) - (b.cloneSeq ?? 0));
  if (!queued.length) return null;
  const shown = queued.length > 3 ? queued.slice(0, 2) : queued;
  return { shown, more: queued.length - shown.length, seconds: Math.ceil(queued[0].cloneIn ?? 0), count: queued.length };
}

/**
 * The player kit the enemy hacking drone is on, when that kit has no room on the player ship (enemyHackView room null).
 * Hacking wiki: "Launches a hacking drone that attaches to the enemy ship." Null while it has not latched yet.
 */
export function hackedPlayerKit(g: Game): { id: KitId; phase: "latched" | "pulse" } | null {
  const view = enemyHackView(g);
  if (!view || view.room || view.phase === "flying") return null;
  if (!g.player.kits[view.target as KitId]) return null;
  return { id: view.target as KitId, phase: view.phase };
}
