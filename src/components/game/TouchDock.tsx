/**
 * Device-pixel controls for a coarse pointer or a board scaled below 1.
 * Rendered in Screen's `.touch-root`, outside the 1280×720 transform.
 * A desktop mouse at full size never mounts this.
 */
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { unlockAudio } from "@/game/audio";
import { WEAPONS } from "@/game/content";
import { spikeRoomTargetable } from "@/game/extras/spike";
import { shipInDanger } from "@/game/extras/sling";
import {
  canJumpTo,
  chooseSector,
  closeAllDoors,
  commitJump,
  depowerWeapon,
  doorLabel,
  leaveStore,
  openAllDoors,
  orderSelected,
  reverseSlotAuto,
  selectCrew,
  selectedIds,
  slotAutofire,
  toggleDoor,
  togglePause,
  waitHere,
} from "@/game/sim";
import { useGame } from "@/game/store";
import type { Game } from "@/game/types";
import { armHold, holdTookContext, swallowHoldClick } from "./hold";
import { useTouchSlot } from "./Screen";

function act(fn: (g: Game) => void) {
  unlockAudio();
  useGame.getState().act(fn);
}

function beaconTag(b: { quest?: string; resolved: boolean; kind: string; name: string; flag: string }) {
  if (b.quest && !b.resolved) return "QUEST";
  if (b.kind === "store") return "STORE";
  if (b.kind === "exit") return "EXIT";
  if (b.kind === "distress" || /distress/i.test(`${b.name} ${b.flag}`)) return "DISTRESS";
  if (b.kind === "hostile") return "HOSTILE";
  return "";
}

export function PhonePlay({
  game,
  hackAiming,
  slingAiming,
  leashAiming,
  card,
  onCancelAim,
  onArmWeapon,
  onAimRoom,
  onLeashCrew,
  onHack,
  onSling,
  onLeash,
  onCloak,
  onBattery,
}: {
  game: Game;
  hackAiming: boolean;
  slingAiming: boolean;
  leashAiming: boolean;
  card: ReactNode;
  onCancelAim: () => void;
  onArmWeapon: (uid: string) => void;
  onAimRoom: (roomId: string) => void;
  onLeashCrew: (crewId: string) => void;
  onHack: () => void;
  onSling: () => void;
  onLeash: () => void;
  onCloak: () => void;
  onBattery: () => void;
}) {
  const slot = useTouchSlot();
  const [doorsOpen, setDoorsOpen] = useState(false);
  if (!slot) return null;

  const aiming = !!(game.targeting || hackAiming || slingAiming || leashAiming);
  const onMap = game.phase === "map" || !!game.picking;
  const sector = !!game.sectorMap && game.phase !== "victory" && game.phase !== "defeat";
  const crew = game.crew.filter((c) => c.side === "player" && c.hp > 0);
  const selected = selectedIds(game);
  const showDoors = !card && doorsOpen;
  const showTargets = !card && !showDoors && aiming && !!game.enemy;
  const showJumps = !card && !showDoors && !showTargets && (sector || onMap);
  // A selected crew member still gets a room list while the jump chart is up.
  const showRooms = !card && !showDoors && !showTargets && selected.length > 0;

  const layer = (
    <div className={`phone-layer${card ? " is-fill" : ""}`} data-phone-root="">
      {card ? (
        <div className="phone-readout">
          {game.phase === "store" ? (
            <button type="button" data-phone-action="leave-store" onClick={() => act((g) => leaveStore(g))}>
              Leave store
            </button>
          ) : null}
          {card}
        </div>
      ) : (
        <>
          {showJumps || showTargets || showDoors || showRooms ? (
            <div className="phone-stack">
              {showJumps ? <JumpPanel game={game} sector={sector} /> : null}
              {showTargets ? (
                <TargetPanel
                  game={game}
                  hackAiming={hackAiming}
                  slingAiming={slingAiming}
                  leashAiming={leashAiming}
                  onAimRoom={onAimRoom}
                  onLeashCrew={onLeashCrew}
                  onCancel={onCancelAim}
                />
              ) : null}
              {showDoors ? <DoorPanel game={game} /> : null}
              {showRooms ? <RoomPanel game={game} /> : null}
            </div>
          ) : null}
          <div className="phone-bar">
            {game.phase === "combat" ? (
              <button type="button" data-phone-action="pause" onClick={() => act((g) => togglePause(g))}>
                {game.paused ? "Resume" : "Pause"}
              </button>
            ) : null}
            {game.phase !== "title" && !shipInDanger(game) ? (
              <button type="button" data-phone-action="ship" onClick={() => act((g) => { g.shipSheet = true; })}>
                Ship
              </button>
            ) : null}
            {game.phase === "combat" && game.player.kits.spike ? (
              <button type="button" data-phone-action="hack" aria-pressed={hackAiming} onClick={onHack}>Hack</button>
            ) : null}
            {game.phase === "combat" && game.player.kits.sling ? (
              <button type="button" data-phone-action="sling" aria-pressed={slingAiming} onClick={onSling}>Teleport</button>
            ) : null}
            {game.phase === "combat" && game.player.kits.leash ? (
              <button type="button" data-phone-action="leash" aria-pressed={leashAiming} onClick={onLeash}>Mind</button>
            ) : null}
            {game.phase === "combat" && game.player.kits.veil ? (
              <button type="button" data-phone-action="cloak" onClick={onCloak}>Cloak</button>
            ) : null}
            {game.phase === "combat" && game.player.kits.cell ? (
              <button type="button" data-phone-action="battery" onClick={onBattery}>Battery</button>
            ) : null}
            {aiming ? (
              <button type="button" data-phone-action="cancel" onClick={onCancelAim}>
                Cancel
              </button>
            ) : null}
            {!sector && game.phase !== "combat" && !game.picking ? (
              <button
                type="button"
                data-phone-action="open-map"
                onClick={() =>
                  act((g) => {
                    g.picking = true;
                  })
                }
              >
                Jump
              </button>
            ) : null}
            {game.phase === "combat" && !game.picking && game.flee >= 1 ? (
              <button
                type="button"
                data-phone-action="open-map"
                onClick={() =>
                  act((g) => {
                    g.picking = true;
                  })
                }
              >
                Jump
              </button>
            ) : null}
            {crew.map((c) => (
              <button
                key={c.id}
                type="button"
                data-phone-action="crew"
                data-crew={c.id}
                aria-pressed={selected.includes(c.id)}
                onClick={() => act((g) => selectCrew(g, c.id, "replace"))}
              >
                {c.name}
              </button>
            ))}
            {game.player.weapons.map((w, index) => {
              const name = WEAPONS[w.defId]?.name ?? w.defId;
              const auto = slotAutofire(game, w);
              return (
                <span key={w.uid} className="phone-gun">
                  <button
                    type="button"
                    data-phone-action="weapon"
                    data-weapon={w.uid}
                    aria-pressed={game.targeting && game.armed === w.uid}
                    aria-label={`${index + 1}. ${name}. ${w.enabled ? "Powered" : "Depowered"}. ${auto ? "Autofire on" : "Autofire off"}.`}
                    onPointerDown={(e) => armHold(e, () => act((g) => depowerWeapon(g, w.uid)))}
                    onClick={(e) => {
                      if (swallowHoldClick(e)) return;
                      onArmWeapon(w.uid);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (holdTookContext(e.currentTarget)) return;
                      act((g) => depowerWeapon(g, w.uid));
                    }}
                  >
                    {index + 1} {name}
                  </button>
                  <button
                    type="button"
                    data-phone-action="autofire"
                    data-weapon={w.uid}
                    aria-pressed={auto}
                    aria-label={`${name} autofire`}
                    onClick={() => act((g) => reverseSlotAuto(g, w.uid))}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    data-phone-action="depower"
                    data-weapon={w.uid}
                    aria-label={`Depower ${name}`}
                    disabled={!w.enabled}
                    onClick={() => act((g) => depowerWeapon(g, w.uid))}
                  >
                    Off
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              data-phone-action="doors"
              aria-pressed={doorsOpen}
              onClick={() => setDoorsOpen((open) => !open)}
            >
              Doors
            </button>
          </div>
        </>
      )}
    </div>
  );
  return createPortal(layer, slot);
}

function JumpPanel({ game, sector }: { game: Game; sector: boolean }) {
  if (sector) {
    const nodes = game.route ?? [];
    const here = nodes.find((n) => n.id === game.routeHere);
    const next = nodes.filter((n) => here?.links.includes(n.id));
    return (
      <div className="phone-panel">
        <p className="phone-kicker">Next sector</p>
        {next.map((b, i) => (
          <button key={b.id} type="button" data-phone-action="sector" onClick={() => act((g) => chooseSector(g, b.id))}>
            {i + 1}. {b.name}
          </button>
        ))}
      </div>
    );
  }
  const here = game.beacons.find((b) => b.id === game.here);
  const jumps = game.beacons.filter((b) => b.id !== game.here && canJumpTo(game, b.id));
  const charging = game.phase === "combat" && game.flee < 1;
  return (
    <div className="phone-panel">
      <p className="phone-kicker">{here ? `Jump from ${here.name}` : "Jump"}</p>
      {game.phase === "map" ? (
        <button type="button" data-phone-action="wait" onClick={() => act((g) => waitHere(g))}>
          Wait
        </button>
      ) : null}
      {game.picking ? (
        <button
          type="button"
          data-phone-action="close-map"
          onClick={() =>
            act((g) => {
              g.picking = false;
            })
          }
        >
          Close map
        </button>
      ) : null}
      {charging ? <p className="phone-kicker">Jump drive charging</p> : null}
      {jumps.map((b) => {
        const tag = beaconTag(b);
        return (
          <button
            key={b.id}
            type="button"
            data-phone-action="beacon"
            data-beacon={b.id}
            data-kind={b.kind}
            disabled={charging}
            onClick={() => act((g) => commitJump(g, b.id))}
          >
            {tag ? `${tag} · ` : ""}
            {b.name}
          </button>
        );
      })}
    </div>
  );
}

function RoomPanel({ game }: { game: Game }) {
  const groups: { aboard: "player" | "enemy"; rooms: Game["player"]["rooms"] }[] = [];
  const seen = new Set<string>();
  for (const id of selectedIds(game)) {
    const c = game.crew.find((x) => x.id === id);
    if (!c || c.side !== "player" || c.hp <= 0 || seen.has(c.aboard)) continue;
    seen.add(c.aboard);
    if (c.aboard === "enemy" && game.enemy) groups.push({ aboard: "enemy", rooms: game.enemy.rooms });
    if (c.aboard === "player") groups.push({ aboard: "player", rooms: game.player.rooms });
  }
  return (
    <div className="phone-panel">
      <p className="phone-kicker">Send crew</p>
      {groups.map((group) =>
        group.rooms.map((room) => (
          <button
            key={`${group.aboard}-${room.id}`}
            type="button"
            data-phone-action="room"
            data-room={room.id}
            data-aboard={group.aboard}
            onClick={() => act((g) => orderSelected(g, room.id, group.aboard))}
          >
            {group.aboard === "enemy" ? `Enemy ${room.title}` : room.title}
          </button>
        )),
      )}
    </div>
  );
}

function DoorPanel({ game }: { game: Game }) {
  return (
    <div className="phone-panel">
      <p className="phone-kicker">Doors</p>
      <button type="button" data-phone-action="open-doors" onClick={() => act((g) => openAllDoors(g))}>
        Open all doors
      </button>
      <button type="button" data-phone-action="close-doors" onClick={() => act((g) => closeAllDoors(g))}>
        Close all doors
      </button>
      {game.player.doors.map((d) => (
        <button
          key={`${d.a}-${d.b}`}
          type="button"
          data-phone-action="door"
          onClick={() => act((g) => toggleDoor(g, d.a, d.b))}
        >
          {doorLabel(game.player, d)}
          <em>{d.open ? "Open" : "Shut"}</em>
        </button>
      ))}
    </div>
  );
}

function TargetPanel({
  game,
  hackAiming,
  slingAiming,
  leashAiming,
  onAimRoom,
  onLeashCrew,
  onCancel,
}: {
  game: Game;
  hackAiming: boolean;
  slingAiming: boolean;
  leashAiming: boolean;
  onAimRoom: (roomId: string) => void;
  onLeashCrew: (crewId: string) => void;
  onCancel: () => void;
}) {
  const enemy = game.enemy;
  if (!enemy) return null;
  const bomb = game.targeting && WEAPONS[game.player.weapons.find((w) => w.uid === game.armed)?.defId ?? ""]?.kind === "bomb";
  const rooms = hackAiming ? enemy.rooms.filter((r) => spikeRoomTargetable(game, r.id)) : enemy.rooms;
  const foe = enemy && game.crew.filter((c) => c.side === "enemy" && c.hp > 0 && c.aboard === "enemy");
  return (
    <div className="phone-panel">
      <p className="phone-kicker">{leashAiming ? "Mind control" : hackAiming ? "Hack" : slingAiming ? "Teleport" : "Target"}</p>
      <button type="button" data-phone-action="cancel" onClick={onCancel}>
        Cancel
      </button>
      {leashAiming
        ? foe.map((c) => (
            <button key={c.id} type="button" data-phone-action="leash" onClick={() => onLeashCrew(c.id)}>
              {c.name}
            </button>
          ))
        : rooms.map((room) => (
            <button key={room.id} type="button" data-phone-action="target" data-room={room.id} onClick={() => onAimRoom(room.id)}>
              {room.title}
            </button>
          ))}
      {bomb
        ? game.player.rooms.map((room) => (
            <button key={`own-${room.id}`} type="button" data-phone-action="target" data-room={room.id} onClick={() => onAimRoom(room.id)}>
              Own {room.title}
            </button>
          ))
        : null}
    </div>
  );
}

/** Title, hangar, and options in device pixels. The pixel art stays on the scaled board. */
export function PhoneMenu({ children, plain = false }: { children: ReactNode; plain?: boolean }) {
  const slot = useTouchSlot();
  if (!slot) return null;
  return createPortal(
    <div className="phone-layer is-fill" data-phone-root="">
      {plain ? children : <div className="phone-menu">{children}</div>}
    </div>,
    slot,
  );
}
