import type { Beacon, BeaconKind, Game } from "../types.ts";
import { rand } from "../sim.ts";
import {
  allEmptyBeacons,
  allEvents,
  eventCount,
  eventCountsIn,
  eventDef,
  fillerList,
  sectorDef,
} from "@stl/pack";
import { drawFiller, stampFiller } from "./filler-events.ts";

/** Sectors, Zoltan: the research facility is placed at most twice. */
const REPEAT_CAP: Record<string, number> = { "Zoltan research facility": 2 };

/**
 * The deal runs rand() on a shadow state seeded from g.seed, the sector and its id, so g.seed's own rolls
 * (combat, stores, events) are the same as before this module existed.
 */
function dealer(g: Game): Game {
  let h = 2166136261 ^ g.seed ^ Math.imul(g.sector, 0x85ebca6b);
  for (let i = 0; i < g.sectorId.length; i++) h = Math.imul(h ^ g.sectorId.charCodeAt(i), 16777619);
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

const mixed = new WeakMap<Beacon[], string>();
/** How many times the latest mix placed each eventCount id. */
const dealt = new Map<string, number>();

/** Placements of one eventCount id in the latest mix. Zero when that mix did not deal it. */
export function lastEventDeals(id: string): number {
  return dealt.get(id) ?? 0;
}

const NEBULA_OPENERS = new Set([
  "Slug comm tapping",
  "Slug Home Nebula surrender",
  "Nebula wreckage",
]);

const SHARED_LISTS = new Set([
  "FILLER",
  "NEBULA",
  "DISTRESS",
  "ITEMS",
  "EXIT_NEUTRAL",
  "EXIT_ITEMS",
]);

function setKind(b: Beacon, kind: BeaconKind) {
  b.kind = kind;
  b.asteroid = false;
  b.tier = kind === "hostile" || kind === "distress" ? "pool" : b.tier;
}

function storyIds(sectorId: string): Set<string> {
  const ids = new Set<string>();
  for (const event of allEvents()) {
    if (event.id.startsWith("arrive-") || event.id.startsWith("filler-")) continue;
    if (!event.sectors.includes(sectorId)) continue;
    ids.add(event.id);
  }
  return ids;
}

function slotOf(id: string): string | undefined {
  const parts = id.split("__");
  if (parts.length !== 3) return undefined;
  return parts[1];
}

function placeStory(b: Beacon, id: string, kind: BeaconKind) {
  const event = eventDef(id);
  const dest = event?.dest ?? id;
  setKind(b, NEBULA_OPENERS.has(dest) ? "nebula" : kind);
  b.flag = id;
  b.name = dest;
}

function placeFiller(b: Beacon, id: string, kind: BeaconKind) {
  const event = eventDef(id);
  setKind(b, kind);
  b.flag = `filler:${id}`;
  b.name = event?.dest ?? id;
}

/**
 * Re-deals the free beacons of the current sector from its loaded quotas.
 * Returns false when the sector has no quotas. Running twice on the same map and sector does nothing.
 * `events` is ignored: membership is the quota lists.
 */
export function mixBeacons(g: Game, _events?: unknown): boolean {
  const quotas = sectorDef(g.sectorId)?.quotas;
  if (!quotas?.length) return false;
  if (mixed.get(g.beacons) === g.sectorId) return true;
  mixed.set(g.beacons, g.sectorId);
  dealt.clear();
  const r = dealer(g);
  const story = storyIds(g.sectorId);
  const used = new Set<string>();
  // eventCounts sector="0" is the first sector. Game.sector starts at 1.
  const depth = g.sector - 1;

  const free = g.beacons.filter(
    (b) => b.kind !== "start" && b.kind !== "exit" && b.kind !== "boss" && !b.flag,
  );
  for (let i = free.length - 1; i > 0; i--) {
    const j = irand(r, i + 1);
    const swap = free[i];
    free[i] = free[j]!;
    free[j] = swap!;
  }

  let at = 0;
  for (const quota of quotas) {
    if (at >= free.length) break;
    const n = quota.min + irand(r, quota.max - quota.min + 1);
    let take = Math.min(Math.max(0, n), free.length - at);
    const bound = eventCount(quota.id, depth);
    if (bound) take = Math.min(take, Math.max(0, bound.max - (dealt.get(quota.id) ?? 0)));
    for (let k = 0; k < take; k++) {
      const beacon = free[at++];
      if (!beacon) return true;
      placeQuota(beacon, quota.id, g, r, story, used);
      if (bound) dealt.set(quota.id, (dealt.get(quota.id) ?? 0) + 1);
    }
  }
  // A count can demand more than the sector quota left, when beacons are still free.
  for (const row of eventCountsIn(depth)) {
    const bound = eventCount(row.id, depth);
    if (!bound) continue;
    let have = dealt.get(row.id) ?? 0;
    while (have < bound.min && have < bound.max && at < free.length) {
      const beacon = free[at++];
      if (!beacon) break;
      placeQuota(beacon, row.id, g, r, story, used);
      have += 1;
      dealt.set(row.id, have);
    }
  }
  while (at < free.length) {
    const beacon = free[at++];
    if (!beacon) break;
    placeShared(beacon, "FILLER", g, r, "event");
  }
  return true;
}

function placeQuota(
  b: Beacon,
  id: string,
  g: Game,
  r: Game,
  story: Set<string>,
  used: Set<string>,
) {
  // STORE, STORE_ENGI, STORE_MANTIS…: a page with <store/> is a store beacon.
  if (eventDef(id)?.store) {
    setKind(b, "store");
    return;
  }
  if (id === "QUEST") {
    setKind(b, "event");
    return;
  }
  if (id === "BOSS_REPAIR_STATION") {
    setKind(b, "event");
    b.flag = id;
    b.name = "Federation Repair Station";
    return;
  }
  const empty = allEmptyBeacons().find((page) => page.id === id);
  if (empty) {
    setKind(b, empty.nebula ? "nebula" : "empty");
    b.name = empty.dest;
    if (empty.nebula) b.flag = `filler:${empty.id}`;
    return;
  }
  if (SHARED_LISTS.has(id)) {
    const kind: BeaconKind =
      id === "NEBULA"
        ? "nebula"
        : id === "DISTRESS"
          ? "distress"
          : id === "ITEMS"
            ? "cache"
            : "event";
    placeShared(b, id, g, r, kind);
    return;
  }
  if (fillerList(id)) {
    placeFromList(b, id, g, r, story, used);
    return;
  }
  placeStory(b, id, "event");
}

function placeShared(b: Beacon, id: string, g: Game, r: Game, kind: BeaconKind) {
  const page = drawFiller(r, id, g.beacons);
  if (!page) {
    setKind(b, kind);
    return;
  }
  setKind(b, kind);
  stampFiller(b, page);
}

function placeFromList(
  b: Beacon,
  id: string,
  g: Game,
  r: Game,
  story: Set<string>,
  used: Set<string>,
) {
  const list = fillerList(id);
  if (!list) return;
  const slot = slotOf(id);
  const entries = list.entries.filter((entry) => {
    if (entry.id.endsWith("__HOSTILE_SHIP")) return true;
    const dest = eventDef(entry.id)?.dest;
    const cap = dest ? REPEAT_CAP[dest] : undefined;
    if (cap != null) return g.beacons.filter((beacon) => beacon.flag === entry.id).length < cap;
    if (!entry.unique) return true;
    if (used.has(entry.id)) return false;
    return !g.beacons.some(
      (beacon) => beacon.flag === entry.id || beacon.flag === `filler:${entry.id}`,
    );
  });
  if (entries.length === 0) {
    setKind(b, slot === "distress" ? "distress" : "event");
    return;
  }
  const entry = entries[irand(r, entries.length)]!;
  if (entry.unique) used.add(entry.id);
  if (entry.id.endsWith("__HOSTILE_SHIP")) {
    setKind(b, "hostile");
    return;
  }
  if (!story.has(entry.id)) {
    const kind: BeaconKind =
      slot === "distress"
        ? "distress"
        : slot === "items"
          ? "cache"
          : slot === "nebula-neutral"
            ? "nebula"
            : "event";
    placeFiller(b, entry.id, kind);
    return;
  }
  const kind: BeaconKind = slot === "distress" ? "distress" : "event";
  placeStory(b, entry.id, kind);
}
