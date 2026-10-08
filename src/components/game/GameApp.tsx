import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import {
  SECTOR_NAMES,
  SYS_LABEL,
  WEAPONS,
  hullRepairPerPoint,
  upgradeBlurb,
  upgradeCost,
} from "@/game/content";
import { CATALOG, scanMark } from "@/game/extras/augments";
import { navAllows } from "@/game/wiki/cited-nav";
import { batteryBarsOn, batterySpareBars, cellBonus, installCell, startCell, upgradeCell } from "@/game/extras/cell";
import { recallSling, sendSling, shipInDanger, toggleSlingPower, upgradeSling } from "@/game/extras/sling";
import { depowerDrone, reorderDroneSlots, roomDroneHp } from "@/game/extras/swarm";
import { lowerLancePower, raiseLancePower } from "@/game/extras/lance";
import { lowerFlakPower, raiseFlakPower } from "@/game/extras/flakart";
import { Hangar } from "./Hangar";
import { PixelHull, PixelLayout, PixelMenu, PixelTitle, TITLE_MENU_ART, UnlockDiagram, classOfPage } from "./PixelArt";
import { PLAYABLE_SHIPS, cruiserPage, type CruiserLayout, type WikiLine } from "@/game/wiki/layout-pages";
import { startVeil, toggleVeilPower, upgradeVeil } from "@/game/extras/veil";
import { startLeash, toggleLeashPower, upgradeLeash } from "@/game/extras/leash";
import { enemyCloneQueue } from "@/game/extras/cradle";
import { sensorSystemDetail } from "@/game/extras/sensors";
import { shipSight } from "@/game/extras/slug-sight";
// @agent:combat-ui. Read-only combat views (clone queue, hacked kit) and the cloak lockout.
import { hackedPlayerKit, playerCloneQueue } from "@/game/ui-views";
import {
  armSpike,
  cancelQueuedSpike,
  hackVision,
  launchSpike,
  lowerSpikePower,
  playerCloakHacked,
  playerHackView,
  queueSpike,
  playerSensorLevel,
  raiseSpikePower,
  spikeAimId,
  spikeRoomTargetable,
} from "@/game/extras/spike";
import { create } from "zustand";
// @agent:surrender. The surrender card lists the offered cargo.
import { surrenderOfferView } from "@/game/wiki/surrender";
import { artilleryView } from "@/game/wiki/flagship-systems";
import {
  aim,
  armWeapon,
  cancelTargeting,
  chargerCap,
  choiceDisabled,
  choose,
  chooseSector,
  commitJump,
  continueReward,
  depowerWeapon,
  doorLabel,
  enemyEscapeView,
  evasionPercent,
  ftlSeconds,
  hasSave,
  isMain,
  bars,
  maxBubbles,
  zoltanBars,
  closeAllDoors,
  lockdown,
  lockdownSelected,
  openAllDoors,
  orderCrew,
  patchAll,
  powerDown,
  powerMask,
  powerUp,
  reorderWeapons,
  reverseSlotAuto,
  saveGame,
  selectCrew,
  slotAutofire,
  sparePower,
  toggleAutoAll,
  toggleDoor,
  togglePause,
  waitHere,
  upgrade,
  weaponChargeShown,
  weaponSlotCap,
  weaponsPowerLocked,
} from "@/game/sim";
import { useGame } from "@/game/store";
import { isUnlocked } from "@/game/unlock-store"; // @agent:unlocks
import type { BeamLine, Crew, Game, KitId, SysId } from "@/game/types";
import { DRONE_LOOKS, droneKeyOf } from "@/game/gear-look";
import { CombatFx } from "./CombatFx";
import { ShadeFx } from "./ShadeFx";
import { FullscreenButton } from "./FullscreenButton";
import { CrewFace } from "./CrewSprite";
import { DroneArt, WeaponArt } from "./GearArt";
import { PixelIcon } from "./PixelIcon";
import type { IconName } from "@/game/icons";
import { Screen } from "./Screen";
import { ShipView, type AimMark, type HackMark } from "./ShipView";
import { AchievementsScreen, ControlsScreen, HelpScreen, StoreBoard, Verdict, sectorTone } from "./WikiViews";

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

/**
 * @agent:hack-ui. Hack targeting mode. INVENTED UI-only flag (not saved with the run), the hacking twin of
 * Game.targeting. Hacking wiki, "Choosing your hacking target": "Choosing a hacking target works much the same as
 * targeting your weapons. With power in the hacking system, click on the hacking drone icon, then click an enemy
 * system room."
 */
const useHackAim = create<{ on: boolean }>(() => ({ on: false }));
const useSlingAim = create<{ on: boolean }>(() => ({ on: false }));
const useLeashAim = create<{ on: boolean }>(() => ({ on: false }));

function setHackAim(on: boolean) {
  if (useHackAim.getState().on !== on) useHackAim.setState({ on });
}

function setSlingAim(on: boolean) {
  if (useSlingAim.getState().on !== on) useSlingAim.setState({ on });
}

function setLeashAim(on: boolean) {
  if (useLeashAim.getState().on !== on) useLeashAim.setState({ on });
}

function clearAims() {
  setHackAim(false);
  setSlingAim(false);
  setLeashAim(false);
}

/**
 * @agent:hack-ui. The hacking drone icon (dock orb, or H). Hacking wiki, "Choosing your hacking target":
 * - no drone yet: enter hack targeting; "you can cancel the hack launch by clicking on the drone icon again".
 * - drone attached: start the hacking pulse ("Overview", Hacking pulse: 4 / 7 / 10 seconds, then "20 seconds cooldown
 *   before activating the next pulse"). spike.ts launchSpike re-pulses a latched drone without a new part.
 */
function hackIconClick() {
  const g = useGame.getState().game;
  const view = playerHackView(g);
  if (!view) return;
  if (useHackAim.getState().on) {
    setHackAim(false);
    return;
  }
  // @agent:hack-rules. "If you change your mind while still paused, you can cancel the hack launch by clicking on the
  // drone icon again." (spike.ts queueSpike / cancelQueuedSpike)
  if (view.state === "queued") {
    act((game) => cancelQueuedSpike(game));
    return;
  }
  if (view.latched) {
    if (view.state === "latched") act((game) => launchSpike(game));
    return;
  }
  if (view.state !== "ready") return;
  act((game) => cancelTargeting(game));
  setSlingAim(false);
  setLeashAim(false);
  setHackAim(true);
}

/** Crew Teleporter, "Overview": send onto a room, or bring the crew back when they are already aboard. */
function slingIconClick() {
  const g = useGame.getState().game;
  const away = g.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
  if (away) {
    setSlingAim(false);
    act((game) => recallSling(game));
    return;
  }
  if (useSlingAim.getState().on) {
    setSlingAim(false);
    return;
  }
  act((game) => cancelTargeting(game));
  setHackAim(false);
  setLeashAim(false);
  setSlingAim(true);
}

function slingRoomClick(roomId: string) {
  act((game) => sendSling(game, roomId));
  setSlingAim(false);
}

/** Mind Control, "Overview": click the system, then an enemy crewmember. Click again to leave aim. */
function leashIconClick() {
  if (useLeashAim.getState().on) {
    setLeashAim(false);
    return;
  }
  act((game) => cancelTargeting(game));
  setHackAim(false);
  setSlingAim(false);
  setLeashAim(true);
}

/**
 * @agent:hack-ui. A room click in hack targeting: aim the drone at that room's system and launch it (one drone part).
 * Rooms with no hackable system keep the mode on, like a miss-click while aiming a gun.
 */
function hackRoomClick(roomId: string) {
  const g = useGame.getState().game;
  const id = spikeAimId(g, roomId);
  if (!id) return;
  act((game) => {
    // @agent:hack-rules. "Once the game is unpaused, this choice is permanent": while paused the pick only queues.
    // A flagship artillery room aims at that room (spike.ts spikeAimId), not every gun.
    if (game.paused) queueSpike(game, id);
    else if (armSpike(game, id)) launchSpike(game);
  });
  setHackAim(false);
}

/** @agent:hack-ui. Short status for the hacking orb, by spike.ts playerHackView state. */
function hackStatus(view: NonNullable<ReturnType<typeof playerHackView>>, aiming: boolean): string {
  if (aiming) return "PICK A SYSTEM";
  switch (view.state) {
    case "pulse":
      return `PULSE ${view.left.toFixed(1)}s`;
    case "cooldown":
      return `COOLDOWN ${Math.ceil(view.cool)}s`;
    case "latched":
      return "PULSE READY";
    case "queued":
      return "LAUNCH ON UNPAUSE";
    case "flying":
      // @agent:hack-rules. Hacking wiki: de-powering "freezes the hacking drone in place"; Anti-Combat Drones stun it.
      if (view.stunned) return "DRONE STUNNED";
      if (view.power < 1) return "DRONE HELD";
      return `DRONE INBOUND ${Math.round(view.progress * 100)}%`;
    case "nopower":
      return "NO POWER";
    case "noparts":
      return "NO DRONE PARTS";
    case "zoltan":
      return "ZOLTAN SHIELD UP";
    case "cloaked":
      return "TARGET CLOAKED";
    case "ready":
      return "LAUNCH READY";
    default:
      return view.latched ? "DRONE ATTACHED" : "STANDBY";
  }
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
      // @agent:hack-ui. INVENTED key: H acts as the hacking drone icon (aim / cancel, or pulse once attached).
      if (e.code === "KeyH" && plain && g.phase === "combat") {
        e.preventDefault();
        hackIconClick();
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
        setHackAim(false);
        act((game) => armWeapon(game, weapon.uid));
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    const w = window as unknown as {
      __stl?: { game: () => Game; act: (fn: (g: Game) => void) => void };
    };
    w.__stl = {
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
    <Screen>
      <div className={game.phase === "title" ? "deck" : "deck play-root"}>
        {game.phase === "title" ? <TitleScreen /> : <PlayFrame game={game} shake={reduced ? 0 : game.trauma * game.trauma} />}
        {game.manual ? <Manual onClose={() => act((g) => { g.manual = false; })} /> : null}
        {game.shipSheet ? <ShipSheet game={game} /> : null}
      </div>
    </Screen>
  );
}

const MAIN_BARS: SysId[] = ["shields", "engines", "medbay", "oxygen", "weapons"];

/** INVENTED: the combat, event, and pause screens are the layout guide. No wiki page specifies this chrome. */
function PlayFrame({ game, shake }: { game: Game; shake: number }) {
  const sector = game.sectorMap && game.phase !== "victory" && game.phase !== "defeat";
  // File:NO_FUEL.png and File:3_store.jpg: the beacon chart is a panel over the ship, opened with JUMP.
  const chart = !sector && game.picking && (game.phase === "map" || game.phase === "combat" || game.phase === "event");
  const showTarget = !!game.enemy && !chart && (game.phase === "combat" || game.phase === "event");
  const ox = shake ? Math.sin(game.time * 40) * 7 * shake : 0;
  const oy = shake ? Math.cos(game.time * 33) * 5 * shake : 0;
  // @agent:hack-ui. Hack targeting only lasts while a launch is possible (fight over, power pulled, part spent...).
  const hackOn = useHackAim((s) => s.on);
  const slingOn = useSlingAim((s) => s.on);
  const leashOn = useLeashAim((s) => s.on);
  const hackReady = playerHackView(game)?.state === "ready";
  useEffect(() => {
    if (hackOn && !hackReady) setHackAim(false);
    if ((slingOn || leashOn) && !game.enemy) {
      setSlingAim(false);
      setLeashAim(false);
    }
  }, [hackOn, hackReady, slingOn, leashOn, game.enemy]);
  const hackAiming = hackOn && hackReady;
  return (
    <div
      className={`play${showTarget ? "" : " no-target"}${game.targeting || hackAiming || slingOn || leashOn ? " is-targeting" : ""}${hackAiming ? " is-hack-targeting" : ""}${slingOn ? " is-sling-targeting" : ""}${leashOn ? " is-leash-targeting" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        // Hacking wiki: hack targeting "works much the same as targeting your weapons"; right click cancels both.
        clearAims();
        act((g) => cancelTargeting(g));
      }}
    >
      <Hud game={game} />
      <CombatFx />
      <ShadeFx />
      <CrewRail game={game} />
      <div className="stage-slot">
        {sector ? (
          <SectorChart game={game} />
        ) : (
          <ShipStage game={game} shake={shake ? { transform: `translate(${ox}px, ${oy}px)` } : undefined} />
        )}
        {chart ? <MapScreen game={game} /> : null}
        {game.paused && game.phase === "combat" ? <PauseStamp /> : null}
      </div>
      {showTarget && game.enemy ? <TargetPanel game={game} hackAiming={hackAiming} slingAiming={slingOn} leashAiming={leashOn} /> : null}
      <Dock game={game} hackAiming={hackAiming} />
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
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player, zoltanBars(game.crew, game.player, "player", "shields")), bubbles, 1);
  const spool = ftlSeconds(game, game.player);
  const charging = game.phase === "combat" && game.flee < 1;
  const ready = game.phase === "combat" && game.flee >= 1 && !game.picking;
  // Environmental Hazards / Ship / Backup Battery: IN DANGER keeps the ship info screen closed.
  const infoLocked = shipInDanger(game);
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
          <div className={`scrap-box${game.scrap < 1 ? " is-empty" : ""}`} aria-label={`${game.scrap} scrap`}>
            <PixelIcon name="scrap" size={20} />
            <b>{game.scrap}</b>
          </div>
        </div>
        <div className="store-row">
          <span className="hud-word hud-shields">SHIELDS</span>
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
          <span className={`count-chip${game.fuel < 1 ? " is-empty" : ""}`} aria-label={`${game.fuel} fuel`} title="Fuel">
            <PixelIcon name="fuel" />
            {game.fuel}
          </span>
          <span className={`count-chip${game.missiles < 1 ? " is-empty" : ""}`} aria-label={`${game.missiles} missiles`} title="Missiles">
            <PixelIcon name="missile" />
            {game.missiles}
          </span>
          <span className={`count-chip${game.player.parts < 1 ? " is-empty" : ""}`} aria-label={`${game.player.parts} drone parts`} title="Drone parts">
            <PixelIcon name="parts" />
            {game.player.parts}
          </span>
        </div>
      </div>
      <div className="hud-right">
        <button
          type="button"
          className={`ftl-drive${charging ? " is-charging" : " is-ready"}`}
          disabled={game.phase === "combat" && game.flee < 1}
          title={spool == null ? "FTL needs a pilot or engines." : `About ${Math.round(spool)} seconds at this engine power. Fuel ${game.fuel}.`}
          onClick={() => {
            if (game.phase === "map" || game.picking) {
              act((g) => {
                g.picking = game.phase === "map" ? !g.picking : false;
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
          <span className="ftl-kicker">FTL Drive</span>
          {charging ? null : <span>JUMP</span>}
          <span className="ftl-meter">
            <i style={{ width: `${Math.round((game.phase === "combat" ? game.flee : 1) * 100)}%` }} />
          </span>
          <em>{charging ? "CHARGING" : "READY"}</em>
        </button>
        {shipInDanger(game) || game.pulsarWarned ? (
          <div className="hud-alerts">
            {shipInDanger(game) ? <p className="danger-mark" role="status">DANGER!</p> : null}
            {game.pulsarWarned ? <p className="hazard-mark" role="status">ION PULSE IMMINENT!</p> : null}
          </div>
        ) : null}
        <button
          type="button"
          className="frame-btn"
          aria-label={game.picking ? "Back to the ship" : "Ship"}
          title={infoLocked && !game.picking ? "In danger" : undefined}
          disabled={infoLocked && !game.picking}
          onClick={() =>
            act((g) => {
              if (g.picking) g.picking = false;
              else if (!shipInDanger(g)) g.shipSheet = true;
            })
          }
        >
          <PixelIcon name="ship" size={20} />
        </button>
        <button
          type="button"
          className="frame-btn"
          aria-label="Upgrades"
          title={infoLocked ? "In danger" : undefined}
          disabled={infoLocked}
          onClick={() =>
            act((g) => {
              if (!shipInDanger(g)) g.shipSheet = true;
            })
          }
        >
          <PixelIcon name="upgrade" size={20} />
        </button>
        <FullscreenButton />
      </div>
    </header>
  );
}

function CrewRail({ game }: { game: Game }) {
  const crew = game.crew.filter((c) => c.side === "player" && c.hp > 0);
  const air = shipOxygen(game.player);
  const clones = playerCloneQueue(game);
  return (
    <aside className="crew-rail">
      <div className="air-readout">
        <span title="Evasion">
          <PixelIcon name="evade" />
          EVADE {evasionPercent(game, game.player, "player")}%
        </span>
        <span title="Oxygen">
          <PixelIcon name="oxygen" />
          OXYGEN {air}%
        </span>
      </div>
      {crew.map((c) => (
        <div key={c.id} className={`crew-card${c.id === game.selected ? " is-selected" : ""}${(c.leashed ?? 0) > 0 ? " is-leashed" : ""}`}>
          <button type="button" className="crew-card-hit" onClick={() => act((g) => selectCrew(g, c.id))}>
            <Portrait crew={c} />
            <span>
              <strong>{c.name}</strong>
              <i className="hp">
                <b style={{ width: `${Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100))}%` }} />
              </i>
            </span>
          </button>
          {(c.leashed ?? 0) > 0 ? (
            <button type="button" className="lock-pip" aria-label="Free from mind control" onClick={() => act((g) => startLeash(g, c.id))}>
              MC
            </button>
          ) : null}
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
      {/* Clone Bay, Overview: "Portraits of the crew in the cloning queue are shown above the system icon. Up to 3
          portraits are shown; ... the 3rd portrait is substituted by the "+number" of other crew in the queue." Shown
          here under the live crew, head of the queue first. */}
      {clones ? (
        <div className="clone-queue" role="status" title="Clone Bay queue: first in line is revived first">
          <p className="clone-queue-head">
            <PixelIcon name="cradle" size={16} />
            CLONING · {clones.seconds}s
          </p>
          <div className="clone-queue-faces">
            {clones.shown.map((c) => (
              <span key={c.id} className="clone-face" title={c.name}>
                <Portrait crew={c} />
              </span>
            ))}
            {clones.more > 0 ? <span className="clone-more">+{clones.more}</span> : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function bombAiming(game: Game): boolean {
  if (!game.targeting) return false;
  const w = game.player.weapons.find((item) => item.uid === game.armed);
  return WEAPONS[w?.defId ?? ""]?.kind === "bomb";
}

function ShipStage({ game, shake }: { game: Game; shake?: { transform: string } }) {
  const intruders = game.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player, zoltanBars(game.crew, game.player, "player", "shields")), 1);
  const sight = shipSight(game);
  return (
    <div className="sky" style={shake}>
      <div className="planet" />
      <div className="shield-aura" style={{ opacity: 0.18 + 0.55 * (bubbles / cap) }} />
      {(game.player.zoltan ?? 0) > 0 ? <div className="shield-aura zoltan-aura" /> : null}
      <ShipView
        ship={game.player}
        plateId={game.hullId}
        faction={(game.hullId ?? "kestrel").split("-")[0]}
        facing="right"
        crew={game.crew}
        aboard="player"
        showCrew
        seen={(id) => sight.interior("player", id)}
        crewLit={(c) => sight.showCrew(c)}
        selectedId={game.selected}
        ventMode={game.mode === "vent"}
        targetable={bombAiming(game)}
        onRoom={(id) => {
          if (game.selected) act((g) => orderCrew(g, game.selected!, id));
          else if (game.targeting) act((g) => aim(g, id));
        }}
        onCrew={(id) => act((g) => selectCrew(g, id))}
        aims={aimMarks(game)}
        droneHp={roomDroneHp(game.player, game)}
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

/** Queued player beam swipes. A powered gun keeps the segment it will fire. */
function beamLinesOf(game: Game): BeamLine[] {
  const mask = powerMask(game.player, zoltanBars(game.crew, game.player, "player", "weapons"));
  return game.player.weapons.flatMap((w, i) => (w.beamLine && mask[i] ? [w.beamLine] : []));
}

/** Queued rooms for powered player guns. Numbers match the dock slots (1–4). */
function aimMarks(game: Game): AimMark[] {
  const mask = powerMask(game.player, zoltanBars(game.crew, game.player, "player", "weapons"));
  return game.player.weapons.flatMap((w, i) => {
    if (!w.target || !mask[i]) return [];
    const state = slotAutofire(game, w) ? "auto" : w.charge >= 0.9 ? "ready" : "charging";
    return [{ room: w.target, slot: i + 1, state } as AimMark];
  });
}

/**
 * @agent:hack-ui. The player's hacking reticle on the enemy hull: the latched drone, or the room being aimed at.
 * Hacking wiki, "Overview" (passive effects): the drone stays on that system; the pulse marks it as running.
 */
function hackMarkOf(game: Game): HackMark | null {
  const view = playerHackView(game);
  if (!view || !view.room || !game.enemy) return null;
  if (view.state === "pulse") return { room: view.room, phase: "pulse", left: view.left };
  if (view.latched) return { room: view.room, phase: "latched", left: 0 };
  // @agent:hack-rules. A launch queued while paused, or a drone still in flight: the reticle sits on the aim.
  if (view.state === "queued" || view.state === "flying") return { room: view.room, phase: "aim", left: 0 };
  return null;
}

function TargetPanel({ game, hackAiming, slingAiming, leashAiming }: { game: Game; hackAiming: boolean; slingAiming: boolean; leashAiming: boolean }) {
  const enemy = game.enemy;
  if (!enemy) return null;
  const escape = enemyEscapeView(game);
  // @agent:hack-ui. Hacking wiki, "Overview" (passive effects): "Room vision and max-level Sensors information on the
  // system." "If the targeted system is Piloting or Engines, the ship name on the top right corner is replaced with
  // text that states the current Evasion of the enemy ship" (only "if the Hacking system is powered": hackVision).
  const vision = hackVision(game);
  const hack = playerHackView(game);
  const hackMark = hackMarkOf(game);
  // Cloaking: "When an enemy ship is cloaked, you lose vision of its interior unless your crew… is aboard".
  const veil = enemy.kits.veil;
  const ownAboard = game.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
  const cloaked = !!veil?.on && veil.left > 0;
  const sight = shipSight(game);
  // Clone Bay, Overview: "Portraits of the crew in the cloning queue are shown above the system icon." Shown here as a
  // countdown on the head clone plus the queue size. Hidden while cloaked, like the interior.
  const clones = cloaked && !ownAboard ? null : enemyCloneQueue(game);
  return (
    <aside className="target-panel">
      <div className="target-head">
        <span className="target-flag">TARGET</span>
        <div>
          {vision?.evasion != null ? (
            <p className="hack-evasion" title={`Hacking drone on ${hack?.label ?? vision.system}`}>
              Evasion: {vision.evasion}%
            </p>
          ) : (
            <p>Class: {enemy.name}</p>
          )}
          <p>Relationship: Hostile</p>
          {escape ? (
            <p className={`escape-line${escape.stalled ? " is-stalled" : ""}`} role="status">
              {escape.stalled ? "FTL STALLED" : `FTL CHARGING · ${escape.left}s`}
            </p>
          ) : null}
          {hack && (hack.latched || hack.state === "pulse") && hack.label ? (
            <p className={`hack-line${hack.state === "pulse" ? " is-pulse" : ""}`} role="status">
              HACKED · {hack.label.toUpperCase()}
              {hack.state === "pulse" ? ` · ${Math.ceil(hack.left)}s` : ""}
            </p>
          ) : null}
          {clones ? (
            <p className={`clone-line${clones.offline ? " is-offline" : ""}`} role="status">
              {clones.offline ? "CLONING HALTED" : `CLONING · ${clones.seconds}s`}
              {clones.count > 1 ? ` +${clones.count - 1}` : ""}
            </p>
          ) : null}
          {game.targeting && game.beamAnchor && !hackAiming ? (
            <p className="beam-hint">Click the end of the beam</p>
          ) : null}
        </div>
      </div>
      {/* Tiles shrink so the rooms and the one-tile hull plate fit the panel. */}
      {/* @agent:flagship. The 10-row Rebel Flagship cutaway also needs a height bound. */}
      <div className={`target-body${cloaked ? " is-cloaked" : ""}`} style={{ ["--foe-tile" as string]: `${Math.max(14, Math.min(44, Math.floor(300 / (enemy.cols + 2)) - 2, Math.floor(260 / (enemy.rows + 2)) - 2))}px` }}>
        <ShipView
          ship={enemy}
          plateId={enemy.flagship ? `flagship-${enemy.flagship.stage}` : enemy.classId}
          faction={enemy.flagship ? "rebel" : enemy.faction}
          pirate={enemy.pirate}
          facing="left"
          crew={game.crew}
          aboard="enemy"
          showCrew
          seen={(id) => sight.interior("enemy", id)}
          crewLit={(c) => sight.showCrew(c)}
          selectedId={null}
          ventMode={false}
          targetable
          onRoom={(id, point) => {
            if (hackAiming) hackRoomClick(id);
            else if (slingAiming) slingRoomClick(id);
            else act((g) => aim(g, id, point));
          }}
          onCrew={(id) => {
            if (leashAiming) {
              act((g) => startLeash(g, id));
              setLeashAim(false);
            }
          }}
          aims={aimMarks(game)}
          beamAnchor={game.targeting && !hackAiming ? game.beamAnchor : null}
          beamLines={beamLinesOf(game)}
          hackMark={hackMark}
          hackPick={hackAiming ? (id) => spikeRoomTargetable(game, id) : undefined}
          droneHp={roomDroneHp(enemy, game)}
        />
        {cloaked ? <p className="cloak-tag">CLOAKED</p> : null}
      </div>
      <div className="target-systems">
        {SYS_ORDER.map((id) => {
          const sys = enemy.systems[id];
          if (sys.level <= 0 && sys.power <= 0) return null;
          // @agent:flagship. The flagship's guns are four artillery systems, shown per room below.
          if (id === "weapons" && enemy.flagship) return null;
          const shown = isMain(id) ? bars(sys, zoltanBars(game.crew, enemy, "enemy", id)) : sys.power;
          // @agent:hack-ui. "max-level Sensors information on the system" under the drone. Sensors, "Overview":
          // level 4 adds enemy systems level, power usage, ion damage/cooldown, repair/sabotage progress.
          // sensorSystemDetail is that line. It does not add Hacking, Cloaking, Mind Control, or Clone Bay timers.
          // Below level 4, and off the hacked system, the chip stays the short power count.
          const full = vision?.system === id || playerSensorLevel(game) >= 4;
          const tip = full
            ? `${sensorSystemDetail(enemy, id, SYS_LABEL[id], shown)}${vision?.system === id ? " (hacking drone)" : ""}`
            : `${SYS_LABEL[id]} ${shown}`;
          return (
            <span key={id} title={tip} className={vision?.system === id ? "is-hack-seen" : undefined}>
              <PixelIcon name={id} size={16} />
              <b>{shown}</b>
            </span>
          );
        })}
        {/* @agent:flagship. "Each located in its own room": one artillery chip per gun (wiki/flagship-systems.ts). */}
        {artilleryView(enemy).map((a) => {
          const name = WEAPONS[a.defId]?.name ?? a.defId;
          return (
            <span key={a.room} title={`${name} artillery ${a.bars} of ${a.level}${a.ion ? `, ion ${a.ion}` : ""}`}>
              <PixelIcon name="weapons" size={16} />
              <small>{name.replace(/^Boss /, "").slice(0, 3).toUpperCase()}</small>
              <b>{a.bars}</b>
            </span>
          );
        })}
        {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
          const kit = enemy.kits[id];
          if (!kit) return null;
          return (
            <span
              key={id}
              title={`${KIT_LABEL[id]} ${kit.level}${vision?.system === id ? " (hacking drone)" : ""}`}
              className={[kit.on ? "is-on" : "", vision?.system === id ? "is-hack-seen" : ""].filter(Boolean).join(" ") || undefined}
            >
              <PixelIcon name={id} size={16} />
              <b>{kit.level}</b>
            </span>
          );
        })}
      </div>
      {playerSensorLevel(game) >= 3 ? (
        <div className="foe-charges" aria-label="Enemy weapon charge">
          {enemy.weapons.map((w) => {
            const name = WEAPONS[w.defId]?.name ?? w.defId;
            const pips = 7;
            const filled = Math.round(weaponChargeShown(w) * pips);
            const cap = chargerCap(w.defId);
            const bank = cap != null ? `, ${w.loaded ?? 0} of ${cap} shots` : "";
            return (
              <div key={w.uid} className="foe-charge" aria-label={`${name} charge${bank}`}>
                <span className="foe-charge-name">{name}</span>
                <span className="charge-pips" aria-hidden="true">
                  {Array.from({ length: pips }, (_, i) => (
                    <i key={i} className={i < filled ? "on" : ""} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}

function useTrayDrag(tray: string, onReorder: (from: number, to: number) => void) {
  const drag = useRef<{ index: number; x: number; y: number; moved: boolean; pointer: number } | null>(null);
  const skipClick = useRef(false);
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function slotAt(x: number, y: number): number | null {
    const node = document.elementFromPoint(x, y)?.closest(`[data-tray="${tray}"]`);
    const raw = node?.getAttribute("data-slot");
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  }

  function onPointerDown(index: number, e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    drag.current = { index, x: e.clientX, y: e.clientY, moved: false, pointer: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const held = drag.current;
    if (!held || held.pointer !== e.pointerId) return;
    if (!held.moved && Math.hypot(e.clientX - held.x, e.clientY - held.y) < 6) return;
    held.moved = true;
    setFrom(held.index);
    setOver(slotAt(e.clientX, e.clientY));
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const held = drag.current;
    drag.current = null;
    setFrom(null);
    setOver(null);
    if (!held?.moved) return;
    skipClick.current = true;
    // The click lands on whatever is under the cursor, which may be the slot dropped on.
    const swallow = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      window.removeEventListener("click", swallow, true);
    };
    window.addEventListener("click", swallow, true);
    const to = slotAt(e.clientX, e.clientY);
    if (to == null || to === held.index) return;
    onReorder(held.index, to);
  }

  function onClickCapture(e: { preventDefault: () => void; stopPropagation: () => void }) {
    if (!skipClick.current) return;
    skipClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }

  return { from, over, onPointerDown, onPointerMove, onPointerUp, onClickCapture };
}

function Dock({ game, hackAiming }: { game: Game; hackAiming: boolean }) {
  const mask = powerMask(game.player, zoltanBars(game.crew, game.player, "player", "weapons"));
  const guns = useTrayDrag("weapons", (from, to) => act((g) => reorderWeapons(g, from, to)));
  const drones = useTrayDrag("drones", (from, to) =>
    act((g) => {
      const kit = g.player.kits.swarm;
      if (kit) reorderDroneSlots(kit, from, to);
    }),
  );
  const swarm = game.player.kits.swarm;
  const droneSlots = swarm?.loadout?.length ? swarm.loadout : swarm?.target ? [swarm.target] : [];
  // @agent:combat-ui. The enemy hacking drone on a roomless player kit (ui-views.ts).
  const hackedKit = hackedPlayerKit(game);
  return (
    <footer className="dock">
      <div className="power-dock">
        <span className="spare-pip" title="Reactor bars not assigned">
          {sparePower(game.player)}
        </span>
        {batterySpareBars(game.player) > 0 ? (
          <i className="spare-bonus" aria-hidden="true" title="Backup Battery bars">
            {Array.from({ length: batterySpareBars(game.player) }, (_, i) => (
              <b key={i} />
            ))}
          </i>
        ) : null}
        {MAIN_BARS.map((id) => (
          <PowerStack key={id} game={game} id={id} locked={id === "weapons" && weaponsPowerLocked(game)} />
        ))}
      </div>
      <div className="weapon-dock">
        <div className="gun-tray">
          {game.player.weapons.map((w, index) => {
            const def = WEAPONS[w.defId];
            const live = w.enabled && mask[index];
            const auto = slotAutofire(game, w);
            const pips = 7;
            const filled = Math.round(weaponChargeShown(w) * pips);
            const name = def?.name ?? w.defId;
            const cap = chargerCap(w.defId);
            const bank = cap != null ? ` ${w.loaded ?? 0} of ${cap} shots.` : "";
            const aimed = w.target
              ? (w.own ? game.player.rooms : game.enemy?.rooms)?.find((r) => r.id === w.target)?.title ?? null
              : null;
            const dragging = guns.from === index;
            const drop = guns.over === index && guns.from !== index;
            return (
              <button
                key={w.uid}
                type="button"
                data-tray="weapons"
                data-slot={index}
                draggable={false}
                className={`gun-slot${game.armed === w.uid ? " is-armed" : ""}${live ? "" : " is-dark"}${auto ? " is-auto" : ""}${game.targeting && game.armed === w.uid ? " is-targeting" : ""}${dragging ? " is-dragging" : ""}${drop ? " is-drop" : ""}`}
                aria-label={`${name}.${bank} ${w.enabled ? "Powered" : "Depowered"}. ${auto ? "Autofire on" : "Autofire off"}.`}
                onPointerDown={(e) => guns.onPointerDown(index, e)}
                onPointerMove={guns.onPointerMove}
                onPointerUp={guns.onPointerUp}
                onClickCapture={guns.onClickCapture}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    act((g) => reverseSlotAuto(g, w.uid));
                    return;
                  }
                  setHackAim(false);
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
                  <WeaponArt id={w.defId} height={24} />
                  <span className="gun-name">{name}</span>
                  {aimed ? (
                    <span className="gun-aim">
                      <PixelIcon name="target" size={12} />
                      {aimed}
                      {auto ? " · AUTO" : ""}
                    </span>
                  ) : null}
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
          {Array.from({ length: Math.max(0, weaponSlotCap(game) - game.player.weapons.length) }, (_, i) => (
            <span key={`empty-${i}`} className="gun-slot is-empty" aria-hidden="true" />
          ))}
        </div>
        {droneSlots.length > 0 ? (
          <div className="gun-tray drone-tray">
            {droneSlots.map((kind, index) => {
              const key = droneKeyOf(kind);
              const name = key ? DRONE_LOOKS[key].name : kind;
              const dragging = drones.from === index;
              const drop = drones.over === index && drones.from !== index;
              return (
                <button
                  key={`${kind}-${index}`}
                  type="button"
                  data-tray="drones"
                  data-slot={index}
                  draggable={false}
                  className={`gun-slot${swarm?.idle && kind === swarm.target ? " is-dark" : ""}${dragging ? " is-dragging" : ""}${drop ? " is-drop" : ""}`}
                  aria-label={`${name} drone slot ${index + 1}${swarm?.idle && kind === swarm.target ? ". Depowered" : ""}`}
                  onPointerDown={(e) => drones.onPointerDown(index, e)}
                  onPointerMove={drones.onPointerMove}
                  onPointerUp={drones.onPointerUp}
                  onClickCapture={drones.onClickCapture}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    act((g) => {
                      depowerDrone(g);
                    });
                  }}
                >
                  {key ? <DroneArt kind={key} height={20} /> : null}
                  <span className="gun-name">{name}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {swarm ? <span className="dock-label dock-drones">DRONES</span> : null}
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
            <div className="door-all">
              <button type="button" onClick={() => act((g) => openAllDoors(g))}>
                Open the doors
              </button>
              <button type="button" onClick={() => act((g) => closeAllDoors(g))}>
                Close the doors
              </button>
            </div>
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
                <PixelIcon name={id} size={16} />
              </button>
            );
          })}
          {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
            const kit = game.player.kits[id];
            if (!kit) return null;
            if (id === "spike") return <HackOrb key={id} game={game} aiming={hackAiming} hacked={hackedKit?.id === id ? hackedKit.phase : null} />;
            // Hacking wiki, "Overview" (Cloaking): "ends an active cloak, and prevents the enemy from entering cloak".
            const cloakLocked = id === "veil" && playerCloakHacked(game);
            // A kit with no room on the player ship still carries the latched drone; mark its orb instead
            // (Hacking wiki: "Launches a hacking drone that attaches to the enemy ship").
            const hacked = hackedKit?.id === id ? hackedKit.phase : null;
            const away = id === "sling" && game.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
            const tip = cloakLocked
              ? `${KIT_LABEL[id]}: hacked, cannot cloak`
              : hacked
                ? `${KIT_LABEL[id]}: hacking drone attached${hacked === "pulse" ? " (pulse)" : ""}`
                : id === "sling"
                  ? away
                    ? "Teleporter: recall crew"
                    : "Teleporter: send crew"
                  : id === "leash"
                    ? "Mind Control: pick a crewmember"
                    : KIT_LABEL[id];
            const powered = id === "veil" || id === "sling" || id === "leash";
            return (
              <span key={id} className="sub-pod">
                {powered ? (
                  <button
                    type="button"
                    className="sub-power"
                    aria-label={`${KIT_LABEL[id]} power`}
                    onClick={() => {
                      if (id === "veil") act((g) => toggleVeilPower(g));
                      else if (id === "sling") act((g) => toggleSlingPower(g));
                      else act((g) => toggleLeashPower(g));
                    }}
                  >
                    <i className="sub-bars" aria-hidden="true">
                      {Array.from({ length: Math.max(kit.level, 1) }, (_, n) => (
                        <b key={n} className={kitBarClass(game, id, kit.power, n)} />
                      ))}
                    </i>
                  </button>
                ) : (
                  <i className="sub-bars" aria-hidden="true">
                    {Array.from({ length: Math.max(kit.level, 1) }, (_, n) => (
                      <b key={n} className={kitBarClass(game, id, kit.power, n)} />
                    ))}
                  </i>
                )}
                <button
                  type="button"
                  className={`sub-orb${kit.on ? " is-on" : ""}${cloakLocked ? " is-hack-locked" : ""}${hacked ? ` is-kit-hacked is-kit-hacked-${hacked}` : ""}`}
                  data-kit={id}
                  aria-label={tip}
                  title={tip}
                  disabled={cloakLocked}
                  onClick={() => {
                    if (id === "veil") act((g) => startVeil(g));
                    else if (id === "cell") act((g) => startCell(g));
                    else if (id === "sling") slingIconClick();
                    else if (id === "leash") leashIconClick();
                  }}
                >
                  <PixelIcon name={id} size={16} />
                </button>
              </span>
            );
          })}
        </div>
        <span className="dock-label">SUBSYSTEMS</span>
      </div>
    </footer>
  );
}

/**
 * @agent:hack-ui. The player's Hacking orb with its status card. Hacking wiki, "Choosing your hacking target": "With
 * power in the hacking system, click on the hacking drone icon, then click an enemy system room. If the enemy has a
 * Zoltan Shield, you must destroy it first; if they are cloaked, you must wait for the cloak to end." "This costs one
 * drone part". Once attached, the same icon starts "the hacking pulse" (4 / 7 / 10 s, then 20 s cooldown).
 * INVENTED: the +/- power buttons (kits have no reactor column in this dock).
 */
function HackOrb({ game, aiming, hacked }: { game: Game; aiming: boolean; hacked: "flying" | "latched" | "pulse" | null }) {
  const view = playerHackView(game);
  if (!view) return null;
  const fight = game.phase === "combat" && !!game.enemy;
  const status = hackStatus(view, aiming);
  const usable = aiming || view.state === "ready" || view.state === "latched" || view.state === "queued";
  const verb = view.latched
    ? "start the hacking pulse"
    : aiming
      ? "cancel hack targeting"
      : view.state === "queued"
        ? "cancel the queued launch"
        : "aim the hacking drone";
  const tip = `Hacking ${view.power}/${view.level}: ${status.toLowerCase()}${usable ? `. Click or H to ${verb}` : ""}`;
  return (
    <div className={`hack-pod is-${aiming ? "aiming" : view.state}`}>
      {fight ? (
        <div className="hack-card" role="status">
          <span className="hack-card-title">
            <PixelIcon name="spike" size={12} />
            HACKING
            {view.pulse > 0 ? <span className="hack-card-pulse">{view.pulse}s pulse</span> : null}
          </span>
          <span className="hack-card-state">{status}</span>
          {view.state === "pulse" ? (
            <i className="hack-meter" aria-hidden="true">
              <i style={{ width: `${Math.max(0, Math.min(1, view.left / Math.max(1, view.pulse))) * 100}%` }} />
            </i>
          ) : view.state === "flying" ? (
            <i className={`hack-meter is-fly${view.stunned || view.power < 1 ? " is-held" : ""}`} aria-hidden="true">
              <i style={{ width: `${view.progress * 100}%` }} />
            </i>
          ) : view.state === "cooldown" ? (
            <i className="hack-meter is-cool" aria-hidden="true">
              <i style={{ width: `${Math.max(0, Math.min(1, 1 - view.cool / 20)) * 100}%` }} />
            </i>
          ) : null}
          <span className="hack-card-row">
            {(view.state === "queued" || view.state === "flying") && view.label ? (
              <span className="hack-card-target">
                <PixelIcon name="target" size={12} />
                {view.label}
                <em>{view.state === "queued" ? "queued" : "in flight"}</em>
              </span>
            ) : view.latched ? (
              <span className="hack-card-target">
                <PixelIcon name="target" size={12} />
                {view.label}
                <em>locked</em>
              </span>
            ) : (
              <span className={`hack-card-cost${view.parts < 1 ? " is-short" : ""}`} title="Each launch costs one drone part">
                <PixelIcon name="parts" size={12} />1 of {view.parts}
              </span>
            )}
          </span>
        </div>
      ) : null}
      <span className="hack-power">
        <button type="button" aria-label="Remove power from Hacking" title="Remove power" disabled={view.power <= 0} onClick={() => act((g) => lowerSpikePower(g))}>
          <PixelIcon name="minus" size={12} />
        </button>
        <button
          type="button"
          aria-label="Add power to Hacking"
          title="Add power"
          disabled={view.power >= view.level || sparePower(game.player) < 1}
          onClick={() => act((g) => raiseSpikePower(g))}
        >
          <PixelIcon name="plus" size={12} />
        </button>
      </span>
      <button
        type="button"
        className={`sub-orb hack-orb${aiming ? " is-aiming" : ""}${view.state === "pulse" ? " is-on" : ""}${usable ? " is-usable" : ""}${hacked ? ` is-kit-hacked is-kit-hacked-${hacked}` : ""}`}
        data-kit="spike"
        aria-label={tip}
        aria-pressed={aiming}
        title={tip}
        onClick={(e) => {
          e.stopPropagation();
          hackIconClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHackAim(false);
        }}
      >
        <i className="sub-bars" aria-hidden="true">
          {Array.from({ length: Math.max(view.level, 1) }, (_, n) => (
            <b key={n} className={kitBarClass(game, "spike", view.power, n)} />
          ))}
        </i>
        <PixelIcon name="spike" size={16} />
      </button>
    </div>
  );
}

function PowerStack({ game, id, locked = false }: { game: Game; id: SysId; locked?: boolean }) {
  const sys = game.player.systems[id];
  const cap = Math.max(0, sys.level - sys.damage - sys.ion.length);
  const slots = sys.level;
  const capacity = Math.max(0, sys.level - sys.damage);
  const ionLocked = Math.min(sys.ion.length, capacity);
  const green = Math.max(0, Math.min(sys.power, capacity - ionLocked));
  const painted = batteryBarsOn(game.player, id);
  const live = bars(sys, zoltanBars(game.crew, game.player, "player", id));
  return (
    <div className={`power-stack${locked ? " is-locked" : ""}`}>
      <div className="power-col">
        {Array.from({ length: slots }, (_, raw) => {
          const i = slots - 1 - raw;
          const ionStart = sys.level - sys.ion.length;
          const dmgStart = ionStart - sys.damage;
          const cls =
            i < green && i >= sys.power - painted
              ? "on is-battery"
              : i < green
                ? "on"
                : i < live
                  ? "is-zoltan"
                  : sys.ion.length > 0 && i >= ionStart
                    ? "is-ion"
                    : sys.damage > 0 && i >= dmgStart
                      ? "is-dmg"
                      : "";
          return (
            <button
              key={i}
              type="button"
              className={cls}
              aria-label={`${SYS_LABEL[id]} power ${i + 1}`}
              aria-disabled={locked || undefined}
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
        <PixelIcon name={id} size={16} />
      </span>
    </div>
  );
}

function EventModal({ game }: { game: Game }) {
  const event = game.event;
  if (!event) return null;
  // @agent:surrender. Rewards, "Stuff": the offered resources and scrap, shown before the player answers.
  const offer = surrenderOfferView(game);
  return (
    <div className="modal-layer">
      <article className={`ftl-card${offer ? " surrender-card" : ""}`}>
        {event.title ? <p className="event-lead">{event.title}</p> : null}
        <p>{event.body}</p>
        {offer ? (
          <>
            <p className="surrender-sub">They offer:</p>
            <LootChips scrap={offer.scrap} res={offer} />
            {offer.weapon ? <p className="surrender-sub">Plus a weapon from their racks.</p> : null}
          </>
        ) : null}
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
        {reward.res ? (
          <LootChips scrap={reward.scrap} res={reward.res} />
        ) : (
          <p className="loot-chip">
            <PixelIcon name="scrap" size={20} />
            <b>{reward.scrap}</b>
          </p>
        )}
        <button type="button" className="choice-line" onClick={() => act((g) => continueReward(g))}>
          1. Continue...
        </button>
      </article>
    </div>
  );
}

/** @agent:surrender. Scrap plus fuel, missiles and drone parts, one chip each, zero amounts left out. */
function LootChips({ scrap, res }: { scrap: number; res: { fuel?: number; missiles?: number; parts?: number } }) {
  const items: [IconName, number, string][] = [
    ["scrap", scrap, "Scrap"],
    ["fuel", res.fuel ?? 0, "Fuel"],
    ["missile", res.missiles ?? 0, "Missiles"],
    ["parts", res.parts ?? 0, "Drone parts"],
  ];
  return (
    <div className="loot-row">
      {items
        .filter(([, n]) => n > 0)
        .map(([icon, n, label]) => (
          <p key={icon} className="loot-chip" title={label}>
            <PixelIcon name={icon} size={20} />
            <b>{n}</b>
          </p>
        ))}
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

function Portrait({ crew }: { crew: Crew }) {
  return (
    <span className="portrait" aria-hidden="true">
      <CrewFace crew={crew} size={24} />
    </span>
  );
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
      <FullscreenButton className="frame-btn title-fs" />
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
      <p className="title-panel-body">STL: Slower Than Light is a fan project inspired by FTL: Faster Than Light by Subset Games. It is not affiliated with or endorsed by Subset Games.</p>
      <p>v. 0.1</p>
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
              if (!isUnlocked(layout.id)) return; // @agent:unlocks. A locked layout does not start from its wiki article.
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

function beaconMark(b: { quest?: string; resolved: boolean; kind: string; name: string; flag: string }): string {
  if (b.quest && !b.resolved) return "QUEST";
  if (b.kind === "store") return "STORE";
  if (b.kind === "exit") return "EXIT";
  if (b.kind === "distress" || /distress/i.test(`${b.name} ${b.flag}`)) return "DISTRESS";
  return "";
}

function mapX(col: number) {
  return col === 0 ? 40 : 210 + (col - 1) * 82;
}

function mapY(row: number) {
  return 44 + row * 96;
}

/** BEACON MAP: File:NO_FUEL.png. NO FUEL across the chart, WAIT, DISTRESS BEACON, SECTOR. STORE and EXIT labels stay. */
function MapScreen({ game }: { game: Game }) {
  const here = game.beacons.find((b) => b.id === game.here);
  const maxCol = game.beacons.reduce((m, b) => Math.max(m, b.col), 0);
  const maxRow = game.beacons.reduce((m, b) => Math.max(m, b.row), 0);
  const w = mapX(maxCol) + 40;
  const h = mapY(maxRow) + 36;
  const pct = (n: number, total: number) => `${(n / total) * 100}%`;
  const named = SECTOR_NAMES.includes(game.sectorName) ? "" : game.sectorName;
  return (
    <section className="sector-map beacon-map">
      <h2>BEACON MAP</h2>
      <button
        type="button"
        className="map-close"
        aria-label="Close"
        onClick={() =>
          act((g) => {
            g.picking = false;
          })
        }
      >
        ×
      </button>
      {game.phase === "map" ? (
        <button type="button" className="map-wait" onClick={() => act((g) => waitHere(g))}>
          WAIT
        </button>
      ) : null}
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
            {game.fleet > 0 ? (
              <line
                x1={mapX(game.fleet) - 28}
                y1={8}
                x2={mapX(game.fleet) - 28}
                y2={h - 8}
                stroke="#e23a3a"
                strokeWidth="3"
                strokeDasharray="7 5"
              />
            ) : null}
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
            const open = linked || (game.augments.includes("nav") && navAllows(b, game.fleet));
            const swallowed = b.col < game.fleet;
            // @agent:quests. Beacons, "Quest (marker) beacon": marked 'QUEST', "seen on the map from any distance away".
            const tag = beaconMark(b);
            const nebula = b.kind === "nebula" && !b.cleared;
            return (
              <button
                key={b.id}
                type="button"
                className={`beacon${open ? " is-linked" : ""}${b.visited ? " is-visited" : ""}${swallowed ? " is-over" : ""}${nebula ? " is-nebula" : ""}${tag ? ` is-${tag.toLowerCase()}` : ""}`}
                style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}
                disabled={!open || (game.phase === "combat" && game.flee < 1)}
                aria-label={tag || "Beacon"}
                onClick={() => act((g) => commitJump(g, b.id))}
              />
            );
          })}
          {game.beacons.map((b) => {
            const tag = beaconMark(b);
            if (!tag || b.id === game.here) return null;
            return (
              <span key={`tag-${b.id}`} className={`jump-tag${tag === "QUEST" ? " is-quest" : ""}`} style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h) }}>
                {tag}
              </span>
            );
          })}
          {here && game.augments.includes("glass")
            ? game.beacons.map((b) => {
                // Augmentations, Long-Ranged Scanners: adjacent beacons only, including ones left behind.
                // Not the current beacon. Live from the fitted scanners; selling them hides the marks.
                if (b.id === here.id || !here.links.includes(b.id)) return null;
                const mark = scanMark(game, b);
                const bits = [mark.ship ? "SHIP" : "", mark.hazard ? "HAZARD" : ""].filter(Boolean);
                if (!bits.length) return null;
                return (
                  <span
                    key={`scan-${b.id}`}
                    className="jump-tag"
                    style={{ left: pct(mapX(b.col), w), top: pct(mapY(b.row), h), transform: "translate(12px, -50%)" }}
                  >
                    {bits.join(" ")}
                  </span>
                );
              })
            : null}
          {game.fuel < 1 ? <p className="no-fuel">NO FUEL</p> : null}
        </div>
      </div>
      <div className="sector-key beacon-foot">
        <span>SECTOR {game.sector}</span>
        {named ? <span>{named}</span> : null}
        {here && beaconMark(here) === "DISTRESS" ? <span>DISTRESS BEACON</span> : null}
        <span className="beacon-legend">
          <span><i className="key-beacon is-linked" />Jump</span>
          <span><i className="key-beacon" />Beacon</span>
          <span><i className="key-beacon is-visited" />Visited</span>
          <span><i className="key-beacon is-over" />Fleet</span>
        </span>
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
                <circle r="16" fill="none" stroke="#e6d36a" strokeWidth="2" />
                <path fill="#d5f1ff" d="M -10 -5 H 2 L 6 -2.6 V 2.6 L 2 5 H -10 Z" />
                <path fill="#f7fdff" d="M 6 -2.4 L 13 0 L 6 2.4 Z" />
              </g>
            ) : null}
          </svg>
          {nodes.map((b) => {
            if (b.id === game.routeHere) return null;
            const linked = here?.links.includes(b.id) ?? false;
            const past = !!here && b.col < here.col;
            return (
              <button
                key={b.id}
                type="button"
                className={`beacon is-${sectorTone(b.group)}${linked ? " is-linked" : ""}${past ? " is-past" : ""}`}
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
  const bonus = Math.max(0, cellBonus(game.player));
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
            <PixelIcon name={game.muted ? "mute" : "sound"} />
            {game.muted ? "Unmute" : "Mute"}
          </button>
        </div>
        <div className="crew-line">
          {game.crew
            .filter((c) => c.side === "player" && c.hp > 0)
            .map((c) => (
              <span key={c.id}>
                <i className="token is-sprite">
                  <CrewFace crew={c} size={16} />
                </i>
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
            tail={bonus}
            cost={upgradeCost("reactor", game.player.reactor)}
            onUp={() => act((g) => upgrade(g, "reactor"))}
            onDown={null}
            onPlus={null}
          />
          {SYS_ORDER.map((id) => {
            const sys = game.player.systems[id];
            const cost = upgradeCost(id, sys.level);
            return (
              <PowerRow
                key={id}
                name={`${SYS_LABEL[id]} · ${sys.level}`}
                blurb={upgradeBlurb(id, sys.level)}
                level={sys.level}
                power={isMain(id) ? sys.power : sys.level}
                max={Math.max(0, sys.level - sys.damage - sys.ion.length)}
                paint={isMain(id) ? batteryBarsOn(game.player, id) : 0}
                cost={cost}
                icon={id}
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
                  <PixelIcon name={id} />
                  {KIT_LABEL[id]} · {kit.level}
                </span>
                {id === "swarm" && droneKeyOf(kit.target) ? (
                  <span className="power-drone">
                    <DroneArt kind={droneKeyOf(kit.target)} height={20} />
                    {DRONE_LOOKS[droneKeyOf(kit.target)!].name}
                  </span>
                ) : null}
                <span className="mini">{kit.power > 0 ? `${kit.power} power` : "unpowered"}</span>
                {id === "veil" || id === "sling" || id === "leash" || id === "cell" ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() =>
                      act((g) => {
                        if (id === "veil") upgradeVeil(g);
                        else if (id === "sling") upgradeSling(g);
                        else if (id === "leash") upgradeLeash(g);
                        else upgradeCell(g);
                      })
                    }
                  >
                    UPGRADE
                  </button>
                ) : null}
                {id === "lance" ? (
                  <span className="mode-row">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Less ${KIT_LABEL[id]} · ${kit.level}`}
                      onClick={() => act((g) => lowerLancePower(g))}
                    >
                      <PixelIcon name="minus" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`More ${KIT_LABEL[id]} · ${kit.level}`}
                      onClick={() => act((g) => raiseLancePower(g))}
                    >
                      <PixelIcon name="plus" />
                    </button>
                  </span>
                ) : null}
                {id === "flak" ? (
                  <span className="mode-row">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Less ${KIT_LABEL[id]} · ${kit.level}`}
                      onClick={() => act((g) => lowerFlakPower(g))}
                    >
                      <PixelIcon name="minus" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`More ${KIT_LABEL[id]} · ${kit.level}`}
                      onClick={() => act((g) => raiseFlakPower(g))}
                    >
                      <PixelIcon name="plus" />
                    </button>
                  </span>
                ) : null}
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
function kitBarClass(game: Game, id: string, power: number, n: number): string {
  if (n >= power) return "";
  const painted = batteryBarsOn(game.player, id);
  return painted > 0 && n >= power - painted ? "on is-battery" : "on";
}

function PowerRow({
  name,
  blurb,
  power,
  max,
  cost,
  onUp,
  onDown,
  onPlus,
  icon,
  paint = 0,
  tail = 0,
}: {
  name: string;
  blurb: string;
  level: number;
  power: number;
  max: number;
  cost: number | null;
  icon?: IconName;
  /** Highest powered bars that are Backup Battery bars. */
  paint?: number;
  /** Bonus bars drawn after the regular reactor bars. */
  tail?: number;
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onPlus: (() => void) | null;
}) {
  return (
    <div className="power-row">
      <span className="power-name">
        {icon ? <PixelIcon name={icon} /> : null}
        {name}
      </span>
      <span className="bars" aria-hidden="true">
        {Array.from({ length: Math.max(max, power, 1) }, (_, i) => {
          const on = i < power;
          const battery = on && paint > 0 && i >= power - paint;
          return <i key={i} className={battery ? "on is-battery" : on ? "on" : ""} />;
        })}
        {Array.from({ length: tail }, (_, i) => (
          <i key={`bonus-${i}`} className="on is-battery" />
        ))}
      </span>
      <span className="mini">{blurb}</span>
      <span className="mode-row">
        {onDown ? (
          <button type="button" className="icon-btn" aria-label={`Less ${name}`} onClick={onDown}>
            <PixelIcon name="minus" />
          </button>
        ) : null}
        {onPlus ? (
          <button type="button" className="icon-btn" aria-label={`More ${name}`} onClick={onPlus}>
            <PixelIcon name="plus" />
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
