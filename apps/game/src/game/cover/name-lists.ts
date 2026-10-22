import type { FtlExtract } from "@stl/ftldat";
import { crewNames } from "@stl/pack";
import { freshGame } from "../archive-play.ts";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { joinCrew } from "../wiki/surrender.ts";

/** Display race `joinCrew` maps back to the kin id on the `<nameList race>` attribute. */
const JOIN_AS: Record<string, string> = {
  human: "Human",
  engi: "Engi",
  energy: "Zoltan",
  mantis: "Mantis",
  slug: "Slug",
  rock: "Rock",
  crystal: "Crystal",
  anaerobic: "Lanius",
};

type NameList = { race: string; names: string[] };

function namesPath(path: string): boolean {
  const base = path.slice(Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")) + 1);
  return base.toLowerCase() === "names.xml";
}

/** English nameLists. A language attribute is a translation and is not who joins. */
function listsIn(extract: FtlExtract): NameList[] {
  const lists: NameList[] = [];
  for (const doc of extract.documents) {
    if (!namesPath(doc.path)) continue;
    const parts = doc.xml.split(/<nameList\b/i);
    for (const part of parts.slice(1)) {
      const end = part.indexOf(">");
      if (end < 0) continue;
      const head = part.slice(0, end);
      if (/\blanguage\s*=\s*["'][^"']*\S[^"']*["']/i.test(head)) continue;
      const race = /\brace\s*=\s*["']([^"']+)["']/i.exec(head)?.[1]?.trim();
      if (!race) continue;
      const body = part.slice(end + 1).split(/<\/nameList>/i)[0] ?? "";
      const names = [...body.matchAll(/<name\b[^>]*>([^<]*)<\/name>/gi)]
        .map((match) => match[1]?.trim() ?? "")
        .filter((name) => name.length > 0);
      if (names.length === 0) continue;
      lists.push({ race, names });
    }
  }
  return lists;
}

function withNames(raw: FtlExtract, merged: FtlExtract): FtlExtract | undefined {
  if (merged.documents.some((doc) => namesPath(doc.path))) return merged;
  if (raw.documents.some((doc) => namesPath(doc.path))) return raw;
  return undefined;
}

registerCoverExtra({
  id: "name-lists",
  tags: ["nameList"],
  exercise(raw, merged, problems) {
    const extract = withNames(raw, merged);
    if (!extract) return;
    for (const list of listsIn(extract)) {
      const pool = crewNames(list.race);
      if (list.names.some((entry) => !pool.includes(entry))) {
        problems.push(`${list.race} name list is not who joins`);
        continue;
      }
      const g = freshGame();
      const before = new Set(g.crew.map((crew) => crew.id));
      joinCrew(g, JOIN_AS[list.race] ?? list.race);
      const joined = g.crew.find((crew) => !before.has(crew.id));
      if (!joined || !pool.includes(joined.name)) {
        problems.push(
          `${list.race} crew joined as ${joined?.name ?? "nobody"}, which is not from that list`,
        );
      }
    }
  },
});
