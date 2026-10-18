/**
 * One pixel figure per crew member: head shape and colour from the lineage,
 * shoulders in the uniform colour. Used by the hangar cards, the crew rail,
 * the ship tokens, and the ship sheet so a crew member reads the same everywhere.
 */
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { KIN_SKIN, uniformOf } from "@/game/crew-look";
import { CREW_POSES, crewHead } from "@/game/crew-pixels";
import type { KinId } from "@/game/extras/kin";
import { pixelRuns, type PixelRun } from "@/game/gear-look";
import {
  archiveGeneration,
  crewPoseFrame,
  loadedImage,
  recolorCrew,
  subscribeArchive,
} from "@/game/pack/media";
import type { Crew } from "@/game/types";
import "./archive-art.css";
import "./crew-motion.css";

export type CrewPose = "idle" | "walk" | "fight" | "work";

const BODY = ["...duuuud...", "..duuuuuud..", ".duuuuuuuud.", ".duuuuuuuud."];

/**
 * Idle breathes in place. Work and fight and walk are the archive poses.
 * u sleeve, h fist. Rows may run past 12; the sprite overflows so the blow clears the tile.
 */
const POSE_BODY: Record<CrewPose, string[][]> = {
  idle: [
    BODY,
    ["...duuuud...", "..duuuuuud..", "duuuuuuuuuud", "duuuuuuuuuud"],
    ["..duuuuuud..", ".duuuuuuuud.", "duuuuuuuuuud", "duuuuuuuuuud"],
    ["....duud....", "...duuuud...", "..duuuuuud..", "..duuuuuud.."],
  ],
  walk: CREW_POSES.walk,
  fight: CREW_POSES.fight,
  work: CREW_POSES.work,
};

const RUNS = Object.fromEntries(
  (["human", "engi", "energy", "mantis", "slug", "rock", "anaerobic", "crystal"] as KinId[]).map(
    (kin) => [
      kin,
      Object.fromEntries(
        (Object.keys(POSE_BODY) as CrewPose[]).map((pose) => [
          pose,
          POSE_BODY[pose].map((body) => pixelRuns([...crewHead(kin), ...body])),
        ]),
      ),
    ],
  ),
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
  loopAll = false,
  phase = 0,
}: {
  kin: string | undefined;
  uniform: string;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  /** Idle and terminal play all four frames on a CSS clock. Walk and fight stay on `frame`. */
  cycle?: boolean;
  /** Every pose plays its four frames on the CSS clock, walk and fight too (the radial menu preview). */
  loopAll?: boolean;
  phase?: number;
}) {
  const id = kin ?? "human";
  const skin = (KIN_SKIN as Record<string, string>)[id] ?? KIN_SKIN.human;
  const looping = loopAll || (cycle && (pose === "idle" || pose === "work"));
  const frames = looping ? [0, 1, 2, 3] : [frameIndex(pose === "idle" ? 0 : frame)];
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const [sheets, setSheets] = useState<string[] | null>(null);
  useEffect(() => {
    const slices = frames.map((index) => crewPoseFrame(id, pose, index));
    if (slices.some((slice) => !slice)) {
      setSheets(null);
      return;
    }
    const first = slices[0];
    if (!first) return;
    let cancel = false;
    const paint = (img: HTMLImageElement) => {
      if (cancel) return;
      setSheets(slices.map((slice) => recolorCrew(img, slice!, uniform)));
    };
    const ready = loadedImage(first.url);
    if (ready) {
      paint(ready);
      return () => {
        cancel = true;
      };
    }
    setSheets(null);
    const img = new Image();
    img.onload = () => paint(img);
    img.onerror = () => {
      if (!cancel) setSheets(null);
    };
    img.src = first.url;
    return () => {
      cancel = true;
    };
  }, [generation, id, pose, frame, uniform, looping]);
  const spriteClass = ["crew-sprite", className, looping ? `is-cycle is-${pose}` : ""]
    .filter(Boolean)
    .join(" ");
  if (sheets && sheets.length === frames.length) {
    const sample = crewPoseFrame(id, pose, frames[0] ?? 0);
    const width = sample ? Math.max(1, Math.round((size * sample.fw) / sample.fh)) : size;
    return (
      <span
        className={`${spriteClass} is-sheet`}
        aria-hidden="true"
        style={
          {
            width,
            height: size,
            ...(looping ? { "--pose-phase": String(phase) } : {}),
          } as CSSProperties
        }
      >
        {sheets.map((src, index) => (
          <img
            key={`${index}-${src}`}
            className={looping ? `crew-frame is-f${frames[index] ?? index}` : "crew-frame"}
            alt=""
            src={src}
          />
        ))}
      </span>
    );
  }
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
          {(id in RUNS ? RUNS[id as KinId] : RUNS.human)[pose][fi]!.map((r) => (
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
  loopAll = false,
}: {
  crew: Crew;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  cycle?: boolean;
  loopAll?: boolean;
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
      loopAll={loopAll}
      phase={posePhase(crew.id)}
    />
  );
}
