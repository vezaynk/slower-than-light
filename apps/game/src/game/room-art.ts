import { systemRoomInterior } from "./room-layout.ts";

/** Enough of a hull to find the picture a room was given. */
export type RoomArtHull = {
  grid?: { rooms: { id: number; x: number; y: number; w: number; h: number }[] };
  installs?: { id: string; room?: number; img?: string }[];
};

export type RoomArtRoom = {
  x: number;
  y: number;
  w: number;
  h: number;
  system?: string | null;
  kit?: string | null;
};

/** Computer light, in the plate's own pixels. `frames` is glow1, glow2, glow3. */
export type RoomGlowArt = {
  frames: string[];
  x: number;
  y: number;
  dir?: string;
};

export type RoomArt = {
  plate: string;
  glow?: RoomGlowArt;
};

/**
 * Interior file for a live room.
 * The install's `img` is the variant (`room_pilot_2`). A system that writes no img,
 * such as artillery, uses `room_<system>`. A hall has neither, so it draws no plate.
 */
export function roomPlateStem(
  hull: RoomArtHull | undefined,
  room: RoomArtRoom,
): string | undefined {
  const live = room.kit || room.system || "";
  if (!live) return undefined;
  const cell = hull?.grid?.rooms.find(
    (item) => item.x === room.x && item.y === room.y && item.w === room.w && item.h === room.h,
  );
  const chosen = cell
    ? hull?.installs?.find((item) => item.room === cell.id && item.id === live)
    : undefined;
  if (chosen?.img) return chosen.img;
  return `room_${live}`;
}

/**
 * Three frames of a computer glow.
 * `glow_pilot` and `img/ship/interior/glow_pilot1.png` both name glow_pilot1..3.
 * A bare glow is glow1..3.
 */
export function glowFrames(name: string | undefined): string[] {
  const stem = (name ?? "glow").trim().replace(/\.png$/i, "");
  const base = stem.replace(/\d+$/, "") || stem;
  const file = base.includes("/") ? base : `img/ship/interior/${base}`;
  return [1, 2, 3].map((frame) => `${file}${frame}.png`);
}

/** The plate and, when rooms.xml places one, the computer glow on it. */
export function roomInterior(
  hull: RoomArtHull | undefined,
  room: RoomArtRoom,
): RoomArt | undefined {
  const stem = roomPlateStem(hull, room);
  const plate = stem ? platePath(stem) : "";
  if (!plate) return undefined;
  const glow = systemRoomInterior({
    image: stem,
    system: room.kit || room.system || undefined,
  })?.glow;
  if (!glow?.image) return { plate };
  return {
    plate,
    glow: {
      frames: glowFrames(glow.image),
      x: glow.x,
      y: glow.y,
      ...(glow.dir ? { dir: glow.dir } : {}),
    },
  };
}

function platePath(stem: string): string {
  const clean = stem
    .trim()
    .replace(/\.png$/i, "")
    .replace(/^\/+/, "");
  if (!clean) return "";
  if (clean.includes("/")) return `${clean}.png`;
  return `img/ship/interior/${clean}.png`;
}
