import type { Beacon, BeaconKind, Game } from "../types.ts";
import { rand } from "../sim.ts";
// @agent:filler. Documented fallback lists for plain slots (circular import: only used inside mixBeacons).
import { drawFiller, stampEmptyNebula, stampFiller, type FillerList } from "./filler-events.ts";

/**
 * Wiki page "Sectors": each sector type's "Beacons:" list, and
 * "Technical details of sector generation and events": every line draws a count between its min and max
 * (inclusive), and a sector's specific events (stores, homeworld events) sit at the top so they are always present.
 *
 * makeMap places the 19-24 beacons. INFERRED: the drawn counts are scaled to the free beacons (everything but
 * the start and the exit) by largest remainder; named special events and The Last Stand's repair stations keep
 * their exact count, and a store line keeps at least one store. Beacons left after the list take the neutral fallback.
 */

export type Slot =
  | "store"
  | "special"
  | "repair"
  | "items"
  | "neutral"
  | "empty"
  | "distress"
  | "hostile"
  | "quest"
  | "nebula"
  | "nebula-hostile"
  | "nebula-neutral"
  | "storm"
  | "boarder"
  | "environment";

/** One "Beacons:" bullet. `quote` is the bullet as the page prints it. `event` names a special event's page. */
export type MixLine = { slot: Slot; lo: number; hi: number; quote: string; event?: string };

const L = (slot: Slot, lo: number, hi: number, quote: string, event?: string): MixLine => ({ slot, lo, hi, quote, event });

const CIVILIAN: MixLine[] = [
  L("store", 2, 3, "2-3 stores"),
  L("items", 2, 3, "2-3 various items"),
  L("neutral", 2, 4, "2-4 neutral encounters"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("quest", 0, 2, "0-2 quests"),
  L("nebula", 0, 8, "0-8 nebula spaces"),
];
const ENGI = (neutral: MixLine): MixLine[] => [
  L("store", 2, 3, "2-3 stores"),
  L("items", 5, 5, "5 various items"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 3, "1-3 distress beacons"),
  L("quest", 1, 1, "1 quest"),
  neutral,
  L("hostile", 5, 7, "5-7 hostile encounters"),
];
const ZOLTAN: MixLine[] = [
  L("store", 2, 2, "2 stores"),
  L("empty", 1, 2, "1-2 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("nebula", 2, 6, "2-6 nebula spaces"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("quest", 0, 1, "0-1 quests"),
  L("neutral", 5, 6, "5-6 neutral encounters"),
];
const MANTIS: MixLine[] = [
  L("store", 1, 2, "1-2 stores"),
  L("empty", 2, 3, "2-3 empty beacons"),
  L("distress", 1, 3, "1-3 distress beacons"),
  L("hostile", 6, 7, "6-7 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("neutral", 6, 7, "6-7 neutral encounters"),
];
const REBEL = (quests: MixLine): MixLine[] => [
  L("store", 1, 2, "1-2 stores"),
  L("items", 1, 2, "1-2 various items"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 1, "1 boarder"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("nebula", 0, 5, "0-5 nebula spaces"),
  L("empty", 1, 2, "1-2 empty beacons"),
  quests,
  L("neutral", 5, 6, "5-6 neutral encounters"),
];
const ROCK: MixLine[] = [
  L("store", 2, 2, "2 stores"),
  L("empty", 2, 3, "2-3 empty beacons"),
  L("distress", 1, 2, "1-2 distress beacons"),
  L("hostile", 6, 8, "6-8 hostile encounters"),
  L("boarder", 1, 2, "1-2 boarders"),
  L("items", 1, 2, "1-2 various items"),
  L("quest", 0, 1, "0-1 quests"),
  L("neutral", 7, 8, "7-8 neutral encounters"),
];
const SLUG: MixLine[] = [
  L("store", 0, 1, "0-1 stores"),
  L("store", 2, 2, "2 nebula stores"),
  L("items", 0, 2, "0-2 various items"),
  L("empty", 0, 2, "0-2 empty beacons"),
  L("hostile", 1, 2, "1-2 hostile encounters"),
  L("distress", 3, 4, "3-4 distress beacons"),
  L("nebula", 2, 4, "2-4 empty nebula beacons"),
  L("nebula-hostile", 5, 7, "5-7 nebula hostile encounters"),
  L("storm", 1, 3, "1-3 storms"),
  L("nebula-neutral", 3, 5, "3-5 nebula neutral encounters"),
  L("neutral", 1, 2, "1-2 neutral encounters"),
];
const special = (name: string) => L("special", 1, 1, `1 [[${name}]] event`, name);

/** Keyed by the sector names that g.sectorName carries (wiki/sectors.ts). */
export const SECTOR_MIX: Record<string, MixLine[]> = {
  "Civilian (Starting) Sector": [
    L("nebula", 0, 4, "0-4 nebula beacons"),
    L("store", 1, 2, "1-2 stores"),
    L("items", 1, 1, "1 items / override_items events"),
    L("neutral", 2, 4, "2-4 neutral_civilian events"),
    L("empty", 1, 2, "1-2 empty beacons"),
    L("distress", 1, 2, "1-2 distress_beacon events"),
    L("hostile", 4, 6, "4-6 hostile_civilian events"),
    L("quest", 1, 1, "1 quests / override_quests event"),
    L("hostile", 2, 2, "2 hostile1 / override_hostile1 events"),
  ],
  "Civilian Sector": CIVILIAN,
  "Engi Controlled Sector": ENGI(L("neutral", 4, 6, "4-6 neutral encounters")),
  "Engi Homeworlds": [special("Engi fleet discussion"), ...ENGI(L("neutral", 5, 7, "5-7 neutral encounters"))],
  "Zoltan Controlled Sector": [special("Zoltan research facility"), ...ZOLTAN],
  "Zoltan Homeworlds": [special("Zoltan research facility"), special("Unarmed Zoltan transport"), ...ZOLTAN],
  "Abandoned Sector": [
    L("store", 2, 2, "2 stores"),
    L("empty", 1, 2, "1-2 empty beacons"),
    L("distress", 1, 2, "1-2 distress beacons"),
    L("hostile", 5, 6, "5-6 hostile encounters"),
    L("environment", 1, 2, "1-2 hostile environment"),
    L("boarder", 1, 2, "1-2 boarders"),
    L("items", 2, 4, "2-4 various items"),
    L("quest", 0, 1, "0-1 quests"),
    L("neutral", 5, 6, "5-6 neutral encounters"),
  ],
  "Mantis Controlled Sector": MANTIS,
  "Mantis Homeworlds": [special("Legendary thief KazaaakplethKilik"), ...MANTIS],
  "Pirate Controlled Sector": REBEL(L("quest", 0, 1, "0-1 quests")),
  "Rebel Controlled Sector": REBEL(L("quest", 0, 2, "0-2 quests")),
  "Rebel Stronghold": [special("Rebel shipyard"), ...REBEL(L("quest", 0, 2, "0-2 quests"))],
  "Rock Controlled Sector": ROCK,
  "Rock Homeworlds": [special("Ancient device"), special("Rock war vessel encounter"), ...ROCK],
  "Slug Controlled Nebula": SLUG,
  "Slug Home Nebula": [special("Slug Home Nebula surrender"), ...SLUG],
  "Uncharted Nebula": [
    L("store", 0, 1, "0-1 stores"),
    L("items", 1, 3, "1-3 various items"),
    L("store", 1, 1, "1 nebula store"),
    L("nebula", 4, 4, "4 empty nebula beacons"),
    L("nebula-hostile", 5, 6, "5-6 nebula hostile encounters"),
    L("nebula-neutral", 7, 8, "7-8 nebula neutral encounters"),
    L("distress", 1, 3, "1-3 distress beacons"),
  ],
  "Hidden Crystal Worlds": [
    L("store", 2, 3, "2-3 stores"),
    L("items", 2, 2, "2 various items"),
    L("empty", 2, 2, "2 empty beacons"),
    L("hostile", 6, 10, "6-10 hostile encounters"),
    L("boarder", 1, 2, "1-2 boarders"),
    L("neutral", 12, 12, "12 neutral encounters"),
  ],
  "The Last Stand": [
    L("store", 1, 1, "1 store"),
    L("repair", 3, 3, "3 repair stations"),
    L("hostile", 6, 6, "6 hostile encounters"),
    L("neutral", 7, 10, "7-10 neutral encounters"),
  ],
};

/** Hostile-group slots: a hostile cited event or a plain hostile beacon (sector-hostiles via enemy-gen). */
const HOSTILE_SLOTS = new Set<Slot>(["hostile", "nebula-hostile", "storm", "boarder", "environment"]);

// ---- Classification -------------------------------------------------------------------------------------------

export type EventClass = "hostile" | "neutral" | "distress" | "items";

/** Template:EventList HOSTILE CIVILIAN and Template:EventList HOSTILE1 (and OVERRIDE_HOSTILE1, same rows). */
const LIST_HOSTILE = [
  "Auto-ship attacking outpost", "Auto-ship fight near sun", "Pirate fight", "Pirate fight in asteroid field",
  "Pirate toll", "Pirate engine hacker", "Slaver (hostile)", "Pirate fight near sun", "Rebel fight",
  "Rebel ship attacking refueling outpost", "Rebel ship warning", "Auto-ship fight in asteroid field",
  "Auto-ship attacking civilian", "Auto-ship carrying shield virus", "Auto-ship warning", "Auto-ship fight",
];
/** Template:EventList NEUTRAL CIVILIAN, NEUTRAL EXIT and QUESTS. */
const LIST_NEUTRAL = [
  "Large asteroid field", "Auto-ship near storage station", "Auto-ship near sensor station", "Slaver (friendly)",
  "The mercenary", "Pirate briber", "Pirate ship attacking civilian", "Remote settlement", "Rebel transport ship",
  "Plagued station", "Intelligent ponies", "Refueling platform", "Pirate ship selling drones", "Rebel checkpoint",
  "Rebel ship supplying civilians", "Refugee", "Rebel fight chance", "Battlefield wreckage",
  "Encrypted federation signal", "Settlement mercenary work", "Merchant's request", "Capture the ship",
  "Escort civilians", "Mantis war camp",
];
/** Template:EventList DISTRESS BEACON. */
const LIST_DISTRESS = [
  "Asteroid belt distress", "Giant alien spiders", "Malfunctioning defense system", "Unknown disease on mining colony",
  "Fire on research station", "Crushed pirate", "Escort civilians FTL haywire", "Friendly ship out of fuel",
  "Pirate ship attacking civilian distress", "Rebel ship attacking Federation loyalists", "Refugee distress",
  "Refugee comms down", "Single life form on moon", "Pirate ship distress trap",
];
/** Template:EventList ITEMS (and OVERRIDE_ITEMS, same rows). */
const LIST_ITEMS = [
  "Free drone schematic", "Free weapon", "Free scrap with resources", "Trade fuel for drone parts",
  "Asteroid mining colony", "Refueling station", "Repair station", "Sell drone parts for scrap",
  "Sell missiles for scrap", "Crew hiring station", "Trade resources", "Trade scrap for upgrades",
  "Improve reactor for supplies",
];

/** The shape of a cited-events table row this module reads. */
export type MixEvent = {
  dest: string;
  flag: string;
  aliases: string[];
  choices: { fx: { k: string; sign?: number; n?: number }[] }[];
};

/**
 * 1. A wiki event list that names the page decides (hostile lists first: Auto-ship attacking outpost is also in
 *    NEUTRAL_EXIT, which is the exit list, not a sector list).
 * 2. Otherwise the page's own choices (INFERRED rule): no choice fights → neutral; every choice fights → hostile;
 *    some fight → hostile only when every other choice costs a resource or hull (a toll), else neutral.
 */
export function classifyEvent(ev: MixEvent): EventClass {
  const names = [ev.dest, ...ev.aliases];
  const listed = (list: string[]) => names.some((n) => list.includes(n));
  if (listed(LIST_HOSTILE)) return "hostile";
  if (listed(LIST_DISTRESS)) return "distress";
  if (listed(LIST_ITEMS)) return "items";
  if (listed(LIST_NEUTRAL)) return "neutral";
  const fights = ev.choices.map((c) => c.fx.some((f) => f.k === "fight"));
  if (!fights.some(Boolean)) return "neutral";
  const exits = ev.choices.filter((_, i) => !fights[i]);
  const costly = (c: MixEvent["choices"][number]) =>
    c.fx.some((f) => (f.k === "res" && f.sign === -1) || (f.k === "hull" && (f.n ?? 0) < 0));
  return exits.every(costly) ? "hostile" : "neutral";
}

// ---- Placement ------------------------------------------------------------------------------------------------

/**
 * The deal runs rand() on a shadow state seeded from g.seed, the sector and its name, so g.seed's own rolls
 * (combat, stores, events) are the same as before this module existed.
 */
function dealer(g: Game): Game {
  let h = 2166136261 ^ g.seed ^ Math.imul(g.sector, 0x85ebca6b);
  for (let i = 0; i < g.sectorName.length; i++) h = Math.imul(h ^ g.sectorName.charCodeAt(i), 16777619);
  return { seed: h >>> 0 || 1 } as Game;
}

function irand(g: Game, n: number): number {
  return Math.floor(rand(g) * n);
}

/** Largest remainder; `floor` lines keep at least that many. Exported for tests. */
export function scaleCounts(counts: number[], room: number, floor: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= room) return [...counts];
  const quota = counts.map((c) => (c * room) / total);
  const out = quota.map(Math.floor);
  let left = room - out.reduce((a, b) => a + b, 0);
  const order = quota.map((q, i) => i).sort((a, b) => quota[b] - out[b] - (quota[a] - out[a]) || a - b);
  for (const i of order) {
    if (left <= 0) break;
    out[i] += 1;
    left -= 1;
  }
  for (let i = 0; i < out.length; i++) {
    while (out[i] < floor[i]) {
      let big = -1;
      for (let j = 0; j < out.length; j++) if (out[j] > floor[j] && (big < 0 || out[j] > out[big])) big = j;
      if (big < 0) break;
      out[big] -= 1;
      out[i] += 1;
    }
  }
  return out;
}

/** @agent:quests-a. A Sectors-page special line ("1 [[Ancient device]] event") names this cited page. */
function specialMatch(ev: MixEvent, name: string): boolean {
  if (!name) return false;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return ev.dest === name || ev.aliases.includes(name) || ev.flag === `cited:${slug}`;
}

const mixed = new WeakMap<Beacon[], string>();

function setKind(b: Beacon, kind: BeaconKind) {
  b.kind = kind;
  b.asteroid = false;
  b.tier = kind === "hostile" || kind === "distress" ? "pool" : b.tier;
}

/**
 * Re-deals the free beacons (not start/exit/boss, no flag) of the current sector by its "Beacons:" list.
 * `events` is this sector's cited pages in their seeded order. Returns false when the page lists no beacons for
 * g.sectorName (the caller keeps its old behaviour). Running twice on the same map and sector does nothing.
 */
export function mixBeacons(g: Game, events: MixEvent[]): boolean {
  const lines = SECTOR_MIX[g.sectorName];
  if (!lines) return false;
  if (mixed.get(g.beacons) === g.sectorName) return true;
  mixed.set(g.beacons, g.sectorName);
  const r = dealer(g);

  const free = g.beacons.filter((b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && !b.flag);
  // Shuffle so slot kinds land anywhere on the map (Fisher-Yates on rand(g)).
  for (let i = free.length - 1; i > 0; i--) {
    const j = irand(r, i + 1);
    [free[i], free[j]] = [free[j], free[i]];
  }
  const drawn = lines.map((l) => l.lo + irand(r, l.hi - l.lo + 1));
  // Exact lines (special events, repair stations) are dealt first; the rest is scaled to what is left.
  const exact = lines.map((l) => l.slot === "special" || l.slot === "repair");
  let room = free.length;
  const counts = drawn.map((n, i) => {
    if (!exact[i]) return 0;
    const take = Math.min(n, room);
    room -= take;
    return take;
  });
  const restIdx = lines.map((_, i) => i).filter((i) => !exact[i]);
  const scaled = scaleCounts(
    restIdx.map((i) => drawn[i]),
    room,
    restIdx.map((i) => (lines[i].slot === "store" && drawn[i] > 0 ? 1 : 0)),
  );
  restIdx.forEach((i, k) => (counts[i] = scaled[k]));

  // Classify this sector's cited pages; a class with no slot here falls back to neutral (INFERRED).
  const slotsHere = new Set(lines.map((l, i) => (counts[i] > 0 ? l.slot : null)));
  const has = (c: EventClass) =>
    c === "hostile"
      ? [...HOSTILE_SLOTS].some((s) => slotsHere.has(s))
      : c === "neutral"
        ? slotsHere.has("neutral") || slotsHere.has("nebula-neutral")
        : slotsHere.has(c);
  const queue: Record<EventClass, MixEvent[]> = { hostile: [], neutral: [], distress: [], items: [] };
  const specials = lines.flatMap((l) => (l.event ? [l.event] : []));
  for (const ev of events) {
    if (specials.some((name) => specialMatch(ev, name)) || g.beacons.some((b) => b.flag === ev.flag)) continue;
    const c = classifyEvent(ev);
    queue[has(c) ? c : "neutral"].push(ev);
  }
  const place = (b: Beacon, ev: MixEvent) => {
    setKind(b, "event");
    b.flag = ev.flag;
    b.name = ev.dest;
  };
  const take = (c: EventClass) => queue[c].shift();
  // @agent:filler. A plain slot left when this sector's pages run out draws from the documented list for its slot
  // type (wiki/filler-events.ts). Unique rows skip this sector's own pages, which the queue may still place.
  const reserved = new Set(events.map((e) => e.flag));
  const plain = (b: Beacon, kind: BeaconKind, list: FillerList) => {
    setKind(b, kind);
    const page = drawFiller(r, list, g.beacons, reserved);
    if (page) stampFiller(b, page);
  };

  let at = 0;
  const hostileSeen = { n: 0 };
  lines.forEach((line, i) => {
    for (let k = 0; k < counts[i]; k++) {
      const b = free[at++];
      if (!b) return;
      fill(b, line);
    }
  });
  // Fallback events: a beacon still empty after the sector list takes the NEUTRAL list.
  while (at < free.length) plain(free[at++], "event", "filler");

  function fill(b: Beacon, line: MixLine) {
    switch (line.slot) {
      case "store":
        setKind(b, "store");
        return;
      case "special": {
        // @agent:quests-a. The special line names the page; a wired page matches by dest, an alias, or its cited flag.
        const ev = events.find((e) => specialMatch(e, line.event ?? ""));
        if (ev && !g.beacons.some((x) => x.flag === ev.flag)) return place(b, ev);
        // INFERRED: a special event with no wired page becomes a neutral slot.
        const n = take("neutral");
        return n ? place(b, n) : setKind(b, "event");
      }
      case "repair":
        // The Last Stand: citedSector (cited-sectors.ts) counts these flags and only tops up the missing ones.
        setKind(b, "event");
        b.flag = "last-stand-repair";
        b.name = "Federation Repair Station";
        return;
      case "items": {
        const ev = take("items");
        return ev ? place(b, ev) : plain(b, "cache", "items");
      }
      case "distress": {
        const ev = take("distress");
        return ev ? place(b, ev) : plain(b, "distress", "distress");
      }
      case "neutral": {
        const ev = take("neutral");
        // Sectors, "Fallback events": leftover beacons take the NEUTRAL (OVERRIDE_NEUTRAL) list.
        return ev ? place(b, ev) : plain(b, "event", "filler");
      }
      case "nebula-neutral": {
        const ev = take("neutral");
        return ev ? place(b, ev) : plain(b, "nebula", "nebula");
      }
      case "empty":
        // The sector's "Empty beacon (...)" page runs on arrival (filler-events.ts fillerEvent).
        setKind(b, "empty");
        return;
      case "nebula":
        // @agent:filler. "N empty nebula beacons" is the Empty nebula beacon page. Other nebula lines draw the
        // default NEBULA list (Category:Nebula Filler Events: "used to populate all the nebula beacons in Civilian
        // sectors"). INFERRED: the same list for the Zoltan and Rebel "nebula spaces" lines.
        if (/empty nebula/i.test(line.quote)) {
          setKind(b, "nebula");
          return stampEmptyNebula(b, g.sectorName);
        }
        return plain(b, "nebula", "nebula");
      case "quest":
        // Left as an unflagged event beacon: the quest stamp that runs after stampCitedEvents may claim it.
        setKind(b, "event");
        return;
      default: {
        // Hostile group. INFERRED split: every other hostile slot (the 1st, 3rd, ...) takes a hostile cited page,
        // the rest are plain hostile beacons whose ship comes from the sector's hostile list (enemy-gen.ts).
        const cited = hostileSeen.n++ % 2 === 0 ? take("hostile") : undefined;
        if (cited) return place(b, cited);
        setKind(b, "hostile");
      }
    }
  }
  return true;
}
