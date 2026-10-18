import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBitmapFont, writeBitmapFont } from "@stl/pack";
import { ttfFromBitmap } from "./pack/bitmap-ttf.ts";

describe("bitmap ttf", () => {
  it("builds a face whose checksum matches the font directory", () => {
    const alpha = new Uint8Array(3 * 2);
    alpha[0] = 255;
    const packed = writeBitmapFont(
      [
        { ch: 32, w: 3, h: 0, ascent: 0 },
        { ch: 65, w: 3, h: 2, ascent: 2, alpha },
      ],
      8,
      7,
    );
    const font = readBitmapFont(packed);
    assert.ok(font);
    const bytes = ttfFromBitmap(font, "JustinFont8");
    assert.equal(be32(bytes, 0), 0x00010000);
    const head = table(bytes, "head");
    assert.ok(head);
    assert.equal(be32(head, 12), 0x5f0f3cf5);
    assert.equal(checksum(bytes), 0xb1b0afba);
    const cmap = table(bytes, "cmap");
    assert.ok(cmap);
    assert.equal(be16(cmap, 12), 4);
    const glyf = table(bytes, "glyf");
    assert.ok(glyf && glyf.length > 10);
  });
});

function table(file: Uint8Array, tag: string): Uint8Array | undefined {
  const count = be16(file, 4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const name = String.fromCharCode(
      file[at] ?? 0,
      file[at + 1] ?? 0,
      file[at + 2] ?? 0,
      file[at + 3] ?? 0,
    );
    if (name !== tag) continue;
    const offset = be32(file, at + 8);
    const length = be32(file, at + 12);
    return file.subarray(offset, offset + length);
  }
  return undefined;
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
