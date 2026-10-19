/**
 * Original pictures, waves, and fonts at the paths a real ftl.dat uses.
 * The pixel recipes stay the game's; this bakes them into the archive.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  allDrones,
  allWeapons,
  BED_CUES,
  CURSOR_FILE,
  FLEET_FILE,
  ICON_FILES,
  MAP_FILES,
  MUSIC_TRACKS,
  SKY_FILES,
  writeBitmapFont,
  type FontStamp,
} from "@stl/pack";
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
  DRONE_BLUEPRINT: Record<string, string | undefined>;
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

/**
 * Waves under FTL's own cue names (apps/game/src/game/audio.ts SFX_CUES), each with the tone it is baked from.
 * One variant per numbered family. "click" has no FTL cue, so the game keeps that tone.
 */
const CUES: readonly [cue: string, tone: string][] = [
  ["lightLaser1", "laser"],
  ["smallMissile1", "missile"],
  ["ionShoot1", "ion"],
  ["beam1", "COMBAT_BEAM"],
  ["hitShield1", "shield"],
  ["hitHull1", "hit"],
  ["warning", "alarm"],
  ["victory", "win"],
  ["explosion1", "die"],
  ["airLoss", "vent"],
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
  // Pictures go under the blueprint id, as an archive names them. A look key with a blueprint behind it
  // (gear-look.ts DRONE_BLUEPRINT) is drawn into that blueprint's files, not files of its own.
  const lookOf = new Map<string, string>();
  for (const [key, blueprint] of Object.entries(gear.DRONE_BLUEPRINT)) {
    if (blueprint) lookOf.set(blueprint, key);
  }
  const droneIds = new Set<string>([
    ...allDrones().map((drone) => drone.id),
    ...Object.keys(gear.DRONE_LOOKS).filter((key) => !gear.DRONE_BLUEPRINT[key]),
  ]);
  for (const id of [...droneIds].sort()) {
    const key = id in gear.DRONE_LOOKS ? id : (lookOf.get(id) ?? id);
    const art = gear.dronePixels(key in gear.DRONE_LOOKS ? key : null);
    assets.push({ path: `img/ship/drones/${id}_base.png`, bytes: artPng(art) });
    assets.push({ path: `img/ship/drones/${id}_on.png`, bytes: artPng(art, true) });
    assets.push({ path: `img/ship/drones/${id}_charged.png`, bytes: artPng(art, true) });
  }
  const races = [...crew.CREW_KIN, "repair", "battle", "boarder_ion"];
  for (const race of races) {
    const skin = SKIN[race] ?? SKIN.human;
    const kin = race === "repair" || race === "battle" || race === "boarder_ion" ? "human" : race;
    // xftl LivingCrew.drawImage: the base sheet untinted, then `<race>_layerN.png` multiplied by a colour.
    // The uniform pixels are this one layer, painted white so the tint is the uniform colour.
    assets.push({ path: `img/people/${race}_base.png`, bytes: crewPng(crew, kin, skin, "base") });
    assets.push({
      path: `img/people/${race}_layer1.png`,
      bytes: crewPng(crew, kin, skin, "layer"),
    });
    clipXml.push(...crewAnims(race));
  }
  assets.push({
    path: "img/people/female_base.png",
    bytes: crewPng(crew, "human", "#f3d2b0", "base"),
  });
  assets.push({
    path: "img/people/female_layer1.png",
    bytes: crewPng(crew, "human", "#f3d2b0", "layer"),
  });
  assets.push({ path: "img/people/green_destination.png", bytes: markerPng() });
  for (const name of Object.keys(icons.ICON_ROWS).sort()) {
    if (NOT_ROOM.has(name)) continue;
    assets.push({
      path: `img/ship/interior/${name}.png`,
      bytes: iconPng(icons.ICON_ROWS[name] ?? [], icons.ICON_SIZE),
    });
  }
  for (const [cue, tone] of CUES) {
    assets.push({ path: `audio/waves/ui/${cue}.wav`, bytes: cueWav(tone) });
  }
  for (const cue of BED_CUES) {
    assets.push({ path: `audio/waves/ui/${cue.name}.wav`, bytes: cueWav(cue.tone) });
  }
  const exploreTone = toneFile("civil_explore.ogg");
  const combatTone = toneFile("civil_combat.ogg");
  for (const track of MUSIC_TRACKS) {
    assets.push({ path: `audio/music/${track.explore}`, bytes: exploreTone });
    if (track.combat) assets.push({ path: `audio/music/${track.combat}`, bytes: combatTone });
  }
  assets.push({ path: "fonts/JustinFont8.font", bytes: fontFile(1, 8, 7) });
  assets.push({ path: "fonts/JustinFont10.font", bytes: fontFile(1, 10, 9) });
  assets.push({ path: "fonts/JustinFont12Bold.font", bytes: fontFile(2, 12, 12, true) });
  assets.push({ path: "fonts/JustinFont11Bold.font", bytes: fontFile(2, 11, 11, true) });
  assets.push({ path: "fonts/num_font.font", bytes: fontFile(2, 10, 10) });
  assets.push({ path: "fonts/HL1.font", bytes: fontFile(3, 16, 16, true) });
  assets.push({ path: "fonts/HL2.font", bytes: fontFile(2, 14, 14, true) });
  assets.push({ path: "fonts/c&c.font", bytes: fontFile(2, 12, 12) });
  assets.push({ path: "fonts/c&cnew.font", bytes: fontFile(2, 12, 12, true) });
  const scenery = sceneryAssets(icons);
  assets.push(...scenery.assets);
  clipXml.push(...scenery.clips);
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
  const sheet = `<animSheet name="${race}" w="${CREW_W * 4}" h="${CREW_H * 3}" fw="${CREW_W}" fh="${CREW_H}">people/${race}_base.png</animSheet>`;
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
  const cues = [
    ...CUES.map(([cue]) => `<${cue} volume="8">ui/${cue}.wav</${cue}>`),
    ...BED_CUES.map(
      (cue) =>
        `<${cue.name} volume="8"${cue.loop ? ' loop="true"' : ""}>ui/${cue.name}.wav</${cue.name}>`,
    ),
  ].join("\n");
  const music = MUSIC_TRACKS.map((track) => {
    const combat = track.combat ? `<combat>${track.combat}</combat>` : "";
    return `<track><name>${track.name}</name><explore>${track.explore}</explore>${combat}</track>`;
  }).join("\n");
  return `<sounds>\n<music>\n${music}\n</music>\n${cues}\n</sounds>\n`;
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

/** "base" is the figure without its uniform; "layer" is only the uniform, in white. */
function crewPng(crew: CrewModule, kin: string, skin: string, part: "base" | "layer"): Uint8Array {
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
          if ((ch === "u") !== (part === "layer")) return;
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

/** Sky plates, map marks, resource icons, the cursor, and the effect sheets. */
function sceneryAssets(icons: IconModule): {
  assets: { path: string; bytes: Uint8Array }[];
  clips: string[];
} {
  const assets: { path: string; bytes: Uint8Array }[] = [];
  const clips: string[] = [];
  const skies: [string, [number, number, number]][] = [
    [SKY_FILES.quiet, [18, 24, 42]],
    [SKY_FILES.planet, [48, 110, 176]],
    [SKY_FILES.nebula, [72, 28, 96]],
    [SKY_FILES.asteroid, [54, 48, 40]],
    [SKY_FILES.sun, [150, 48, 22]],
    [SKY_FILES.pulsar, [28, 72, 92]],
    [SKY_FILES.storm, [36, 48, 78]],
    [SKY_FILES.battery, [120, 28, 32]],
  ];
  for (const [path, tone] of skies) {
    // ftl.dat's planet_bigblue.png is a planet on a clear background, drawn over the star plate.
    assets.push({ path, bytes: path === SKY_FILES.planet ? planetPng(tone) : skyPng(tone) });
  }
  const marks: [string, [number, number, number], "diamond" | "triangle" | "blob"][] = [
    [MAP_FILES.ship, [214, 236, 248], "triangle"],
    [MAP_FILES.store, [232, 196, 48], "diamond"],
    [MAP_FILES.distress, [196, 48, 42], "triangle"],
    [MAP_FILES.quest, [64, 140, 220], "diamond"],
    [MAP_FILES.nebula, [150, 90, 210], "blob"],
    [MAP_FILES.warning, [240, 140, 48], "diamond"],
    [MAP_FILES.hazard, [220, 64, 48], "blob"],
    [MAP_FILES.boss, [180, 32, 36], "diamond"],
  ];
  for (const [path, tone, shape] of marks) {
    assets.push({ path, bytes: markPng(tone, shape) });
  }
  assets.push({ path: FLEET_FILE, bytes: fleetPng() });
  assets.push({ path: CURSOR_FILE, bytes: cursorPng() });
  for (const [name, path] of Object.entries(ICON_FILES)) {
    const rows = icons.ICON_ROWS[name];
    assets.push({
      path,
      bytes: rows ? iconPng(rows, icons.ICON_SIZE) : markPng([220, 220, 220], "diamond"),
    });
  }
  const sheets: { name: string; frames: number; fw: number; fh: number; kind: EffectKind }[] = [
    { name: "fire_large", frames: 4, fw: 16, fh: 16, kind: "fire" },
    { name: "fire_small", frames: 4, fw: 12, fh: 12, kind: "fire" },
    { name: "breach", frames: 4, fw: 16, fh: 16, kind: "breach" },
    { name: "explosion1", frames: 6, fw: 20, fh: 20, kind: "burst" },
    { name: "explosion_big1", frames: 4, fw: 28, fh: 28, kind: "burst" },
  ];
  for (const sheet of sheets) {
    assets.push({
      path: `img/effects/${sheet.name}.png`,
      bytes: effectSheet(sheet.frames, sheet.fw, sheet.fh, sheet.kind),
    });
    clips.push(effectAnim(sheet.name, sheet.frames, sheet.fw, sheet.fh, "effects"));
  }
  for (let i = 0; i < 10; i += 1) {
    const name = `asteroid${i}`;
    assets.push({ path: `img/effects/${name}.png`, bytes: asteroidPng(i) });
    clips.push(effectAnim(name, 1, 16, 16, "effects"));
  }
  return { assets, clips };
}

type EffectKind = "fire" | "breach" | "burst";

function effectAnim(name: string, frames: number, fw: number, fh: number, folder: string): string {
  const w = frames * fw;
  return `<animSheet name="${name}" w="${w}" h="${fh}" fw="${fw}" fh="${fh}">${folder}/${name}.png</animSheet>\n<anim name="${name}"><sheet>${name}</sheet><desc length="${frames}" x="0" y="0"/><time>1</time></anim>`;
}

/**
 * A starfield over the plate's tone, at a size the game shows close to 1:1 (it covers the play area). Stars are single
 * pixels at hashed positions with varied brightness, roughly one in 900 pixels, so the plate reads as distant space.
 */
function skyPng(tone: [number, number, number]): Uint8Array {
  const w = 640;
  const h = 360;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const at = (y * w + x) * 4;
      const roll = starHash(x, y);
      const star = roll % 900 === 0;
      const glow = star ? 0.45 + ((roll >>> 10) % 55) / 100 : 0;
      rgba[at] = Math.round(tone[0] + (236 - tone[0]) * glow);
      rgba[at + 1] = Math.round(tone[1] + (240 - tone[1]) * glow);
      rgba[at + 2] = Math.round(tone[2] + (248 - tone[2]) * glow);
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(w, h, rgba);
}

/** A lit pixel-art planet on a clear background: light from the upper left, a dark limb, and faint bands. */
function planetPng(tone: [number, number, number]): Uint8Array {
  const size = 128;
  const r = 58;
  const c = (size - 1) / 2;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - c) / r;
      const dy = (y - c) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const dz = Math.sqrt(1 - d2);
      const light = Math.max(0, -0.55 * dx - 0.55 * dy + 0.63 * dz);
      const band = 0.06 * Math.sin((dy + 0.15 * dx) * 14);
      // Three steps of shade keep it reading as pixel art.
      const shade = Math.min(1.15, Math.round((0.25 + 0.85 * light + band) * 4) / 4);
      const at = (y * size + x) * 4;
      rgba[at] = Math.min(255, Math.round(tone[0] * shade));
      rgba[at + 1] = Math.min(255, Math.round(tone[1] * shade));
      rgba[at + 2] = Math.min(255, Math.round(tone[2] * shade));
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(size, size, rgba);
}

function starHash(x: number, y: number): number {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function markPng(
  tone: [number, number, number],
  shape: "diamond" | "triangle" | "blob",
): Uint8Array {
  const size = 16;
  const rgba = new Uint8Array(size * size * 4);
  const cx = 7.5;
  const cy = 7.5;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const on =
        shape === "diamond"
          ? dx + dy <= 6
          : shape === "triangle"
            ? y >= 3 && y <= 13 && dx <= (y - 2) * 0.55
            : dx * dx + dy * dy <= 30;
      if (!on) continue;
      const at = (y * size + x) * 4;
      rgba[at] = tone[0];
      rgba[at + 1] = tone[1];
      rgba[at + 2] = tone[2];
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(size, size, rgba);
}

function fleetPng(): Uint8Array {
  const w = 32;
  const h = 16;
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const body = x >= 4 && x <= 22 && y >= 4 && y <= 11;
      const nose = x > 22 && x <= 28 && Math.abs(y - 7.5) <= (28 - x) * 0.7;
      if (!body && !nose) continue;
      const at = (y * w + x) * 4;
      rgba[at] = 240;
      rgba[at + 1] = 120;
      rgba[at + 2] = 48;
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(w, h, rgba);
}

function cursorPng(): Uint8Array {
  const size = 16;
  const rgba = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x <= y && x < 10 && y < 14; x += 1) {
      const edge = x === 0 || x === y || y === 13;
      const at = (y * size + x) * 4;
      rgba[at] = edge ? 20 : 244;
      rgba[at + 1] = edge ? 20 : 244;
      rgba[at + 2] = edge ? 24 : 236;
      rgba[at + 3] = 255;
    }
  }
  return rgbaPng(size, size, rgba);
}

function effectSheet(frames: number, fw: number, fh: number, kind: EffectKind): Uint8Array {
  const w = frames * fw;
  const rgba = new Uint8Array(w * fh * 4);
  for (let frame = 0; frame < frames; frame += 1) {
    for (let y = 0; y < fh; y += 1) {
      for (let x = 0; x < fw; x += 1) {
        const colour = effectPixel(kind, frame, frames, x, y, fw, fh);
        if (!colour) continue;
        const at = (y * w + frame * fw + x) * 4;
        rgba[at] = colour[0];
        rgba[at + 1] = colour[1];
        rgba[at + 2] = colour[2];
        rgba[at + 3] = colour[3];
      }
    }
  }
  return rgbaPng(w, fh, rgba);
}

function effectPixel(
  kind: EffectKind,
  frame: number,
  frames: number,
  x: number,
  y: number,
  fw: number,
  fh: number,
): [number, number, number, number] | null {
  const cx = (fw - 1) / 2;
  const cy = (fh - 1) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.hypot(dx, dy);
  if (kind === "fire") {
    const rise = (fh - 1 - y) / fh;
    const spread = fw * (0.18 + frame * 0.06) * (1 - rise * 0.65);
    if (y < fh * 0.2 || Math.abs(dx) > spread) return null;
    const hot = y > fh * 0.62;
    return hot ? [255, 214, 72, 255] : [224, 84, 22, 230];
  }
  if (kind === "breach") {
    const hole = 2 + frame;
    if (dist > hole + 2) return null;
    if (dist > hole) return [150, 158, 168, 255];
    return [8, 10, 16, 255];
  }
  const ring = 2 + (frame / Math.max(1, frames - 1)) * (Math.min(fw, fh) / 2 - 2);
  if (Math.abs(dist - ring) > 1.4) return null;
  return [255, 186, 64, 255];
}

function asteroidPng(index: number): Uint8Array {
  const size = 16;
  const rgba = new Uint8Array(size * size * 4);
  const tone = 90 + (index % 5) * 18;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - 7.5;
      const dy = y - 7.5;
      const bump = ((index * 3 + x) % 5) - 2;
      if (dx * dx + dy * dy > 28 + bump) continue;
      const at = (y * size + x) * 4;
      rgba[at] = tone;
      rgba[at + 1] = tone - 8;
      rgba[at + 2] = tone - 18;
      rgba[at + 3] = 255;
    }
  }
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
  const n = Math.floor(
    rate *
      (name === "die" || name === "fire" || name === "repair" ? 0.4 : name === "win" ? 0.4 : 0.16),
  );
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
                          : name === "door"
                            ? 360
                            : name === "teleport"
                              ? 180 + t * 900
                              : name === "cloak"
                                ? 240
                                : name === "death"
                                  ? 110
                                  : name === "level"
                                    ? ([392, 523, 659][Math.min(2, Math.floor(t / 0.12))] ?? 659)
                                    : name === "fire"
                                      ? 90
                                      : name === "repair"
                                        ? 480
                                        : name === "buy"
                                          ? 660
                                          : name === "sell"
                                            ? 330
                                            : name === "jump"
                                              ? 220 - t * 80
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
