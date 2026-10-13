/**
 * Pixel pictures for weapons and drones, drawn from gear-look.ts.
 * The weapon dock, hangar, store, and drone control all use these.
 */
import { useMemo } from "react";
import {
  dronePixels,
  pixelRuns,
  weaponPixels,
  type DroneKey,
  type PixelArt as Art,
} from "@/game/gear-look";

const INK = "#14181d";

function PixelSvg({ art, height, className }: { art: Art; height: number; className: string }) {
  const runs = useMemo(() => pixelRuns(art.rows), [art]);
  const { body, trim, glow } = art.palette;
  return (
    <svg
      className={className}
      viewBox={`0 0 ${art.w} ${art.h}`}
      height={height}
      width={(height * art.w) / art.h}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {runs.map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={r.c === "b" ? body : r.c === "t" ? trim : r.c === "g" ? glow : INK}
        />
      ))}
    </svg>
  );
}

export function WeaponArt({ id, height = 28 }: { id: string; height?: number }) {
  const art = useMemo(() => weaponPixels(id), [id]);
  return <PixelSvg art={art} height={height} className="gear-art is-weapon" />;
}

export function DroneArt({ kind, height = 28 }: { kind: DroneKey | null; height?: number }) {
  const art = useMemo(() => dronePixels(kind), [kind]);
  return <PixelSvg art={art} height={height} className="gear-art is-drone" />;
}
