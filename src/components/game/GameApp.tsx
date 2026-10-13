import { tx } from "@/i18n";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { resumeAudio, setMuted, setVolume, unlockAudio } from "@/game/audio";
import { setSetting, useOptionsOpen, useSettings } from "@/game/settings";
import { buzz, watchHaptics } from "@/game/haptics";
import { OptionsPanel } from "./OptionsPanel";
import { animSpeed, applyCssSpeed, FAST_SPEED, useFast } from "./speed";
import { pageRect, toPage } from "./turn";
import {
  SECTOR_NAMES,
  SYS_LABEL,
  WEAPONS,
  upgradeBlurb,
  upgradeCost,
} from "@/game/content";
import { CATALOG, scanMark } from "@/game/extras/augments";
import { navAllows } from "@/game/wiki/cited-nav";
import { beaconXY, CELL_PX, dangerCentre, DANGER_RADIUS, GRID_COLS, GRID_ROWS, overtaken } from "@/game/wiki/sector-map";
import { batteryBarsOn, batterySpareBars, cellUpgradeCost, startCell, upgradeCell } from "@/game/extras/cell";
import { cleanName, kinLabel, NAME_MAX } from "@/game/crew-look";
import { recallSling, sendSling, shipInDanger, slingUpgradeCost, upgradeSling } from "@/game/extras/sling";
import { activateDroneSlot, depowerDrone, playerDroneSlots, reorderDroneSlots, roomDroneHp } from "@/game/extras/swarm";
import { beamTileLength } from "@/game/wiki/weapons-beam";
import { CHARGE_SECONDS as LANCE_CHARGE, lanceUpgradeCost, lowerLancePower, raiseLancePower, upgradeLance } from "@/game/extras/lance";
import { CHARGE_SECONDS as FLAK_CHARGE, flakUpgradeCost, lowerFlakPower, raiseFlakPower, upgradeFlak } from "@/game/extras/flakart";
import { Hangar } from "./Hangar";
import { InstallButton } from "./InstallGuide";
import { PixelHull, PixelLayout, PixelMenu, PixelTitle, TITLE_MENU_ART, UnlockDiagram, classOfPage } from "./PixelArt";
import { PLAYABLE_SHIPS, cruiserPage, type CruiserLayout, type WikiLine } from "@/game/wiki/layout-pages";
import { startVeil, upgradeVeil, veilUpgradeCost } from "@/game/extras/veil";
import { startLeash, UPGRADE_COST as LEASH_UPGRADE, upgradeLeash } from "@/game/extras/leash";
import { cradleUpgradeCost, enemyCloneQueue, upgradeCradle } from "@/game/extras/cradle";
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
  spikeUpgradeCost,
  upgradeSpike,
} from "@/game/extras/spike";
import { create } from "zustand";
import { LAST_FUEL_SECONDS } from "@/game/wiki/escape";
// @agent:surrender. The surrender card lists the offered cargo.
import { raceKin, surrenderOfferView } from "@/game/wiki/surrender";
import { augmentDetail, augmentName, bonusAugmentFate, droneName } from "@/game/wiki/bonus-item";
import { canFieldDrone } from "@/game/wiki/cited-stores";
import { CARGO_SLOTS, canFitFromCargo, cargoOf, fitFromCargo, pendingOverflow, resolveOverflow, stowDrone, stowWeapon } from "@/game/wiki/make-room";
import { kinOf } from "@/game/extras/kin";
import { UNIFORMS } from "@/game/crew-look";
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
  enemyEscapeView,
  evasionPercent,
  ftlSeconds,
  jumpBlocked,
  hasSave,
  isMain,
  bars,
  maxBubbles,
  zoltanBars,
  closeAllDoors,
  lockdown,
  lockdownSelected,
  openAllDoors,
  shipTicking,
  openShipMenu,
  orderSelected,
  playerDoorsLocked,
  powerDown,
  powerMask,
  powerUp,
  CREW_CAP,
  REPAIR_SECONDS,
  shieldChargeShown,
  kitPowerUp,
  kitBars,
  kitPowerDown,
  setKitBars,
  type BarKit,
  reorderWeapons,
  reverseSlotAuto,
  returnToStations,
  saveGame,
  saveStations,
  selectCrew,
  selectCrewIds,
  selectedIds,
  slotAutofire,
  sparePower,
  toggleAutoAll,
  toggleDoor,
  togglePause,
  halted,
  truce,
  waitHere,
  upgrade,
  weaponChargeShown,
  weaponSlotCap,
  weaponsPowerLocked,
  canDismiss,
  dismissCrew,
  healingIds,
} from "@/game/sim";
import { xpNeedFor } from "@/game/extras/lineage";
import { useGame } from "@/game/store";
import { isUnlocked } from "@/game/unlock-store"; // @agent:unlocks
import type { AugmentId, BeamLine, Crew, Game, Overflow, Kit, KitId, Ship, SkillName, SysId } from "@/game/types";
import { DRONE_LOOKS, droneKeyOf } from "@/game/gear-look";
import { CombatFx } from "./CombatFx";
import { ShadeFx, useEnemyWreck } from "./ShadeFx";
import { CrewFace, CrewSprite } from "./CrewSprite";
import { DroneArt, WeaponArt } from "./GearArt";
import { CloseX } from "./CloseX";
import { PixelIcon } from "./PixelIcon";
import type { IconName } from "@/game/icons";
import { armHold, holdTookContext, swallowHoldClick } from "./hold";
import { Screen } from "./Screen";
import { ShipView, type AimMark, type HackMark } from "./ShipView";
import { AchievementsScreen, HelpScreen, Verdict, sectorTone } from "./WikiViews";
import { StoreBoard } from "./StoreBoard";
import { airShown } from "@/game/air";

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
  veil: tx("ui.GameApp.cloaking"),
  sling: tx("ui.GameApp.teleporter"),
  spike: tx("ui.GameApp.hacking"),
  swarm: tx("ui.GameApp.drone-control"),
  leash: tx("ui.GameApp.mind-control"),
  cradle: tx("ui.GameApp.clone-bay"),
  cell: tx("ui.GameApp.backup-battery"),
  lance: tx("ui.GameApp.artillery-beam"),
  flak: tx("ui.GameApp.flak-artillery"),
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
    if (halted(game)) queueSpike(game, id);
    else if (armSpike(game, id)) launchSpike(game);
  });
  setHackAim(false);
}

/** Level-1 clone bay is 12s; the longest death animation adds 2s. Hard flagship seats 13, so the "+n" suffix tops out at 12. */
const CLONE_SECONDS_WIDE = 14;
const CLONE_EXTRA_WIDE = 12;

/** Occupies the width of `sample` (the widest value that readout can show) without clipping a longer one. */
function DigitSlot({ value, sample }: { value: number | string; sample: number | string }) {
  return (
    <span className="digit-slot">
      <span className="is-reserve" aria-hidden="true">
        {sample}
      </span>
      <span>{value}</span>
    </span>
  );
}

/** @agent:hack-ui. Short status for the hacking orb, by spike.ts playerHackView state. */
function hackStatus(view: NonNullable<ReturnType<typeof playerHackView>>, aiming: boolean): string {
  if (aiming) return tx("ui.GameApp.pick-a-system");
  switch (view.state) {
    case "pulse":
      return tx("ui.GameApp.pulse-s", { toFixed: view.left.toFixed(1) });
    case "cooldown":
      return tx("ui.GameApp.cooldown-s", { ceil: Math.ceil(view.cool) });
    case "latched":
      return tx("ui.GameApp.pulse-ready");
    case "queued":
      return tx("ui.GameApp.launch-on-unpause");
    case "flying":
      // @agent:hack-rules. Hacking wiki: de-powering "freezes the hacking drone in place"; Anti-Combat Drones stun it.
      if (view.stunned) return tx("ui.GameApp.drone-stunned");
      if (view.power < 1) return tx("ui.GameApp.drone-held");
      return tx("ui.GameApp.drone-inbound", { round: Math.round(view.progress * 100) });
    case "nopower":
      return tx("ui.GameApp.no-power");
    case "noparts":
      return tx("ui.GameApp.no-drone-parts");
    case "zoltan":
      return tx("ui.GameApp.zoltan-shield-up");
    case "cloaked":
      return tx("ui.GameApp.target-cloaked");
    case "ready":
      return tx("ui.GameApp.launch-ready");
    default:
      return view.latched ? tx("ui.GameApp.drone-attached") : tx("ui.GameApp.standby");
  }
}

/**
 * Door System, "Doors control panel": the top button opens every door (arrows point out)
 * and the bottom button closes every door (arrows point in).
 */
function DoorAllIcon({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 18 14" width="18" height="14" aria-hidden="true">
      {open ? (
        <>
          <path d="M1 7 L7 3 V11 Z" fill="currentColor" />
          <path d="M17 7 L11 3 V11 Z" fill="currentColor" />
        </>
      ) : (
        <>
          <path d="M1 3 L7 7 L1 11 Z" fill="currentColor" />
          <path d="M17 3 L11 7 L17 11 Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** INVENTED title line. The play HUD follows the combat, event, and pause screens. */
export function GameApp() {
  const version = useGame((s) => s.version);
  const game = useGame.getState().game;
  void version;

  useEffect(() => {
    // Options, Sound: the saved mute and volume drive the mixer, now and on every change.
    const applySound = () => {
      const s = useSettings.getState();
      setMuted(s.muted);
      setVolume(s.volume);
    };
    applySound();
    const stopSound = useSettings.subscribe(applySound);
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
      // Per the user: fast forward. F is free (crew are F1–F8).
      if (e.code === "KeyF" && plain) {
        e.preventDefault();
        useFast.setState((s) => ({ on: !s.on }));
        return;
      }
      if (e.code === "KeyM" && plain) {
        e.preventDefault();
        setSetting("muted", !useSettings.getState().muted);
        return;
      }
      // Configure controls: U opens Upgrades. I opens Inventory. Both work while that menu is already open.
      if (e.code === "KeyU" && plain) {
        e.preventDefault();
        act((g) => openShipMenu(g, "upgrades"));
        return;
      }
      if (e.code === "KeyI" && plain) {
        e.preventDefault();
        act((g) => openShipMenu(g, "inventory"));
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
      // Per the user, and FTL's default controls (File:ConfigureControls1.png): C "Activate Cloaking", T "Teleport - Send",
      // R "Teleport - Return". Each does what that system's dock icon does.
      if (e.code === "KeyC" && plain && g.phase === "combat") {
        e.preventDefault();
        act((game) => startVeil(game));
        return;
      }
      if (e.code === "KeyT" && plain && g.phase === "combat" && g.enemy && g.player.kits.sling) {
        e.preventDefault();
        if (useSlingAim.getState().on) {
          setSlingAim(false);
          return;
        }
        act((game) => cancelTargeting(game));
        setHackAim(false);
        setLeashAim(false);
        setSlingAim(true);
        return;
      }
      if (e.code === "KeyR" && plain && g.player.kits.sling) {
        e.preventDefault();
        setSlingAim(false);
        act((game) => recallSling(game));
        return;
      }
      // Crystal, "Crystal Lockdown": Z opens every door and overrides the coating.
      if (e.code === "KeyZ" && plain) {
        e.preventDefault();
        act((game) => openAllDoors(game));
        return;
      }
      const crewPhase = g.phase === "combat" || g.phase === "map";
      // Door System: X closes every door, including one that just finished its stuck-open timer.
      if (e.code === "KeyX" && plain && crewPhase) {
        e.preventDefault();
        act((game) => closeAllDoors(game));
        return;
      }
      // Configure controls: Q selects every crew member. F1–F8 select crew 1–8, including a mind-controlled one.
      if (e.code === "KeyQ" && plain && crewPhase) {
        e.preventDefault();
        act((game) => selectCrewIds(game, game.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.id)));
        return;
      }
      const fn = /^F([1-8])$/.exec(e.code);
      if (fn && plain && crewPhase) {
        e.preventDefault();
        const n = Number(fn[1]) - 1;
        act((game) => {
          const body = game.crew.filter((c) => c.side === "player" && c.hp > 0)[n];
          if (body) selectCrewIds(game, [body.id]);
        });
        return;
      }
      // INFERRED: / saves stations. Return sends those crew back while they are on the player ship.
      if (e.code === "Slash" && plain && crewPhase) {
        e.preventDefault();
        act((game) => saveStations(game));
        return;
      }
      if ((e.code === "Enter" || e.code === "NumpadEnter") && plain && crewPhase) {
        e.preventDefault();
        act((game) => returnToStations(game));
        return;
      }
      const digit = /^Digit([1-9])$/.exec(e.code);
      if (!digit) return;
      const n = Number(digit[1]) - 1;
      if (g.phase === "event" && g.event && plain) {
        const choice = g.event.choices[n];
        if (!choice || choiceDisabled(g, choice.id) || choicesLocked()) return;
        e.preventDefault();
        noteChoice();
        act((game) => choose(game, choice.id));
        return;
      }
      if (g.phase === "reward" && n === 0 && plain) {
        e.preventDefault();
        if (choicesLocked()) return;
        noteChoice();
        act((game) => continueReward(game));
        return;
      }
      if ((g.phase === "combat" || g.phase === "map") && !g.picking) {
        // Drone Control, Overview: keys 5-7 activate the installed schematics. Weapon keys stay 1-4.
        if (plain && n >= 4 && n <= 6) {
          e.preventDefault();
          act((game) => activateDroneSlot(game, n - 4));
          return;
        }
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
      // Oxygen and venting keep counting on the map. A pause stops the clock.
      const ticking = shipTicking(g);
      // Per the user: fast forward runs the clock at FAST_SPEED (more 1/30 s ticks per frame, never a longer tick).
      const fast = useFast.getState().on && ticking;
      if (fast) acc += dt * (FAST_SPEED - 1);
      let steps = 0;
      while (acc >= 1 / 30 && steps < (fast ? 4 * FAST_SPEED : 4)) {
        useGame.getState().tick(1 / 30);
        acc -= 1 / 30;
        steps += 1;
      }
      // Per the user: fast forward speeds up CSS animations too (speed.ts). New animations start at 1x, so every frame.
      applyCssSpeed();
      // Per the user (haptics): your ship's hits, losses, jumps and wins (haptics.ts watchHaptics).
      watchHaptics(useGame.getState().game);
      if (!ticking) acc = 0;
      // A tick that stops the clock itself (a surrender offer, a win, a reward card) must be drawn at once: with the
      // clock stopped nothing bumps again, and the screen stayed frozen on the frame before (bug reported by the user).
      const stopped = ticking && !shipTicking(useGame.getState().game);
      if (stopped || (ticking && now - ui > 80)) {
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
      stopSound();
    };
  }, []);

  // Options, Graphics: screen shake (off by default under reduced motion, settings.ts).
  const shakeOn = useSettings((st) => st.shake);

  return (
    <Screen>
      <GameShell game={game} shake={shakeOn ? game.trauma * game.trauma : 0} />
    </Screen>
  );
}

function GameShell({ game, shake }: { game: Game; shake: number }) {
  const manual = game.manual ? <Manual onClose={() => act((g) => { g.manual = false; })} /> : null;
  const sheet = game.shipSheet ? <ShipSheet game={game} /> : null;
  // Options, Graphics: walk targets and room oxygen bars switch off by a class on the root.
  const ghosts = useSettings((s) => s.ghosts);
  const roomAir = useSettings((s) => s.roomAir);
  const looks = `${ghosts ? "" : " no-ghosts"}${roomAir ? "" : " no-room-air"}`;
  const optionsOpen = useOptionsOpen((s) => s.open) && game.phase !== "title";
  return (
    <div className={game.phase === "title" ? `deck${looks}` : `deck play-root${game.userPaused ? " is-paused" : ""}${halted(game) ? " is-halted" : ""}${looks}`}>
      {game.phase === "title" ? <TitleScreen /> : <PlayFrame game={game} shake={shake} />}
      {manual}
      {sheet}
      {optionsOpen ? <InGameOptions /> : null}
    </div>
  );
}

/**
 * Per the user: the wrench opens Options in a run. The clock holds while it is open (Game.menuHold, the radial menu's
 * hold), apart from the player's pause.
 */
function InGameOptions() {
  useEffect(() => {
    act((g) => {
      g.menuHold = true;
    });
    return () =>
      act((g) => {
        g.menuHold = false;
      });
  }, []);
  return <OptionsPanel inGame onClose={() => useOptionsOpen.setState({ open: false })} />;
}

const MAIN_BARS: SysId[] = ["shields", "engines", "medbay", "oxygen", "weapons"];

/**
 * Systems: "Subsystems are the same as systems, except they do not use power", and its "Main systems" list, "in the
 * order which they appear in the game GUI from left to right": Shields, Engines, Medbay, Clone Bay, Oxygen, Crew
 * Teleporter, Cloaking, Mind Control, Artillery Beam, Flak Artillery, Hacking, Weapon Control, Drone Control.
 * Its "Subsystems" are Piloting, Sensors, Door System and Backup Battery, so only the battery kit sits in that dock.
 */
const MAIN_ORDER: (SysId | KitId)[] = [
  "shields",
  "engines",
  "medbay",
  "cradle",
  "oxygen",
  "sling",
  "veil",
  "leash",
  "lance",
  "flak",
  "spike",
  "weapons",
  "swarm",
];
const SUB_KITS: KitId[] = ["cell"];

function isKitId(id: SysId | KitId): id is KitId {
  return id in KIT_LABEL;
}

/** INVENTED: the combat, event, and pause screens are the layout guide. No wiki page specifies this chrome. */
function PlayFrame({ game, shake }: { game: Game; shake: number }) {
  const sector = game.sectorMap && game.phase !== "victory" && game.phase !== "defeat";
  // File:NO_FUEL.png and File:3_store.jpg: the beacon chart is a panel over the ship, opened with JUMP.
  const chart = !sector && game.picking && (game.phase === "map" || game.phase === "combat" || game.phase === "event");
  // The sim drops the enemy as the hull hits 0. Keep the panel until the break-up tiles land.
  const wrecking = useEnemyWreck();
  const prevEnemy = useRef(game.enemy);
  const [linger, setLinger] = useState<Ship | null>(null);
  const sawWreck = useRef(false);
  if (game.enemy !== prevEnemy.current) {
    const previous = prevEnemy.current;
    prevEnemy.current = game.enemy;
    if (!game.enemy && previous && previous.hull <= 0) setLinger(previous);
    else if (game.enemy) setLinger(null);
  }
  useEffect(() => {
    if (!linger) {
      sawWreck.current = false;
      return;
    }
    if (wrecking) {
      sawWreck.current = true;
      return;
    }
    if (sawWreck.current) {
      sawWreck.current = false;
      setLinger(null);
      return;
    }
    const id = window.setTimeout(() => setLinger(null), 80);
    return () => window.clearTimeout(id);
  }, [linger, wrecking]);
  // Per the user: a beaten ship that is still in one piece (Game.wreck) keeps its panel until the jump, so crew still
  // aboard can be teleported back (after a surrender, say).
  const wreck = !game.enemy && !linger ? (game.wreck ?? null) : null;
  const displayEnemy = game.enemy ?? linger ?? wreck;
  const showTarget =
    !!displayEnemy &&
    (linger != null ||
      (!chart && (game.phase === "combat" || game.phase === "event" || (wreck != null && (game.phase === "map" || game.phase === "reward")))));
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
  const cancelAim = () => {
    clearAims();
    act((g) => cancelTargeting(g));
  };
  // Per the user: the ship's break-up plays before the reward or victory card (the card waits while `linger` holds the
  // exploding hull on screen).
  const cardUp =
    linger == null &&
    ((game.phase === "event" && !!game.event) ||
    game.phase === "store" ||
    (game.phase === "reward" && !!game.reward) ||
    game.phase === "victory" ||
    game.phase === "defeat" ||
    !!pendingOverflow(game));
  const card = cardUp ? (
    <>
      {/* A make-room choice is answered first; the card it came from waits under it. */}
      {game.phase === "event" && game.event && !pendingOverflow(game) ? <EventModal game={game} /> : null}
      {game.phase === "store" ? <StoreBoard game={game} /> : null}
      {game.phase === "reward" && game.reward && !pendingOverflow(game) ? <RewardModal game={game} /> : null}
      {pendingOverflow(game) ? <MakeRoomModal game={game} /> : null}
      {game.phase === "victory" || game.phase === "defeat" ? (
        <div className="modal-layer verdict-layer">
          <Verdict game={game} />
        </div>
      ) : null}
    </>
  ) : null;
  return (
    <div
      className={`play${showTarget ? "" : " no-target"}${game.targeting || hackAiming || slingOn || leashOn ? " is-targeting" : ""}${hackAiming ? " is-hack-targeting" : ""}${slingOn ? " is-sling-targeting" : ""}${leashOn ? " is-leash-targeting" : ""}`}
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        const t = e.target as Element | null;
        if (t?.closest("button, a, input, textarea, select")) return;
        armHold(e, cancelAim);
      }}
      onClick={(e) => {
        if (swallowHoldClick(e)) return;
        const t = e.target as Element | null;
        // Per the user: with crew selected, a tap that is not a crew order (on a weapon, a power bar, a button, empty
        // space) drops the selection. Crew orders and picks stay: rooms, crew sprites, the crew list (with its
        // save/return buttons), door bars on the hull, and the room radial menu. Bubble phase, so the click that ends
        // a drag-select (the hull swallows it) does not undo that selection.
        if (t && selectedIds(useGame.getState().game).length && !t.closest(".crew-rail, [data-room], .token, .door-tick, .radial-shade")) {
          act((g) => selectCrewIds(g, []));
        }
        // Per the user: with a weapon armed, a tap on the ship stage or the target panel that is not a room (rooms aim,
        // and aim clears an invalid one) clears that weapon's designated target. Buttons elsewhere (HUD, dock) do not.
        if (!useGame.getState().game.targeting || !t) return;
        if (!t.closest(".stage-slot, .target-panel")) return;
        if (t.closest("[data-room], button, a, input")) return;
        act((g) => cancelTargeting(g));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (holdTookContext(e.currentTarget)) return;
        // Hacking wiki: hack targeting "works much the same as targeting your weapons"; right click cancels both.
        cancelAim();
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
      </div>
      {showTarget && displayEnemy ? (
        <TargetPanel game={game} enemy={displayEnemy} hackAiming={hackAiming} slingAiming={slingOn} leashAiming={leashOn} />
      ) : null}
      <Dock game={game} hackAiming={hackAiming} />
      {card}
    </div>
  );
}

function Hud({ game }: { game: Game }) {
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player, zoltanBars(game.crew, game.player, "player", "shields")), bubbles, 1);
  const spool = ftlSeconds(game, game.player);
  // Per the user: the drive is not ready while Piloting is down or empty or the Engines are unpowered (sim jumpBlocked,
  // the same check commitJump makes). The state then names the reason instead of CHARGING or READY.
  const blocked = jumpBlocked(game);
  const blockedWord = !blocked ? "" : blocked.startsWith("Nobody") ? tx("ui.GameApp.no-pilot") : blocked.startsWith("Piloting") ? tx("ui.GameApp.pilot-down") : tx("ui.GameApp.no-engines");
  const charging = !blocked && game.phase === "combat" && game.flee < 1;
  const ready = !blocked && game.phase === "combat" && game.flee >= 1 && !game.picking;
  const shieldFill = shieldChargeShown(game);
  // Environmental Hazards / Ship / Backup Battery: IN DANGER keeps the ship info screen closed.
  const infoLocked = shipInDanger(game);
  return (
    <header className="hud">
      <div className="hud-left">
        <div className="hull-row">
          <span className="hud-word">{tx("ui.GameApp.hull")}</span>
          <div className="hull-segs" aria-label={tx("ui.GameApp.hull-of", { hull: game.player.hull, hullMax: game.player.hullMax })}>
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
          <span className="hud-word hud-shields">{tx("ui.GameApp.shields")}</span>
          <span className="bubbles" aria-label={`${bubbles} shield bubbles`}>
            {Array.from({ length: cap }, (_, i) => (
              <i key={i} className={i < bubbles ? "on" : ""} />
            ))}
          </span>
          {/* Per the user: how far the next shield layer has charged, beside the count. Empty when none is charging. */}
          <span className="shield-charge" role="meter" aria-label={tx("ui.GameApp.shield-charge")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((shieldFill ?? 0) * 100)}>
            <i style={{ width: `${Math.round((shieldFill ?? 0) * 100)}%` }} />
          </span>
          {game.player.zoltan != null ? (
            <span className="bubbles zoltan-pips" aria-label={tx("ui.GameApp.zoltan-shield", { zoltan: game.player.zoltan })}>
              {Array.from({ length: 5 }, (_, i) => (
                <i key={i} className={i < (game.player.zoltan ?? 0) ? "on" : ""} />
              ))}
            </span>
          ) : null}
        </div>
      </div>
      <div className="hud-mid">
        {/* Per the user: pause and fast forward, top middle. While paused, the PAUSED mark takes their place. */}
        {game.userPaused ? (
          <PauseStamp />
        ) : (
          <>
            <button
              type="button"
              className="frame-btn pause-btn"
              aria-label={tx("ui.GameApp.pause")}
              title={tx("ui.GameApp.pause-space")}
              disabled={!["combat", "map", "event", "store", "reward"].includes(game.phase)}
              onClick={() => act((g) => togglePause(g))}
            >
              <PixelIcon name="pause" size={34} />
            </button>
            <FastButton />
          </>
        )}
      </div>
      <div className="hud-right">
        {/* Per the user: fuel sits beside the FTL Drive it feeds. */}
        <span className={`count-chip hud-fuel${game.fuel < 1 ? " is-empty" : ""}`} aria-label={`${game.fuel} fuel`} title={tx("ui.GameApp.fuel")}>
          <PixelIcon name="fuel" />
          {game.fuel}
        </span>
        <button
          type="button"
          className={`ftl-drive${blocked ? " is-blocked" : charging ? " is-charging" : " is-ready"}`}
          disabled={game.phase === "combat" && game.flee < 1}
          title={jumpBlocked(game) ?? (spool == null ? tx("ui.GameApp.ftl-needs-a-pilot-or-engines") : tx("ui.GameApp.about-seconds-at-this-engine-power", { round: Math.round(spool), fuel: game.fuel }))}
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
          <span className="ftl-kicker">{tx("ui.GameApp.ftl-drive")}</span>
          <span className={`ftl-jump${charging ? " is-reserve" : ""}`} aria-hidden={charging || undefined}>
            {tx("ui.GameApp.jump")}
          </span>
          <span className="ftl-meter">
            <i style={{ width: `${Math.round((game.phase === "combat" ? game.flee : blocked ? 0 : 1) * 100)}%` }} />
          </span>
          <em className="ftl-state">
            <span className={charging ? undefined : "is-reserve"} aria-hidden={charging ? undefined : true}>
              {tx("ui.GameApp.charging")}
            </span>
            <span className={!blocked && !charging ? undefined : "is-reserve"} aria-hidden={!blocked && !charging ? undefined : true}>
              {tx("ui.GameApp.ready")}
            </span>
            <span className={blocked ? "ftl-blocked" : "is-reserve"} aria-hidden={blocked ? undefined : true}>
              {blockedWord || tx("ui.GameApp.no-pilot")}
            </span>
          </em>
        </button>
        {shipInDanger(game) || game.pulsarWarned ? (
          <div className="hud-alerts">
            <p className={`danger-mark${shipInDanger(game) ? "" : " is-reserve"}`} role="status" aria-hidden={shipInDanger(game) ? undefined : true}>
              {tx("ui.GameApp.danger")}
            </p>
            <p className={`hazard-mark${game.pulsarWarned ? "" : " is-reserve"}`} role="status" aria-hidden={game.pulsarWarned ? undefined : true}>
              {tx("ui.GameApp.ion-pulse-imminent")}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          className="frame-btn"
          aria-label={game.picking ? tx("ui.GameApp.back-to-the-ship") : tx("ui.GameApp.ship")}
          title={infoLocked && !game.picking ? tx("ui.GameApp.in-danger") : undefined}
          disabled={infoLocked && !game.picking}
          onClick={() =>
            act((g) => {
              if (g.picking) g.picking = false;
              else openShipMenu(g, "crew");
            })
          }
        >
          <PixelIcon name="ship" size={20} />
        </button>
        {/* Per the user: the wrench opens Options (graphics, sound, keyboard). Upgrades stay in the ship menu (U). */}
        <button type="button" className="frame-btn" aria-label={tx("ui.GameApp.options")} title={tx("ui.GameApp.options")} onClick={() => useOptionsOpen.setState({ open: true })}>
          <PixelIcon name="upgrade" size={20} />
        </button>
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
        <span title={tx("ui.GameApp.evasion")}>
          <PixelIcon name="evade" />
          {tx("ui.GameApp.evade")}{evasionPercent(game, game.player, "player")}%
        </span>
        <span title={tx("ui.GameApp.oxygen")} className={air < 25 ? "is-o2-low" : undefined}>
          <PixelIcon name="oxygen" />
          {tx("ui.GameApp.oxygen-2")}{air}%
        </span>
        {air < 25 ? <strong className="o2-alarm">{tx("ui.GameApp.o2-low")}</strong> : null}
      </div>
      {crew.map((c) => (
        <div key={c.id} className={`crew-card${selectedIds(game).includes(c.id) ? " is-selected" : ""}${(c.leashed ?? 0) > 0 ? " is-leashed" : ""}`}>
          <button
            type="button"
            className="crew-card-hit"
            onClick={(e) => act((g) => selectCrew(g, c.id, e.shiftKey ? "toggle" : "replace"))}
          >
            <Portrait crew={c} />
            <span>
              <strong>{c.name}</strong>
              <i className="hp">
                <b style={{ width: `${Math.max(0, Math.min(100, (c.hp / Math.max(1, c.maxHp)) * 100))}%` }} />
              </i>
            </span>
          </button>
          {(c.leashed ?? 0) > 0 ? (
            <button type="button" className="lock-pip" aria-label={tx("ui.GameApp.free-from-mind-control")} onClick={() => act((g) => startLeash(g, c.id))}>
              {tx("ui.GameApp.mc")}
            </button>
          ) : null}
          {c.kin === "shard" ? (
            <button
              type="button"
              className="lock-pip"
              aria-label={tx("ui.GameApp.lockdown")}
              disabled={(c.lockCool ?? 0) > 0}
              onClick={() => act((g) => lockdown(g, c.id))}
            >
              {(c.lockCool ?? 0) > 0 ? Math.ceil(c.lockCool ?? 0) : null}
            </button>
          ) : null}
        </div>
      ))}
      {/* The controls list's Save Stations (/) and Return to Stations (Return), as buttons under the crew (per the user). */}
      <div className="station-btns">
        <button
          type="button"
          className="text-btn"
          aria-label={tx("ui.GameApp.save-stations")}
          title={tx("ui.GameApp.save-where-every-crew-member-stands")}
          onClick={() => act((g) => saveStations(g))}
        >
          {tx("ui.GameApp.save")}
        </button>
        <button
          type="button"
          className="text-btn"
          aria-label={tx("ui.GameApp.return-to-stations")}
          title={tx("ui.GameApp.send-the-crew-back-to-their")}
          disabled={!crew.some((c) => c.station)}
          onClick={() => act((g) => returnToStations(g))}
        >
          {tx("ui.GameApp.return")}
        </button>
      </div>
      {/* Clone Bay, Overview: "Portraits of the crew in the cloning queue are shown above the system icon. Up to 3
          portraits are shown; ... the 3rd portrait is substituted by the "+number" of other crew in the queue." Shown
          here under the live crew, head of the queue first. */}
      {clones ? (
        <div className="clone-queue" role="status" title={tx("ui.GameApp.clone-bay-queue-first-in-line")}>
          <p className="clone-queue-head">
            <PixelIcon name="cradle" size={16} />
            {tx("ui.GameApp.cloning")}{clones.seconds}s
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

function crewOn(game: Game, aboard: "player" | "enemy"): boolean {
  return selectedIds(game).some((id) => {
    const c = game.crew.find((x) => x.id === id);
    return !!c && c.side === "player" && c.hp > 0 && c.aboard === aboard;
  });
}

function bombAiming(game: Game): boolean {
  if (!game.targeting) return false;
  const w = game.player.weapons.find((item) => item.uid === game.armed);
  return WEAPONS[w?.defId ?? ""]?.kind === "bomb";
}

/**
 * Per the user: dropping a cloak plays a short release flicker. True for that moment after `cloaked` goes false
 * (room-motion.css cloak-release).
 */
function useDecloak(cloaked: boolean): boolean {
  const [releasing, setReleasing] = useState(false);
  const was = useRef(cloaked);
  useEffect(() => {
    if (was.current && !cloaked) {
      setReleasing(true);
      const t = window.setTimeout(() => setReleasing(false), 500 / Math.max(0.1, animSpeed()));
      was.current = cloaked;
      return () => window.clearTimeout(t);
    }
    was.current = cloaked;
    setReleasing(false);
  }, [cloaked]);
  return releasing;
}

function cloakClass(cloaked: boolean, releasing: boolean): string {
  return cloaked ? " is-cloaked" : releasing ? " is-decloaking" : "";
}

function ShipStage({ game, shake }: { game: Game; shake?: { transform: string } }) {
  const veil = game.player.kits.veil;
  const cloaked = !!veil?.on && veil.left > 0;
  const releasing = useDecloak(cloaked);
  const intruders = game.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
  const bubbles = game.player.shieldNow;
  const cap = Math.max(maxBubbles(game.player, zoltanBars(game.crew, game.player, "player", "shields")), 1);
  const sight = shipSight(game);
  return (
    <div className={`sky${cloakClass(cloaked, releasing)}`} style={shake}>
      <div className="planet" />
      <div className="shield-aura" style={{ opacity: 0.18 + 0.55 * (bubbles / cap) }} />
      {(game.player.zoltan ?? 0) > 0 ? <div className="shield-aura zoltan-aura" /> : null}
      <ShipView
        ship={game.player}
        healing={healingIds(game, game.player, "player")}
        plateId={game.hullId}
        faction={(game.hullId ?? "kestrel").split("-")[0]}
        facing="right"
        crew={game.crew}
        aboard="player"
        showCrew
        seen={(id) => sight.interior("player", id)}
        crewLit={(c) => sight.showCrew(c)}
        selectedId={game.selected}
        selectedIds={selectedIds(game)}
        ventMode={game.mode === "vent"}
        targetable={bombAiming(game)}
        markDest={crewOn(game, "player")}
        doorsDead={playerDoorsLocked(game)}
        onRoom={(id, _point, how) => {
          if (game.targeting) {
            act((g) => aim(g, id));
            return;
          }
          // A touch on your own room orders the selected crew. A mouse click still does not.
          if (how?.touch && crewOn(game, "player")) act((g) => orderSelected(g, id, "player"));
        }}
        onRoomMenu={(id) => {
          if (crewOn(game, "player")) act((g) => orderSelected(g, id, "player"));
          else {
            clearAims();
            act((g) => cancelTargeting(g));
          }
        }}
        onCrew={(id, shift) => act((g) => selectCrew(g, id, shift ? "toggle" : "replace"))}
        onDragCrew={(ids) => act((g) => selectCrewIds(g, ids))}
        onMenuHold={setMenuHold}
        roomPower={(id, close) => radialPanel(game, id, close)}
        onDoor={(a, b) => act((g) => toggleDoor(g, a, b))}
        aims={aimMarks(game)}
        droneHp={roomDroneHp(game.player, game)}
      />
      {intruders ? (
        <p className="intruder-warn">
          {tx("ui.GameApp.warning")}
          <br />
          {tx("ui.GameApp.intruders")}
          <br />
          {tx("ui.GameApp.detected")}
        </p>
      ) : null}
      <p className="log-line sky-log">{game.log[0]}</p>
    </div>
  );
}

/** Beam (Weapons): the aiming line is the printed tile length of the armed gun. */
function armedBeamReach(game: Game): number | null {
  if (!game.targeting || !game.beamAnchor) return null;
  const armed = game.player.weapons.find((w) => w.uid === game.armed);
  return beamTileLength(armed?.defId);
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

function TargetPanel({
  game,
  enemy,
  hackAiming,
  slingAiming,
  leashAiming,
}: {
  game: Game;
  enemy: Ship;
  hackAiming: boolean;
  slingAiming: boolean;
  leashAiming: boolean;
}) {
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
  const releasing = useDecloak(cloaked);
  const sight = shipSight(game);
  // Clone Bay, Overview: "Portraits of the crew in the cloning queue are shown above the system icon." Shown here as a
  // countdown on the head clone plus the queue size. Hidden while cloaked, like the interior.
  const clones = cloaked && !ownAboard ? null : enemyCloneQueue(game);
  const sensors = playerSensorLevel(game);
  // Hull and shields are not on the Sensors list (Sensors, "Overview" names interiors, weapon charge, and system detail),
  // so they always show. INFERRED: the same 30-segment bar as your own hull.
  const foeBubbles = enemy.shieldNow;
  const foeCap = Math.max(maxBubbles(enemy, zoltanBars(game.crew, enemy, "enemy", "shields")), foeBubbles, 0);
  return (
    <aside className="target-panel">
      <div className="target-head">
        <span className="target-flag">{tx("ui.GameApp.target")}</span>
        <div>
          <p className="target-id">
            <span className="line-stack">
              <span className={vision?.evasion != null ? "is-reserve" : undefined} aria-hidden={vision?.evasion != null || undefined}>
                {tx("ui.GameApp.class")}{enemy.name}
              </span>
              <span
                className={`hack-evasion${vision?.evasion != null ? "" : " is-reserve"}`}
                title={vision?.evasion != null ? tx("ui.GameApp.hacking-drone-on", { v: hack?.label ?? vision.system }) : undefined}
                aria-hidden={vision?.evasion != null ? undefined : true}
              >
                {tx("ui.GameApp.evasion-2")}<DigitSlot value={vision?.evasion ?? 0} sample={100} />%
              </span>
            </span>
          </p>
          {/* Per the user: a ship that is no longer fighting us (sim.ts truce) reads Neutral. */}
          <p>{tx("ui.GameApp.relationship")}{truce(game) && enemy === game.wreck ? tx("ui.GameApp.neutral") : tx("ui.GameApp.hostile")}</p>
          {escape ? (
            <p className={`escape-line${escape.stalled ? " is-stalled" : ""}`} role="status">
              <span className="line-stack">
                <span className={escape.stalled ? "is-reserve" : undefined} aria-hidden={escape.stalled || undefined}>
                  {tx("ui.GameApp.ftl-charging")}<DigitSlot value={escape.left} sample={LAST_FUEL_SECONDS * 2} />s
                </span>
                <span className={escape.stalled ? undefined : "is-reserve"} aria-hidden={escape.stalled ? undefined : true}>
                  {tx("ui.GameApp.ftl-stalled")}
                </span>
              </span>
            </p>
          ) : null}
          {hack && (hack.latched || hack.state === "pulse") && hack.label ? (
            <p className={`hack-line${hack.state === "pulse" ? " is-pulse" : ""}`} role="status">
              <span className="line-stack">
                <span className={hack.state === "pulse" ? "is-reserve" : undefined} aria-hidden={hack.state === "pulse" || undefined}>
                  {tx("ui.GameApp.hacked")}{hack.label.toUpperCase()}
                </span>
                <span className={hack.state === "pulse" ? undefined : "is-reserve"} aria-hidden={hack.state === "pulse" ? undefined : true}>
                  {tx("ui.GameApp.hacked")}{hack.label.toUpperCase()} · <DigitSlot value={Math.ceil(hack.left)} sample={10} />s
                </span>
              </span>
            </p>
          ) : null}
          {clones ? (
            <p className={`clone-line${clones.offline ? " is-offline" : ""}`} role="status">
              <span className="line-stack">
                <span className={clones.offline ? undefined : "is-reserve"} aria-hidden={clones.offline ? undefined : true}>
                  {tx("ui.GameApp.cloning-halted")}
                </span>
                <span className={clones.offline ? "is-reserve" : undefined} aria-hidden={clones.offline || undefined}>
                  {tx("ui.GameApp.cloning")}<DigitSlot value={clones.seconds} sample={CLONE_SECONDS_WIDE} />s
                  <span className={clones.count > 1 ? undefined : "is-reserve"} aria-hidden={clones.count > 1 ? undefined : true}>
                    {" "}
                    +<DigitSlot value={Math.max(0, clones.count - 1)} sample={CLONE_EXTRA_WIDE} />
                  </span>
                </span>
              </span>
            </p>
          ) : null}
          {game.targeting && game.beamAnchor && !hackAiming ? (
            <p className="beam-hint">{tx("ui.GameApp.click-the-end-of-the-beam")}</p>
          ) : null}
        </div>
      </div>
      <div className="foe-vitals">
        <div className="hull-row">
          <span className="hud-word">{tx("ui.GameApp.hull")}</span>
          <div className="hull-segs" aria-label={tx("ui.GameApp.enemy-hull-of", { hull: enemy.hull, hullMax: enemy.hullMax })}>
            {Array.from({ length: Math.min(30, enemy.hullMax) }, (_, i) => (
              <i key={i} className={i < Math.round((enemy.hull / Math.max(1, enemy.hullMax)) * Math.min(30, enemy.hullMax)) ? "on" : ""} />
            ))}
          </div>
          <b className="foe-hull-num">{Math.max(0, Math.ceil(enemy.hull))}</b>
        </div>
        <div className="store-row">
          <span className="hud-word hud-shields">{tx("ui.GameApp.shields")}</span>
          {foeCap > 0 ? (
            <span className="bubbles" aria-label={tx("ui.GameApp.enemy-shield-bubbles", { foeBubbles: foeBubbles })}>
              {Array.from({ length: foeCap }, (_, i) => (
                <i key={i} className={i < foeBubbles ? "on" : ""} />
              ))}
            </span>
          ) : (
            <span className="foe-none">{tx("ui.GameApp.none")}</span>
          )}
          {(enemy.zoltan ?? 0) > 0 ? (
            <span className="bubbles zoltan-pips" aria-label={tx("ui.GameApp.enemy-zoltan-shield", { zoltan: enemy.zoltan })}>
              {Array.from({ length: Math.max(enemy.zoltan ?? 0, 0) }, (_, i) => (
                <i key={i} className="on" />
              ))}
            </span>
          ) : null}
        </div>
      </div>
      {/* Tiles shrink so the rooms and the one-tile hull plate fit the panel. */}
      {/* @agent:flagship. The 10-row Rebel Flagship cutaway also needs a height bound. */}
      <div className={`target-body${cloakClass(cloaked, releasing)}`} style={{ ["--foe-tile" as string]: `${Math.max(14, Math.min(44, Math.floor(300 / (enemy.cols + 2)) - 2, Math.floor(260 / (enemy.rows + 2)) - 2))}px` }}>
        <ShipView
          ship={enemy}
          healing={healingIds(game, enemy, "enemy")}
          plateId={enemy.flagship ? `flagship-${enemy.flagship.stage}` : enemy.classId}
          faction={enemy.flagship ? "rebel" : enemy.faction}
          pirate={enemy.pirate}
          facing="left"
          crew={game.crew}
          aboard="enemy"
          showCrew
          seen={(id) => sight.interior("enemy", id)}
          crewLit={(c) => sight.showCrew(c)}
          selectedId={game.selected}
          selectedIds={selectedIds(game)}
          ventMode={false}
          targetable
          markDest={crewOn(game, "enemy")}
          onRoom={(id, point) => {
            if (hackAiming) hackRoomClick(id);
            else if (slingAiming) slingRoomClick(id);
            else act((g) => aim(g, id, point));
          }}
          onRoomMenu={(id) => {
            if (crewOn(game, "enemy")) act((g) => orderSelected(g, id, "enemy"));
            else {
              clearAims();
              act((g) => cancelTargeting(g));
            }
          }}
          onCrew={(id, shift) => {
            if (leashAiming) {
              act((g) => startLeash(g, id));
              setLeashAim(false);
              return;
            }
            const body = game.crew.find((c) => c.id === id);
            if (body?.side === "player") act((g) => selectCrew(g, id, shift ? "toggle" : "replace"));
          }}
          onDragCrew={(ids) => act((g) => selectCrewIds(g, ids))}
          onMenuHold={setMenuHold}
          aims={aimMarks(game)}
          beamAnchor={game.targeting && !hackAiming ? game.beamAnchor : null}
          beamReach={game.targeting && !hackAiming ? armedBeamReach(game) : null}
          beamLines={beamLinesOf(game)}
          hackMark={hackMark}
          hackPick={hackAiming ? (id) => spikeRoomTargetable(game, id) : undefined}
          droneHp={roomDroneHp(enemy, game)}
        />
        {cloaked ? <p className="cloak-tag">{tx("ui.GameApp.cloaked")}</p> : null}
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
          const full = vision?.system === id || sensors >= 4;
          const tip = full
            ? `${sensorSystemDetail(enemy, id, SYS_LABEL[id], shown)}${vision?.system === id ? tx("ui.GameApp.hacking-drone") : ""}`
            : SYS_LABEL[id];
          // Below Sensors 4 only the icon shows: "level, power usage, ion damage" are level 4 information.
          // INFERRED: a damaged or destroyed system's icon is still tinted; the page does not hide damage.
          const harm = sys.damage >= sys.level && sys.level > 0 ? "is-broken" : sys.damage > 0 ? "is-damaged" : "";
          return (
            <span key={id} title={tip} className={[vision?.system === id ? "is-hack-seen" : "", harm].filter(Boolean).join(" ") || undefined}>
              <PixelIcon name={id} size={16} />
              {full ? <b>{shown}</b> : null}
            </span>
          );
        })}
        {/* @agent:flagship. "Each located in its own room": one artillery chip per gun (wiki/flagship-systems.ts). */}
        {artilleryView(enemy).map((a) => {
          const name = WEAPONS[a.defId]?.name ?? a.defId;
          return (
            <span key={a.room} title={`${name} artillery ${a.bars} of ${a.level}${a.ion ? tx("ui.GameApp.ion", { ion: a.ion }) : ""}`}>
              <PixelIcon name="weapons" size={16} />
              <small>{name.replace(/^Boss /, "").slice(0, 3).toUpperCase()}</small>
              <b>{a.bars}</b>
            </span>
          );
        })}
        {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
          const kit = enemy.kits[id];
          if (!kit) return null;
          const fullKit = vision?.system === id || sensors >= 4;
          return (
            <span
              key={id}
              title={`${KIT_LABEL[id]}${fullKit ? ` ${kit.level}` : ""}${vision?.system === id ? tx("ui.GameApp.hacking-drone") : ""}`}
              className={[kit.on ? "is-on" : "", vision?.system === id ? "is-hack-seen" : ""].filter(Boolean).join(" ") || undefined}
            >
              <PixelIcon name={id} size={16} />
              {fullKit ? <b>{kit.level}</b> : null}
            </span>
          );
        })}
      </div>
      {sensors >= 3 ? (
        <div className="foe-charges" aria-label={tx("ui.GameApp.enemy-weapon-charge")}>
          {enemy.weapons.map((w) => {
            const name = WEAPONS[w.defId]?.name ?? w.defId;
            const pips = 7;
            const filled = Math.round(weaponChargeShown(w) * pips);
            const cap = chargerCap(w.defId);
            const bank = cap != null ? tx("ui.GameApp.of-shots", { v: w.loaded ?? 0, cap: cap }) : "";
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
  const droneSlots = playerDroneSlots(swarm);
  // Per the user: with Drone Control installed, WEAPONS and DRONES are tabs that switch the one tray shown.
  const [tab, setTab] = useState<"weapons" | "drones">("weapons");
  const shown = swarm ? tab : "weapons";
  // @agent:combat-ui. The enemy hacking drone on a roomless player kit (ui-views.ts).
  const hackedKit = hackedPlayerKit(game);
  const kitPod = (id: KitId) => {
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
      ? tx("ui.GameApp.hacked-cannot-cloak", { v: KIT_LABEL[id] })
      : hacked
        ? tx("ui.GameApp.hacking-drone-attached", { v: KIT_LABEL[id], v2: hacked === "pulse" ? " (pulse)" : "" })
        : id === "sling"
          ? away
            ? tx("ui.GameApp.teleporter-recall-crew")
            : tx("ui.GameApp.teleporter-send-crew")
          : id === "leash"
            ? tx("ui.GameApp.mind-control-pick-a-crewmember")
            : KIT_LABEL[id];
    const powered = id === "veil" || id === "sling" || id === "leash";
    return (
      <span key={id} className="sub-pod">
        {powered ? (
          <KitPowerButton game={game} id={id} />
        ) : (
          <i className="sub-bars" aria-hidden="true">
            {Array.from({ length: Math.max(kit.level, 1) }, (_, n) => (
              <KitBar key={n} game={game} id={id} kit={kit} n={n} />
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
  };

  return (
    <footer className="dock">
      <div className="power-dock">
        <span className="spare-pip" title={tx("ui.GameApp.reactor-bars-not-assigned")}>
          <DigitSlot value={sparePower(game.player)} sample={29} />
        </span>
        {batterySpareBars(game.player) > 0 ? (
          <i className="spare-bonus" aria-hidden="true" title={tx("ui.GameApp.backup-battery-bars")}>
            {Array.from({ length: batterySpareBars(game.player) }, (_, i) => (
              <b key={i} />
            ))}
          </i>
        ) : null}
        {MAIN_ORDER.map((id) =>
          isKitId(id) ? (
            kitPod(id)
          ) : game.player.systems[id].level > 0 ? (
            <PowerStack key={id} game={game} id={id} locked={id === "weapons" && weaponsPowerLocked(game)} />
          ) : null,
        )}
      </div>
      <div className="weapon-dock">
        {shown === "weapons" ? (
        <div className="gun-tray" role={swarm ? "tabpanel" : undefined}>
          {game.player.weapons.map((w, index) => {
            const def = WEAPONS[w.defId];
            const live = w.enabled && mask[index];
            const auto = slotAutofire(game, w);
            const pips = 7;
            const filled = Math.round(weaponChargeShown(w) * pips);
            const name = def?.name ?? w.defId;
            const cap = chargerCap(w.defId);
            const bank = cap != null ? tx("ui.GameApp.of-shots-2", { v: w.loaded ?? 0, cap: cap }) : "";
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
                aria-label={`${name}.${bank} ${w.enabled ? tx("ui.GameApp.powered") : tx("ui.GameApp.depowered")}. ${auto ? tx("ui.GameApp.autofire-on") : tx("ui.GameApp.autofire-off")}.`}
                onPointerDown={(e) => {
                  guns.onPointerDown(index, e);
                  armHold(e, () => act((g) => depowerWeapon(g, w.uid)));
                }}
                onPointerMove={guns.onPointerMove}
                onPointerUp={guns.onPointerUp}
                onClickCapture={(e) => {
                  if (swallowHoldClick(e)) return;
                  guns.onClickCapture(e);
                }}
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
                  if (holdTookContext(e.currentTarget)) return;
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
                      {auto ? tx("ui.GameApp.auto") : ""}
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
          {/* Per the user: autofire sits at the end of the weapon row, the size of a weapon slot. */}
          <button
            type="button"
            className={`gun-slot autofire-slot${game.autofireAll ? " is-on" : ""}`}
            aria-pressed={!!game.autofireAll}
            title={tx("ui.GameApp.autofire-every-weapon")}
            onClick={() => act((g) => toggleAutoAll(g))}
          >
            <span className="autofire-word">{tx("ui.GameApp.autofire")}</span>
            <span className="autofire-state">{game.autofireAll ? tx("ui.GameApp.on") : tx("ui.GameApp.off")}</span>
          </button>
        </div>
        ) : null}
        {shown === "drones" ? (
          <div className="gun-tray drone-tray is-tabbed" role="tabpanel">
            {droneSlots.map((kind, index) => {
              const key = droneKeyOf(kind);
              const name = key ? DRONE_LOOKS[key].name : kind;
              const dragging = drones.from === index;
              const drop = drones.over === index && drones.from !== index;
              const pairedRepair = (swarm?.loadout?.filter((id) => id === "patch").length ?? 0) > 1;
              const slotDark = !!swarm?.idle && (kind === swarm.target || pairedRepair);
              return (
                <button
                  key={`${kind}-${index}`}
                  type="button"
                  data-tray="drones"
                  data-slot={index}
                  draggable={false}
                  className={`gun-slot${slotDark ? " is-dark" : ""}${dragging ? " is-dragging" : ""}${drop ? " is-drop" : ""}`}
                  aria-label={`${name} drone slot ${index + 1}${slotDark ? tx("ui.GameApp.depowered-2") : ""}`}
                  onPointerDown={(e) => {
                    drones.onPointerDown(index, e);
                    armHold(e, () => act((g) => depowerDrone(g)));
                  }}
                  onPointerMove={drones.onPointerMove}
                  onPointerUp={drones.onPointerUp}
                  onClickCapture={(e) => {
                    if (swallowHoldClick(e)) return;
                    drones.onClickCapture(e);
                  }}
                  onClick={() => {
                    // Drone Control, Overview: clicking the schematic activates that drone.
                    act((g) => activateDroneSlot(g, index));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (holdTookContext(e.currentTarget)) return;
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
        {/* Per the user: missiles beside WEAPONS and drone parts beside DRONES (beside WEAPONS when there is no Drone
            Control, since hacking spends them too). */}
        {swarm ? (
          <div className="dock-caption dock-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={shown === "weapons"}
              className={`dock-label dock-tab${shown === "weapons" ? " is-on" : ""}`}
              onClick={() => setTab("weapons")}
            >
              {tx("ui.GameApp.weapons")}
              <MissileChip game={game} />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={shown === "drones"}
              className={`dock-label dock-tab${shown === "drones" ? " is-on" : ""}`}
              onClick={() => setTab("drones")}
            >
              {tx("ui.GameApp.drones")}
              <PartsChip game={game} />
            </button>
          </div>
        ) : (
          <div className="dock-caption">
            <span className="dock-label">
              {tx("ui.GameApp.weapons")}
              <MissileChip game={game} />
              <PartsChip game={game} />
            </span>
          </div>
        )}
      </div>
      <div className="sub-dock">
        <div className="sub-row">
          {(["pilot", "sensors", "doors"] as SysId[]).map((id) => {
            const sys = game.player.systems[id];
            const orb = (
              <button
                type="button"
                className={`sub-orb${id === "doors" && game.mode === "vent" ? " is-on" : ""}`}
                aria-label={id === "doors" ? tx("ui.GameApp.doors") : SYS_LABEL[id]}
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
                  {Array.from({ length: Math.max(sys.level, 1) }, (_, n) => {
                    const up = sys.level - sys.damage;
                    const cls = n < up ? "on" : n === up && sys.damage > 0 ? "is-dmg is-fixing" : n < sys.level ? "is-dmg" : "";
                    const hurt = n === up - 1 ? hurtStyle(game, id) : undefined;
                    return (
                      <b
                        key={n}
                        className={cls + (hurt ? " is-hurting" : "")}
                        style={n === up && sys.damage > 0 ? fixStyle(sys.fix) : hurt}
                      />
                    );
                  })}
                </i>
                <PixelIcon name={id} size={16} />
              </button>
            );
            if (id !== "doors") return <span key={id}>{orb}</span>;
            return (
              <span key={id} className="door-pod">
                {game.mode === "vent" ? (
                  <span className="door-pop" role="group" aria-label={tx("ui.GameApp.doors-control-panel")}>
                    <button type="button" aria-label={tx("ui.GameApp.open-the-doors")} onClick={() => act((g) => openAllDoors(g))}>
                      <DoorAllIcon open />
                    </button>
                    <button type="button" aria-label={tx("ui.GameApp.close-the-doors")} onClick={() => act((g) => closeAllDoors(g))}>
                      <DoorAllIcon />
                    </button>
                  </span>
                ) : null}
                {orb}
              </span>
            );
          })}
          {SUB_KITS.map((id) => kitPod(id))}
        </div>
        <span className="dock-label">{tx("ui.GameApp.subsystems")}</span>
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
  const tip = tx("ui.GameApp.hacking-2", { power: view.power, level: view.level, toLowerCase: status.toLowerCase(), v: usable ? `. Click or H to ${verb}` : "" });
  const metered = view.state === "pulse" || view.state === "flying" || view.state === "cooldown";
  const meterPct =
    view.state === "pulse"
      ? Math.max(0, Math.min(1, view.left / Math.max(1, view.pulse))) * 100
      : view.state === "flying"
        ? view.progress * 100
        : view.state === "cooldown"
          ? Math.max(0, Math.min(1, 1 - view.cool / 20)) * 100
          : 0;
  const show = (text: string) => status === text;
  return (
    <div className={`hack-pod is-${aiming ? "aiming" : view.state}`}>
      {fight ? (
        <div className="hack-card" role="status">
          <span className="hack-card-title">
            <PixelIcon name="spike" size={12} />
            {tx("ui.GameApp.hacking-3")}
            <span className="hack-card-pulse line-stack">
              <span className="is-reserve" aria-hidden="true">
                10s pulse
              </span>
              <span className={view.pulse > 0 ? undefined : "is-reserve"} aria-hidden={view.pulse > 0 ? undefined : true}>
                {view.pulse > 0 ? `${view.pulse}s pulse` : "10s pulse"}
              </span>
            </span>
          </span>
          <span className="hack-card-state line-stack">
            <span className={show(tx("ui.GameApp.pick-a-system")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.pick-a-system")) ? undefined : true}>
              {tx("ui.GameApp.pick-a-system")}
            </span>
            <span className={status.startsWith("PULSE ") && status !== "PULSE READY" ? undefined : "is-reserve"} aria-hidden={status.startsWith("PULSE ") && status !== "PULSE READY" ? undefined : true}>
              {tx("ui.GameApp.pulse")}<DigitSlot value={view.left.toFixed(1)} sample="10.0" />s
            </span>
            <span className={status.startsWith("COOLDOWN ") ? undefined : "is-reserve"} aria-hidden={status.startsWith("COOLDOWN ") ? undefined : true}>
              {tx("ui.GameApp.cooldown")}<DigitSlot value={Math.ceil(view.cool)} sample={20} />s
            </span>
            <span className={show(tx("ui.GameApp.pulse-ready")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.pulse-ready")) ? undefined : true}>
              {tx("ui.GameApp.pulse-ready")}
            </span>
            <span className={show(tx("ui.GameApp.launch-on-unpause")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.launch-on-unpause")) ? undefined : true}>
              {tx("ui.GameApp.launch-on-unpause")}
            </span>
            <span className={show(tx("ui.GameApp.drone-stunned")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.drone-stunned")) ? undefined : true}>
              {tx("ui.GameApp.drone-stunned")}
            </span>
            <span className={show(tx("ui.GameApp.drone-held")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.drone-held")) ? undefined : true}>
              {tx("ui.GameApp.drone-held")}
            </span>
            <span className={status.startsWith("DRONE INBOUND ") ? undefined : "is-reserve"} aria-hidden={status.startsWith("DRONE INBOUND ") ? undefined : true}>
              {tx("ui.GameApp.drone-inbound-2")}<DigitSlot value={Math.round(view.progress * 100)} sample={100} />%
            </span>
            <span className={show(tx("ui.GameApp.no-power")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.no-power")) ? undefined : true}>
              {tx("ui.GameApp.no-power")}
            </span>
            <span className={show(tx("ui.GameApp.no-drone-parts")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.no-drone-parts")) ? undefined : true}>
              {tx("ui.GameApp.no-drone-parts")}
            </span>
            <span className={show(tx("ui.GameApp.zoltan-shield-up")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.zoltan-shield-up")) ? undefined : true}>
              {tx("ui.GameApp.zoltan-shield-up")}
            </span>
            <span className={show(tx("ui.GameApp.target-cloaked")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.target-cloaked")) ? undefined : true}>
              {tx("ui.GameApp.target-cloaked")}
            </span>
            <span className={show(tx("ui.GameApp.launch-ready")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.launch-ready")) ? undefined : true}>
              {tx("ui.GameApp.launch-ready")}
            </span>
            <span className={show(tx("ui.GameApp.drone-attached")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.drone-attached")) ? undefined : true}>
              {tx("ui.GameApp.drone-attached")}
            </span>
            <span className={show(tx("ui.GameApp.standby")) ? undefined : "is-reserve"} aria-hidden={show(tx("ui.GameApp.standby")) ? undefined : true}>
              {tx("ui.GameApp.standby")}
            </span>
          </span>
          <i
            className={`hack-meter${view.state === "flying" ? " is-fly" : ""}${view.state === "cooldown" ? " is-cool" : ""}${view.state === "flying" && (view.stunned || view.power < 1) ? " is-held" : ""}${metered ? "" : " is-reserve"}`}
            aria-hidden="true"
          >
            <i style={{ width: `${meterPct}%` }} />
          </i>
          <span className="hack-card-row line-stack">
            <span className="hack-card-target is-reserve" aria-hidden="true">
              <PixelIcon name="target" size={12} />
              {tx("ui.GameApp.backup-battery")}
              <em>in flight</em>
            </span>
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
              <span className={`hack-card-cost${view.parts < 1 ? " is-short" : ""}`} title={tx("ui.GameApp.each-launch-costs-one-drone-part")}>
                <PixelIcon name="parts" size={12} />1 of {view.parts}
              </span>
            )}
          </span>
        </div>
      ) : null}
      <span className="hack-power">
        <button type="button" aria-label={tx("ui.GameApp.remove-power-from-hacking")} title={tx("ui.GameApp.remove-power")} disabled={view.power <= 0} onClick={() => act((g) => lowerSpikePower(g))}>
          <PixelIcon name="minus" size={12} />
        </button>
        <button
          type="button"
          aria-label={tx("ui.GameApp.add-power-to-hacking")}
          title={tx("ui.GameApp.add-power")}
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

function PowerStack({ game, id, locked = false, big = false }: { game: Game; id: SysId; locked?: boolean; big?: boolean }) {
  const sys = game.player.systems[id];
  const cap = Math.max(0, sys.level - sys.damage - sys.ion.length);
  const slots = sys.level;
  const capacity = Math.max(0, sys.level - sys.damage);
  const ionLocked = Math.min(sys.ion.length, capacity);
  const green = Math.max(0, Math.min(sys.power, capacity - ionLocked));
  const painted = batteryBarsOn(game.player, id);
  const live = bars(sys, zoltanBars(game.crew, game.player, "player", id));
  const drag = usePowerDrag((g, n) => setBars(g, id, n), slots, cap);
  return (
    <div className={`power-stack${locked ? " is-locked" : ""}${big ? " is-big" : ""}`}>
      <div className="power-col" {...drag}>
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
                      ? i === dmgStart
                        ? "is-dmg is-fixing"
                        : "is-dmg"
                      : "";
          const hurt = i === dmgStart - 1 ? hurtStyle(game, id) : undefined;
          return (
            <button
              key={i}
              type="button"
              className={cls + (hurt ? " is-hurting" : "")}
              style={i === dmgStart && sys.damage > 0 ? fixStyle(sys.fix) : hurt}
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
      <PowerOrb
        icon={id}
        label={SYS_LABEL[id]}
        onUp={() => act((g) => powerUp(g, id))}
        onDown={() => act((g) => powerDown(g, id))}
      />
    </div>
  );
}

/**
 * Per the user: the system icon under a power column adds a bar on a left click and removes one on a right click (a
 * long press on touch). Systems, "Powering and upgrading systems": "To power a main system, left click on it in the
 * system bar. To unpower it, right click."
 */
function PowerOrb({ icon, label, onUp, onDown }: { icon: IconName; label: string; onUp: () => void; onDown: () => void }) {
  return (
    <button
      type="button"
      className="sys-orb"
      title={label}
      aria-label={tx("ui.GameApp.add-power-right-click-removes", { label: label })}
      onPointerDown={(e) => armHold(e, onDown)}
      onClick={(e) => {
        if (swallowHoldClick(e)) return;
        onUp();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (holdTookContext(e.currentTarget)) return;
        onDown();
      }}
    >
      <PixelIcon name={icon} size={16} />
    </button>
  );
}

/** Room radial menu: the clock holds while it is open (Game.menuHold), apart from the player's pause. */
function setMenuHold(on: boolean) {
  act((g) => {
    g.menuHold = on;
  });
}

/**
 * Per the user: the room radial menu shows an enlarged power control for the room's system. Main systems get their
 * bar column; Cloaking, the Teleporter and Mind Control get their on/off bars, as in the subsystem dock. Spare reactor
 * bars sit on top. Rooms with no power control show nothing.
 */
function RadialPower({ game, roomId }: { game: Game; roomId: string }) {
  const room = game.player.rooms.find((r) => r.id === roomId);
  if (!room || !hasRadialPower(game, roomId)) return null;
  const spare = (
    <span className="spare-pip radial-spare" title={tx("ui.GameApp.reactor-bars-not-assigned")}>
      <DigitSlot value={sparePower(game.player)} sample={29} />
    </span>
  );
  if (room.system && MAIN_BARS.includes(room.system)) {
    const id = room.system;
    return (
      <>
        {spare}
        <div className="radial-power-row">
          <PowerStack game={game} id={id} big locked={id === "weapons" && weaponsPowerLocked(game)} />
          <StepButtons
            label={SYS_LABEL[id]}
            onDown={() => act((g) => powerDown(g, id))}
            onUp={() => act((g) => powerUp(g, id))}
          />
        </div>
      </>
    );
  }
  const kitId = room.kit;
  const kit = kitId ? game.player.kits[kitId] : undefined;
  if (!kitId || !kit || (kitId !== "veil" && kitId !== "sling" && kitId !== "leash")) return null;
  const barKit: BarKit = kitId;
  return (
    <>
      {spare}
      <div className="radial-power-row">
        <KitPowerStack game={game} id={barKit} />
        <StepButtons
          label={KIT_LABEL[barKit]}
          onDown={() => act((g) => kitPowerDown(g, barKit))}
          onUp={() => act((g) => kitPowerUp(g, barKit))}
        />
      </div>
    </>
  );
}

/**
 * Dock power for Cloaking, the Teleporter and Mind Control: one bar per tap (sim kitPowerUp), back to 0 from the top;
 * right-click or a long press removes one bar (Systems: "Pressing the key powers one bar of the system and Shift-<key>
 * unpowers one bar"); a vertical drag sets the level (usePowerDrag).
 */
function KitPowerButton({ game, id }: { game: Game; id: BarKit }) {
  const kit = game.player.kits[id]!;
  const drag = usePowerDrag((g, n) => setKitBars(g, id, n), Math.max(kit.level, 1), Math.max(0, kit.level - (kit.damage ?? 0)));
  return (
    <button
      type="button"
      className="sub-power"
      aria-label={`${KIT_LABEL[id]} power`}
      {...drag}
      onPointerDown={(e) => {
        drag.onPointerDown(e);
        armHold(e, () => act((g) => kitPowerDown(g, id)));
      }}
      onClick={(e) => {
        if (swallowHoldClick(e)) return;
        act((g) => {
          if (!kitPowerUp(g, id)) setKitBars(g, id, 0);
        });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (holdTookContext(e.currentTarget)) return;
        act((g) => kitPowerDown(g, id));
      }}
    >
      <i className="sub-bars" aria-hidden="true">
        {Array.from({ length: Math.max(kit.level, 1) }, (_, n) => (
          <KitBar key={n} game={game} id={id} kit={kit} n={n} />
        ))}
      </i>
    </button>
  );
}

/** The radial panel's enlarged column for those systems: tap a bar to set it, drag to set, like PowerStack. */
function KitPowerStack({ game, id }: { game: Game; id: BarKit }) {
  const kit = game.player.kits[id]!;
  const slots = Math.max(kit.level, 1);
  const cap = Math.max(0, kit.level - (kit.damage ?? 0));
  const drag = usePowerDrag((g, n) => setKitBars(g, id, n), slots, cap);
  return (
    <div className="power-stack is-big">
      <div className="power-col" {...drag}>
        {Array.from({ length: slots }, (_, raw) => {
          const i = slots - 1 - raw;
          const cls = i < kit.power ? kitBarClass(game, id, kit.power, i) : i === cap && kit.damage ? "is-dmg is-fixing" : i >= cap ? "is-dmg" : "";
          const hurt = i === cap - 1 ? hurtStyle(game, id) : undefined;
          return (
            <button
              key={i}
              type="button"
              className={cls + (hurt ? " is-hurting" : "")}
              style={i === cap && kit.damage ? fixStyle(kit.fix) : hurt}
              aria-label={`${KIT_LABEL[id]} power ${i + 1}`}
              onClick={() => {
                if (i >= cap) return;
                const next = i < kit.power ? i : i + 1;
                act((g) => setKitBars(g, id, next));
              }}
            />
          );
        })}
      </div>
      <PowerOrb
        icon={id}
        label={KIT_LABEL[id]}
        onUp={() => act((g) => kitPowerUp(g, id))}
        onDown={() => act((g) => kitPowerDown(g, id))}
      />
    </div>
  );
}

/** True when the room's system has a power control in the radial panel (RadialPower). */
function hasRadialPower(game: Game, roomId: string): boolean {
  const room = game.player.rooms.find((r) => r.id === roomId);
  if (!room) return false;
  if (room.system && MAIN_BARS.includes(room.system)) return true;
  return (room.kit === "veil" || room.kit === "sling" || room.kit === "leash") && !!game.player.kits[room.kit];
}

/**
 * Per the user: the radial panel beside the ring, holding the room's power control and the buttons that run its system
 * (the same actions as the dock). Null when the room has neither, so no empty panel is drawn.
 */
function radialPanel(game: Game, roomId: string, close: () => void): ReactNode {
  const power = hasRadialPower(game, roomId);
  const actions = radialActions(game, roomId, close);
  if (!power && !actions) return null;
  return (
    <>
      {power ? <RadialPower game={game} roomId={roomId} /> : null}
      {actions}
    </>
  );
}

/**
 * The system's own operations, as on the dock: Door System open and close all (two-step), Cloaking, the Backup Battery,
 * the Teleporter (send, or recall crew already aboard), Mind Control and Hacking. Send, Mind Control and Hacking go on
 * to aim at the enemy ship, so they close the menu first. Labels INVENTED.
 */
function radialActions(game: Game, roomId: string, close: () => void): ReactNode {
  const room = game.player.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  const buttons: ReactNode[] = [];
  const add = (key: string, label: string, icon: ReactNode, run: () => void, disabled = false) =>
    buttons.push(
      <button key={key} type="button" className="radial-act" disabled={disabled} onClick={run}>
        {icon}
        <span>{label}</span>
      </button>,
    );
  if (room.system === "doors") {
    add("open", tx("ui.GameApp.open-all"), <DoorAllIcon open />, () => act((g) => openAllDoors(g)), playerDoorsLocked(game));
    add("close", tx("ui.GameApp.close-all"), <DoorAllIcon />, () => act((g) => closeAllDoors(g)), playerDoorsLocked(game));
  }
  const kitId = room.kit;
  const kit = kitId ? game.player.kits[kitId] : undefined;
  if (kitId && kit) {
    const icon = <PixelIcon name={kitId} size={14} />;
    const idle = !kit.on && kit.cool <= 0;
    if (kitId === "veil") add("veil", kit.on ? tx("ui.GameApp.cloaked-2") : tx("ui.GameApp.cloak"), icon, () => act((g) => startVeil(g)), !idle || kitBars(kit) < 1);
    if (kitId === "cell") add("cell", kit.on ? tx("ui.GameApp.boosting") : tx("ui.GameApp.boost"), icon, () => act((g) => startCell(g)), !idle);
    if (kitId === "sling") {
      const away = game.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0);
      add("sling", away ? tx("ui.GameApp.recall") : tx("ui.GameApp.send"), icon, () => {
        if (!away) close();
        slingIconClick();
      }, kit.cool > 0 || kitBars(kit) < 1 || (!away && !game.enemy));
    }
    if (kitId === "leash") add("leash", tx("ui.GameApp.mind-control-2"), icon, () => {
      close();
      leashIconClick();
    }, !idle || kitBars(kit) < 1 || !game.enemy);
    if (kitId === "spike") add("spike", tx("ui.GameApp.hack"), icon, () => {
      close();
      hackIconClick();
    }, !playerHackView(game) || !game.enemy);
  }
  return buttons.length ? <div className="radial-acts">{buttons}</div> : null;
}

/** Per the user: + and - beside the radial power bar step it one bar at a time. */
function StepButtons({ label, onUp, onDown }: { label: string; onUp: () => void; onDown: () => void }) {
  return (
    <span className="radial-steps">
      <button type="button" aria-label={tx("ui.GameApp.add-power-to", { label: label })} title={tx("ui.GameApp.add-power")} onClick={onUp}>
        <PixelIcon name="plus" size={12} />
      </button>
      <button type="button" aria-label={tx("ui.GameApp.remove-power-from", { label: label })} title={tx("ui.GameApp.remove-power")} onClick={onDown}>
        <PixelIcon name="minus" size={12} />
      </button>
    </span>
  );
}

/**
 * Per the user: drag up and down on a power column to set the level. The pointer's bar (counted from the bottom) is
 * the level; below the column is 0. A press that does not move stays a tap on one bar. INVENTED: 4px before a drag
 * starts.
 */
function usePowerDrag(apply: (g: Game, n: number) => void, slots: number, cap: number) {
  const ref = useRef<{ y: number; moving: boolean; last: number } | null>(null);
  const level = (el: HTMLElement, y: number) => {
    // A dock subsystem button draws its bars above itself (.sub-bars); measure those.
    const box = pageRect(el.querySelector(".sub-bars") ?? el);
    if (slots <= 0 || box.height <= 0) return 0;
    const n = Math.ceil((box.bottom - y) / (box.height / slots));
    return Math.max(0, Math.min(cap, n));
  };
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      // A touch drag ends without a click; a new press means the swallow from the last drag is stale.
      swallowNextClick.current = false;
      if (e.button !== 0) return;
      ref.current = { y: toPage(e.clientX, e.clientY).y, moving: false, last: -1 };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const d = ref.current;
      if (!d) return;
      if (!d.moving) {
        if (Math.abs(toPage(e.clientX, e.clientY).y - d.y) < 4) return;
        d.moving = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer may already be up.
        }
      }
      const n = level(e.currentTarget, toPage(e.clientX, e.clientY).y);
      if (n === d.last) return;
      // Per the user (haptics): each bar the drag crosses is felt.
      if (d.last >= 0) buzz("step");
      d.last = n;
      act((g) => apply(g, n));
    },
    onPointerUp: () => {
      const d = ref.current;
      ref.current = null;
      if (d?.moving) swallowNextClick.current = true;
    },
    onPointerCancel: () => {
      ref.current = null;
    },
    onClickCapture: (e: ReactMouseEvent<HTMLElement>) => {
      if (!swallowNextClick.current) return;
      swallowNextClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

/** The click that ends a power drag must not also toggle the bar under the pointer. */
const swallowNextClick = { current: false };

/**
 * Per the user: a card that opens on its own (a surrender offer, the reward after a kill, an arrival event) ignores
 * taps for half a second, so a tap meant for the ship does not answer it. A card that follows the player's own answer
 * (the next page of an event) is not locked. INVENTED timings besides the user's half second.
 */
const ARRIVAL_LOCK_MS = 500;
/** A card this soon after a choice was opened by that choice. */
const CHAIN_MS = 400;
let lastChoiceAt = -Infinity;
let choicesLockedUntil = 0;

function noteChoice() {
  lastChoiceAt = performance.now();
}

function choicesLocked(): boolean {
  return performance.now() < choicesLockedUntil;
}

function useArrivalLock(): boolean {
  const [locked, setLocked] = useState(() => performance.now() - lastChoiceAt > CHAIN_MS);
  useEffect(() => {
    if (!locked) return;
    choicesLockedUntil = performance.now() + ARRIVAL_LOCK_MS;
    const t = window.setTimeout(() => setLocked(false), ARRIVAL_LOCK_MS);
    return () => window.clearTimeout(t);
  }, [locked]);
  return locked;
}

function EventModal({ game }: { game: Game }) {
  const event = game.event;
  if (!event) return null;
  // A new page is a new card, with its own arrival lock.
  return <EventCard key={`${event.title ?? ""}|${event.body}|${event.choices.map((c) => c.id).join(",")}`} game={game} />;
}

function EventCard({ game }: { game: Game }) {
  const locked = useArrivalLock();
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
            <p className="surrender-sub">{tx("ui.GameApp.they-offer")}</p>
            <LootChips scrap={offer.scrap} res={offer} />
            <OfferCards game={game} weapon={offer.weapon} crew={offer.crew} augment={offer.augment} drone={offer.drone} repairs={offer.repairs} />
          </>
        ) : null}
        <div className={`choice-list${locked ? " is-arming" : ""}`}>
          {event.choices.map((c, index) => {
            const why = choiceDisabled(game, c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="choice-line"
                data-phone-action="choice"
                disabled={!!why || locked}
                onClick={() => {
                  noteChoice();
                  act((g) => choose(g, c.id));
                }}
              >
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

type RoomPick = { key: string; name: string; art: ReactNode; note?: string; isNew?: boolean; locked?: string };

/** The rows a make-room choice offers: what is fitted now, then the arriving item. */
function roomPicks(game: Game, item: Overflow): RoomPick[] {
  if (item.kind === "crew") {
    const crew = game.crew.filter((c) => c.side === "player");
    const newest = crew[crew.length - 1]?.id;
    return crew.map((c) => ({
      key: c.id,
      name: c.name,
      art: <CrewFace crew={c} size={40} />,
      note: kinLabel(c.kin),
      isNew: c.id === newest,
      locked:
        c.id === item.keep ? tx("ui.GameApp.just-hired") : canDismiss(game, c.id) ? undefined : c.aboard !== "player" ? tx("ui.GameApp.not-aboard") : tx("ui.GameApp.can-t-leave-now"),
    }));
  }
  // Per the user: a full rack and a full cargo hold: a fitted one of that kind, anything in cargo, or the new one.
  const cargo: RoomPick[] = cargoOf(game).map((c, i) => ({
    key: `c:${i}`,
    name: c.kind === "weapon" ? (WEAPONS[c.id]?.name ?? c.id) : droneName(c.id),
    art: c.kind === "weapon" ? <WeaponArt id={c.id} height={30} /> : <DroneArt kind={droneKeyOf(c.id)} height={30} />,
    note: tx("ui.GameApp.cargo"),
  }));
  if (item.kind === "weapon") {
    return [
      ...game.player.weapons.map((w) => ({ key: w.uid, name: WEAPONS[w.defId]?.name ?? w.defId, art: <WeaponArt id={w.defId} height={30} />, note: tx("ui.GameApp.fitted") })),
      ...cargo,
      { key: "new", name: WEAPONS[item.id]?.name ?? item.id, art: <WeaponArt id={item.id} height={30} />, isNew: true },
    ];
  }
  if (item.kind === "drone") {
    const kit = game.player.kits.swarm;
    const have = kit ? (kit.loadout?.length ? kit.loadout : kit.target ? [kit.target] : []) : [];
    return [
      ...have.map((ref, i) => ({ key: `d:${i}`, name: droneName(ref), art: <DroneArt kind={droneKeyOf(ref)} height={30} />, note: tx("ui.GameApp.fitted") })),
      ...cargo,
      { key: "new", name: droneName(item.id), art: <DroneArt kind={droneKeyOf(item.id)} height={30} />, isNew: true },
    ];
  }
  return [
    ...game.augments.map((id, i) => ({ key: `a:${i}`, name: augmentName(id), art: <PixelIcon name="upgrade" size={28} />, note: augmentDetail(id) })),
    { key: "new", name: augmentName(item.id), art: <PixelIcon name="upgrade" size={28} />, note: augmentDetail(item.id), isNew: true },
  ];
}

const ROOM_TEXT: Record<Overflow["kind"], [string, string]> = {
  // Augmentations: "you must choose one augment to leave behind without receiving any scrap value".
  augment: [tx("ui.GameApp.no-room-for-another-augmentation"), tx("ui.GameApp.a-ship-holds-three-pick-one")],
  // Crew: "the game will require to relieve one of the crewmembers, be it the new one or from the existing crew."
  crew: [tx("ui.GameApp.too-many-crew-aboard"), tx("ui.GameApp.a-ship-holds-eight-pick-one")],
  weapon: [tx("ui.GameApp.no-room-for-another-weapon"), tx("ui.GameApp.every-weapon-slot-and-the-cargo")],
  drone: [tx("ui.GameApp.no-room-for-another-drone-schematic"), tx("ui.GameApp.every-schematic-slot-and-the-cargo")],
};

/**
 * Per the user: the make-room choice (wiki/make-room.ts). Tap one card, then confirm, so one stray tap loses nothing.
 * It opens on its own, so it takes the arrival lock too. INVENTED look, on the offer cards.
 */
function MakeRoomModal({ game }: { game: Game }) {
  const item = pendingOverflow(game);
  if (!item) return null;
  return <MakeRoomCard key={`${item.kind}:${"id" in item ? item.id : ""}:${game.overflow?.length ?? 0}`} game={game} item={item} />;
}

function MakeRoomCard({ game, item }: { game: Game; item: Overflow }) {
  const locked = useArrivalLock();
  const [pick, setPick] = useState<string | null>(null);
  // The arriving item first, so it is never scrolled out of sight.
  const picks = roomPicks(game, item).sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
  const chosen = picks.find((p) => p.key === pick && !p.locked);
  const [title, body] = ROOM_TEXT[item.kind];
  return (
    <div className="modal-layer make-room-layer">
      <article className="ftl-card make-room-card" aria-label={title}>
        <p className="event-lead">{title}</p>
        <p>{body}</p>
        <div className="make-room-picks" role="radiogroup" aria-label={tx("ui.GameApp.leave-behind")}>
          {picks.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={pick === p.key}
              className={`make-room-pick${pick === p.key ? " is-on" : ""}${p.isNew ? " is-new" : ""}`}
              disabled={!!p.locked || locked}
              onClick={() => setPick(p.key)}
            >
              {p.isNew ? <em className="make-room-new">{tx("ui.GameApp.new")}</em> : null}
              <span className="make-room-art">{p.art}</span>
              <b>{p.name}</b>
              {p.locked ? <span className="mini">{p.locked}</span> : p.note ? <span className="mini">{p.note}</span> : null}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="choice-line make-room-go"
          disabled={!chosen || locked}
          onClick={() => {
            if (!chosen) return;
            noteChoice();
            act((g) => {
              resolveOverflow(g, chosen.key);
            });
          }}
        >
          {chosen ? `${item.kind === "crew" ? tx("ui.GameApp.relieve") : tx("ui.GameApp.leave-behind")}: ${chosen.name}` : tx("ui.GameApp.pick-one-to-leave-behind")}
        </button>
      </article>
    </div>
  );
}

/** INVENTED salvage lines. The scrap chip matches the event-screen reward. */
function RewardModal({ game }: { game: Game }) {
  const reward = game.reward;
  if (!reward) return null;
  return <RewardCard key={`${reward.note}|${reward.scrap}`} game={game} />;
}

function RewardCard({ game }: { game: Game }) {
  const locked = useArrivalLock();
  const reward = game.reward;
  if (!reward) return null;
  return (
    <div className="modal-layer">
      <article className="ftl-card">
        <p>{reward.note || tx("ui.GameApp.the-buoy-is-quiet")}</p>
        {reward.res ? (
          <LootChips scrap={reward.scrap} res={reward.res} />
        ) : (
          <p className="loot-chip">
            <PixelIcon name="scrap" size={20} />
            <b>{reward.scrap}</b>
          </p>
        )}
        <button
          type="button"
          className={`choice-line${locked ? " is-arming" : ""}`}
          data-phone-action="choice"
          disabled={locked}
          onClick={() => {
            noteChoice();
            act((g) => continueReward(g));
          }}
        >
          {tx("ui.GameApp.1-continue")}
        </button>
      </article>
    </div>
  );
}

/**
 * Per the user: a surrender that offers a weapon or a crewmember shows a card for each, so you can judge it before
 * answering: the weapon's art and numbers (WEAPONS) and the crewmember's race portrait and traits (kinOf). A full
 * rack or a full crew is flagged, since the item is then lost (payOffer, joinCrew). INVENTED look.
 */
function OfferCards({
  game,
  weapon,
  crew,
  augment,
  drone,
  repairs,
}: {
  game: Game;
  weapon?: string;
  crew?: string;
  augment?: AugmentId;
  drone?: string;
  repairs?: number;
}) {
  if (!weapon && !crew && !augment && !drone && !repairs) return null;
  const augFate = augment ? bonusAugmentFate(game, augment) : undefined;
  const droneKey = drone ? droneKeyOf(drone) : null;
  const def = weapon ? WEAPONS[weapon] : undefined;
  const rackFull = game.player.weapons.length >= weaponSlotCap(game);
  const crewFull = game.crew.filter((c) => c.side === "player").length >= CREW_CAP;
  const kin = crew ? raceKin(crew) : undefined;
  const k = kin ? kinOf(kin) : undefined;
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="offer-cards">
      {weapon ? (
        <section className="offer-card" data-offer="weapon">
          <p className="offer-kind">{tx("ui.GameApp.weapon")}</p>
          <span className="offer-art">
            <WeaponArt id={weapon} height={34} />
          </span>
          <b className="offer-name">{def?.name ?? weapon}</b>
          {def ? (
            <span className="cargo-stats">
              <span title={tx("ui.GameApp.power")}>
                <PixelIcon name="weapons" size={12} />
                {def.power}
              </span>
              <span title={tx("ui.GameApp.charge-time")}>{def.charge}s</span>
              {def.damage > 0 ? <span title={tx("ui.GameApp.damage-per-shot")}>{def.shots > 1 ? `${def.shots}×${def.damage}` : def.damage} dmg</span> : null}
              {def.ion > 0 ? <span title={tx("ui.GameApp.ion-2")}>{def.ion} ion</span> : null}
              {def.ammo ? (
                <span title={tx("ui.GameApp.uses-a-missile")}>
                  <PixelIcon name="missile" size={12} />
                </span>
              ) : null}
            </span>
          ) : null}
          {def?.blurb ? <span className="offer-note">{def.blurb}</span> : null}
          {rackFull ? (
            <span className="offer-warn">
              {cargoOf(game).length < CARGO_SLOTS ? tx("ui.GameApp.no-free-weapon-slot-it-goes") : tx("ui.GameApp.no-room-in-cargo-you-pick")}
            </span>
          ) : null}
        </section>
      ) : null}
      {crew && kin && k ? (
        <section className="offer-card" data-offer="crew">
          <p className="offer-kind">{tx("ui.GameApp.crewmember")}</p>
          <span className="offer-art offer-face">
            <CrewSprite kin={kin} uniform={UNIFORMS[0]} size={44} />
          </span>
          <b className="offer-name">{crew}</b>
          <span className="cargo-stats">
            <span title={tx("ui.GameApp.health")}>{k.hp}{tx("ui.GameApp.hp")}</span>
            {k.repair !== 1 ? <span title={tx("ui.GameApp.repair-speed")}>repair {pct(k.repair)}</span> : null}
            {k.fight !== 1 ? <span title={tx("ui.GameApp.combat-damage")}>combat {pct(k.fight)}</span> : null}
            {k.move !== 1 ? <span title={tx("ui.GameApp.movement-speed")}>move {pct(k.move)}</span> : null}
          </span>
          {crewFull ? <span className="offer-warn">{tx("ui.GameApp.crew-is-full-8-you-pick")}</span> : null}
        </section>
      ) : null}
      {augment ? (
        <section className="offer-card" data-offer="augment">
          <p className="offer-kind">{tx("ui.GameApp.augmentation")}</p>
          <span className="offer-art">
            <PixelIcon name="upgrade" size={30} />
          </span>
          <b className="offer-name">{augmentName(augment)}</b>
          <span className="offer-note">{augmentDetail(augment)}</span>
          {augFate === "scrap" ? <span className="offer-warn">{tx("ui.GameApp.already-fitted-25-scrap-instead")}</span> : null}
          {augFate === "full" ? <span className="offer-warn">{tx("ui.GameApp.no-free-augmentation-slot-you-pick")}</span> : null}
        </section>
      ) : null}
      {drone ? (
        <section className="offer-card" data-offer="drone">
          <p className="offer-kind">{tx("ui.GameApp.drone-schematic")}</p>
          <span className="offer-art">
            <DroneArt kind={droneKey} height={34} />
          </span>
          <b className="offer-name">{droneName(drone)}</b>
          {!canFieldDrone(game, drone) ? (
            <span className="offer-warn">
              {cargoOf(game).length < CARGO_SLOTS ? tx("ui.GameApp.no-free-schematic-slot-it-goes") : tx("ui.GameApp.no-room-in-cargo-you-pick")}
            </span>
          ) : null}
        </section>
      ) : null}
      {repairs ? (
        <section className="offer-card" data-offer="repairs">
          <p className="offer-kind">{tx("ui.GameApp.hull-repairs")}</p>
          <span className="offer-art">
            <PixelIcon name="ship" size={30} />
          </span>
          <b className="offer-name">+{repairs} hull</b>
          <span className="offer-note">
            {tx("ui.GameApp.hull-2")}{game.player.hull} → {Math.min(game.player.hullMax, game.player.hull + repairs)} of {game.player.hullMax}.
          </span>
        </section>
      ) : null}
    </div>
  );
}

/** @agent:surrender. Scrap plus fuel, missiles and drone parts, one chip each, zero amounts left out. */
function LootChips({ scrap, res }: { scrap: number; res: { fuel?: number; missiles?: number; parts?: number } }) {
  const items: [IconName, number, string][] = [
    ["scrap", scrap, tx("ui.GameApp.scrap")],
    ["fuel", res.fuel ?? 0, tx("ui.GameApp.fuel")],
    ["missile", res.missiles ?? 0, tx("ui.GameApp.missiles")],
    ["parts", res.parts ?? 0, tx("ui.GameApp.drone-parts")],
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

function MissileChip({ game }: { game: Game }) {
  return (
    <span className={`count-chip${game.missiles < 1 ? " is-empty" : ""}`} aria-label={`${game.missiles} missiles`} title={tx("ui.GameApp.missiles")}>
      <PixelIcon name="missile" />
      {game.missiles}
    </span>
  );
}

function PartsChip({ game }: { game: Game }) {
  return (
    <span className={`count-chip${game.player.parts < 1 ? " is-empty" : ""}`} aria-label={`${game.player.parts} drone parts`} title={tx("ui.GameApp.drone-parts")}>
      <PixelIcon name="parts" />
      {game.player.parts}
    </span>
  );
}

function FastButton() {
  const on = useFast((s) => s.on);
  return (
    <button
      type="button"
      className={`frame-btn pause-btn fast-btn${on ? " is-on" : ""}`}
      aria-label={on ? tx("ui.GameApp.normal-speed") : tx("ui.GameApp.fast-forward")}
      aria-pressed={on}
      title={on ? tx("ui.GameApp.normal-speed-f") : tx("ui.GameApp.fast-forward-f", { FAST_SPEED: FAST_SPEED })}
      onClick={() => useFast.setState({ on: !on })}
    >
      <PixelIcon name="fast" size={34} />
    </button>
  );
}

/** Per the user: the stamp also resumes on a tap, and says so on a touch screen (no Space bar there). */
function PauseStamp() {
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return (
    <button type="button" className="pause-mark" aria-label={tx("ui.GameApp.resume")} onClick={() => act((g) => togglePause(g))}>
      <strong>{tx("ui.GameApp.paused")}</strong>
      <span>{touch ? tx("ui.GameApp.tap-to-resume") : tx("ui.GameApp.press-space-or-click-to-resume")}</span>
    </button>
  );
}

function shipOxygen(ship: Game["player"]): number {
  if (!ship.rooms.length) return 100;
  const sum = ship.rooms.reduce((n, room) => n + airShown(room.o2), 0);
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
  function openTitle(id: string) {
    unlockAudio();
    if (id === "continue") {
      if (useGame.getState().continueRun()) setSaveReady(true);
      return;
    }
    if (id === "new") {
      setView("hangar");
      return;
    }
    if (id === "tutorial") {
      setView("help");
      return;
    }
    if (id === "quit") {
      setView(null);
      return;
    }
    setView(view === id ? null : id);
  }
  function startTutorial() {
    useGame.getState().newRun("kestrel-a");
    useGame.getState().act((g) => {
      g.training = true;
    });
  }
  const cruiser = view ? cruiserPage(view) : undefined;
  if (view === "hangar") return <Hangar onMenu={() => setView(null)} />;
  if (cruiser) return <CruiserArticle page={cruiser} onShips={() => setView("ships")} />;
  if (view === "ships") return <PlayableShips onOpen={setView} onTitle={() => setView(null)} />;
  return (
    <section className="title-shot">
      <InstallButton className="title-install" />
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
              openTitle(item.id);
            }}
          />
        ))}
        {view === "credits" ? <TitlePanel onClose={() => setView(null)} /> : null}
        {view === "stats" ? <AchievementsScreen game={null} onClose={() => setView(null)} /> : null}
        {view === "options" ? <OptionsPanel onClose={() => setView(null)} /> : null}
        {view === "help" ? <HelpScreen onContinue={startTutorial} /> : null}
      </div>
    </section>
  );
}

/**
 * Per the user: credits that meet CC BY-SA 3.0 for the wiki material (attribution, licence, changes noted, the adapted
 * text shared alike), say how the project was made, and credit its developer.
 */
const WIKI_URL = "https://ftl.fandom.com/wiki/FTL:_Faster_Than_Light_Wiki";
const CC_BY_SA_URL = "https://creativecommons.org/licenses/by-sa/3.0/";
const SOURCE_URL = "https://github.com/vezaynk/slower-than-light";
const AUTHOR_URL = "https://knyazev.io/ftl";

function TitlePanel({ onClose }: { onClose: () => void }) {
  const link = (href: string, text: string) => (
    <a href={href} target="_blank" rel="noreferrer">
      {text}
    </a>
  );
  return (
    <div className="title-panel credits-panel has-x" onClick={(e) => e.stopPropagation()}>
      <CloseX onClose={onClose} />
      <p>{tx("ui.GameApp.credits")}</p>
      <div className="credits-body">
        <section>
          <h3>{tx("ui.GameApp.development")}</h3>
          <p>{tx("ui.GameApp.slava-knyazev")}{link(AUTHOR_URL, "knyazev.io/ftl")})</p>
        </section>
        <section>
          <h3>{tx("ui.GameApp.about")}</h3>
          <p>
            {tx("ui.GameApp.stl-slower-than-light-is-a")}
          </p>
          <p>
            {tx("ui.GameApp.it-is-a-clean-room-implementation")}
          </p>
        </section>
        <section>
          <h3>{tx("ui.GameApp.ftl-wiki-cc-by-sa-3")}</h3>
          <p>
            {tx("ui.GameApp.game-rules-numbers-and-event-text")}{link(WIKI_URL, tx("ui.GameApp.ftl-faster-than-light-wiki"))}{tx("ui.GameApp.on-fandom-by-its-contributors-see")}{" "}
            {link(CC_BY_SA_URL, tx("ui.GameApp.creative-commons-attribution-sharealike-3-0"))}{tx("ui.GameApp.licence-the-material-was-changed-condensed")}
          </p>
          <p>
            {tx("ui.GameApp.that-adapted-material-is-shared-under")}{link(SOURCE_URL, "github.com/vezaynk/slower-than-light")}).
          </p>
        </section>
      </div>
      <p className="credits-version">{tx("ui.GameApp.v-0-1")}</p>
    </div>
  );
}

/** Wiki page "Ship", section "Playable ships" and section "Layouts". */
function PlayableShips({ onOpen, onTitle }: { onOpen: (page: string) => void; onTitle: () => void }) {
  const ships = PLAYABLE_SHIPS;
  return (
    <article className="wiki-doc">
      <button type="button" className="title-figure-hit" aria-label={tx("ui.GameApp.ftl")} onClick={onTitle}>
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
  if (b.quest && !b.resolved) return tx("ui.GameApp.quest");
  if (b.kind === "store") return tx("ui.GameApp.store");
  if (b.kind === "exit") return tx("ui.GameApp.exit");
  if (b.kind === "distress" || /distress/i.test(`${b.name} ${b.flag}`)) return tx("ui.GameApp.distress");
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
  // xftl doc/sector-map: beacons sit at px positions in a 6x4 grid of 110px cells. The plot stretches the beacons'
  // own extent to fill the board on each axis (INVENTED view), keeping an inset so tap targets and labels stay whole.
  const xs = game.beacons.map((b) => beaconXY(b)[0]);
  const ys = game.beacons.map((b) => beaconXY(b)[1]);
  const x0 = xs.length ? Math.min(...xs) : 0;
  const x1 = xs.length ? Math.max(...xs) : GRID_COLS * CELL_PX;
  const y0 = ys.length ? Math.min(...ys) : 0;
  const y1 = ys.length ? Math.max(...ys) : GRID_ROWS * CELL_PX;
  const INSET_X = 0.06;
  const INSET_Y = 0.12;
  // Game px -> 0..1 of the plot.
  const fx = (x: number) => INSET_X + ((x - x0) / Math.max(1, x1 - x0)) * (1 - 2 * INSET_X);
  const fy = (y: number) => INSET_Y + ((y - y0) / Math.max(1, y1 - y0)) * (1 - 2 * INSET_Y);
  const at = (b: (typeof game.beacons)[number]) => {
    const [x, y] = beaconXY(b);
    return [fx(x), fy(y)];
  };
  const [dx, dy] = dangerCentre(game);
  const pct = (n: number) => `${n * 100}%`;
  // Rebel Fleet: "arrows and the word 'warning' contained by a red line, which represents where the fleet will be in
  // one jump". One normal step, two after a scout escaped (Rebel Fleet, Notes: "double the fleet pursue rate for 1
  // turn"). INFERRED: the band shows a normal-beacon step; a nebula jump moves the fleet less. No fleet in sector 8.
  const warn = game.sector < 8 ? { fleet: game.fleet + (game.pursuitDouble ? 2 : 1), dangerY: game.dangerY } : null;
  const [wx, wy] = warn ? dangerCentre(warn) : [dx, dy];
  const rx = (DANGER_RADIUS / Math.max(1, x1 - x0)) * (1 - 2 * INSET_X);
  const ry = (DANGER_RADIUS / Math.max(1, y1 - y0)) * (1 - 2 * INSET_Y);
  // The warning label sits on the band's leading edge, at the fleet's centre height, kept on the plot.
  const warnX = Math.min(0.97, Math.max(0.03, fx(wx) + rx));
  const warnY = Math.min(0.9, Math.max(0.1, fy(wy)));
  const named = SECTOR_NAMES.includes(game.sectorName) ? "" : game.sectorName;
  return (
    <section className="sector-map beacon-map has-x">
      <h2>{tx("ui.GameApp.beacon-map")}</h2>
      <CloseX
        onClose={() =>
          act((g) => {
            g.picking = false;
          })
        }
      />
      {/* Per the user: WAIT and the distress beacon only show with no fuel left (Stores and resources, "Fuel": "If the
          player attempts to perform an FTL Jump with no fuel remaining ... [the game] will instead offer the option to
          Wait"; "A distress beacon can be activated before waiting"). Distress defaults to on. */}
      {game.phase === "map" && game.fuel <= 0 ? (
        <div className="map-wait">
          <button type="button" className="map-wait-btn" onClick={() => act((g) => waitHere(g))}>
            {tx("ui.GameApp.wait")}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={game.distress !== false}
            className={`map-distress${game.distress !== false ? " is-on" : ""}`}
            title={tx("ui.GameApp.a-distress-beacon-draws-ships-hostile")}
            onClick={() =>
              act((g) => {
                g.distress = g.distress === false;
              })
            }
          >
            <span>{tx("ui.GameApp.distress")}</span>
            <b>{game.distress !== false ? tx("ui.GameApp.on") : tx("ui.GameApp.off")}</b>
          </button>
        </div>
      ) : null}
      <div className="sector-board">
        <div className="sector-plot beacon-plot">
          {/* One unit = the plot; preserveAspectRatio none stretches with it, so lines meet the beacons exactly. */}
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
            {game.beacons.flatMap((b) =>
              b.links
                .filter((id) => id > b.id)
                .map((id) => {
                  const other = game.beacons.find((n) => n.id === id);
                  if (!other) return null;
                  return (
                    <line
                      key={`${b.id}-${id}`}
                      x1={at(b)[0]}
                      y1={at(b)[1]}
                      x2={at(other)[0]}
                      y2={at(other)[1]}
                      stroke="#f4f1ea"
                      strokeWidth="2.4"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }),
            )}
            {/* xftl doc/sector-map: the danger zone is a 767px circle, stretched with the plot. */}
            <ellipse
              cx={fx(dx)}
              cy={fy(dy)}
              rx={rx}
              ry={ry}
              fill="rgba(226, 58, 58, 0.16)"
              stroke="#e23a3a"
              strokeWidth="3"
              strokeDasharray="7 5"
              vectorEffect="non-scaling-stroke"
            />
            {warn ? (
              <ellipse
                className="fleet-warn"
                cx={fx(wx)}
                cy={fy(wy)}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="#ff8a3d"
                strokeWidth="2"
                strokeDasharray="3 6"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {warn && warnX > 0.03 ? (
            <span className="fleet-warn-tag" style={{ left: pct(warnX), top: pct(warnY) }}>
              {tx("ui.GameApp.warning-2")}
            </span>
          ) : null}
          {here ? (
            <svg className="beacon-ship" viewBox="-14 -8 28 16" style={{ left: pct(at(here)[0]), top: pct(at(here)[1]) }} aria-hidden="true">
              <path fill="#d5f1ff" d="M -10 -5 H 2 L 6 -2.6 V 2.6 L 2 5 H -10 Z" />
              <path fill="#f7fdff" d="M 6 -2.4 L 13 0 L 6 2.4 Z" />
            </svg>
          ) : null}
          {game.beacons.map((b) => {
            const [bx, by] = at(b);
            const isHere = b.id === game.here;
            const linked = here?.links.includes(b.id) ?? false;
            const open = linked || (game.augments.includes("nav") && navAllows(b, game.fleet));
            const swallowed = overtaken(game, b);
            const soon = !swallowed && !!warn && overtaken(warn, b);
            // @agent:quests. Beacons, "Quest (marker) beacon": marked 'QUEST', "seen on the map from any distance away".
            const tag = isHere ? null : beaconMark(b);
            const nebula = b.kind === "nebula" && !b.cleared;
            // Augmentations, Long-Ranged Scanners: adjacent beacons only, including ones left behind.
            // Not the current beacon. Live from the fitted scanners; selling them hides the marks.
            const scan = here && !isHere && game.augments.includes("glass") && here.links.includes(b.id) ? scanMark(game, b) : null;
            const bits = scan ? [scan.ship ? tx("ui.GameApp.ship-2") : "", scan.hazard ? tx("ui.GameApp.hazard") : ""].filter(Boolean) : [];
            // A label sits above its beacon, or below it near the top edge, always centred on it.
            const below = by < 0.22;
            return (
              <div key={b.id} className="beacon-spot" style={{ left: pct(bx), top: pct(by) }}>
                {isHere ? null : (
                  <button
                    type="button"
                    className={`map-beacon${open ? " is-linked" : ""}${b.visited ? " is-visited" : ""}${swallowed ? " is-over" : ""}${soon ? " is-warn" : ""}${nebula ? " is-nebula" : ""}${tag ? ` is-${tag.toLowerCase()}` : ""}`}
                    disabled={!open || (game.phase === "combat" && game.flee < 1)}
                    aria-label={tag || tx("ui.GameApp.beacon")}
                    onClick={() => act((g) => commitJump(g, b.id))}
                  />
                )}
                {tag ? <span className={`beacon-tag${below ? " is-below" : ""}${tag === "QUEST" ? " is-quest" : ""}`}>{tag}</span> : null}
                {bits.length ? <span className="beacon-tag is-scan">{bits.join(" ")}</span> : null}
              </div>
            );
          })}
          {game.fuel < 1 ? <p className="no-fuel">{tx("ui.GameApp.no-fuel")}</p> : null}
        </div>
      </div>
      <div className="sector-key beacon-foot">
        <span>{tx("ui.GameApp.sector")}{game.sector}</span>
        {named ? <span>{named}</span> : null}
        {here && beaconMark(here) === "DISTRESS" ? <span>{tx("ui.GameApp.distress-beacon")}</span> : null}
        <span className="beacon-legend">
          <span><i className="key-beacon is-linked" />{tx("ui.GameApp.jump-2")}</span>
          <span><i className="key-beacon" />{tx("ui.GameApp.beacon")}</span>
          <span><i className="key-beacon is-visited" />{tx("ui.GameApp.visited")}</span>
          <span><i className="key-beacon is-over" />{tx("ui.GameApp.fleet")}</span>
          {warn ? <span><i className="key-beacon is-warn" />{tx("ui.GameApp.next-jump")}</span> : null}
        </span>
      </div>
    </section>
  );
}

/** SECTOR MAP: File:Sector Map.png. Civilian, Hostile, Nebula, numbered next sectors. */
function SectorChart({ game }: { game: Game }) {
  const nodes = game.route ?? [];
  const maxCol = nodes.reduce((m, n) => Math.max(m, n.col), 0);
  const w = mapX(maxCol) + 70;
  // xftl doc/sector-map: up to four sectors a column, rows 0-3.
  const h = mapY(3) + 36;
  const here = nodes.find((n) => n.id === game.routeHere);
  const next = nodes.filter((n) => here?.links.includes(n.id));
  const pct = (n: number, total: number) => `${(n / total) * 100}%`;
  return (
    <section className="sector-map">
      <h2>{tx("ui.GameApp.sector-map")}</h2>
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
          {tx("ui.GameApp.civilian")}
        </span>
        <span>
          <i className="dot dot-hostile" />
          {tx("ui.GameApp.hostile")}
        </span>
        <span>
          <i className="dot dot-nebula" />
          {tx("ui.GameApp.nebula")}
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
      <article className="sheet manual ftl-sheet has-x">
        <CloseX onClose={onClose} />
        <p className="kicker">{tx("ui.GameApp.manual")}</p>
        <div className="manual-body">
          <h3>{tx("ui.GameApp.getting-out")}</h3>
          <ul>
            <li>{tx("ui.GameApp.fuel-starts-at-16-every-jump")}</li>
            <li>{tx("ui.GameApp.the-hangar-launches-the-cruiser-layouts")}</li>
            <li>{tx("ui.GameApp.sector-8-is-the-flagship-it")}</li>
            <li>{tx("ui.GameApp.space-pauses-number-keys-arm-a")}</li>
          </ul>
        </div>
      </article>
    </div>
  );
}

const SKILL_LABEL: Record<SkillName, string> = {
  pilot: tx("ui.GameApp.piloting"),
  engines: tx("ui.GameApp.engines"),
  weapons: tx("ui.GameApp.weapons-2"),
  shields: tx("ui.GameApp.shields-2"),
  repair: tx("ui.GameApp.repair"),
  combat: tx("ui.GameApp.combat"),
};

const UPGRADE_SYS_NAME: Record<SysId, string> = {
  shields: tx("ui.GameApp.shields-2"),
  engines: tx("ui.GameApp.engines"),
  oxygen: tx("ui.GameApp.oxygen"),
  medbay: tx("ui.GameApp.medbay"),
  weapons: tx("ui.GameApp.weapon-control"),
  pilot: tx("ui.GameApp.piloting"),
  sensors: tx("ui.GameApp.sensors"),
  doors: tx("ui.GameApp.door-system"),
};

type UpgradeRow = {
  key: string;
  icon?: IconName;
  name: string;
  level: number;
  /** Highest level: the current one plus every further level that has a price. */
  max: number;
  effect: string;
  cost: number | null;
  buy: ((g: Game) => void) | null;
  subsystem: boolean;
};

/** Walks a cost table from `level` until there is no next price. */
function topLevel(level: number, costAt: (level: number) => number | null | undefined): number {
  let top = level;
  while (top < 25 && costAt(top) != null) top += 1;
  return top;
}

/**
 * Systems, GUI order, with the reactor first.
 * A missing system is not sold here. Drone Control has no printed per-level scrap.
 */
function upgradeRows(game: Game): UpgradeRow[] {
  const rows: UpgradeRow[] = [];
  const reactorCost = upgradeCost("reactor", game.player.reactor);
  rows.push({
    key: "reactor",
    name: tx("ui.GameApp.reactor"),
    level: game.player.reactor,
    max: 25,
    effect: reactorCost != null ? upgradeBlurb("reactor", game.player.reactor) : tx("ui.GameApp.cap-25"),
    cost: reactorCost,
    buy: reactorCost != null ? (g) => upgrade(g, "reactor") : null,
    subsystem: false,
  });

  const sys = (id: SysId) => {
    const state = game.player.systems[id];
    if (state.level <= 0) return;
    const cost = upgradeCost(id, state.level);
    const subsystem = id === "pilot" || id === "sensors" || id === "doors";
    rows.push({
      key: id,
      icon: id,
      name: UPGRADE_SYS_NAME[id],
      level: state.level,
      max: topLevel(state.level, (l) => upgradeCost(id, l)),
      effect: cost != null ? upgradeBlurb(id, state.level) : "",
      cost,
      buy: cost != null ? (g) => upgrade(g, id) : null,
      subsystem,
    });
  };

  const fitted = (
    id: KitId,
    costAt: (level: number) => number | null | undefined,
    effect: string,
    buy: (g: Game) => void,
    subsystem = false,
  ) => {
    const kit = game.player.kits[id];
    if (!kit) return;
    const cost = costAt(kit.level) ?? null;
    rows.push({
      key: id,
      icon: id,
      name: KIT_LABEL[id],
      level: kit.level,
      max: topLevel(kit.level, costAt),
      effect: cost != null ? effect : "",
      cost,
      buy: cost != null ? buy : null,
      subsystem,
    });
  };

  sys("shields");
  sys("engines");
  sys("medbay");
  {
    const kit = game.player.kits.cradle;
    if (kit) {
      fitted(
        "cradle",
        cradleUpgradeCost,
        kit.level === 1 ? tx("ui.GameApp.clone-in-9-sec-16-hp") : tx("ui.GameApp.clone-in-7-sec-25-hp"),
        (g) => upgradeCradle(g),
      );
    }
  }
  sys("oxygen");
  {
    const kit = game.player.kits.sling;
    if (kit) {
      fitted(
        "sling",
        slingUpgradeCost,
        kit.level === 1 ? tx("ui.GameApp.15-sec-cooldown") : tx("ui.GameApp.10-sec-cooldown"),
        (g) => upgradeSling(g),
      );
    }
  }
  {
    const kit = game.player.kits.veil;
    if (kit) {
      fitted("veil", veilUpgradeCost, kit.level === 1 ? tx("ui.GameApp.10-sec") : tx("ui.GameApp.15-sec"), (g) => upgradeVeil(g));
    }
  }
  {
    const kit = game.player.kits.leash;
    if (kit) {
      fitted(
        "leash",
        (l) => LEASH_UPGRADE[l + 1] ?? null,
        kit.level === 1 ? tx("ui.GameApp.15-health-25-combat-damage-20") : tx("ui.GameApp.30-health-100-combat-damage-28"),
        (g) => upgradeLeash(g),
      );
    }
  }
  {
    const kit = game.player.kits.lance;
    if (kit) {
      const next = kit.level + 1;
      fitted("lance", lanceUpgradeCost, LANCE_CHARGE[next] != null ? tx("ui.GameApp.sec-charge", { v: LANCE_CHARGE[next] }) : "", (g) => upgradeLance(g));
    }
  }
  {
    const kit = game.player.kits.flak;
    if (kit) {
      const next = kit.level + 1;
      const seconds = next === 2 || next === 3 || next === 4 ? FLAK_CHARGE[next] : null;
      fitted("flak", flakUpgradeCost, seconds != null ? tx("ui.GameApp.sec-charge-2", { seconds: seconds }) : "", (g) => upgradeFlak(g));
    }
  }
  {
    const kit = game.player.kits.spike;
    if (kit) {
      fitted(
        "spike",
        spikeUpgradeCost,
        kit.level === 1 ? tx("ui.GameApp.7-sec-pulse") : tx("ui.GameApp.10-sec-pulse"),
        (g) => upgradeSpike(g),
      );
    }
  }
  sys("weapons");
  if (game.player.kits.swarm) fitted("swarm", () => null, "", () => {});
  sys("pilot");
  sys("sensors");
  sys("doors");
  {
    const kit = game.player.kits.cell;
    if (kit) fitted("cell", cellUpgradeCost, tx("ui.GameApp.4-temporary-power-bars"), (g) => upgradeCell(g), true);
  }
  return rows;
}

/** Systems: Upgrades, the crew manifest, and Inventory are tabs of the Ship menu. */
const SHIP_TABS = [
  ["upgrades", "Upgrades"],
  ["crew", "Crew"],
  ["inventory", "Inventory"],
] as const;

function ShipSheet({ game }: { game: Game }) {
  const tab = game.shipTab ?? "upgrades";
  const guns = useTrayDrag("sheet-weapons", (from, to) => act((g) => reorderWeapons(g, from, to)));
  const drones = useTrayDrag("sheet-drones", (from, to) =>
    act((g) => {
      const kit = g.player.kits.swarm;
      if (kit) reorderDroneSlots(kit, from, to);
    }),
  );
  return (
    <div className="overlay">
      <article className="sheet ftl-sheet ship-sheet has-x" data-sheet="ship">
        <CloseX
          onClose={() =>
            act((g) => {
              g.shipSheet = false;
            })
          }
        />
        {/* Per the user: a tabbed layout. Name and scrap on top, folder tabs with a count, then one fixed-size panel
            that scrolls, so switching tabs never resizes the sheet. INVENTED look. */}
        <header className="ship-sheet-head">
          <h2 className="kicker">{game.player.name}</h2>
          <span className="scrap-box ship-sheet-scrap" aria-label={`${game.scrap} scrap`}>
            <PixelIcon name="scrap" size={18} />
            <b>{game.scrap}</b>
          </span>
        </header>
        <div
          className="ship-tabs"
          role="tablist"
          aria-label={tx("ui.GameApp.ship")}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const ids = SHIP_TABS.map(([id]) => id);
            // From the focused tab (it may not be the open one), else the open one.
            const focused = ids.indexOf((e.target as HTMLElement).id.replace("ship-tab-", "") as (typeof ids)[number]);
            const at = focused >= 0 ? focused : ids.indexOf(tab);
            const next = ids[(at + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length]!;
            act((g) => {
              g.shipTab = next;
            });
            requestAnimationFrame(() => document.getElementById(`ship-tab-${next}`)?.focus());
          }}
        >
          {SHIP_TABS.map(([id, label]) => {
            const on = tab === id;
            const count =
              id === "crew"
                ? game.crew.filter((c) => c.side === "player" && c.hp > 0).length
                : id === "inventory"
                  ? game.player.weapons.length + (game.player.kits.swarm?.loadout?.length ?? 0)
                  : null;
            const face = id === "crew" ? game.crew.find((c) => c.side === "player" && c.hp > 0) : undefined;
            return (
              <button
                key={id}
                id={`ship-tab-${id}`}
                type="button"
                role="tab"
                className={`ship-tab${on ? " is-on" : ""}`}
                aria-selected={on}
                aria-controls="ship-tab-panel"
                tabIndex={on ? 0 : -1}
                onClick={() =>
                  act((g) => {
                    g.shipTab = id;
                  })
                }
              >
                {id === "upgrades" ? <PixelIcon name="upgrade" size={18} /> : null}
                {id === "crew" && face ? <CrewFace crew={face} size={20} /> : null}
                {id === "inventory" ? <PixelIcon name="weapons" size={18} /> : null}
                <span>{label}</span>
                {count != null ? <em className="ship-tab-count">{count}</em> : null}
              </button>
            );
          })}
        </div>
        <div className="ship-tab-panel" id="ship-tab-panel" role="tabpanel" aria-labelledby={`ship-tab-${tab}`}>
          {tab === "upgrades" ? <UpgradeList game={game} /> : null}
          {tab === "crew" ? <CrewManifest game={game} /> : null}
          {tab === "inventory" ? <CargoList game={game} guns={guns} drones={drones} /> : null}
        </div>
      </article>
    </div>
  );
}

/** Ship, "Reactor power": 25 bars in five columns. Owned bars fill from the bottom of the left column. The cap is 25. */
const REACTOR_CAP = 25;
const REACTOR_COLS = 5;
const REACTOR_ROWS = 5;

function ReactorTotal({ game }: { game: Game }) {
  const owned = Math.max(0, Math.min(REACTOR_CAP, game.player.reactor));
  const cost = upgradeCost("reactor", game.player.reactor);
  return (
    <section className="reactor-total" aria-label={tx("ui.GameApp.reactor-of-power-bars", { owned: owned, REACTOR_CAP: REACTOR_CAP })}>
      <p className="reactor-total-title">{tx("ui.GameApp.reactor")}</p>
      <div className="reactor-total-grid">
        {Array.from({ length: REACTOR_COLS }, (_, col) => (
          <span key={col} className="reactor-total-col">
            {Array.from({ length: REACTOR_ROWS }, (_, fromTop) => {
              const row = REACTOR_ROWS - 1 - fromTop;
              const on = col * REACTOR_ROWS + row < owned;
              return <i key={row} className={on ? "is-on" : undefined} />;
            })}
          </span>
        ))}
      </div>
      <div className="reactor-total-foot">
        <span>
          {owned}/{REACTOR_CAP}
        </span>
        <BuyButton game={game} cost={cost} name="Reactor" upgradeKey="reactor" onBuy={() => act((g) => upgrade(g, "reactor"))} />
      </div>
    </section>
  );
}

/**
 * Per the user (reworked upgrade cards): the price is a button with the scrap icon, dim when you are short; a maxed
 * system shows MAX in its place. INVENTED look.
 */
function BuyButton({
  game,
  cost,
  name,
  upgradeKey,
  onBuy,
}: {
  game: Game;
  cost: number | null | undefined;
  name: string;
  upgradeKey: string;
  onBuy: (() => void) | null;
}) {
  if (cost == null || !onBuy) return <span className="upg-max">{tx("ui.GameApp.max")}</span>;
  const short = game.scrap < cost;
  return (
    <button
      type="button"
      className={`upg-buy${short ? " is-short" : ""}`}
      data-upgrade={upgradeKey}
      disabled={short}
      aria-label={tx("ui.GameApp.upgrade-for-scrap", { name: name, cost: cost })}
      title={short ? tx("ui.GameApp.needs-more-scrap", { v: cost - game.scrap }) : tx("ui.GameApp.upgrade-for-scrap-2", { cost: cost })}
      onClick={onBuy}
    >
      <PixelIcon name="scrap" size={14} />
      {cost}
    </button>
  );
}

/**
 * One upgrade drawn like the reactor (ReactorTotal): a framed panel, a column of bars lit up to the current level and
 * dim up to the top level, and the price in the foot. INVENTED layout, after the reactor panel.
 */
function UpgradeCard({ game, row }: { game: Game; row: UpgradeRow }) {
  const top = Math.max(row.level, row.max);
  return (
    <section
      className="reactor-total upgrade-card"
      data-upgrade-card={row.key}
      aria-label={tx("ui.GameApp.level-of", { name: row.name, level: row.level, top: top })}
    >
      <p className="reactor-total-title upgrade-card-title">
        {row.icon ? <PixelIcon name={row.icon} size={18} /> : null}
        <span>{row.name}</span>
      </p>
      <div className="reactor-total-grid">
        <span className="reactor-total-col">
          {Array.from({ length: top }, (_, fromTop) => {
            const bar = top - 1 - fromTop;
            return <i key={bar} className={bar < row.level ? "is-on" : undefined} />;
          })}
        </span>
      </div>
      <p className="mini upgrade-card-next">{row.effect}</p>
      <div className="reactor-total-foot">
        <span>
          {row.level}/{top}
        </span>
        <BuyButton
          game={game}
          cost={row.cost}
          name={row.name}
          upgradeKey={row.key}
          onBuy={row.buy ? () => act(row.buy!) : null}
        />
      </div>
    </section>
  );
}

function UpgradeList({ game }: { game: Game }) {
  const rows = upgradeRows(game).filter((row) => row.key !== "reactor");
  const systems = rows.filter((row) => !row.subsystem);
  const subsystems = rows.filter((row) => row.subsystem);
  // Per the user (reworked): headed groups on a grid that fills the panel; the reactor spans two cards.
  return (
    <div className="upgrade-list">
      <section className="sheet-group">
        <h3 className="sheet-group-head">{tx("ui.GameApp.reactor-systems")}</h3>
        <div className="upgrade-cards">
          <ReactorTotal game={game} />
          {systems.map((row) => (
            <UpgradeCard key={row.key} game={game} row={row} />
          ))}
        </div>
      </section>
      {subsystems.length ? (
        <section className="sheet-group">
          <h3 className="sheet-group-head">
            {tx("ui.GameApp.subsystems-2")}<span className="mini">{tx("ui.GameApp.no-reactor-power-needed")}</span>
          </h3>
          <div className="upgrade-cards">
            {subsystems.map((row) => (
              <UpgradeCard key={row.key} game={game} row={row} />
            ))}
          </div>
        </section>
      ) : null}
      <p className="mini sheet-note">{tx("ui.GameApp.systems-you-do-not-have-and")}</p>
    </div>
  );
}

/**
 * Crew skills, lead: skill level 1 and level 2 each take the same XP. Each skill shows two segments, one per level,
 * filling with XP (xpNeedFor, Humans need less). INVENTED layout.
 */
function SkillBars({ crew }: { crew: Crew }) {
  return (
    <div className="skill-grid">
      {(Object.keys(SKILL_LABEL) as SkillName[]).map((name) => {
        const xp = crew.skills?.[name] ?? 0;
        const need = xpNeedFor(crew, name);
        const rank = xp >= need * 2 ? 2 : xp >= need ? 1 : 0;
        const fill = (seg: number) => Math.max(0, Math.min(1, (xp - seg * need) / need));
        return (
          <div
            key={name}
            className={`skill-cell is-rank-${rank}`}
            title={tx("ui.GameApp.level", { v: SKILL_LABEL[name], rank: rank, v2: rank < 2 ? `, ${Math.floor(xp)} of ${need * (rank + 1)} XP` : "" })}
          >
            <span className="skill-name">{SKILL_LABEL[name]}</span>
            <span className="skill-segs" aria-label={`${SKILL_LABEL[name]} level ${rank} of 2`}>
              {[0, 1].map((seg) => (
                <i key={seg}>
                  <b style={{ width: `${fill(seg) * 100}%` }} />
                </i>
              ))}
            </span>
            <span className="skill-rank">{rank}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Per the user (reworked): one card per crew member, two to a row. Portrait, editable name, kin and a health bar on
 * top with Dismiss (confirmed inline); the six skills below in a 3 by 2 grid. INVENTED layout.
 */
function CrewManifest({ game }: { game: Game }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  const crew = game.crew.filter((c) => c.side === "player" && c.hp > 0);
  if (crew.length === 0) return <p className="mini">{tx("ui.GameApp.no-crew-aboard")}</p>;
  return (
    <div className="manifest">
      {crew.map((c) => {
        const may = canDismiss(game, c.id);
        const hp = Math.max(0, Math.min(1, c.hp / Math.max(1, c.maxHp)));
        return (
          <article key={c.id} className="manifest-card">
            <header className="manifest-head">
              <span className="manifest-face" aria-hidden="true">
                <CrewFace crew={c} size={40} />
              </span>
              <div className="manifest-id">
                <input
                  aria-label={tx("ui.GameApp.crew-name", { name: c.name })}
                  value={c.name}
                  maxLength={NAME_MAX}
                  autoComplete="off"
                  onChange={(e) => {
                    const value = e.target.value.slice(0, NAME_MAX);
                    act((g) => {
                      const body = g.crew.find((x) => x.id === c.id);
                      if (body) body.name = value;
                    });
                  }}
                  onBlur={() => {
                    act((g) => {
                      const living = g.crew.filter((x) => x.side === "player");
                      const body = living.find((x) => x.id === c.id);
                      if (!body) return;
                      body.name = cleanName(body.name, Math.max(0, living.indexOf(body)));
                    });
                  }}
                />
                <span className="manifest-meta">
                  <span>{kinLabel(c.kin)}</span>
                  <span className={`manifest-hp${hp < 0.35 ? " is-low" : ""}`} aria-label={tx("ui.GameApp.health-of", { ceil: Math.ceil(c.hp), maxHp: c.maxHp })}>
                    <i style={{ width: `${hp * 100}%` }} />
                  </span>
                  <span>
                    {Math.ceil(c.hp)}/{c.maxHp}
                  </span>
                </span>
              </div>
              {confirm === c.id ? null : (
                <button
                  type="button"
                  className="text-btn manifest-dismiss"
                  data-dismiss={c.id}
                  disabled={!may}
                  title={may ? undefined : tx("ui.GameApp.only-crew-aboard-your-ship-can")}
                  onClick={() => setConfirm(c.id)}
                >
                  {tx("ui.GameApp.dismiss")}
                </button>
              )}
            </header>
            {confirm === c.id ? (
              <div className="manifest-confirm" role="alertdialog" aria-label={tx("ui.GameApp.dismiss-2", { name: c.name })}>
                <span>{tx("ui.GameApp.dismiss-3")}{c.name}{tx("ui.GameApp.they-leave-the-ship-for-good")}</span>
                <button
                  type="button"
                  className="text-btn is-danger"
                  data-dismiss-yes={c.id}
                  onClick={() => {
                    setConfirm(null);
                    act((g) => {
                      dismissCrew(g, c.id);
                    });
                  }}
                >
                  {tx("ui.GameApp.dismiss")}
                </button>
                <button type="button" className="text-btn" onClick={() => setConfirm(null)}>
                  {tx("ui.GameApp.keep")}
                </button>
              </div>
            ) : null}
            <SkillBars crew={c} />
          </article>
        );
      })}
    </div>
  );
}

/**
 * Per the user (reworked): three headed groups of slots. Weapons fill numbered slots up to the ship's cap (empty ones
 * dashed) with each gun's art, power, charge and damage; drone schematics; three augment slots with their effect
 * (Augmentations: "Your ship can have only up to three augmentations"). Weapons and drones still drag to reorder.
 */
function CargoList({
  game,
  guns,
  drones,
}: {
  game: Game;
  guns: ReturnType<typeof useTrayDrag>;
  drones: ReturnType<typeof useTrayDrag>;
}) {
  const slots = playerDroneSlots(game.player.kits.swarm);
  const gunCap = Math.max(weaponSlotCap(game), game.player.weapons.length);
  const augCap = Math.max(3, game.augments.length);
  const cargo = cargoOf(game);
  const cargoRoom = cargo.length < CARGO_SLOTS;
  return (
    <div className="cargo-list">
      <section className="sheet-group">
        <h3 className="sheet-group-head">
          {tx("ui.GameApp.weapons-2")}{" "}
          <span className="mini">
            {game.player.weapons.length}/{gunCap}{tx("ui.GameApp.slots-drag-to-change-the-order")}
          </span>
        </h3>
        <div className="cargo-slots">
          {Array.from({ length: gunCap }, (_, index) => {
            const w = game.player.weapons[index];
            if (!w) {
              return (
                <div key={`empty-${index}`} className="cargo-slot is-empty">
                  <em className="cargo-slot-n">{index + 1}</em>
                  <span>{tx("ui.GameApp.empty")}</span>
                </div>
              );
            }
            const def = WEAPONS[w.defId];
            const name = def?.name ?? w.defId;
            const dragging = guns.from === index;
            const drop = guns.over === index && guns.from !== index;
            return (
              <div key={w.uid} className="cargo-cell">
              <button
                type="button"
                data-tray="sheet-weapons"
                data-slot={index}
                className={`cargo-slot sheet-slot${dragging ? " is-dragging" : ""}${drop ? " is-drop" : ""}`}
                aria-label={tx("ui.GameApp.slot", { name: name, v: index + 1 })}
                onPointerDown={(e) => guns.onPointerDown(index, e)}
                onPointerMove={guns.onPointerMove}
                onPointerUp={guns.onPointerUp}
                onClickCapture={guns.onClickCapture}
                onContextMenu={(e) => e.preventDefault()}
              >
                <em className="cargo-slot-n">{index + 1}</em>
                <span className="cargo-art">
                  <WeaponArt id={w.defId} height={28} />
                </span>
                <span className="cargo-name">{name}</span>
                {def ? (
                  <span className="cargo-stats">
                    <span title={tx("ui.GameApp.power")}>
                      <PixelIcon name="weapons" size={12} />
                      {def.power}
                    </span>
                    <span title={tx("ui.GameApp.charge-time")}>{def.charge}s</span>
                    {def.damage > 0 ? <span title={tx("ui.GameApp.damage-per-shot")}>{def.shots > 1 ? `${def.shots}×${def.damage}` : def.damage} dmg</span> : null}
                    {def.ammo ? (
                      <span title={tx("ui.GameApp.uses-a-missile")}>
                        <PixelIcon name="missile" size={12} />
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="cargo-move"
                disabled={!cargoRoom}
                aria-label={tx("ui.GameApp.move-to-cargo", { name: name })}
                onClick={() => act((g) => void stowWeapon(g, w.uid))}
              >
                {tx("ui.GameApp.to-cargo")}
              </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="sheet-group">
        <h3 className="sheet-group-head">{tx("ui.GameApp.drones-2")}</h3>
        {!game.player.kits.swarm ? (
          <p className="mini">{tx("ui.GameApp.no-drone-control-system")}</p>
        ) : slots.length === 0 ? (
          <p className="mini">{tx("ui.GameApp.no-drone-schematics")}</p>
        ) : (
          <div className="cargo-slots">
            {slots.map((kind, index) => {
              const key = droneKeyOf(kind);
              const name = key ? DRONE_LOOKS[key].name : kind;
              const dragging = drones.from === index;
              const drop = drones.over === index && drones.from !== index;
              return (
                <div key={`${kind}-${index}`} className="cargo-cell">
                <button
                  type="button"
                  data-tray="sheet-drones"
                  data-slot={index}
                  className={`cargo-slot sheet-slot${dragging ? " is-dragging" : ""}${drop ? " is-drop" : ""}`}
                  aria-label={tx("ui.GameApp.drone-slot", { name: name, v: index + 1 })}
                  onPointerDown={(e) => drones.onPointerDown(index, e)}
                  onPointerMove={drones.onPointerMove}
                  onPointerUp={drones.onPointerUp}
                  onClickCapture={drones.onClickCapture}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <em className="cargo-slot-n">{index + 1}</em>
                  <span className="cargo-art">{key ? <DroneArt kind={key} height={24} /> : null}</span>
                  <span className="cargo-name">{name}</span>
                </button>
                <button
                  type="button"
                  className="cargo-move"
                  disabled={!cargoRoom}
                  aria-label={tx("ui.GameApp.move-to-cargo", { name: name })}
                  onClick={() => act((g) => void stowDrone(g, index))}
                >
                  {tx("ui.GameApp.to-cargo")}
                </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {/* Per the user: the 4-slot cargo hold for weapons and drone schematics that are not fitted (wiki/make-room.ts). */}
      <section className="sheet-group">
        <h3 className="sheet-group-head">
          {tx("ui.GameApp.cargo")}{" "}
          <span className="mini">
            {cargo.length}/{CARGO_SLOTS}{tx("ui.GameApp.weapons-and-drone-schematics-that-are")}
          </span>
        </h3>
        <div className="cargo-slots">
          {Array.from({ length: CARGO_SLOTS }, (_, index) => {
            const item = cargo[index];
            if (!item) {
              return (
                <div key={`cargo-empty-${index}`} className="cargo-slot is-empty">
                  <span>{tx("ui.GameApp.empty")}</span>
                </div>
              );
            }
            const name = item.kind === "weapon" ? (WEAPONS[item.id]?.name ?? item.id) : droneName(item.id);
            const fits = canFitFromCargo(game, index);
            const why =
              item.kind === "weapon" ? tx("ui.GameApp.weapon-slots-full") : !game.player.kits.swarm ? tx("ui.GameApp.needs-drone-control") : tx("ui.GameApp.drone-slots-full");
            return (
              <div key={`cargo-${index}-${item.id}`} className="cargo-cell">
                <div className="cargo-slot">
                  <span className="cargo-art">
                    {item.kind === "weapon" ? <WeaponArt id={item.id} height={28} /> : <DroneArt kind={droneKeyOf(item.id)} height={24} />}
                  </span>
                  <span className="cargo-name">{name}</span>
                  <span className="mini">{item.kind === "weapon" ? tx("ui.GameApp.weapon") : tx("ui.GameApp.drone-schematic")}</span>
                </div>
                <button
                  type="button"
                  className="cargo-move"
                  disabled={!fits}
                  title={fits ? undefined : why}
                  aria-label={tx("ui.GameApp.fit", { name: name })}
                  onClick={() => act((g) => void fitFromCargo(g, index))}
                >
                  {fits ? tx("ui.GameApp.fit-2") : why}
                </button>
              </div>
            );
          })}
        </div>
      </section>
      <section className="sheet-group">
        <h3 className="sheet-group-head">
          {tx("ui.GameApp.augments")}{" "}
          <span className="mini">
            {game.augments.length}/{augCap}
          </span>
        </h3>
        <div className="cargo-slots">
          {Array.from({ length: augCap }, (_, index) => {
            const id = game.augments[index];
            if (!id) {
              return (
                <div key={`aug-empty-${index}`} className="cargo-slot is-empty">
                  <span>{tx("ui.GameApp.empty")}</span>
                </div>
              );
            }
            const row = CATALOG.find((r) => r.id === id);
            return (
              <div key={`${id}-${index}`} className="cargo-slot is-aug">
                <span className="cargo-name">{row?.name ?? id}</span>
                {row?.detail ? <span className="cargo-detail">{row.detail}</span> : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** "Less" and "More" are INVENTED aria labels. */
/**
 * Per the user: the bar being repaired fills yellow left to right over the red damaged bar (sim REPAIR_SECONDS per bar;
 * one bar is fixed at a time, the lowest damaged one).
 */
function fixStyle(fix: number | undefined): CSSProperties {
  return { ["--fix" as string]: `${Math.round(Math.max(0, Math.min(1, (fix ?? 0) / REPAIR_SECONDS)) * 100)}%` };
}

/**
 * Per the user: a system taking damage shows it like repair progress. Boarders and fires build sabotage progress in the
 * room (extras/sabotage.ts, Boarding "Combat": "When the bar is filled, the system takes 1 damage"); the next bar to
 * break fills red left to right with it. Undefined when nothing is being damaged.
 */
function hurtStyle(game: Game, id: string): CSSProperties | undefined {
  const room = game.player.rooms.find((r) => r.system === id || r.kit === id);
  const progress = room?.sabotage ?? 0;
  if (!(progress > 0)) return undefined;
  return { ["--hurt" as string]: `${Math.round(Math.min(1, progress) * 100)}%` };
}

/** A dock subsystem bar: powered, damaged (red), or the one being repaired (fixStyle). */
function KitBar({ game, id, kit, n }: { game: Game; id: KitId; kit: Kit; n: number }) {
  const up = Math.max(0, kit.level - (kit.damage ?? 0));
  const hurt = n === up - 1 ? hurtStyle(game, id) : undefined;
  if (n < kit.power && n < up) return <b className={kitBarClass(game, id, kit.power, n) + (hurt ? " is-hurting" : "")} style={hurt} />;
  if ((kit.damage ?? 0) > 0 && n === up) return <b className="is-dmg is-fixing" style={fixStyle(kit.fix)} />;
  return <b className={n >= up && n < kit.level ? "is-dmg" : ""} />;
}

function kitBarClass(game: Game, id: string, power: number, n: number): string {
  if (n >= power) return "";
  const painted = batteryBarsOn(game.player, id);
  return painted > 0 && n >= power - painted ? "on is-battery" : "on";
}


