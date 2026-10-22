import { registerArchiveExtra } from "../archive-extras.ts";
import type { ArchiveDoc } from "../archive-extras.ts";
import { attr, elements, ownText, tagged } from "../parse.ts";

const byId = new Map<string, string[]>();

/** Image names for one events_imageList.xml list. A `ui` copy does not replace this. */
export function imageList(id: string): readonly string[] | undefined {
  return byId.get(id);
}

function translationFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return /^text-[A-Za-z0-9_]+\.xml(?:\.append)?$/.test(name);
}

/**
 * Tablet pictures are a second list with `ui="ipad"`. They stay out of `imageList`:
 * `archiveImage` already looks under `img/ipad/` when the tablet variant is on.
 * A later list with the same name and the same `ui` replaces the earlier one.
 */
function readImageLists(docs: readonly ArchiveDoc[]): void {
  byId.clear();
  for (const source of docs) {
    if (translationFile(source.path)) continue;
    for (const node of tagged(source.doc, "imageList")) {
      const id = attr(node, "name")?.trim();
      if (!id || attr(node, "ui")?.trim()) continue;
      const images: string[] = [];
      for (const item of elements(node)) {
        if (item.tagName !== "img") continue;
        const name = ownText(item).trim();
        if (name) images.push(name);
      }
      byId.set(id, images);
    }
  }
}

registerArchiveExtra({
  id: "image-lists",
  apply(_pack, docs) {
    readImageLists(docs);
  },
});
