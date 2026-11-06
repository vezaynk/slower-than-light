/**
 * Reads QR codes from the camera. The browser's BarcodeDetector is used where it reads QR codes (Chrome, Android).
 * WebKit has none, so on an iPhone (Safari, the installed app, and every other iOS browser) frames are drawn to a
 * canvas and read with jsQR, loaded only when needed.
 */

export type QrReader = { read(video: HTMLVideoElement): Promise<string[]> };

type NativeDetector = { detect(source: HTMLVideoElement): Promise<{ rawValue?: string }[]> };
type NativeCtor = {
  new (opts: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

/** Longest side of the frame jsQR reads. A full camera frame is slow on a phone, and a code fills much of it. */
const SCAN_EDGE = 640;

async function nativeReader(): Promise<QrReader | null> {
  const Ctor = (globalThis as { BarcodeDetector?: NativeCtor }).BarcodeDetector;
  if (!Ctor) return null;
  try {
    const formats = (await Ctor.getSupportedFormats?.()) ?? ["qr_code"];
    if (!formats.includes("qr_code")) return null;
    const detector = new Ctor({ formats: ["qr_code"] });
    return {
      read: async (video) =>
        (await detector.detect(video)).flatMap((code) => (code.rawValue ? [code.rawValue] : [])),
    };
  } catch {
    return null;
  }
}

async function canvasReader(): Promise<QrReader> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d canvas");
  return {
    read: async (video) => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return [];
      const scale = Math.min(1, SCAN_EDGE / Math.max(w, h));
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
      return code?.data ? [code.data] : [];
    },
  };
}

/** The best QR reader this browser has. Only a browser with no canvas at all gets none. */
export async function qrReader(): Promise<QrReader | null> {
  const native = await nativeReader();
  if (native) return native;
  try {
    return await canvasReader();
  } catch {
    return null;
  }
}
