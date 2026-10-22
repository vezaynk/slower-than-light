import type { Element as XmlElement } from "@xmldom/xmldom";
import { registerArchiveExtra } from "../archive-extras.ts";
import { attr, elements, tagged } from "../parse.ts";

/** Console light placed on a room picture. `name` is omitted for the default glow. */
export type RoomGlow = {
  name?: string;
  x: number;
  y: number;
  dir?: string;
};

/** An authored picture inside a roomLayout. Vanilla rooms.xml does not write these. */
export type RoomTile = {
  name: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

/** One `<roomLayout>` from data/rooms.xml. The id is the `name` attribute. */
export type RoomLayout = {
  id: string;
  glows: RoomGlow[];
  tiles: RoomTile[];
};

const rooms = new Map<string, RoomLayout>();

/** One roomLayout from data/rooms.xml. A later file with the same id replaces the earlier one. */
export function roomLayout(id: string): RoomLayout | undefined {
  return rooms.get(id);
}

registerArchiveExtra({
  id: "rooms",
  apply(_pack, docs) {
    rooms.clear();
    for (const source of docs) {
      if (translationFile(source.path) || !roomsFile(source.path)) continue;
      for (const node of tagged(source.doc, "roomLayout")) {
        const row = readLayout(node);
        if (row) rooms.set(row.id, row);
      }
    }
  },
});

function roomsFile(path: string): boolean {
  return fileName(path).toLowerCase() === "rooms.xml";
}

/** `text-<code>.xml` is a translation. English tables use an underscore, not this hyphen. */
function translationFile(path: string): boolean {
  return /^text-[A-Za-z0-9_]+\.xml(?:\.append)?$/i.test(fileName(path));
}

function fileName(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return slash === -1 ? path : path.slice(slash + 1);
}

function readLayout(node: XmlElement): RoomLayout | undefined {
  const id = attr(node, "name")?.trim();
  if (!id) return undefined;
  const glows: RoomGlow[] = [];
  const tiles: RoomTile[] = [];
  for (const item of elements(node)) {
    if (item.tagName === "computerGlow") {
      const glow = readGlow(item);
      if (glow) glows.push(glow);
    } else if (item.tagName === "img") {
      const tile = readTile(item);
      if (tile) tiles.push(tile);
    }
  }
  return { id, glows, tiles };
}

function readGlow(node: XmlElement): RoomGlow | undefined {
  const x = numAttr(node, "x");
  const y = numAttr(node, "y");
  if (x == null || y == null) return undefined;
  const glow: RoomGlow = { x, y };
  const name = attr(node, "name")?.trim();
  if (name) glow.name = name;
  const dir = attr(node, "dir")?.trim();
  if (dir) glow.dir = dir;
  return glow;
}

function readTile(node: XmlElement): RoomTile | undefined {
  const name = attr(node, "name")?.trim();
  if (!name) return undefined;
  const tile: RoomTile = { name };
  const x = numAttr(node, "x");
  const y = numAttr(node, "y");
  const w = numAttr(node, "w");
  const h = numAttr(node, "h");
  if (x != null) tile.x = x;
  if (y != null) tile.y = y;
  if (w != null) tile.w = w;
  if (h != null) tile.h = h;
  return tile;
}

function numAttr(node: XmlElement, name: string): number | undefined {
  const raw = attr(node, name)?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}
