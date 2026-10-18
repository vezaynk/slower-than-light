import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readBitmapFont, writeBitmapFont } from "./bitmap-font.ts";

describe("bitmap font", () => {
  it("round-trips a glyph and an empty space", () => {
    const alpha = Uint8Array.from([255, 0, 255, 0, 255, 255]);
    const bytes = writeBitmapFont(
      [
        { ch: 65, w: 3, h: 2, ascent: 2, alpha },
        { ch: 32, w: 3, h: 0, ascent: 0 },
      ],
      8,
      8,
    );
    const font = readBitmapFont(bytes);
    assert.ok(font);
    assert.equal(font?.lineSpacing, 8);
    assert.equal(font?.lineTop, 8);
    assert.equal(font?.glyphs.length, 2);
    const letter = font?.glyphs.find((glyph) => glyph.ch === 65);
    assert.equal(letter?.w, 3);
    assert.equal(letter?.h, 2);
    assert.equal(font?.alpha[(letter?.y ?? 0) * (font?.width ?? 0) + (letter?.x ?? 0)], 255);
    assert.equal(font?.glyphs.find((glyph) => glyph.ch === 32)?.w, 3);
  });
});
