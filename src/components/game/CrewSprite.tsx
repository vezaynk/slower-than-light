/**
 * One pixel figure per crew member: head shape and colour from the lineage,
 * shoulders in the uniform colour. Used by the hangar cards, the crew rail,
 * the ship tokens, and the ship sheet so a crew member reads the same everywhere.
 */
import type { CSSProperties } from "react";
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

export type CrewPose = "idle" | "walk" | "fight" | "work";

/**
 * Idle breathes in place. Work taps the console (the right-hand station). Fight is one swing:
 * recover, coil, mid, then the blow. The hit lands as swing wraps, so the long arm is frame 3.
 * u sleeve, h fist. Rows may run past 12; the sprite overflows so the blow clears the tile.
 * Every frame keeps the same top row, so the figure does not hop.
 */
const POSE_BODY: Record<CrewPose, string[][]> = {
  idle: [
    BODY,
    ["...duuuud...", "..duuuuuud..", "duuuuuuuuuud", "duuuuuuuuuud"],
    ["..duuuuuud..", ".duuuuuuuud.", "duuuuuuuuuud", "duuuuuuuuuud"],
    ["....duud....", "...duuuud...", "..duuuuuud..", "..duuuuuud.."],
  ],
  walk: [legPose(0), legPose(-1), legPose(0), legPose(1)],
  fight: [
    BODY,
    ["..duuuud....", ".duuuuuhd...", "duuuuuuud...", ".duuuuuud..."],
    ["...duuuuuud.", "..duuuuuuhd.", ".duuuuuuuud.", "..duuuuuud.."],
    ["....duuuuuuuuh", "...duuuuuuuuud", "..duuuuuuuud.", "...duuuuud..."],
  ],
  work: [
    BODY,
    ["...duuuuuhd.", "..duuuuuuud.", ".duuuuuuuud.", ".duuuuuuuud."],
    ["...duuuud...", "..duuuuud...", ".duuuuuuuud.", ".duuuuuuuud."],
    ["...duuuuud..", "..duuuuuuhd.", ".duuuuuuuud.", "..duuuuuud.."],
  ],
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

/** Spreads neighbours across the idle and terminal cycles so a room does not tap in unison. */
function posePhase(id: string): number {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return n % 4;
}

export function CrewSprite({
  kin,
  uniform,
  size = 24,
  className,
  pose = "idle",
  frame = 0,
  cycle = false,
  phase = 0,
}: {
  kin: KinId | undefined;
  uniform: string;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  /** Idle and terminal play all four frames on a CSS clock. Walk and fight stay on `frame`. */
  cycle?: boolean;
  phase?: number;
}) {
  const id = kin ?? "plain";
  const skin = KIN_SKIN[id];
  const looping = cycle && (pose === "idle" || pose === "work");
  const frames = looping ? [0, 1, 2, 3] : [frameIndex(frame)];
  const spriteClass = ["crew-sprite", className, looping ? `is-cycle is-${pose}` : ""].filter(Boolean).join(" ");
  return (
    <svg
      className={spriteClass}
      viewBox="0 0 12 12"
      width={size}
      height={size}
      overflow="visible"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={looping ? ({ "--pose-phase": String(phase) } as CSSProperties) : undefined}
    >
      {frames.map((fi) => (
        <g key={fi} className={looping ? `crew-frame is-f${fi}` : undefined}>
          {RUNS[id][pose][fi]!.map((r) => (
            <rect
              key={`${fi}-${r.x}-${r.y}-${r.w}-${r.c}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={1}
              fill={r.c === "h" ? skin : r.c === "u" ? uniform : INK}
            />
          ))}
        </g>
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
  cycle = false,
}: {
  crew: Crew;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  cycle?: boolean;
}) {
  return (
    <CrewSprite
      kin={crew.kin}
      uniform={uniformOf(crew)}
      size={size}
      className={className}
      pose={pose}
      frame={frame}
      cycle={cycle}
      phase={posePhase(crew.id)}
    />
  );
}
