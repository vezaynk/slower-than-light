import { roomLayout, type RoomLayout } from "@stl/pack";

/**
 * Interior a system room draws from data/rooms.xml.
 * `image` is the floor picture. `glow` is the computer light on that picture.
 * `width` and `height` are set when the layout wrote them on an `<img>`.
 */
export type RoomInterior = {
  id: string;
  image?: string;
  width?: number;
  height?: number;
  glow?: RoomGlowPicture;
};

export type RoomGlowPicture = {
  image?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  dir?: string;
};

/** A system room. `image` is the blueprint img stem, such as `room_engines_2`. */
export type SystemRoomRef = {
  id?: string;
  system?: string | null;
  image?: string | null;
};

/**
 * Floor picture and computer glow for one system room.
 * Pass a roomLayout id (`pilot`, `engines_2`), a blueprint img (`room_pilot`),
 * or the room itself. The img stem wins over the system id, because that stem
 * is the variant (`room_engines_2` rather than `engines`).
 */
export function systemRoomInterior(room: string | SystemRoomRef): RoomInterior | undefined {
  if (typeof room === "string") return lookup(room);
  const image = room.image?.trim();
  if (image) {
    const fromImage = lookup(image);
    if (fromImage) return fromImage;
  }
  const system = room.system?.trim();
  if (system) {
    const fromSystem = lookup(system);
    if (fromSystem) return fromSystem;
  }
  const id = room.id?.trim();
  return id ? lookup(id) : undefined;
}

/**
 * `room_engines_2` is the file `img/ship/interior/room_engines_2.png`.
 * The roomLayout id is that stem with one leading `room_` removed.
 * A system that writes no img, such as artillery, uses the system id as the layout id.
 * computerGlow's name is the light's stem. Frames append a digit: `glow_pilot` is
 * `glow_pilot1.png`, and a glow with no name is `glow1.png`.
 */
function lookup(id: string): RoomInterior | undefined {
  const stem = stripPng(id.trim());
  if (!stem) return undefined;
  const layout = roomLayout(stem) ?? roomLayout(layoutId(stem));
  if (!layout) return undefined;
  return describe(layout);
}

function describe(layout: RoomLayout): RoomInterior {
  const tile = layout.tiles.find((item) => item.name.trim());
  const image = interiorFile(tile ? tile.name : floorStem(layout.id));
  const row: RoomInterior = { id: layout.id };
  if (image) row.image = image;
  copyBox(row, tile);
  const glow = layout.glows[0];
  if (!glow) return row;
  const light: RoomGlowPicture = { x: glow.x, y: glow.y };
  const glowImage = interiorFile(glowFrame(glow.name));
  if (glowImage) light.image = glowImage;
  if (glow.dir) light.dir = glow.dir;
  row.glow = light;
  return row;
}

function copyBox(row: RoomInterior, tile: { w?: number; h?: number } | undefined): void {
  if (!tile) return;
  if (tile.w != null && tile.w > 0) row.width = tile.w;
  if (tile.h != null && tile.h > 0) row.height = tile.h;
}

/** Blueprint stems keep a leading `room_`. A layout id gains that prefix. */
function floorStem(id: string): string {
  return id.startsWith("room_") ? id : `room_${id}`;
}

/** `room_pilot` → `pilot`. An id that is already a layout name is unchanged. */
function layoutId(stem: string): string {
  return stem.startsWith("room_") ? stem.slice("room_".length) : stem;
}

/** The first animation frame. `glow_pilot` → `glow_pilot1`. A bare `glow1` stays put. */
function glowFrame(name: string | undefined): string {
  const stem = stripPng(name?.trim() || "glow");
  return /\d$/.test(stem) ? stem : `${stem}1`;
}

function interiorFile(name: string): string {
  const stem = stripPng(name.trim().replace(/^\/+/, ""));
  if (!stem) return "";
  if (stem.includes("/")) return `${stem}.png`;
  return `img/ship/interior/${stem}.png`;
}

function stripPng(name: string): string {
  return name.replace(/\.png$/i, "");
}
