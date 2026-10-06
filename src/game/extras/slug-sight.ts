import type { Crew, Game, Room } from "../types.ts";
import { hackVision, playerSensorLevel } from "./spike.ts";

/**
 * Slugs, lead: rooms that share at least one tile edge, horizontally or vertically.
 * A corner does not count. A door is not required.
 */
export function shareEdge(a: Pick<Room, "x" | "y" | "w" | "h">, b: Pick<Room, "x" | "y" | "w" | "h">): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const xTouch = ax2 === b.x || bx2 === a.x;
  const yOverlap = a.y < by2 && ay2 > b.y;
  const yTouch = ay2 === b.y || by2 === a.y;
  const xOverlap = a.x < bx2 && ax2 > b.x;
  return (xTouch && yOverlap) || (yTouch && xOverlap);
}

function playerSlugs(g: Game, aboard: "player" | "enemy"): Crew[] {
  return g.crew.filter((c) => c.side === "player" && c.kin === "gel" && c.hp > 0 && c.aboard === aboard);
}

/** Rooms a living player Slug occupies or touches on that hull. */
function slugRooms(g: Game, aboard: "player" | "enemy"): Set<string> {
  const ship = aboard === "player" ? g.player : g.enemy;
  const seen = new Set<string>();
  if (!ship) return seen;
  for (const slug of playerSlugs(g, aboard)) {
    const here = ship.rooms.find((r) => r.id === slug.room);
    if (!here) continue;
    seen.add(here.id);
    for (const room of ship.rooms) {
      if (room.id !== here.id && shareEdge(here, room)) seen.add(room.id);
    }
  }
  return seen;
}

function enemyCloaked(g: Game): boolean {
  const veil = g.enemy?.kits.veil;
  return !!veil?.on && (veil.left ?? 0) > 0;
}

export type ShipSight = {
  /** Sensors level 1 is your ship. Level 2 is the enemy ship too. A Slug fills the gaps beside them. */
  interior(aboard: "player" | "enemy", roomId: string): boolean;
  /** Crew token drawn in a room. Life signs add hostile crew. A crew drone is not a crew member. */
  showCrew(c: Crew): boolean;
};

/**
 * Slugs, lead and "Race characteristics": a Slug sees the interior of rooms that touch
 * the room they stand in, and reveals live enemy crew on both ships. Crew drones do not.
 * Sensors, "Overview": level 1 is your interior, level 2 adds the enemy interior, and
 * level 2 still shows enemy crew through a cloak. A nebula does not disable Sensors here.
 * Cloaking: vision of a cloaked enemy returns while your crew is aboard.
 */
export function shipSight(g: Game): ShipSight {
  const sensors = playerSensorLevel(g);
  const own = slugRooms(g, "player");
  const foe = slugRooms(g, "enemy");
  const hack = hackVision(g)?.room ?? null;
  const cloaked = enemyCloaked(g);
  const ownAboard = g.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
  const life = g.crew.some((c) => c.side === "player" && c.kin === "gel" && c.hp > 0);

  const interior = (aboard: "player" | "enemy", roomId: string): boolean => {
    if (aboard === "player") return sensors >= 1 || own.has(roomId);
    if (foe.has(roomId) || hack === roomId) return true;
    if (cloaked) return ownAboard;
    return sensors >= 2;
  };

  const showCrew = (c: Crew): boolean => {
    if (c.hp <= 0) return false;
    if (interior(c.aboard, c.room)) return true;
    if (life && c.side === "enemy") return true;
    if (c.aboard === "enemy" && c.side === "enemy" && sensors >= 2) return true;
    return false;
  };

  return { interior, showCrew };
}

/** True when a crew drone standing in this room is part of the visible interior. */
export function roomInterior(g: Game, aboard: "player" | "enemy", roomId: string): boolean {
  return shipSight(g).interior(aboard, roomId);
}
