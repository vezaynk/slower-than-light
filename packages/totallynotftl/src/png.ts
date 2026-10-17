import { deflateSync } from "node:zlib";
import { ROOM_PX, type HullPicture } from "@stl/pack";

const SIG = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

type Room = { x: number; y: number; w: number; h: number };

/**
 * One pixel per room cell, including the one-cell margin.
 * Cells that are not a room and not a Chebyshev neighbour stay transparent.
 * The colour is a flat tone hashed from the layout stem.
 */
export function basePng(stem: string, picture: HullPicture, rooms: readonly Room[]): Uint8Array {
  const width = picture.w / ROOM_PX;
  const height = picture.h / ROOM_PX;
  const originX = picture.x / ROOM_PX;
  const originY = picture.y / ROOM_PX;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`Picture for ${stem} is not a whole number of rooms`);
  }
  const paint = new Uint8Array(width * height);
  for (const room of rooms) {
    for (let cy = room.y; cy < room.y + room.h; cy += 1) {
      for (let cx = room.x; cx < room.x + room.w; cx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const px = cx + dx - originX;
            const py = cy + dy - originY;
            if (px >= 0 && py >= 0 && px < width && py < height) paint[py * width + px] = 1;
          }
        }
      }
    }
  }
  const [red, green, blue] = stemColour(stem);
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const row = y * (1 + width * 4);
    for (let x = 0; x < width; x += 1) {
      if (!paint[y * width + x]) continue;
      const at = row + 1 + x * 4;
      raw[at] = red;
      raw[at + 1] = green;
      raw[at + 2] = blue;
      raw[at + 3] = 255;
    }
  }
  return encodePng(width, height, deflateSync(raw));
}

function stemColour(stem: string): [number, number, number] {
  let hash = 2166136261;
  for (let i = 0; i < stem.length; i += 1) {
    hash ^= stem.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  const sat = 0.55;
  const light = 0.42;
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
