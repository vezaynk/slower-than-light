import { hullDef, type HullPicture } from "@stl/pack";

const SHIP_PNG = /^img\/ship\/(.+)_(base|cloak|floor|shields1|gib\d+)\.png$/i;

export type ShipLayer = "base" | "cloak" | "floor" | "shield";

/** Vanilla cloak art adds this many pixels of outline on every side. */
const CLOAK_OUTLINE = 10;

let generation = 0;
const urls = new Map<string, string>();
const pixels = new Map<string, { w: number; h: number }>();
const listeners = new Set<() => void>();

export function subscribeShipArt(listen: () => void): () => void {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

export function shipArtGeneration(): number {
  return generation;
}

/**
 * Keeps object URLs for the ship image family.
 * A real archive and the stand-in use the same names: base, cloak, floor, shields1, and gibN.
 * Replacing the archive revokes the previous set. Other blobs stay on the path map.
 */
export async function rememberShipArt(assets: ReadonlyMap<string, Blob>): Promise<void> {
  const nextUrls = new Map<string, string>();
  const nextPixels = new Map<string, { w: number; h: number }>();
  const pending: Promise<void>[] = [];
  for (const [path, blob] of assets) {
    if (!SHIP_PNG.test(path)) continue;
    const key = path.toLowerCase();
    const url = objectUrl(blob);
    if (url) nextUrls.set(key, url);
    pending.push(
      pngSize(blob).then((size) => {
        if (size) nextPixels.set(key, size);
      }),
    );
  }
  await Promise.all(pending);
  for (const url of urls.values()) revokeUrl(url);
  urls.clear();
  pixels.clear();
  for (const [key, url] of nextUrls) urls.set(key, url);
  for (const [key, size] of nextPixels) pixels.set(key, size);
  generation += 1;
  for (const listen of listeners) listen();
}

/** The base image for a hull, when the archive held that png and the hull names a box. */
export function baseImage(id: string): ShipFrame | undefined {
  return shipImage(id, "base");
}

/** One ship layer. Cloak, floor, and shield fall back to the hull image name. */
export function shipImage(id: string, layer: ShipLayer): ShipFrame | undefined {
  const hull = hullDef(id);
  if (!hull?.picture) return undefined;
  const name =
    layer === "cloak"
      ? (hull.cloak ?? hull.img)
      : layer === "floor"
        ? (hull.floor ?? hull.img)
        : layer === "shield"
          ? (hull.shield ?? hull.img)
          : hull.img;
  if (!name) return undefined;
  const file = layer === "shield" ? `${name}_shields1` : `${name}_${layer}`;
  const url = urls.get(shipPath(file));
  if (!url) return undefined;
  const extra =
    layer === "cloak" ? hull.cloakOffset : layer === "floor" ? hull.floorOffset : undefined;
  const placed = frame(url, hull.picture, hull.grid?.x, hull.grid?.y, extra);
  if (layer === "cloak" && hull.img && cloakOutline(hull.img, file))
    return withCloakOutline(placed);
  return placed;
}

/** Explosion pieces that have both a drawing entry and a png. */
export function gibImages(id: string): ShipFrame[] {
  const hull = hullDef(id);
  if (!hull?.gibs) return [];
  const frames: ShipFrame[] = [];
  for (const gib of hull.gibs) {
    const frame = gibImage(id, gib.id);
    if (frame) frames.push(frame);
  }
  return frames;
}

/** One explosion piece. The file is `img/ship/<img>_gibN.png`. */
export function gibImage(id: string, gibId: number): ShipFrame | undefined {
  const hull = hullDef(id);
  const gib = hull?.gibs?.find((item) => item.id === gibId);
  if (!hull?.img || !hull.picture || !gib) return undefined;
  const url = urls.get(shipPath(`${hull.img}_gib${gib.id}`));
  if (!url) return undefined;
  return frame(url, hull.picture, hull.grid?.x, hull.grid?.y, gib);
}

type ShipFrame = {
  url: string;
  picture: HullPicture;
  offsetX: number;
  offsetY: number;
};

function shipPath(file: string): string {
  return `img/ship/${file}.png`.toLowerCase();
}

/**
 * A cloak png that is 20 pixels larger than the base in both axes.
 * That is the vanilla 10px outline. A same-size cloak, which the stand-in draws, is not.
 */
function cloakOutline(img: string, cloakFile: string): boolean {
  const base = pixels.get(shipPath(`${img}_base`));
  const cloak = pixels.get(shipPath(cloakFile));
  if (!base || !cloak) return false;
  return cloak.w === base.w + CLOAK_OUTLINE * 2 && cloak.h === base.h + CLOAK_OUTLINE * 2;
}

/**
 * Moves the cloak up and left by the outline, and grows the box so the outline hangs outside.
 * pictureFrame subtracts `offset`, so the (-10, -10) shift is added here, outside `frame()`.
 * Gibs use `frame()` and stay where they are.
 */
function withCloakOutline(placed: ShipFrame): ShipFrame {
  return {
    url: placed.url,
    picture: {
      ...placed.picture,
      w: placed.picture.w + CLOAK_OUTLINE * 2,
      h: placed.picture.h + CLOAK_OUTLINE * 2,
    },
    offsetX: placed.offsetX + CLOAK_OUTLINE,
    offsetY: placed.offsetY + CLOAK_OUTLINE,
  };
}

function frame(
  url: string,
  picture: HullPicture,
  gridX: number | undefined,
  gridY: number | undefined,
  extra: { x: number; y: number } | undefined,
): ShipFrame {
  return {
    url,
    picture,
    offsetX: (gridX ?? 0) - (extra?.x ?? 0),
    offsetY: (gridY ?? 0) - (extra?.y ?? 0),
  };
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

async function pngSize(blob: Blob): Promise<{ w: number; h: number } | undefined> {
  if (blob.size < 24) return undefined;
  const bytes = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
  if (bytes.length < 24) return undefined;
  for (let i = 0; i < PNG_SIG.length; i += 1) if (bytes[i] !== PNG_SIG[i]) return undefined;
  if (bytes[12] !== 0x49 || bytes[13] !== 0x48 || bytes[14] !== 0x44 || bytes[15] !== 0x52) {
    return undefined;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = view.getUint32(16);
  const h = view.getUint32(20);
  if (w < 1 || h < 1) return undefined;
  return { w, h };
}

function objectUrl(blob: Blob): string | undefined {
  if (typeof URL.createObjectURL !== "function") return undefined;
  return URL.createObjectURL(blob);
}

function revokeUrl(url: string): void {
  if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}
