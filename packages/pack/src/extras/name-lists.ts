import { registerArchiveExtra, type ArchiveDoc } from "../archive-extras.ts";
import { attr, elements, ownText } from "../parse.ts";

const byRace = new Map<string, string[]>();

/** Crew names for one race from data/names.xml. Empty when that race has no list. */
export function crewNames(race: string): readonly string[] {
  return byRace.get(race) ?? [];
}

/** Every English name in data/names.xml, in file order. */
export function allCrewNames(): readonly string[] {
  const names: string[] = [];
  for (const list of byRace.values()) names.push(...list);
  return names;
}

/**
 * English `<nameList>` rows in data/names.xml. A language attribute is a translation.
 * Male and female lists for one race are one pool. Sector `<nameList>` rows live in other files.
 */
function readNameLists(docs: readonly ArchiveDoc[]): void {
  byRace.clear();
  for (const source of docs) {
    if (!namesFile(source.path)) continue;
    for (const node of elements(source.doc.documentElement ?? undefined)) {
      if (node.tagName !== "nameList") continue;
      if (attr(node, "language")?.trim()) continue;
      const race = attr(node, "race")?.trim();
      if (!race) continue;
      const names = byRace.get(race) ?? [];
      for (const item of elements(node)) {
        if (item.tagName !== "name") continue;
        const text = ownText(item).trim();
        if (text) names.push(text);
      }
      if (names.length > 0) byRace.set(race, names);
    }
  }
}

function namesFile(path: string): boolean {
  const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
  return base.toLowerCase() === "names.xml";
}

registerArchiveExtra({
  id: "name-lists",
  apply(_pack, docs) {
    readNameLists(docs);
  },
});
