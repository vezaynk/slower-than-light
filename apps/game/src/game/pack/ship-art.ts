import { hullDef, type HullPicture } from "@stl/pack";

const SHIP_PNG = /^img\/ship\/(.+)_(base|cloak|floor|shields1|gib\d+)\.png$/i;

export type ShipLayer = "base" | "cloak" | "floor" | "shield";

let generation = 0;
const urls = new Map<string, string>();
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
export function rememberShipArt(assets: ReadonlyMap<string, Blob>): void {
  for (const url of urls.values()) revokeUrl(url);
  urls.clear();
  for (const [path, blob] of assets) {
    if (!SHIP_PNG.test(path)) continue;
    const url = objectUrl(blob);
    if (url) urls.set(path.toLowerCase(), url);
  }
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
  const url = urls.get(`img/ship/${file}.png`.toLowerCase());
  if (!url) return undefined;
  const extra =
    layer === "cloak" ? hull.cloakOffset : layer === "floor" ? hull.floorOffset : undefined;
  return frame(url, hull.picture, hull.grid?.x, hull.grid?.y, extra);
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
  const url = urls.get(`img/ship/${hull.img}_gib${gib.id}.png`.toLowerCase());
  if (!url) return undefined;
  return frame(url, hull.picture, hull.grid?.x, hull.grid?.y, gib);
}

type ShipFrame = {
  url: string;
  picture: HullPicture;
  offsetX: number;
  offsetY: number;
};

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

function objectUrl(blob: Blob): string | undefined {
  if (typeof URL.createObjectURL !== "function") return undefined;
  return URL.createObjectURL(blob);
}

function revokeUrl(url: string): void {
  if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}
