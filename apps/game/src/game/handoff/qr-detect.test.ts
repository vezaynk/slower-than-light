import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jsQR from "jsqr";
import { encode } from "uqr";

/** A connection-code page as PhoneHandoffPanel draws it (uqr, ecc L, border 2), rasterized at `scale` px per module. */
function rasterize(text: string, scale: number) {
  const qr = encode(text, { ecc: "L", border: 2 });
  const size = qr.size * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!qr.data[Math.floor(y / scale)]?.[Math.floor(x / scale)]) continue;
      const at = (y * size + x) * 4;
      data[at] = data[at + 1] = data[at + 2] = 0;
    }
  }
  return { data, size };
}

describe("QR fallback reader", () => {
  it("jsQR reads a full connection-code page (encodeTicket's 700-character pieces)", () => {
    const body = "Ab0_-".repeat(140).slice(0, 700);
    for (const page of [`STL1.1.2.${body}`, "STL1.2.2.tail"]) {
      const { data, size } = rasterize(page, 4);
      const found = jsQR(data, size, size, { inversionAttempts: "dontInvert" });
      assert.equal(found?.data, page);
    }
  });
});
