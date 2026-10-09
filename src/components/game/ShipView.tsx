import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { pointInRoom } from "@/game/beam-line";
import { assignStands, padCells, restSpot, roomConsole, stationSide } from "@/game/crew-spots";
import { roomClip } from "@/game/layouts";
import { powerMask, zoltanBars } from "@/game/sim";
import type { BeamLine, BeamPoint, Crew, Ship } from "@/game/types";
import { arriveMove, walkPose } from "@/game/walk-path";
import { artilleryGun } from "@/game/wiki/flagship-systems";
import { CrewFace, type CrewPose } from "./CrewSprite";
import { DoorTicks, cellOwners } from "./DoorTicks";
import { WeaponArt } from "./GearArt";
import { HullPlate } from "./HullPlate";
import { armHold, holdTookContext, swallowHoldClick } from "./hold";
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

/** Leashed crew fight for the other side (sim sideOf). */
function effectiveSide(c: Crew): "player" | "enemy" {
  if ((c.leashed ?? 0) > 0) return c.side === "player" ? "enemy" : "player";
  return c.side;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/** Room center as a percent of the hull, from the room box not the gap. */
function roomCenter(room: { x: number; y: number; w: number; h: number }, ship: Ship) {
  return {
    x: ((room.x + room.w / 2) / ship.cols) * 100,
    y: ((room.y + room.h / 2) / ship.rows) * 100,
  };
}

/** Walking crew are drawn once, between this room and path[0]. Stun holds them in the room. */
function walkStep(ship: Ship, c: Crew) {
  if (c.hp <= 0 || c.path.length === 0 || (c.stun ?? 0) > 0) return null;
  const from = ship.rooms.find((r) => r.id === c.room);
  const to = ship.rooms.find((r) => r.id === c.path[0]);
  if (!from || !to) return null;
  return { from, to };
}

/** Sprite center as a percent of the hull. Walkers follow the door path. Idle crew use their floor tile. */
function crewPlace(
  ship: Ship,
  roster: Crew[],
  c: Crew,
  spot: { x: number; y: number } | undefined,
): { x: number; y: number; faceLeft: boolean } | null {
  const step = walkStep(ship, c);
  if (step) {
    const dest = ship.rooms.find((r) => r.id === c.path[c.path.length - 1]);
    const goal = dest ? (restSpot(dest, roster, c.id, c.aboard, ship) ?? undefined) : undefined;
    // The last hop is drawn on its tile before the sim clears the path.
    const t = c.path.length === 1 ? arriveMove(c.move) : clamp01(c.move);
    const at = walkPose(ship, c.room, c.path, c.via, t, goal);
    if (at) return { x: (at.x / ship.cols) * 100, y: (at.y / ship.rows) * 100, faceLeft: at.faceLeft };
    const from = roomCenter(step.from, ship);
    const to = roomCenter(step.to, ship);
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
      faceLeft: to.x < from.x,
    };
  }
  if (!spot) return null;
  return {
    x: ((spot.x + 0.5) / ship.cols) * 100,
    y: ((spot.y + 0.5) / ship.rows) * 100,
    faceLeft: false,
  };
}

/** Standing, alive, not stunned, sharing a room with a living crew of the other effective side. */
function meleeIds(list: Crew[]): Set<string> {
  const ids = new Set<string>();
  for (const c of list) {
    if (c.path.length > 0 || (c.stun ?? 0) > 0) continue;
    const side = effectiveSide(c);
    if (list.some((o) => o.id !== c.id && o.room === c.room && effectiveSide(o) !== side)) ids.add(c.id);
  }
  return ids;
}

function CrewToken({
  crew: c,
  picked,
  onCrew,
  onPlace,
  pose,
  frame,
  className,
  style,
}: {
  crew: Crew;
  picked: boolean;
  onCrew: (id: string, shift: boolean) => void;
  onPlace?: (roomId: string) => void;
  pose: CrewPose;
  frame: number;
  className?: string;
  style?: CSSProperties;
}) {
  const leashed = (c.leashed ?? 0) > 0;
  const stunned = pose !== "walk" && c.path.length === 0 && (c.stun ?? 0) > 0;
  const hp = Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100));
  return (
    <button
      type="button"
      className={
        "token is-sprite" +
        (picked ? " is-selected" : "") +
        (leashed ? ` is-leashed leashed-by-${c.side === "player" ? "enemy" : "player"}` : "") +
        (stunned ? " is-stunned" : "") +
        (className ? ` ${className}` : "")
      }
      style={style}
      data-crew={c.id}
      aria-label={leashed ? `${c.name} (mind-controlled)` : c.name}
      title={leashed ? `${c.name}: mind-controlled, ${Math.ceil(c.leashed ?? 0)}s` : undefined}
      aria-pressed={picked}
      onPointerDown={(e) => {
        if (onPlace) armHold(e, () => onPlace(c.room));
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (swallowHoldClick(e)) return;
        onCrew(c.id, e.shiftKey);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (holdTookContext(e.currentTarget)) return;
        onPlace?.(c.room);
      }}
    >
      <CrewFace crew={c} pose={pose} frame={frame} />
      <span className="crew-hp" aria-hidden="true">
        <b style={{ width: `${hp}%` }} />
      </span>
    </button>
  );
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
  /** Room interior (fire, air, damage). Absent means every room is open. */
  seen?: (roomId: string) => boolean;
  /** Crew still drawn when their room is closed. Slug life signs use this. */
  crewLit?: (c: Crew) => boolean;
  selectedId: string | null;
  /** Group selection. Absent means only `selectedId`. */
  selectedIds?: string[];
  ventMode: boolean;
  targetable: boolean;
  onRoom: (id: string, point?: BeamPoint, how?: { touch?: boolean }) => void;
  /** Right-click a room to move the crew who can walk on this hull. */
  onRoomMenu?: (id: string) => void;
  /** Drag box. The ids are every living crew member whose sprite fell inside it. */
  onDragCrew?: (ids: string[]) => void;
  /** Light the room under the pointer while someone who can walk here is selected. */
  markDest?: boolean;
  /** Player door bars. Absent leaves the bars as decoration. */
  onDoor?: (a: string, b: string) => void;
  doorsDead?: boolean;
  /** First click of a beam, in this hull's tile space. The next click is the end. */
  beamAnchor?: BeamPoint | null;
  /** Queued player swipes, drawn across this hull. */
  beamLines?: BeamLine[];
  onCrew: (id: string, shift?: boolean) => void;
  aims?: AimMark[];
  /** @agent:hack-ui. The player's hacking drone reticle (enemy ship only). */
  hackMark?: HackMark | null;
  /** @agent:hack-ui. In hack targeting: true for rooms the drone may be aimed at. */
  hackPick?: (roomId: string) => boolean;
  /** Zoltans: drone health in this room, already rounded down. */
  droneHp?: { room: string; shown: number }[];
  /** Hull plate id. Missing still draws, as faction or "rebel", id "ship". */
  plateId?: string;
  faction?: string;
  pirate?: boolean;
  facing?: "left" | "right";
};

export function ShipView({
  ship,
  crew,
  aboard,
  showCrew,
  seen,
  crewLit,
  selectedId,
  selectedIds,
  ventMode,
  targetable,
  onRoom,
  onRoomMenu,
  onDragCrew,
  markDest,
  onDoor,
  doorsDead,
  onCrew,
  aims = [],
  hackMark = null,
  hackPick,
  beamAnchor = null,
  beamLines = [],
  droneHp = [],
  plateId,
  faction,
  pirate,
  facing,
}: Props) {
  void ventMode;
  const here = crew.filter((c) => c.aboard === aboard && c.hp > 0);
  const fighting = meleeIds(here);
  const cells = cellOwners(ship.rooms);
  const picked = new Set(selectedIds ?? (selectedId ? [selectedId] : []));
  const stands = new Map<string, { x: number; y: number; stack: number }>();
  for (const c of here) {
    const destId = c.path.length > 0 ? c.path[c.path.length - 1]! : c.room;
    const room = ship.rooms.find((r) => r.id === destId);
    if (!room) continue;
    const spot = restSpot(room, here, c.id, c.aboard, ship);
    if (spot) stands.set(c.id, spot);
  }
  const standFor = (c: Crew) => {
    if ((c.stun ?? 0) > 0 && c.path.length > 0) {
      const room = ship.rooms.find((r) => r.id === c.room);
      if (room) {
        const local = here.filter((o) => o.room === c.room && ((o.stun ?? 0) > 0 || o.path.length === 0));
        const spot = assignStands(room, local, { hull: ship, aboard }).get(c.id);
        if (spot) return spot;
      }
    }
    return stands.get(c.id);
  };
  const hullRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);
  const [hover, setHover] = useState<BeamPoint | null>(null);
  const [destRoom, setDestRoom] = useState<string | null>(null);
  const [dragBox, setDragBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
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
      onPointerDown={(e) => {
        if (e.button !== 0 || !onDragCrew) return;
        const t = e.target as Element | null;
        if (t?.closest(".token, .door-tick, .mount")) return;
        dragRef.current = { x: e.clientX, y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        const hull = hullRef.current;
        if (!hull) return;
        const roomEl = (e.target as Element | null)?.closest?.("[data-room]") ?? null;
        if (beamAnchor) {
          const next = pointOnHull(hull, ship, e.clientX, e.clientY, roomEl);
          if (next) setHover(next);
        }
        if (markDest) setDestRoom(roomEl?.getAttribute("data-room") ?? null);
        const drag = dragRef.current;
        if (!drag) return;
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 6) {
          drag.moved = true;
          hull.setPointerCapture(e.pointerId);
        }
        if (!drag.moved) return;
        const rect = hull.getBoundingClientRect();
        const x1 = Math.min(drag.x, e.clientX) - rect.left;
        const y1 = Math.min(drag.y, e.clientY) - rect.top;
        const x2 = Math.max(drag.x, e.clientX) - rect.left;
        const y2 = Math.max(drag.y, e.clientY) - rect.top;
        setDragBox({ left: x1, top: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) });
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        dragRef.current = null;
        setDragBox(null);
        if (!drag.moved || !onDragCrew) return;
        swallowClick.current = true;
        const hull = hullRef.current;
        if (!hull) return;
        const rect = hull.getBoundingClientRect();
        const x1 = Math.min(drag.x, e.clientX);
        const y1 = Math.min(drag.y, e.clientY);
        const x2 = Math.max(drag.x, e.clientX);
        const y2 = Math.max(drag.y, e.clientY);
        const ids: string[] = [];
        for (const c of here) {
          const open = seen ? seen(c.room) : true;
          if (!open && !(crewLit?.(c) ?? false)) continue;
          const at = crewPlace(ship, here, c, standFor(c));
          if (!at) continue;
          const px = rect.left + (at.x / 100) * rect.width;
          const py = rect.top + (at.y / 100) * rect.height;
          if (px >= x1 && px <= x2 && py >= y1 && py <= y2) ids.push(c.id);
        }
        onDragCrew(ids);
      }}
      onPointerLeave={() => {
        if (beamAnchor) setHover(null);
        if (!dragRef.current?.moved) setDestRoom(null);
      }}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        gridTemplateColumns: `repeat(${ship.cols}, var(--tile))`,
        gridTemplateRows: `repeat(${ship.rows}, var(--tile))`,
      }}
    >
      <HullPlate
        id={plateId ?? "ship"}
        faction={faction ?? "rebel"}
        pirate={pirate}
        facing={facing ?? (aboard === "player" ? "right" : "left")}
        cols={ship.cols}
        rows={ship.rows}
        rooms={ship.rooms}
      />
      {ship.rooms.map((room) => {
        const open = seen ? seen(room.id) : true;
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
              (markDest && destRoom === room.id ? " is-dest" : "") +
              (open ? "" : " is-unseen") +
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
              onPointerDown={(e) => {
                e.currentTarget.dataset.ptr = e.pointerType;
                if (onRoomMenu) armHold(e, () => onRoomMenu(room.id));
              }}
              onClick={(e) => {
                if (swallowHoldClick(e)) return;
                const f = frac(e.currentTarget, e.clientX, e.clientY);
                const touch = e.currentTarget.dataset.ptr === "touch";
                onRoom(room.id, pointInRoom(room, f.x, f.y), { touch });
              }}
              onContextMenu={(e) => {
                if (!onRoomMenu) return;
                e.preventDefault();
                e.stopPropagation();
                if (holdTookContext(e.currentTarget)) return;
                onRoomMenu(room.id);
              }}
            />
            <div className="room-body">
              <div className="room-name">{roomLabel(room.title, room.w)}</div>
              {open ? (
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
                  {droneHp
                    .filter((mark) => mark.room === room.id)
                    .map((mark, i) => (
                      <span key={`drone-hp-${i}`} data-drone-hp={mark.shown} aria-label={`Drone health ${mark.shown}`}>
                        {mark.shown}
                      </span>
                    ))}
                </div>
              ) : null}
              {open ? (
                <div className="o2" aria-hidden="true">
                  <span className={room.o2 <= 10 ? "low" : ""} style={{ width: `${room.o2}%` }} />
                </div>
              ) : null}
            </div>
            {open
              ? (() => {
                  const cell = roomConsole(room, ship);
                  if (!cell) return null;
                  const manned = here.some((c) => {
                    if (c.room !== room.id || c.path.length > 0 || stationSide(c) !== aboard) return false;
                    const spot = stands.get(c.id);
                    return !!spot && spot.stack === 0 && spot.x === cell.x && spot.y === cell.y;
                  });
                  return (
                    <i
                      className={"room-console" + (manned ? " is-on" : "")}
                      data-console={`${cell.x},${cell.y}`}
                      data-manned={manned ? "1" : "0"}
                      aria-hidden="true"
                      style={{
                        left: `${((cell.x - room.x) / room.w) * 100}%`,
                        top: `${((cell.y - room.y) / room.h) * 100}%`,
                        width: `${100 / room.w}%`,
                        height: `${100 / room.h}%`,
                      }}
                    />
                  );
                })()
              : null}
            {room.kit === "sling"
              ? padCells(room).map((key) => {
                  const [xs, ys] = key.split(",");
                  const x = Number(xs) - room.x;
                  const y = Number(ys) - room.y;
                  const live = (ship.kits.sling?.power ?? 0) > 0;
                  return (
                    <i
                      key={key}
                      className={"pad-pip" + (live ? " is-live" : "")}
                      style={{
                        left: `${((x + 0.5) / room.w) * 100}%`,
                        top: `${((y + 0.5) / room.h) * 100}%`,
                      }}
                    />
                  );
                })
              : null}
            {room.hacked ? (
              <div className="hack-mark" aria-label={room.hacked === "pulse" ? "Hacked: pulse" : "Hacking drone attached"}>
                <i className="hack-drone" aria-hidden="true" />
              </div>
            ) : null}
            <DoorTicks
              room={room}
              marks={ship.doorMarks}
              doors={ship.doors}
              cells={cells}
              onToggle={onDoor}
              doorsDead={doorsDead}
            />
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
      {showCrew ? (
        <div className="crew-walkers">
          {here.map((c) => {
            const open = seen ? seen(c.room) : true;
            if (!open && !(crewLit?.(c) ?? false)) return null;
            const step = walkStep(ship, c);
            const spot = standFor(c);
            const at = crewPlace(ship, here, c, spot);
            if (!at) return null;
            const faceLeft = at.faceLeft;
            const pose: CrewPose = step ? "walk" : fighting.has(c.id) ? "fight" : "idle";
            const frame = step
              ? Math.floor((c.path.length === 1 ? arriveMove(c.move) : clamp01(c.move)) * 4) % 4
              : pose === "fight"
                ? Math.floor((((c.swing ?? 0) % 1) * 4)) % 4
                : 0;
            const nudge = spot && !step ? spot.stack * 4 : 0;
            return (
              <CrewToken
                key={c.id}
                crew={c}
                picked={picked.has(c.id)}
                onCrew={onCrew}
                onPlace={onRoomMenu}
                pose={pose}
                frame={frame}
                className={"crew-walker" + (faceLeft ? " is-face-left" : "")}
                style={{
                  left: `${at.x}%`,
                  top: `${at.y}%`,
                  transform: faceLeft
                    ? `translate(calc(-50% + ${nudge}px), calc(-50% + ${nudge}px)) scaleX(-1)`
                    : `translate(calc(-50% + ${nudge}px), calc(-50% + ${nudge}px))`,
                }}
              />
            );
          })}
        </div>
      ) : null}
      {dragBox ? <div className="crew-drag" style={dragBox} /> : null}
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
