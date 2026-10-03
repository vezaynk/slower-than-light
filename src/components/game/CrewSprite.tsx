/**
 * One pixel figure per crew member: head shape and colour from the lineage,
 * shoulders in the uniform colour. Used by the hangar cards, the crew rail,
 * the ship tokens, and the ship sheet so a crew member reads the same everywhere.
 */
import { KIN_SKIN, uniformOf } from "@/game/crew-look";
import type { KinId } from "@/game/extras/kin";
import { pixelRuns, type PixelRun } from "@/game/gear-look";
import type { Crew } from "@/game/types";

// h = skin, d = outline, e = eye. 12 wide, 8 tall; the body below is shared.
const HEADS: Record<KinId, string[]> = {
  plain: [
    "....dddd....",
    "...dhhhhd...",
    "..dhhhhhhd..",
    "..dhehhehd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  shell: [
    ".d........d.",
    "..d......d..",
    "..dddddddd..",
    ".dhhhhhhhhd.",
    ".dheehheehd.",
    ".dhhhhhhhhd.",
    "..dddddddd..",
    "....dhhd....",
  ],
  spark: [
    "....dddd....",
    "...dheehd...",
    "..dhhhhhhd..",
    "..dhehhehd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  blade: [
    ".d........d.",
    "..d......d..",
    "..dddddddd..",
    ".dheehheehd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
    "....dhhd....",
  ],
  gel: [
    "..e......e..",
    "..d......d..",
    "..dhhhhhhd..",
    ".dhhehhehhd.",
    ".dhhhhhhhhd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
  stone: [
    "..dddddddd..",
    ".dhhhhhhhhd.",
    ".dhhhhhhhhd.",
    ".dheehheehd.",
    ".dhhhhhhhhd.",
    ".dhhhhhhhhd.",
    "..dddddddd..",
    "...dhhhhd...",
  ],
  voidlung: [
    "...dddddd...",
    "..dhhhhhhd..",
    "..dhhhhhhd..",
    "..deeeeeed..",
    "..dhhhhhhd..",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
  shard: [
    ".....dd.....",
    "....dhhd....",
    "...dhhhhd...",
    "..dhehhehd..",
    ".dhhhhhhhhd.",
    "..dhhhhhhd..",
    "...dhhhhd...",
    "....dhhd....",
  ],
};

const BODY = [
  "...duuuud...",
  "..duuuuuud..",
  ".duuuuuuuud.",
  ".duuuuuuuud.",
];

const RUNS = Object.fromEntries(
  (Object.keys(HEADS) as KinId[]).map((kin) => [kin, pixelRuns([...HEADS[kin], ...BODY])]),
) as Record<KinId, PixelRun[]>;

const INK = "#1a120c";

export function CrewSprite({
  kin,
  uniform,
  size = 24,
  className,
}: {
  kin: KinId | undefined;
  uniform: string;
  size?: number;
  className?: string;
}) {
  const id = kin ?? "plain";
  const skin = KIN_SKIN[id];
  return (
    <svg
      className={className ? `crew-sprite ${className}` : "crew-sprite"}
      viewBox="0 0 12 12"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {RUNS[id].map((r) => (
        <rect
          key={`${r.x}-${r.y}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
          fill={r.c === "h" ? skin : r.c === "u" ? uniform : INK}
        />
      ))}
    </svg>
  );
}

/** Sprite for a live crew member. */
export function CrewFace({ crew, size, className }: { crew: Crew; size?: number; className?: string }) {
  return <CrewSprite kin={crew.kin} uniform={uniformOf(crew)} size={size} className={className} />;
}
