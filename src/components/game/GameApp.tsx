import { useEffect, useState, type ReactNode } from "react";
import {
  Compass,
  Crosshair,
  DoorOpen,
  Eye,
  Gauge,
  HeartPulse,
  Minus,
  Plus,
  Shield,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import { resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import {
  SECTOR_NAMES,
  SYS_LABEL,
  WEAPONS,
  hullRepairPerPoint,
  upgradeBlurb,
  upgradeCost,
} from "@/game/content";
import { CATALOG } from "@/game/extras/augments";
import { installCell, startCell } from "@/game/extras/cell";
import { kinOf } from "@/game/extras/kin";
import { Hangar } from "./Hangar";
import { PixelHull, PixelLayout, PixelMenu, PixelTitle, TITLE_MENU_ART, UnlockDiagram, classOfPage } from "./PixelArt";
import { PLAYABLE_SHIPS, cruiserPage, type CruiserLayout, type WikiLine } from "@/game/wiki/layout-pages";
import { startVeil } from "@/game/extras/veil";
import {
  aim,
  armWeapon,
  cancelTargeting,
  choiceDisabled,
  choose,
  chooseSector,
  commitJump,
  continueReward,
  depowerWeapon,
  doorLabel,
  enemySpoolSeconds,
  evasionPercent,
  ftlSeconds,
  hasSave,
  isMain,
  maxBubbles,
  lockdown,
  lockdownSelected,
  openAllDoors,
  orderCrew,
  patchAll,
  powerDown,
  powerMask,
  powerUp,
  reverseSlotAuto,
  saveGame,
  selectCrew,
  slotAutofire,
  sparePower,
  toggleAutoAll,
  toggleDoor,
  togglePause,
  upgrade,
} from "@/game/sim";
import { useGame } from "@/game/store";
import type { Game, KitId, SysId } from "@/game/types";
import { ShipView } from "./ShipView";
import { AchievementsScreen, ControlsScreen, HelpScreen, StoreBoard, Verdict, sectorTone } from "./WikiViews";

const ICONS: Record<SysId, typeof Shield> = {
  shields: Shield,
  engines: Gauge,
  oxygen: Wind,
  medbay: HeartPulse,
  weapons: Crosshair,
  pilot: Compass,
  sensors: Eye,
  doors: DoorOpen,
};

const SYS_ORDER: SysId[] = [
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "pilot",
  "sensors",
  "doors",
];

const KIT_LABEL: Record<KitId, string> = {
  veil: "Cloaking",
  sling: "Teleporter",
  spike: "Hacking",
  swarm: "Drone Control",
  leash: "Mind Control",
  cradle: "Clone Bay",
  cell: "Backup Battery",
  lance: "Artillery Beam",
  flak: "Flak Artillery",
};

function act(fn: (g: Game) => void) {
  unlockAudio();
  useGame.getState().act(fn);
}

/** INVENTED title line. The play HUD follows the combat, event, and pause screens. */
export function GameApp() {
  const version = useGame((s) => s.version);
  const game = useGame.getState().game;
  void version;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const plain = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
      if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        act((g) => togglePause(g));
        return;
      }
      if (e.code === "KeyM" && plain) {
        e.preventDefault();
        act((g) => {
          g.muted = !g.muted;
          setMuted(g.muted);
        });
        return;
      }
      const g = useGame.getState().game;
      if (g.manual || g.shipSheet) return;
      // Crystal, "Crystal Lockdown": the default shortcut is P. The Crystal page calls the ability Lockdown.
      if (e.code === "KeyP" && plain) {
        e.preventDefault();
        act((game) => lockdownSelected(game));
        return;
      }
      // Crystal, "Crystal Lockdown": Z opens every door and overrides the coating.
      if (e.code === "KeyZ" && plain) {
        e.preventDefault();
        act((game) => openAllDoors(game));
        return;
      }
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (!digit) return;
      const n = Number(digit[1]) - 1;
      if (g.phase === "event" && g.event && plain) {
        const choice = g.event.choices[n];
        if (!choice || choiceDisabled(g, choice.id)) return;
        e.preventDefault();
        act((game) => choose(game, choice.id));
        return;
      }
      if (g.phase === "reward" && n === 0 && plain) {
        e.preventDefault();
        act((game) => continueReward(game));
        return;
      }
      if ((g.phase === "combat" || g.phase === "map") && !g.picking) {
        const weapon = g.player.weapons[n];
        if (!weapon || e.altKey) return;
        e.preventDefault();
        // Weapon Control, Overview: Ctrl+1–4 reverses one slot. Shift+1–4 depowers. 1–4 activates.
        if (e.ctrlKey || e.metaKey) {
          act((game) => reverseSlotAuto(game, weapon.uid));
          return;
        }
        if (e.shiftKey) {
          act((game) => depowerWeapon(game, weapon.uid));
          return;
        }
        act((game) => armWeapon(game, weapon.uid));
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    const w = window as unknown as {
      __ashwake?: { game: () => Game; act: (fn: (g: Game) => void) => void };
    };
    w.__ashwake = {
      game: () => useGame.getState().game,
      act: (fn) => useGame.getState().act(fn),
    };
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let ui = 0;
    let saveAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      saveAcc += dt;
      const g = useGame.getState().game;
      const live = g.phase === "combat" && !g.paused;
      let steps = 0;
      while (acc >= 1 / 30 && steps < 4) {
        useGame.getState().tick(1 / 30);
        acc -= 1 / 30;
        steps += 1;
      }
      if (!live) acc = 0;
      if (live && now - ui > 80) {
        ui = now;
        useGame.getState().bump();
      }
      if (saveAcc > 2) {
        saveAcc = 0;
        saveGame(useGame.getState().game);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className={game.phase === "title" ? "deck" : "deck play-root"}>
      {game.phase === "title" ? <TitleScreen /> : <PlayFrame game={game} shake={reduced ? 0 : game.trauma * game.trauma} />}
      {game.manual ? <Manual onClose={() => act((g) => { g.manual = false; })} /> : null}
      {game.shipSheet ? <ShipSheet game={game} /> : null}
    </div>
  );
}

const MAIN_BARS: SysId[] = ["shields", "engines", "medbay", "oxygen", "weapons"];

/** INVENTED: the combat, event, and pause screens are the layout guide. No wiki page specifies this chrome. */
function PlayFrame({ game, shake }: { game: Game; shake: number }) {
  const sector = game.sectorMap && game.phase !== "victory" && game.phase !== "defeat";
  const chart = !sector && (game.phase === "map" || game.picking);
  const showTarget = !!game.enemy && !chart && (game.phase === "combat" || game.phase === "event");
  const ox = shake ? Math.sin(game.time * 40) * 7 * shake : 0;
  const oy = shake ? Math.cos(game.time * 33) * 5 * shake : 0;
  return (
    <div
      className={`play${showTarget ? "" : " no-target"}${game.targeting ? " is-targeting" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        act((g) => cancelTargeting(g));
      }}
    >
      <Hud game={game} />
      <CrewRail game={game} />
      <div className="stage-slot">
        {sector ? (
          <SectorChart game={game} />
        ) : chart ? (
          <MapScreen game={game} />
        ) : (
          <ShipStage game={game} shake={shake ? { transform: `translate(${ox}px, ${oy}px)` } : undefined} />
        )}
        {game.paused && game.phase === "combat" ? <PauseStamp /> : null}
      </div>
      {showTarget && game.enemy ? <TargetPanel game={game} /> : null}
      <Dock game={game} />
      {game.phase === "event" && game.event ? <EventModal game={game} /> : null}
      {game.phase === "store" ? <StoreBoard game={game} /> : null}
      {game.phase === "reward" && game.reward ? <RewardModal game={game} /> : null}
      {game.phase === "victory" || game.phase === "defeat" ? (
        <div className="modal-layer verdict-layer">
          <Verdict game={game} />
        </div>
      ) : null}
    </div>
  );
}

function Hud({ game }: { game: Game }) {
  const evade = evasionPercent(game, game.player, "player");
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player), bubbles, 1);
  const spool = ftlSeconds(game, game.player);
  const charging = game.phase === "combat" && game.flee < 1;
  const ready = game.phase === "combat" && game.flee >= 1 && !game.picking;
  return (
    <header className="hud">
      <div className="hud-left">
        <div className="hull-row">
          <span className="hud-word">HULL</span>
          <div className="hull-segs" aria-label={`Hull ${game.player.hull} of ${game.player.hullMax}`}>
            {Array.from({ length: 30 }, (_, i) => (
              <i key={i} className={i < Math.round((game.player.hull / Math.max(1, game.player.hullMax)) * 30) ? "on" : ""} />
            ))}
          </div>
          <div className="scrap-box" aria-label={`${game.scrap} scrap`}>
            <GearIcon />
            <b>{game.scrap}</b>
          </div>
        </div>
        <div className="store-row">
          <span className="bubbles" aria-label={`${bubbles} shield bubbles`}>
            {Array.from({ length: cap }, (_, i) => (
              <i key={i} className={i < bubbles ? "on" : ""} />
            ))}
          </span>
          {game.player.zoltan != null ? (
            <span className="bubbles zoltan-pips" aria-label={`Zoltan Shield ${game.player.zoltan}`}>
              {Array.from({ length: 5 }, (_, i) => (
                <i key={i} className={i < (game.player.zoltan ?? 0) ? "on" : ""} />
              ))}
            </span>
          ) : null}
          <span className="evade-chip" aria-label={`Evasion ${evade} percent`}>
            <i />
            {evade}
          </span>
          <span className="count-chip" aria-label={`${game.missiles} missiles`}>
            <MissileIcon />
            {game.missiles}
          </span>
          <span className="count-chip" aria-label={`${game.player.parts} drone parts`}>
            <PartIcon />
            {game.player.parts}
          </span>
        </div>
      </div>
      <div className="hud-right">
        <button
          type="button"
          className={`ftl-drive${charging ? " is-charging" : ""}`}
          disabled={game.phase === "combat" && game.flee < 1}
          title={spool == null ? "FTL needs a pilot or engines." : `About ${Math.round(spool)} seconds at this engine power. Fuel ${game.fuel}.`}
          onClick={() => {
            if (game.phase === "map") return;
            if (game.picking) {
              act((g) => {
                g.picking = false;
              });
              return;
            }
            if (ready) {
              act((g) => {
                g.picking = true;
              });
            }
          }}
        >
          <span>FTL Drive</span>
          <span className="ftl-meter">
            <i style={{ width: `${Math.round((game.phase === "combat" ? game.flee : 1) * 100)}%` }} />
          </span>
          <em>
            {charging ? "CHARGING" : game.picking ? "CHART" : "READY"} · {game.fuel}
          </em>
        </button>
        <button
          type="button"
          className="frame-btn"
          aria-label={game.picking ? "Back to the ship" : "Ship"}
          onClick={() =>
            act((g) => {
              if (g.picking) g.picking = false;
              else g.shipSheet = true;
            })
          }
        >
          <ShipIcon />
        </button>
        <button type="button" className="frame-btn" aria-label="Upgrades" onClick={() => act((g) => { g.shipSheet = true; })}>
          <WrenchIcon />
        </button>
      </div>
    </header>
  );
}

function CrewRail({ game }: { game: Game }) {
  const crew = game.crew.filter((c) => c.side === "player" && c.hp > 0);
  const air = shipOxygen(game.player);
  return (
    <aside className="crew-rail">
      <div className="air-readout">
        <span>
          <i className="evade-mini" />
          {evasionPercent(game, game.player, "player")}%
        </span>
        <span>O2 {air}%</span>
      </div>
      {crew.map((c) => (
        <div key={c.id} className={`crew-card${c.id === game.selected ? " is-selected" : ""}`}>
          <button type="button" className="crew-card-hit" onClick={() => act((g) => selectCrew(g, c.id))}>
            <Portrait kin={c.kin ?? "plain"} />
            <span>
              <strong>{c.name}</strong>
              <i className="hp">
                <b style={{ width: `${Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100))}%` }} />
              </i>
            </span>
          </button>
          {c.kin === "shard" ? (
            <button
              type="button"
              className="lock-pip"
              aria-label="Lockdown"
              disabled={(c.lockCool ?? 0) > 0}
              onClick={() => act((g) => lockdown(g, c.id))}
            >
              {(c.lockCool ?? 0) > 0 ? Math.ceil(c.lockCool ?? 0) : null}
            </button>
          ) : null}
        </div>
      ))}
    </aside>
  );
}

function ShipStage({ game, shake }: { game: Game; shake?: { transform: string } }) {
  const intruders = game.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player), 1);
  return (
    <div className="sky" style={shake}>
      <div className="planet" />
      <div className="shield-aura" style={{ opacity: 0.18 + 0.55 * (bubbles / cap) }} />
      {(game.player.zoltan ?? 0) > 0 ? <div className="shield-aura zoltan-aura" /> : null}
      <ShipView
        ship={game.player}
        crew={game.crew}
        aboard="player"
        showCrew
        selectedId={game.selected}
        ventMode={game.mode === "vent"}
        targetable={false}
        onRoom={(id) => {
          if (game.selected) act((g) => orderCrew(g, game.selected!, id));
        }}
        onCrew={(id) => act((g) => selectCrew(g, id))}
      />
      {intruders ? (
        <p className="intruder-warn">
          WARNING!
          <br />
          INTRUDERS
          <br />
          DETECTED
        </p>
      ) : null}
      <p className="log-line sky-log">{game.log[0]}</p>
    </div>
  );
}

function TargetPanel({ game }: { game: Game }) {
  const enemy = game.enemy;
  if (!enemy) return null;
  const foeSpool = enemySpoolSeconds(game);
  return (
    <aside className="target-panel">
      <div className="target-head">
        <span className="target-flag">TARGET</span>
        <div>
          <p>Class: {enemy.name}</p>
          <p>Relationship: Hostile</p>
          <p className="mini">
            Their jump {foeSpool == null ? "—" : `${Math.round(game.enemyFlee * foeSpool)}s`}
          </p>
        </div>
      </div>
      <div className="target-body">
        <ShipView
          ship={enemy}
          crew={game.crew}
          aboard="enemy"
          showCrew
          selectedId={null}
          ventMode={false}
          targetable
          onRoom={(id) => act((g) => aim(g, id))}
          onCrew={() => undefined}
        />
      </div>
      <div className="target-systems">
        {SYS_ORDER.map((id) => {
          const sys = enemy.systems[id];
          if (sys.level <= 0 && sys.power <= 0) return null;
          const Icon = ICONS[id];
          return (
            <span key={id} title={`${SYS_LABEL[id]} ${sys.power}`}>
              <Icon size={14} />
              <b>{sys.power}</b>
            </span>
          );
        })}
      </div>
    </aside>
  );
}

function Dock({ game }: { game: Game }) {
  const mask = powerMask(game.player);
  return (
    <footer className="dock">
      <div className="power-dock">
        <span className="spare-pip" title="Reactor bars not assigned">
          {sparePower(game.player)}
        </span>
        {MAIN_BARS.map((id) => (
          <PowerStack key={id} game={game} id={id} />
        ))}
      </div>
      <div className="weapon-dock">
        <div className="gun-tray">
          {game.player.weapons.map((w, index) => {
            const def = WEAPONS[w.defId];
            const live = w.enabled && mask[index];
            const auto = slotAutofire(game, w);
            const pips = 7;
            const filled = Math.round(Math.max(0, Math.min(1, w.charge)) * pips);
            const name = def?.name ?? w.defId;
            return (
              <button
                key={w.uid}
                type="button"
                className={`gun-slot${game.armed === w.uid ? " is-armed" : ""}${live ? "" : " is-dark"}${auto ? " is-auto" : ""}${game.targeting && game.armed === w.uid ? " is-targeting" : ""}`}
                aria-label={`${name}. ${w.enabled ? "Powered" : "Depowered"}. ${auto ? "Autofire on" : "Autofire off"}.`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    act((g) => reverseSlotAuto(g, w.uid));
                    return;
                  }
                  act((g) => armWeapon(g, w.uid));
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.ctrlKey || e.metaKey) {
                    act((g) => reverseSlotAuto(g, w.uid));
                    return;
                  }
                  act((g) => depowerWeapon(g, w.uid));
                }}
              >
                <span className="gun-hit">
                  <WeaponGlyph kind={def?.kind ?? "laser"} />
                  <span className="gun-name">{name}</span>
                </span>
                <span className="charge-pips" aria-hidden="true">
                  {Array.from({ length: pips }, (_, i) => (
                    <i key={i} className={i < filled ? "on" : ""} />
                  ))}
                </span>
                <span className="power-num">{def?.power ?? 1}</span>
              </button>
            );
          })}
        </div>
        <div className="dock-caption">
          <span className="dock-label">WEAPONS</span>
          <button
            type="button"
            className={`autofire${game.autofireAll ? " is-on" : ""}`}
            aria-pressed={!!game.autofireAll}
            onClick={() => act((g) => toggleAutoAll(g))}
          >
            AUTOFIRE
          </button>
        </div>
      </div>
      <div className="sub-dock">
        {game.mode === "vent" ? (
          <div className="door-pop">
            {game.player.doors.map((d) => (
              <button key={`${d.a}-${d.b}`} type="button" onClick={() => act((g) => toggleDoor(g, d.a, d.b))}>
                {doorLabel(game.player, d)}
                <em>{d.open ? "Open" : "Shut"}</em>
              </button>
            ))}
          </div>
        ) : null}
        <div className="sub-row">
          {(["pilot", "sensors", "doors"] as SysId[]).map((id) => {
            const Icon = ICONS[id];
            const sys = game.player.systems[id];
            return (
              <button
                key={id}
                type="button"
                className={`sub-orb${id === "doors" && game.mode === "vent" ? " is-on" : ""}`}
                aria-label={id === "doors" ? "Doors" : SYS_LABEL[id]}
                aria-pressed={id === "doors" ? game.mode === "vent" : undefined}
                onClick={() => {
                  if (id === "doors") {
                    act((g) => {
                      g.mode = g.mode === "vent" ? "crew" : "vent";
                    });
                  }
                }}
              >
                <i className="sub-bars" aria-hidden="true">
                  {Array.from({ length: Math.max(sys.level, 1) }, (_, n) => (
                    <b key={n} className={n < sys.level ? "on" : ""} />
                  ))}
                </i>
                <Icon size={16} />
              </button>
            );
          })}
          {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
            const kit = game.player.kits[id];
            if (!kit) return null;
            return (
              <button
                key={id}
                type="button"
                className={`sub-orb${kit.on ? " is-on" : ""}`}
                aria-label={KIT_LABEL[id]}
                title={KIT_LABEL[id]}
                onClick={() => {
                  if (id === "veil") act((g) => startVeil(g));
                  else if (id === "cell") act((g) => startCell(g));
                }}
              >
                <i className="sub-bars" aria-hidden="true">
                  {Array.from({ length: Math.max(kit.level, 1) }, (_, n) => (
                    <b key={n} className={n < kit.power ? "on" : ""} />
                  ))}
                </i>
                <KitMark id={id} />
              </button>
            );
          })}
        </div>
        <span className="dock-label">SUBSYSTEMS</span>
      </div>
    </footer>
  );
}

function PowerStack({ game, id }: { game: Game; id: SysId }) {
  const sys = game.player.systems[id];
  const cap = Math.max(0, sys.level - sys.damage - sys.ion.length);
  const Icon = ICONS[id];
  const slots = sys.level;
  return (
    <div className="power-stack">
      <div className="power-col">
        {Array.from({ length: slots }, (_, raw) => {
          const i = slots - 1 - raw;
          const ionStart = sys.level - sys.ion.length;
          const dmgStart = ionStart - sys.damage;
          const cls =
            sys.ion.length > 0 && i >= ionStart ? "is-ion" : sys.damage > 0 && i >= dmgStart ? "is-dmg" : i < sys.power ? "on" : "";
          return (
            <button
              key={i}
              type="button"
              className={cls}
              aria-label={`${SYS_LABEL[id]} power ${i + 1}`}
              onClick={() => {
                if (i >= cap) return;
                const next = i < sys.power ? i : i + 1;
                act((g) => setBars(g, id, next));
              }}
            />
          );
        })}
      </div>
      <span className="sys-orb" title={SYS_LABEL[id]}>
        <Icon size={15} />
      </span>
    </div>
  );
}

function EventModal({ game }: { game: Game }) {
  const event = game.event;
  if (!event) return null;
  return (
    <div className="modal-layer">
      <article className="ftl-card">
        {event.title ? <p className="event-lead">{event.title}</p> : null}
        <p>{event.body}</p>
        <div className="choice-list">
          {event.choices.map((c, index) => {
            const why = choiceDisabled(game, c.id);
            return (
              <button key={c.id} type="button" className="choice-line" disabled={!!why} onClick={() => act((g) => choose(g, c.id))}>
                {index + 1}. {c.label}
                {why ? ` (${why})` : ""}
              </button>
            );
          })}
        </div>
      </article>
    </div>
  );
}

/** INVENTED salvage lines. The scrap chip matches the event-screen reward. */
function RewardModal({ game }: { game: Game }) {
  const reward = game.reward;
  if (!reward) return null;
  return (
    <div className="modal-layer">
      <article className="ftl-card">
        <p>{reward.note || "The buoy is quiet."}</p>
        <p className="loot-chip">
          <GearIcon />
          <b>{reward.scrap}</b>
        </p>
        <button type="button" className="choice-line" onClick={() => act((g) => continueReward(g))}>
          1. Continue...
        </button>
      </article>
    </div>
  );
}

function PauseStamp() {
  return (
    <div className="pause-mark">
      <strong>PAUSED</strong>
      <span>Press SPACE to resume</span>
    </div>
  );
}

function shipOxygen(ship: Game["player"]): number {
  if (!ship.rooms.length) return 100;
  const sum = ship.rooms.reduce((n, room) => n + room.o2, 0);
  return Math.round(sum / ship.rooms.length);
}

function setBars(g: Game, id: SysId, next: number) {
  const sys = g.player.systems[id];
  let guard = 0;
  while (sys.power > next && guard < 16) {
    powerDown(g, id);
    guard += 1;
  }
  while (sys.power < next && guard < 32) {
    const before = sys.power;
    powerUp(g, id);
    guard += 1;
    if (sys.power === before) break;
  }
}

function Portrait({ kin }: { kin: string }) {
  return (
    <span className={`portrait kin-${kin}`} aria-hidden="true">
      <i />
    </span>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hud-icon" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        fill="currentColor"
        d="M11 1h2v3.2h-2zM11 19.8h2V23h-2zM1 11h3.2v2H1zM19.8 11H23v2h-3.2zM4.1 4.8l1.5-1.5 2.2 2.2-1.5 1.5zM16.2 18.5l1.5-1.5 2.2 2.2-1.5 1.5zM18.5 4.8l1.5 1.5-2.2 2.2-1.5-1.5zM5.6 16.9l1.5 1.5-2.2 2.2-1.5-1.5z"
      />
    </svg>
  );
}

function MissileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hud-icon" aria-hidden="true">
      <path fill="currentColor" d="M4 14 L14 4 h4 v4 L10 16 H8 L6 18 l-2 2 2-4z" />
    </svg>
  );
}

function PartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hud-icon" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeWidth="2" d="M13 7h4v4M7 13v4h4" />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hud-icon" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M3 14h10l7-5v8l-7-3H3z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="hud-icon" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M14 6a4 4 0 0 0-5 5L4 16l4 4 5-5a4 4 0 0 0 5-5l-3 1-2-2z" />
    </svg>
  );
}

function WeaponGlyph({ kind }: { kind: string }) {
  return <span className={`gun-glyph kind-${kind}`} aria-hidden="true" />;
}

function KitMark({ id }: { id: KitId }) {
  const letter = KIT_LABEL[id].slice(0, 1);
  return <span className="kit-mark">{letter}</span>;
}

/**
 * Initial screen is the pixel title: CONTINUE, NEW GAME, TUTORIAL, STATS, OPTIONS, CREDITS, QUIT.
 * NEW GAME opens the hangar in File:KestralASystems.png.
 */
function TitleScreen() {
  const [saveReady, setSaveReady] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const boot = useGame((s) => s.boot);
  useEffect(() => {
    setSaveReady(hasSave());
  }, []);
  useEffect(() => {
    if (boot === "hangar") {
      setView("hangar");
      useGame.setState({ boot: "title" });
    }
  }, [boot]);
  const cruiser = view ? cruiserPage(view) : undefined;
  if (view === "hangar") return <Hangar />;
  if (cruiser) return <CruiserArticle page={cruiser} onShips={() => setView("ships")} />;
  if (view === "ships") return <PlayableShips onOpen={setView} onTitle={() => setView(null)} />;
  return (
    <section className="title-shot">
      <div
        className="title-frame"
        onClick={() => {
          if (view === "stats" || view === "options" || view === "credits") setView(null);
        }}
      >
        <PixelMenu continueReady={saveReady} />
        {TITLE_MENU_ART.map((item) => (
          <button
            key={item.id}
            type="button"
            className="menu-hit"
            aria-label={item.label}
            disabled={item.id === "continue" && !saveReady}
            style={{ top: item.top, height: item.height, right: item.right, width: item.width }}
            onClick={(e) => {
              e.stopPropagation();
              unlockAudio();
              if (item.id === "continue") {
                if (useGame.getState().continueRun()) setSaveReady(true);
                return;
              }
              if (item.id === "new") {
                setView("hangar");
                return;
              }
              if (item.id === "tutorial") {
                setView("help");
                return;
              }
              if (item.id === "quit") {
                setView(null);
                return;
              }
              setView(view === item.id ? null : item.id);
            }}
          />
        ))}
        {view === "credits" ? <TitlePanel /> : null}
        {view === "stats" ? <AchievementsScreen game={null} onClose={() => setView(null)} /> : null}
        {view === "options" ? <ControlsScreen onClose={() => setView(null)} /> : null}
        {view === "help" ? (
          <HelpScreen
            onContinue={() => {
              useGame.getState().newRun("kestrel-a");
              useGame.getState().act((g) => {
                g.training = true;
              });
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

function TitlePanel() {
  return (
    <div className="title-panel" onClick={(e) => e.stopPropagation()}>
      <p>CREDITS</p>
      <p>© 2012 Subset Games</p>
      <p>v. 1.01</p>
    </div>
  );
}

/** Wiki page "Ship", section "Playable ships" and section "Layouts". */
function PlayableShips({ onOpen, onTitle }: { onOpen: (page: string) => void; onTitle: () => void }) {
  const ships = PLAYABLE_SHIPS;
  return (
    <article className="wiki-doc">
      <button type="button" className="title-figure-hit" aria-label="FTL" onClick={onTitle}>
        <PixelTitle />
      </button>
      <h1>{ships.heading}</h1>
      {ships.see.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <p>{ships.lead}</p>
      <table className="ship-table">
        <tbody>
          {ships.rows.map((row) => (
            <tr key={row[0].page}>
              {row.map((cell) => (
                <td key={cell.page}>
                  <button
                    type="button"
                    onClick={() => {
                      unlockAudio();
                      onOpen(cell.page);
                    }}
                  >
                    <PixelHull kind={classOfPage(cell.page)} />
                    <span>{cell.page}</span>
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>{ships.note}</p>
      <h2>{ships.layoutsHeading}</h2>
      <p>{ships.layoutsLead}</p>
      <ul>
        {ships.layouts.map((line) => (
          <li key={line.text} style={{ marginLeft: `${(line.depth - 1) * 1.15}em` }}>
            {line.text}
          </li>
        ))}
      </ul>
      <figure>
        <UnlockDiagram />
        <figcaption>{ships.diagram.caption}</figcaption>
      </figure>
    </article>
  );
}

/** One cruiser article. "Playable ships" is the parent section. The default-name line starts that layout. */
function CruiserArticle({
  page,
  onShips,
}: {
  page: { page: string; layouts: CruiserLayout[] };
  onShips: () => void;
}) {
  return (
    <article className="wiki-doc">
      <button type="button" className="wiki-parent" onClick={onShips}>
        {PLAYABLE_SHIPS.heading}
      </button>
      <h1>{page.page}</h1>
      {page.layouts.map((layout) => (
        <section key={layout.id} className="layout-block">
          <h2>{layout.heading}</h2>
          <WikiLines
            lines={layout.lines}
            onRun={() => {
              unlockAudio();
              useGame.getState().newRun(layout.id);
            }}
          />
          <PixelLayout id={layout.id} />
        </section>
      ))}
    </article>
  );
}

function isDefaultName(text: string) {
  return text.startsWith("Default name:") || text.startsWith("Default Name:");
}

function WikiLines({ lines, onRun }: { lines: WikiLine[]; onRun: () => void }) {
  const blocks: ReactNode[] = [];
  let list: WikiLine[] = [];
  const flush = () => {
    if (!list.length) return;
    const items = list;
    list = [];
    blocks.push(
      <ul key={blocks.length}>
        {items.map((line, i) => (
          <li key={i} style={{ marginLeft: `${(line.depth - 1) * 1.15}em` }}>
            {isDefaultName(line.text) ? (
              <button type="button" onClick={onRun}>
                {line.text}
              </button>
            ) : (
              line.text
            )}
          </li>
        ))}
      </ul>,
    );
  };
  for (const line of lines) {
    if (line.depth === 0) {
      flush();
      blocks.push(<p key={blocks.length}>{line.text}</p>);
    } else {
      list.push(line);
    }
  }
  flush();
  return <>{blocks}</>;
}

function mapX(col: number) {
  return col === 0 ? 40 : 210 + (col - 1) * 82;
}

function mapY(row: number) {
  return 44 + row * 96;
}

/** BEACON MAP: File:3 store.jpg. STORE and EXIT labels, SECTOR, CANCEL. */
function MapScreen({ game }: { game: Game }) {
  const here = game.beacons.find((b) => b.id === game.here);
  const maxCol = game.beacons.reduce((m, b) => Math.max(m, b.col), 0);
  const w = mapX(maxCol) + 40;
  const h = mapY(2) + 36;
  const pct = (n: number, total: number) => `${(n / total) * 100}%`;
  const named = SECTOR_NAMES.includes(game.sectorName) ? "" : game.sectorName;
  return (
    <section className="sector-map beacon-map">
      <h2>BEACON MAP</h2>
      <div className="sector-board">
        <div className="sector-plot" style={{ aspectRatio: `${w} / ${h}`, ["--aspect" as string]: w / h }}>
          <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {game.beacons.flatMap((b) =>
              b.links
                .filter((id) => id > b.id)
                .map((id) => {
                  const other = game.beacons.find((n) => n.id === id);
                  if (!other) return null;
                  return (
                    <line
                      key={`${b.id}-${id}`}
                      x1={mapX(b.col)}
                      y1={mapY(b.row)}
                      x2={mapX(other.col)}
                      y2={mapY(other.row)}
                      stroke="#f4f1ea"
                      strokeWidth="2.4"
                    />
                  );
                }),
            )}
            {here ? (
              <g transform={`translate(${mapX(here.col)} ${mapY(here.row)})`}>
                <path fill="#d5f1ff" d="M -10 -5 H 2 L 6 -2.6 V 2.6 L 2 5 H -10 Z" />
                <path fill="#f7fdff" d="M 6 -2.4 L 13 0 L 6 2.4 Z" />
              </g>
            ) : null}
          </svg>
          {game.beacons.map((b) => {
            if (b.id === game.here) return null;
            const linked = here?.links.includes(b.id) ?? false;
            const swallowed = b.col < game.fleet;
            const tag = b.kind === "store" ? "STORE" : b.kind === "exit" ? "EXIT" : "";
            return (
              <button
                key={b.id}
                type="button"
                className={`beacon${linked ? " is-linked" : ""}${swallowed ? " is-over" : ""}${tag ? ` is-${tag.toLowerCase()}` : ""}`}
                style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}
                disabled={!linked || (game.phase === "combat" && game.flee < 1)}
                aria-label={tag || "Beacon"}
                onClick={() => act((g) => commitJump(g, b.id))}
              />
            );
          })}
          {game.beacons.map((b) => {
            const tag = b.kind === "store" ? "STORE" : b.kind === "exit" ? "EXIT" : "";
            if (!tag || b.id === game.here) return null;
            return (
              <span key={`tag-${b.id}`} className="jump-tag" style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}>
                {tag}
              </span>
            );
          })}
        </div>
      </div>
      <div className="sector-key beacon-foot">
        <span>SECTOR {game.sector}</span>
        {named ? <span>{named}</span> : null}
        {game.picking ? (
          <button type="button" onClick={() => act((g) => { g.picking = false; })}>
            CANCEL
          </button>
        ) : null}
      </div>
    </section>
  );
}

/** SECTOR MAP: File:Sector Map.png. Civilian, Hostile, Nebula, numbered next sectors. */
function SectorChart({ game }: { game: Game }) {
  const nodes = game.route ?? [];
  const maxCol = nodes.reduce((m, n) => Math.max(m, n.col), 0);
  const w = mapX(maxCol) + 70;
  const h = mapY(2) + 36;
  const here = nodes.find((n) => n.id === game.routeHere);
  const next = nodes.filter((n) => here?.links.includes(n.id));
  const pct = (n: number, total: number) => `${(n / total) * 100}%`;
  return (
    <section className="sector-map">
      <h2>SECTOR MAP</h2>
      <div className="sector-board">
        <div className="sector-plot" style={{ aspectRatio: `${w} / ${h}`, ["--aspect" as string]: w / h }}>
          <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
            {nodes.flatMap((b) =>
              b.links.map((id) => {
                const other = nodes.find((n) => n.id === id);
                if (!other || id < b.id) return null;
                return (
                  <line
                    key={`${b.id}-${id}`}
                    x1={mapX(b.col)}
                    y1={mapY(b.row)}
                    x2={mapX(other.col)}
                    y2={mapY(other.row)}
                    stroke="#f4f1ea"
                    strokeWidth="2.4"
                  />
                );
              }),
            )}
            {here ? (
              <g transform={`translate(${mapX(here.col)} ${mapY(here.row)})`}>
                <path fill="#d5f1ff" d="M -10 -5 H 2 L 6 -2.6 V 2.6 L 2 5 H -10 Z" />
                <path fill="#f7fdff" d="M 6 -2.4 L 13 0 L 6 2.4 Z" />
              </g>
            ) : null}
          </svg>
          {nodes.map((b) => {
            if (b.id === game.routeHere) return null;
            const linked = here?.links.includes(b.id) ?? false;
            return (
              <button
                key={b.id}
                type="button"
                className={`beacon is-${sectorTone(b.group)}${linked ? " is-linked" : ""}`}
                style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}
                disabled={!linked}
                aria-label={b.name}
                onClick={() => act((g) => chooseSector(g, b.id))}
              />
            );
          })}
          {next.map((b, i) => (
            <span key={`tag-${b.id}`} className="jump-tag" style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}>
              {i + 1}. {b.name}
            </span>
          ))}
        </div>
      </div>
      <div className="sector-key">
        <span>
          <i className="dot dot-civilian" />
          Civilian
        </span>
        <span>
          <i className="dot dot-hostile" />
          Hostile
        </span>
        <span>
          <i className="dot dot-nebula" />
          Nebula
        </span>
      </div>
      <div className="sector-picks">
        {next.map((b, i) => (
          <button key={b.id} type="button" onClick={() => act((g) => chooseSector(g, b.id))}>
            {i + 1}. {b.name}
          </button>
        ))}
      </div>
    </section>
  );
}

/** INVENTED help text. These sentences are not from a wiki page. */
function Manual({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay">
      <article className="sheet manual ftl-sheet">
        <p className="kicker">Manual</p>
        <div className="manual-body">
          <h3>Getting out</h3>
          <ul>
            <li>Fuel starts at 16. Every jump, including a retreat, burns 1. A store sells fuel. Scrap starts at 10.</li>
            <li>The hangar launches the cruiser layouts whose wiki pages listed a loadout. Pictures from those pages are not used.</li>
            <li>Sector 8 is the Flagship. It moves every two of your jumps.</li>
            <li>Space pauses. Number keys arm a weapon, or pick a numbered choice. M mutes. Click a weapon's number to give its power back.</li>
          </ul>
        </div>
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}

/** INVENTED sheet buttons and the reactor blurb. Kit labels are wiki system names. */
function ShipSheet({ game }: { game: Game }) {
  const free = sparePower(game.player);
  return (
    <div className="overlay">
      <article className="sheet ftl-sheet">
        <p className="kicker">{game.player.name}</p>
        <p className="mini">Power {free} free</p>
        <div className="title-actions">
          <button type="button" className="btn-ghost" onClick={() => act((g) => { g.shipSheet = false; })}>
            Close
          </button>
          <button
            type="button"
            className="btn-ghost"
            aria-label={game.muted ? "Unmute" : "Mute"}
            onClick={() =>
              act((g) => {
                g.muted = !g.muted;
                setMuted(g.muted);
              })
            }
          >
            {game.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {game.muted ? "Unmute" : "Mute"}
          </button>
        </div>
        <div className="crew-line">
          {game.crew
            .filter((c) => c.side === "player" && c.hp > 0)
            .map((c) => (
              <span key={c.id}>
                <i className={`token tone-${c.tone}`}>{c.name.slice(0, 1)}</i>
                {c.name} {c.hp} hp
              </span>
            ))}
        </div>
        <button type="button" className="btn-ghost" onClick={() => act((g) => patchAll(g))}>
          Patch hull ({hullRepairPerPoint(game.sector)} scrap a point)
        </button>
        <div className="systems">
          <PowerRow
            name={`Reactor · ${game.player.reactor}`}
            blurb="One more bar in the pool."
            level={game.player.reactor}
            power={game.player.reactor}
            max={game.player.reactor}
            cost={upgradeCost("reactor", game.player.reactor)}
            onUp={() => act((g) => upgrade(g, "reactor"))}
            onDown={null}
            onPlus={null}
          />
          {SYS_ORDER.map((id) => {
            const sys = game.player.systems[id];
            const Icon = ICONS[id];
            const cost = upgradeCost(id, sys.level);
            return (
              <PowerRow
                key={id}
                name={`${SYS_LABEL[id]} · ${sys.level}`}
                blurb={upgradeBlurb(id, sys.level)}
                level={sys.level}
                power={isMain(id) ? sys.power : sys.level}
                max={Math.max(0, sys.level - sys.damage - sys.ion.length)}
                cost={cost}
                icon={Icon}
                onUp={cost != null ? () => act((g) => upgrade(g, id)) : null}
                onDown={isMain(id) ? () => act((g) => powerDown(g, id)) : null}
                onPlus={isMain(id) ? () => act((g) => powerUp(g, id)) : null}
              />
            );
          })}
        </div>
        <div className="systems">
          {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
            const kit = game.player.kits[id];
            if (!kit) return null;
            return (
              <p key={id} className="power-row">
                <span className="power-name">
                  {KIT_LABEL[id]} · {kit.level}
                </span>
                <span className="mini">{kit.power > 0 ? `${kit.power} power` : "unpowered"}</span>
              </p>
            );
          })}
          {game.augments.map((id) => (
            <p key={id} className="mini">
              {CATALOG.find((row) => row.id === id)?.name ?? id}
            </p>
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={() => act((g) => installCell(g))}>
          Buy Backup Battery
        </button>
        <button type="button" className="btn-ghost" onClick={() => act((g) => startCell(g))}>
          Start battery
        </button>
      </article>
    </div>
  );
}

/** "Less" and "More" are INVENTED aria labels. */
function PowerRow({
  name,
  blurb,
  power,
  max,
  cost,
  onUp,
  onDown,
  onPlus,
}: {
  name: string;
  blurb: string;
  level: number;
  power: number;
  max: number;
  cost: number | null;
  icon?: typeof Shield;
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onPlus: (() => void) | null;
}) {
  return (
    <div className="power-row">
      <span className="power-name">{name}</span>
      <span className="bars" aria-hidden="true">
        {Array.from({ length: Math.max(max, power, 1) }, (_, i) => (
          <i key={i} className={i < power ? "on" : ""} />
        ))}
      </span>
      <span className="mini">{blurb}</span>
      <span className="mode-row">
        {onDown ? (
          <button type="button" className="icon-btn" aria-label={`Less ${name}`} onClick={onDown}>
            <Minus size={14} />
          </button>
        ) : null}
        {onPlus ? (
          <button type="button" className="icon-btn" aria-label={`More ${name}`} onClick={onPlus}>
            <Plus size={14} />
          </button>
        ) : null}
        {onUp ? (
          <button type="button" className="text-btn" onClick={onUp}>
            {cost}
          </button>
        ) : null}
      </span>
    </div>
  );
}
