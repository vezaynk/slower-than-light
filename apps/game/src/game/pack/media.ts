/**
 * Pictures, waves, and fonts kept from the loaded archive.
 * A missing file leaves the caller on the drawn fallback.
 */
import {
  droneDef,
  mergeAnimations,
  mergeSounds,
  readBitmapFont,
  weaponDef,
  type AnimClip,
  type AnimSheet,
  type BitmapFont,
  type WeaponAnim,
} from "@stl/pack";
import { ttfFromBitmap } from "./bitmap-ttf.ts";

export type WeaponPhase = "idle" | "charged" | "fire";

export type SheetFrame = {
  url: string;
  fw: number;
  fh: number;
  col: number;
  row: number;
  sheetW: number;
  sheetH: number;
  sx: number;
  sy: number;
};

export type SoundClip = {
  name: string;
  file: string;
  blob: Blob;
  /** 0 to 1, from the archive volume attribute. */
  volume: number;
  loop: boolean;
};

const KIND_SHOT: Record<string, string> = {
  laser: "laser_shot",
  missile: "missile_shot",
  ion: "ion_shot",
  flak: "flak_shot",
  bomb: "bomb_shot",
  beam: "laser_shot",
};

let generation = 0;
const listeners = new Set<() => void>();
const urls = new Map<string, string>();
const blobs = new Map<string, Blob>();
const sheets = new Map<string, AnimSheet>();
const clips = new Map<string, AnimClip>();
const weapons = new Map<string, WeaponAnim>();
const cues = new Map<string, SoundClip>();
const tracks = new Map<string, { explore: string; combat?: string }>();
const images = new Map<string, HTMLImageElement>();
const crewPaint = new Map<string, string>();
const faces: FontFace[] = [];

export function subscribeArchive(listen: () => void): () => void {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

export function archiveGeneration(): number {
  return generation;
}

/**
 * Keeps the animation documents, the sound documents, and the picture bytes.
 * Ship hull layers stay with `rememberShipArt`. Replacing the archive drops the previous set.
 */
export async function rememberArchive(
  documents: readonly { path: string; xml: string }[],
  assets: ReadonlyMap<string, Blob>,
): Promise<void> {
  for (const url of urls.values()) revokeUrl(url);
  urls.clear();
  blobs.clear();
  sheets.clear();
  clips.clear();
  weapons.clear();
  cues.clear();
  tracks.clear();
  images.clear();
  crewPaint.clear();
  dropFaces();
  const animXml: string[] = [];
  const soundXml: string[] = [];
  for (const doc of documents) {
    const path = doc.path.toLowerCase();
    if (path.endsWith("animations.xml")) animXml.push(doc.xml);
    else if (path.endsWith("sounds.xml")) soundXml.push(doc.xml);
  }
  const anim = mergeAnimations(animXml);
  for (const row of anim.sheets) sheets.set(row.name, row);
  for (const row of anim.clips) clips.set(row.name, row);
  for (const row of anim.weapons) weapons.set(row.name, row);
  for (const [path, blob] of assets) blobs.set(path.toLowerCase(), blob);
  for (const [path, blob] of blobs) {
    if (!path.endsWith(".png")) continue;
    const url = objectUrl(blob);
    if (url) urls.set(path, url);
  }
  const sound = mergeSounds(soundXml);
  for (const row of sound.cues) {
    const blob = blobs.get(row.file.toLowerCase());
    if (!blob) continue;
    cues.set(row.name, {
      name: row.name,
      file: row.file,
      blob,
      volume: row.volume,
      loop: row.loop,
    });
  }
  for (const row of sound.tracks) {
    const track: { explore: string; combat?: string } = { explore: row.explore };
    if (row.combat) track.combat = row.combat;
    tracks.set(row.name, track);
  }
  generation += 1;
  for (const listen of listeners) listen();
  await installFonts();
}

/** One frame of a weapon sheet. `weaponArt` names the anim; a stand-in uses the blueprint id. */
export function weaponFrame(id: string, phase: WeaponPhase = "idle"): SheetFrame | undefined {
  const anim = weapons.get(weaponDef(id)?.art ?? id);
  if (!anim) return undefined;
  const sheet = sheets.get(anim.sheet);
  if (!sheet) return undefined;
  const index = phase === "fire" ? anim.fireFrame : phase === "charged" ? anim.chargedFrame : 0;
  return frameOf(sheet, anim.x, anim.y, index);
}

/** The projectile picture. `<image>` wins, then `<id>_shot`, then the kind's shot. */
export function projectileFrame(
  id: string | undefined,
  kind: string | undefined,
): SheetFrame | undefined {
  const named = id ? (weaponDef(id)?.image ?? `${id}_shot`) : undefined;
  const fallback = kind ? KIND_SHOT[kind] : undefined;
  for (const name of [named, fallback]) {
    if (!name) continue;
    const clip = clips.get(name);
    const sheet = clip ? sheets.get(clip.sheet) : undefined;
    if (!clip || !sheet) continue;
    const frame = frameOf(sheet, clip.x, clip.y, 0);
    if (frame) return frame;
  }
  return undefined;
}

/**
 * One crew frame. Idle and walk share `walk_down`.
 * Fight prefers the punch, and work prefers the typing loop.
 */
export function crewPoseFrame(
  race: string,
  pose: "idle" | "walk" | "fight" | "work",
  index: number,
): SheetFrame | undefined {
  const names =
    pose === "fight"
      ? [`${race}_punch_down`, `${race}_fire_down`, `${race}_walk_down`]
      : pose === "work"
        ? [`${race}_type_down`, `${race}_repair`, `${race}_walk_down`]
        : [`${race}_walk_down`];
  for (const name of names) {
    const clip = clips.get(name);
    const sheet = clip ? sheets.get(clip.sheet) : undefined;
    if (!clip || !sheet || clip.length < 1) continue;
    const frame = ((Math.floor(index) % clip.length) + clip.length) % clip.length;
    const slice = frameOf(sheet, clip.x, clip.y, frame);
    if (slice) return slice;
  }
  return undefined;
}

/** White interior icon, tinted by the room's current color. */
export function roomIconUrl(name: string): string | undefined {
  return urls.get(`img/ship/interior/${name}.png`.toLowerCase());
}

/** `img/ship/drones/<image>_<layer>.png`. The blueprint's droneImage wins over the id. */
export function droneLayerUrl(id: string, layer: "base" | "on" | "charged"): string | undefined {
  const image = droneDef(id)?.image ?? id;
  return urls.get(`img/ship/drones/${image}_${layer}.png`.toLowerCase());
}

export function soundCue(name: string): SoundClip | undefined {
  return cues.get(name);
}

export function soundCues(): SoundClip[] {
  return [...cues.values()];
}

/** Explore and combat files for one track. Nothing plays them on its own. */
export function musicTrack(
  name = "civil",
): { name: string; explore?: Blob; combat?: Blob } | undefined {
  const track = tracks.get(name);
  if (!track) return undefined;
  const row: { name: string; explore?: Blob; combat?: Blob } = { name };
  const explore = blobs.get(track.explore.toLowerCase());
  const combat = track.combat ? blobs.get(track.combat.toLowerCase()) : undefined;
  if (explore) row.explore = explore;
  if (combat) row.combat = combat;
  return row;
}

/** An image that has finished loading. A miss starts the load and returns undefined. */
export function loadedImage(url: string): HTMLImageElement | undefined {
  if (typeof Image === "undefined") return undefined;
  let img = images.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    images.set(url, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : undefined;
}

/**
 * Paints one crew frame and replaces the white uniform pixels.
 * The same kin and uniform reuse the previous canvas.
 */
export function recolorCrew(image: CanvasImageSource, frame: SheetFrame, uniform: string): string {
  const key = `${generation}|${frame.url}|${frame.sx}|${frame.sy}|${frame.fw}|${frame.fh}|${uniform}`;
  const hit = crewPaint.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return frame.url;
  const canvas = document.createElement("canvas");
  canvas.width = frame.fw;
  canvas.height = frame.fh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return frame.url;
  ctx.drawImage(image, frame.sx, frame.sy, frame.fw, frame.fh, 0, 0, frame.fw, frame.fh);
  const data = ctx.getImageData(0, 0, frame.fw, frame.fh);
  const rgb = hexRgb(uniform);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i] ?? 0;
    const g = data.data[i + 1] ?? 0;
    const b = data.data[i + 2] ?? 0;
    const a = data.data[i + 3] ?? 0;
    if (a < 200 || r < 250 || g < 250 || b < 250) continue;
    data.data[i] = rgb[0];
    data.data[i + 1] = rgb[1];
    data.data[i + 2] = rgb[2];
  }
  ctx.putImageData(data, 0, 0);
  const url = canvas.toDataURL();
  crewPaint.set(key, url);
  return url;
}

function frameOf(
  sheet: AnimSheet,
  x: number,
  yFromBottom: number,
  index: number,
): SheetFrame | undefined {
  const url = urls.get(sheet.file.toLowerCase());
  if (!url) return undefined;
  const cols = Math.max(1, Math.floor(sheet.w / sheet.fw));
  const rows = Math.max(1, Math.floor(sheet.h / sheet.fh));
  const col = Math.min(cols - 1, Math.max(0, x + index));
  const fromBottom = Math.min(rows - 1, Math.max(0, yFromBottom));
  const row = rows - 1 - fromBottom;
  return {
    url,
    fw: sheet.fw,
    fh: sheet.fh,
    col,
    row,
    sheetW: sheet.w,
    sheetH: sheet.h,
    sx: col * sheet.fw,
    sy: row * sheet.fh,
  };
}

async function installFonts(): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  const jobs: {
    path: string;
    family: string;
    variable?: string;
    fallback?: string;
    bold?: boolean;
  }[] = [
    {
      path: "fonts/justinfont12bold.font",
      family: "JustinFont12",
      variable: "--font-hud",
      fallback: '"VT323", "IBM Plex Mono", ui-monospace, monospace',
      bold: true,
    },
    {
      path: "fonts/justinfont8.font",
      family: "JustinFont8",
      variable: "--font-mono",
      fallback: '"IBM Plex Mono", ui-monospace, monospace',
    },
    { path: "fonts/justinfont10.font", family: "JustinFont10" },
  ];
  for (const job of jobs) {
    const blob = blobs.get(job.path);
    if (!blob) continue;
    try {
      const font = readBitmapFont(new Uint8Array(await blob.arrayBuffer()));
      if (!font) continue;
      await applyFace(job.family, font, job.bold ?? false, job.variable, job.fallback);
    } catch {
      // The stylesheet font stays.
    }
  }
}

async function applyFace(
  family: string,
  font: BitmapFont,
  bold: boolean,
  variable: string | undefined,
  fallback: string | undefined,
): Promise<void> {
  const bytes = ttfFromBitmap(font, family, bold);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const face = new FontFace(family, copy);
  await face.load();
  document.fonts.add(face);
  faces.push(face);
  if (variable && fallback) {
    document.documentElement.style.setProperty(variable, `"${family}", ${fallback}`);
  }
}

function dropFaces(): void {
  if (typeof document === "undefined") return;
  for (const face of faces) document.fonts.delete(face);
  faces.length = 0;
}

function hexRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (!Number.isFinite(n)) return [61, 111, 176];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function objectUrl(blob: Blob): string | undefined {
  if (typeof URL.createObjectURL !== "function") return undefined;
  return URL.createObjectURL(blob);
}

function revokeUrl(url: string): void {
  if (typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url);
}
