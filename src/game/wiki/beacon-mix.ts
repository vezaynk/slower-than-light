import { tx } from "../../i18n/index.ts";
import type { Beacon, BeaconKind, Game } from "../types.ts";
import { rand } from "../sim.ts";
// @agent:filler. Documented fallback lists for plain slots (circular import: only used inside mixBeacons).
import { drawFiller, pageForRow, stampEmptyNebula, stampFiller, type FillerList } from "./filler-events.ts";

/**
 * Wiki page "Sectors": each sector type's "Beacons:" list, and
 * "Technical details of sector generation and events": every line draws a count between its min and max
 * (inclusive), and a sector's specific events (stores, homeworld events) sit at the top so they are always present.
 *
 * makeMap places the 19-24 beacons. Each line is rolled between its minimum and maximum, inclusive, then
 * that many free beacons (everything but the start and the exit) are filled before the next line. Once those
 * beacons are full, later lines are not placed. Nothing is scaled back to feed a later line, and a store roll
 * of 0 stays 0. Beacons left after the list take the neutral fallback.
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
const special = (name: string) => L("special", 1, 1, tx("wiki.beacon-mix.1-event", { name: name }), name);

/** Keyed by the sector names that g.sectorName carries (wiki/sectors.ts). */
export const SECTOR_MIX: Record<string, MixLine[]> = {
  "Civilian (Starting) Sector": [
    L("nebula", 0, 4, "0-4 nebula beacons"),
    L("store", 1, 2, "1-2 stores"),
    L("items", 1, 1, tx("wiki.beacon-mix.1-items-override-items-events")),
    L("neutral", 2, 4, "2-4 neutral_civilian events"),
    L("empty", 1, 2, "1-2 empty beacons"),
    L("distress", 1, 2, "1-2 distress_beacon events"),
    L("hostile", 4, 6, "4-6 hostile_civilian events"),
    L("quest", 1, 1, tx("wiki.beacon-mix.1-quests-override-quests-event")),
    L("hostile", 2, 2, tx("wiki.beacon-mix.2-hostile1-override-hostile1-events")),
  ],
  "Civilian Sector": CIVILIAN,
  "Engi Controlled Sector": ENGI(L("neutral", 4, 6, "4-6 neutral encounters")),
  "Engi Homeworlds": [special(tx("wiki.beacon-mix.engi-fleet-discussion")), ...ENGI(L("neutral", 5, 7, "5-7 neutral encounters"))],
  // Wiki citations:
  // > "at one beacon per Zoltan sector" — [[Zoltan research facility#Trivia]]
  "Zoltan Controlled Sector": [special(tx("wiki.beacon-mix.zoltan-research-facility")), ...ZOLTAN],
  "Zoltan Homeworlds": [special(tx("wiki.beacon-mix.zoltan-research-facility")), special(tx("wiki.beacon-mix.unarmed-zoltan-transport")), ...ZOLTAN],
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
  "Mantis Homeworlds": [special(tx("wiki.beacon-mix.legendary-thief-kazaaakplethkilik")), ...MANTIS],
  "Pirate Controlled Sector": REBEL(L("quest", 0, 1, "0-1 quests")),
  "Rebel Controlled Sector": REBEL(L("quest", 0, 2, "0-2 quests")),
  "Rebel Stronghold": [special(tx("wiki.beacon-mix.rebel-shipyard")), ...REBEL(L("quest", 0, 2, "0-2 quests"))],
  "Rock Controlled Sector": ROCK,
  "Rock Homeworlds": [special(tx("wiki.beacon-mix.ancient-device")), special(tx("wiki.beacon-mix.rock-war-vessel-encounter")), ...ROCK],
  "Slug Controlled Nebula": SLUG,
  "Slug Home Nebula": [special(tx("wiki.beacon-mix.slug-home-nebula-surrender")), ...SLUG],
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

/**
 * unique=false boarder pages. Template:Locations: "This event can occur multiple times per sector."
 * The sector's "1-2 boarders" line is that list, so both beacons can be the same event.
 */
const REPEAT_BOARDERS: Record<string, string> = {
  "Abandoned Sector": tx("wiki.beacon-mix.boarders-humans-abandoned"),
  "Hidden Crystal Worlds": tx("wiki.beacon-mix.boarders-crystal"),
};

// ---- Classification -------------------------------------------------------------------------------------------

export type EventClass = "hostile" | "neutral" | "distress" | "items";

/** Template:EventList HOSTILE CIVILIAN and Template:EventList HOSTILE1 (and OVERRIDE_HOSTILE1, same rows). */
const LIST_HOSTILE = [
  tx("wiki.beacon-mix.auto-ship-attacking-outpost"), tx("wiki.beacon-mix.auto-ship-fight-near-sun"), tx("wiki.beacon-mix.pirate-fight"), tx("wiki.beacon-mix.pirate-fight-in-asteroid-field"),
  tx("wiki.beacon-mix.pirate-toll"), tx("wiki.beacon-mix.pirate-engine-hacker"), tx("wiki.beacon-mix.slaver-hostile"), tx("wiki.beacon-mix.pirate-fight-near-sun"), tx("wiki.beacon-mix.rebel-fight"),
  tx("wiki.beacon-mix.rebel-ship-attacking-refueling-outpost"), tx("wiki.beacon-mix.rebel-ship-warning"), tx("wiki.beacon-mix.auto-ship-fight-in-asteroid-field"),
  tx("wiki.beacon-mix.auto-ship-attacking-civilian"), tx("wiki.beacon-mix.auto-ship-carrying-shield-virus"), tx("wiki.beacon-mix.auto-ship-warning"), tx("wiki.beacon-mix.auto-ship-fight"),
];
/** Template:EventList NEUTRAL CIVILIAN, NEUTRAL EXIT and QUESTS. */
const LIST_NEUTRAL = [
  tx("wiki.beacon-mix.large-asteroid-field"), tx("wiki.beacon-mix.auto-ship-near-storage-station"), tx("wiki.beacon-mix.auto-ship-near-sensor-station"), tx("wiki.beacon-mix.slaver-friendly"),
  tx("wiki.beacon-mix.the-mercenary"), tx("wiki.beacon-mix.pirate-briber"), tx("wiki.beacon-mix.pirate-ship-attacking-civilian"), tx("wiki.beacon-mix.remote-settlement"), tx("wiki.beacon-mix.rebel-transport-ship"),
  tx("wiki.beacon-mix.plagued-station"), tx("wiki.beacon-mix.intelligent-ponies"), tx("wiki.beacon-mix.refueling-platform"), tx("wiki.beacon-mix.pirate-ship-selling-drones"), tx("wiki.beacon-mix.rebel-checkpoint"),
  tx("wiki.beacon-mix.rebel-ship-supplying-civilians"), tx("wiki.beacon-mix.refugee"), tx("wiki.beacon-mix.rebel-fight-chance"), tx("wiki.beacon-mix.battlefield-wreckage"),
  tx("wiki.beacon-mix.encrypted-federation-signal"), tx("wiki.beacon-mix.settlement-mercenary-work"), tx("wiki.beacon-mix.merchant-s-request"), tx("wiki.beacon-mix.capture-the-ship"),
  tx("wiki.beacon-mix.escort-civilians"), tx("wiki.beacon-mix.mantis-war-camp"),
];
/** Template:EventList DISTRESS BEACON. */
const LIST_DISTRESS = [
  tx("wiki.beacon-mix.asteroid-belt-distress"), tx("wiki.beacon-mix.giant-alien-spiders"), tx("wiki.beacon-mix.malfunctioning-defense-system"), tx("wiki.beacon-mix.unknown-disease-on-mining-colony"),
  tx("wiki.beacon-mix.fire-on-research-station"), tx("wiki.beacon-mix.crushed-pirate"), tx("wiki.beacon-mix.escort-civilians-ftl-haywire"), tx("wiki.beacon-mix.friendly-ship-out-of-fuel"),
  tx("wiki.beacon-mix.pirate-ship-attacking-civilian-distress"), tx("wiki.beacon-mix.refugee-distress"),
  tx("wiki.beacon-mix.refugee-comms-down"), tx("wiki.beacon-mix.single-life-form-on-moon"), tx("wiki.beacon-mix.pirate-ship-distress-trap"),
  tx("wiki.beacon-mix.slug-ship-boarding-rock-ship"),
  tx("wiki.beacon-mix.lanius-empty-distress-beacon-1"),
  tx("wiki.beacon-mix.lanius-empty-distress-beacon-2"),
  tx("wiki.beacon-mix.free-scrap-with-resources-zoltan"),
  tx("wiki.beacon-mix.engi-research-station"),
];
/** Template:EventList ITEMS (and OVERRIDE_ITEMS, same rows). */
const LIST_ITEMS = [
  tx("wiki.beacon-mix.free-drone-schematic"), tx("wiki.beacon-mix.free-weapon"), tx("wiki.beacon-mix.free-scrap-with-resources"), tx("wiki.beacon-mix.trade-fuel-for-drone-parts"),
  tx("wiki.beacon-mix.asteroid-mining-colony"), tx("wiki.beacon-mix.refueling-station"), tx("wiki.beacon-mix.repair-station"), tx("wiki.beacon-mix.sell-drone-parts-for-scrap"),
  tx("wiki.beacon-mix.sell-missiles-for-scrap"), tx("wiki.beacon-mix.crew-hiring-station"), tx("wiki.beacon-mix.trade-resources"), tx("wiki.beacon-mix.trade-scrap-for-upgrades"),
  tx("wiki.beacon-mix.improve-reactor-for-supplies"),
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

/**
 * Sectors, "Technical details of sector generation and events": each line is a minimum and a maximum, chosen
 * inclusive, then the next line. "Once all beacons on the map have been assigned events, the process stops."
 * An earlier line is not shrunk, and a later line is not given beacons that were never left.
 */
export function takeLines(rolls: number[], room: number): number[] {
  const out: number[] = [];
  let left = Math.max(0, room);
  for (const n of rolls) {
    const take = Math.min(Math.max(0, n), left);
    out.push(take);
    left -= take;
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
  // Each line is chosen, then filled, before the next. A full map does not roll the lines after it.
  const rolls: number[] = [];
  let preview = free.length;
  for (const l of lines) {
    if (preview <= 0) break;
    const n = l.lo + irand(r, l.hi - l.lo + 1);
    rolls.push(n);
    preview -= Math.min(n, preview);
  }
  const counts = takeLines(rolls, free.length);
  while (counts.length < lines.length) counts.push(0);

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
    // unique=false boarder page for this sector. It fills the boarders line, including both beacons, and is not also a one-shot neutral.
    if (ev.dest === REPEAT_BOARDERS[g.sectorName]) continue;
    const c = classifyEvent(ev);
    queue[has(c) ? c : "neutral"].push(ev);
  }
  // These openers print nebula=true. The marker for the first two is marked separately in quests.ts.
  const NEBULA_OPENERS = new Set(["Slug comm tapping", "Slug Home Nebula surrender", "Nebula wreckage"]);
  // unique=false openers. After the first copy, one extra candidate on later leftover slots of the same class.
  // A sector that forces Zoltan research as a special does not also draw a leftover copy.
  // Wiki citations:
  // > "This event can occur multiple times per game" — [[Zoltan research facility#Trivia]]
  const REPEAT_DESTS = new Set(["Escort civilians", "Engi ship attacked by Mantis ship", "Zoltan research facility"]);
  const place = (b: Beacon, ev: MixEvent, kind: BeaconKind = "event") => {
    setKind(b, NEBULA_OPENERS.has(ev.dest) ? "nebula" : kind);
    b.flag = ev.flag;
    b.name = ev.dest;
  };
  const repeatExtras = (queuedAs: EventClass) => {
    const out = [];
    for (const ev of events) {
      if (!REPEAT_DESTS.has(ev.dest) || classifyEvent(ev) !== queuedAs) continue;
      if (lines.some((l) => l.slot === "special" && specialMatch(ev, l.event ?? ""))) continue;
      // Wiki citations:
      // > "at one or two beacons per Engi sector." — [[Zoltan research facility#Trivia]]
      const cap = ev.dest === "Zoltan research facility" ? 2 : Number.POSITIVE_INFINITY;
      const placed = g.beacons.filter((x) => x.flag === ev.flag).length;
      if (placed < 1 || placed >= cap) continue;
      const page = pageForRow(ev.dest);
      if (page) out.push(page);
    }
    return out;
  };
  const take = (c: EventClass) => queue[c].shift();
  // @agent:filler. A plain slot left when this sector's pages run out draws from the documented list for its slot
  // type (wiki/filler-events.ts). Unique rows skip this sector's own pages, which the queue may still place.
  const reserved = new Set(events.map((e) => e.flag));
  const plain = (b: Beacon, kind: BeaconKind, list: FillerList, queuedAs?: EventClass) => {
    setKind(b, kind);
    const extras = queuedAs ? repeatExtras(queuedAs) : [];
    const page = drawFiller(r, list, g.beacons, reserved, extras);
    if (!page) return;
    if (extras.some((extra) => extra.flag === page.flag)) {
      b.flag = page.flag;
      b.name = page.dest;
      if (NEBULA_OPENERS.has(page.dest)) setKind(b, "nebula");
      return;
    }
    stampFiller(b, page);
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
        b.name = tx("wiki.beacon-mix.federation-repair-station");
        return;
      case "items": {
        const ev = take("items");
        return ev ? place(b, ev) : plain(b, "cache", "items");
      }
      case "distress": {
        const ev = take("distress");
        return ev ? place(b, ev, "distress") : plain(b, "distress", "distress", "distress");
      }
      case "neutral": {
        const ev = take("neutral");
        // Sectors, "Fallback events": leftover beacons take the NEUTRAL (OVERRIDE_NEUTRAL) list.
        return ev ? place(b, ev) : plain(b, "event", "filler", "neutral");
      }
      case "nebula-neutral": {
        const ev = take("neutral");
        return ev ? place(b, ev) : plain(b, "nebula", "nebula", "neutral");
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
      case "boarder": {
        // "1-2 boarders". A unique=false page fills every beacon of this line.
        const name = REPEAT_BOARDERS[g.sectorName];
        const ev = name ? events.find((e) => e.dest === name) : undefined;
        if (ev) return place(b, ev);
        return hostileBeacon();
      }
      default:
        return hostileBeacon();
    }
    function hostileBeacon() {
      // Hostile group. INFERRED split: every other hostile slot (the 1st, 3rd, ...) takes a hostile cited page,
      // the rest are plain hostile beacons whose ship comes from the sector's hostile list (enemy-gen.ts).
      const cited = hostileSeen.n++ % 2 === 0 ? take("hostile") : undefined;
      if (cited) return place(b, cited);
      setKind(b, "hostile");
    }
  }
  return true;
}
