import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import { pictureForRooms } from "@stl/pack";
import { basePng } from "./png.ts";

const IEND = Uint8Array.of(0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82);

describe("placeholder png", () => {
  it("paints the room margin and leaves a distant cell clear", () => {
    const rooms = [
      { x: 0, y: 0, w: 1, h: 1 },
      { x: 5, y: 0, w: 1, h: 1 },
    ];
    const picture = pictureForRooms(rooms);
    assert.ok(picture);
    const png = basePng("kestral", picture, rooms);
    assert.deepEqual(
      png.subarray(0, 8),
      Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    );
    assert.deepEqual(png.subarray(png.length - IEND.length), IEND);
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    assert.equal(width, picture.w / 35);
    assert.equal(height, picture.h / 35);
    assert.equal(png[25], 6);
    const pixels = inflateSync(idat(png));
    const stride = 1 + width * 4;
    // Room (0, 0) sits one cell in from the margin. The gap between the two rooms stays clear.
    assert.equal(pixels[1 * stride + 1 + 1 * 4 + 3], 255);
    assert.equal(pixels[1 * stride + 1 + 3 * 4 + 3], 0);
    const other = basePng("flagship-1", picture, rooms);
    assert.notEqual(Buffer.compare(png, other), 0);
  });
});

function idat(png: Uint8Array): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      png[offset + 4],
      png[offset + 5],
      png[offset + 6],
      png[offset + 7],
    );
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IDAT") return data;
    offset += 12 + length;
  }
  throw new Error("png has no IDAT");
}
