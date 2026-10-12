/**
 * Ship unlock system. Wiki pages "Ships" (section "Layouts"), "Ship Achievements", each cruiser page's "Unlock"
 * line, and the Category:Ship Unlocking Events pages.
 *
 * "Ships", "Layouts": "At start only the Kestrel Cruiser is available. Upon reaching the 5th sector with the Kestrel
 * Cruiser, the Engi Cruiser is unlocked. To unlock other ships and layouts, certain objectives must be accomplished:
 *  * Layout A - complete a respective quest or defeat the Rebel Flagship with the previous ship in the diagram.
 *  * Layout B - earn 2 out of 3 ship-related Achievements.
 *  * Layout C - reach sector 8 with Layout B and Advanced Edition Content enabled.
 *  * The Lanius Cruiser becomes available after unlocking 4 ships.
 *  * The Crystal Cruiser can either be unlocked with the quest or by defeating the Flagship with layout A and B of
 *    every ship (excluding the Lanius Cruiser). Do not have Layout C."
 *
 * The sim stays pure: an event outcome calls grantUnlock, which only writes `g.unlocked` on the run.
 * The store calls noteUnlocks after each step; that reads the run and writes localStorage ("stl:unlocks").
 * Layout C is reaching sector 8 on Layout B. Advanced Edition content is always on.
 */
import { tx } from "../i18n/index.ts";
import { HULLS, type HullSpec } from "./hulls.ts";
import type { Difficulty, Game } from "./types.ts";
import { ACHIEVEMENTS } from "./wiki/achievements.ts";

export const UNLOCKS_KEY = "stl:unlocks";

const DIFFICULTIES = ["easy", "normal", "hard"] as const;

export type UnlockState = {
  /** Hull ids (layouts) the player may start. */
  ships: string[];
  /** Hull ids that have defeated the Rebel Flagship. "Ship Achievements": the Victory Achievement "displays which layout was used". */
  wins: string[];
  /**
   * Difficulties on which a Flagship victory was recorded.
   * Achievements: "Beat the boss on Easy." and "Beat the boss on Normal."
   * Hard is stored with the win. The Achievements page has no Hard row.
   * Absent means none recorded.
   */
  boss?: Difficulty[];
};

/** Rule kind for the hangar and the tests. */
export type UnlockRule = {
  hull: string;
  /** The page line, quoted. */
  quote: string;
  /** Event page slug(s) whose outcome grants this hull (grantUnlock call sites). */
  events?: string[];
  /** "defeat the Rebel Flagship with the previous ship in the diagram": that cruiser. */
  winWith?: string;
  /** Not on the page. Our reading. */
  inferred?: string;
};

/**
 * Layout A rules. Quotes from each cruiser page's Layout A "Unlock" line and its unlocking event page.
 * The "previous ship in the diagram" for each is the parenthetical on that event page
 * ("the ship can also be unlocked by winning the game with the X Cruiser").
 */
export const A_RULES: UnlockRule[] = [
  {
    hull: "kestrel-a",
    quote: tx("game.unlocks.does-not-require-unlocking-it-is"),
  },
  {
    hull: "engi-a",
    quote: tx("game.unlocks.reaching-a-sector-5-with-any"),
  },
  {
    hull: "fed-a",
    quote: tx("game.unlocks.rebel-shipyard-you-unlock-the-federation"),
    events: ["rebel-shipyard"],
    winWith: tx("game.unlocks.engi-cruiser"),
  },
  {
    hull: "zoltan-a",
    quote: tx("game.unlocks.unarmed-zoltan-transport-you-unlock-the"),
    events: ["unarmed-zoltan-transport"],
    winWith: tx("game.unlocks.federation-cruiser"),
    inferred: tx("game.unlocks.the-unarmed-zoltan-transport-event-has"),
  },
  {
    hull: "mantis-a",
    quote: tx("game.unlocks.legendary-thief-kazaaakplethkilik-you-unlock-the"),
    events: ["legendary-thief-kazaaakplethkilik"],
    winWith: tx("game.unlocks.zoltan-cruiser"),
  },
  {
    hull: "slug-a",
    quote: tx("game.unlocks.slug-home-nebula-surrender-you-unlock"),
    events: ["slug-home-nebula-surrender"],
    winWith: tx("game.unlocks.mantis-cruiser"),
  },
  {
    hull: "rock-a",
    quote: tx("game.unlocks.rock-war-vessel-encounter-you-unlock"),
    events: ["rock-war-vessel-encounter"],
    winWith: tx("game.unlocks.slug-cruiser"),
    inferred: tx("game.unlocks.the-rock-war-vessel-encounter-has"),
  },
  {
    hull: "stealth-a",
    quote: tx("game.unlocks.engi-fleet-discussion-you-unlock-the"),
    events: ["engi-fleet-discussion"],
    winWith: tx("game.unlocks.rock-cruiser"),
  },
  {
    hull: "lanius-a",
    quote: tx("game.unlocks.unlock-4-ships-excluding-the-kestrel"),
    inferred: tx("game.unlocks.ships-counts-cruisers-their-layout-a"),
  },
  {
    hull: "crystal-a",
    quote: tx("game.unlocks.ancient-device-you-unlock-the-crystal"),
    events: ["ancient-device"],
    inferred: tx("game.unlocks.the-ancient-device-event-has-no"),
  },
];

const B_QUOTE = tx("game.unlocks.layout-b-earn-2-out-of");
const C_QUOTE = tx("game.unlocks.layout-c-reach-sector-8-with");

function cruiserOf(hullId: string | undefined): HullSpec | undefined {
  return hullId ? HULLS.find((h) => h.id === hullId) : undefined;
}

function hullFor(cruiser: string, layout: "A" | "B" | "C"): string | undefined {
  return HULLS.find((h) => h.cruiser === cruiser && h.layout === layout)?.id;
}

/** Every rule, one per hull in HULLS, for the hangar's lock card and the tests. */
export function ruleFor(hullId: string): UnlockRule {
  const a = A_RULES.find((r) => r.hull === hullId);
  if (a) return a;
  const hull = cruiserOf(hullId);
  if (hull?.layout === "B") return { hull: hullId, quote: B_QUOTE };
  const inferred =
    hull?.cruiser === "Kestrel Cruiser" || hull?.cruiser === "Engi Cruiser"
      ? tx("game.unlocks.those-pages-say-the-final-sector")
      : undefined;
  return { hull: hullId, quote: C_QUOTE, inferred };
}

/** Ship achievement ids for one cruiser ("Ship Achievements"). */
export function shipAchievements(cruiser: string): string[] {
  return ACHIEVEMENTS.filter((row) => row.ship === cruiser).map((row) => row.id);
}

export function emptyUnlocks(): UnlockState {
  return { ships: ["kestrel-a"], wins: [] };
}

export function allUnlocks(prev: UnlockState = emptyUnlocks()): UnlockState {
  const next: UnlockState = { ships: HULLS.map((h) => h.id), wins: [...prev.wins] };
  if (prev.boss?.length) next.boss = [...prev.boss];
  return next;
}

export function isUnlockedIn(state: UnlockState, hullId: string): boolean {
  return hullId === "kestrel-a" || state.ships.includes(hullId);
}

/**
 * Pure: an event outcome unlocks a cruiser's Layout A. Writes only the run (`g.unlocked`) and its log.
 * The store copies `g.unlocked` into storage (noteUnlocks). Returns the line for a result card.
 */
export function grantUnlock(g: Game, hullId: string): string {
  const hull = cruiserOf(hullId);
  if (!hull) return "";
  const list = (g.unlocked ??= []);
  if (!list.includes(hullId)) list.push(hullId);
  const line = tx("game.unlocks.you-unlock-the", { cruiser: hull.cruiser });
  g.log.unshift(line);
  if (g.log.length > 5) g.log.length = 5;
  return line;
}

/**
 * Event fights whose win itself is the unlock. Rebel shipyard, "Ship defeated" (destroyed or deadCrew):
 * "You unlock the Federation Cruiser." The other unlocking pages unlock on a dialogue card, granted at that card.
 */
const FIGHT_UNLOCKS: Record<string, string> = {
  "rebel-shipyard": "fed-a",
};

/** Pure: sim.ts winCombat, for the page that started the fight (`g.fightEvent`). */
export function fightUnlock(g: Game, slug: string | null | undefined): void {
  const hull = slug ? FIGHT_UNLOCKS[slug] : undefined;
  if (hull) grantUnlock(g, hull);
}

/**
 * Pure: the unlock state after this run's progress. `earned` is the achievement ids already earned
 * (wiki/achievement-track.ts). Returns the same object when nothing changed.
 */
export function deriveUnlocks(state: UnlockState, g: Game, earned: readonly string[]): UnlockState {
  const ships = new Set(state.ships);
  const wins = new Set(state.wins);
  const boss = new Set(state.boss ?? []);
  ships.add("kestrel-a");
  const live = g.phase !== "title";
  const hull = live ? cruiserOf(g.hullId) : undefined;

  if (live) for (const id of g.unlocked ?? []) if (cruiserOf(id)) ships.add(id);

  if (hull) {
    // Engi Cruiser page: "Reaching a sector 5 with any Kestrel Cruiser layout automatically unlocks the Engi Cruiser".
    if (hull.cruiser === "Kestrel Cruiser" && g.sector >= 5) ships.add("engi-a");
    // "Layout C - reach sector 8 with Layout B and Advanced Edition Content enabled."
    if (hull.layout === "B" && g.sector >= 8) {
      const c = hullFor(hull.cruiser, "C");
      if (c) ships.add(c);
    }
    // sim.ts winCombat sets phase and outcome "victory" when the Flagship falls.
    // Achievements, "Federation Victory (Easy)" / "(Normal)": the win keeps its difficulty.
    if (g.phase === "victory" && g.outcome === "victory") {
      wins.add(hull.id);
      boss.add(g.difficulty);
    }
  }

  // "defeat the Rebel Flagship with the previous ship in the diagram". Any layout of that cruiser counts. INFERRED:
  // the event pages say "winning the game with the X Cruiser", not a layout.
  for (const rule of A_RULES) {
    if (!rule.winWith) continue;
    if ([...wins].some((id) => cruiserOf(id)?.cruiser === rule.winWith)) ships.add(rule.hull);
  }

  // "Layout B - earn 2 out of 3 ship-related Achievements."
  const have = new Set(earned);
  for (const b of HULLS.filter((h) => h.layout === "B")) {
    const got = shipAchievements(b.cruiser).filter((id) => have.has(id)).length;
    if (got >= 2) ships.add(b.id);
  }

  // Crystal: "defeating the Flagship with layout A and B of every ship (excluding the Lanius Cruiser)".
  const others = [...new Set(HULLS.map((h) => h.cruiser))].filter(
    (c) => c !== "Lanius Cruiser" && c !== "Crystal Cruiser",
  );
  const allAB = others.every((c) => ["A", "B"].every((l) => {
    const id = hullFor(c, l as "A" | "B");
    return !!id && wins.has(id);
  }));
  if (allAB) ships.add("crystal-a");

  // Lanius: "Unlock 4 ships (Excluding The Kestrel)". Counted last, after every other A rule.
  const cruisers = HULLS.filter(
    (h) => h.layout === "A" && h.id !== "kestrel-a" && h.id !== "lanius-a" && ships.has(h.id),
  ).length;
  if (cruisers >= 4) ships.add("lanius-a");

  const prevBoss = state.boss ?? [];
  const same =
    ships.size === state.ships.length && wins.size === state.wins.length && state.ships.every((s) => ships.has(s));
  const bossSame = boss.size === prevBoss.length && prevBoss.every((d) => boss.has(d));
  if (same && state.wins.every((w) => wins.has(w)) && bossSame) return state;
  const order = HULLS.map((h) => h.id);
  const next: UnlockState = {
    ships: [...ships].sort((x, y) => order.indexOf(x) - order.indexOf(y)),
    wins: [...wins].sort((x, y) => order.indexOf(x) - order.indexOf(y)),
  };
  const recorded = DIFFICULTIES.filter((d) => boss.has(d));
  if (recorded.length) next.boss = recorded;
  return next;
}

/** Parse a stored value. Anything unreadable is the start state. */
export function parseUnlocks(raw: string | null): UnlockState {
  const base = emptyUnlocks();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as Partial<UnlockState> | null;
    const ok = (list: unknown) =>
      Array.isArray(list) ? list.filter((id): id is string => typeof id === "string" && !!cruiserOf(id)) : [];
    const ships = new Set([...base.ships, ...ok(parsed?.ships)]);
    const boss = Array.isArray(parsed?.boss)
      ? parsed.boss.filter((d): d is Difficulty => typeof d === "string" && (DIFFICULTIES as readonly string[]).includes(d))
      : [];
    const next: UnlockState = { ships: [...ships], wins: ok(parsed?.wins) };
    const recorded = DIFFICULTIES.filter((d) => boss.includes(d));
    if (recorded.length) next.boss = recorded;
    return next;
  } catch {
    return base;
  }
}
