import { deflateSync } from "node:zlib";
import { ROOM_PX, type HullPicture } from "@stl/pack";

const SIG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

type Room = { x: number; y: number; w: number; h: number };

type Mask = { width: number; height: number; paint: Uint8Array };

/**
 * One pixel per room cell, including the one-cell margin.
 * Cells that are not a room and not a Chebyshev neighbour stay transparent.
 * The colour is a flat tone hashed from the layout stem.
 */
export function basePng(stem: string, picture: HullPicture, rooms: readonly Room[]): Uint8Array {
  const mask = hullMask(stem, picture, rooms, true);
  return paintPng(mask, stemColour(stem, 0.42), 255);
}

/** A lighter wash of the same silhouette. The cloak file shares the base box. */
export function cloakPng(stem: string, picture: HullPicture, rooms: readonly Room[]): Uint8Array {
  const mask = hullMask(stem, picture, rooms, true);
  return paintPng(mask, stemColour(stem, 0.72), 170);
}

/**
 * Engines-lit hangar portrait. Brighter than the unlit hull, with a lit strip on the bottom painted row.
 * The bytes differ from `basePng` and from `cloakPng`.
 */
export function glowPortraitPng(
  stem: string,
  picture: HullPicture,
  rooms: readonly Room[],
): Uint8Array {
  const mask = hullMask(stem, picture, rooms, true);
  const colour = stemColour(stem, 0.62);
  const { width, height, paint } = mask;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (paint[y * width + x]) bottom = y;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!paint[y * width + x]) continue;
      const at = (y * width + x) * 4;
      const engine = y === bottom;
      rgba[at] = engine ? 255 : colour[0];
      rgba[at + 1] = engine ? 214 : colour[1];
      rgba[at + 2] = engine ? 64 : colour[2];
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(width, height, rgba);
}

/** A small original mark for the Esperanto locale menu. English has no file at this path. */
export function localeMenuPng(): Uint8Array {
  const size = 8;
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const at = i * 4;
    rgba[at] = 32;
    rgba[at + 1] = 168;
    rgba[at + 2] = 96;
    rgba[at + 3] = 255;
  }
  return rgbaPng(size, size, rgba);
}

/** Room cells only, darker than the hull rim. */
export function floorPng(stem: string, picture: HullPicture, rooms: readonly Room[]): Uint8Array {
  const mask = hullMask(stem, picture, rooms, false);
  return paintPng(mask, stemColour(`${stem}:floor`, 0.28), 255);
}

/** The outer ring of the silhouette. Player shields use this file. */
export function shieldPng(stem: string, picture: HullPicture, rooms: readonly Room[]): Uint8Array {
  const mask = hullMask(stem, picture, rooms, true);
  const ring = new Uint8Array(mask.paint.length);
  const { width, height, paint } = mask;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = y * width + x;
      if (!paint[at]) continue;
      const edge =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        !paint[at - 1] ||
        !paint[at + 1] ||
        !paint[at - width] ||
        !paint[at + width];
      if (edge) ring[at] = 1;
    }
  }
  return paintPng({ width, height, paint: ring }, stemColour(`${stem}:shield`, 0.7), 210);
}

/** One vertical slice of the silhouette. `index` is the piece's place in `count`. */
export function gibPng(
  stem: string,
  picture: HullPicture,
  rooms: readonly Room[],
  index: number,
  count: number,
): Uint8Array {
  const mask = hullMask(stem, picture, rooms, true);
  const slice = new Uint8Array(mask.paint.length);
  const start = Math.floor((index * mask.width) / count);
  const end = Math.floor(((index + 1) * mask.width) / count);
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = start; x < end; x += 1) {
      const at = y * mask.width + x;
      if (mask.paint[at]) slice[at] = 1;
    }
  }
  return paintPng(
    { width: mask.width, height: mask.height, paint: slice },
    stemColour(`${stem}:gib${index}`, 0.5),
    255,
  );
}

function hullMask(
  stem: string,
  picture: HullPicture,
  rooms: readonly Room[],
  margin: boolean,
): Mask {
  const width = picture.w / ROOM_PX;
  const height = picture.h / ROOM_PX;
  const originX = picture.x / ROOM_PX;
  const originY = picture.y / ROOM_PX;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Picture for ${stem} is not a whole number of rooms`);
  }
  const paint = new Uint8Array(width * height);
  const reach = margin ? 1 : 0;
  for (const room of rooms) {
    for (let cy = room.y; cy < room.y + room.h; cy += 1) {
      for (let cx = room.x; cx < room.x + room.w; cx += 1) {
        for (let dy = -reach; dy <= reach; dy += 1) {
          for (let dx = -reach; dx <= reach; dx += 1) {
            const px = cx + dx - originX;
            const py = cy + dy - originY;
            if (px >= 0 && py >= 0 && px < width && py < height) paint[py * width + px] = 1;
          }
        }
      }
    }
  }
  return { width, height, paint };
}

/** RGBA bytes, row major, no filter byte. The ship silhouettes use the mask painter. */
export function rgbaPng(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (1 + width * 4) + 1);
  }
  return encodePng(width, height, deflateSync(raw));
}

function paintPng(mask: Mask, colour: [number, number, number], alpha: number): Uint8Array {
  const { width, height, paint } = mask;
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 4);
    for (let x = 0; x < width; x += 1) {
      if (!paint[y * width + x]) continue;
      const at = row + 1 + x * 4;
      raw[at] = colour[0];
      raw[at + 1] = colour[1];
      raw[at + 2] = colour[2];
      raw[at + 3] = alpha;
    }
  }
  return encodePng(width, height, deflateSync(raw));
}

function stemColour(stem: string, light: number): [number, number, number] {
  let hash = 2166136261;
  for (let i = 0; i < stem.length; i += 1) {
    hash ^= stem.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  const sat = 0.55;
  const chroma = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const tone = light - chroma * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(tone * 255);
  };
  return [channel(0), channel(8), channel(4)];
}

function encodePng(width: number, height: number, idat: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunks = [chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array())];
  const size = SIG.length + chunks.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  out.set(SIG, 0);
  let offset = SIG.length;
  for (const part of chunks) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
