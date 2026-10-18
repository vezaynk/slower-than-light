/** Archive waves play when that cue is packed. A missing cue keeps the tone. */
import { archiveGeneration, soundCue, soundCues } from "./pack/media.ts";

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

export function playSfx(name: string) {
  if (muted) return;
  const cue = soundCue(name);
  if (cue) {
    void playCue(cue.file, cue.blob, cue.volume, cue.loop);
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
    default:
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
