import { registerArchiveExtra, type ArchiveDoc } from "../archive-extras.ts";
import { attr, elements, ownText } from "../parse.ts";

const byRace = new Map<string, string[]>();
/** `sex` of the English list a name came from. A name on both lists keeps the first. */
const sexByName = new Map<string, CrewSex>();

/** `<nameList sex>`. FTL draws a crewmember's name from the list that matches their sex. */
export type CrewSex = "male" | "female";

/** The sex of the list that holds this name, or undefined when no sexed list names it. */
export function crewNameSex(name: string): CrewSex | undefined {
  return sexByName.get(name);
}

/** Crew names for one race and sex from data/names.xml. Empty when that list is absent. */
export function crewNamesOfSex(race: string, sex: CrewSex): readonly string[] {
  return (byRace.get(race) ?? []).filter((name) => sexByName.get(name) === sex);
}

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
 * Male and female lists for one race are one pool, and each name remembers its list's `sex`.
 * A `sex` other than male or female is ignored. Sector `<nameList>` rows live in other files.
 */
function readNameLists(docs: readonly ArchiveDoc[]): void {
  byRace.clear();
  sexByName.clear();
  for (const source of docs) {
    if (!namesFile(source.path)) continue;
    for (const node of elements(source.doc.documentElement ?? undefined)) {
      if (node.tagName !== "nameList") continue;
      if (attr(node, "language")?.trim()) continue;
      const race = attr(node, "race")?.trim();
      if (!race) continue;
      const names = byRace.get(race) ?? [];
      const sex = attr(node, "sex")?.trim();
      for (const item of elements(node)) {
        if (item.tagName !== "name") continue;
        const text = ownText(item).trim();
        if (!text) continue;
        names.push(text);
        if ((sex === "male" || sex === "female") && !sexByName.has(text)) sexByName.set(text, sex);
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
