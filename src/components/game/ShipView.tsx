import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { pointInRoom } from "@/game/beam-line";
import { roomClip } from "@/game/layouts";
import { powerMask, zoltanBars } from "@/game/sim";
import type { BeamLine, BeamPoint, Crew, Ship } from "@/game/types";
import { artilleryGun } from "@/game/wiki/flagship-systems";
import { CrewFace } from "./CrewSprite";
import { DoorTicks, cellOwners } from "./DoorTicks";
import { WeaponArt } from "./GearArt";
import { PixelIcon } from "./PixelIcon";

/** A player gun's queued room, drawn as a numbered reticle on the enemy ship. */
export type AimMark = { room: string; slot: number; state: "charging" | "ready" | "auto" };

/**
 * @agent:hack-ui. The player's hacking drone on an enemy room, drawn as its own reticle (not a numbered gun mark).
 * Hacking wiki, "Choosing your hacking target": "Choosing a hacking target works much the same as targeting your
 * weapons." "aim" = picked but not launched, "latched" = drone on the hull, "pulse" = the hacking pulse is running.
 */
export type HackMark = { room: string; phase: "aim" | "latched" | "pulse"; left: number };

/** One-tile rooms fit about five characters, so they get a short label. The full name stays in the aria-label. */
const SHORT: Record<string, string> = {
  piloting: "PILOT",
  sensors: "SENS",
  weapons: "WEAP",
  engines: "ENG",
  shields: "SHLD",
  oxygen: "O2",
  medbay: "MED",
  doors: "DOOR",
  cloaking: "CLOAK",
  drones: "DRONE",
  teleporter: "TELE",
  hacking: "HACK",
  "clone bay": "CLONE",
  "mind control": "MIND",
  artillery: "ARTY",
  battery: "BATT",
};

function roomLabel(title: string, wide: number) {
  if (wide > 1) return title;
  return SHORT[title.toLowerCase()] ?? title.slice(0, 5);
}

/**
 * INVENTED mount layout: guns alternate between the top and bottom hull edges, on the
 * half that faces the other ship. CombatFx reads data-mount to launch shots from the muzzle.
 */
function Mounts({ ship, crew, aboard }: { ship: Ship; crew: Crew[]; aboard: "player" | "enemy" }) {
  const mask = powerMask(ship, zoltanBars(crew, ship, aboard, "weapons"));
  const perEdge = Math.max(1, Math.ceil(ship.weapons.length / 2));
  return (
    <>
      {ship.weapons.map((w, i) => {
        const edge = i % 2 === 0 ? "top" : "bottom";
        const along = 38 + (Math.floor(i / 2) + 0.5) * (52 / perEdge);
        const powered = mask[i] ?? false;
        const ready = powered && w.charge >= 1;
        return (
          <span
            key={w.uid}
            className={`mount is-${edge}${powered ? "" : " is-cold"}${ready ? " is-ready" : ""}`}
            style={aboard === "player" ? { left: `${along}%` } : { right: `${along}%` }}
            data-mount={w.uid}
            data-def={w.defId}
            aria-hidden="true"
          >
            <WeaponArt id={w.defId} height={aboard === "player" ? 22 : 16} />
          </span>
        );
      })}
    </>
  );
}

type Props = {
  ship: Ship;
  crew: Crew[];
  aboard: "player" | "enemy";
  showCrew: boolean;
  selectedId: string | null;
  ventMode: boolean;
  targetable: boolean;
  onRoom: (id: string, point?: BeamPoint) => void;
  /** First click of a beam, in this hull's tile space. The next click is the end. */
  beamAnchor?: BeamPoint | null;
  /** Queued player swipes, drawn across this hull. */
  beamLines?: BeamLine[];
  onCrew: (id: string) => void;
  aims?: AimMark[];
  /** @agent:hack-ui. The player's hacking drone reticle (enemy ship only). */
  hackMark?: HackMark | null;
  /** @agent:hack-ui. In hack targeting: true for rooms the drone may be aimed at. */
  hackPick?: (roomId: string) => boolean;
};

export function ShipView({
  ship,
  crew,
  aboard,
  showCrew,
  selectedId,
  ventMode,
  targetable,
  onRoom,
  onCrew,
  aims = [],
  hackMark = null,
  hackPick,
  beamAnchor = null,
  beamLines = [],
}: Props) {
  void ventMode;
  const here = crew.filter((c) => c.aboard === aboard && c.hp > 0);
  const cells = cellOwners(ship.rooms);
  const hullRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<BeamPoint | null>(null);
  useEffect(() => {
    if (!beamAnchor) setHover(null);
  }, [beamAnchor]);
  const strokes: { a: BeamPoint; b: BeamPoint; preview: boolean }[] = [
    ...beamLines.map((line) => ({ a: line.a, b: line.b, preview: false })),
    ...(beamAnchor && hover ? [{ a: beamAnchor, b: hover, preview: true }] : []),
  ];
  return (
    <div
      ref={hullRef}
      className={`hull ${aboard === "enemy" ? "hull-foe" : "hull-own"}`}
      data-ship={aboard}
      onPointerMove={
        beamAnchor
          ? (e) => {
              const hull = hullRef.current;
              if (!hull) return;
              const roomEl = (e.target as Element | null)?.closest?.("[data-room]") ?? null;
              const next = pointOnHull(hull, ship, e.clientX, e.clientY, roomEl);
              if (next) setHover(next);
            }
          : undefined
      }
      onPointerLeave={beamAnchor ? () => setHover(null) : undefined}
      style={{
        gridTemplateColumns: `repeat(${ship.cols}, var(--tile))`,
        gridTemplateRows: `repeat(${ship.rows}, var(--tile))`,
      }}
    >
      {ship.rooms.map((room) => {
        const occupants = showCrew ? here.filter((c) => c.room === room.id) : [];
        const hot = occupants.some((c) => c.id === selectedId);
        const clip = roomClip(room);
        const pick = hackPick ? hackPick(room.id) : null;
        const drone = hackMark && hackMark.room === room.id ? hackMark : null;
        return (
          <div
            key={room.id}
            data-room={room.id}
            data-hacked={room.hacked}
            className={
              "room" +
              (clip ? " is-cut" : "") +
              (room.flash > 0 ? " is-flash" : "") +
              (room.fire > 0 ? " is-fire" : "") +
              (room.venting ? " is-vent" : "") +
              (room.o2 <= 10 ? " is-low" : "") +
              ((room.lock ?? 0) > 0 ? " is-lock" : "") +
              (hot ? " is-hot" : "") +
              (targetable ? " is-aim" : "") +
              // @agent:hacking. An enemy hacking drone on this room's system (extras/spike.ts, Room.hacked).
              (room.hacked ? ` is-hacked is-hacked-${room.hacked}` : "") +
              // @agent:hack-ui. Player hack targeting: valid rooms are lit, the rest are dimmed.
              (pick === true ? " is-hack-pick" : pick === false ? " is-hack-nopick" : "")
            }
            style={{
              gridColumn: `${room.x + 1} / span ${room.w}`,
              gridRow: `${room.y + 1} / span ${room.h}`,
            }}
          >
            {clip ? <i className="pixel-fill" style={{ clipPath: clip }} /> : null}
            <button
              type="button"
              className="room-hit"
              aria-label={(targetable ? "Target " : "Open ") + room.title}
              onClick={(e) => {
                const f = frac(e.currentTarget, e.clientX, e.clientY);
                onRoom(room.id, pointInRoom(room, f.x, f.y));
              }}
            />
            <div className="room-body">
              <div className="room-name">{roomLabel(room.title, room.w)}</div>
              <div className="room-flags">
                {room.fire > 0 ? <span>Fire</span> : null}
                {room.breach > 0 ? <span>Leak</span> : null}
                {room.venting ? <span>Vent</span> : null}
                {/* @agent:flagship. A flagship artillery room shows its own gun (wiki/flagship-systems.ts artilleryGun). */}
                {room.system && (artilleryGun(ship, room.id) ?? ship.systems[room.system]).damage > 0 ? (
                  <span>Dmg {(artilleryGun(ship, room.id) ?? ship.systems[room.system]).damage}</span>
                ) : null}
                {room.system && (artilleryGun(ship, room.id) ?? ship.systems[room.system]).ion.length > 0 ? (
                  <span>Ion</span>
                ) : null}
              </div>
              <div className="o2" aria-hidden="true">
                <span className={room.o2 <= 10 ? "low" : ""} style={{ width: `${room.o2}%` }} />
              </div>
              {showCrew ? (
                <div className="crew-row">
                  {occupants.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`token is-sprite${c.id === selectedId ? " is-selected" : ""}${
                        (c.leashed ?? 0) > 0 ? ` is-leashed leashed-by-${c.side === "player" ? "enemy" : "player"}` : ""
                      }`}
                      aria-label={(c.leashed ?? 0) > 0 ? `${c.name} (mind-controlled)` : c.name}
                      title={(c.leashed ?? 0) > 0 ? `${c.name}: mind-controlled, ${Math.ceil(c.leashed ?? 0)}s` : undefined}
                      aria-pressed={c.id === selectedId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrew(c.id);
                      }}
                    >
                      <CrewFace crew={c} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {room.hacked ? (
              <div className="hack-mark" aria-label={room.hacked === "pulse" ? "Hacked: pulse" : "Hacking drone attached"}>
                <i className="hack-drone" aria-hidden="true" />
              </div>
            ) : null}
            <DoorTicks room={room} marks={ship.doorMarks} doors={ship.doors} cells={cells} />
            {drone ? (
              <div
                className={`hack-reticle is-${drone.phase}`}
                aria-label={
                  drone.phase === "pulse"
                    ? `Hacking pulse, ${Math.ceil(drone.left)} seconds`
                    : drone.phase === "latched"
                      ? "Your hacking drone is attached"
                      : "Hacking target"
                }
              >
                <span className="hack-reticle-box">
                  <PixelIcon name="spike" size={16} />
                </span>
                {drone.phase === "pulse" ? <b>{Math.ceil(drone.left)}</b> : null}
              </div>
            ) : null}
            {aims.some((a) => a.room === room.id) ? (
              <div className="aim-marks" aria-hidden="true">
                {aims
                  .filter((a) => a.room === room.id)
                  .map((a) => (
                    <span key={a.slot} className={`aim-mark is-${a.state}`}>
                      <PixelIcon name="target" size={26} />
                      <b>{a.state === "auto" ? `${a.slot}A` : a.slot}</b>
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <Mounts ship={ship} crew={crew} aboard={aboard} />
      <BeamOverlay hullRef={hullRef} lines={strokes} />
    </div>
  );
}

function frac(el: HTMLElement, clientX: number, clientY: number): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: rect.width > 0 ? (clientX - rect.left) / rect.width : 0.5,
    y: rect.height > 0 ? (clientY - rect.top) / rect.height : 0.5,
  };
}

function pointOnHull(hull: HTMLElement, ship: Ship, clientX: number, clientY: number, roomEl: Element | null): BeamPoint | null {
  if (roomEl) {
    const id = roomEl.getAttribute("data-room");
    const room = ship.rooms.find((r) => r.id === id);
    if (room) {
      const f = frac(roomEl as HTMLElement, clientX, clientY);
      return pointInRoom(room, f.x, f.y);
    }
  }
  const rect = hull.getBoundingClientRect();
  const cs = getComputedStyle(hull);
  const tile = parseFloat(cs.getPropertyValue("--tile")) || 0;
  const gap = parseFloat(cs.columnGap) || 0;
  const padX = parseFloat(cs.paddingLeft) || 0;
  const padY = parseFloat(cs.paddingTop) || 0;
  if (!(tile > 0)) return null;
  const pitch = tile + gap;
  const localX = clientX - rect.left - padX;
  const localY = clientY - rect.top - padY;
  const cx = Math.floor(localX / pitch);
  const cy = Math.floor(localY / pitch);
  if (cx < 0 || cy < 0 || cx >= ship.cols || cy >= ship.rows) return null;
  const fx = (localX - cx * pitch) / tile;
  const fy = (localY - cy * pitch) / tile;
  return { x: cx + Math.min(Math.max(fx, 0), 0.999999), y: cy + Math.min(Math.max(fy, 0), 0.999999) };
}

function BeamOverlay({
  hullRef,
  lines,
}: {
  hullRef: RefObject<HTMLDivElement | null>;
  lines: { a: BeamPoint; b: BeamPoint; preview: boolean }[];
}) {
  const [box, setBox] = useState({ tile: 0, gap: 0, padX: 0, padY: 0 });
  useLayoutEffect(() => {
    const el = hullRef.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      setBox({
        tile: parseFloat(cs.getPropertyValue("--tile")) || 0,
        gap: parseFloat(cs.columnGap) || 0,
        padX: parseFloat(cs.paddingLeft) || 0,
        padY: parseFloat(cs.paddingTop) || 0,
      });
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(el);
    return () => obs.disconnect();
  }, [hullRef, lines.length]);
  if (!(box.tile > 0) || lines.length === 0) return null;
  const to = (p: BeamPoint) => {
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    return {
      x: box.padX + cx * (box.tile + box.gap) + (p.x - cx) * box.tile,
      y: box.padY + cy * (box.tile + box.gap) + (p.y - cy) * box.tile,
    };
  };
  return (
    <svg className="beam-stroke" aria-hidden="true">
      {lines.map((line, i) => {
        const a = to(line.a);
        const b = to(line.b);
        const preview = line.preview ? " is-preview" : "";
        return (
          <g key={`${i}-${line.preview ? "p" : "s"}`}>
            <line className={`beam-ink${preview}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line
              className={`beam-hot${preview}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              data-beam={line.preview ? "preview" : "set"}
            />
          </g>
        );
      })}
    </svg>
  );
}
