import type { FtlExtract } from "@stl/ftldat";
import { imageList } from "@stl/pack";
import {
  attr,
  elements,
  ownText,
  readDocument,
  tagged,
} from "../../../../../packages/pack/src/parse.ts";
import { registerCoverExtra } from "../archive-cover-extra.ts";
import { archiveImage } from "../pack/media.ts";

function present(raw: FtlExtract): boolean {
  const needle = "events_imagelist.xml";
  return raw.documents.some((doc) => doc.path.toLowerCase().endsWith(needle));
}

function translationFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1);
  return /^text-[A-Za-z0-9_]+\.xml(?:\.append)?$/.test(name);
}

type Listed = { id: string; ui: string; images: string[] };

/** The same records `imageList` loaded. A `ui` copy stays beside the default list. */
function listsIn(extract: FtlExtract): Listed[] {
  const found = new Map<string, Listed>();
  for (const source of extract.documents) {
    if (translationFile(source.path) || !source.xml.includes("<imageList")) continue;
    const doc = readDocument(source.xml);
    for (const node of tagged(doc, "imageList")) {
      const id = attr(node, "name")?.trim();
      if (!id) continue;
      const images: string[] = [];
      for (const item of elements(node)) {
        if (item.tagName !== "img") continue;
        const name = ownText(item).trim();
        if (name) images.push(name);
      }
      const ui = attr(node, "ui")?.trim() ?? "";
      found.set(`${ui}\0${id}`, { id, ui, images });
    }
  }
  return [...found.values()];
}

registerCoverExtra({
  id: "image-lists",
  tags: ["imageList"],
  exercise(raw, merged, problems) {
    if (!present(raw)) return;
    const source = present(merged) ? merged : raw;
    for (const row of listsIn(source)) {
      const images = row.ui ? row.images : imageList(row.id);
      if (!images) {
        problems.push(`image list ${row.id} was not loaded`);
        continue;
      }
      for (const name of images) {
        if (!archiveImage(name)) problems.push(`image list ${row.id} image ${name} is not shown`);
      }
    }
  },
});
