/**
 * Wiki pages "Achievements" and "Ship Achievements".
 * The list, names, and ship of each achievement are the archive's data/achievements.xml; when one is earned is the gap
 * mod's `<condition>` on it. A condition reads named values (achievementReading below): the sector, the run's stored
 * fields, the counters in g.tally (wiki/achieve-notes.ts), and a few gauges of the ship. Those readings are the game's
 * sensors, as FTL keeps its own in the executable. An achievement with no condition is not tracked.
 * Earned ids are kept in localStorage. Anything the paragraphs do not state is marked INFERRED or INVENTED.
 */
import { ACHIEVEMENTS as CATALOG_ACHIEVEMENTS } from "@stl/catalog/src/wiki/achievements.ts";
import {
  achievementDef,
  allAchievements,
  hullDef,
  startingFit,
  warnPack,
  type AchievementCondition,
  type AchievementDef,
} from "@stl/pack";
import { HULLS } from "../hulls.ts";
import { bars, kitShownBars, zoltanBars } from "../sim.ts";
import { UNLOCKS_KEY, parseUnlocks } from "../unlocks.ts";
import type { AchieveTally, Difficulty, Game, SysId } from "../types.ts";
import { bankLifetime, lifetimeOf } from "./achieve-notes.ts";

const STORAGE_KEY = "stl-achievements-v1";

/** Earned achievements saved before the archive ids: the wiki slug each one was saved under. */
const SLUG_ID = new Map(CATALOG_ACHIEVEMENTS.map((row) => [row.slug, row.id]));

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
function typeAUnlocked(): boolean {
  const ships = new Set(savedUnlocks()?.ships ?? []);
  const typeA = HULLS.filter((hull) => hull.layout === "A");
  return typeA.length > 0 && typeA.every((hull) => ships.has(hull.id));
}

/**
 * Manpower: "Get to sector 5 without upgrading your reactor in the Zoltan Cruiser."
 * "Events which feature offers to upgrade your reactor, advertised or not, do not count against this achievement."
 * The upgrades tab is sim.ts upgrade. reactorEvent is the bars those offers added.
 */
export function noteReactorEvent(g: Game): void {
  g.reactorEvent = (g.reactorEvent ?? 0) + 1;
}

/**
 * The ship blueprint a hull is a layout of. ftl.dat names a ship's layouts PLAYER_SHIP_HARD, PLAYER_SHIP_HARD_2, and
 * PLAYER_SHIP_HARD_3; an achievement's `<ship>` names the first.
 */
export function shipFamily(hullId: string | undefined): string | undefined {
  return hullId?.replace(/_\d+$/, "");
}

/**
 * Gauges of the ship that no single field stores.
 * - crewRaces: "The United Federation", "Have six unique aliens ... simultaneously." Page "The United Federation": "One
 *   human does count toward this achievement." Living crew of the player's side.
 * - systemsInstalled: "Full Arsenal", "Have 11 systems installed ... at one time." Page note: "primary systems" and
 *   "subsystems" are not distinguished. INFERRED: every system level above 0 and every kit fitted counts.
 * - poweredBars: "Givin' her all she's got, Captain!", "have 29 power in systems at the same time." The page: "a fully
 *   upgraded reactor plus 4 Zoltan crewmembers manning systems to provide 29 power", so the lit bars count, Zoltan bars
 *   included (sim.ts bars and kitShownBars).
 * - reactorUpgrades: reactor bars bought above the blueprint's, not counting the ones reactor offers in events added.
 * - weaponsUpgrades: "Artillery Mastery", "without upgrading your weapons system." INFERRED: levels above the start.
 * - typeAUnlocked: "Your Own Fleet".
 */
const GAUGES: Record<string, (g: Game) => number | boolean> = {
  crewRaces: (g) =>
    new Set(g.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.kin)).size,
  systemsInstalled: (g) =>
    Object.values(g.player.systems).filter((s) => s.level > 0).length +
    Object.values(g.player.kits).filter((k) => k && k.level > 0).length,
  poweredBars: (g) => {
    let lit = 0;
    for (const id of Object.keys(g.player.systems) as SysId[])
      lit += bars(g.player.systems[id], zoltanBars(g.crew, g.player, "player", id));
    for (const kit of Object.values(g.player.kits)) lit += kitShownBars(kit);
    return lit;
  },
  reactorUpgrades: (g) => {
    const hull = hullDef(g.hullId);
    return hull ? g.player.reactor - (g.reactorEvent ?? 0) - hull.reactor : 0;
  },
  weaponsUpgrades: (g) => {
    const hull = hullDef(g.hullId);
    const start = hull ? (startingFit(hull).systems.weapons?.[0] ?? 0) : 0;
    return g.player.systems.weapons.level - start;
  },
  typeAUnlocked: () => typeAUnlocked(),
};

const warnedReadings = new Set<string>();

/**
 * One named value a condition reads, or undefined for a name the game does not know.
 * `sector`, `scrap`, `jumps`: the run's fields. `sectorId.<id>`: in that sector. `victory.<difficulty>`: the boss beaten
 * on it, this run or before. `lifetime.scrap` and `lifetime.kills`: across games. `tally.<key>`: a counter or flag the
 * run kept. `gauge.<name>`: GAUGES above.
 */
export function achievementReading(g: Game, name: string): number | boolean | undefined {
  if (name === "sector") return g.sector;
  if (name === "scrap") return g.scrap;
  if (name === "jumps") return g.jumps ?? 0;
  const dot = name.indexOf(".");
  const kind = dot < 0 ? name : name.slice(0, dot);
  const key = dot < 0 ? "" : name.slice(dot + 1);
  if (kind === "sectorId") return g.sectorId === key;
  if (kind === "victory") return beatBoss(g, key as Difficulty);
  if (kind === "lifetime" && (key === "scrap" || key === "kills")) return lifetimeOf(g)[key];
  if (kind === "tally") {
    const value = g.tally?.[key as keyof AchieveTally];
    return typeof value === "number" || typeof value === "boolean" ? value : false;
  }
  if (kind === "gauge" && GAUGES[key]) return GAUGES[key](g);
  if (!warnedReadings.has(name)) {
    warnedReadings.add(name);
    warnPack(
      `An achievement condition reads "${name}", which the game does not know; it is false.`,
    );
  }
  return undefined;
}

/** A condition against this run. A value with no bound must be true or above 0. */
export function conditionMet(g: Game, row: AchievementCondition): boolean {
  if ("all" in row) return row.all.every((part) => conditionMet(g, part));
  if ("any" in row) return row.any.some((part) => conditionMet(g, part));
  if ("not" in row) return !conditionMet(g, row.not);
  const value = achievementReading(g, row.value);
  if (value === undefined) return false;
  if (row.min == null && row.max == null)
    return value === true || (typeof value === "number" && value > 0);
  const n = typeof value === "number" ? value : value ? 1 : 0;
  return (row.min == null || n >= row.min) && (row.max == null || n <= row.max);
}

/**
 * Ship Achievements, lead: a ship achievement "cannot be earned while flying another ship." The same page says it can
 * be earned on Type A, B, or C, so any layout of the `<ship>` counts.
 */
function earnedBy(g: Game, row: AchievementDef): boolean {
  if (!row.condition) return false;
  if (row.ship && shipFamily(g.hullId) !== row.ship) return false;
  return conditionMet(g, row.condition);
}

let memory: Set<string> | null = null;

/** True when the game can tell this achievement was earned: it has a condition. */
export function isTracked(id: string): boolean {
  return !!achievementDef(id)?.condition;
}

/** Ids the current run meets. Does not read or write storage. */
export function earnedNow(g: Game): string[] {
  // INFERRED: the title placeholder is not a playthrough. Its sector and scrap do not count.
  if (g.phase === "title") return [];
  return allAchievements()
    .filter((row) => earnedBy(g, row))
    .map((row) => row.id);
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
    // An id saved before the archive ids is the wiki slug; it is read as that achievement's archive id.
    for (const saved of parsed) {
      if (typeof saved !== "string") continue;
      const id = SLUG_ID.get(saved) ?? saved;
      if (isTracked(id)) next.add(id);
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

/** Achievements the archive lists that have no condition: slug room-vision and the four blue events, in vanilla. */
export function untrackedIds(): string[] {
  return allAchievements()
    .filter((row) => !row.condition)
    .map((row) => row.id);
}
