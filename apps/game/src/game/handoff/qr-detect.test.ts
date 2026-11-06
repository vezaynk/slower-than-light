import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jsQR from "jsqr";
import { encode } from "uqr";

/** The room code QR as PhoneHandoffPanel draws it (uqr, ecc L, border 2), rasterized at `scale` px per module. */
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
  it("jsQR reads the room code the computer shows", () => {
    for (const code of ["ABC234", "XYZ789"]) {
      const { data, size } = rasterize(code, 6);
      const found = jsQR(data, size, size, { inversionAttempts: "dontInvert" });
      assert.equal(found?.data, code);
    }
  });
});
