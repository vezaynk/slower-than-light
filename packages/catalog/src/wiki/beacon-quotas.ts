/**
 * Sector quotas and the event lists they draw.
 * Counts are the sectors page. Membership is the authored classification.
 * The dealer reads these quotas. It does not classify pages again.
 */
import type {
  EmptyBeaconDef,
  EventChoice,
  EventDef,
  EventEffect,
  FillerListDef,
  SectorQuota,
} from "@stl/pack";
import { ftlEventId, FTL_EVENT_FILES } from "./ftl-event-ids.ts";
import { DISTRESS, FILLER, ITEMS, NEBULA, type FillerRow } from "./filler-lists.ts";
import {
  REPEAT_BOARDERS,
  REPEAT_DESTS,
  SECTOR_MIX,
  classifyEvent,
  type EventClass,
  type Slot,
} from "./sector-mix.ts";

const CIVILIAN_EMPTY = "NOTHING";
const NEBULA_EMPTY = "NEBULA_EMPTY";
const NEBULA_EMPTY_SLUG = "NEBULA_NOTHING_SLUG";

const CLASS_SLOTS: Record<EventClass, Slot[]> = {
  hostile: ["hostile", "nebula-hostile", "storm", "environment", "boarder"],
  distress: ["distress"],
  items: ["items"],
  neutral: ["neutral", "nebula-neutral"],
};

const HOSTILE_LIST = new Set<Slot>([
  "hostile",
  "nebula-hostile",
  "storm",
  "environment",
  "boarder",
]);

function entryId(row: FillerRow): string {
  return ftlEventId(row.dest) ?? row.id;
}

function choiceFights(choices: readonly EventChoice[]): boolean {
  for (const choice of choices) {
    if (choice.fx.some((fx) => fx.k === "fight")) return true;
    if (choice.choices && choiceFights(choice.choices)) return true;
  }
  return false;
}

/** A page that starts a fight from a choice. Card buttons carry no effect list. */
export function eventHasFight(event: EventDef): boolean {
  return choiceFights(event.choices);
}

/**
 * Which event file a page is written to.
 * Boss ids win, then a wiki file citation, then a fight, then events.xml.
 * Arrivals, surrender holders, and the lock pages stay in events.xml.
 */
export function eventXmlFile(event: EventDef): string {
  if (
    event.id.startsWith("arrive-") ||
    event.id === "blue-button-reqs" ||
    event.id === "fuel-gifts"
  )
    return "data/events.xml";
  if (event.surrender && event.choices.length === 0) return "data/events.xml";
  if (event.id.startsWith("BOSS_") || event.id === "FLAGSHIP_CONSTRUCTION")
    return "data/events_boss.xml";
  const cited = FTL_EVENT_FILES[event.dest];
  if (cited === "dlcEvents_anaerobic.xml") return "data/dlcEvents_anaerobic.xml";
  if (cited === "events_boss.xml") return "data/events_boss.xml";
  if (cited === "events_ships.xml") return "data/events_ships.xml";
  if (eventHasFight(event)) return "data/events_ships.xml";
  return "data/events.xml";
}

function asMix(event: EventDef) {
  return {
    dest: event.dest,
    flag: event.flag,
    aliases: event.aliases,
    choices: event.choices.map((choice) => ({
      fx: choice.fx.map((fx) => mixFx(fx)),
    })),
  };
}

function mixFx(fx: EventEffect): { k: string; sign?: number; n?: number } {
  if (fx.k === "res") return { k: fx.k, sign: fx.sign };
  if (fx.k === "hull") return { k: fx.k, n: fx.n };
  return { k: fx.k };
}

function emptyId(sectorId: string, empties: readonly EmptyBeaconDef[]): string {
  const plain = empties.filter((page) => !page.nebula);
  const hit = plain.find((page) => page.sectors.includes(sectorId)) ?? plain[0];
  return hit?.id ?? CIVILIAN_EMPTY;
}

function nebulaEmptyId(sectorId: string): string {
  return sectorId.startsWith("SLUG_") ? NEBULA_EMPTY_SLUG : NEBULA_EMPTY;
}

function listName(sectorId: string, slot: Slot, index: number): string {
  return `${sectorId}__${slot}__${index}`;
}

function storyUnique(dest: string): boolean {
  return !REPEAT_DESTS.has(dest);
}

function pushList(
  lists: FillerListDef[],
  quotas: SectorQuota[],
  id: string,
  entries: { id: string; unique: boolean }[],
  min: number,
  max: number,
) {
  lists.push({ id, entries });
  quotas.push({ id, min, max });
}

function hostileEntries(
  sectorId: string,
  pages: readonly EventDef[],
): { id: string; unique: boolean }[] {
  const seen = new Set<string>();
  const entries: { id: string; unique: boolean }[] = [];
  for (const event of pages) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    entries.push({ id: event.id, unique: storyUnique(event.dest) });
  }
  entries.push({ id: `${sectorId}__HOSTILE_SHIP`, unique: false });
  return entries;
}

function mixedEntries(
  pages: readonly EventDef[],
  fillers: readonly FillerRow[],
  sectorIds: ReadonlySet<string>,
): { id: string; unique: boolean }[] {
  const seen = new Set<string>();
  const entries: { id: string; unique: boolean }[] = [];
  for (const event of pages) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    entries.push({ id: event.id, unique: storyUnique(event.dest) });
  }
  for (const row of fillers) {
    const id = entryId(row);
    // The shared filler list names pages this sector already places on another line.
    // Those stay on that line. A repeatable filler copy would stamp the same story flag again.
    if (seen.has(id) || sectorIds.has(id)) continue;
    seen.add(id);
    entries.push({ id, unique: row.unique });
  }
  return entries;
}

/**
 * One quota per mix line, plus a list when the line draws from several pages.
 * A named event (store, special, repair, quest, empty, a repeating boarder) is the quota id.
 */
export function sectorQuotaPack(
  events: readonly EventDef[],
  empties: readonly EmptyBeaconDef[],
): { quotas: Map<string, SectorQuota[]>; lists: FillerListDef[] } {
  const quotas = new Map<string, SectorQuota[]>();
  const lists: FillerListDef[] = [];
  const placed = events.filter(
    (event) =>
      !event.id.startsWith("arrive-") &&
      event.id !== "blue-button-reqs" &&
      event.id !== "fuel-gifts" &&
      !(event.surrender && event.choices.length === 0) &&
      event.sectors.length > 0,
  );

  for (const [sectorId, lines] of Object.entries(SECTOR_MIX)) {
    const mine = placed.filter((event) => event.sectors.includes(sectorId));
    const specials = new Set(lines.flatMap((line) => (line.event ? [line.event] : [])));
    const boarderDest = REPEAT_BOARDERS[sectorId];
    const pool = mine.filter((event) => !specials.has(event.dest) && event.dest !== boarderDest);
    const present = new Set(lines.map((line) => line.slot));
    const bySlot = new Map<Slot, EventDef[]>();
    for (const event of pool) {
      const kind = classifyEvent(asMix(event));
      const wanted = CLASS_SLOTS[kind].filter((slot) => present.has(slot));
      const home =
        wanted.length > 0
          ? wanted
          : (["neutral", "nebula-neutral"] as Slot[]).filter((slot) => present.has(slot));
      for (const slot of home) {
        const bag = bySlot.get(slot) ?? [];
        bag.push(event);
        bySlot.set(slot, bag);
      }
    }

    const sectorIds = new Set(mine.map((event) => event.id));
    const sectorQuotas: SectorQuota[] = [];
    lines.forEach((line, index) => {
      const min = line.lo;
      const max = line.hi;
      if (line.slot === "store") {
        sectorQuotas.push({ id: "STORE", min, max });
        return;
      }
      if (line.slot === "special") {
        const name = line.event ?? "";
        sectorQuotas.push({ id: ftlEventId(name) ?? name, min, max });
        return;
      }
      if (line.slot === "repair") {
        sectorQuotas.push({ id: "BOSS_REPAIR_STATION", min, max });
        return;
      }
      if (line.slot === "quest") {
        sectorQuotas.push({ id: "QUEST", min, max });
        return;
      }
      if (line.slot === "empty") {
        sectorQuotas.push({ id: emptyId(sectorId, empties), min, max });
        return;
      }
      if (line.slot === "nebula") {
        sectorQuotas.push({
          id: /empty nebula/i.test(line.quote) ? nebulaEmptyId(sectorId) : "NEBULA",
          min,
          max,
        });
        return;
      }
      if (line.slot === "boarder" && boarderDest) {
        sectorQuotas.push({ id: ftlEventId(boarderDest) ?? boarderDest, min, max });
        return;
      }
      const id = listName(sectorId, line.slot, index);
      if (HOSTILE_LIST.has(line.slot)) {
        const pages = bySlot.get(line.slot) ?? [];
        pushList(lists, sectorQuotas, id, hostileEntries(sectorId, pages), min, max);
        return;
      }
      const fillers =
        line.slot === "distress"
          ? DISTRESS
          : line.slot === "items"
            ? ITEMS
            : line.slot === "nebula-neutral"
              ? NEBULA
              : FILLER;
      pushList(
        lists,
        sectorQuotas,
        id,
        mixedEntries(bySlot.get(line.slot) ?? [], fillers, sectorIds),
        min,
        max,
      );
    });
    quotas.set(sectorId, sectorQuotas);
  }
  return { quotas, lists };
}
