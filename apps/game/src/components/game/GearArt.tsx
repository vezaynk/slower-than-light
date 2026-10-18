/**
 * Pixel pictures for weapons and drones.
 * An archive sheet replaces the drawn picture when that file is loaded.
 */
import { useMemo, useSyncExternalStore } from "react";
import {
  dronePixels,
  pixelRuns,
  weaponPixels,
  type DroneKey,
  type PixelArt as Art,
} from "@/game/gear-look";
import {
  archiveGeneration,
  droneLayerUrl,
  subscribeArchive,
  weaponFrame,
  type SheetFrame,
  type WeaponPhase,
} from "@/game/pack/media";
import "./archive-art.css";

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
      style={{ ["--gear-glow" as string]: glow, aspectRatio: `${art.w} / ${art.h}` }}
    >
      {runs.map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          className={r.c === "g" ? "px-accent" : undefined}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={
            r.c === "b"
              ? body
              : r.c === "t"
                ? trim
                : r.c === "g"
                  ? "var(--accent-ink, var(--gear-glow))"
                  : INK
          }
        />
      ))}
    </svg>
  );
}

export function WeaponArt({
  id,
  height = 28,
  phase = "idle",
}: {
  id: string;
  height?: number;
  /** Charged and fire pick those frames. A one-frame sheet looks the same in every phase. */
  phase?: WeaponPhase;
}) {
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const frame = useMemo(() => weaponFrame(id, phase), [id, phase, generation]);
  if (frame)
    return <SheetImg frame={frame} height={height} className="gear-art is-weapon is-sheet" />;
  const art = weaponPixels(id);
  return <PixelSvg art={art} height={height} className="gear-art is-weapon" />;
}

export function DroneArt({
  kind,
  height = 28,
  powered = false,
}: {
  kind: DroneKey | null;
  height?: number;
  /** A powered drone uses the `_on` picture. */
  powered?: boolean;
}) {
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const url = useMemo(
    () => (kind ? droneLayerUrl(kind, powered ? "on" : "base") : undefined),
    [kind, powered, generation],
  );
  if (url) {
    return (
      <img className="gear-art is-drone is-sheet" alt="" src={url} height={height} width={height} />
    );
  }
  const art = dronePixels(kind);
  return <PixelSvg art={art} height={height} className="gear-art is-drone" />;
}

function SheetImg({
  frame,
  height,
  className,
}: {
  frame: SheetFrame;
  height: number;
  className: string;
}) {
  const width = Math.max(1, Math.round((height * frame.fw) / frame.fh));
  const cols = Math.max(1, frame.sheetW / frame.fw);
  const rows = Math.max(1, frame.sheetH / frame.fh);
  return (
    <span className={className} style={{ width, height }}>
      <img
        alt=""
        src={frame.url}
        width={Math.round(width * cols)}
        height={Math.round(height * rows)}
        style={{ marginLeft: -frame.col * width, marginTop: -frame.row * height }}
      />
    </span>
  );
}
