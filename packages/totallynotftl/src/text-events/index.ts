import { TEXT as CATALOG } from "./catalog.ts";
import { TEXT as CITED } from "./cited.ts";
import { TEXT as FILLER } from "./filler.ts";
import { TEXT as QUESTS } from "./quests.ts";

const AREAS: Record<string, Record<string, string>> = {
  catalog: CATALOG,
  cited: CITED,
  filler: FILLER,
  quests: QUESTS,
};

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Every area's lines, by id. Two areas may share an id with the same words; different words are an authoring error. */
export function standInEventText(): Map<string, string> {
  const lines = new Map<string, string>();
  for (const [area, table] of Object.entries(AREAS)) {
    for (const [id, text] of Object.entries(table)) {
      const prev = lines.get(id);
      if (prev !== undefined && prev !== text)
        throw new Error(`text id ${id} has different words in two areas (${area})`);
      lines.set(id, text);
    }
  }
  return lines;
}

/**
 * The stand-in's text_events.xml. The keys are ftl.dat's; the sentences are functional and this stand-in's own.
 * The sim reads them with `eventText(id)`.
 */
export function textEventsXml(): string {
  const rows = [...standInEventText()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, text]) => `  <text name="${id}">${escapeXml(text)}</text>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<FTL>\n${rows.join("\n")}\n</FTL>\n`;
}
