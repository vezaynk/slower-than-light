/**
 * Authoring slug to the datafile id. Choice button ids keep the slug.
 * A lookup that still holds a slug resolves through here. An id that is already
 * a datafile id is unchanged.
 */
import { hasEvent, setEventAlias } from "@stl/pack";
import { CITED_EVENT_ROWS } from "./event-catalog.ts";
import {
  EMPTY_PAGES,
  DISTRESS,
  EXIT_ITEMS,
  EXIT_NEUTRAL,
  FILLER,
  ITEMS,
  NEBULA,
} from "./filler-lists.ts";
import { ftlEventId } from "./ftl-event-ids.ts";

export const SLUG_TO_FTL: Record<string, string> = {};

function add(slug: string, dest: string) {
  if (slug.startsWith("arrive-")) return;
  const id = ftlEventId(dest);
  if (!id || id === slug) return;
  SLUG_TO_FTL[slug] = id;
}

for (const event of CITED_EVENT_ROWS) add(event.slug, event.dest);
for (const row of [...FILLER, ...NEBULA, ...DISTRESS, ...ITEMS, ...EXIT_NEUTRAL, ...EXIT_ITEMS])
  add(row.id, row.dest);
for (const page of EMPTY_PAGES) add(page.id, page.dest);

export function packId(slug: string | undefined): string | undefined {
  if (slug == null) return slug;
  return SLUG_TO_FTL[slug] ?? slug;
}

/**
 * The id the pack stores.
 * A choice still carries the authoring slug. An id the pack already stores stays that id,
 * including a quest or surrender holder whose datafile id would otherwise differ.
 */
export function storedId(id: string | undefined): string | undefined {
  if (id == null) return id;
  if (hasEvent(id)) return id;
  return SLUG_TO_FTL[id] ?? id;
}

setEventAlias((id) => SLUG_TO_FTL[id]);
