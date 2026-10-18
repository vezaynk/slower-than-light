/** Per the user: one achievement's own pixel icon (achievement-icons.ts). Locked ones are drawn grey and dim (stats.css). */
import { ACH_ICON_ROWS, ACH_ICON_SIZE } from "@/game/achievement-icons";
import { pixelRuns } from "@/game/gear-look";

const RUNS = Object.fromEntries(
  Object.entries(ACH_ICON_ROWS).map(([id, rows]) => [id, pixelRuns(rows)]),
);

export function AchievementIcon({
  id,
  earned,
  size = 32,
}: {
  id: string;
  earned: boolean;
  size?: number;
}) {
  const runs = RUNS[id];
  if (!runs) return null;
  return (
    <svg
      className={`ach-icon${earned ? " is-earned" : " is-locked"}`}
      viewBox={`0 0 ${ACH_ICON_SIZE} ${ACH_ICON_SIZE}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
    >
      {runs.map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          className={r.c === "*" ? "ach-icon-gold" : undefined}
          opacity={r.c === "+" ? 0.45 : 1}
        />
      ))}
    </svg>
  );
}
