import { useState } from "react";
import { archiveImage } from "@/game/pack/media";
import { roomInterior, type RoomArtHull, type RoomArtRoom } from "@/game/room-art";

const TURN: Record<string, string> = {
  up: "is-up",
  down: "is-down",
  left: "is-left",
  right: "is-right",
};

export type DrawnGlow = {
  frames: string[];
  x: number;
  y: number;
  dir?: string;
};

export type DrawnPlate = {
  src: string;
  glow?: DrawnGlow;
};

/** The plate to paint, once the archive actually has that file. Missing stays missing. */
export function drawnPlate(
  hull: RoomArtHull | undefined,
  room: RoomArtRoom,
  ready: boolean,
): DrawnPlate | undefined {
  if (!ready) return undefined;
  const art = roomInterior(hull, room);
  if (!art) return undefined;
  const src = archiveImage(art.plate);
  if (!src) return undefined;
  const frames = art.glow?.frames.flatMap((path) => {
    const url = archiveImage(path);
    return url ? [url] : [];
  });
  return {
    src,
    glow: art.glow && frames && frames.length > 0 ? { ...art.glow, frames } : undefined,
  };
}

/**
 * One room's interior picture, stretched across the room, with its computer glow.
 * The glow image faces up. rooms.xml `dir` turns it toward the console.
 */
export function RoomPlate({ src, glow }: DrawnPlate) {
  const [plate, setPlate] = useState<{ w: number; h: number } | null>(null);
  const [light, setLight] = useState<{ w: number; h: number } | null>(null);
  const frames = glow?.frames ?? [];
  const turn = TURN[(glow?.dir ?? "up").toLowerCase()] ?? "is-up";
  const placed = plate && light && glow;
  return (
    <span className="room-plate">
      <img
        className="room-plate-img"
        src={src}
        alt=""
        draggable={false}
        onLoad={(event) => {
          const w = event.currentTarget.naturalWidth;
          const h = event.currentTarget.naturalHeight;
          if (w > 0 && h > 0) setPlate({ w, h });
        }}
      />
      {glow && frames.length > 0 ? (
        <span
          className={`room-glow${frames.length === 1 ? " is-still" : ""} ${turn}`}
          style={
            placed
              ? {
                  left: `${(glow.x / plate.w) * 100}%`,
                  top: `${(glow.y / plate.h) * 100}%`,
                  width: `${(light.w / plate.w) * 100}%`,
                  height: `${(light.h / plate.h) * 100}%`,
                }
              : { visibility: "hidden" }
          }
        >
          {frames.map((url, index) => (
            <img
              key={url}
              src={url}
              alt=""
              draggable={false}
              onLoad={
                index === 0
                  ? (event) => {
                      const w = event.currentTarget.naturalWidth;
                      const h = event.currentTarget.naturalHeight;
                      if (w > 0 && h > 0) setLight({ w, h });
                    }
                  : undefined
              }
            />
          ))}
        </span>
      ) : null}
    </span>
  );
}
