/**
 * Wiki pages "Achievements" and "Ship Achievements".
 * A tile is earned from a field the run stores, or from a counter in g.tally (wiki/achieve-notes.ts).
 * Earned ids are kept in localStorage. Two lines stay untracked: slug vision of every room, and four blue events.
 * Anything the paragraphs do not state is marked INFERRED or INVENTED.
 */
import { HULLS } from "../hulls.ts";
import { UNLOCKS_KEY, parseUnlocks } from "../unlocks.ts";
import type { Difficulty, Game } from "../types.ts";
import { bankLifetime, lifetimeOf } from "./achieve-notes.ts";
import { ACHIEVEMENTS } from "./achievements.ts";

const STORAGE_KEY = "stl-achievements-v1";

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

function savedUnlocks() {
  try {
    if (typeof localStorage === "undefined") return null;
    return parseUnlocks(localStorage.getItem(UNLOCKS_KEY));
  } catch {
    return null;
  }
}

/**
 * Achievements, "General Progression": "Federation Victory (Easy)" — "Beat the boss on Easy."
 * "Federation Victory (Normal)" — "Beat the boss on Normal."
 * A victory this run counts, and so does a difficulty already stored on the win record.
 */
function beatBoss(g: Game, difficulty: Difficulty): boolean {
  if (g.phase === "victory" && g.outcome === "victory" && g.difficulty === difficulty) return true;
  return savedUnlocks()?.boss?.includes(difficulty) ?? false;
}

/**
 * Achievements, "General Progression": "Your Own Fleet" — "Unlock the Type A layout for every playable ship."
 * The saved unlock list is that set. Layout B and Layout C are not part of the line.
 */
function yourOwnFleet(): boolean {
  const ships = new Set(savedUnlocks()?.ships ?? []);
  const typeA = HULLS.filter((hull) => hull.layout === "A");
  return typeA.length > 0 && typeA.every((hull) => ships.has(hull.id));
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

/** @agent:unlocks. The hangar hull's cruiser and Layout A spec (start levels), for the ship achievements below. */
function flying(g: Game, cruiser: string) {
  const hull = g.hullId ? HULLS.find((h) => h.id === g.hullId) : undefined;
  return hull?.cruiser === cruiser ? hull : undefined;
}

/**
 * @agent:unlocks. Ship Achievements, "Kestrel Cruiser": "The United Federation" — "Have six unique aliens on the Kestrel
 * Cruiser simultaneously." Page "The United Federation": "One human does count toward this achievement."
 */
function unitedFederation(g: Game): boolean {
  if (!flying(g, "Kestrel Cruiser")) return false;
  return new Set(g.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.kin)).size >= 6;
}

/**
 * @agent:unlocks. "Full Arsenal" — "Have 11 systems installed on the Kestrel Cruiser at one time." Page note: "primary
 * systems" and "subsystems" are not distinguished. INFERRED: every system level above 0 and every kit fitted counts.
 */
function fullArsenal(g: Game): boolean {
  if (!flying(g, "Kestrel Cruiser")) return false;
  const systems = Object.values(g.player.systems).filter((s) => s.level > 0).length;
  const kits = Object.values(g.player.kits).filter((k) => k && k.level > 0).length;
  return systems + kits >= 11;
}

/**
 * @agent:unlocks. "Givin' her all she's got, Captain!" — "With the Zoltan Cruiser, have 29 power in systems at the same
 * time." INFERRED: the power fields of systems and kits; a Zoltan's own bar is counted only where the sim stores it there.
 */
function givinHerAll(g: Game): boolean {
  if (!flying(g, "Zoltan Cruiser")) return false;
  const sys = Object.values(g.player.systems).reduce((n, s) => n + s.power, 0);
  const kits = Object.values(g.player.kits).reduce((n, k) => n + (k?.power ?? 0), 0);
  return sys + kits >= 29;
}

/**
 * Manpower: "Get to sector 5 without upgrading your reactor in the Zoltan Cruiser."
 * "Events which feature offers to upgrade your reactor, advertised or not, do not count against this achievement."
 * The upgrades tab is sim.ts upgrade. reactorEvent is the bars those offers added.
 */
export function noteReactorEvent(g: Game): void {
  g.reactorEvent = (g.reactorEvent ?? 0) + 1;
}

function manpower(g: Game): boolean {
  const hull = flying(g, "Zoltan Cruiser");
  if (!hull || g.sector < 5) return false;
  return g.player.reactor - (g.reactorEvent ?? 0) <= hull.reactor;
}

/**
 * @agent:unlocks. "Artillery Mastery" — "Get to sector 5 with the Federation Cruiser without upgrading your weapons
 * system." INFERRED: weapons level at or below the layout's start level.
 */
function artilleryMastery(g: Game): boolean {
  const hull = flying(g, "Federation Cruiser");
  const start = hull?.systems.weapons?.[0] ?? 0;
  return !!hull && g.sector >= 5 && g.player.systems.weapons.level <= start;
}

/** @agent:unlocks. "Ancestry" — "Find the secret sector with the Rock Cruiser." Sectors: "Hidden Crystal Worlds". */
function ancestry(g: Game): boolean {
  return !!flying(g, "Rock Cruiser") && g.sectorName === "Hidden Crystal Worlds";
}

function flag(g: Game, key: keyof NonNullable<Game["tally"]>): boolean {
  return g.tally?.[key] === true;
}

function atLeast(g: Game, key: keyof NonNullable<Game["tally"]>, n: number): boolean {
  const value = g.tally?.[key];
  return typeof value === "number" && value >= n;
}

const RULES: Rule[] = [
  { id: "just-getting-started", met: sectorFive },
  { id: "federation-base-in-range", met: sectorEight },
  { id: "federation-victory-easy", met: (g) => beatBoss(g, "easy") },
  { id: "federation-victory-normal", met: (g) => beatBoss(g, "normal") },
  { id: "your-own-fleet", met: () => yourOwnFleet() },
  { id: "the-united-federation", met: unitedFederation },
  { id: "full-arsenal", met: fullArsenal },
  { id: "artillery-mastery", met: artilleryMastery },
  { id: "ancestry", met: ancestry },
  { id: "givin-her-all-shes-got-captain", met: givinHerAll },
  { id: "manpower", met: manpower },
  { id: "scrap-hoarder", met: scrapHoarder },
  // Achievements, General Progression. The cross-game totals live beside the earned ids.
  { id: "rule-ten-greed-is-eternal", met: (g) => lifetimeOf(g).scrap >= 10000 },
  { id: "warlord", met: (g) => lifetimeOf(g).kills >= 1000 },
  // Achievements, Going the Distance. An absent tally flag means that action has not happened.
  { id: "coming-in-for-my-pacifism-run", met: (g) => g.sector >= 5 && !flag(g, "shot") && !flag(g, "offensiveDrone") && !flag(g, "teleported") },
  { id: "i-dont-need-no-stinkin-upgrades", met: (g) => g.sector >= 5 && !flag(g, "upgraded") },
  { id: "on-a-wing-and-a-prayer", met: (g) => g.sector >= 5 && !flag(g, "storeRepair") },
  { id: "ballistophobia", met: (g) => g.sector >= 8 && !flag(g, "missileOrBomb") },
  { id: "technophobia", met: (g) => g.sector >= 8 && !flag(g, "usedDrone") },
  { id: "living-off-the-land", met: (g) => g.sector >= 8 && !flag(g, "storeBuy") },
  { id: "no-redshirts-here", met: (g) => g.sector >= 8 && !flag(g, "lostCrew") },
  // Achievements, Skill and Equipment Feats.
  { id: "some-people-just-like-to-watch-ships-burn", met: (g) => flag(g, "burnedAll") },
  { id: "astronomically-low-odds", met: (g) => atLeast(g, "evadeBest", 5) },
  { id: "boarding-objective-successful", met: (g) => atLeast(g, "boardBest", 4) },
  { id: "they-never-saw-it-coming", met: (g) => flag(g, "sawIt") },
  { id: "trustworthy-auto-pilot", met: (g) => flag(g, "allAboard") },
  { id: "slice-and-dice", met: (g) => flag(g, "sliced") },
  { id: "victory-through-asphyxiation", met: (g) => flag(g, "asphyxia") },
  // Ship Achievements. The cruiser check is the same one the earlier rules use.
  { id: "tough-little-ship", met: (g) => !!flying(g, "Kestrel Cruiser") && flag(g, "fromOne") },
  { id: "bird-of-prey", met: (g) => !!flying(g, "Stealth Cruiser") && flag(g, "bird") },
  { id: "phase-shift", met: (g) => !!flying(g, "Stealth Cruiser") && flag(g, "phaseShift") },
  { id: "tactical-approach", met: (g) => !!flying(g, "Stealth Cruiser") && flag(g, "reachedClean") },
  { id: "take-no-prisoners", met: (g) => !!flying(g, "Mantis Cruiser") && atLeast(g, "crewKillShips", 20) },
  { id: "avast-ye-scurvy-dogs", met: (g) => !!flying(g, "Mantis Cruiser") && flag(g, "avast") },
  { id: "battle-royale", met: (g) => !!flying(g, "Mantis Cruiser") && flag(g, "lastStand") },
  { id: "robotic-warfare", met: (g) => !!flying(g, "Engi Cruiser") && atLeast(g, "dronePeak", 3) },
  { id: "i-hardly-lifted-a-finger", met: (g) => !!flying(g, "Engi Cruiser") && flag(g, "droneOnly") },
  { id: "the-guns-theyve-stopped", met: (g) => !!flying(g, "Engi Cruiser") && flag(g, "ionFour") },
  { id: "master-of-patience", met: (g) => !!flying(g, "Federation Cruiser") && flag(g, "artilleryKill") },
  { id: "home-sweet-home", met: (g) => !!flying(g, "Slug Cruiser") && g.sector < 8 && atLeast(g, "nebulaJumps", 30) },
  { id: "disintegration-ray", met: (g) => !!flying(g, "Slug Cruiser") && atLeast(g, "antiBio", 3) },
  { id: "is-it-warm-in-here", met: (g) => !!flying(g, "Rock Cruiser") && flag(g, "warmKill") },
  { id: "defense-drones-dont-do-danything", met: (g) => !!flying(g, "Rock Cruiser") && flag(g, "missileDefense") },
  { id: "shields-holding", met: (g) => !!flying(g, "Zoltan Cruiser") && flag(g, "shieldsHeld") },
  { id: "sweet-revenge", met: (g) => !!flying(g, "Crystal Cruiser") && flag(g, "vengeance") },
  { id: "no-escape", met: (g) => !!flying(g, "Crystal Cruiser") && flag(g, "trapped") },
  { id: "clash-of-the-titans", met: (g) => !!flying(g, "Crystal Cruiser") && atLeast(g, "rockKills", 10) },
  { id: "advanced-mastery", met: (g) => !!flying(g, "Lanius Cruiser") && flag(g, "mastery") },
  { id: "loss-of-cabin-pressure", met: (g) => !!flying(g, "Lanius Cruiser") && g.sector >= 8 && (g.jumps ?? 0) > 0 && !flag(g, "o2Broke") },
];

/**
 * Still no counter. The sim does not record slug room-vision or which choices were blue options.
 * Ship Achievements, Slug: "have vision of every room on the enemy ship without functioning sensors."
 * Ship Achievements, Federation: "use your crew in four special blue events by sector 5."
 */
const UNTRACKED = new Set(["were-in-position", "diplomatic-immunity"]);

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
  try {
    // Inside the try: with site data blocked, merely reading the localStorage global throws.
    if (typeof localStorage === "undefined") return next;
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
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be full or blocked. The in-memory set still holds this session.
  }
}

/** Remember ids this run just met. Already earned ids stay earned. */
export function noteRun(g: Game): string[] {
  bankLifetime(g);
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
