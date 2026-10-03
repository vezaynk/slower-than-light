import type { Game } from "../types.ts";

/**
 * Wiki page "Engi cache".
 * Locations: Engi Controlled Sector and Engi Homeworlds. unique.
 * The page does not name which beacon in the sector.
 * Booby trap the cache spends 2 missiles and delays the Rebel Fleet for 2 turns.
 * Secure the cache grants a drone schematic with medium scrap.
 * The page does not name the schematic, so only the medium scrap is granted.
 * Medium scrap is Template:Scrap rewards (Medium), the column for the hangar difficulty.
 */
const SECTORS = new Set(["Engi Controlled Sector", "Engi Homeworlds"]);

export function stampEngiCache(g: Game) {
  if (!SECTORS.has(g.sectorName)) return;
  if (g.beacons.some((b) => b.flag === "engi-cache")) return;
  const pool = g.beacons.filter((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && b.kind !== "store");
  const spot = pool.find((b) => b.kind === "cache") ?? pool[0];
  if (!spot) return;
  spot.flag = "engi-cache";
  spot.kind = "event";
  spot.asteroid = false;
  spot.name = "Engi cache";
}

export function engiCacheEvent(): NonNullable<Game["event"]> {
  return {
    title: "Engi cache",
    body: "You notice an Engi colony hiding on the other side of a nearby moon. It turns out they're excavating an equipment cache from the Federation-Mantis War, and they suggest it might be used to lure the pursuing rebel fleet.",
    choices: [
      { id: "engi-cache-trap", label: "Booby trap the cache." },
      { id: "engi-cache-secure", label: "Secure the cache." },
    ],
  };
}


