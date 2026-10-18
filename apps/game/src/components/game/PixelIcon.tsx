/** One glyph from icons.ts, drawn in currentColor. A room icon uses the archive mask when it is loaded. */
import { useSyncExternalStore } from "react";
import { ICON_ROWS, ICON_SIZE, type IconName } from "@/game/icons";
import { pixelRuns } from "@/game/gear-look";
import { archiveGeneration, roomIconUrl, subscribeArchive } from "@/game/pack/media";

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
  const mask = generation >= 0 ? roomIconUrl(name) : undefined;
  if (mask) {
    const room = /(^|\s)room-icon(\s|$)/.test(className ?? "");
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
