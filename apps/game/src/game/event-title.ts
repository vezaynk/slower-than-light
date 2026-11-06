import { eventDef, fillerList, shipEventDef } from "@stl/pack";

/**
 * The heading an event card shows, or nothing.
 * ftl.dat events have no `<title>` (its 163 title tags are all on item blueprints), and FTL's event window shows
 * none, so the parser falls back to the event id. That id is an internal, English-only key, and some give the
 * twist away (LANIUS_DISTRESS_TRAP), so a title that is exactly a loaded event, ship event, or list id is dropped.
 * The stand-in's written titles ("Auto-ship near radar station") are kept.
 */
export function shownEventTitle(title: string | undefined): string | undefined {
  const text = title?.trim();
  if (!text) return undefined;
  // eventDef also matches a written title, so only an exact id counts.
  if (
    eventDef(text)?.id === text ||
    shipEventDef(text)?.id === text ||
    fillerList(text)?.id === text
  ) {
    return undefined;
  }
  return text;
}
