import type { CSSProperties } from "react";
import type { Door, DoorMark } from "@/game/types";

type Box = { id: string; x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

function openOf(doors: Door[] | undefined, a: string, b: string): boolean {
  if (!doors) return false;
  const door = doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
  return door?.open ?? false;
}

/** Orange bar for one traced door. Combat uses the sim door's open flag. The hangar draws them shut, as the picture does. */
export function DoorTicks({
  room,
  marks,
  doors,
  cells,
}: {
  room: Box;
  marks: DoorMark[] | undefined;
  doors?: Door[];
  cells?: Map<string, string>;
}) {
  if (!marks?.length) return null;
  const mine = marks.filter(
    (m) =>
      m.x >= room.x &&
      m.x < room.x + room.w &&
      m.y >= room.y &&
      m.y < room.y + room.h &&
      !room.omit?.some((cell) => cell.x === m.x && cell.y === m.y),
  );
  if (!mine.length) return null;
  const tileW = 100 / room.w;
  const tileH = 100 / room.h;
  return (
    <>
      {mine.map((m, i) => {
        const lx = m.x - room.x;
        const ly = m.y - room.y;
        const dx = m.side === "e" ? 1 : m.side === "w" ? -1 : 0;
        const dy = m.side === "s" ? 1 : m.side === "n" ? -1 : 0;
        const other = cells?.get(`${m.x + dx},${m.y + dy}`);
        const open = other ? openOf(doors, room.id, other) : openOf(doors, room.id, "void");
        const along = m.side === "e" || m.side === "w";
        const style: CSSProperties = along
          ? {
              width: 4,
              height: `${tileH * 0.46}%`,
              top: `${(ly + 0.27) * tileH}%`,
              [m.side === "e" ? "right" : "left"]: -3,
            }
          : {
              height: 4,
              width: `${tileW * 0.46}%`,
              left: `${(lx + 0.27) * tileW}%`,
              [m.side === "s" ? "bottom" : "top"]: -3,
            };
        return <i key={i} className={open ? "door-tick is-open" : "door-tick"} style={style} />;
      })}
    </>
  );
}

export function cellOwners(rooms: Box[]): Map<string, string> {
  const at = new Map<string, string>();
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (r.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
        at.set(`${x},${y}`, r.id);
      }
    }
  }
  return at;
}
