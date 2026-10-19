/**
 * The loaded interior for an enemy class. Rectangles and doors come from data/<layout>.txt.
 * The hull id is the archive blueprint. A pirate fight reads its pirate blueprint.
 * seatTrace still names the rooms and decides which pictured icon is installed.
 */
import { enemyBlueprintId } from "@stl/catalog/src/enemy-blueprints.ts";
import { hullDef, marksFromDoors } from "@stl/pack";
import type { DoorMark } from "../types.ts";
import type { EnemySystem } from "./enemy-ships.ts";

export type EnemyTraceRoom = {
  x: number;
  y: number;
  w: number;
  h: number;
  system: EnemySystem | null;
  omit?: { x: number; y: number }[];
};

export type EnemyLayout = {
  cols: number;
  rows: number;
  rooms: EnemyTraceRoom[];
  marks: DoorMark[];
};

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

/** The traced interior for a class, the pirate blueprint when that ship has one. */
export function enemyLayout(classId: string, pirate = false): EnemyLayout | undefined {
  const hull = hullDef(enemyBlueprintId(classId, pirate));
  const grid = hull?.grid;
  if (!grid || grid.rooms.length === 0) return undefined;
  if (grid.rooms.every((room) => room.w === 0 && room.h === 0)) return undefined;
  const box = span(grid.rooms);
  // What a room holds is the blueprint's: the system installed there, as ftl.dat's systemList places it.
  const held = (index: number) =>
    hull.installs?.find((item) => item.room === index && item.start)?.id ?? null;
  return {
    cols: grid.cols ?? box.cols,
    rows: grid.rows ?? box.rows,
    rooms: grid.rooms.map((room) => ({
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
      system: held(room.id) as EnemySystem | null,
    })),
    marks: marksFromDoors(grid),
  };
}
