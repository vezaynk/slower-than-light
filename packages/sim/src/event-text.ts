import { archivePhrase, warnPack } from "@stl/pack";

/**
 * Event prose by archive text id. The words live in the loaded archive, never in code.
 * The id is ftl.dat's own (`text_events.xml`, `<text name>`), so ftl.dat shows its sentence and the stand-in shows
 * its functional line under the same id. A missing id warns once and paints nothing.
 */
export function eventText(id: string): string {
  const line = archivePhrase(id);
  if (line) return line;
  warnPack(`${id} is not loaded; that event text is blank.`);
  return "";
}
