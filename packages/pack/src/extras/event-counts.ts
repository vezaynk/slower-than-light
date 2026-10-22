import type { Element as XmlElement } from "@xmldom/xmldom";
import { registerArchiveExtra } from "../archive-extras.ts";
import { attr, elements } from "../parse.ts";

/**
 * Min and max repeats of one event in a sector.
 * `sector` is the eventCounts attribute. 0 is the first sector.
 */
export type EventCount = { id: string; min: number; max: number; sector: number };

const bySector = new Map<number, Map<string, EventCount>>();

function whole(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

function readCounts(root: XmlElement | undefined): void {
  for (const node of elements(root)) {
    if (node.tagName !== "eventCounts") continue;
    const sector = whole(attr(node, "sector"));
    if (sector == null) continue;
    let bucket = bySector.get(sector);
    if (!bucket) {
      bucket = new Map();
      bySector.set(sector, bucket);
    }
    for (const event of elements(node)) {
      if (event.tagName !== "event") continue;
      const id = attr(event, "name")?.trim();
      const min = whole(attr(event, "min"));
      const max = whole(attr(event, "max"));
      if (!id || min == null || max == null) continue;
      bucket.set(id, { id, min, max, sector });
    }
  }
}

/**
 * Min and max for one event id.
 * Pass the eventCounts sector (0 is the first sector) when the file has several rows.
 * With no sector, this is the earliest row. Undefined until data/newEvents.xml is loaded.
 */
export function eventCount(id: string, sector?: number): EventCount | undefined {
  if (sector != null) return bySector.get(sector)?.get(id);
  for (const bucket of bySector.values()) {
    const row = bucket.get(id);
    if (row) return row;
  }
  return undefined;
}

/** Every eventCount row for one sector depth, in file order. */
export function eventCountsIn(sector: number): readonly EventCount[] {
  return [...(bySector.get(sector)?.values() ?? [])];
}

registerArchiveExtra({
  id: "event-counts",
  apply(_pack, docs) {
    bySector.clear();
    for (const { doc } of docs) readCounts(doc.documentElement ?? undefined);
  },
});
