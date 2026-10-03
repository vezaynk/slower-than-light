/**
 * Wiki pages "Achievements" and "Ship Achievements".
 * A tile is earned only from a field the run already stores: kills, beacons, scrap, hull, or sector.
 * Earned ids are kept in localStorage. No new counter is added for a line the sim does not store.
 * Anything the paragraphs do not state is marked INFERRED or INVENTED.
 */
import { HULLS } from "../hulls.ts";
import type { Game } from "../types.ts";
import { ACHIEVEMENTS } from "./achievements.ts";

const STORAGE_KEY = "ashwake-achievements-v1";

type Rule = {
  id: string;
  met: (g: Game) => boolean;
};

/**
 * Achievements, "General Progression": "Just Getting Started" — "Get to sector 5."
 * The run stores the sector number. 5 or later is that sector.
 */
function sectorFive(g: Game): boolean {
  return g.sector >= 5;
}

/**
 * Achievements, "General Progression": "Federation Base in Range" — "Get to sector 8."
 * The run stores the sector number. 8 or later is that sector.
 */
function sectorEight(g: Game): boolean {
  return g.sector >= 8;
}

/**
 * Ship Achievements, "The Lanius Cruiser": "Scrap Hoarder" — "Have at least 600 scrap in your ship storage."
 * Ship Achievements, lead: a ship achievement "cannot be earned while flying another ship."
 * The same page says a ship achievement can be earned on Type A, B, or C. The stored scrap wallet is the storage.
 * Cruiser identity is the hangar hull id, not a new counter.
 */
function scrapHoarder(g: Game): boolean {
  const ship = ACHIEVEMENTS.find((row) => row.id === "scrap-hoarder")?.ship;
  if (!ship || !g.hullId) return false;
  const cruiser = HULLS.find((hull) => hull.id === g.hullId)?.cruiser;
  return cruiser === ship && g.scrap >= 600;
}

const RULES: Rule[] = [
  { id: "just-getting-started", met: sectorFive },
  { id: "federation-base-in-range", met: sectorEight },
  { id: "scrap-hoarder", met: scrapHoarder },
];

/**
 * These lines stay locked. The sim does not store the condition, so no counter is invented.
 * Kills, beacons, and hull are stored, and none of these lines is only that reading.
 *
 * Achievements, "General Progression":
 * - "Federation Victory (Easy)" — "Beat the boss on Easy."
 * - "Federation Victory (Normal)" — "Beat the boss on Normal."
 * - "Your Own Fleet" — "Unlock the Type A layout for every playable ship."
 * - "Rule Ten: Greed is Eternal" — "Collect 10,000 scrap across all games." Scrap this run is stored. A total across games is not.
 * - "Warlord" — "Defeat 1000 ships across all playthroughs." Kills this run are stored. A total across playthroughs is not.
 *
 * Achievements, "Going the Distance": each line is a sector plus a restriction the run does not store.
 * - "Coming in for my Pacifism run!" — no shots, offensive drone, or teleport.
 * - "I don't need no stinkin' upgrades!" — no system or reactor upgrades.
 * - "On a Wing and a Prayer" — no store repair.
 * - "Ballistophobia" — no missiles or bombs.
 * - "Technophobia" — no drones.
 * - "Living off the Land" — no store purchase.
 * - "No Redshirts Here" — no lost crewmember.
 *
 * Achievements, "Skill and Equipment Feats":
 * - "Some people just like to watch ships burn" — every square on fire.
 * - "Astronomically Low Odds" — five missed evades in a row.
 * - "BOARDING OBJECTIVE SUCCESSFUL" — one boarding drone kills four crew.
 * - "They never saw it coming" — one pre-igniter volley.
 * - "Trustworthy Auto-Pilot" — all crew aboard the enemy.
 * - "Slice and Dice" — every room hit by a beam within five seconds.
 * - "Victory through Asphyxiation" — enemy oxygen under five percent.
 *
 * Ship Achievements, "Kestrel Cruiser": six unique aliens; eleven systems; repair from 1 HP to full.
 * Hull is the current number, not that repair.
 * Ship Achievements, "Stealth Cruiser": one cloak destroying a full-health ship; 9 damage avoided in one cloak; sector 8 with no environmental beacon.
 * Ship Achievements, "Mantis Cruiser": crew of 20 ships by sector 6; five crew kills with no hull or crew loss; last crewmember kills the last enemy.
 * Ship Achievements, "Engi Cruiser": three drones at once; a kill using only drones; four ioned systems at once.
 * Ship Achievements, "Federation Cruiser": artillery-only kill with no hull damage; four blue events by sector 5; sector 5 with no weapons upgrade.
 * Ship Achievements, "Slug Cruiser": full enemy vision without sensors; 30 nebula jumps; three crew with one Anti-Bio Beam shot.
 * Beacons visited are not nebula jumps.
 * Ship Achievements, "Rock Cruiser": a crew kill on a burning enemy; a missile-only kill of a ship with a defense drone; the secret sector.
 * Ship Achievements, "Zoltan Cruiser": a kill before the Zoltan Shield drops; 29 power in systems; sector 5 with no reactor upgrade.
 * Ship Achievements, "Crystal Cruiser": a Crystal Vengeance shard kill; four crew trapped in one room; 10 Rock ships destroyed.
 * Ship Achievements, "Lanius Cruiser": Hacking, Mind Control, and Battery active together; oxygen never above 20 percent through sector 8.
 * "Scrap Hoarder" is the one Lanius line that is tracked. It is not in this list.
 */
const UNTRACKED = new Set(
  ACHIEVEMENTS.map((row) => row.id).filter((id) => !RULES.some((rule) => rule.id === id)),
);

const TRACKED = new Set(RULES.map((rule) => rule.id));

let memory: Set<string> | null = null;

export function isTracked(id: string): boolean {
  return TRACKED.has(id);
}

/** Ids the current run meets. Does not read or write storage. */
export function earnedNow(g: Game): string[] {
  // INFERRED: the title placeholder is not a playthrough. Its sector and scrap do not count.
  if (g.phase === "title") return [];
  return RULES.filter((rule) => rule.met(g)).map((rule) => rule.id);
}

function read(): Set<string> {
  if (memory) return memory;
  const next = new Set<string>();
  memory = next;
  if (typeof localStorage === "undefined") return next;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return next;
    for (const id of parsed) {
      if (typeof id === "string" && TRACKED.has(id)) next.add(id);
    }
  } catch {
    // A bad saved value is not an earned id.
  }
  return next;
}

function write(ids: Set<string>) {
  memory = ids;
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be full or blocked. The in-memory set still holds this session.
  }
}

/** Remember ids this run just met. Already earned ids stay earned. */
export function noteRun(g: Game): string[] {
  const have = read();
  let changed = false;
  for (const id of earnedNow(g)) {
    if (!have.has(id)) {
      have.add(id);
      changed = true;
    }
  }
  if (changed) write(have);
  return [...have];
}

export function earnedIds(): string[] {
  return [...read()];
}

/** Test hook. Drops the in-memory copy so the next read uses localStorage. */
export function resetAchievementMemory(): void {
  memory = null;
}

export function untrackedIds(): string[] {
  return [...UNTRACKED];
}
