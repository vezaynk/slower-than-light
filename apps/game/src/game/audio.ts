/** Archive waves play when that cue is packed. A missing cue keeps the tone. */
import { sectorDef, weaponDef } from "@stl/pack";
import {
  archiveGeneration,
  musicTrack,
  soundCue,
  soundCues,
  weaponFireSounds,
} from "./pack/media.ts";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
/** Per the user: the Options screen's master volume, 0 to 1, on top of the INVENTED 0.35 mix level. */
let volume = 1;
const decoded = new Map<string, AudioBuffer>();
const decoding = new Map<string, Promise<AudioBuffer | undefined>>();
let heard = -1;

function level() {
  return muted ? 0 : 0.35 * volume;
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.02);
}

export function setVolume(next: number) {
  volume = Math.max(0, Math.min(1, next));
  if (master && ctx) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.02);
}

export function unlockAudio() {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = level();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  warmCues();
  if (pendingScore) void startScore(pendingScore);
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function noise(dur: number, gain: number) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

/**
 * The archive cues each game sound plays, from FTL's `data/sounds.xml` names (the list in
 * hahn-kev/ftl-xml-extension default-sound-waves.ts; xftl SoundManager plays the same names).
 * A numbered family is picked at random among the variants the archive holds.
 * INFERRED: which cue stands for each game sound. "click" has no FTL cue, so it keeps the tone.
 */
export const SFX_CUES: Record<string, readonly string[]> = {
  laser: ["lightLaser1", "lightLaser2", "lightLaser3"],
  missile: ["smallMissile1", "smallMissile2"],
  ion: ["ionShoot1", "ionShoot2", "ionShoot3"],
  beam: ["beam1"],
  COMBAT_BEAM: ["beam1"],
  shield: ["hitShield1", "hitShield2", "hitShield3"],
  hit: ["hitHull1", "hitHull2", "hitHull3"],
  alarm: ["warning"],
  win: ["victory"],
  die: ["explosion1", "explosion2", "explosion3", "explosion4"],
  vent: ["airLoss"],
  doorOpen: ["doorOpen"],
  doorClose: ["doorClose"],
  teleport: ["teleport"],
  cloak: ["cloak"],
  decloak: ["decloak"],
  levelup: ["levelup"],
  buy: ["buy"],
  sell: ["sell"],
  jumpLeave: ["jumpLeave"],
  jumpArrive: ["jumpArrive"],
  fire: ["fire"],
  repair: ["repair"],
};

/** The death cue for a crew member. A race with its own tag uses that; everyone else uses death1. */
export function deathCue(kin: string | undefined): string {
  if (kin === "rock") return "rockDeath";
  if (kin === "mantis") return "mantisDeath";
  if (kin === "crystal") return "crystalDeath";
  if (kin === "engi") return "engiDeath";
  if (kin === "energy") return "energyDeath";
  return "death1";
}

/**
 * The cue a weapon plays when it fires.
 * Packed fire-sound names are one family: one of them, at random, the way `cueFor` picks `SFX_CUES`.
 * None listed, or none packed, keeps the kind cue. Flak and laser share "laser". A bomb uses "missile".
 */
export function launchCue(
  kind: string | undefined,
  fireSounds: readonly string[] | undefined,
  packed: (name: string) => boolean,
  pick: () => number = Math.random,
): string {
  const present = (fireSounds ?? []).filter((name) => name.length > 0 && packed(name));
  if (present.length > 0) {
    const index = Math.floor(pick() * present.length) % present.length;
    return present[index] ?? present[0]!;
  }
  if (kind === "flak" || kind === "laser") return "laser";
  if (kind === "bomb") return "missile";
  return kind ?? "laser";
}

/**
 * Launch prefers the blueprint's `<launchSounds>`, then the animation's `<fireSound>`, then the kind cue.
 * A listed name that the archive did not pack is skipped, so the next source still plays.
 */
export function weaponLaunchCue(
  defId: string,
  kind: string | undefined,
  pick: () => number = Math.random,
): string {
  const packed = (name: string) => soundCue(name) != null;
  const listed = weaponDef(defId)?.launchSounds;
  const fromBlueprint = (listed ?? []).filter((name) => name.length > 0 && packed(name));
  if (fromBlueprint.length > 0) return launchCue(kind, listed, packed, pick);
  return launchCue(kind, weaponFireSounds(defId), packed, pick);
}

/** The archive cue for a game sound: a random present variant, or a cue named exactly that. */
export function cueFor(name: string, pick: () => number = Math.random) {
  const present = (SFX_CUES[name] ?? []).flatMap((cue) => {
    const clip = soundCue(cue);
    return clip ? [clip] : [];
  });
  if (present.length > 0) return present[Math.floor(pick() * present.length) % present.length];
  return soundCue(name);
}

export function playSfx(name: string) {
  if (muted) return;
  const cue = cueFor(name);
  if (cue) {
    // Fire and repair are started by syncLoops. Everything else stays a one-shot.
    if (cue.loop && (name === "fire" || name === "repair")) return;
    void playCue(cue.file, cue.blob, cue.volume, false);
    return;
  }
  const wobble = 0.94 + Math.random() * 0.12;
  switch (name) {
    case "click":
      tone(640 * wobble, 0.05, "square", 0.08);
      break;
    case "laser":
      tone(880 * wobble, 0.09, "square", 0.12, -500);
      noise(0.06, 0.08);
      break;
    case "missile":
      tone(180 * wobble, 0.22, "sawtooth", 0.14, -80);
      noise(0.12, 0.1);
      break;
    case "ion":
      tone(420 * wobble, 0.14, "sine", 0.12, 200);
      break;
    case "beam":
    case "COMBAT_BEAM":
      tone(300, 0.2, "sawtooth", 0.08);
      tone(520, 0.2, "triangle", 0.06);
      break;
    case "shield":
      tone(520 * wobble, 0.08, "sine", 0.1);
      break;
    case "hit":
      noise(0.14, 0.22);
      tone(140, 0.16, "square", 0.12, -70);
      break;
    case "alarm":
      tone(740, 0.12, "square", 0.1);
      tone(520, 0.16, "square", 0.08);
      break;
    case "win":
      tone(523, 0.1, "triangle", 0.1);
      setTimeout(() => tone(659, 0.1, "triangle", 0.1), 90);
      setTimeout(() => tone(784, 0.18, "triangle", 0.1), 180);
      break;
    case "die":
      tone(220, 0.4, "sawtooth", 0.14, -160);
      break;
    case "vent":
      noise(0.18, 0.12);
      tone(200, 0.15, "sine", 0.06, -80);
      break;
    case "doorOpen":
    case "doorClose":
      tone(name === "doorOpen" ? 520 : 340, 0.06, "square", 0.07);
      break;
    case "teleport":
      tone(280, 0.16, "sine", 0.1, 240);
      break;
    case "cloak":
    case "decloak":
      tone(180, 0.2, "triangle", 0.08, name === "cloak" ? -60 : 60);
      break;
    case "levelup":
      tone(660, 0.08, "square", 0.08);
      break;
    case "buy":
    case "sell":
      tone(name === "buy" ? 880 : 440, 0.07, "square", 0.08);
      break;
    case "jumpLeave":
      tone(220, 0.18, "sawtooth", 0.1, -80);
      break;
    case "jumpArrive":
      tone(140, 0.16, "sine", 0.08, 40);
      break;
    case "fire":
      noise(0.2, 0.08);
      break;
    case "repair":
      tone(300, 0.1, "square", 0.05);
      break;
    default:
      if (name.endsWith("Death") || name.startsWith("death") || name.startsWith("femaleDeath")) {
        tone(160, 0.2, "square", 0.1, -80);
        break;
      }
      tone(400, 0.04, "square", 0.05);
  }
}

function freshArchive() {
  const next = archiveGeneration();
  if (next === heard) return;
  heard = next;
  decoded.clear();
  decoding.clear();
}

function warmCues() {
  freshArchive();
  for (const cue of soundCues()) void decodeCue(cue.file, cue.blob);
}

async function playCue(file: string, blob: Blob, volume01: number, loop: boolean) {
  if (!ctx || !master) return;
  const buf = await decodeCue(file, blob);
  if (!buf || !ctx || !master || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  const g = ctx.createGain();
  g.gain.value = Math.max(0.0001, volume01);
  src.connect(g);
  g.connect(master);
  src.start();
  if (!loop) {
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
  }
}

const loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
const loopWanted = new Map<string, boolean>();

/** Starts the fire or repair loop while that work is happening, and stops it when the work stops. */
export function syncLoops(flags: { fire: boolean; repair: boolean }) {
  if (typeof window === "undefined" || !ctx || !master) return;
  void holdLoop("fire", flags.fire);
  void holdLoop("repair", flags.repair);
}

async function holdLoop(name: string, on: boolean) {
  loopWanted.set(name, on);
  const existing = loops.get(name);
  if (!on) {
    if (!existing || !ctx) return;
    try {
      existing.src.stop();
    } catch {
      /* already stopped */
    }
    existing.src.disconnect();
    existing.gain.disconnect();
    loops.delete(name);
    return;
  }
  if (existing || muted || !ctx || !master) return;
  const cue = soundCue(name);
  if (!cue?.loop) return;
  const buf = await decodeCue(cue.file, cue.blob);
  if (!buf || !ctx || !master || !loopWanted.get(name) || loops.has(name)) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = Math.max(0.0001, cue.volume);
  src.connect(g);
  g.connect(master);
  src.start();
  loops.set(name, { src, gain: g });
}

export type ScorePick = { track: string; mode: "explore" | "combat" };

/** Title plays the title track. A fight plays combat. The map and a quiet beacon play explore. */
export function scorePick(input: { phase: string; sectorId: string; combat: boolean }): ScorePick {
  if (input.phase === "title" || input.phase === "hangar")
    return { track: "title", mode: "explore" };
  // The sector's trackList (sector_data.xml).
  const tracks = sectorDef(input.sectorId)?.tracks;
  return { track: tracks?.[0] ?? "civilian", mode: input.combat ? "combat" : "explore" };
}

type ScoreAsk = { track: string; combat: boolean; paused: boolean };
type ScoreVoice = {
  key: string;
  buffer: AudioBuffer;
  offset: number;
  started: number;
  src: AudioBufferSourceNode;
  gain: GainNode;
};

let pendingScore: ScoreAsk | null = null;
let score: ScoreVoice | null = null;
let scorePaused = false;

/** One looping track. A pause holds the playhead. A change crossfades. Mute and volume stay on the master gain. */
export function syncScore(next: ScoreAsk) {
  pendingScore = next;
  if (!ctx || !master) return;
  if (next.paused) {
    holdScore();
    return;
  }
  void startScore(next);
}

function holdScore() {
  if (!score || !ctx || scorePaused) return;
  const duration = score.buffer.duration || 1;
  score.offset = (score.offset + (ctx.currentTime - score.started)) % duration;
  try {
    score.src.stop();
  } catch {
    /* already stopped */
  }
  score.src.disconnect();
  score.gain.disconnect();
  scorePaused = true;
}

async function startScore(next: ScoreAsk) {
  if (!ctx || !master || next.paused) return;
  const row = musicTrack(next.track);
  const blob = next.combat ? (row?.combat ?? row?.explore) : row?.explore;
  const mode = next.combat && row?.combat ? "combat" : "explore";
  if (!blob) {
    dropScore();
    return;
  }
  const key = `${next.track}:${mode}`;
  if (score && score.key === key && !scorePaused) return;
  const buf = await decodeCue(`music:${key}`, blob);
  if (!buf || !ctx || !master || pendingScore?.paused) return;
  const still = pendingScore;
  if (!still || `${still.track}:${still.combat && row?.combat ? "combat" : "explore"}` !== key)
    return;
  const same = score?.key === key;
  const offset = same ? (score?.offset ?? 0) : 0;
  const previous = score && !scorePaused ? score : null;
  const fade = 0.4;
  if (previous) {
    previous.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3);
    const old = previous.src;
    window.setTimeout(() => {
      try {
        old.stop();
      } catch {
        /* already stopped */
      }
      old.disconnect();
    }, fade * 1000);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.setTargetAtTime(0.7, ctx.currentTime, fade / 3);
  src.connect(g);
  g.connect(master);
  src.start(0, offset % (buf.duration || 1));
  score = { key, buffer: buf, offset, started: ctx.currentTime, src, gain: g };
  scorePaused = false;
}

function dropScore() {
  if (!score) return;
  try {
    score.src.stop();
  } catch {
    /* already stopped */
  }
  score.src.disconnect();
  score.gain.disconnect();
  score = null;
  scorePaused = false;
}

function decodeCue(file: string, blob: Blob): Promise<AudioBuffer | undefined> {
  freshArchive();
  if (!ctx) return Promise.resolve(undefined);
  const hit = decoded.get(file);
  if (hit) return Promise.resolve(hit);
  const pending = decoding.get(file);
  if (pending) return pending;
  const job = blob
    .arrayBuffer()
    .then((raw) => ctx!.decodeAudioData(raw.slice(0)))
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

export function flushSfx(queue: string[]) {
  if (typeof window === "undefined") {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, queue.length);
  for (const name of batch) playSfx(name);
}
