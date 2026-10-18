import { flagshipBlueprintId, type FlagshipDifficulty } from "@stl/catalog/src/flagship-layouts.ts";
import { hullDef, marksFromDoors } from "@stl/pack";
import type { Layout } from "../layouts.ts";
import type { SysId } from "../types.ts";

/**
 * Rebel Flagship interiors, one traced cutaway per stage.
 * The fight asks for BOSS_<stage>_EASY_DLC, BOSS_<stage>_NORMAL_DLC, or BOSS_<stage>_HARD_DLC.
 * Those blueprints share data/flagship-<stage>.txt. A missing difficulty reads the normal blueprint.
 * Room names such as f1-pilot travel with the rectangles. The fight maps those names onto artillery rooms.
 * The two Hard link rooms stay here. They are a difficulty overlay, not a fourth battle.
 */

export function flagshipDifficulty(difficulty: string | undefined): FlagshipDifficulty {
  return difficulty === "easy" || difficulty === "hard" ? difficulty : "normal";
}

/** Blueprint the fight asks for. Easy, normal, and hard each have their own id. */
export function flagshipHullId(stage: 1 | 2 | 3, difficulty: string | undefined): string {
  return flagshipBlueprintId(stage, flagshipDifficulty(difficulty));
}

function span(rooms: { x: number; y: number; w: number; h: number }[]): {
  cols: number;
  rows: number;
} {
  let cols = 1;
  let rows = 1;
  for (const room of rooms) {
    cols = Math.max(cols, room.x + room.w);
    rows = Math.max(rows, room.y + room.h);
  }
  return { cols, rows };
}

/** The traced interior for one Flagship stage at the run's difficulty. Missing data fails the fight. */
export function flagshipLayout(stage: 1 | 2 | 3, difficulty: string | undefined): Layout {
  const grid = hullDef(flagshipHullId(stage, difficulty))?.grid;
  if (!grid || grid.rooms.length === 0) throw new Error(`Flagship stage ${stage} has no interior`);
  const box = span(grid.rooms);
  return {
    cols: grid.cols ?? box.cols,
    rows: grid.rows ?? box.rows,
    rooms: grid.rooms.map((room) => ({
      id: room.name ?? "",
      title: room.title ?? "",
      system: (room.system as SysId | null) ?? null,
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
    })),
    marks: marksFromDoors(grid),
  };
}

/** Two Hard link rooms counted on Flagship1stStage.png. The hard screenshot is a full ship and was not the cell count. */
export const flagshipHardLinks: Layout = {
  cols: 8,
  rows: 3,
  rooms: [
    { id: "fh-laser-link", title: "Hall", system: null, x: 4, y: 1, w: 1, h: 2 },
    { id: "fh-missile-link", title: "Hall", system: null, x: 7, y: 1, w: 1, h: 2 },
  ],
  marks: [
    { x: 4, y: 1, side: "e" },
    { x: 4, y: 2, side: "w" },
    { x: 7, y: 1, side: "w" },
    { x: 7, y: 2, side: "e" },
  ],
};
