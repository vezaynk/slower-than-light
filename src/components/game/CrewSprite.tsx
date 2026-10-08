/**
 * One pixel figure per crew member: head shape and colour from the lineage,
 * shoulders in the uniform colour. Used by the hangar cards, the crew rail,
 * the ship tokens, and the ship sheet so a crew member reads the same everywhere.
 */
import { KIN_SKIN, uniformOf } from "@/game/crew-look";
import type { KinId } from "@/game/extras/kin";
import { pixelRuns, type PixelRun } from "@/game/gear-look";
import type { Crew } from "@/game/types";
import "./crew-motion.css";

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

/** Slide a body row. Dots stay empty so the head rows above are never touched. */
function shiftRow(row: string, dx: number): string {
  if (dx === 0) return row;
  const out = Array.from({ length: row.length }, () => ".");
  for (let i = 0; i < row.length; i++) {
    if (row[i] === ".") continue;
    const j = i + dx;
    if (j >= 0 && j < row.length) out[j] = row[i];
  }
  return out.join("");
}

/** Lower two body rows step left, center, or right. The head stays on HEADS. */
function legPose(dx: number): string[] {
  return [BODY[0], BODY[1], shiftRow(BODY[2], dx), shiftRow(BODY[3], dx)];
}

/**
 * Shoulder grows `reach` sleeve pixels to the right (the unflipped facing).
 * The outline stays on the tip. Reach 1 is the guard; reach 2 is the blow.
 */
function armReach(reach: number): string[] {
  const rows = BODY.map((row) => row.split(""));
  const shoulder = rows[0];
  let edge = -1;
  for (let i = 0; i < shoulder.length; i++) if (shoulder[i] !== ".") edge = i;
  if (edge < 0) return BODY;
  for (let i = 0; i < reach && edge + i < shoulder.length; i++) shoulder[edge + i] = "u";
  const tip = edge + reach;
  if (tip < shoulder.length) shoulder[tip] = "d";
  return rows.map((cells) => cells.join(""));
}

export type CrewPose = "idle" | "walk" | "fight";

/** Walk: together, step left, together, step right. Fight: guard, guard, blow, blow. */
const POSE_BODY: Record<CrewPose, string[][]> = {
  idle: [BODY, BODY, BODY, BODY],
  walk: [legPose(0), legPose(-1), legPose(0), legPose(1)],
  fight: [armReach(1), armReach(1), armReach(2), armReach(2)],
};

const RUNS = Object.fromEntries(
  (Object.keys(HEADS) as KinId[]).map((kin) => [
    kin,
    Object.fromEntries(
      (Object.keys(POSE_BODY) as CrewPose[]).map((pose) => [
        pose,
        POSE_BODY[pose].map((body) => pixelRuns([...HEADS[kin], ...body])),
      ]),
    ),
  ]),
) as Record<KinId, Record<CrewPose, PixelRun[][]>>;

const INK = "#1a120c";

function frameIndex(frame: number): number {
  const i = Math.floor(frame);
  return ((i % 4) + 4) % 4;
}

export function CrewSprite({
  kin,
  uniform,
  size = 24,
  className,
  pose = "idle",
  frame = 0,
}: {
  kin: KinId | undefined;
  uniform: string;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
}) {
  const id = kin ?? "plain";
  const skin = KIN_SKIN[id];
  const runs = RUNS[id][pose][frameIndex(frame)];
  return (
    <svg
      className={className ? `crew-sprite ${className}` : "crew-sprite"}
      viewBox="0 0 12 12"
      width={size}
      height={size}
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
          fill={r.c === "h" ? skin : r.c === "u" ? uniform : INK}
        />
      ))}
    </svg>
  );
}

/** Sprite for a live crew member. Idle frame 0 matches the hangar and the crew rail. */
export function CrewFace({
  crew,
  size,
  className,
  pose = "idle",
  frame = 0,
}: {
  crew: Crew;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
}) {
  return <CrewSprite kin={crew.kin} uniform={uniformOf(crew)} size={size} className={className} pose={pose} frame={frame} />;
}
