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
 */
import type { Beacon, Difficulty } from "../types.ts";

export const GRID_COLS = 6;
export const GRID_ROWS = 4;
export const CELL_PX = 110;
/**
 * INTENTIONALLY OVERRIDING SPEC: xftl prints a 10px margin inside each 110px cell; 28px keeps neighbouring beacons at
 * least 56px apart so the map reads and taps cleanly. Same/adjacent row neighbours stay within the 165px link cutoff.
 */
export const CELL_MARGIN_PX = 28;
const EMPTY_CHANCE = 0.2;
const Y_MAX = 415;
const TOP_RIGHT_Y_MIN = 30;
export const LINK_PX = 165;

/**
 * Rebel fleet advance: "The danger zone can be modelled as a circle of radius of 767. The Y position of the centre of
 * the circle is picked at random in the range of 50-300, and it's X starts at -959. The X position proceeds 64px for a
 * jump from a normal beacon, 51px for a jump from a nebula in a nebula sector, and 32px for a nebula beacon in a normal
 * sector."
 * g.fleet counts 64px steps, so the 1, 0.8, and 0.5 of citedFleetAdvance are 64, 51.2, and 32 px.
 */
export const DANGER_RADIUS = 767;
export const DANGER_START_X = -959;
export const DANGER_STEP_PX = 64;
const DANGER_Y_MIN = 50;
const DANGER_Y_MAX = 300;

/** End beacon: "the X is randomised between the two right-most columns", "at least five jumps". 16 tries. */
const EXIT_COLS = [4, 5];
const EXIT_MIN_JUMPS = 5;
const TRIES = 16;

export type Cell = { col: number; row: number; x: number; y: number };

/** PopulateGrid over the whole grid, x outer and y inner. */
export function populateGrid(roll: () => number): Cell[] {
  const out: Cell[] = [];
  let empty = 0;
  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (roll() < EMPTY_CHANCE) {
        const tooMany = empty >= 1 && empty * 4 >= out.length;
        if (!tooMany) {
          empty += 1;
          continue;
        }
      }
      const span = CELL_PX - 2 * CELL_MARGIN_PX;
      const x = col * CELL_PX + CELL_MARGIN_PX + roll() * span;
      let y = row * CELL_PX + CELL_MARGIN_PX + roll() * span;
      y = Math.min(y, Y_MAX);
      if (row === 0 && col >= GRID_COLS - 2) y = Math.max(y, TOP_RIGHT_Y_MIN);
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
  return [b.x ?? b.col * CELL_PX + CELL_PX / 2, b.y ?? b.row * CELL_PX + CELL_PX / 2];
}

function join(a: Placed, b: Placed) {
  if (!a.links.includes(b.id)) a.links.push(b.id);
  if (!b.links.includes(a.id)) b.links.push(a.id);
}

/**
 * ConnectLocations: beacons in adjacent cells (INFERRED: diagonals included) within 165px.
 * INFERRED: a map the cutoff splits is joined at its closest pair across the split, until one piece remains. The notes
 * do not say what the game does there; every map must be crossable.
 */
export function connectGrid(beacons: Placed[]): void {
  for (let i = 0; i < beacons.length; i++) {
    for (let j = i + 1; j < beacons.length; j++) {
      const a = beacons[i];
      const b = beacons[j];
      if (Math.abs(a.col - b.col) > 1 || Math.abs(a.row - b.row) > 1) continue;
      const [ax, ay] = beaconXY(a);
      const [bx, by] = beaconXY(b);
      if (Math.hypot(ax - bx, ay - by) <= LINK_PX) join(a, b);
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
 * Tries until `ok` holds, at most 16 times ("The game will try upto 16 times to satisfy these length constraints, but
 * will give up after that"); giving up keeps the last beacon found.
 */
function pickBeacon<T extends Placed>(
  beacons: T[],
  cols: number[],
  roll: () => number,
  ok: (b: T) => boolean,
): T | undefined {
  let last: T | undefined;
  for (let i = 0; i < TRIES; i++) {
    const col = cols[Math.floor(roll() * cols.length)];
    const row = Math.floor(roll() * GRID_ROWS);
    const b = beacons.find((x) => x.col === col && x.row === row);
    if (!b) continue;
    last = b;
    if (ok(b)) return b;
  }
  return last ?? beacons.filter((b) => cols.includes(b.col)).pop();
}

/** The end beacon: columns 4-5, at least five jumps from the start. */
export function pickExit<T extends Placed>(
  beacons: T[],
  start: T,
  roll: () => number,
): T | undefined {
  return pickBeacon(
    beacons,
    EXIT_COLS,
    roll,
    (b) => jumpsBetween(beacons, start.id, b.id) >= EXIT_MIN_JUMPS,
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
  const ok = (b: T) => {
    const n = jumpsBetween(beacons, start.id, b.id);
    return hard ? n >= 5 && n <= 6 : n === 4;
  };
  return pickBeacon(beacons, hard ? [3, 4] : [2, 3], roll, ok);
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
  const cols = beacons.filter((b) => EXIT_COLS.includes(b.col) && b.id !== base.id);
  const jumps = (b: T) => jumpsBetween(beacons, base.id, b.id);
  const ok = cols.filter((b) => jumps(b) >= 3 && jumps(b) <= 5);
  if (ok.length) return ok[Math.floor(roll() * ok.length) % ok.length];
  return cols.sort((a, z) => jumps(z) - jumps(a))[0];
}

/** A fresh danger-zone centre height for a new sector. */
export function rollDangerY(roll: () => number): number {
  return DANGER_Y_MIN + roll() * (DANGER_Y_MAX - DANGER_Y_MIN);
}

export type Danger = { fleet: number; dangerY?: number };

/** The danger circle's centre. INFERRED: a save from before the circle uses the middle of 50-300. */
export function dangerCentre(d: Danger): [number, number] {
  return [
    DANGER_START_X + DANGER_STEP_PX * d.fleet,
    d.dangerY ?? (DANGER_Y_MIN + DANGER_Y_MAX) / 2,
  ];
}

/** True when the beacon sits inside the danger circle. */
export function overtaken(
  d: Danger,
  b: Pick<Beacon, "col" | "row"> & { x?: number; y?: number },
): boolean {
  const [cx, cy] = dangerCentre(d);
  const [x, y] = beaconXY(b);
  return Math.hypot(x - cx, y - cy) < DANGER_RADIUS;
}

/** Fewest whole 64px steps that put this beacon inside the danger circle (for setups and tests). */
export function fleetToReach(
  d: Danger,
  b: Pick<Beacon, "col" | "row"> & { x?: number; y?: number },
): number {
  for (let n = 0; n < 64; n++) if (overtaken({ fleet: n, dangerY: d.dangerY }, b)) return n;
  return 64;
}
