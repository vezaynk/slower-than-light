import type { Element as XmlElement } from "@xmldom/xmldom";
import type { HullDef, HullMount, HullMountSlide, HullPicture, HullRoom } from "./types.ts";
import { readDocument } from "./parse.ts";

const SLIDES = new Set<HullMountSlide>(["up", "down", "left", "right", "no"]);

/** One archive room cell is 35 pixels. */
export const ROOM_PX = 35;

/**
 * Placeholder box for a room grid: the bounding cells plus one cell on every side.
 * Room tiles are opaque, and the plate is drawn in that same margin, so a box
 * that stops at the rooms would sit entirely underneath them.
 * A real dat box is read as authored and is not expanded here.
 * An empty room list returns undefined.
 */
export function pictureForRooms(
  rooms: readonly Pick<HullRoom, "x" | "y" | "w" | "h">[],
): HullPicture | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const room of rooms) {
    if (!(room.w > 0) || !(room.h > 0)) continue;
    minX = Math.min(minX, room.x);
    minY = Math.min(minY, room.y);
    maxX = Math.max(maxX, room.x + room.w);
    maxY = Math.max(maxY, room.y + room.h);
  }
  if (!Number.isFinite(minX)) return undefined;
  return {
    x: (minX - 1) * ROOM_PX,
    y: (minY - 1) * ROOM_PX,
    w: (maxX - minX + 2) * ROOM_PX,
    h: (maxY - minY + 2) * ROOM_PX,
  };
}

/**
 * CSS box for a base image on the room grid.
 * Archive pixels map through `ROOM_PX` onto one grid pitch.
 * `tile` is that pitch (the tile size plus the wall gap), or one pitch per axis.
 * `offset` is the layout file's `X_OFFSET` / `Y_OFFSET`. A missing offset is 0.
 */
export function pictureFrame(
  picture: HullPicture,
  offset: { x?: number; y?: number } = {},
  tile: number | { x: number; y: number } = ROOM_PX,
): { left: number; top: number; width: number; height: number } {
  const scaleX = (typeof tile === "number" ? tile : tile.x) / ROOM_PX;
  const scaleY = (typeof tile === "number" ? tile : tile.y) / ROOM_PX;
  return {
    left: (picture.x - (offset.x ?? 0)) * scaleX,
    top: (picture.y - (offset.y ?? 0)) * scaleY,
    width: picture.w * scaleX,
    height: picture.h * scaleY,
  };
}

/** One hull drawing document: the `<img>` box, and weapon mounts when that drawing has them. */
export function pictureXml(picture: HullPicture, mounts?: readonly HullMount[]): string {
  const img = `<img x="${picture.x}" y="${picture.y}" w="${picture.w}" h="${picture.h}"/>`;
  const hardpoints =
    mounts && mounts.length > 0
      ? `<weaponMounts>${mounts.map(mountTag).join("")}</weaponMounts>`
      : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<FTL>${img}${hardpoints}</FTL>\n`;
}

function mountTag(mount: HullMount): string {
  const slide = mount.slide ? ` slide="${mount.slide}"` : "";
  return `<mount x="${mount.x}" y="${mount.y}" rotate="${mount.rotate}" mirror="${mount.mirror}" gib="${mount.gib}"${slide}/>`;
}

type Drawing = { picture?: HullPicture; mounts?: HullMount[] };

/**
 * The first `<img x y w h>` in each drawing file, keyed by the file stem.
 * `data/kestral.xml` attaches to a hull whose layout is `kestral`.
 * A document with no such element is skipped. A later document with the same stem wins.
 */
export function readHullPictures(
  documents: readonly { path: string; xml: string }[],
): Map<string, HullPicture> {
  const pictures = new Map<string, HullPicture>();
  for (const [stem, drawing] of readDrawings(documents)) {
    if (drawing.picture) pictures.set(stem, drawing.picture);
  }
  return pictures;
}

/** Copies a matching picture and its weapon mounts onto each hull. A hull with no drawing file is left as it was. */
export function attachPictures(
  hulls: HullDef[] | undefined,
  documents: readonly { path: string; xml: string }[],
): void {
  if (!hulls?.length || documents.length === 0) return;
  const drawings = readDrawings(documents);
  for (const hull of hulls) {
    const drawing = drawings.get(hull.layout);
    if (!drawing) continue;
    if (drawing.picture) hull.picture = { ...drawing.picture };
    if (drawing.mounts) hull.mounts = drawing.mounts.map((mount) => ({ ...mount }));
  }
}

function readDrawings(documents: readonly { path: string; xml: string }[]): Map<string, Drawing> {
  const drawings = new Map<string, Drawing>();
  for (const doc of documents) {
    const stem = fileStem(doc.path);
    if (!stem) continue;
    let found: Drawing;
    try {
      found = drawingIn(doc.xml);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(`${doc.path}: ${detail}`);
    }
    const prev = drawings.get(stem);
    const next: Drawing = { ...prev };
    if (found.picture) next.picture = found.picture;
    if (found.mounts) next.mounts = found.mounts;
    if (next.picture || next.mounts) drawings.set(stem, next);
  }
  return drawings;
}

function drawingIn(xml: string): Drawing {
  const doc = readDocument(xml);
  const imgs = doc.getElementsByTagName("img");
  let picture: HullPicture | undefined;
  for (let i = 0; i < imgs.length; i++) {
    const node = imgs.item(i);
    if (!node) continue;
    picture = boxOf(node);
    if (picture) break;
  }
  const nodes = doc.getElementsByTagName("mount");
  const mounts: HullMount[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.item(i);
    if (!node) continue;
    const mount = mountOf(node);
    if (mount) mounts.push(mount);
  }
  return mounts.length > 0 ? { picture, mounts } : { picture };
}

function mountOf(node: XmlElement): HullMount | undefined {
  const x = intAttr(node, "x");
  const y = intAttr(node, "y");
  const gib = intAttr(node, "gib");
  const rotate = flagAttr(node, "rotate");
  const mirror = flagAttr(node, "mirror");
  if (x == null || y == null || gib == null || rotate == null || mirror == null) return undefined;
  const mount: HullMount = { x, y, rotate, mirror, gib };
  const slide = node.getAttribute("slide")?.trim();
  if (slide && SLIDES.has(slide as HullMountSlide)) mount.slide = slide as HullMountSlide;
  return mount;
}

function flagAttr(node: XmlElement, name: string): boolean | undefined {
  const raw = node.getAttribute(name);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

function intAttr(node: XmlElement, name: string): number | undefined {
  const value = numAttr(node, name);
  if (value == null || !Number.isInteger(value)) return undefined;
  return value;
}

function boxOf(node: XmlElement): HullPicture | undefined {
  const x = numAttr(node, "x");
  const y = numAttr(node, "y");
  const w = numAttr(node, "w");
  const h = numAttr(node, "h");
  if (x == null || y == null || w == null || h == null || !(w > 0) || !(h > 0)) return undefined;
  return { x, y, w, h };
}

function numAttr(node: XmlElement, name: string): number | undefined {
  const raw = node.getAttribute(name);
  if (raw == null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function fileStem(path: string): string | undefined {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash === -1 ? path : path.slice(slash + 1);
  const lower = base.toLowerCase();
  if (!lower.endsWith(".xml") || lower.endsWith(".xml.append")) return undefined;
  const stem = base.slice(0, -".xml".length);
  return stem.length > 0 ? stem : undefined;
}
