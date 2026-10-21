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
  crewBody,
  crewLayers,
  crewPoseFrame,
  crewPoseLoops,
  loadedImage,
  paintCrew,
  subscribeArchive,
  type CrewDir,
  type SpriteBody,
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
  dir = "down",
}: {
  kin: string | undefined;
  uniform: string;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  /** Work plays its frames on a CSS clock. Idle does too, unless an archive walk sheet holds frame 0. Walk and fight stay on `frame`. */
  cycle?: boolean;
  /** Walk, fight, and work play their frames on the CSS clock. An archive idle still holds walk frame 0. */
  loopAll?: boolean;
  phase?: number;
  /** Archive sheet direction. A missing left clip is flipped in CSS. */
  dir?: CrewDir;
}) {
  const id = kin ?? "human";
  const skin = (KIN_SKIN as Record<string, string>)[id] ?? KIN_SKIN.human;
  const looping = crewPoseLoops(id, pose, { cycle, loopAll, dir });
  const frames = looping ? [0, 1, 2, 3] : [frameIndex(pose === "idle" ? 0 : frame)];
  const generation = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  const [sheets, setSheets] = useState<string[] | null>(null);
  useEffect(() => {
    const slices = frames.map((index) => crewPoseFrame(id, pose, index, dir));
    if (slices.some((slice) => !slice)) {
      setSheets(null);
      return;
    }
    // The base sheet and the race's colour layers (crewLayers). Paint once every picture has loaded.
    const layers = crewLayers(id, uniform);
    const wanted = [
      ...new Set([...slices.map((slice) => slice!.url), ...layers.map((l) => l.url)]),
    ];
    let cancel = false;
    const paint = (loaded: Map<string, HTMLImageElement>) => {
      if (cancel) return;
      const tinted = layers.flatMap((layer) => {
        const image = loaded.get(layer.url);
        return image ? [{ image, layer }] : [];
      });
      setSheets(
        slices.map((slice) => {
          const base = loaded.get(slice!.url);
          return base ? paintCrew(base, tinted, slice!) : slice!.url;
        }),
      );
    };
    const loaded = new Map<string, HTMLImageElement>();
    for (const url of wanted) {
      const ready = loadedImage(url);
      if (ready) loaded.set(url, ready);
    }
    if (loaded.size === wanted.length) {
      paint(loaded);
      return () => {
        cancel = true;
      };
    }
    setSheets(null);
    let pending = wanted.length - loaded.size;
    for (const url of wanted) {
      if (loaded.has(url)) continue;
      const img = new Image();
      img.onload = () => {
        loaded.set(url, img);
        pending -= 1;
        if (pending === 0) paint(loaded);
      };
      img.onerror = () => {
        if (!cancel) setSheets(null);
      };
      img.src = url;
    }
    return () => {
      cancel = true;
    };
  }, [generation, id, pose, frame, uniform, looping, dir]);
  const sample = crewPoseFrame(id, pose, frames[0] ?? 0, dir);
  const spriteClass = [
    "crew-sprite",
    className,
    looping ? `is-cycle is-${pose}` : "",
    sample?.mirror ? "is-mirror" : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (sheets && sheets.length === frames.length) {
    const body = unionBody(sheets);
    return (
      <span
        className={`${spriteClass} is-sheet`}
        aria-hidden="true"
        style={
          {
            ["--frame-w" as string]: String(sample?.fw ?? size),
            ["--frame-h" as string]: String(sample?.fh ?? size),
            ["--sprite-size" as string]: `${size}px`,
            ...(body
              ? {
                  ["--body-x" as string]: String(body.x),
                  ["--body-y" as string]: String(body.y),
                  ["--body-w" as string]: String(body.w),
                  ["--body-h" as string]: String(body.h),
                }
              : {}),
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
  dir = "down",
}: {
  crew: Crew;
  size?: number;
  className?: string;
  pose?: CrewPose;
  frame?: number;
  cycle?: boolean;
  loopAll?: boolean;
  dir?: CrewDir;
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
      dir={dir}
      phase={posePhase(crew.id)}
    />
  );
}

/** One box around every painted frame, so a cycle does not change size as a limb moves. */
function unionBody(urls: string[]): SpriteBody | undefined {
  let box: SpriteBody | undefined;
  for (const url of urls) {
    const body = crewBody(url);
    if (!body) continue;
    if (!box) {
      box = { ...body };
      continue;
    }
    const x = Math.min(box.x, body.x);
    const y = Math.min(box.y, body.y);
    const right = Math.max(box.x + box.w, body.x + body.w);
    const bottom = Math.max(box.y + body.h, body.y + body.h);
    box = { x, y, w: right - x, h: bottom - y };
  }
  return box;
}
