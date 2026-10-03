/**
 * INVENTED pixel art for every weapon and drone. No wiki picture is traced.
 * Each look is a short spec (frame, barrels, reach, trims, colours) that `weaponPixels`
 * and `dronePixels` paint onto a small grid. gear-look.test.ts checks that every
 * fitted weapon and every drone renders to a different picture.
 */
import { WEAPONS } from "./content.ts";
import type { SwarmKind } from "./extras/swarm.ts";

/** b = body, t = trim, g = glow, o = outline (added last), . = empty. */
export type Paint = "." | "o" | "b" | "t" | "g";
export type Palette = { body: string; trim: string; glow: string };
export type PixelArt = { w: number; h: number; rows: string[]; palette: Palette };

type Frame = "block" | "coil" | "tube" | "lens" | "drum" | "pod" | "prism";
type Emblem = "flame" | "cross" | "wrench" | "lock" | "bolt" | "ring" | "arrow" | "dot";

export type WeaponLook = Palette & {
  frame: Frame;
  /** Barrels, tubes, or emitters. Pods have none. */
  barrels: number;
  /** Barrel length in pixels past the frame. */
  reach: number;
  /** Two-pixel barrels. */
  heavy?: boolean;
  /** Mark pips under the body. */
  mark?: number;
  /** Ammo belt under the body. Not combined with mark. */
  chain?: boolean;
  /** Battery cells on top. */
  charger?: boolean;
  fins?: boolean;
  /** Pod frame only. */
  emblem?: Emblem;
};

const STEEL = "#9aa7b0";
const GUNMETAL = "#6f7b86";
const BRONZE = "#b08a5a";
const BONE = "#d8dde2";
const SLATE = "#4d5966";
const RUST = "#8a4b32";

const RED = "#ff5a3c";
const ORANGE = "#ff9a2e";
const AMBER = "#ffd23e";
const BLUE = "#6cc4ff";
const CYAN = "#7ff0ff";
const GREEN = "#7dff6a";
const VIOLET = "#c58bff";
const PINK = "#ff8fd0";

export const WEAPON_LOOKS: Record<string, WeaponLook> = {
  // Lasers: square housings, red light.
  spark: { frame: "block", barrels: 1, reach: 5, body: STEEL, trim: GUNMETAL, glow: RED },
  twin: { frame: "block", barrels: 2, reach: 6, body: STEEL, trim: SLATE, glow: RED },
  burst1: { frame: "block", barrels: 2, reach: 6, mark: 1, body: BONE, trim: GUNMETAL, glow: ORANGE },
  lineburst: { frame: "block", barrels: 3, reach: 7, mark: 2, body: BONE, trim: GUNMETAL, glow: RED },
  burst3: { frame: "block", barrels: 5, reach: 8, mark: 3, body: BONE, trim: SLATE, glow: RED },
  heavy: { frame: "block", barrels: 1, reach: 7, heavy: true, body: GUNMETAL, trim: SLATE, glow: RED },
  heavy2: { frame: "block", barrels: 2, reach: 7, heavy: true, mark: 2, body: GUNMETAL, trim: SLATE, glow: ORANGE },
  heavypierce: { frame: "block", barrels: 1, reach: 11, heavy: true, mark: 1, body: SLATE, trim: GUNMETAL, glow: AMBER },
  hullsmash: { frame: "block", barrels: 2, reach: 4, heavy: true, mark: 1, body: RUST, trim: SLATE, glow: ORANGE },
  hullsmash2: { frame: "block", barrels: 3, reach: 5, heavy: true, mark: 2, body: RUST, trim: SLATE, glow: AMBER },
  chainlaser: { frame: "block", barrels: 2, reach: 7, chain: true, body: STEEL, trim: SLATE, glow: ORANGE },
  vulcan: { frame: "drum", barrels: 4, reach: 9, chain: true, body: GUNMETAL, trim: SLATE, glow: ORANGE },
  chargers: { frame: "block", barrels: 1, reach: 4, charger: true, body: BONE, trim: SLATE, glow: AMBER },
  charger: { frame: "block", barrels: 2, reach: 6, charger: true, body: STEEL, trim: SLATE, glow: AMBER },
  charger2: { frame: "block", barrels: 4, reach: 7, charger: true, mark: 2, body: STEEL, trim: GUNMETAL, glow: AMBER },
  // Crystal: faceted prisms.
  crystalburst: { frame: "prism", barrels: 2, reach: 5, body: "#a8e8ff", trim: "#5aa8c8", glow: PINK },
  crystalburst2: { frame: "prism", barrels: 3, reach: 6, mark: 2, body: "#a8e8ff", trim: "#5aa8c8", glow: PINK },
  heavycrystal: { frame: "prism", barrels: 1, reach: 6, heavy: true, body: "#f0b8e0", trim: "#b0609a", glow: CYAN },
  heavycrystal2: { frame: "prism", barrels: 2, reach: 7, heavy: true, mark: 2, body: "#f0b8e0", trim: "#b0609a", glow: CYAN },
  // Missiles: launch tubes, warheads lit.
  dart: { frame: "tube", barrels: 1, reach: 3, fins: true, body: BRONZE, trim: RUST, glow: AMBER },
  leto: { frame: "tube", barrels: 1, reach: 3, body: STEEL, trim: GUNMETAL, glow: RED },
  artemis: { frame: "tube", barrels: 1, reach: 5, fins: true, body: BONE, trim: GUNMETAL, glow: RED },
  artemisEnemy: { frame: "tube", barrels: 1, reach: 5, fins: true, mark: 1, body: "#c8564a", trim: SLATE, glow: AMBER },
  hermes: { frame: "tube", barrels: 1, reach: 6, heavy: true, fins: true, mark: 1, body: BONE, trim: GUNMETAL, glow: ORANGE },
  breachmissiles: { frame: "tube", barrels: 1, reach: 7, heavy: true, fins: true, mark: 2, body: GUNMETAL, trim: SLATE, glow: ORANGE },
  hullmissile: { frame: "tube", barrels: 1, reach: 4, heavy: true, chain: true, body: RUST, trim: SLATE, glow: RED },
  swarmmissiles: { frame: "tube", barrels: 4, reach: 3, body: STEEL, trim: SLATE, glow: AMBER },
  pegasus: { frame: "tube", barrels: 2, reach: 5, fins: true, body: BONE, trim: SLATE, glow: BLUE },
  bossmissile: { frame: "tube", barrels: 3, reach: 6, fins: true, mark: 3, body: "#5a2a2a", trim: SLATE, glow: RED },
  // Ion: coiled housings, blue light.
  needle: { frame: "coil", barrels: 1, reach: 4, body: "#4a6a9a", trim: "#2a3c5c", glow: BLUE },
  ion2: { frame: "coil", barrels: 1, reach: 5, mark: 1, body: "#4a6a9a", trim: "#2a3c5c", glow: CYAN },
  heavyion: { frame: "coil", barrels: 1, reach: 6, heavy: true, body: "#3a5080", trim: "#22304c", glow: BLUE },
  stunner: { frame: "coil", barrels: 2, reach: 3, body: "#6a7aa8", trim: "#2a3c5c", glow: VIOLET },
  ioncharger: { frame: "coil", barrels: 2, reach: 5, charger: true, body: "#4a6a9a", trim: "#2a3c5c", glow: BLUE },
  chainion: { frame: "coil", barrels: 1, reach: 6, chain: true, body: "#4a6a9a", trim: "#22304c", glow: CYAN },
  bossion: { frame: "coil", barrels: 3, reach: 7, mark: 3, body: "#5a2a2a", trim: "#2a3c5c", glow: BLUE },
  // Beams: lens cones, a lit emitter.
  mini: { frame: "lens", barrels: 1, reach: 2, body: STEEL, trim: SLATE, glow: AMBER },
  shear: { frame: "lens", barrels: 1, reach: 6, body: BONE, trim: SLATE, glow: AMBER },
  hullbeam: { frame: "lens", barrels: 1, reach: 5, heavy: true, body: RUST, trim: SLATE, glow: AMBER },
  halberd: { frame: "lens", barrels: 1, reach: 8, mark: 1, body: BONE, trim: GUNMETAL, glow: AMBER },
  glaive: { frame: "lens", barrels: 1, reach: 10, heavy: true, mark: 2, body: BONE, trim: GUNMETAL, glow: "#fff27a" },
  firebeam: { frame: "lens", barrels: 1, reach: 6, fins: true, body: GUNMETAL, trim: RUST, glow: ORANGE },
  antibio: { frame: "lens", barrels: 1, reach: 4, mark: 1, body: "#5a7a4a", trim: "#34472a", glow: GREEN },
  // Flak: drums with stubby barrels.
  scatter: { frame: "drum", barrels: 3, reach: 4, body: "#a04040", trim: SLATE, glow: ORANGE },
  advflak: { frame: "drum", barrels: 3, reach: 6, mark: 1, body: "#a04040", trim: SLATE, glow: AMBER },
  flak2: { frame: "drum", barrels: 5, reach: 5, mark: 2, body: "#7a2e2e", trim: SLATE, glow: ORANGE },
  // Bombs: teleporter pods, the payload as an emblem.
  smallbomb: { frame: "pod", barrels: 0, reach: 0, emblem: "dot", body: STEEL, trim: SLATE, glow: RED },
  cask: { frame: "pod", barrels: 0, reach: 0, emblem: "flame", body: RUST, trim: SLATE, glow: ORANGE },
  breach1: { frame: "pod", barrels: 0, reach: 0, emblem: "arrow", mark: 1, body: "#4a8a8a", trim: SLATE, glow: AMBER },
  breach2: { frame: "pod", barrels: 0, reach: 0, emblem: "arrow", mark: 2, body: "#2f6a6a", trim: SLATE, glow: ORANGE },
  ionbomb: { frame: "pod", barrels: 0, reach: 0, emblem: "bolt", charger: true, body: "#4a6a9a", trim: "#2a3c5c", glow: BLUE },
  stunbomb: { frame: "pod", barrels: 0, reach: 0, emblem: "ring", body: "#6a7aa8", trim: "#2a3c5c", glow: VIOLET },
  healburst: { frame: "pod", barrels: 0, reach: 0, emblem: "cross", body: BONE, trim: "#3a6a3a", glow: GREEN },
  repairburst: { frame: "pod", barrels: 0, reach: 0, emblem: "wrench", body: BONE, trim: SLATE, glow: AMBER },
  lockdown: { frame: "pod", barrels: 0, reach: 0, emblem: "lock", body: "#a8e8ff", trim: "#5aa8c8", glow: PINK },
};

type DroneHull = "disc" | "hex" | "diamond" | "box" | "dart" | "ring";
type DroneTool = "gun" | "twin" | "beam" | "fire" | "ion" | "wrench" | "claw" | "shield" | "eye";

export type DroneLook = Palette & { name: string; hull: DroneHull; tool: DroneTool; mark?: number };

export type DroneKey =
  | SwarmKind
  | "striker2"
  | "beam2"
  | "fire"
  | "intruder"
  | "personnel"
  | "overcharge"
  | "overcharge2";

export const DRONE_LOOKS: Record<DroneKey, DroneLook> = {
  ward: { name: "Defense Drone Mark I", hull: "hex", tool: "gun", body: "#4a6a9a", trim: SLATE, glow: BLUE },
  ward2: { name: "Defense Drone Mark II", hull: "hex", tool: "twin", mark: 2, body: "#4a6a9a", trim: SLATE, glow: AMBER },
  wardcut: { name: "Anti-Combat Drone", hull: "hex", tool: "ion", body: "#6a5a9a", trim: SLATE, glow: VIOLET },
  striker: { name: "Combat Drone Mark I", hull: "dart", tool: "gun", body: "#a04040", trim: SLATE, glow: ORANGE },
  striker2: { name: "Combat Drone Mark II", hull: "dart", tool: "twin", mark: 2, body: "#a04040", trim: SLATE, glow: RED },
  beam: { name: "Anti-Ship Beam Drone I", hull: "diamond", tool: "beam", body: BONE, trim: SLATE, glow: AMBER },
  beam2: { name: "Anti-Ship Beam Drone II", hull: "diamond", tool: "beam", mark: 2, body: BONE, trim: GUNMETAL, glow: ORANGE },
  fire: { name: "Anti-Ship Fire Drone", hull: "diamond", tool: "fire", body: RUST, trim: SLATE, glow: ORANGE },
  intruder: { name: "Ion Intruder Drone", hull: "box", tool: "ion", body: "#4a6a9a", trim: "#2a3c5c", glow: CYAN },
  board: { name: "Boarding Drone", hull: "box", tool: "claw", body: GUNMETAL, trim: SLATE, glow: RED },
  personnel: { name: "Anti-Personnel Drone", hull: "box", tool: "gun", body: "#5a7a4a", trim: "#34472a", glow: GREEN },
  patch: { name: "System Repair Drone", hull: "disc", tool: "wrench", body: "#c8a040", trim: SLATE, glow: AMBER },
  hull: { name: "Hull Repair Drone", hull: "ring", tool: "wrench", body: "#5a8a5a", trim: SLATE, glow: GREEN },
  overcharge: { name: "Shield Overcharger", hull: "ring", tool: "shield", body: "#4a8a8a", trim: SLATE, glow: CYAN },
  overcharge2: { name: "Shield Overcharger +", hull: "ring", tool: "shield", mark: 2, body: "#4a8a8a", trim: SLATE, glow: "#d0fff0" },
};

const UNKNOWN_DRONE: DroneLook = { name: "Drone", hull: "disc", tool: "eye", body: STEEL, trim: SLATE, glow: BONE };

export type PixelRun = { x: number; y: number; w: number; c: string };

/** Horizontal runs of one character, skipping ".". Fewer rects than one per pixel. */
export function pixelRuns(rows: string[]): PixelRun[] {
  const runs: PixelRun[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === c) end += 1;
      if (c !== ".") runs.push({ x, y, w: end - x, c });
      x = end;
    }
  });
  return runs;
}

class Grid {
  readonly w: number;
  readonly h: number;
  readonly cells: Paint[][];
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => "." as Paint));
  }
  set(x: number, y: number, c: Paint) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = c;
  }
  rect(x0: number, y0: number, x1: number, y1: number, c: Paint) {
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) this.set(x, y, c);
  }
  where(test: (x: number, y: number) => boolean, c: Paint) {
    for (let y = 0; y < this.h; y += 1) for (let x = 0; x < this.w; x += 1) if (test(x, y)) this.set(x, y, c);
  }
  stamp(x0: number, y0: number, rows: string[]) {
    rows.forEach((row, dy) => {
      [...row].forEach((c, dx) => {
        if (c !== ".") this.set(x0 + dx, y0 + dy, c as Paint);
      });
    });
  }
  /** Empty cells that touch paint become outline. */
  outline() {
    const lit = (x: number, y: number) => {
      const c = this.cells[y]?.[x];
      return c != null && c !== "." && c !== "o";
    };
    const marks: [number, number][] = [];
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        if (this.cells[y][x] !== ".") continue;
        if (lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1)) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.cells[y][x] = "o";
  }
  rows() {
    return this.cells.map((row) => row.join(""));
  }
}

const EMBLEMS: Record<Emblem, string[]> = {
  flame: ["..g..", ".gg..", ".ggg.", "ggggg", "ggggg", ".ggg."],
  cross: [".....", "..g..", "ggggg", "..g..", "..g..", "....."],
  wrench: ["g.g..", "ggg..", ".gg..", "..g..", "..gg.", "...gg"],
  lock: [".ggg.", ".g.g.", "ggggg", "gg.gg", "ggggg", "....."],
  bolt: ["...g.", "..gg.", ".ggg.", "ggg..", ".gg..", ".g..."],
  ring: [".ggg.", "g...g", "g...g", "g...g", ".ggg.", "....."],
  arrow: ["..g..", "..gg.", "ggggg", "ggggg", "..gg.", "..g.."],
  dot: [".....", ".gg..", "gggg.", "gggg.", ".gg..", "....."],
};

const WEAPON_W = 26;
const WEAPON_H = 14;

/** Barrel rows, centred on the body (rows 6 and 7). */
function barrelRows(n: number, heavy: boolean) {
  const h = heavy ? 2 : 1;
  const pitch = n <= 2 ? h + 2 : h + 1;
  const span = (n - 1) * pitch + h;
  const start = Math.floor(7 - span / 2);
  return Array.from({ length: n }, (_, i) => start + i * pitch);
}

function frameFront(grid: Grid, look: WeaponLook): number {
  switch (look.frame) {
    case "block":
      grid.rect(1, 3, 9, 10, "b");
      grid.rect(1, 4, 2, 9, "t");
      grid.rect(3, 10, 9, 10, "t");
      return 10;
    case "coil":
      grid.rect(1, 3, 9, 10, "b");
      for (const x of [2, 4, 6]) grid.rect(x, 3, x, 10, "t");
      grid.rect(8, 6, 9, 7, "g");
      return 10;
    case "tube":
      grid.rect(1, 2, 2, 11, "t");
      grid.rect(3, 4, 11, 9, "b");
      grid.rect(3, 6, 11, 7, "t");
      if (look.fins) {
        grid.rect(3, 2, 4, 3, "t");
        grid.rect(3, 10, 4, 11, "t");
      }
      return 12;
    case "lens":
      grid.rect(1, 3, 6, 10, "b");
      grid.rect(1, 10, 6, 10, "t");
      grid.rect(7, 5, 7, 8, "t");
      grid.rect(8, 4, 8, 9, "g");
      grid.rect(9, 3, 9, 10, "t");
      if (look.fins) for (const x of [2, 4]) grid.rect(x, 1, x, 2, "t");
      return 10;
    case "drum":
      grid.where((x, y) => (x - 5) ** 2 + (y - 6.5) ** 2 <= 21, "b");
      grid.where((x, y) => {
        const d = (x - 5) ** 2 + (y - 6.5) ** 2;
        return d >= 6 && d <= 10;
      }, "t");
      grid.where((x, y) => (x - 5) ** 2 + (y - 6.5) ** 2 <= 1.5, "g");
      return 10;
    case "pod":
      grid.rect(2, 3, 13, 10, "b");
      for (const [x, y] of [[2, 3], [13, 3], [2, 10], [13, 10]] as const) grid.set(x, y, ".");
      grid.rect(4, 3, 4, 10, "t");
      grid.rect(14, 5, 15, 8, "t");
      grid.stamp(7, 4, EMBLEMS[look.emblem ?? "dot"]);
      return 16;
    case "prism":
      grid.where((x, y) => Math.abs(x - 5.5) / 5.5 + Math.abs(y - 6.5) / 4.5 <= 1, "b");
      grid.where((x, y) => {
        const r = Math.abs(x - 5.5) / 5.5 + Math.abs(y - 6.5) / 4.5;
        return r > 0.45 && r <= 0.62;
      }, "t");
      grid.rect(5, 6, 6, 7, "g");
      return 11;
  }
}

export function weaponPixels(id: string): PixelArt {
  const look = WEAPON_LOOKS[id] ?? WEAPON_LOOKS[fallbackWeapon(id)];
  const grid = new Grid(WEAPON_W, WEAPON_H);
  const front = frameFront(grid, look);
  const thick = look.heavy ? 2 : 1;
  for (const y of barrelRows(look.barrels, !!look.heavy)) {
    const end = front + look.reach - 1;
    const fill: Paint = look.frame === "lens" ? "g" : look.frame === "tube" ? "b" : "t";
    grid.rect(front, y, end, y + thick - 1, fill);
    grid.rect(end, y, end, y + thick - 1, "g");
    if (look.frame === "tube" && look.reach > 2) grid.rect(end - 1, y, end, y + thick - 1, "g");
  }
  if (look.charger) for (let x = 3; x <= 8; x += 1) grid.rect(x, 1, x, 2, x % 2 ? "g" : "t");
  if (look.chain) for (let x = 2; x <= 9; x += 1) grid.set(x, 11, x % 2 ? "g" : "t");
  for (let i = 0; i < (look.mark ?? 0); i += 1) grid.set(2 + i * 2, 12, "g");
  grid.outline();
  return { w: WEAPON_W, h: WEAPON_H, rows: grid.rows(), palette: look };
}

/** Colours of a weapon's art, for the shots it fires. */
export function weaponPalette(id: string | undefined): Palette {
  if (!id) return WEAPON_LOOKS.spark;
  return WEAPON_LOOKS[id] ?? WEAPON_LOOKS[fallbackWeapon(id)];
}

function fallbackWeapon(id: string) {
  const kind = WEAPONS[id]?.kind;
  if (kind === "missile") return "artemis";
  if (kind === "ion") return "needle";
  if (kind === "beam") return "shear";
  if (kind === "flak") return "scatter";
  if (kind === "bomb") return "smallbomb";
  return "spark";
}

const DRONE_S = 18;
const C = 8.5;

export function dronePixels(key: DroneKey | null): PixelArt {
  const look = key ? DRONE_LOOKS[key] : UNKNOWN_DRONE;
  const grid = new Grid(DRONE_S, DRONE_S);
  const dx = (x: number) => x - C;
  const dy = (y: number) => y - C;
  switch (look.hull) {
    case "disc":
      grid.where((x, y) => dx(x) ** 2 + dy(y) ** 2 <= 30, "b");
      grid.where((x, y) => {
        const d = dx(x) ** 2 + dy(y) ** 2;
        return d >= 12 && d <= 18;
      }, "t");
      break;
    case "ring":
      grid.where((x, y) => {
        const d = dx(x) ** 2 + dy(y) ** 2;
        return d <= 32 && d >= 10;
      }, "b");
      grid.where((x, y) => {
        const d = dx(x) ** 2 + dy(y) ** 2;
        return d <= 32 && d >= 26;
      }, "t");
      break;
    case "hex":
      grid.where((x, y) => Math.abs(dy(y)) <= 5 && Math.abs(dx(x)) + Math.abs(dy(y)) * 0.55 <= 6, "b");
      grid.where((x, y) => Math.abs(dy(y)) <= 1 && Math.abs(dx(x)) <= 5, "t");
      break;
    case "diamond":
      grid.where((x, y) => Math.abs(dx(x)) + Math.abs(dy(y)) <= 6.5, "b");
      grid.where((x, y) => {
        const r = Math.abs(dx(x)) + Math.abs(dy(y));
        return r >= 3 && r <= 4;
      }, "t");
      break;
    case "box":
      grid.rect(3, 4, 13, 13, "b");
      for (const [x, y] of [[3, 4], [13, 4], [3, 13], [13, 13]] as const) grid.set(x, y, ".");
      grid.rect(3, 8, 13, 9, "t");
      break;
    case "dart":
      grid.where((x, y) => x >= 2 && x <= 13 && Math.abs(dy(y)) <= (14 - x) * 0.45, "b");
      grid.where((x, y) => x >= 2 && x <= 4 && Math.abs(dy(y)) <= (14 - x) * 0.45, "t");
      break;
  }
  switch (look.tool) {
    case "gun":
      grid.rect(12, 8, 16, 9, "t");
      grid.rect(16, 8, 16, 9, "g");
      break;
    case "twin":
      for (const y of [5, 12]) {
        grid.rect(12, y, 16, y, "t");
        grid.set(16, y, "g");
      }
      grid.rect(7, 8, 9, 9, "g");
      break;
    case "beam":
      grid.rect(12, 7, 13, 10, "t");
      grid.rect(14, 8, 16, 9, "g");
      break;
    case "fire":
      grid.stamp(12, 5, ["g...", "gg..", "ggg.", "gggg", "gggg", "ggg.", "gg..", "g..."]);
      break;
    case "ion":
      grid.stamp(6, 4, ["...gg", "..gg.", ".ggg.", "gggg.", "..gg.", ".gg..", ".g...", "g...."]);
      break;
    case "wrench":
      grid.stamp(11, 10, ["t....", ".t...", "..t..", "..tgg", "..g..", "..g.."]);
      break;
    case "claw":
      grid.stamp(12, 4, ["tt...", "..tt.", "...tg", ".....", ".....", ".....", "...tg", "..tt.", "tt..."]);
      break;
    case "shield":
      grid.where((x, y) => {
        const d = dx(x) ** 2 + dy(y) ** 2;
        return x >= 13 && d >= 42 && d <= 64;
      }, "g");
      break;
    case "eye":
      break;
  }
  if (look.tool !== "twin" && look.tool !== "ion") grid.rect(8, 8, 9, 9, "g");
  for (let i = 0; i < (look.mark ?? 0); i += 1) grid.set(7 + i * 3, 1, "g");
  grid.outline();
  return { w: DRONE_S, h: DRONE_S, rows: grid.rows(), palette: look };
}

/** Hangar and catalog names use several spellings. */
const WEAPON_ALIASES: Record<string, string> = {
  "heavy laser i": "heavy",
  "advanced flak": "advflak",
  "breach bomb i": "breach1",
  "breach bomb ii": "breach2",
  // Faction "Weapons" tables (Rebel Ships and the other enemy pages) spell these out in full.
  "burst laser mark ii": "lineburst",
  "heavy laser mark i": "heavy",
  "ion blast mark ii": "ion2",
  "flak gun i": "scatter",
  "flak gun ii": "flak2",
};

function normal(name: string) {
  return name
    .toLowerCase()
    .replace(/\(x\d+\)/g, "")
    .replace(/\bmk\.?\s*/g, "mark ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Weapon id for a display name, or null when nothing matches. */
export function weaponIdForName(name: string): string | null {
  const key = normal(name);
  if (WEAPON_ALIASES[key]) return WEAPON_ALIASES[key];
  const row = Object.values(WEAPONS).find((weapon) => normal(weapon.name) === key);
  return row?.id ?? null;
}

const DRONE_NAME_KEYS: [RegExp, DroneKey][] = [
  [/overcharger \+/, "overcharge2"],
  [/overcharger/, "overcharge"],
  [/anti-ship fire/, "fire"],
  [/beam drone ii|beam ii/, "beam2"],
  [/^beam\b|beam drone/, "beam"],
  [/combat drone mark ii/, "striker2"],
  [/^combat drone/, "striker"],
  [/anti-combat|anti-drone/, "wardcut"],
  [/defense drone (mark )?ii/, "ward2"],
  [/defense drone/, "ward"],
  [/ion intruder/, "intruder"],
  [/anti-personnel/, "personnel"],
  [/boarding/, "board"],
  [/system repair/, "patch"],
  [/hull repair/, "hull"],
];

/** Drone key for a Drone Control schematic id (Kit.target), or null. */
export function droneKeyOf(target: string | null | undefined): DroneKey | null {
  return target && target in DRONE_LOOKS ? (target as DroneKey) : null;
}

/** Drone key for a hangar or catalog name, or null when nothing matches. */
export function droneKeyForName(name: string): DroneKey | null {
  const key = normal(name);
  return DRONE_NAME_KEYS.find(([re]) => re.test(key))?.[1] ?? null;
}
