import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { encode } from "uqr";
import { qrReader } from "./qr-detect.ts";

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

/** A camera frame: the `<video>` fields qr-detect reads, plus the pixels the fake canvas copies. */
type FakeVideo = { videoWidth: number; videoHeight: number; pixels: Uint8ClampedArray };

function video(text: string, scale = 4): HTMLVideoElement {
  const { data, size } = rasterize(text, scale);
  const frame: FakeVideo = { videoWidth: size, videoHeight: size, pixels: data };
  return frame as unknown as HTMLVideoElement;
}

/** A 2D canvas that only copies a same-size frame, which is all qr-detect needs below its scan edge. */
class FakeCanvas {
  width = 0;
  height = 0;
  draws = 0;
  private pixels: Uint8ClampedArray = new Uint8ClampedArray(0);
  getContext() {
    return {
      drawImage: (source: FakeVideo, _x: number, _y: number, w: number, h: number) => {
        assert.equal(w, source.videoWidth, "the test frames stay under the scan edge");
        assert.equal(h, source.videoHeight);
        this.draws += 1;
        this.pixels = source.pixels;
      },
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: this.pixels,
        width: w,
        height: h,
      }),
    };
  }
}

const saved = {
  document: Object.getOwnPropertyDescriptor(globalThis, "document"),
  detector: Object.getOwnPropertyDescriptor(globalThis, "BarcodeDetector"),
};

function restore(key: string, desc: PropertyDescriptor | undefined) {
  if (desc) Object.defineProperty(globalThis, key, desc);
  else delete (globalThis as Record<string, unknown>)[key];
}

let canvases: FakeCanvas[] = [];

describe("QR reader", () => {
  beforeEach(() => {
    canvases = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement(tag: string) {
          assert.equal(tag, "canvas");
          const canvas = new FakeCanvas();
          canvases.push(canvas);
          return canvas;
        },
      },
    });
  });

  afterEach(() => {
    restore("document", saved.document);
    restore("BarcodeDetector", saved.detector);
  });

  it("reads a full connection-code page with the canvas fallback (encodeTicket's 700-character pieces)", async () => {
    delete (globalThis as Record<string, unknown>).BarcodeDetector;
    const reader = await qrReader();
    assert.ok(reader);
    const body = "Ab0_-".repeat(140).slice(0, 700);
    for (const page of [`STL1.1.2.${body}`, "STL1.2.2.tail"]) {
      assert.deepEqual(await reader.read(video(page)), [page]);
    }
    assert.equal(canvases.length, 1);
    assert.equal(canvases[0]!.draws, 2);
  });

  it("reads nothing before the camera has a frame", async () => {
    delete (globalThis as Record<string, unknown>).BarcodeDetector;
    const reader = await qrReader();
    const empty = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement;
    assert.deepEqual(await reader!.read(empty), []);
    assert.equal(canvases[0]!.draws, 0);
  });

  it("prefers the browser's detector when it reads QR codes", async () => {
    class Detector {
      static async getSupportedFormats() {
        return ["ean_13", "qr_code"];
      }
      async detect() {
        return [{ rawValue: "STL1.1.1.native" }, { rawValue: "" }, {}];
      }
    }
    Object.defineProperty(globalThis, "BarcodeDetector", { value: Detector, configurable: true });
    const reader = await qrReader();
    assert.deepEqual(await reader!.read(video("ignored")), ["STL1.1.1.native"]);
    assert.equal(canvases.length, 0);
  });

  it("falls back to the canvas when the browser's detector has no QR format", async () => {
    class Detector {
      static async getSupportedFormats() {
        return ["ean_13"];
      }
      async detect(): Promise<{ rawValue?: string }[]> {
        throw new Error("not used");
      }
    }
    Object.defineProperty(globalThis, "BarcodeDetector", { value: Detector, configurable: true });
    const reader = await qrReader();
    assert.deepEqual(await reader!.read(video("STL1.1.1.fallback")), ["STL1.1.1.fallback"]);
    assert.equal(canvases.length, 1);
  });
});
