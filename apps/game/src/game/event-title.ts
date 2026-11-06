import { eventDef, fillerList, shipEventDef } from "@stl/pack";

/** An archive id in SCREAMING_SNAKE_CASE, such as REBEL_VS_FEDERATION. No written title looks like this. */
const ARCHIVE_ID = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

/**
 * The heading an event card shows, or nothing.
 * ftl.dat events have no `<title>`, and FTL's event window shows none, so the parser falls back to the event id.
 * That id is a lookup key, not a heading: a title that is just a loaded event, ship event, or list id is dropped.
 * The stand-in's written titles ("Auto-ship near radar station") are kept.
 */
export function shownEventTitle(title: string | undefined): string | undefined {
  const text = title?.trim();
  if (!text) return undefined;
  if (ARCHIVE_ID.test(text)) return undefined;
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
