import "./room-motion.css";
import type { CSSProperties } from "react";
import type { Door, DoorMark } from "@/game/types";

type Box = { id: string; x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

function doorOf(doors: Door[] | undefined, a: string, b: string): Door | undefined {
  if (!doors) return undefined;
  return doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
}

/** Orange bar for one traced door. Combat uses the sim door's open flag. The hangar draws them shut, as the picture does. */
export function DoorTicks({
  room,
  marks,
  doors,
  cells,
  onToggle,
  doorsDead,
}: {
  room: Box;
  marks: DoorMark[] | undefined;
  doors?: Door[];
  cells?: Map<string, string>;
  /** Player hull only. A click opens or closes this bar. */
  onToggle?: (a: string, b: string) => void;
  /** Ion, a broken Door System, or a hacked-offline system. The bars draw red-orange and refuse the click in the sim. */
  doorsDead?: boolean;
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
        const otherId = other ?? "void";
        const door = doorOf(doors, room.id, otherId);
        const open = door?.open ?? false;
        const dead = !!doorsDead || (door?.stuck ?? 0) > 0;
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
        const cls = "door-tick" + (open ? " is-open" : "") + (dead ? " is-dead" : "");
        if (!onToggle) return <i key={i} className={cls} style={style} />;
        return (
          <button
            key={i}
            type="button"
            className={cls}
            style={style}
            aria-label={open ? "Close door" : "Open door"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(room.id, otherId);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        );
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
