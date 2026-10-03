/** One glyph from icons.ts, drawn in currentColor. */
import { ICON_ROWS, ICON_SIZE, type IconName } from "@/game/icons";
import { pixelRuns } from "@/game/gear-look";

const RUNS = Object.fromEntries(
  Object.entries(ICON_ROWS).map(([name, rows]) => [name, pixelRuns(rows)]),
) as Record<IconName, ReturnType<typeof pixelRuns>>;

export function PixelIcon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
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
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} opacity={r.c === "+" ? 0.45 : 1} />
      ))}
    </svg>
  );
}
