/**
 * FTL 1.6 bitmap font. Magic `FONT`, version 1, then a `TEX\n` version 2
 * alpha atlas (format 64). Glyph records are 16 bytes, big-endian.
 */

export type FontGlyph = {
  ch: number;
  x: number;
  y: number;
  w: number;
  h: number;
  ascent: number;
  prekern: number;
  postkern: number;
};

export type BitmapFont = {
  lineSpacing: number;
  lineTop: number;
  width: number;
  height: number;
  /** One byte of alpha per atlas pixel, row major. */
  alpha: Uint8Array;
  glyphs: FontGlyph[];
};

export type FontStamp = {
  ch: number;
  w: number;
  h: number;
  ascent: number;
  prekern?: number;
  postkern?: number;
  /** Row-major alpha, length w * h. An empty glyph (space) may omit it. */
  alpha?: Uint8Array;
};

const INFO = 16;

/** Packs glyphs left to right, wrapping onto the next row of the atlas. */
export function writeBitmapFont(
  stamps: readonly FontStamp[],
  lineSpacing: number,
  lineTop: number,
): Uint8Array {
  const placed: FontGlyph[] = [];
  const atlasW = 128;
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const stamp of stamps) {
    const w = stamp.w;
    const h = stamp.h;
    if (x + w > atlasW) {
      x = 0;
      y += rowH;
      rowH = 0;
    }
    placed.push({
      ch: stamp.ch,
      x,
      y,
      w,
      h,
      ascent: stamp.ascent,
      prekern: stamp.prekern ?? 0,
      postkern: stamp.postkern ?? 0,
    });
    x += w;
    if (h > rowH) rowH = h;
  }
  const height = Math.max(1, y + rowH);
  const alpha = new Uint8Array(atlasW * height);
  stamps.forEach((stamp, index) => {
    const glyph = placed[index];
    if (!glyph || !stamp.alpha) return;
    for (let row = 0; row < stamp.h; row += 1) {
      for (let col = 0; col < stamp.w; col += 1) {
        alpha[(glyph.y + row) * atlasW + glyph.x + col] = stamp.alpha[row * stamp.w + col] ?? 0;
      }
    }
  });
  return encodeFont(placed, alpha, atlasW, height, lineSpacing, lineTop);
}

export function readBitmapFont(bytes: Uint8Array): BitmapFont | undefined {
  if (bytes.length < 24 || ascii(bytes, 0, 4) !== "FONT" || bytes[4] !== 1) return undefined;
  const lineSpacing = bytes[5] ?? 0;
  const lineTop = bytes[6] ?? 0;
  const infoOff = be32(bytes, 8);
  const count = be16(bytes, 12);
  const infoSize = be16(bytes, 14);
  const texOff = be32(bytes, 16);
  if (infoSize < INFO || infoOff + count * infoSize > bytes.length) return undefined;
  const glyphs: FontGlyph[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = infoOff + i * infoSize;
    glyphs.push({
      ch: be32(bytes, at),
      x: be16s(bytes, at + 4),
      y: be16s(bytes, at + 6),
      w: bytes[at + 8] ?? 0,
      h: bytes[at + 9] ?? 0,
      ascent: signedByte(bytes[at + 10] ?? 0),
      prekern: be16s(bytes, at + 12) / 256,
      postkern: be16s(bytes, at + 14) / 256,
    });
  }
  if (
    texOff + 32 > bytes.length ||
    ascii(bytes, texOff, 4) !== "TEX\n" ||
    bytes[texOff + 4] !== 2
  ) {
    return undefined;
  }
  if (bytes[texOff + 5] !== 64) return undefined;
  const width = be16(bytes, texOff + 8);
  const height = be16(bytes, texOff + 10);
  const pixOff = be32(bytes, texOff + 16);
  const start = texOff + pixOff;
  if (width < 1 || height < 1 || start + width * height > bytes.length) return undefined;
  return {
    lineSpacing,
    lineTop,
    width,
    height,
    alpha: bytes.slice(start, start + width * height),
    glyphs,
  };
}

function encodeFont(
  glyphs: readonly FontGlyph[],
  alpha: Uint8Array,
  width: number,
  height: number,
  lineSpacing: number,
  lineTop: number,
): Uint8Array {
  const infoOff = 24;
  const texOff = infoOff + glyphs.length * INFO;
  const pixOff = 32;
  const out = new Uint8Array(texOff + pixOff + alpha.length);
  out.set(text("FONT"), 0);
  out[4] = 1;
  out[5] = lineSpacing;
  out[6] = lineTop;
  set32(out, 8, infoOff);
  set16(out, 12, glyphs.length);
  set16(out, 14, INFO);
  set32(out, 16, texOff);
  glyphs.forEach((glyph, index) => {
    const at = infoOff + index * INFO;
    set32(out, at, glyph.ch);
    set16(out, at + 4, glyph.x);
    set16(out, at + 6, glyph.y);
    out[at + 8] = glyph.w;
    out[at + 9] = glyph.h;
    out[at + 10] = glyph.ascent & 0xff;
    set16(out, at + 12, Math.round(glyph.prekern * 256));
    set16(out, at + 14, Math.round(glyph.postkern * 256));
  });
  out.set(text("TEX\n"), texOff);
  out[texOff + 4] = 2;
  out[texOff + 5] = 64;
  set16(out, texOff + 8, width);
  set16(out, texOff + 10, height);
  set32(out, texOff + 16, pixOff);
  out.set(alpha, texOff + pixOff);
  return out;
}

function text(value: string): Uint8Array {
  return Uint8Array.from(value, (ch) => ch.charCodeAt(0));
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String.fromCharCode(bytes[at + i] ?? 0);
  return out;
}

function be32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) << 24) |
    ((bytes[at + 1] ?? 0) << 16) |
    ((bytes[at + 2] ?? 0) << 8) |
    (bytes[at + 3] ?? 0)
  );
}

function be16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function be16s(bytes: Uint8Array, at: number): number {
  const value = be16(bytes, at);
  return value & 0x8000 ? value - 0x10000 : value;
}

function signedByte(value: number): number {
  return value & 0x80 ? value - 0x100 : value;
}

function set16(bytes: Uint8Array, at: number, value: number): void {
  const n = value < 0 ? value + 0x10000 : value;
  bytes[at] = (n >> 8) & 0xff;
  bytes[at + 1] = n & 0xff;
}

function set32(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = (value >>> 24) & 0xff;
  bytes[at + 1] = (value >>> 16) & 0xff;
  bytes[at + 2] = (value >>> 8) & 0xff;
  bytes[at + 3] = value & 0xff;
}
