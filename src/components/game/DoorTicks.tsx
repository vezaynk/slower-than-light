import { tx } from "@/i18n";
import "./room-motion.css";
import type { CSSProperties } from "react";
import { doorHurt } from "@/game/sim";
import type { Door, DoorMark } from "@/game/types";

type Box = { id: string; x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

function doorOf(doors: Door[] | undefined, a: string, b: string): Door | undefined {
  if (!doors) return undefined;
  return doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
}

type DoorPaint = {
  marks: DoorMark[] | undefined;
  rooms: Box[];
  doors?: Door[];
  cells?: Map<string, string>;
  onToggle?: (a: string, b: string) => void;
  /** Ion, a broken Door System, or a hacked-offline system. Those bars are red-orange. */
  doorsDead?: boolean;
};

function neighbor(mark: DoorMark): { x: number; y: number } {
  if (mark.side === "e") return { x: mark.x + 1, y: mark.y };
  if (mark.side === "w") return { x: mark.x - 1, y: mark.y };
  if (mark.side === "s") return { x: mark.x, y: mark.y + 1 };
  return { x: mark.x, y: mark.y - 1 };
}

function doorState(door: Door | undefined, doorsDead: boolean | undefined): { open: boolean; broken: boolean; dead: boolean; hurt: boolean; label: string; title: string } {
  const open = door?.open ?? false;
  const broken = (door?.stuck ?? 0) > 0;
  const dead = !!doorsDead && !broken;
  const hurt = !!door && doorHurt(door);
  if (broken) return { open, broken, dead, hurt, label: tx("ui.DoorTicks.broken-door"), title: tx("ui.DoorTicks.broken") };
  if (dead) return { open, broken, dead, hurt, label: tx("ui.DoorTicks.door-control-is-dead"), title: tx("ui.DoorTicks.no-door-control") };
  if (hurt) {
    const label = open ? tx("ui.DoorTicks.close-door") : tx("ui.DoorTicks.open-door");
    return { open, broken, dead, hurt, label, title: tx("ui.DoorTicks.damaged") };
  }
  if (open) return { open, broken, dead, hurt, label: tx("ui.DoorTicks.close-door"), title: tx("ui.DoorTicks.open") };
  return { open, broken, dead, hurt, label: tx("ui.DoorTicks.open-door"), title: tx("ui.DoorTicks.shut") };
}

function doorClass(
  side: DoorMark["side"],
  state: { open: boolean; broken: boolean; dead: boolean; hurt: boolean },
  airlock: boolean,
): string {
  return (
    "door-tick is-" +
    side +
    (airlock ? " is-airlock" : "") +
    (state.open ? " is-open" : "") +
    (state.broken ? " is-broken" : "") +
    (state.dead ? " is-dead" : "") +
    (state.hurt ? " is-hurt" : "")
  );
}

/**
 * One door per traced bar, painted on the hull grid so the room does not clip it.
 * The leaf stays parallel to its wall: shut fills the doorway; open, it compresses and slides along the wall past the
 * doorway's end, so the way is fully clear (per the user).
 * Door System: a dead system turns the leaf red-orange.
 */
export function DoorLayer({ marks, rooms, doors, cells, onToggle, doorsDead }: DoorPaint) {
  const owners = cells ?? cellOwners(rooms);
  if (!marks?.length) return null;
  return (
    <div className="door-layer">
      {marks.map((mark) => {
        const other = neighbor(mark);
        const here = owners.get(`${mark.x},${mark.y}`);
        if (!here) return null;
        const otherId = owners.get(`${other.x},${other.y}`) ?? "void";
        const door = doorOf(doors, here, otherId);
        const state = doorState(door, doorsDead);
        // Per the user: airlocks (a door to space) look different from interior doors.
        const cls = doorClass(mark.side, state, otherId === "void");
        const style = { "--x": mark.x, "--y": mark.y } as CSSProperties;
        const slab = <span className="door-slab" aria-hidden="true" />;
        if (!onToggle) {
          return (
            <i key={`${mark.x},${mark.y},${mark.side}`} className={cls} style={style}>
              {slab}
            </i>
          );
        }
        return (
          <button
            key={`${mark.x},${mark.y},${mark.side}`}
            type="button"
            className={cls}
            style={style}
            aria-label={state.label}
            title={state.title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggle(here, otherId);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {slab}
          </button>
        );
      })}
    </div>
  );
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
            aria-label={open ? tx("ui.DoorTicks.close-door") : tx("ui.DoorTicks.open-door")}
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
