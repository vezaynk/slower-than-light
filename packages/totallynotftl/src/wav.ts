/** 16-bit mono PCM. The stand-in cues are original tones, not copied waves. */
export function wavFromSamples(samples: readonly number[], rate = 22050): Uint8Array {
  const data = samples.length * 2;
  const out = new Uint8Array(44 + data);
  out.set(text("RIFF"), 0);
  set32(out, 4, 36 + data);
  out.set(text("WAVE"), 8);
  out.set(text("fmt "), 12);
  set32(out, 16, 16);
  set16(out, 20, 1);
  set16(out, 22, 1);
  set32(out, 24, rate);
  set32(out, 28, rate * 2);
  set16(out, 32, 2);
  set16(out, 34, 16);
  out.set(text("data"), 36);
  set32(out, 40, data);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    set16(out, 44 + index * 2, Math.round(clamped * 32767));
  });
  return out;
}

function text(value: string): Uint8Array {
  return Uint8Array.from(value, (ch) => ch.charCodeAt(0));
}

function set16(bytes: Uint8Array, at: number, value: number): void {
  const n = value < 0 ? value + 0x10000 : value;
  bytes[at] = n & 0xff;
  bytes[at + 1] = (n >> 8) & 0xff;
}

function set32(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = value & 0xff;
  bytes[at + 1] = (value >> 8) & 0xff;
  bytes[at + 2] = (value >> 16) & 0xff;
  bytes[at + 3] = (value >> 24) & 0xff;
}
