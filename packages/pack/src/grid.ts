import type { HullDef, HullDoor, HullEllipse, HullGrid, HullRoom } from "./types.ts";

const GRID_KEYS = new Set([
  "X_OFFSET",
  "Y_OFFSET",
  "VERTICAL",
  "HORIZONTAL",
  "ELLIPSE",
  "ROOM",
  "DOOR",
]);

export type GridMark = {
  x: number;
  y: number;
  side: "n" | "e" | "s" | "w";
};

/** A traced interior, before it is written as `data/<layout>.txt`. */
export type LayoutSource = {
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
    reserve?: string;
  }[];
  marks?: GridMark[];
};

/**
 * Door coordinate used by a layout file.
 * A vertical door's x is the eastern cell. A horizontal door's y is the southern cell.
 * An airlock on the west or north edge uses the interior cell, because the other cell is off the ship.
 */
export function doorsFromMarks(
  rooms: readonly { id: number; x: number; y: number; w: number; h: number }[],
  marks: readonly GridMark[],
): HullDoor[] {
  const doors: HullDoor[] = [];
  for (const mark of marks) {
    const dx = mark.side === "e" ? 1 : mark.side === "w" ? -1 : 0;
    const dy = mark.side === "s" ? 1 : mark.side === "n" ? -1 : 0;
    const here = roomAt(rooms, mark.x, mark.y);
    if (here == null) continue;
    const there = roomAt(rooms, mark.x + dx, mark.y + dy);
    doors.push({
      x: mark.side === "e" ? mark.x + 1 : mark.x,
      y: mark.side === "s" ? mark.y + 1 : mark.y,
      a: here,
      b: there ?? -1,
      vertical: dx !== 0 ? 1 : 0,
    });
  }
  return doors;
}

/** The hangar bar for each door. One bar per file line, in file order. */
export function marksFromDoors(grid: HullGrid): GridMark[] {
  const marks: GridMark[] = [];
  for (const door of grid.doors) {
    if (door.vertical) {
      const west = roomAt(grid.rooms, door.x - 1, door.y);
      if (west != null) marks.push({ x: door.x - 1, y: door.y, side: "e" });
      else marks.push({ x: door.x, y: door.y, side: "w" });
      continue;
    }
    const north = roomAt(grid.rooms, door.x, door.y - 1);
    if (north != null) marks.push({ x: door.x, y: door.y - 1, side: "s" });
    else marks.push({ x: door.x, y: door.y, side: "n" });
  }
  return marks;
}

/** Rooms and doors for one ship. Room ids are the array order the blueprint's room attribute uses. */
export function gridFromLayout(layout: LayoutSource): HullGrid {
  const rooms: HullRoom[] = layout.rooms.map((room, id) => {
    const row: HullRoom = {
      id,
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
    };
    return row;
  });
  // The same grid a layout file reads back as (readGrids): zero offsets, and the room span is the size.
  return {
    x: 0,
    y: 0,
    vertical: 0,
    rooms,
    doors: doorsFromMarks(rooms, layout.marks ?? []),
  };
}

/** One token per line, in the order a layout file uses. */
export function writeGrid(grid: HullGrid): string {
  const lines = ["X_OFFSET", "0", "Y_OFFSET", "0", "VERTICAL", "0"];
  for (const room of grid.rooms) {
    lines.push(
      "ROOM",
      String(room.id),
      String(room.x),
      String(room.y),
      String(room.w),
      String(room.h),
    );
  }
  for (const door of grid.doors) {
    lines.push(
      "DOOR",
      String(door.x),
      String(door.y),
      String(door.a),
      String(door.b),
      String(door.vertical),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function readGrids(
  layouts: readonly { path: string; text: string }[],
): Map<string, HullGrid> {
  const grids = new Map<string, HullGrid>();
  for (const file of layouts) {
    const grid = readGrid(file.text);
    if (grid) grids.set(layoutName(file.path), grid);
  }
  return grids;
}

export function cloneGrid(grid: HullGrid): HullGrid {
  const copy: HullGrid = {
    rooms: grid.rooms.map((room) => ({ ...room })),
    doors: grid.doors.map((door) => ({ ...door })),
  };
  if (grid.x !== undefined) copy.x = grid.x;
  if (grid.y !== undefined) copy.y = grid.y;
  if (grid.vertical !== undefined) copy.vertical = grid.vertical;
  if (grid.horizontal !== undefined) copy.horizontal = grid.horizontal;
  if (grid.ellipse) copy.ellipse = { ...grid.ellipse };
  if (grid.cols !== undefined) copy.cols = grid.cols;
  if (grid.rows !== undefined) copy.rows = grid.rows;
  return copy;
}

function roomAt(
  rooms: readonly { id: number; x: number; y: number; w: number; h: number }[],
  x: number,
  y: number,
): number | undefined {
  for (const room of rooms) {
    if (x >= room.x && y >= room.y && x < room.x + room.w && y < room.y + room.h) return room.id;
  }
  return undefined;
}

function layoutName(path: string): string {
  const slash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = slash === -1 ? path : path.slice(slash + 1);
  return base.endsWith(".txt") ? base.slice(0, -4) : base;
}

/** One token per line. ROOM is id, x, y, width, height. DOOR is x, y, room, room, vertical. */
export function readGrid(text: string): HullGrid | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const rooms: HullRoom[] = [];
  const doors: HullDoor[] = [];
  let x: number | undefined;
  let y: number | undefined;
  let vertical: number | undefined;
  let horizontal: number | undefined;
  let ellipse: HullEllipse | undefined;
  let i = 0;
  const take = (count: number): number[] | undefined => {
    const nums: number[] = [];
    for (let k = 0; k < count; k++) {
      const line = lines[i + k];
      if (line == null || GRID_KEYS.has(line)) return undefined;
      const value = Number(line);
      if (!Number.isInteger(value)) return undefined;
      nums.push(value);
    }
    i += count;
    return nums;
  };
  while (i < lines.length) {
    const key = lines[i];
    if (!key || !GRID_KEYS.has(key)) {
      i += 1;
      continue;
    }
    i += 1;
    if (key === "X_OFFSET") {
      const nums = take(1);
      if (nums) x = nums[0];
      continue;
    }
    if (key === "Y_OFFSET") {
      const nums = take(1);
      if (nums) y = nums[0];
      continue;
    }
    if (key === "VERTICAL") {
      const nums = take(1);
      if (nums) vertical = nums[0];
      continue;
    }
    if (key === "HORIZONTAL") {
      const nums = take(1);
      if (nums) horizontal = nums[0];
      continue;
    }
    if (key === "ELLIPSE") {
      const nums = take(4);
      if (nums) ellipse = { w: nums[0] ?? 0, h: nums[1] ?? 0, x: nums[2] ?? 0, y: nums[3] ?? 0 };
      continue;
    }
    if (key === "ROOM") {
      const nums = take(5);
      if (nums)
        rooms.push({
          id: nums[0] ?? 0,
          x: nums[1] ?? 0,
          y: nums[2] ?? 0,
          w: nums[3] ?? 0,
          h: nums[4] ?? 0,
        });
      continue;
    }
    if (key === "DOOR") {
      const nums = take(5);
      if (nums)
        doors.push({
          x: nums[0] ?? 0,
          y: nums[1] ?? 0,
          a: nums[2] ?? 0,
          b: nums[3] ?? 0,
          vertical: nums[4] ?? 0,
        });
      continue;
    }
    while (i < lines.length && !GRID_KEYS.has(lines[i] ?? "")) i += 1;
  }
  if (rooms.length === 0) return undefined;
  const grid: HullGrid = { rooms, doors };
  if (x !== undefined) grid.x = x;
  if (y !== undefined) grid.y = y;
  if (vertical !== undefined) grid.vertical = vertical;
  if (horizontal !== undefined) grid.horizontal = horizontal;
  if (ellipse) grid.ellipse = ellipse;
  return grid;
}
