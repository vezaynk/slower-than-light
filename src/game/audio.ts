/** INVENTED. No wiki page specifies these tones. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.35, ctx.currentTime, 0.02);
  }
}

export function unlockAudio() {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slide = 0,
) {
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

export function flushSfx(queue: string[]) {
  if (typeof window === "undefined") {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, queue.length);
  for (const name of batch) playSfx(name);
}
