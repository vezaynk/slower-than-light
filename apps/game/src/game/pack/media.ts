/**
 * Pictures, waves, and fonts kept from the loaded archive.
 * A missing file leaves the caller on the drawn fallback.
 */
import {
  crewDef,
  droneDef,
  mergeAnimations,
  mergeSounds,
  readBitmapFont,
  weaponDef,
  type AnimClip,
  type AnimSheet,
  type BitmapFont,
  type CrewColor,
  type WeaponAnim,
} from "@stl/pack";
import { droneBlueprintOf } from "../gear-look.ts";
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
  /** The archive's loop flag. Game sound effects are one-shots, so audio.ts plays it once. */
  loop: boolean;
};

/** One crew colour layer: the picture for this frame, and the colour it is multiplied by. */
export type CrewLayer = { url: string; tint: CrewColor };

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
  // Font faces are built off the boot path. The stylesheet font shows until they are ready.
  void installFonts(generation);
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

/** A projectile frame's drawn size: its own proportions, with the longer side `long` pixels. */
export function projectileBox(fw: number, fh: number, long: number): { w: number; h: number } {
  const side = Math.max(1, fw, fh);
  return { w: (long * Math.max(1, fw)) / side, h: (long * Math.max(1, fh)) / side };
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

/**
 * `img/ship/drones/<image>_<layer>.png`. The blueprint's droneImage wins over the id.
 * A look key such as "striker2" is read through its blueprint (gear-look.ts DRONE_BLUEPRINT).
 */
export function droneLayerUrl(id: string, layer: "base" | "on" | "charged"): string | undefined {
  const blueprint = droneBlueprintOf(id);
  const image = droneDef(blueprint)?.image ?? blueprint;
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
 * The colour layers over one crew frame, in draw order. xftl LivingCrew.drawImage: the base sheet is drawn
 * untinted, then each `img/people/<race>_layerN.png` multiplied by a colour from that layer's `<colorList>`.
 * The race blueprint's colorList says how many layers there are. Without one, every layer the archive holds counts.
 * INFERRED: the last layer is the uniform, so it takes the crew's uniform colour. Each earlier layer takes its
 * list's first colour. No page says which layer is clothing.
 */
export function crewLayers(race: string, uniform: string): CrewLayer[] {
  const colors = crewDef(race)?.colors;
  const found: { url: string; n: number }[] = [];
  const count = colors?.length ?? 9;
  for (let n = 1; n <= count; n += 1) {
    const url = urls.get(`img/people/${race}_layer${n}.png`.toLowerCase());
    if (!url) {
      if (colors) continue;
      break;
    }
    found.push({ url, n });
  }
  const [r, g, b] = hexRgb(uniform);
  const dress: CrewColor = { r, g, b, a: 1 };
  return found.map(({ url, n }, index) => ({
    url,
    tint:
      index === found.length - 1
        ? dress
        : (colors?.[n - 1]?.[0] ?? { r: 255, g: 255, b: 255, a: 1 }),
  }));
}

/**
 * Paints one crew frame: the base untinted, then each layer multiplied by its tint (crewLayers).
 * `layers` pairs each loaded layer image with its tint, in draw order. The same frame and tints reuse the canvas.
 */
export function paintCrew(
  base: CanvasImageSource,
  layers: readonly { image: CanvasImageSource; layer: CrewLayer }[],
  frame: SheetFrame,
): string {
  const tints = layers
    .map(
      ({ layer }) => `${layer.url}:${layer.tint.r},${layer.tint.g},${layer.tint.b},${layer.tint.a}`,
    )
    .join("|");
  const key = `${generation}|${frame.url}|${frame.sx}|${frame.sy}|${frame.fw}|${frame.fh}|${tints}`;
  const hit = crewPaint.get(key);
  if (hit) return hit;
  if (typeof document === "undefined") return frame.url;
  const canvas = document.createElement("canvas");
  canvas.width = frame.fw;
  canvas.height = frame.fh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return frame.url;
  ctx.drawImage(base, frame.sx, frame.sy, frame.fw, frame.fh, 0, 0, frame.fw, frame.fh);
  for (const { image, layer } of layers) {
    const pane = document.createElement("canvas");
    pane.width = frame.fw;
    pane.height = frame.fh;
    const paneCtx = pane.getContext("2d", { willReadFrequently: true });
    if (!paneCtx) continue;
    paneCtx.drawImage(image, frame.sx, frame.sy, frame.fw, frame.fh, 0, 0, frame.fw, frame.fh);
    const data = paneCtx.getImageData(0, 0, frame.fw, frame.fh);
    tintPixels(data.data, layer.tint);
    paneCtx.putImageData(data, 0, 0);
    ctx.drawImage(pane, 0, 0);
  }
  const url = canvas.toDataURL();
  crewPaint.set(key, url);
  return url;
}

/** Multiplies RGBA pixels by a tint: each channel by r/255, g/255, b/255, and alpha by a. */
export function tintPixels(data: Uint8ClampedArray | Uint8Array, tint: CrewColor): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(((data[i] ?? 0) * tint.r) / 255);
    data[i + 1] = Math.round(((data[i + 1] ?? 0) * tint.g) / 255);
    data[i + 2] = Math.round(((data[i + 2] ?? 0) * tint.b) / 255);
    data[i + 3] = Math.round((data[i + 3] ?? 0) * Math.min(1, Math.max(0, tint.a)));
  }
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

async function installFonts(at: number): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;
  // capRatio: the cap height of the stylesheet font each face replaces, measured in Chromium (VT323 0.56 em,
  // IBM Plex Mono 0.698 em). The stylesheet's sizes were set for those faces, so the capitals keep their height.
  const jobs: {
    path: string;
    family: string;
    capRatio: number;
    variable?: string;
    fallback?: string;
    bold?: boolean;
  }[] = [
    {
      // Large HUD text: rules that set 21px or more. JustinFont12's 12-pixel capitals drop pixel rows when drawn any
      // shorter, so only those rules take it.
      path: "fonts/justinfont12bold.font",
      family: "JustinFont12",
      capRatio: 0.56,
      variable: "--font-hud-large",
      fallback: '"VT323", "IBM Plex Mono", ui-monospace, monospace',
      bold: true,
    },
    {
      // All other HUD text. Its 8-pixel capitals are only drawn larger than they are, which stays legible, so a size
      // inherited or overridden elsewhere never breaks a letter. FTL's HUD sets its small labels in this face too.
      path: "fonts/justinfont8.font",
      family: "JustinFont8Hud",
      // A touch above VT323's 0.56, so the 14px labels draw the 8-pixel capitals at least one screen pixel per pixel.
      capRatio: 0.58,
      variable: "--font-hud",
      fallback: '"VT323", "IBM Plex Mono", ui-monospace, monospace',
    },
    {
      path: "fonts/justinfont8.font",
      family: "JustinFont8",
      capRatio: 0.698,
      variable: "--font-mono",
      fallback: '"IBM Plex Mono", ui-monospace, monospace',
    },
    { path: "fonts/justinfont10.font", family: "JustinFont10", capRatio: 0.56 },
  ];
  for (const job of jobs) {
    const blob = blobs.get(job.path);
    if (!blob) continue;
    try {
      const font = readBitmapFont(new Uint8Array(await blob.arrayBuffer()));
      // A newer archive replaced this one while the bytes were read. Its own pass installs its faces.
      if (!font || at !== generation) continue;
      await applyFace(
        at,
        job.family,
        font,
        job.bold ?? false,
        job.capRatio,
        job.variable,
        job.fallback,
      );
    } catch {
      // The stylesheet font stays.
    }
  }
}

async function applyFace(
  at: number,
  family: string,
  font: BitmapFont,
  bold: boolean,
  capRatio: number,
  variable: string | undefined,
  fallback: string | undefined,
): Promise<void> {
  const bytes = ttfFromBitmap(font, family, bold, capRatio);
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const face = new FontFace(family, copy);
  await face.load();
  if (at !== generation) return;
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
