/**
 * Archive waves `sounds.xml` never names.
 * A cue whose file is one of these (any case) plays through `soundCue` / `playSfx`.
 * Otherwise the event plays the packed path.
 */
import { playSfx } from "./audio.ts";
import { archiveBlob, archiveGeneration, soundCue, soundCues } from "./pack/media.ts";

export type ArchiveAudioEvent =
  "missileHit" | "droneLaunch" | "hullHit" | "shieldsDown" | "sun" | "mantisFight";

const EVENTS: readonly ArchiveAudioEvent[] = [
  "missileHit",
  "droneLaunch",
  "hullHit",
  "shieldsDown",
  "sun",
  "mantisFight",
];

/** Paths this event plays, in the order a variant index selects. */
function filesFor(event: ArchiveAudioEvent): readonly string[] {
  switch (event) {
    case "missileHit":
      return [
        "audio/waves/explosions/bp_missile_small.ogg",
        "audio/waves/explosions/bp_missile_large.ogg",
      ];
    case "droneLaunch":
      return ["audio/waves/ship/bp_drone_launch_1.ogg", "audio/waves/ship/bp_drone_launch_3.ogg"];
    case "hullHit":
      return [
        "audio/waves/explosions/bp_hit_hull_3.ogg",
        "audio/waves/explosions/bp_explosion_large_2.ogg",
      ];
    case "shieldsDown":
      return ["audio/waves/explosions/shieldsdown1.wav"];
    case "sun":
      return ["audio/waves/ui/sun_flare.wav"];
    case "mantisFight":
      return ["audio/waves/aliens/bp_SFX_MantisFight.ogg"];
    default:
      return [];
  }
}

const nextVariant = new Map<ArchiveAudioEvent, number>();

function pickIndex(event: ArchiveAudioEvent, count: number, variant: number | undefined): number {
  if (count <= 1) return 0;
  if (variant == null || !Number.isFinite(variant)) {
    const index = nextVariant.get(event) ?? 0;
    nextVariant.set(event, (index + 1) % count);
    return index;
  }
  const index =
    variant >= 0 && variant < count && Number.isInteger(variant)
      ? variant
      : Math.floor(variant * count);
  return ((index % count) + count) % count;
}

function cueForFile(file: string): { name: string; file: string } | undefined {
  const key = file.toLowerCase();
  return soundCues().find((cue) => cue.file.toLowerCase() === key);
}

/** True only when `playArchiveAudio` names this path. Not every archive wave. */
export function archiveAudioPlays(file: string): boolean {
  const key = file.toLowerCase();
  return EVENTS.some((event) => filesFor(event).some((path) => path.toLowerCase() === key));
}

/**
 * Play one event.
 * Variant 0 is the first file. Missile hits pass 1 for a heavy warhead.
 * Hull hits pass 1 for the ship-killing blast. Drone launches alternate.
 */
export function playArchiveAudio(event: ArchiveAudioEvent, variant?: number): void {
  const files = filesFor(event);
  const file = files[pickIndex(event, files.length, variant)];
  if (!file) return;
  const cue = cueForFile(file);
  // The cue's own file string is the archive path, compared without case.
  if (cue && soundCue(cue.name)) {
    playSfx(cue.name);
    return;
  }
  const blob = archiveBlob(file);
  if (!blob) return;
  void playBlob(file, blob);
}

/** `sfx` names that resolve to an unpacked wave. Other cues stay on the queue. */
export function playArchiveSfx(name: string): void {
  if (name === "hit") playArchiveAudio("hullHit", 0);
  else if (name === "die") playArchiveAudio("hullHit", 1);
}

let ctx: AudioContext | null = null;
let heard = -1;
const decoded = new Map<string, AudioBuffer>();
const decoding = new Map<string, Promise<AudioBuffer | undefined>>();

function audioContext(): AudioContext | null {
  const AC =
    globalThis.AudioContext ??
    (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function fresh(): void {
  const next = archiveGeneration();
  if (next === heard) return;
  heard = next;
  decoded.clear();
  decoding.clear();
}

function decode(file: string, blob: Blob, context: AudioContext): Promise<AudioBuffer | undefined> {
  fresh();
  const hit = decoded.get(file);
  if (hit) return Promise.resolve(hit);
  const pending = decoding.get(file);
  if (pending) return pending;
  const job = blob
    .arrayBuffer()
    .then((raw) => context.decodeAudioData(raw.slice(0)))
    .then((buf) => {
      decoded.set(file, buf);
      decoding.delete(file);
      return buf;
    })
    .catch(() => {
      decoding.delete(file);
      return undefined;
    });
  decoding.set(file, job);
  return job;
}

async function playBlob(file: string, blob: Blob): Promise<void> {
  const context = audioContext();
  if (!context) return;
  const buf = await decode(file, blob, context);
  const live = audioContext();
  if (!buf || !live) return;
  const src = live.createBufferSource();
  src.buffer = buf;
  src.connect(live.destination);
  src.start();
  src.onended = () => src.disconnect();
}
