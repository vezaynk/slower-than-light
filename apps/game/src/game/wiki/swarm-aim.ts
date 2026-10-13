import { cellOccupied } from "../layouts.ts";

/**
 * Missile (Weapons), ===Swarm Missiles===.
 * "Targeting area radius: 31".
 * "When fired at 1x2 room: 67.85% in main room, 8.04% in each tile next to long sides."
 * "When fired at 2x2 room: 100% in main room."
 * Radius 31 is not resimulated as pixels. These percents are the printed result.
 * INFERRED: a 2×1 is that 1×2 rectangle turned, so it uses the same split.
 * INFERRED: a shape with no printed percent stays in the aimed room.
 * INFERRED: 67.85 + 4×8.04 rounds to 100.01, so the last long-side tile is short the extra hundredth.
 * INFERRED: a long-side tile with no room is a miss, not a hit on the aimed room.
 * The four long-side percents are equal. Their order is north then south, or west then east, along the room.
 */
/** Printed percents, in hundredths of a percent: 67.85 then four steps of 8.04. */
const BOUNDS = [6785, 6785 + 804, 6785 + 804 * 2, 6785 + 804 * 3];
export const SWARM_CUTS = BOUNDS.map((n) => n / 10000);

export type SwarmRoom = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type SwarmLand = { kind: "stay" } | { kind: "room"; roomId: string } | { kind: "miss" };

type Tile = { x: number; y: number };

function floorTiles(room: SwarmRoom): Tile[] {
  const out: Tile[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (cellOccupied(room, x, y)) out.push({ x, y });
    }
  }
  return out;
}

/** Two floor tiles that share an edge. A 2×2 and every other shape return null. */
function twoTile(room: SwarmRoom): [Tile, Tile] | null {
  if (room.w * room.h !== 2) return null;
  const tiles = floorTiles(room);
  if (tiles.length !== 2) return null;
  const [a, b] = tiles;
  const straight = (a.x === b.x && Math.abs(a.y - b.y) === 1) || (a.y === b.y && Math.abs(a.x - b.x) === 1);
  return straight ? [a, b] : null;
}

/** True only when the shot must roll the printed 1×2 split. A 2×2 does not roll. */
export function swarmAimRolls(room: SwarmRoom): boolean {
  return twoTile(room) != null;
}

/** -1 is the main room. 0..3 are the long-side tiles. The last tile runs to 1. */
function sideIndex(roll: number): number {
  if (roll < SWARM_CUTS[0]) return -1;
  if (roll < SWARM_CUTS[1]) return 0;
  if (roll < SWARM_CUTS[2]) return 1;
  if (roll < SWARM_CUTS[3]) return 2;
  return 3;
}

function longSideTiles(pair: [Tile, Tile]): [Tile, Tile, Tile, Tile] {
  const [a, b] = pair;
  if (a.y === b.y) {
    const [left, right] = a.x < b.x ? [a, b] : [b, a];
    return [
      { x: left.x, y: left.y - 1 },
      { x: right.x, y: right.y - 1 },
      { x: left.x, y: left.y + 1 },
      { x: right.x, y: right.y + 1 },
    ];
  }
  const [top, bot] = a.y < b.y ? [a, b] : [b, a];
  return [
    { x: top.x - 1, y: top.y },
    { x: bot.x - 1, y: bot.y },
    { x: top.x + 1, y: top.y },
    { x: bot.x + 1, y: bot.y },
  ];
}

/**
 * Where one Swarm missile lands. `roll` is used only for a two-tile room.
 * A 2×2 and every unprinted shape ignore `roll` and stay.
 */
export function swarmLanding(rooms: readonly SwarmRoom[], aimId: string, roll: number): SwarmLand {
  const aim = rooms.find((room) => room.id === aimId);
  if (!aim) return { kind: "stay" };
  const pair = twoTile(aim);
  if (!pair) return { kind: "stay" };
  const index = sideIndex(roll);
  if (index < 0) return { kind: "stay" };
  const tile = longSideTiles(pair)[index];
  const hit = rooms.find((room) => cellOccupied(room, tile.x, tile.y));
  if (!hit || hit.id === aimId) return hit ? { kind: "stay" } : { kind: "miss" };
  return { kind: "room", roomId: hit.id };
}
