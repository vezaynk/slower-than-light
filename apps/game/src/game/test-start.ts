import { choose, createGame } from "./sim.ts";
import type { Game } from "./types.ts";

/**
 * A new game past its sector start card. A sector opens its start event (`<startEvent>`, else `<beaconEvents>`),
 * as FTL's START_BEACON does. Tests that begin on the map close that card first.
 */
export function startedGame(...args: Parameters<typeof createGame>): Game {
  const g = createGame(...args);
  closeStartCard(g);
  return g;
}

/** Presses the start card's first button when the card is open. */
export function closeStartCard(g: Game): void {
  const first = g.phase === "event" ? g.event?.choices[0] : undefined;
  if (first) choose(g, first.id);
}
