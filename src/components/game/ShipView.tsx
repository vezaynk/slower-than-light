import { roomClip } from "@/game/layouts";
import { powerMask, zoltanBars } from "@/game/sim";
import type { Crew, Ship } from "@/game/types";
import { CrewFace } from "./CrewSprite";
import { DoorTicks, cellOwners } from "./DoorTicks";
import { WeaponArt } from "./GearArt";
import { PixelIcon } from "./PixelIcon";

/** A player gun's queued room, drawn as a numbered reticle on the enemy ship. */
export type AimMark = { room: string; slot: number; state: "charging" | "ready" | "auto" };

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
  onRoom: (id: string) => void;
  onCrew: (id: string) => void;
  aims?: AimMark[];
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
}: Props) {
  void ventMode;
  const here = crew.filter((c) => c.aboard === aboard && c.hp > 0);
  const cells = cellOwners(ship.rooms);
  return (
    <div
      className={`hull ${aboard === "enemy" ? "hull-foe" : "hull-own"}`}
      data-ship={aboard}
      style={{
        gridTemplateColumns: `repeat(${ship.cols}, var(--tile))`,
        gridTemplateRows: `repeat(${ship.rows}, var(--tile))`,
      }}
    >
      {ship.rooms.map((room) => {
        const occupants = showCrew ? here.filter((c) => c.room === room.id) : [];
        const hot = occupants.some((c) => c.id === selectedId);
        const clip = roomClip(room);
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
              (room.hacked ? ` is-hacked is-hacked-${room.hacked}` : "")
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
              onClick={() => onRoom(room.id)}
            />
            <div className="room-body">
              <div className="room-name">{roomLabel(room.title, room.w)}</div>
              <div className="room-flags">
                {room.fire > 0 ? <span>Fire</span> : null}
                {room.breach > 0 ? <span>Leak</span> : null}
                {room.venting ? <span>Vent</span> : null}
                {room.system && ship.systems[room.system].damage > 0 ? (
                  <span>Dmg {ship.systems[room.system].damage}</span>
                ) : null}
                {room.system && ship.systems[room.system].ion.length > 0 ? (
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
    </div>
  );
}
