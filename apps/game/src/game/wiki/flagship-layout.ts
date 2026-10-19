import { flagshipBlueprintId, type FlagshipDifficulty } from "@stl/catalog/src/flagship-layouts.ts";
import { hullDef, marksFromDoors } from "@stl/pack";
import type { Layout } from "../layouts.ts";
import type { SysId } from "../types.ts";

/**
 * Rebel Flagship interiors, one traced cutaway per stage.
 * The fight asks for BOSS_<stage>_EASY_DLC, BOSS_<stage>_NORMAL_DLC, or BOSS_<stage>_HARD_DLC.
 * Those blueprints share data/flagship-<stage>.txt. A missing difficulty reads the normal blueprint.
 * Room names such as f1-pilot come from the blueprint's installs: a system's room, or an artillery pod named for its
 * boss weapon. The fight maps those names onto artillery rooms.
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
  const hull = hullDef(flagshipHullId(stage, difficulty));
  const grid = hull?.grid;
  if (!grid || grid.rooms.length === 0) throw new Error(`Flagship stage ${stage} has no interior`);
  const box = span(grid.rooms);
  return {
    cols: grid.cols ?? box.cols,
    rows: grid.rows ?? box.rows,
    rooms: grid.rooms.map((room) => {
      const held = hull?.installs?.find((item) => item.room === room.id && item.start);
      const role = held ? FLAGSHIP_ROLE[held.weapon ?? held.id] : undefined;
      return {
        id: role ? `f${stage}-${role.key}` : `f${stage}-hall-${room.x}-${room.y}`,
        title: role?.title ?? "Hall",
        system: role?.system ?? null,
        x: room.x,
        y: room.y,
        w: room.w,
        h: room.h,
      };
    }),
    marks: marksFromDoors(grid),
  };
}

/**
 * A flagship room's name, title, and main system, by what is installed there. Artillery pods go by their weapon
 * (ftl.dat's BOSS_* blueprints: ARTILLERY_BOSS_1 laser, _2 missile, _3 beam, _4 ion).
 */
const FLAGSHIP_ROLE: Record<string, { key: string; title: string; system?: SysId }> = {
  pilot: { key: "pilot", title: "Piloting", system: "pilot" },
  shields: { key: "shields", title: "Shields", system: "shields" },
  oxygen: { key: "oxygen", title: "Oxygen", system: "oxygen" },
  engines: { key: "engines", title: "Engines", system: "engines" },
  medbay: { key: "medbay", title: "Medbay", system: "medbay" },
  doors: { key: "doors", title: "Door", system: "doors" },
  cloaking: { key: "cloak", title: "Cloaking" },
  hacking: { key: "hack", title: "Hacking" },
  drones: { key: "drone", title: "Drone" },
  teleporter: { key: "teleporter", title: "Teleporter" },
  mind: { key: "mind", title: "Mind Control" },
  ARTILLERY_BOSS_1: { key: "laser", title: "Boss Laser" },
  ARTILLERY_BOSS_2: { key: "missile", title: "Boss Missile" },
  ARTILLERY_BOSS_3: { key: "beam", title: "Boss Beam" },
  ARTILLERY_BOSS_4: { key: "ion", title: "Boss Ion" },
};

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
