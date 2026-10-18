/**
 * A TrueType face built from one FTL bitmap font, so the browser can draw it.
 * The glyphs are the archive's own alpha, turned into square outlines.
 */
import type { BitmapFont } from "@stl/pack";

const UNIT = 64;

/** Bytes a FontFace can load. The family name is the caller's. */
export function ttfFromBitmap(font: BitmapFont, family: string, bold = false): Uint8Array {
  const glyphs = buildGlyphs(font);
  const glyfParts: Uint8Array[] = [];
  const loca: number[] = [0];
  let cursor = 0;
  let maxPoints = 0;
  let maxContours = 0;
  for (const glyph of glyphs) {
    const bytes = glyph.bytes;
    glyfParts.push(bytes);
    cursor += bytes.length;
    if (cursor & 1) {
      glyfParts.push(new Uint8Array(1));
      cursor += 1;
    }
    loca.push(cursor);
    maxPoints = Math.max(maxPoints, glyph.points);
    maxContours = Math.max(maxContours, glyph.contours);
  }
  const glyf = concat(glyfParts);
  const advances = glyphs.map((glyph) => glyph.advance);
  const lsbs = glyphs.map((glyph) => glyph.lsb);
  const boxes = glyphs.filter((glyph) => glyph.contours > 0);
  const xMin = Math.min(0, ...boxes.map((glyph) => glyph.xMin));
  const yMin = Math.min(0, ...boxes.map((glyph) => glyph.yMin));
  const xMax = Math.max(0, ...boxes.map((glyph) => glyph.xMax));
  const yMax = Math.max(UNIT, ...boxes.map((glyph) => glyph.yMax));
  const ascender = Math.max(yMax, font.lineSpacing * UNIT);
  const descender = Math.min(yMin, 0);
  const advanceMax = Math.max(0, ...advances);
  const minLsb = Math.min(0, ...lsbs);
  const minRsb = Math.min(...glyphs.map((glyph) => glyph.advance - glyph.xMax));
  const codes = glyphs.flatMap((glyph, index) =>
    glyph.ch == null ? [] : [{ code: glyph.ch, index }],
  );
  const first = codes.reduce((min, row) => Math.min(min, row.code), 0xffff);
  const last = codes.reduce((max, row) => Math.max(max, row.code), 0);
  const avg = advances.length
    ? Math.round(advances.reduce((sum, n) => sum + n, 0) / advances.length)
    : UNIT;
  const head = headTable(xMin, yMin, xMax, yMax, bold);
  const file = assemble([
    { tag: "OS/2", data: os2Table(avg, ascender, descender, first, last, bold) },
    { tag: "cmap", data: cmapTable(codes) },
    { tag: "glyf", data: glyf },
    { tag: "head", data: head },
    {
      tag: "hhea",
      data: hheaTable(ascender, descender, advanceMax, minLsb, minRsb, xMax, glyphs.length),
    },
    { tag: "hmtx", data: hmtxTable(advances, lsbs) },
    { tag: "loca", data: locaTable(loca) },
    { tag: "maxp", data: maxpTable(glyphs.length, maxPoints, maxContours) },
    { tag: "name", data: nameTable(family, bold) },
    { tag: "post", data: postTable() },
  ]);
  const headAt = tableOffset(file, "head");
  const sum = checksum(file);
  set32(file, headAt + 8, (0xb1b0afba - sum) >>> 0);
  return file;
}

type Built = {
  bytes: Uint8Array;
  points: number;
  contours: number;
  advance: number;
  lsb: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  ch?: number;
};

function buildGlyphs(font: BitmapFont): Built[] {
  const notdef = stampGlyph(boxAlpha(5, 7), 5, 7, 6);
  const glyphs = font.glyphs.map((glyph) => {
    const alpha = new Uint8Array(Math.max(1, glyph.w) * Math.max(1, glyph.h));
    if (glyph.h > 0 && glyph.w > 0) {
      for (let y = 0; y < glyph.h; y += 1) {
        for (let x = 0; x < glyph.w; x += 1) {
          alpha[y * glyph.w + x] = font.alpha[(glyph.y + y) * font.width + glyph.x + x] ?? 0;
        }
      }
    }
    const built =
      glyph.h > 0 ? stampGlyph(alpha, glyph.w, glyph.h, glyph.w + 1) : emptyGlyph(glyph.w);
    built.ch = glyph.ch;
    return built;
  });
  return [notdef, ...glyphs];
}

function stampGlyph(alpha: Uint8Array, w: number, h: number, advancePx: number): Built {
  const contours: number[][] = [];
  for (let y = 0; y < h; y += 1) {
    let x = 0;
    while (x < w) {
      if ((alpha[y * w + x] ?? 0) < 128) {
        x += 1;
        continue;
      }
      let end = x + 1;
      while (end < w && (alpha[y * w + end] ?? 0) >= 128) end += 1;
      const bottom = (h - 1 - y) * UNIT;
      contours.push([
        x * UNIT,
        bottom,
        end * UNIT,
        bottom,
        end * UNIT,
        bottom + UNIT,
        x * UNIT,
        bottom + UNIT,
      ]);
      x = end;
    }
  }
  const bytes = encodeGlyph(contours);
  let xMin = 0;
  let yMin = 0;
  let xMax = 0;
  let yMax = 0;
  let points = 0;
  for (const contour of contours) {
    points += contour.length / 2;
    for (let i = 0; i < contour.length; i += 2) {
      const x = contour[i] ?? 0;
      const y = contour[i + 1] ?? 0;
      if (points === contour.length / 2 && i === 0) {
        xMin = x;
        yMin = y;
        xMax = x;
        yMax = y;
      }
      xMin = Math.min(xMin, x);
      yMin = Math.min(yMin, y);
      xMax = Math.max(xMax, x);
      yMax = Math.max(yMax, y);
    }
  }
  return {
    bytes,
    points,
    contours: contours.length,
    advance: Math.max(advancePx * UNIT, xMax),
    lsb: xMin,
    xMin,
    yMin,
    xMax,
    yMax,
  };
}

function emptyGlyph(advancePx: number): Built {
  return {
    bytes: new Uint8Array(0),
    points: 0,
    contours: 0,
    advance: Math.max(1, advancePx) * UNIT,
    lsb: 0,
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
  };
}

/** A hollow square so a missing character still takes space. */
function boxAlpha(w: number, h: number): Uint8Array {
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) alpha[y * w + x] = 255;
    }
  }
  return alpha;
}

function encodeGlyph(contours: number[][]): Uint8Array {
  if (contours.length === 0) return new Uint8Array(0);
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  let count = 0;
  for (const contour of contours) {
    count += contour.length / 2;
    for (let i = 0; i < contour.length; i += 2) {
      xMin = Math.min(xMin, contour[i] ?? 0);
      yMin = Math.min(yMin, contour[i + 1] ?? 0);
      xMax = Math.max(xMax, contour[i] ?? 0);
      yMax = Math.max(yMax, contour[i + 1] ?? 0);
    }
  }
  const xs: number[] = [];
  const ys: number[] = [];
  let px = 0;
  let py = 0;
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i += 2) {
      const x = contour[i] ?? 0;
      const y = contour[i + 1] ?? 0;
      xs.push(x - px);
      ys.push(y - py);
      px = x;
      py = y;
    }
  }
  const out = new Uint8Array(12 + contours.length * 2 + count + xs.length * 2 + ys.length * 2);
  set16(out, 0, contours.length);
  set16s(out, 2, xMin);
  set16s(out, 4, yMin);
  set16s(out, 6, xMax);
  set16s(out, 8, yMax);
  let point = 0;
  contours.forEach((contour, index) => {
    point += contour.length / 2;
    set16(out, 10 + index * 2, point - 1);
  });
  const flagsAt = 10 + contours.length * 2;
  set16(out, flagsAt, 0);
  const flagAt = flagsAt + 2;
  out.fill(0x01, flagAt, flagAt + count);
  let at = flagAt + count;
  for (const dx of xs) {
    set16s(out, at, dx);
    at += 2;
  }
  for (const dy of ys) {
    set16s(out, at, dy);
    at += 2;
  }
  return out;
}

function headTable(
  xMin: number,
  yMin: number,
  xMax: number,
  yMax: number,
  bold: boolean,
): Uint8Array {
  const out = new Uint8Array(54);
  set32(out, 0, 0x00010000);
  set32(out, 4, 0x00010000);
  set32(out, 8, 0);
  set32(out, 12, 0x5f0f3cf5);
  set16(out, 16, 0x000b);
  set16(out, 18, 1024);
  set32(out, 20, 0);
  set32(out, 24, 3850070400);
  set32(out, 28, 0);
  set32(out, 32, 3850070400);
  set16s(out, 36, xMin);
  set16s(out, 38, yMin);
  set16s(out, 40, xMax);
  set16s(out, 42, yMax);
  set16(out, 44, bold ? 1 : 0);
  set16(out, 46, 8);
  set16s(out, 48, 2);
  set16s(out, 50, 1);
  set16s(out, 52, 0);
  return out;
}

function hheaTable(
  ascender: number,
  descender: number,
  advanceMax: number,
  minLsb: number,
  minRsb: number,
  xMaxExtent: number,
  count: number,
): Uint8Array {
  const out = new Uint8Array(36);
  set32(out, 0, 0x00010000);
  set16s(out, 4, ascender);
  set16s(out, 6, descender);
  set16s(out, 8, 0);
  set16(out, 10, advanceMax);
  set16s(out, 12, minLsb);
  set16s(out, 14, minRsb);
  set16s(out, 16, xMaxExtent);
  set16s(out, 18, 1);
  set16s(out, 20, 0);
  set16s(out, 22, 0);
  set16s(out, 34, count);
  return out;
}

function hmtxTable(advances: number[], lsbs: number[]): Uint8Array {
  const out = new Uint8Array(advances.length * 4);
  advances.forEach((advance, index) => {
    set16(out, index * 4, advance);
    set16s(out, index * 4 + 2, lsbs[index] ?? 0);
  });
  return out;
}

function locaTable(offsets: number[]): Uint8Array {
  const out = new Uint8Array(offsets.length * 4);
  offsets.forEach((offset, index) => set32(out, index * 4, offset));
  return out;
}

function maxpTable(count: number, maxPoints: number, maxContours: number): Uint8Array {
  const out = new Uint8Array(32);
  set32(out, 0, 0x00010000);
  set16(out, 4, count);
  set16(out, 6, maxPoints);
  set16(out, 8, maxContours);
  set16(out, 16, 2);
  return out;
}

function os2Table(
  avg: number,
  ascender: number,
  descender: number,
  first: number,
  last: number,
  bold: boolean,
): Uint8Array {
  const out = new Uint8Array(96);
  set16(out, 0, 4);
  set16s(out, 2, avg);
  set16(out, 4, bold ? 700 : 400);
  set16(out, 6, 5);
  set16(out, 10, UNIT);
  set16(out, 12, UNIT);
  set16(out, 18, UNIT);
  set16(out, 20, UNIT);
  set16(out, 26, Math.max(1, Math.round(UNIT / 8)));
  set16s(out, 28, Math.round(ascender / 2));
  set32(out, 42, 1);
  out.set([0x53, 0x54, 0x4c, 0x20], 58);
  set16(out, 62, bold ? 0x00a0 : 0x00c0);
  set16(out, 64, first === 0xffff ? 0 : first);
  set16(out, 66, last);
  set16s(out, 68, ascender);
  set16s(out, 70, descender);
  set16(out, 74, ascender);
  set16(out, 76, Math.abs(descender));
  set32(out, 78, 1);
  set16s(out, 86, Math.round(ascender * 0.7));
  set16s(out, 88, ascender);
  set16(out, 92, 32);
  return out;
}

function cmapTable(codes: { code: number; index: number }[]): Uint8Array {
  const sorted = [...codes].sort((a, b) => a.code - b.code);
  const segs: { start: number; end: number; delta: number }[] = [];
  for (const row of sorted) {
    const prev = segs[segs.length - 1];
    if (prev && row.code === prev.end + 1 && row.index === ((row.code + prev.delta) & 0xffff)) {
      prev.end = row.code;
    } else {
      segs.push({ start: row.code, end: row.code, delta: (row.index - row.code) & 0xffff });
    }
  }
  segs.push({ start: 0xffff, end: 0xffff, delta: 1 });
  const segCount = segs.length;
  let power = 1;
  let entry = 0;
  while (power * 2 <= segCount) {
    power *= 2;
    entry += 1;
  }
  const searchRange = 2 * power;
  const length = 16 + segCount * 8;
  const out = new Uint8Array(12 + length);
  set16(out, 0, 0);
  set16(out, 2, 1);
  set16(out, 4, 3);
  set16(out, 6, 1);
  set32(out, 8, 12);
  set16(out, 12, 4);
  set16(out, 14, length);
  set16(out, 16, 0);
  set16(out, 18, segCount * 2);
  set16(out, 20, searchRange);
  set16(out, 22, entry);
  set16(out, 24, segCount * 2 - searchRange);
  segs.forEach((seg, index) => set16(out, 26 + index * 2, seg.end));
  const startAt = 26 + segCount * 2 + 2;
  segs.forEach((seg, index) => set16(out, startAt + index * 2, seg.start));
  const deltaAt = startAt + segCount * 2;
  segs.forEach((seg, index) => set16(out, deltaAt + index * 2, seg.delta));
  return out;
}

function nameTable(family: string, bold: boolean): Uint8Array {
  const sub = bold ? "Bold" : "Regular";
  const full = `${family} ${sub}`;
  const ps = `${family.replace(/[^A-Za-z0-9]/g, "")}${bold ? "-Bold" : "-Regular"}`;
  const pairs: [number, string][] = [
    [1, family],
    [2, sub],
    [4, full],
    [6, ps],
  ];
  const records = pairs.flatMap(([id, text]) => [
    { platform: 1, encoding: 0, language: 0, id, bytes: ascii(text) },
    { platform: 3, encoding: 1, language: 0x0409, id, bytes: utf16(text) },
  ]);
  const stringOffset = 6 + records.length * 12;
  const body = records.reduce((sum, row) => sum + row.bytes.length, 0);
  const out = new Uint8Array(stringOffset + body);
  set16(out, 2, records.length);
  set16(out, 4, stringOffset);
  let cursor = 0;
  records.forEach((row, index) => {
    const at = 6 + index * 12;
    set16(out, at, row.platform);
    set16(out, at + 2, row.encoding);
    set16(out, at + 4, row.language);
    set16(out, at + 6, row.id);
    set16(out, at + 8, row.bytes.length);
    set16(out, at + 10, cursor);
    out.set(row.bytes, stringOffset + cursor);
    cursor += row.bytes.length;
  });
  return out;
}

function postTable(): Uint8Array {
  const out = new Uint8Array(32);
  set32(out, 0, 0x00030000);
  set16s(out, 8, -80);
  set16(out, 10, 50);
  set32(out, 12, 1);
  return out;
}

function assemble(tables: { tag: string; data: Uint8Array }[]): Uint8Array {
  const sorted = [...tables].sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const count = sorted.length;
  let power = 1;
  let entry = 0;
  while (power * 2 <= count) {
    power *= 2;
    entry += 1;
  }
  const search = power * 16;
  let cursor = 12 + count * 16;
  const placed = sorted.map((table) => {
    const offset = cursor;
    cursor = (cursor + table.data.length + 3) & ~3;
    return { ...table, offset };
  });
  const out = new Uint8Array(cursor);
  set32(out, 0, 0x00010000);
  set16(out, 4, count);
  set16(out, 6, search);
  set16(out, 8, entry);
  set16(out, 10, count * 16 - search);
  placed.forEach((table, index) => {
    const at = 12 + index * 16;
    out.set(ascii(table.tag), at);
    set32(out, at + 4, checksum(table.data));
    set32(out, at + 8, table.offset);
    set32(out, at + 12, table.data.length);
    out.set(table.data, table.offset);
  });
  return out;
}

function tableOffset(file: Uint8Array, tag: string): number {
  const count = be16(file, 4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    if (tagAt(file, at) === tag) return be32(file, at + 8);
  }
  return 0;
}

function checksum(data: Uint8Array): number {
  let sum = 0;
  const n = (data.length + 3) & ~3;
  for (let i = 0; i < n; i += 4) {
    const word =
      ((data[i] ?? 0) * 0x1000000 +
        ((data[i + 1] ?? 0) << 16) +
        ((data[i + 2] ?? 0) << 8) +
        (data[i + 3] ?? 0)) >>>
      0;
    sum = (sum + word) >>> 0;
  }
  return sum;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function tagAt(file: Uint8Array, at: number): string {
  return String.fromCharCode(
    file[at] ?? 0,
    file[at + 1] ?? 0,
    file[at + 2] ?? 0,
    file[at + 3] ?? 0,
  );
}

function ascii(value: string): Uint8Array {
  return Uint8Array.from(value, (ch) => ch.charCodeAt(0));
}

function utf16(value: string): Uint8Array {
  const out = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i += 1) set16(out, i * 2, value.charCodeAt(i));
  return out;
}

function set16(bytes: Uint8Array, at: number, value: number): void {
  bytes[at] = (value >> 8) & 0xff;
  bytes[at + 1] = value & 0xff;
}

function set16s(bytes: Uint8Array, at: number, value: number): void {
  set16(bytes, at, value < 0 ? value + 0x10000 : value);
}

function set32(bytes: Uint8Array, at: number, value: number): void {
  const n = value >>> 0;
  bytes[at] = (n >>> 24) & 0xff;
  bytes[at + 1] = (n >>> 16) & 0xff;
  bytes[at + 2] = (n >>> 8) & 0xff;
  bytes[at + 3] = n & 0xff;
}

function be16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function be32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) * 0x1000000 +
      ((bytes[at + 1] ?? 0) << 16) +
      ((bytes[at + 2] ?? 0) << 8) +
      (bytes[at + 3] ?? 0)) >>>
    0
  );
}
