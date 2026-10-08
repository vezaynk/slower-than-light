import type { Beacon, Game, GameEvent } from "../types.ts";
import { SECTOR_TYPES } from "./sectors.ts";

/**
 * Sector, fleet, and Last Stand rules whose numbers the wiki states.
 * Called after the map exists and after Engi cache is stamped.
 *
 * Beacons, "Repair station beacon": The Last Stand has 3 repair stations.
 * Each is 15 hull, 22–44 scrap, 5 fuel, 4 missiles, and 5 drone parts, once.
 * citedSector only stamps them. lastStandRepairEvent plus the choose case pay them.
 */
const REPAIR_FLAG = "last-stand-repair";
const REPAIR_NAME = "Federation Repair Station";
const REPAIR_COUNT = 3;

const NEBULA_SECTORS = new Set(
  SECTOR_TYPES.filter((sector) => sector.group === "nebula").map((sector) => sector.name),
);

export function citedSector(g: Game): void {
  if (g.sectorName !== "The Last Stand") return;
  let need = REPAIR_COUNT - g.beacons.filter((b) => b.flag === REPAIR_FLAG).length;
  if (need <= 0) return;
  for (const b of g.beacons) {
    if (need <= 0) break;
    // Sectors, "The Last Stand": the Federation base is its own beacon, not a repair station.
    if (b.flag === REPAIR_FLAG || b.flag === "engi-cache" || b.flag === "fed-base") continue;
    if (b.kind === "start" || b.kind === "exit" || b.kind === "boss" || b.kind === "store") continue;
    b.flag = REPAIR_FLAG;
    b.name = REPAIR_NAME;
    b.kind = "event";
    b.asteroid = false;
    need -= 1;
  }
}

/**
 * Beacons that count toward score.
 * Return null to keep g.beaconsVisited.
 * Score: rebel-held beacons do not count.
 * beacon.col < g.fleet is the column the sim already treats as overtaken,
 * but beaconsVisited is a lifetime counter and earlier sectors are gone,
 * so a visit-time count cannot be rebuilt from these fields.
 */
export function citedBeaconCount(_g: Game): number | null {
  return null;
}

/** Beacons, "Repair station beacon". One choice grants the station once. */
export function lastStandRepairEvent(): GameEvent {
  return {
    title: REPAIR_NAME,
    body: "15 hull, 22–44 scrap, 5 fuel, 4 missiles, and 5 drone parts.",
    choices: [{ id: REPAIR_FLAG, label: "Take the supplies." }],
  };
}

/**
 * Rebel Fleet: a nebula beacon in a non-nebula sector halves that turn.
 * Sectors, nebula headings: in a nebula sector that beacon slows the fleet by 20% instead of 50%.
 * Any other beacon advances one column.
 */
export function citedFleetAdvance(g: Game, beacon: Pick<Beacon, "kind">): number {
  if (beacon.kind !== "nebula") return 1;
  return NEBULA_SECTORS.has(g.sectorName) ? 0.8 : 0.5;
}

/**
 * Rebel Fleet / Environmental Hazards: the battery is not on a nebula beacon, and never on an Easy exit.
 * The overtaken-column test is the one startCombat already used.
 * Anti-Ship Battery: an out-of-fuel wait that the fleet overtakes removes the nebula, so the battery is present.
 */
export function citedAsb(g: Game, here: Pick<Beacon, "kind" | "col" | "cleared"> | undefined): boolean {
  if (!here) return false;
  if (here.kind === "nebula" && !here.cleared) return false;
  if (g.difficulty === "easy" && here.kind === "exit") return false;
  return here.col < g.fleet;
}

/**
 * Environmental Hazards, Plasma/ion Storm: half-efficiency, rounded up.
 * A reactor of 1 stays 1. A reactor of 5 becomes 3.
 */
export function stormReactor(reactor: number): number {
  return Math.ceil(Math.max(0, reactor) / 2);
}

/**
 * Environmental Hazards, Plasma/ion Storm: a nebula beacon the fleet has overtaken always has an ion storm.
 * An exit beacon cannot. INFERRED: only that always-case is used. The page does not say which other nebula beacons have one.
 * Environmental Hazards, Anti-Ship Battery: a nebula cleared by an out-of-fuel wait has no storm.
 */
export function ionStormBeacon(beacon: Pick<Beacon, "kind" | "col" | "cleared"> | undefined, fleet: number): boolean {
  if (!beacon || beacon.kind !== "nebula" || beacon.cleared) return false;
  return beacon.col < fleet;
}

/** Rebel Fleet / Environmental Hazards: 3 hull and a breach. No fire figure is stated. The timer is environment(). */
export function citedAsbShot(): { damage: number; breachChance: number; fireChance: number } {
  return { damage: 3, breachChance: 1, fireChance: 0 };
}
