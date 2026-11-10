/** One glyph from icons.ts, drawn in currentColor. A room icon uses the archive mask when it is loaded. */
import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { ICON_ROWS, ICON_SIZE, type IconName } from "@stl/sim/icons.ts";
import { pixelRuns } from "@stl/sim/gear-look.ts";
import { ICON_FILES } from "@stl/pack";
import { archiveGeneration, archiveImage, roomIconUrl, subscribeArchive } from "@/game/pack/media";

const RUNS = Object.fromEntries(
  Object.entries(ICON_ROWS).map(([name, rows]) => [name, pixelRuns(rows)]),
) as Record<IconName, ReturnType<typeof pixelRuns>>;

export function PixelIcon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const room = /(^|\s)room-icon(\s|$)/.test(className ?? "");
  const mask = generation >= 0 ? roomIconUrl(name) : undefined;
  const slot = ICON_FILES[name];
  // FTL draws a room's icon from img/icons/s_<system>_overlay.png, not the glowing dock icon.
  const overlay =
    !mask && room && generation >= 0 ? archiveImage(`img/icons/s_${name}_overlay.png`) : undefined;
  const picture = !mask && slot && generation >= 0 ? (overlay ?? archiveImage(slot)) : undefined;
  if (picture) {
    return (
      <TrimmedIcon
        key={picture}
        className={className ? `px-icon ${className}` : "px-icon"}
        src={picture}
        size={room ? undefined : size}
      />
    );
  }
  if (mask) {
    return (
      <span
        className={className ? `px-icon ${className}` : "px-icon"}
        aria-hidden="true"
        style={{
          display: "inline-block",
          backgroundColor: "currentColor",
          maskImage: `url(${mask})`,
          WebkitMaskImage: `url(${mask})`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          ...(room ? {} : { width: size, height: size }),
        }}
      />
    );
  }
  return (
    <svg
      className={className ? `px-icon ${className}` : "px-icon"}
      viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
    >
      {RUNS[name].map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          opacity={r.c === "+" ? 0.45 : 1}
        />
      ))}
    </svg>
  );
}

type Box = { x: number; y: number; w: number; h: number; nw: number; nh: number };

const solidBoxes = new Map<string, Box | null>();

/** The box of an image's solid pixels (alpha at least half), so a glow or a blank margin does not count. */
function solidBox(src: string, img: HTMLImageElement): Box | null {
  const known = solidBoxes.get(src);
  if (known !== undefined) return known;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  let box: Box | null = null;
  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (ctx && nw > 0 && nh > 0) {
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, nw, nh).data;
    let minX = nw;
    let minY = nh;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        if ((data[(y * nw + x) * 4 + 3] ?? 0) < 128) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX >= 0) box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, nw, nh };
  }
  solidBoxes.set(src, box);
  return box;
}

/**
 * Per the user: ftl.dat's icons were too small. Its dock icons are a glyph in a wide glow, and its room overlays sit
 * in the corner of a larger canvas, so the picture is scaled until its solid pixels fill the icon's square.
 * The glow past that square is cut off. `size` unset leaves the square to CSS (a room icon).
 */
function TrimmedIcon({
  src,
  size,
  className,
}: {
  src: string;
  size: number | undefined;
  className: string;
}) {
  const [box, setBox] = useState<Box | null | undefined>(() => solidBoxes.get(src));
  const square: CSSProperties =
    size === undefined ? {} : { width: size, height: size, display: "inline-block" };
  if (!box) {
    return (
      <img
        className={className}
        src={src}
        alt=""
        width={size}
        height={size}
        style={size === undefined ? undefined : square}
        draggable={false}
        onLoad={(event) => {
          const found = solidBox(src, event.currentTarget);
          if (found) setBox(found);
        }}
      />
    );
  }
  const side = Math.max(box.w, box.h);
  const pct = (n: number) => `${(n / side) * 100}%`;
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        ...square,
        overflow: "hidden",
        position: size === undefined ? undefined : "relative",
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          maxWidth: "none",
          width: pct(box.nw),
          height: pct(box.nh),
          left: pct((side - box.w) / 2 - box.x),
          top: pct((side - box.h) / 2 - box.y),
          imageRendering: "pixelated",
        }}
      />
    </span>
  );
}
