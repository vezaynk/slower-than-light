import { registerArchiveExtra } from "../archive-extras.ts";
import { attr, elements, textOf } from "../parse.ts";

/** One root itemBlueprint: fuel, missiles, or drone parts. */
export type ItemBlueprint = {
  id: string;
  title: string;
  /** `ITEM_FUEL`, `ITEM_MISSILE`, or `ITEM_DRONE`. */
  type: string;
  /** What the supply is for. The store shows it on the fuel, missile, and drone-part chips. */
  desc?: string;
};

const items = new Map<string, ItemBlueprint>();

/** One itemBlueprint, such as fuel or missiles. */
export function itemBlueprint(id: string): ItemBlueprint | undefined {
  return items.get(id);
}

/** Every item blueprint the archive loaded, in file order. */
export function allItemBlueprints(): ItemBlueprint[] {
  return [...items.values()];
}

/** `text-<code>.xml` is a translation. English tables are `text_<kind>.xml`. */
function translationFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return /^text-[A-Za-z0-9_]+\.xml(?:\.append)?$/.test(name);
}

registerArchiveExtra({
  id: "items",
  apply(_pack, docs) {
    items.clear();
    for (const source of docs) {
      if (translationFile(source.path)) continue;
      const root = source.doc.documentElement;
      for (const node of elements(root ?? undefined)) {
        if (node.tagName !== "itemBlueprint") continue;
        const id = attr(node, "name")?.trim();
        if (!id) continue;
        const row: ItemBlueprint = {
          id,
          title: textOf(node, "title") ?? id,
          type: textOf(node, "type") ?? "",
        };
        const desc = textOf(node, "desc");
        if (desc) row.desc = desc;
        items.set(id, row);
      }
    }
  },
});
