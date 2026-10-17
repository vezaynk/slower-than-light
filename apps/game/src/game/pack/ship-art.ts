import { hullDef, type HullPicture } from "@stl/pack";

const BASE_PNG = /^img\/ship\/[^/]+_base\.png$/i;

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
 * Keeps object URLs for `img/ship/*_base.png`.
 * Replacing the archive revokes the previous set. Other blobs stay on the path map.
 */
export function rememberShipArt(assets: ReadonlyMap<string, Blob>): void {
  for (const url of urls.values()) revokeUrl(url);
  urls.clear();
  for (const [path, blob] of assets) {
    if (!BASE_PNG.test(path)) continue;
    const url = objectUrl(blob);
    if (url) urls.set(path.toLowerCase(), url);
  }
  generation += 1;
  for (const listen of listeners) listen();
}

/** The base image for a hull, when the archive held that png and the hull names a box. */
export function baseImage(id: string):
  | {
      url: string;
      picture: HullPicture;
      offsetX: number;
      offsetY: number;
    }
  | undefined {
  const hull = hullDef(id);
  if (!hull?.img || !hull.picture) return undefined;
  const url = urls.get(`img/ship/${hull.img}_base.png`.toLowerCase());
  if (!url) return undefined;
  return {
    url,
    picture: hull.picture,
    offsetX: hull.grid?.x ?? 0,
    offsetY: hull.grid?.y ?? 0,
  };
}

function objectUrl(blob: Blob): string | undefined {
  if (typeof URL.createObjectURL !== "function") return undefined;
  return URL.createObjectURL(blob);
}

function revokeUrl(url: string): void {
  if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}
