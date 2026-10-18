/**
 * Original pictures, waves, and fonts at the paths a real ftl.dat uses.
 * The pixel recipes stay the game's; this bakes them into the archive.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { allDrones, allWeapons, writeBitmapFont, type FontStamp } from "@stl/pack";
import type { FtlDocument } from "@stl/ftldat";
import { FONT_CHARS, glyphAlpha, thicken } from "./font-bits.ts";
import { rgbaPng } from "./png.ts";
import { wavFromSamples } from "./wav.ts";

type PixelArt = {
  w: number;
  h: number;
  rows: string[];
  palette: { body: string; trim: string; glow: string };
};

type GearModule = {
  weaponPixels: (id: string) => PixelArt;
  dronePixels: (key: string | null) => PixelArt;
  DRONE_LOOKS: Record<string, unknown>;
};

type IconModule = { ICON_ROWS: Record<string, string[]>; ICON_SIZE: number };

type CrewModule = {
  CREW_KIN: readonly string[];
  crewFrame: (kin: string, pose: "walk" | "fight" | "work", frame: number) => string[];
};

const NOT_ROOM = new Set([
  "scrap",
  "fuel",
  "missile",
  "parts",
  "evade",
  "jump",
  "ship",
  "upgrade",
  "sound",
  "mute",
  "plus",
  "minus",
  "lock",
  "target",
  "pause",
  "play",
  "fast",
]);

const DRONE_ALIAS: Record<string, string> = {
  COMBAT_2: "striker2",
  DRONE_SHIELD: "overcharge",
  BATTLE: "personnel",
  BOARDER_ION: "intruder",
};

const SKIN: Record<string, string> = {
  human: "#e8b98a",
  engi: "#9be7c8",
  energy: "#d7f28a",
  mantis: "#8fd14a",
  slug: "#c084fc",
  rock: "#b9a48a",
  anaerobic: "#c9d0d8",
  crystal: "#bfe8ff",
  repair: "#9aa7b0",
  battle: "#c45a4a",
  boarder_ion: "#7eb6ff",
};

const CREW_W = 16;
const CREW_H = 12;
const POSES = ["fight", "work", "walk"] as const;

const CUES = [
  "click",
  "laser",
  "missile",
  "ion",
  "COMBAT_BEAM",
  "shield",
  "hit",
  "alarm",
  "win",
  "die",
  "vent",
];

let mediaPromise: Promise<{
  documents: FtlDocument[];
  assets: { path: string; bytes: Uint8Array }[];
}> | null = null;

/** Original weapon, crew, drone, room, sound, and font files. One build per process. */
export function standInMedia(): Promise<{
  documents: FtlDocument[];
  assets: { path: string; bytes: Uint8Array }[];
}> {
  mediaPromise ??= buildMedia();
  return mediaPromise;
}

async function buildMedia(): Promise<{
  documents: FtlDocument[];
  assets: { path: string; bytes: Uint8Array }[];
}> {
  const gear = await loadModule<GearModule>("../../../apps/game/src/game/gear-look.ts");
  const icons = await loadModule<IconModule>("../../../apps/game/src/game/icons.ts");
  const crew = await loadModule<CrewModule>("../../../apps/game/src/game/crew-pixels.ts");
  const assets: { path: string; bytes: Uint8Array }[] = [];
  const weaponXml: string[] = [];
  const clipXml: string[] = [];
  for (const weapon of allWeapons()) {
    const art = gear.weaponPixels(weapon.id);
    assets.push({ path: `img/weapons/${weapon.id}.png`, bytes: artPng(art) });
    assets.push({
      path: `img/weapons/${weapon.id}_shot.png`,
      bytes: shotPng(art.palette.glow),
    });
    weaponXml.push(weaponAnimXml(weapon.id, art.w, art.h));
    clipXml.push(clipXmlFor(`${weapon.id}_shot`, `${weapon.id}_shot`, 8, 8));
  }
  for (const kind of ["laser", "missile", "ion", "flak", "bomb"]) {
    const art = gear.weaponPixels(fallbackId(kind));
    assets.push({ path: `img/weapons/${kind}_shot.png`, bytes: shotPng(art.palette.glow) });
    clipXml.push(clipXmlFor(`${kind}_shot`, `${kind}_shot`, 8, 8));
  }
  const droneIds = new Set<string>([
    ...allDrones().map((drone) => drone.id),
    ...Object.keys(gear.DRONE_LOOKS),
  ]);
  for (const id of [...droneIds].sort()) {
    const key = id in gear.DRONE_LOOKS ? id : (DRONE_ALIAS[id] ?? id);
    const art = gear.dronePixels(key in gear.DRONE_LOOKS ? key : null);
    assets.push({ path: `img/ship/drones/${id}_base.png`, bytes: artPng(art) });
    assets.push({ path: `img/ship/drones/${id}_on.png`, bytes: artPng(art, true) });
    assets.push({ path: `img/ship/drones/${id}_charged.png`, bytes: artPng(art, true) });
  }
  const races = [...crew.CREW_KIN, "repair", "battle", "boarder_ion"];
  for (const race of races) {
    const skin = SKIN[race] ?? SKIN.human;
    assets.push({
      path: `img/people/${race}.png`,
      bytes: crewPng(
        crew,
        race === "repair" || race === "battle" || race === "boarder_ion" ? "human" : race,
        skin,
      ),
    });
    clipXml.push(...crewAnims(race));
  }
  assets.push({
    path: "img/people/female_base.png",
    bytes: crewPng(crew, "human", "#f3d2b0"),
  });
  assets.push({ path: "img/people/green_destination.png", bytes: markerPng() });
  for (const name of Object.keys(icons.ICON_ROWS).sort()) {
    if (NOT_ROOM.has(name)) continue;
    assets.push({
      path: `img/ship/interior/${name}.png`,
      bytes: iconPng(icons.ICON_ROWS[name] ?? [], icons.ICON_SIZE),
    });
  }
  for (const name of CUES) {
    assets.push({ path: `audio/waves/ui/${name}.wav`, bytes: cueWav(name) });
  }
  assets.push({ path: "audio/music/civil_explore.ogg", bytes: toneFile("civil_explore.ogg") });
  assets.push({ path: "audio/music/civil_combat.ogg", bytes: toneFile("civil_combat.ogg") });
  assets.push({ path: "fonts/JustinFont8.font", bytes: fontFile(1, 8, 7) });
  assets.push({ path: "fonts/JustinFont10.font", bytes: fontFile(1, 10, 9) });
  assets.push({ path: "fonts/JustinFont12Bold.font", bytes: fontFile(2, 12, 12, true) });
  const documents: FtlDocument[] = [
    {
      path: "data/animations.xml",
      xml: `<animations>\n${weaponXml.join("\n")}\n${clipXml.join("\n")}\n</animations>\n`,
    },
    { path: "data/dlcAnimations.xml", xml: "<animations></animations>\n" },
    { path: "data/sounds.xml", xml: soundsXml() },
    { path: "data/dlcSounds.xml", xml: "<sounds><music></music></sounds>\n" },
  ];
  return { documents, assets };
}

function weaponAnimXml(id: string, w: number, h: number): string {
  const sheet = `<animSheet name="${id}" w="${w}" h="${h}" fw="${w}" fh="${h}">weapons/${id}.png</animSheet>`;
  const anim = `<weaponAnim name="${id}"><sheet>${id}</sheet><desc length="1" x="0" y="0"/><chargedFrame>0</chargedFrame><fireFrame>0</fireFrame><mountPoint x="0" y="${Math.floor(h / 2)}"/></weaponAnim>`;
  return `${sheet}\n${anim}`;
}

function clipXmlFor(name: string, sheet: string, w: number, h: number): string {
  return `<animSheet name="${sheet}" w="${w}" h="${h}" fw="${w}" fh="${h}">weapons/${sheet}.png</animSheet>\n<anim name="${name}"><sheet>${sheet}</sheet><desc length="1" x="0" y="0"/><time>1</time></anim>`;
}

function crewAnims(race: string): string[] {
  const sheet = `<animSheet name="${race}" w="${CREW_W * 4}" h="${CREW_H * 3}" fw="${CREW_W}" fh="${CREW_H}">people/${race}.png</animSheet>`;
  const dirs = ["down", "right", "up", "left"];
  const lines = [sheet];
  for (const dir of dirs) lines.push(animTag(`${race}_walk_${dir}`, race, 4, 0));
  for (const dir of dirs) lines.push(animTag(`${race}_type_${dir}`, race, 4, 1));
  lines.push(animTag(`${race}_punch_down`, race, 4, 2));
  lines.push(animTag(`${race}_punch_up`, race, 4, 2));
  for (const dir of dirs) lines.push(animTag(`${race}_fire_${dir}`, race, 4, 2));
  lines.push(animTag(`${race}_repair`, race, 1, 1));
  return lines;
}

function animTag(name: string, sheet: string, length: number, y: number): string {
  return `<anim name="${name}"><sheet>${sheet}</sheet><desc length="${length}" x="0" y="${y}"/><time>1</time></anim>`;
}

function soundsXml(): string {
  const cues = CUES.map((name) => `<${name} volume="8">ui/${name}.wav</${name}>`).join("\n");
  return `<sounds>\n<music>\n<track><name>civil</name><explore>civil_explore.ogg</explore><combat>civil_combat.ogg</combat></track>\n</music>\n${cues}\n</sounds>\n`;
}

function artPng(art: PixelArt, hot = false): Uint8Array {
  const rgba = new Uint8Array(art.w * art.h * 4);
  const body = rgb(art.palette.body);
  const trim = rgb(art.palette.trim);
  const glow = hot ? [255, 244, 214] : rgb(art.palette.glow);
  art.rows.forEach((row, y) => {
    if (y >= art.h) return;
    [...row].forEach((ch, x) => {
      if (x >= art.w) return;
      const colour =
        ch === "b"
          ? body
          : ch === "t"
            ? trim
            : ch === "g"
              ? glow
              : ch === "o"
                ? [20, 24, 29]
                : null;
      if (!colour) return;
      const at = (y * art.w + x) * 4;
      rgba[at] = colour[0] ?? 0;
      rgba[at + 1] = colour[1] ?? 0;
      rgba[at + 2] = colour[2] ?? 0;
      rgba[at + 3] = 255;
    });
  });
  return rgbaPng(art.w, art.h, rgba);
}

function shotPng(glow: string): Uint8Array {
  const size = 8;
  const rgba = new Uint8Array(size * size * 4);
  const colour = rgb(glow);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = (x - 3.5) ** 2 + (y - 3.5) ** 2;
      if (d > 12) continue;
      const at = (y * size + x) * 4;
      rgba[at] = colour[0] ?? 0;
      rgba[at + 1] = colour[1] ?? 0;
      rgba[at + 2] = colour[2] ?? 0;
      rgba[at + 3] = d < 4 ? 255 : 180;
    }
  }
  return rgbaPng(size, size, rgba);
}

function crewPng(crew: CrewModule, kin: string, skin: string): Uint8Array {
  const width = CREW_W * 4;
  const height = CREW_H * 3;
  const rgba = new Uint8Array(width * height * 4);
  const paint = rgb(skin);
  POSES.forEach((pose, row) => {
    for (let frame = 0; frame < 4; frame += 1) {
      const rows = crew.crewFrame(kin, pose, frame);
      rows.forEach((line, y) => {
        if (y >= CREW_H) return;
        [...line].forEach((ch, x) => {
          if (x >= CREW_W || ch === ".") return;
          const colour = ch === "h" ? paint : ch === "u" ? [255, 255, 255] : [26, 18, 12];
          const px = frame * CREW_W + x;
          const py = row * CREW_H + y;
          const at = (py * width + px) * 4;
          rgba[at] = colour[0] ?? 0;
          rgba[at + 1] = colour[1] ?? 0;
          rgba[at + 2] = colour[2] ?? 0;
          rgba[at + 3] = 255;
        });
      });
    }
  });
  return rgbaPng(width, height, rgba);
}

function iconPng(rows: readonly string[], size: number): Uint8Array {
  const rgba = new Uint8Array(size * size * 4);
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "." || y >= size || x >= size) return;
      const at = (y * size + x) * 4;
      rgba[at] = 255;
      rgba[at + 1] = 255;
      rgba[at + 2] = 255;
      rgba[at + 3] = ch === "+" ? 115 : 255;
    });
  });
  return rgbaPng(size, size, rgba);
}

function markerPng(): Uint8Array {
  const size = 8;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const at = (y * size + x) * 4;
      rgba[at] = edge ? 20 : 70;
      rgba[at + 1] = edge ? 120 : 220;
      rgba[at + 2] = edge ? 40 : 90;
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(size, size, rgba);
}

function cueWav(name: string): Uint8Array {
  const rate = 22050;
  const n = Math.floor(rate * (name === "die" ? 0.35 : name === "win" ? 0.4 : 0.16));
  const samples = Array.from({ length: n }, (_, i) => {
    const t = i / rate;
    const env = Math.exp(-t * (name === "die" ? 4 : 12));
    const freq =
      name === "missile"
        ? 180
        : name === "hit"
          ? 140
          : name === "ion"
            ? 420 + t * 400
            : name === "shield"
              ? 520
              : name === "alarm"
                ? i % 1800 < 900
                  ? 740
                  : 520
                : name === "win"
                  ? ([523, 659, 784][Math.min(2, Math.floor(t / 0.12))] ?? 784)
                  : name === "COMBAT_BEAM"
                    ? 300
                    : name === "vent"
                      ? 200
                      : name === "laser"
                        ? 880 - t * 2000
                        : name === "click"
                          ? 640
                          : 400;
    const tone = Math.sin(2 * Math.PI * freq * t);
    const noise =
      name === "hit" || name === "missile" || name === "laser" || name === "vent" ? hash(i) : 0;
    return (tone * 0.7 + noise * 0.3) * env * 0.8;
  });
  return wavFromSamples(samples, rate);
}

function fontFile(scale: number, spacing: number, lineTop: number, bold = false): Uint8Array {
  const chars = [...FONT_CHARS, ..."abcdefghijklmnopqrstuvwxyz"];
  const stamps: FontStamp[] = chars.map((ch) => {
    if (ch === " ") return { ch: 32, w: 3 * scale, h: 0, ascent: 0 };
    const glyph = glyphAlpha(ch, scale);
    const alpha = bold ? thicken(glyph.alpha, glyph.w, glyph.h) : glyph.alpha;
    return { ch: ch.charCodeAt(0), w: glyph.w, h: glyph.h, ascent: glyph.h, alpha };
  });
  return writeBitmapFont(stamps, spacing, lineTop);
}

function toneFile(name: string): Uint8Array {
  return new Uint8Array(readFileSync(new URL(`../tones/${name}`, import.meta.url)));
}

function fallbackId(kind: string): string {
  if (kind === "missile") return "MISSILES_2_PLAYER";
  if (kind === "ion") return "ION_1";
  if (kind === "flak") return "SHOTGUN";
  if (kind === "bomb") return "BOMB_1";
  return "LASER_BURST_1";
}

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hash(i: number): number {
  const n = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  return ((n >>> 0) / 4294967295) * 2 - 1;
}

async function loadModule<T>(rel: string): Promise<T> {
  const href = pathToFileURL(fileURLToPath(new URL(rel, import.meta.url))).href;
  return import(href) as Promise<T>;
}
