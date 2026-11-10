/**
 * The beacon map and the Rebel fleet's danger zone, from the xftl reverse-engineering notes
 * (gitlab.com/znixian/xftl, doc/sector-map). Pure: no sim import.
 *
 * StarMap::GenerateMap / PopulateGrid: "a 6x4 grid", "the outer loop is for x, and the inner loop is for y".
 * "There's a 20% chance for a cell on the map to not have a beacon. If this 20% chance is rolled, then there's an
 * additional check to ensure there aren't too many empty cells: if at least one empty cell has been placed, and at
 * least 20% of the cells populated thus far are empty (that is, there are four times as many filled in beacons as empty
 * ones), then this cell will be generated normally."
 * "Each cell represents a 110x110px area, and the beacon is placed randomly inside that with 10px of margin around the
 * outside." "The y coordinate is then limited to at most 415, and if it's in the two top-right cells, the y is limited
 * to at least 30". "It then connects this beacon with all the beacons in adjacent cells that are within 165px".
 *
 * The numbers are gap `<sectorMap>` (`@stl/pack` `sectorMap`). A missing value warns and uses FTL's. The stand-in
 * ships a 28px margin where xftl prints 10, so neighbouring beacons stay tappable. Connecting a split map, and treating
 * diagonal neighbours as adjacent, are mechanics with no tunable number.
 */
import type { Beacon, Difficulty } from "../types.ts";
import { sectorMap, warnPack } from "@stl/pack";

export type Cell = { col: number; row: number; x: number; y: number };

/** Inclusive column range. A swapped pair is still that range. Not a list: a wide max must not be allocated. */
function columnRange(min: number, max: number): { lo: number; hi: number } {
  return { lo: Math.min(min, max), hi: Math.max(min, max) };
}

function rollColumn(range: { lo: number; hi: number }, roll: () => number): number {
  return range.lo + Math.floor(roll() * (range.hi - range.lo + 1));
}

function inColumns(col: number, range: { lo: number; hi: number }): boolean {
  return col >= range.lo && col <= range.hi;
}

/**
 * The start beacon sits nearest this row: the middle of the loaded grid. Four rows is still 1.5.
 */
export function startRow(): number {
  return (sectorMap("rows") - 1) / 2;
}

/** A margin wider than half a cell is not an inset. The point stays inside the cell. */
function insetOf(cell: number, margin: number): number {
  if (margin <= cell / 2) return margin;
  warnPack(
    `sectorMap margin="${margin}" is wider than half of cell="${cell}"; beacons stay inside the cell.`,
  );
  return cell / 2;
}

/** PopulateGrid over the whole grid, x outer and y inner. */
export function populateGrid(roll: () => number): Cell[] {
  const cols = sectorMap("cols");
  const rows = sectorMap("rows");
  const cell = sectorMap("cell");
  const margin = sectorMap("margin");
  const emptyChance = sectorMap("empty");
  const yMax = sectorMap("yMax");
  const topRightY = sectorMap("topRightY");
  // "four times as many filled in beacons as empty ones" is (1 - 0.2) / 0.2 at FTL's empty chance.
  const filledPerEmpty =
    emptyChance > 0 && emptyChance < 1
      ? (1 - emptyChance) / emptyChance
      : emptyChance >= 1
        ? 0
        : Number.POSITIVE_INFINITY;
  const inset = insetOf(cell, margin);
  const span = cell - 2 * inset;
  const out: Cell[] = [];
  let empty = 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const lastCell = col === cols - 1 && row === rows - 1;
      if (roll() < emptyChance) {
        const tooMany = empty >= 1 && empty * filledPerEmpty >= out.length;
        // A 1×1 that rolls empty has no later cell. The map always keeps one beacon.
        if (!tooMany && !(lastCell && out.length === 0)) {
          empty += 1;
          continue;
        }
      }
      const x = col * cell + inset + roll() * span;
      let y = row * cell + inset + roll() * span;
      y = Math.min(y, yMax);
      if (row === 0 && col >= cols - 2) y = Math.max(y, topRightY);
      out.push({ col, row, x, y });
    }
  }
  return out;
}

type Placed = Pick<Beacon, "id" | "col" | "row" | "links"> & { x?: number; y?: number };

/** A beacon's map position. INFERRED: a save from before positions uses its cell's centre. */
export function beaconXY(
  b: Pick<Beacon, "col" | "row"> & { x?: number; y?: number },
): [number, number] {
  const cell = sectorMap("cell");
  return [b.x ?? b.col * cell + cell / 2, b.y ?? b.row * cell + cell / 2];
}

function join(a: Placed, b: Placed) {
  if (!a.links.includes(b.id)) a.links.push(b.id);
  if (!b.links.includes(a.id)) b.links.push(a.id);
}

/**
 * ConnectLocations: beacons in adjacent cells (INFERRED: diagonals included) within the link distance.
 * INFERRED: a map the cutoff splits is joined at its closest pair across the split, until one piece remains. The notes
 * do not say what the game does there; every map must be crossable. The join itself is a mechanic, not a number.
 */
export function connectGrid(beacons: Placed[]): void {
  const link = sectorMap("link");
  for (let i = 0; i < beacons.length; i++) {
    for (let j = i + 1; j < beacons.length; j++) {
      const a = beacons[i];
      const b = beacons[j];
      if (Math.abs(a.col - b.col) > 1 || Math.abs(a.row - b.row) > 1) continue;
      const [ax, ay] = beaconXY(a);
      const [bx, by] = beaconXY(b);
      if (Math.hypot(ax - bx, ay - by) <= link) join(a, b);
    }
  }
  for (;;) {
    const reach = reachable(beacons, beacons[0]?.id);
    if (reach.size >= beacons.length) return;
    let best: [Placed, Placed] | null = null;
    let bestD = Infinity;
    for (const a of beacons) {
      if (!reach.has(a.id)) continue;
      for (const b of beacons) {
        if (reach.has(b.id)) continue;
        const [ax, ay] = beaconXY(a);
        const [bx, by] = beaconXY(b);
        const d = Math.hypot(ax - bx, ay - by);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    }
    if (!best) return;
    join(best[0], best[1]);
  }
}

function reachable(beacons: Placed[], from: string | undefined): Map<string, number> {
  const dist = new Map<string, number>();
  if (from == null) return dist;
  dist.set(from, 0);
  const todo = [from];
  while (todo.length) {
    const at = todo.shift()!;
    const b = beacons.find((x) => x.id === at);
    for (const id of b?.links ?? []) {
      if (dist.has(id)) continue;
      dist.set(id, dist.get(at)! + 1);
      todo.push(id);
    }
  }
  return dist;
}

/** Fewest jumps between two beacons, or Infinity. */
export function jumpsBetween(beacons: Placed[], from: string, to: string): number {
  return reachable(beacons, from).get(to) ?? Infinity;
}

/**
 * A random cell in `cols` with a random row, as the notes pick "a random Y". INFERRED: an empty cell is a failed try.
 * Tries until `ok` holds, at most the gap's try count ("The game will try upto 16 times to satisfy these length
 * constraints, but will give up after that"); giving up keeps the last beacon found.
 */
function pickBeacon<T extends Placed>(
  beacons: T[],
  range: { lo: number; hi: number },
  roll: () => number,
  ok: (b: T) => boolean,
): T | undefined {
  const rows = sectorMap("rows");
  let last: T | undefined;
  for (let i = 0; i < sectorMap("tries"); i++) {
    const col = rollColumn(range, roll);
    const row = Math.floor(roll() * rows);
    const b = beacons.find((x) => x.col === col && x.row === row);
    if (!b) continue;
    last = b;
    if (ok(b)) return b;
  }
  return last ?? beacons.filter((b) => inColumns(b.col, range)).pop();
}

/** The end beacon: the exit columns, at least the minimum jumps from the start. */
export function pickExit<T extends Placed>(
  beacons: T[],
  start: T,
  roll: () => number,
): T | undefined {
  return pickBeacon(
    beacons,
    columnRange(sectorMap("exitColMin"), sectorMap("exitColMax")),
    roll,
    (b) => jumpsBetween(beacons, start.id, b.id) >= sectorMap("exitMinJumps"),
  );
}

/**
 * The Last Stand: "On easy/normal, the base's x is picked from {2,3} while on hard it's picked from {3,4}. On
 * easy/normal, the path to the base must be 4 jumps long, while on hard it must be between 5-6 jumps (inclusive)."
 */
export function pickFedBase<T extends Placed>(
  beacons: T[],
  start: T,
  difficulty: Difficulty,
  roll: () => number,
): T | undefined {
  const hard = difficulty === "hard";
  const minJumps = hard ? sectorMap("fedHardJumpsMin") : sectorMap("fedJumps");
  const maxJumps = hard ? sectorMap("fedHardJumpsMax") : sectorMap("fedJumps");
  const ok = (b: T) => {
    const n = jumpsBetween(beacons, start.id, b.id);
    return n >= minJumps && n <= maxJumps;
  };
  return pickBeacon(
    beacons,
    hard
      ? columnRange(sectorMap("fedHardColMin"), sectorMap("fedHardColMax"))
      : columnRange(sectorMap("fedColMin"), sectorMap("fedColMax")),
    roll,
    ok,
  );
}

/**
 * "The flagship starts in a random column on the two right-most columns ... The path from the flagship to the base must
 * be 4-6 jumps (which includes both the start and end beacons). That is, the shortest path would have two beacons
 * between the base and the flagship." Counting both ends, 4-6 beacons is 3-5 jumps.
 * INFERRED: the notes say "must" and name no give-up here, so the pick is uniform among the beacons in those columns
 * that qualify. With none, the farthest of them from the base (never the base itself).
 */
export function pickFlagship<T extends Placed>(
  beacons: T[],
  base: T,
  roll: () => number,
): T | undefined {
  const range = columnRange(sectorMap("exitColMin"), sectorMap("exitColMax"));
  const minJumps = sectorMap("flagshipJumpsMin");
  const maxJumps = sectorMap("flagshipJumpsMax");
  const pool = beacons.filter((b) => inColumns(b.col, range) && b.id !== base.id);
  const jumps = (b: T) => jumpsBetween(beacons, base.id, b.id);
  const ok = pool.filter((b) => jumps(b) >= minJumps && jumps(b) <= maxJumps);
  if (ok.length) return ok[Math.floor(roll() * ok.length) % ok.length];
  return pool.sort((a, z) => jumps(z) - jumps(a))[0];
}

/** A fresh danger-zone centre height for a new sector. */
export function rollDangerY(roll: () => number): number {
  const min = sectorMap("dangerYMin");
  const max = sectorMap("dangerYMax");
  return min + roll() * (max - min);
}

export type Danger = { fleet: number; dangerY?: number };

/** The danger circle's centre. INFERRED: a save from before the circle uses the middle of the y range. */
export function dangerCentre(d: Danger): [number, number] {
  const min = sectorMap("dangerYMin");
  const max = sectorMap("dangerYMax");
  return [sectorMap("startX") + sectorMap("step") * d.fleet, d.dangerY ?? (min + max) / 2];
}

/** True when the beacon sits inside the danger circle. */
export function overtaken(
  d: Danger,
  b: Pick<Beacon, "col" | "row"> & { x?: number; y?: number },
): boolean {
  const [cx, cy] = dangerCentre(d);
  const [x, y] = beaconXY(b);
  return Math.hypot(x - cx, y - cy) < sectorMap("dangerRadius");
}

/**
 * Fewest whole steps that put this beacon inside the danger circle.
 * The circle only travels one way. A beacon it never covers is not an arrival:
 * callers get Infinity, not the old 64-step give-up that pretended it had arrived.
 */
export function fleetToReach(
  d: Danger,
  b: Pick<Beacon, "col" | "row"> & { x?: number; y?: number },
): number {
  const step = sectorMap("step");
  const radius = sectorMap("dangerRadius");
  if (!(step > 0) || !(radius > 0)) return Number.POSITIVE_INFINITY;
  const [x, y] = beaconXY(b);
  const minY = sectorMap("dangerYMin");
  const maxY = sectorMap("dangerYMax");
  const cy = d.dangerY ?? (minY + maxY) / 2;
  const reach = radius * radius - (y - cy) * (y - cy);
  if (reach <= 0) return Number.POSITIVE_INFINITY;
  const half = Math.sqrt(reach);
  const startX = sectorMap("startX");
  const lowN = (x - half - startX) / step;
  const highN = (x + half - startX) / step;
  const lo = Math.min(lowN, highN);
  const hi = Math.max(lowN, highN);
  const first = Math.max(0, Math.floor(lo));
  const last = Math.ceil(hi);
  for (let n = first; n <= last; n++) {
    if (overtaken({ fleet: n, dangerY: d.dangerY }, b)) return n;
  }
  return Number.POSITIVE_INFINITY;
}
