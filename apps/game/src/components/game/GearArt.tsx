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
  weaponChargeFrame,
  weaponFrame,
  type SheetFrame,
  type WeaponPhase,
} from "@/game/pack/media";
import { droneIconSide, weaponSlotBox } from "@/game/sprite-scale";
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
  pixelScale,
}: {
  id: string;
  height?: number;
  /** Charged and fire pick those frames. A one-frame sheet looks the same in every phase. */
  phase?: WeaponPhase;
  /**
   * Hull hardpoint. One archive pixel is this many screen pixels, and the sheet stays
   * in its own orientation (the mount turns it). A slot omits this and uses weaponSlotBox.
   */
  pixelScale?: { x: number; y: number };
}) {
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const frame = useMemo(() => weaponFrame(id, phase), [id, phase, generation]);
  const charge = useMemo(
    () => (phase === "charged" ? weaponChargeFrame(id) : undefined),
    [id, phase, generation],
  );
  if (frame && pixelScale) {
    return (
      <WeaponSheets
        frame={frame}
        charge={charge}
        frameW={frame.fw * pixelScale.x}
        frameH={frame.fh * pixelScale.y}
        chargeW={charge ? charge.fw * pixelScale.x : 0}
        chargeH={charge ? charge.fh * pixelScale.y : 0}
      />
    );
  }
  if (frame) {
    const box = weaponSlotBox(frame.fw, frame.fh, height);
    const scale = box.w / Math.max(frame.fw, frame.fh);
    const sheets = (
      <WeaponSheets
        frame={frame}
        charge={charge}
        frameW={frame.fw * scale}
        frameH={frame.fh * scale}
        chargeW={charge ? charge.fw * scale : 0}
        chargeH={charge ? charge.fh * scale : 0}
      />
    );
    if (!box.turned) return sheets;
    // The sheet points up. A clockwise quarter turn points the barrel right, and the
    // shift brings that turned picture back into the slot box.
    return (
      <span
        className="gear-art is-weapon is-sheet is-turned"
        style={{ width: box.w, height: box.h }}
      >
        <span
          className="sheet-turn"
          style={{
            width: box.h,
            height: box.w,
            transform: `translateX(${box.w}px) rotate(90deg)`,
          }}
        >
          {sheets}
        </span>
      </span>
    );
  }
  const art = weaponPixels(id);
  return <PixelSvg art={art} height={height} className="gear-art is-weapon" />;
}

function WeaponSheets({
  frame,
  charge,
  frameW,
  frameH,
  chargeW,
  chargeH,
}: {
  frame: SheetFrame;
  charge: SheetFrame | undefined;
  frameW: number;
  frameH: number;
  chargeW: number;
  chargeH: number;
}) {
  if (charge) {
    return (
      <span
        className="gear-art is-weapon is-sheet is-charged"
        style={{ width: frameW, height: frameH }}
      >
        <SheetImg frame={frame} width={frameW} height={frameH} className="sheet-frame" />
        <SheetImg frame={charge} width={chargeW} height={chargeH} className="gear-charge" />
      </span>
    );
  }
  return (
    <SheetImg
      frame={frame}
      width={frameW}
      height={frameH}
      className="gear-art is-weapon is-sheet"
    />
  );
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
    // The craft is the centre of a sheet about twice as wide. Clip to the icon box.
    const side = droneIconSide(height);
    const inset = (height - side) / 2;
    return (
      <span className="gear-art is-drone is-sheet" style={{ width: height, height }}>
        <img
          alt=""
          src={url}
          width={side}
          height={side}
          style={{ marginLeft: inset, marginTop: inset }}
        />
      </span>
    );
  }
  const art = dronePixels(kind);
  return <PixelSvg art={art} height={height} className="gear-art is-drone" />;
}

function SheetImg({
  frame,
  width,
  height,
  className,
}: {
  frame: SheetFrame;
  width: number;
  height: number;
  className: string;
}) {
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
