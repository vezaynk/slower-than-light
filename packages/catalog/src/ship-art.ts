import {
  pictureForRooms,
  pictureXml,
  readGrid,
  ROOM_PX,
  type HullGib,
  type HullMount,
  type HullPicture,
  type HullSheet,
} from "@stl/pack";
import { LAYOUT_FILE, layoutFiles } from "./ship-layouts.ts";
import { MOUNT_IMAGES, mountsFor } from "./weapon-mounts.ts";

/** Which stem's cloak, shield, and floor pictures a hull draws. An absent layer has no picture. */
export type HullLayers = { cloak?: string; shield?: string; floor?: string };

const PLAYER_STEMS = new Set(Object.values(LAYOUT_FILE));
let layoutStemSet: Set<string> | undefined;

function layoutStems(): Set<string> {
  layoutStemSet ??= new Set(layoutFiles().flatMap((file) => layoutStem(file.path) ?? []));
  return layoutStemSet;
}

/**
 * Per the user: the stand-in mirrors how ftl.dat shares these pictures, read or not.
 * - Player A: its own cloak, shield, and floor. Player B (`_2`): A's cloak and shield, its own floor.
 *   Player C (`_3`): A's cloak, shield, and floor. ftl.dat's Anaerobic C names none.
 * - Enemy: no shield or floor. A design has its own cloak. Its pirate or elite variant names the design's cloak.
 *   A variant with no design has none, like ftl.dat's DLC pirates. Flagship stage 1 has a cloak, stages 2 and 3 none.
 */
export function hullLayers(stem: string): HullLayers {
  if (PLAYER_STEMS.has(stem)) {
    const layout = /^(.+)_([23])$/.exec(stem);
    if (!layout) return { cloak: stem, shield: stem, floor: stem };
    const a = layout[1]!;
    if (layout[2] === "2") return { cloak: a, shield: a, floor: stem };
    return a === "anaerobic_cruiser" ? {} : { cloak: a, shield: a, floor: a };
  }
  if (stem.startsWith("flagship-")) return stem === "flagship-1" ? { cloak: stem } : {};
  const variant = /^(.+)-(pirate|elite)$/.exec(stem);
  if (variant) return layoutStems().has(variant[1]!) ? { cloak: variant[1] } : {};
  return { cloak: stem };
}

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
    const measured = MOUNT_IMAGES[stem];
    const picture = measured ? { ...measured } : pictureForRooms(grid.rooms);
    if (!picture) continue;
    const mounts = mountsFor(stem);
    files.push({
      path: `data/${stem}.xml`,
      xml: pictureXml(picture, mounts, standInSheet(picture, mounts, stem)),
      stem,
      picture,
      rooms: grid.rooms.map((room) => ({ x: room.x, y: room.y, w: room.w, h: room.h })),
    });
  }
  return files;
}

/**
 * Original glow, cloak, floor, and gib placement for a stand-in drawing.
 * The silhouette has no glow shift. The image box is shared. Pieces step away from the centre.
 * A drawing with no mounts still has gib 1.
 */
export function standInSheet(
  picture: HullPicture,
  mounts?: readonly HullMount[],
  stem?: string,
): HullSheet {
  const ids = gibIds(mounts);
  const gibs: HullGib[] = ids.map((id, index) => {
    const side = index < ids.length / 2 ? -1 : 1;
    return {
      id,
      x: side * ROOM_PX,
      y: (index % 2 === 0 ? -1 : 1) * Math.round(ROOM_PX / 2),
      velocityMin: 0.35,
      velocityMax: 0.9,
      directionMin: side < 0 ? 150 : 0,
      directionMax: side < 0 ? 210 : 40,
      angularMin: -12,
      angularMax: 12,
    };
  });
  return {
    glow: stem === "kestral" ? { x: 4, y: -2 } : { x: 0, y: 0 },
    cloakOffset: { x: 0, y: 0 },
    floorOffset: { x: 0, y: 0 },
    gibs,
  };
}

function gibIds(mounts: readonly HullMount[] | undefined): number[] {
  const ids = new Set<number>();
  for (const mount of mounts ?? []) if (mount.gib > 0) ids.add(mount.gib);
  if (ids.size === 0) ids.add(1);
  return [...ids].sort((a, b) => a - b);
}

function layoutStem(path: string): string | undefined {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash === -1 ? path : path.slice(slash + 1);
  return base.toLowerCase().endsWith(".txt") ? base.slice(0, -".txt".length) : undefined;
}
