import { tx } from "../../i18n/index.ts";
import type { Game } from "../types.ts";

/**
 * Wiki page "Engi cache".
 * Locations: Engi Controlled Sector and Engi Homeworlds. unique.
 * The page does not name which beacon in the sector.
 * Booby trap the cache spends 2 missiles and delays the Rebel Fleet for 2 turns.
 * Secure the cache grants a drone schematic with medium scrap.
 * The page does not name the schematic: a random one (Rewards, "Drone": "A random drone schematic & T scrap.").
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
  spot.name = tx("wiki.engi-cache.engi-cache");
}

export function engiCacheEvent(): NonNullable<Game["event"]> {
  return {
    title: tx("wiki.engi-cache.engi-cache"),
    body: tx("wiki.engi-cache.you-notice-an-engi-colony-hiding"),
    choices: [
      { id: "engi-cache-trap", label: tx("wiki.engi-cache.booby-trap-the-cache") },
      { id: "engi-cache-secure", label: tx("wiki.engi-cache.secure-the-cache") },
    ],
  };
}


