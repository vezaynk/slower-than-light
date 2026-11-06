import { hullDef, type HullGib, type HullPicture } from "@stl/pack";

const SHIP_PNG = /^img\/ship\/(.+)_(base|cloak|floor|shields1|gib\d+)\.png$/i;
/** Enemy plate and gibs. A player hull does not read this folder. */
const GLOW_PNG = /^img\/ships_glow\/(.+)_(base|gib\d+)\.png$/i;

export type ShipLayer = "base" | "cloak" | "floor" | "shield";

/**
 * Which ship is on screen. The player plate is `img/ship/<img>_base.png`.
 * The enemy plate is `img/ships_glow/<img>_base.png`, and that bitmap is the drawing's `<img>` box.
 * Gibs sit in the same folder as the plate. Cloak, floor, and shield stay in `img/ship`.
 */
export type HullPlate = "interior" | "glow";

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
 * `img/ship` and `img/ships_glow` stay separate. Replacing the archive revokes the previous set.
 */
export async function rememberShipArt(assets: ReadonlyMap<string, Blob>): Promise<void> {
  const nextUrls = new Map<string, string>();
  const nextPixels = new Map<string, { w: number; h: number }>();
  const pending: Promise<void>[] = [];
  for (const [path, blob] of assets) {
    if (!SHIP_PNG.test(path) && !GLOW_PNG.test(path)) continue;
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

/**
 * One ship layer. A blueprint that omits cloak, floor, or shield uses the hull image name.
 * `plate` picks the folder. It does not try the other folder when the file is absent.
 */
export function shipImage(
  id: string,
  layer: ShipLayer,
  plate: HullPlate = "interior",
): ShipFrame | undefined {
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
  const folder = layer === "base" ? plateFolder(plate) : "img/ship";
  const url = urls.get(artPath(folder, file));
  if (!url) return undefined;
  const extra =
    layer === "cloak" ? hull.cloakOffset : layer === "floor" ? hull.floorOffset : undefined;
  const placed = frame(url, hull.picture, hull.grid?.x, hull.grid?.y, extra);
  // glowOffset slides the interior plate. The iPad build is what uses it.
  // The enemy bitmap already fills the `<img>` box.
  if (layer === "base" && plate === "interior") {
    const shift = baseGlowShift(hull.glow, hull.grid?.x, hull.grid?.y);
    placed.offsetX = shift.offsetX;
    placed.offsetY = shift.offsetY;
  }
  if (layer === "cloak" && hull.img && cloakOutline(hull.img, file, plate))
    return withCloakOutline(placed);
  // FTL draws the floor and cloak at their own size from their offset. The base and shield fill the hull box.
  if (layer === "floor" || layer === "cloak") return ownSize(placed, "img/ship", file);
  return placed;
}

/** Explosion pieces that have both a drawing entry and a png in this plate's folder. */
export function gibImages(id: string, plate: HullPlate = "interior"): GibFrame[] {
  const hull = hullDef(id);
  if (!hull?.gibs) return [];
  const frames: GibFrame[] = [];
  for (const gib of hull.gibs) {
    const frame = gibImage(id, gib.id, plate);
    if (frame) frames.push({ ...frame, gib });
  }
  return frames;
}

/** A gib picture and the row that says how it flies. */
export type GibFrame = ShipFrame & { gib: HullGib };

/** Seconds a gib drifts before it is gone. INFERRED: FTL's wreck pieces drift off over a few seconds. */
export const GIB_SECONDS = 3;

/** Frames per second the archive's per-frame velocity and spin are counted in. INFERRED. */
const GIB_FPS = 60;

/**
 * Where one gib ends up after GIB_SECONDS, in hull pixels, and how far it turns, in degrees.
 * ftl.dat's `<gibN>`: velocity is pixels per frame, direction is degrees (0 right, 90 down, as kestral's lower
 * pieces head 60-120), angular is degrees per frame. Each range is rolled once from `seed`, so a hull breaks
 * the same way every time it is drawn. INFERRED: the units, read from how the vanilla numbers look on screen.
 */
export function gibFlight(gib: HullGib, seed: string): { dx: number; dy: number; spin: number } {
  let state = hashSeed(`${seed}:${gib.id}`);
  const roll = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const between = (lo: number, hi: number) => lo + (hi - lo) * roll();
  const speed = between(gib.velocityMin, gib.velocityMax);
  const heading = (between(gib.directionMin, gib.directionMax) * Math.PI) / 180;
  const frames = GIB_SECONDS * GIB_FPS;
  return {
    dx: Math.cos(heading) * speed * frames,
    dy: Math.sin(heading) * speed * frames,
    spin: between(gib.angularMin, gib.angularMax) * frames,
  };
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** One explosion piece. Player gibs are `img/ship/<img>_gibN.png`. Enemy gibs are `img/ships_glow`. */
export function gibImage(
  id: string,
  gibId: number,
  plate: HullPlate = "interior",
): ShipFrame | undefined {
  const hull = hullDef(id);
  const gib = hull?.gibs?.find((item) => item.id === gibId);
  if (!hull?.img || !hull.picture || !gib) return undefined;
  const folder = plateFolder(plate);
  const file = `${hull.img}_gib${gib.id}`;
  const url = urls.get(artPath(folder, file));
  if (!url) return undefined;
  return ownSize(frame(url, hull.picture, hull.grid?.x, hull.grid?.y, gib), folder, file);
}

type ShipFrame = {
  url: string;
  picture: HullPicture;
  offsetX: number;
  offsetY: number;
};

function plateFolder(plate: HullPlate): "img/ship" | "img/ships_glow" {
  return plate === "glow" ? "img/ships_glow" : "img/ship";
}

function artPath(folder: "img/ship" | "img/ships_glow", file: string): string {
  return `${folder}/${file}.png`.toLowerCase();
}

/**
 * The png's own width and height, when it was read. The kestrel floor is 552x235 inside a 652x418 hull box;
 * stretched to the box it hung past the hull. A same-size stand-in png does not change.
 */
function ownSize(
  placed: ShipFrame,
  folder: "img/ship" | "img/ships_glow",
  file: string,
): ShipFrame {
  const size = pixels.get(artPath(folder, file));
  if (!size) return placed;
  return { ...placed, picture: { ...placed.picture, w: size.w, h: size.h } };
}

/**
 * A cloak png that is 20 pixels larger than the base in both axes.
 * That is the vanilla 10px outline. A same-size cloak, which the stand-in draws, is not.
 */
function cloakOutline(img: string, cloakFile: string, plate: HullPlate): boolean {
  const base = pixels.get(artPath(plateFolder(plate), `${img}_base`));
  const cloak = pixels.get(artPath("img/ship", cloakFile));
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

/**
 * Glow shifts only the base layer, and only when the offset is not zero.
 * `frame` subtracts the extra, so a glow of (4, -2) moves the sprite by (+4, -2).
 */
export function baseGlowShift(
  glow: { x: number; y: number } | undefined,
  gridX = 0,
  gridY = 0,
): { offsetX: number; offsetY: number } {
  const use = glow && (glow.x !== 0 || glow.y !== 0) ? glow : undefined;
  return { offsetX: gridX - (use?.x ?? 0), offsetY: gridY - (use?.y ?? 0) };
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
