import { gridFromLayout, writeGrid } from "@stl/pack";

/**
 * Rebel Flagship cutaways. One traced interior per stage. Square counts are the traced cells.
 * Stage 1 and stage 3 start at pixel (54, 122). Stage 2 is the same grid shifted to pixel (37, 122).
 * Advanced Edition is on, so cloaking, hacking, and mind control are rooms.
 * Each stage is three blueprints: BOSS_<stage>_EASY_DLC, BOSS_<stage>_NORMAL_DLC, and BOSS_<stage>_HARD_DLC.
 * They share data/flagship-<stage>.txt. The blueprint name is the lookup key.
 * The two Hard link rooms stay with the fight. They are not a fourth ship.
 * Room ids such as f1-pilot travel with the rectangles. The fight reads them back.
 */

export type FlagshipDifficulty = "easy" | "normal" | "hard";

const FLAGSHIP_BAND: Record<FlagshipDifficulty, "EASY" | "NORMAL" | "HARD"> = {
  easy: "EASY",
  normal: "NORMAL",
  hard: "HARD",
};

/** Advanced Edition blueprint for one stage at the run's difficulty. */
export function flagshipBlueprintId(stage: 1 | 2 | 3, difficulty: FlagshipDifficulty): string {
  return `BOSS_${stage}_${FLAGSHIP_BAND[difficulty]}_DLC`;
}

/** Traced layout file for one stage. The three difficulty blueprints share it. */
export function flagshipLayoutStem(stage: 1 | 2 | 3): string {
  return `flagship-${stage}`;
}
export type FlagshipInterior = {
  cols: number;
  rows: number;
  rooms: {
    id: string;
    title: string;
    system: string | null;
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
  marks: { x: number; y: number; side: "n" | "e" | "s" | "w" }[];
};

export const FLAGSHIP_LAYOUTS: Record<string, FlagshipInterior> = {
  "flagship-1": {
    cols: 12,
    rows: 10,
    rooms: [
      { id: "f1-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
      { id: "f1-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
      { id: "f1-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
      { id: "f1-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
      { id: "f1-ion", title: "Boss Ion", system: null, x: 0, y: 2, w: 2, h: 1 },
      { id: "f1-beam", title: "Boss Beam", system: null, x: 10, y: 2, w: 2, h: 1 },
      { id: "f1-doors", title: "Door", system: "doors", x: 4, y: 3, w: 1, h: 2 },
      { id: "f1-hall-a", title: "Hall", system: null, x: 5, y: 3, w: 2, h: 1 },
      { id: "f1-hall-b", title: "Hall", system: null, x: 7, y: 3, w: 1, h: 2 },
      { id: "f1-cloak", title: "Cloaking", system: null, x: 0, y: 4, w: 2, h: 2 },
      { id: "f1-hall-c", title: "Hall", system: null, x: 2, y: 4, w: 2, h: 1 },
      { id: "f1-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
      { id: "f1-hall-d", title: "Hall", system: null, x: 8, y: 4, w: 2, h: 1 },
      { id: "f1-hall-e", title: "Hall", system: null, x: 10, y: 4, w: 2, h: 2 },
      { id: "f1-hack", title: "Hacking", system: null, x: 2, y: 5, w: 1, h: 2 },
      { id: "f1-hall-f", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
      { id: "f1-hall-g", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
      { id: "f1-hall-h", title: "Hall", system: null, x: 9, y: 5, w: 1, h: 2 },
      { id: "f1-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
      { id: "f1-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
    ],
    marks: [
      { x: 1, y: 4, side: "e" },
      { x: 1, y: 5, side: "e" },
      { x: 3, y: 4, side: "e" },
      { x: 4, y: 3, side: "e" },
      { x: 4, y: 4, side: "s" },
      { x: 5, y: 0, side: "s" },
      { x: 5, y: 6, side: "s" },
      { x: 5, y: 7, side: "s" },
      { x: 6, y: 2, side: "s" },
      { x: 6, y: 3, side: "e" },
      { x: 6, y: 6, side: "s" },
      { x: 7, y: 4, side: "e" },
      { x: 7, y: 4, side: "s" },
      { x: 9, y: 4, side: "e" },
      { x: 9, y: 5, side: "e" },
    ],
  },
  "flagship-2": {
    cols: 12,
    rows: 10,
    rooms: [
      { id: "f2-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
      { id: "f2-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
      { id: "f2-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
      { id: "f2-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
      { id: "f2-beam", title: "Boss Beam", system: null, x: 10, y: 2, w: 2, h: 1 },
      { id: "f2-hall-a", title: "Hall", system: null, x: 4, y: 3, w: 1, h: 2 },
      { id: "f2-hall-b", title: "Hall", system: null, x: 5, y: 3, w: 2, h: 1 },
      { id: "f2-hall-c", title: "Hall", system: null, x: 7, y: 3, w: 1, h: 2 },
      { id: "f2-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
      { id: "f2-hall-d", title: "Hall", system: null, x: 8, y: 4, w: 2, h: 1 },
      { id: "f2-drone", title: "Drone", system: null, x: 10, y: 4, w: 2, h: 2 },
      { id: "f2-hall-e", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
      { id: "f2-hall-f", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
      { id: "f2-hall-g", title: "Hall", system: null, x: 9, y: 5, w: 1, h: 2 },
      { id: "f2-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
      { id: "f2-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
    ],
    marks: [
      { x: 4, y: 3, side: "e" },
      { x: 4, y: 4, side: "w" },
      { x: 4, y: 4, side: "s" },
      { x: 5, y: 0, side: "s" },
      { x: 5, y: 6, side: "s" },
      { x: 5, y: 7, side: "s" },
      { x: 6, y: 2, side: "s" },
      { x: 6, y: 3, side: "e" },
      { x: 6, y: 6, side: "s" },
      { x: 7, y: 4, side: "e" },
      { x: 7, y: 4, side: "s" },
      { x: 9, y: 4, side: "e" },
      { x: 9, y: 5, side: "e" },
    ],
  },
  "flagship-3": {
    cols: 9,
    rows: 10,
    rooms: [
      { id: "f3-pilot", title: "Piloting", system: "pilot", x: 5, y: 0, w: 2, h: 1 },
      { id: "f3-laser", title: "Boss Laser", system: null, x: 3, y: 1, w: 1, h: 2 },
      { id: "f3-shields", title: "Shields", system: "shields", x: 5, y: 1, w: 2, h: 2 },
      { id: "f3-missile", title: "Boss Missile", system: null, x: 8, y: 1, w: 1, h: 2 },
      { id: "f3-hall-a", title: "Hall", system: null, x: 4, y: 3, w: 1, h: 2 },
      { id: "f3-teleporter", title: "Teleporter", system: null, x: 5, y: 3, w: 2, h: 1 },
      { id: "f3-mind", title: "Mind Control", system: null, x: 7, y: 3, w: 1, h: 2 },
      { id: "f3-medbay", title: "Medbay", system: "medbay", x: 5, y: 4, w: 2, h: 1 },
      { id: "f3-hall-b", title: "Hall", system: null, x: 4, y: 5, w: 2, h: 2 },
      { id: "f3-hall-c", title: "Hall", system: null, x: 6, y: 5, w: 2, h: 2 },
      { id: "f3-oxygen", title: "Oxygen", system: "oxygen", x: 5, y: 7, w: 2, h: 1 },
      { id: "f3-engines", title: "Engines", system: "engines", x: 5, y: 8, w: 2, h: 2 },
    ],
    marks: [
      { x: 4, y: 3, side: "e" },
      { x: 4, y: 4, side: "w" },
      { x: 4, y: 4, side: "s" },
      { x: 5, y: 0, side: "s" },
      { x: 5, y: 6, side: "s" },
      { x: 5, y: 7, side: "s" },
      { x: 6, y: 2, side: "s" },
      { x: 6, y: 3, side: "e" },
      { x: 6, y: 6, side: "s" },
      { x: 7, y: 4, side: "e" },
      { x: 7, y: 4, side: "s" },
    ],
  },
};

/** One data/<layout>.txt for each Flagship stage, in stage order. */
export function flagshipLayoutFiles(): { path: string; text: string }[] {
  return Object.entries(FLAGSHIP_LAYOUTS).map(([id, layout]) => ({
    path: `data/${id}.txt`,
    text: writeGrid(
      gridFromLayout({
        cols: layout.cols,
        rows: layout.rows,
        rooms: layout.rooms.map((room) => ({
          id: room.id,
          title: room.title,
          system: room.system,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
        })),
        marks: layout.marks,
      }),
    ),
  }));
}
