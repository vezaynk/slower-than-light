import { pictureForRooms, pictureXml, readGrid, type HullPicture } from "@stl/pack";
import { layoutFiles } from "./ship-layouts.ts";

/** One drawing file for a layout that already has a room grid. */
export type HullPictureFile = {
  path: string;
  xml: string;
  stem: string;
  picture: HullPicture;
  rooms: { x: number; y: number; w: number; h: number }[];
};

/** One `data/<layout>.xml` picture box for every layout file. Faction rows have no layout file. */
export function hullPictureFiles(): HullPictureFile[] {
  const files: HullPictureFile[] = [];
  for (const file of layoutFiles()) {
    const stem = layoutStem(file.path);
    const grid = readGrid(file.text);
    if (!stem || !grid) continue;
    const picture = pictureForRooms(grid.rooms);
    if (!picture) continue;
    files.push({
      path: `data/${stem}.xml`,
      xml: pictureXml(picture),
      stem,
      picture,
      rooms: grid.rooms.map((room) => ({ x: room.x, y: room.y, w: room.w, h: room.h })),
    });
  }
  return files;
}

function layoutStem(path: string): string | undefined {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash === -1 ? path : path.slice(slash + 1);
  return base.toLowerCase().endsWith(".txt") ? base.slice(0, -".txt".length) : undefined;
}
