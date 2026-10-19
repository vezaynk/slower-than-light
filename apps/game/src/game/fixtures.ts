/** Test setup shared across suites. Not a test file: test:src only runs `*.test.ts`. */
import { toggleWeapon } from "./sim.ts";
import type { Game } from "./types.ts";

/**
 * A run starts with the weapon system unpowered, as FTL does, so a test that fires needs its guns switched on.
 * Each gun takes its bars through the same path as a click, in slot order, while the reactor has them.
 */
export function powerGuns(g: Game): Game {
  for (const gun of g.player.weapons) if (!gun.enabled) toggleWeapon(g, gun.uid);
  return g;
}
