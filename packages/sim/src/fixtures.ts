/** Test setup shared across suites. Not a test file: test:src only runs `*.test.ts`. */
import { allSectors } from "@stl/pack";
import { toggleWeapon } from "./sim.ts";
import type { Game } from "./types.ts";

/**
 * A run starts with the weapon system unpowered, as FTL does, so a test that fires needs its guns switched on.
 * Each gun takes its bars through the same path as a click, in slot order, while the reactor has them.
 */
/** The ftl.dat sector id for a loaded sector's name ("Engi Homeworlds" is ENGI_HOME). Unknown names stay as given. */
export function sectorIdNamed(name: string): string {
  return allSectors().find((row) => row.name === name)?.id ?? name;
}

/** Puts a run in a sector by its ftl.dat id or its name, as a sector change would (sim.ts enterSector). */
export function placeIn(g: Game, sector: string): void {
  const row = allSectors().find((r) => r.id === sector || r.name === sector);
  g.sectorId = row?.id ?? sector;
  g.sectorName = row?.name ?? sector;
}

export function powerGuns(g: Game): Game {
  for (const gun of g.player.weapons) if (!gun.enabled) toggleWeapon(g, gun.uid);
  return g;
}
