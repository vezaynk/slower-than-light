/**
 * Official ftl.dat paths and cue tags, snapshotted once from the public 1.6 file list
 * (hahn-kev/ftl-xml-extension default-img-files, default-music, default-sound-waves,
 * default-animations). A wrong name misses on a real archive and the current drawing stays.
 * The generator must not open a Steam dat, and this table does not copy pixels or waves.
 */

/** Soundtrack names and the ogg files under `audio/music/`. 16 pairs plus title and last stand: 34 files. */
export const MUSIC_TRACKS: readonly { name: string; explore: string; combat?: string }[] = [
  { name: "civilian", explore: "bp_MUS_CivilEXPLORE.ogg", combat: "bp_MUS_CivilBATTLE.ogg" },
  { name: "milkyway", explore: "bp_MUS_MilkyWayEXPLORE.ogg", combat: "bp_MUS_MilkyWayBATTLE.ogg" },
  {
    name: "wasteland",
    explore: "bp_MUS_WastelandEXPLORE.ogg",
    combat: "bp_MUS_WastelandBATTLE.ogg",
  },
  { name: "rock", explore: "bp_MUS_RockmenEXPLORE.ogg", combat: "bp_MUS_RockmenBATTLE.ogg" },
  { name: "engi", explore: "bp_MUS_EngiEXPLORE.ogg", combat: "bp_MUS_EngiBATTLE.ogg" },
  { name: "debris", explore: "bp_MUS_DebrisEXPLORE.ogg", combat: "bp_MUS_DebrisBATTLE.ogg" },
  { name: "mantis", explore: "bp_MUS_MantisEXPLORE.ogg", combat: "bp_MUS_MantisBATTLE.ogg" },
  {
    name: "deepspace",
    explore: "bp_MUS_DeepspaceEXPLORE.ogg",
    combat: "bp_MUS_DeepspaceBATTLE.ogg",
  },
  { name: "colonial", explore: "bp_MUS_ColonialEXPLORE.ogg", combat: "bp_MUS_ColonialBATTLE.ogg" },
  { name: "void", explore: "bp_MUS_VoidEXPLORE.ogg", combat: "bp_MUS_VoidBATTLE.ogg" },
  { name: "zoltan", explore: "bp_MUS_ZoltanEXPLORE.ogg", combat: "bp_MUS_ZoltanBATTLE.ogg" },
  { name: "cosmos", explore: "bp_MUS_CosmosEXPLORE.ogg", combat: "bp_MUS_CosmosBATTLE.ogg" },
  { name: "title", explore: "bp_MUS_TitleScreen.ogg" },
  { name: "laststand", explore: "bp_MUS_LastStand.ogg" },
  { name: "shrike", explore: "bp_MUS_ShrikeEXPLORE.ogg", combat: "bp_MUS_ShrikeBATTLE.ogg" },
  { name: "slug", explore: "bp_MUS_SlugEXPLORE.ogg", combat: "bp_MUS_SlugBATTLE.ogg" },
  { name: "lostship", explore: "bp_MUS_LostShipEXPLORE.ogg", combat: "bp_MUS_LostShipBATTLE.ogg" },
  { name: "hacking", explore: "bp_MUS_HackEXPLORE.ogg", combat: "bp_MUS_HackBATTLE.ogg" },
];

/**
 * Catalog sector id to the soundtrack a sector of that kind plays.
 * Written on the stand-in body only. A real archive's own trackList wins.
 */
export const SECTOR_TRACKS: Record<string, string> = {
  "civilian-start": "civilian",
  civilian: "civilian",
  engi: "engi",
  "engi-home": "engi",
  zoltan: "zoltan",
  "zoltan-home": "zoltan",
  abandoned: "lostship",
  mantis: "mantis",
  "mantis-home": "mantis",
  pirate: "wasteland",
  rebel: "milkyway",
  "rebel-stronghold": "colonial",
  rock: "rock",
  "rock-home": "rock",
  "slug-nebula": "slug",
  "slug-home": "slug",
  uncharted: "void",
  "crystal-worlds": "cosmos",
  "last-stand": "laststand",
};

/** Cues the game now plays, beyond the weapon and impact families. `loop` is honoured for fire and repair. */
export const BED_CUES: readonly { name: string; tone: string; loop?: boolean }[] = [
  { name: "doorOpen", tone: "door" },
  { name: "doorClose", tone: "door" },
  { name: "teleport", tone: "teleport" },
  { name: "cloak", tone: "cloak" },
  { name: "decloak", tone: "cloak" },
  { name: "death1", tone: "death" },
  { name: "femaleDeath1", tone: "death" },
  { name: "rockDeath", tone: "death" },
  { name: "mantisDeath", tone: "death" },
  { name: "crystalDeath", tone: "death" },
  { name: "engiDeath", tone: "death" },
  { name: "energyDeath", tone: "death" },
  { name: "levelup", tone: "level" },
  { name: "fire", tone: "fire", loop: true },
  { name: "repair", tone: "repair", loop: true },
  { name: "buy", tone: "buy" },
  { name: "sell", tone: "sell" },
  { name: "jumpLeave", tone: "jump" },
  { name: "jumpArrive", tone: "jump" },
];

/** Backdrop for the sky the stage already chooses. A missing file keeps the drawn sky. */
export const SKY_FILES = {
  quiet: "img/stars/bg_dullstars.png",
  planet: "img/stars/planet_bigblue.png",
  nebula: "img/stars/bg_darknebula.png",
  asteroid: "img/stars/low_asteroid.png",
  sun: "img/stars/low_sun.png",
  pulsar: "img/stars/low_pulsar.png",
  storm: "img/stars/low_storm.png",
  battery: "img/stars/bg_lonelyRedStar.png",
} as const;

export type SkyPick = {
  sun: boolean;
  pulsar: boolean;
  rocks: boolean;
  storm: boolean;
  nebula: boolean;
  battery: boolean;
  planet: boolean;
};

/** The still picture behind the stage. Gameplay flashes stay drawn on top. */
export function skyPath(scene: SkyPick): string {
  if (scene.sun) return SKY_FILES.sun;
  if (scene.pulsar) return SKY_FILES.pulsar;
  if (scene.storm) return SKY_FILES.storm;
  if (scene.rocks) return SKY_FILES.asteroid;
  if (scene.nebula) return SKY_FILES.nebula;
  if (scene.battery) return SKY_FILES.battery;
  return SKY_FILES.quiet;
}

/** Beacon marks. A kind with no file here keeps the drawn diamond. */
export const MAP_FILES = {
  ship: "img/map/map_icon_ship.png",
  store: "img/map/map_icon_diamond_yellow.png",
  distress: "img/map/map_icon_triangle_red.png",
  quest: "img/map/map_icon_diamond_blue.png",
  nebula: "img/map/nebula_0.png",
  warning: "img/map/map_icon_warning.png",
  hazard: "img/map/map_icon_hazard.png",
  boss: "img/map/map_icon_boss.png",
} as const;

/** The pursuit ship on the one-jump warning band. */
export const FLEET_FILE = "img/ship/fleet/fleet_1_med_warning.png";

export function beaconPath(tag: string, nebula: boolean, soon: boolean): string | undefined {
  if (soon) return MAP_FILES.warning;
  if (tag === "STORE") return MAP_FILES.store;
  if (tag === "DISTRESS") return MAP_FILES.distress;
  if (tag === "QUEST") return MAP_FILES.quest;
  if (tag === "EXIT") return MAP_FILES.boss;
  if (nebula) return MAP_FILES.nebula;
  return undefined;
}

/**
 * Ship-picker portrait. Official files are `<img>_base.png` inside ships_glow and ships_noglow.
 * The stem is the hull picture stem already used (`kestral`, enemy stems, `flagship-1`).
 */
export function shipPreviewPath(stem: string, glow: boolean): string {
  return `img/ships_${glow ? "glow" : "noglow"}/${stem}_base.png`;
}

/** Effect and asteroid clips. The sheet file is whatever the loaded animations.xml names. */
export const EFFECT_CLIPS = {
  fireLarge: "fire_large",
  fireSmall: "fire_small",
  breach: "breach",
  explosion: "explosion1",
  explosionBig: "explosion_big1",
} as const;

export function asteroidClip(index: number): string {
  const n = ((Math.floor(index) % 10) + 10) % 10;
  return `asteroid${n}`;
}

/** Slots that already have a drawn icon and an official file. Room masks stay on `img/ship/interior`. */
export const ICON_FILES: Record<string, string> = {
  scrap: "img/ui_icons/icon_scrap.png",
  fuel: "img/ui_icons/icon_fuel.png",
  missile: "img/ui_icons/icon_missiles.png",
  parts: "img/ui_icons/icon_drones.png",
  shields: "img/icons/s_shields.png",
  engines: "img/icons/s_engines.png",
  oxygen: "img/icons/s_oxygen.png",
  medbay: "img/icons/s_medbay.png",
  weapons: "img/icons/s_weapons.png",
  pilot: "img/icons/s_pilot.png",
  sensors: "img/icons/s_sensors.png",
  doors: "img/icons/s_doors.png",
  cloaking: "img/icons/s_cloaking.png",
  teleporter: "img/icons/s_teleporter.png",
  hacking: "img/icons/s_hacking.png",
  drones: "img/icons/s_drones.png",
  mind: "img/icons/s_mind.png",
  clonebay: "img/icons/s_clonebay.png",
  battery: "img/icons/s_battery.png",
  artillery: "img/icons/s_artillery.png",
};

export const CURSOR_FILE = "img/mouse/pointerValid.png";

export type FontFaceJob = {
  path: string;
  family: string;
  variable?: string;
  fallback?: string;
  bold?: boolean;
  /** A real TTF or OTF. Bitmap `.font` files go through the bitmap converter. */
  ttf?: boolean;
};

/** Latin faces the English UI asks for. Paths are stored lowercased by the archive reader. */
export const FONT_FACES: readonly FontFaceJob[] = [
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
  {
    path: "fonts/justinfont11bold.font",
    family: "JustinFont11",
    variable: "--font-event",
    fallback: "var(--font-hud)",
    bold: true,
  },
  {
    path: "fonts/num_font.font",
    family: "NumFont",
    variable: "--font-num",
    fallback: "var(--font-hud)",
  },
  {
    path: "fonts/hl1.font",
    family: "HL1",
    variable: "--font-title",
    fallback: "var(--font-hud)",
  },
  {
    path: "fonts/hl2.font",
    family: "HL2",
    variable: "--font-display",
    fallback: "var(--font-hud)",
  },
  {
    path: "fonts/c&c.font",
    family: "CnC",
    variable: "--font-mark",
    fallback: "var(--font-hud)",
  },
  { path: "fonts/c&cnew.font", family: "CnCNew" },
];

/** Installed when the archive has them. The stand-in does not invent CJK glyphs. */
export const CJK_FACES: readonly FontFaceJob[] = [
  { path: "fonts/ja/dotgothic-16-o.font", family: "DotGothic16" },
  { path: "fonts/ja/dotgothic-24.font", family: "DotGothic24" },
  { path: "fonts/ja/dotgothic-24-o.font", family: "DotGothic24O" },
  { path: "fonts/ja/dotgothic-32.font", family: "DotGothic32" },
  { path: "fonts/ja/dotgothic-32-o.font", family: "DotGothic32O" },
  { path: "fonts/ja/misaki_gothic.font", family: "MisakiGothic" },
  { path: "fonts/ja/mplus10.font", family: "Mplus10" },
  { path: "fonts/ja/mplus12.font", family: "Mplus12" },
  { path: "fonts/zh-hans/black.ttf", family: "SourceHanBlack", ttf: true },
];

export type ImageVariant = {
  colorblind: boolean;
  tablet: boolean;
  lang: string;
};

/**
 * Variant folders are prefixes: locale, then colourblind, then tablet, then the default picture.
 * The first file the archive actually holds wins.
 */
export function imageCandidates(path: string, variant: ImageVariant): string[] {
  const clean = path.replace(/^\/+/, "");
  const rest = clean.replace(/^img\//i, "");
  const out: string[] = [];
  const lang = variant.lang.trim().toLowerCase();
  if (lang && lang !== "en") out.push(`img/loc-${lang}/${rest}`);
  if (variant.colorblind) out.push(`img/colorblind/${rest}`);
  if (variant.tablet) out.push(`img/ipad/${rest}`);
  out.push(`img/${rest}`);
  return out.map((row) => row.toLowerCase());
}
