import { roomClip } from "@/game/layouts";
import type { Crew, Ship } from "@/game/types";
import { DoorTicks, cellOwners } from "./DoorTicks";

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
}: Props) {
  void ventMode;
  const here = crew.filter((c) => c.aboard === aboard && c.hp > 0);
  const cells = cellOwners(ship.rooms);
  return (
    <div
      className={`hull ${aboard === "enemy" ? "hull-foe" : "hull-own"}`}
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
            className={
              "room" +
              (clip ? " is-cut" : "") +
              (room.flash > 0 ? " is-flash" : "") +
              (room.fire > 0 ? " is-fire" : "") +
              (room.venting ? " is-vent" : "") +
              (room.o2 <= 10 ? " is-low" : "") +
              ((room.lock ?? 0) > 0 ? " is-lock" : "") +
              (hot ? " is-hot" : "") +
              (targetable ? " is-aim" : "")
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
              <div className="room-name">{room.title}</div>
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
                      className={`token tone-${c.tone} ${c.id === selectedId ? "is-selected" : ""}`}
                      aria-label={c.name}
                      aria-pressed={c.id === selectedId}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCrew(c.id);
                      }}
                    >
                      {c.name.slice(0, 1)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <DoorTicks room={room} marks={ship.doorMarks} doors={ship.doors} cells={cells} />
          </div>
        );
      })}
    </div>
  );
}
