import type { FtlExtract } from "@stl/ftldat";
import { itemBlueprint } from "@stl/pack";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { freshGame } from "../archive-play.ts";
import { grantItem, itemHold, type ItemHold } from "../items.ts";
import type { Game } from "../types.ts";

function present(raw: FtlExtract): boolean {
  return raw.documents.some((doc) => doc.xml.includes("<itemBlueprint"));
}

/** Root itemBlueprint names. A repeated name is the same loaded id. */
function itemIds(raw: FtlExtract): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const doc of raw.documents) {
    if (!doc.xml.includes("<itemBlueprint")) continue;
    for (const match of doc.xml.matchAll(/<itemBlueprint\b[^>]*\bname="([^"]+)"/g)) {
      const id = match[1]?.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function stock(g: Game, hold: ItemHold): number {
  if (hold === "fuel") return g.fuel;
  if (hold === "missiles") return g.missiles;
  return g.player.parts;
}

/** Loaded item blueprints fill fuel, missiles, or drone parts. No record, no problem. */
registerCoverExtra({
  id: "items",
  tags: ["itemBlueprint"],
  exercise(raw, _merged, problems) {
    if (!present(raw)) return;
    const ids = itemIds(raw);
    if (ids.length === 0) {
      problems.push("item blueprint names were not read");
      return;
    }
    const g = freshGame();
    for (const id of ids) {
      const hold = itemBlueprint(id) ? itemHold(id) : undefined;
      if (!hold) {
        problems.push(`item blueprint ${id} was not loaded`);
        continue;
      }
      const before = stock(g, hold);
      if (!grantItem(g, id) || stock(g, hold) <= before)
        problems.push(`item blueprint ${id} did not increase ${hold}`);
    }
  },
});
