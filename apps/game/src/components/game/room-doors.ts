import type { Door, DoorMark, Ship } from "@/game/types";

export type Side = DoorMark["side"];

/** One door on the room's walls, seen from inside the room. */
export type RadialDoor = {
  key: string;
  /** The wall it sits on, from this room's side. */
  side: Side;
  /** Edge midpoint relative to the room centre, in tiles. */
  dx: number;
  dy: number;
  room: string;
  other: string;
  door: Door | undefined;
};

const OPPOSITE: Record<Side, Side> = { n: "s", s: "n", e: "w", w: "e" };

function step(side: Side): { x: number; y: number } {
  return side === "e"
    ? { x: 1, y: 0 }
    : side === "w"
      ? { x: -1, y: 0 }
      : side === "s"
        ? { x: 0, y: 1 }
        : { x: 0, y: -1 };
}

/** Every traced door on this room's walls. A mark is stored once, from either room, so both ends are checked. */
export function roomDoors(ship: Ship, cells: Map<string, string>, roomId: string): RadialDoor[] {
  const room = ship.rooms.find((r) => r.id === roomId);
  if (!room) return [];
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const out: RadialDoor[] = [];
  for (const m of ship.doorMarks ?? []) {
    const d = step(m.side);
    const own = cells.get(`${m.x},${m.y}`);
    const far = cells.get(`${m.x + d.x},${m.y + d.y}`) ?? "void";
    let side: Side;
    let other: string;
    if (own === roomId) {
      side = m.side;
      other = far;
    } else if (far === roomId && own) {
      side = OPPOSITE[m.side];
      other = own;
    } else continue;
    // Edge midpoint of the door's tile wall.
    const ex = m.x + 0.5 + d.x * 0.5;
    const ey = m.y + 0.5 + d.y * 0.5;
    const door = ship.doors.find(
      (x) => (x.a === roomId && x.b === other) || (x.a === other && x.b === roomId),
    );
    out.push({
      key: `${m.x},${m.y},${m.side}`,
      side,
      dx: ex - cx,
      dy: ey - cy,
      room: roomId,
      other,
      door,
    });
  }
  return out;
}
