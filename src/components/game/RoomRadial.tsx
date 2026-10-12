import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Crew } from "@/game/types";
import { CrewFace } from "./CrewSprite";
import type { RadialDoor, Side } from "./room-doors";

/** INVENTED: spread angles that would overlap so every button stays tappable, keeping their order around the ring. */
function spread(angles: number[], gap: number): number[] {
  const n = angles.length;
  if (n < 2) return angles;
  if (n * gap >= Math.PI * 2) return angles.map((_, i) => angles[0]! + (i * Math.PI * 2) / n);
  const order = angles.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let k = 0; k < n; k++) {
      const cur = order[k]!;
      const next = order[(k + 1) % n]!;
      let diff = next.a - cur.a;
      if (k === n - 1) diff += Math.PI * 2;
      if (diff >= gap - 1e-6) continue;
      const push = (gap - diff) / 2;
      cur.a -= push;
      next.a += push;
      moved = true;
    }
    if (!moved) break;
  }
  const out = new Array<number>(n);
  for (const p of order) out[p.i] = p.a;
  return out;
}

const DOOR_PX = 34;
const CREW_PX = 34;
const GAP_PX = 4;

/**
 * Per the user: a long click or long tap on a room opens a radial menu, for precise orders on a phone. The room's
 * doors sit around the ring at the same angle they have from the room's centre; the crew in the room form a grid in
 * the middle to pick from. INVENTED look and sizes.
 * Picking: the first crew tap in an open menu replaces the selection (like a click on the hull); later taps add or
 * remove, so several can be picked without leaving the menu. INVENTED.
 */
export function RoomRadial({
  title,
  at,
  turn,
  doors,
  crew,
  picked,
  doorsDead,
  onDoor,
  onPick,
  onClose,
}: {
  title: string;
  /** Room centre in viewport pixels. */
  at: { x: number; y: number };
  /** Quarter turns of the stage, so door angles match the hull on screen. */
  turn: number;
  doors: RadialDoor[];
  crew: Crew[];
  picked: Set<string>;
  doorsDead?: boolean;
  onDoor?: (a: string, b: string) => void;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const cols = crew.length <= 1 ? 1 : crew.length <= 4 ? 2 : 3;
  const rows = Math.max(1, Math.ceil(crew.length / cols));
  const gridW = cols * CREW_PX + (cols - 1) * GAP_PX;
  const gridH = rows * CREW_PX + (rows - 1) * GAP_PX;
  const radius = Math.max(52, Math.hypot(gridW, gridH) / 2 + DOOR_PX / 2 + 10);
  const rot = (turn * Math.PI) / 180;
  const raw = doors.map((d) => Math.atan2(d.dy, d.dx) + rot);
  const angles = spread(raw, 2 * Math.asin(Math.min(1, (DOOR_PX + 6) / 2 / radius)));
  // Keep the whole ring on screen.
  const reach = radius + DOOR_PX / 2 + 4;
  const vw = typeof window === "undefined" ? 0 : window.innerWidth;
  const vh = typeof window === "undefined" ? 0 : window.innerHeight;
  const cx = vw ? Math.min(Math.max(at.x, reach), Math.max(reach, vw - reach)) : at.x;
  const cy = vh ? Math.min(Math.max(at.y, reach), Math.max(reach, vh - reach)) : at.y;
  // On screen, the wall a door sits on turns with the stage.
  const turnSide = (s: Side): Side => {
    const ring: Side[] = ["n", "e", "s", "w"];
    return ring[(ring.indexOf(s) + Math.round(turn / 90)) % 4]!;
  };

  // A touch hold opens the menu under the finger, and lifting it sends a click to whatever is now there. Only a press
  // that starts inside the menu counts, so that release cannot close the menu or pick someone.
  const pressed = useRef(false);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
  return createPortal(
    <div
      className="radial-shade"
      role="dialog"
      aria-label={`${title} menu`}
      onPointerDownCapture={() => {
        pressed.current = true;
      }}
      onClickCapture={(e) => {
        if (pressed.current) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="radial" style={{ left: cx, top: cy, width: radius * 2, height: radius * 2 }}>
        <i className="radial-ring" aria-hidden="true" />
        {crew.length ? (
          <div className="radial-crew" style={{ gridTemplateColumns: `repeat(${cols}, ${CREW_PX}px)` }}>
            {crew.map((c) => {
              const hp = Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100));
              const on = picked.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={"radial-mate" + (on ? " is-on" : "")}
                  aria-label={c.name}
                  aria-pressed={on}
                  title={c.name}
                  onClick={() => onPick(c.id)}
                >
                  <CrewFace crew={c} pose="idle" frame={0} cycle={false} />
                  <span className="crew-hp" aria-hidden="true">
                    <b style={{ width: `${hp}%` }} />
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
        {doors.map((d, i) => {
          const a = angles[i]!;
          const open = d.door?.open ?? false;
          const broken = (d.door?.stuck ?? 0) > 0;
          const dead = broken || !!doorsDead;
          const airlock = d.other === "void";
          const side = turnSide(d.side);
          return (
            <button
              key={d.key}
              type="button"
              className={
                `radial-door is-${side}` +
                (open ? " is-open" : "") +
                (airlock ? " is-airlock" : "") +
                (dead ? " is-dead" : "")
              }
              style={{ left: radius + Math.cos(a) * radius, top: radius + Math.sin(a) * radius }}
              disabled={!onDoor || dead}
              aria-label={`${airlock ? "Airlock" : "Door"}: ${broken ? "broken" : doorsDead ? "no door control" : open ? "close" : "open"}`}
              aria-pressed={open}
              onClick={() => onDoor?.(d.room, d.other)}
            >
              <span className="radial-slab" aria-hidden="true" />
              <span className="radial-slab" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
