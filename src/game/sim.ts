import { flushSfx } from "./audio.ts";
import {
  CREW_POOL,
  EVADE_TABLE,
  FTL_SKILL,
  FTL_UNMANNED,
  SCRAP_MEDIUM,
  flagshipStageScrap,
  mediumScrapBand,
  SECTOR_NAMES,
  WEAPONS,
  hullRepairPerPoint,
  shieldLayerSeconds,
  skillRank,
  upgradeCost,
} from "./content.ts";
import {
  adjustScrap,
  batteryBonus,
  extraEvade,
  ftlBoost,
  ftlFrozen,
  negateHull,
  negateIon,
  negateSystem,
  noteDeath,
  onPlayerJump,
  shieldBoost,
  suffocateScale,
  targetIsCloaked,
  tickExtras,
  tickPlayerSabotage,
  weaponBoost,
  keepMissile,
  leashMult,
  swarmIntercept,
  enemyDefenseIntercept,
  onNewSector,
} from "./extras/index.ts";
// @agent:hacking. Enemy hacking hooks (extras/spike.ts): FTL, weapon charge, shield recharge, hacked doors.
import {
  HACKED_DOOR_LEVEL,
  clearEnemyHackMarks,
  hackFreezesFtl,
  hackHoldsShields,
  hackDrainsGun,
  hackHoldsWeapons,
  hackLocksDoor,
  spikeEvadeZero,
  hackBlocksManning,
  hackRepairScale,
} from "./extras/spike.ts";
// Mind Control: sideOf is the side a crew member fights for (a leashed crew member fights for the other side).
import { clearEnemyLeash, heldByEnemy, leashOnLeave, sideOf } from "./extras/leash.ts";
import { enemyHoldsFire, veilBrokenByFire } from "./extras/veil.ts";
import { tickEnemyBoarding } from "./extras/sling.ts";
import { tickEnemyCrewAi } from "./extras/crewai.ts";
import { enemyCloneHolds, onCradleJump } from "./extras/cradle.ts";
import { enemyFtlScale } from "./extras/moreaugs.ts";
// @agent:drones. Projectiles and asteroids striking orbiting drones (extras/swarm.ts shotHitsDrone).
import { shotHitsDrone, zoltanBurstDrones } from "./extras/swarm.ts";
import { rollSurge } from "./extras/ram.ts";
import { enemyTarget, randomRoom } from "./wiki/targeting.ts";
import { clampUniform, cleanName, defaultPick, type CrewPick } from "./crew-look.ts";
import { kinOf, type KinId } from "./extras/kin.ts";
import { xpNeedFor } from "./extras/lineage.ts";
import { combatSkillMult, repairSkillMult } from "./wiki/skills.ts";
import { chainChargeSeconds, chainIonAmount, isChainWeapon, nextChainStep } from "./wiki/cited-chain.ts";
import { crystalExtinguishScale } from "./wiki/cited-crystal-fire.ts";
import { rockExtinguishScale } from "./wiki/cited-rock-fire.ts";
import { bypassZoltan } from "./wiki/cited-bypass.ts";
import { VENGEANCE_SHOT, vengeanceFires } from "./wiki/cited-vengeance.ts";
import { hullById } from "./hulls.ts";
import { layoutFor, seatKits } from "./layouts.ts";
import { engiCacheEvent, stampEngiCache } from "./wiki/engi-cache.ts";
import { citedChoiceDisabled, citedChoose, citedEvent, citedOwns, stampCitedEvents } from "./wiki/cited-events.ts";
import { citedEnemy } from "./wiki/cited-enemies.ts";
import {
  applyFlagshipSystems,
  carryCrew,
  firePowerSurge,
  artilleryGun,
  flagshipChargeSeconds,
  flagshipPowerMask,
  hurtArtillery,
  ionArtillery,
  flagshipRooms,
  flagshipSeats,
  rememberFlagship,
  resumeCrew,
  surgeRearm,
  surgeWarning,
  SURGE_STUN_S,
  takeFlagshipMemo,
  tickFlagship,
} from "./wiki/flagship-systems.ts";
import {
  citedAsb,
  citedAsbShot,
  citedBeaconCount,
  citedFleetAdvance,
  citedSector,
  lastStandRepairEvent,
} from "./wiki/cited-sectors.ts";
import { CRYSTAL_SECTOR_WEAPONS, citedBuy, citedStock } from "./wiki/cited-stores.ts";
import { citedCrewDamage, citedPierce } from "./wiki/cited-weapons.ts";
import { navAllows } from "./wiki/cited-nav.ts";
import { citedZoltanPower } from "./wiki/cited-zoltan-power.ts";
import { SECTOR_TYPES } from "./wiki/sectors.ts";
import { escapePlan, eventSlugOf } from "./wiki/escape.ts";
// @agent:surrender. Enemy surrender offers and the anti-stalemate rule.
import { surrenderChoose, surrenderPlan, surrenderTick } from "./wiki/surrender.ts";
// @agent:filler. Documented events for plain beacons.
import { emptyEvent, fillerChoiceDisabled, fillerChoose, fillerEvent } from "./wiki/filler-events.ts";
// @agent:quests. Quest markers, quest-beacon events, page win rewards and "gotaway" results (wiki/quests.ts).
import { pageGotAway, pageWin, placeQueuedQuests, questAfterCited, questChoiceDisabled, questEvent } from "./wiki/quests.ts";
import { pickElite, pickEnemy, requestFor, rollEnemy } from "./enemy-gen.ts";
import { fightUnlock } from "./unlocks.ts"; // @agent:unlocks
import type {
  Beacon,
  Crew,
  Difficulty,
  Door,
  DoorMark,
  Game,
  Kit,
  KitId,
  Room,
  SectorNode,
  Ship,
  Shot,
  SkillName,
  StockItem,
  SysId,
  SystemState,
  WeaponInst,
} from "./types";

const ALL_SYS: SysId[] = [
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "pilot",
  "sensors",
  "doors",
];

const SAVE_KEY = "stl-save-v1";

// INVENTED: seeded rng, ids, log lines, and floating text. No fetched page specifies them.
// Score, s: wallet is what the player receives. eligible is what counts, defaulting to the wallet.
// Scrap Recovery Arm's bonus is not eligible. Repair Arm's cut is not removed from eligible.
function addScrap(g: Game, wallet: number, eligible?: number) {
  const score = eligible ?? wallet;
  if (wallet > 0) g.scrap += wallet;
  if (score > 0) g.scrapCollected = (g.scrapCollected ?? 0) + score;
}

const START_SCRAP: Record<Difficulty, number> = { easy: 30, normal: 10, hard: 0 };
const SCORE_D: Record<Difficulty, number> = { easy: 1, normal: 1.25, hard: 1.5 };

/** Score, lead formula: (s + 10b + 20k) * D, rounded down. D is 1 / 1.25 / 1.5. Flagship phases are not in k. */
export function runScore(g: Game): number {
  const s = g.scrapCollected ?? 0;
  const b = citedBeaconCount(g) ?? g.beaconsVisited ?? 0;
  const k = g.phase === "victory" ? Math.max(0, g.kills - 1) : g.kills;
  const d = SCORE_D[g.difficulty] ?? SCORE_D.normal;
  return Math.floor((s + 10 * b + 20 * k) * d);
}

/** Template:Stores: hull repairs in stores. 2 scrap in sectors 1–3, 3 in 4–6, 4 in 7–8. */
export function repairHull(g: Game, mode: "one" | "all" | "max") {
  const missing = g.player.hullMax - g.player.hull;
  const rate = hullRepairPerPoint(g.sector);
  if (missing <= 0) return;
  let n = 0;
  if (mode === "one") n = g.scrap >= rate ? 1 : 0;
  else if (mode === "all") n = g.scrap >= missing * rate ? missing : 0;
  else n = Math.min(missing, Math.floor(g.scrap / rate));
  if (n <= 0) return;
  g.scrap -= n * rate;
  g.player.hull += n;
  sfx(g, "click");
}

export function rand(g: Game): number {
  let a = g.seed | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  g.seed = a;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function irand(g: Game, n: number): number {
  return Math.floor(rand(g) * n);
}

function pick<T>(g: Game, arr: readonly T[]): T {
  return arr[irand(g, arr.length)];
}

function uid(g: Game): string {
  g.uid = (g.uid + 1) >>> 0;
  return "u" + g.uid.toString(36);
}

export function log(g: Game, text: string) {
  g.log.unshift(text);
  if (g.log.length > 5) g.log.length = 5;
}

function sfx(g: Game, name: string) {
  g.sfx.push(name);
}

function floatAt(g: Game, text: string, x: number, y: number) {
  g.floaters.push({ id: uid(g), text, life: 0.9, x, y });
  if (g.floaters.length > 12) g.floaters.shift();
}

function blankSystem(level: number, power: number): SystemState {
  return { level, power, damage: 0, ion: [], fix: 0 };
}

function systems(levels: Partial<Record<SysId, [number, number]>>): Record<SysId, SystemState> {
  const out = {} as Record<SysId, SystemState>;
  for (const id of ALL_SYS) {
    const pair = levels[id] ?? [0, 0];
    out[id] = blankSystem(pair[0], pair[1]);
  }
  return out;
}

// Systems: subsystems need no reactor power. Piloting, sensors, and doors are subsystems.
export function isMain(id: SysId): boolean {
  return (
    id === "shields" ||
    id === "engines" ||
    id === "oxygen" ||
    id === "medbay" ||
    id === "weapons"
  );
}

/**
 * Reactor bars in this system, plus an optional Zoltan bar.
 * Wiki page "Zoltans": that bar is not removed by ion, and it cannot exceed the undamaged levels.
 * bonus 0 is the reactor count this function used before. A full system does not lower sys.power.
 */
export function bars(sys: SystemState, bonus = 0): number {
  const capacity = Math.max(0, sys.level - sys.damage);
  const ionLocked = Math.min(Math.max(0, sys.ion.length), capacity);
  const green = Math.max(0, Math.min(sys.power, capacity - ionLocked));
  const yellow = Math.max(0, Math.min(bonus, capacity));
  return Math.min(capacity, green + yellow);
}

export function functional(sys: SystemState): boolean {
  return sys.level - sys.damage - sys.ion.length > 0;
}

export function maxBubbles(ship: Ship, bonus = 0): number {
  // Shields, Overview: one barrier for every two system levels, and the system must be powered.
  return Math.floor(bars(ship.systems.shields, bonus) / 2);
}

export function syncShields(ship: Ship, bonus = 0) {
  const cap = maxBubbles(ship, bonus);
  if (ship.shieldNow > cap) ship.shieldNow = cap;
}

function room(partial: Omit<Room, "o2" | "fire" | "breach" | "breachFix" | "fireTick" | "flash" | "venting">): Room {
  return {
    ...partial,
    o2: 100,
    fire: 0,
    breach: 0,
    breachFix: 0,
    fireTick: 0,
    flash: 0,
    venting: false,
  };
}

function touches(a: Room, b: Room): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const xTouch = ax2 === b.x || bx2 === a.x;
  const yOverlap = a.y < by2 && ay2 > b.y;
  const yTouch = ay2 === b.y || by2 === a.y;
  const xOverlap = a.x < bx2 && ax2 > b.x;
  return (xTouch && yOverlap) || (yTouch && xOverlap);
}

// INFERRED: interior doors start open and airlocks start shut. The fetched pages do not say the default.
// A traced layout passes the orange bars. One door per connected pair. A room with no airlock bar has no void door.
function addDoors(rooms: Room[], marks?: DoorMark[]): Door[] {
  if (!marks) {
    const doors: Door[] = [];
    for (let i = 0; i < rooms.length; i++) {
      doors.push({ a: rooms[i].id, b: "void", open: false, hp: 0, stuck: 0 });
      for (let j = i + 1; j < rooms.length; j++) {
        if (touches(rooms[i], rooms[j])) {
          doors.push({ a: rooms[i].id, b: rooms[j].id, open: true, hp: 0, stuck: 0 });
        }
      }
    }
    return doors;
  }
  const at = new Map<string, string>();
  for (const r of rooms) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (r.omit?.some((cell) => cell.x === x && cell.y === y)) continue;
        at.set(`${x},${y}`, r.id);
      }
    }
  }
  const step: Record<DoorMark["side"], [number, number]> = {
    n: [0, -1],
    e: [1, 0],
    s: [0, 1],
    w: [-1, 0],
  };
  const doors: Door[] = [];
  const seen = new Set<string>();
  const vented = new Set<string>();
  for (const mark of marks) {
    const id = at.get(`${mark.x},${mark.y}`);
    if (!id) continue;
    const [dx, dy] = step[mark.side];
    const other = at.get(`${mark.x + dx},${mark.y + dy}`);
    if (!other || other === id) {
      if (!other) vented.add(id);
      continue;
    }
    const key = id < other ? `${id}|${other}` : `${other}|${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    doors.push({ a: id, b: other, open: true, hp: 0, stuck: 0 });
  }
  for (const id of vented) doors.push({ a: id, b: "void", open: false, hp: 0, stuck: 0 });
  return doors;
}

// INVENTED: the Lark, this room grid, and this starting fit. Not a paragraph on the fetched pages.
function makePlayer(): Ship {
  const rooms: Room[] = [
    room({ id: "p-engines", title: "Engines", system: "engines", x: 0, y: 0, w: 2, h: 1 }),
    room({ id: "p-shields", title: "Shields", system: "shields", x: 2, y: 0, w: 2, h: 1 }),
    room({ id: "p-oxygen", title: "Oxygen", system: "oxygen", x: 0, y: 1, w: 1, h: 1 }),
    room({ id: "p-medbay", title: "Medbay", system: "medbay", x: 1, y: 1, w: 2, h: 1 }),
    room({ id: "p-pilot", title: "Piloting", system: "pilot", x: 3, y: 1, w: 1, h: 1 }),
    room({ id: "p-doors", title: "Doors", system: "doors", x: 0, y: 2, w: 1, h: 1 }),
    room({ id: "p-sensors", title: "Sensors", system: "sensors", x: 1, y: 2, w: 1, h: 1 }),
    room({ id: "p-weapons", title: "Weapons", system: "weapons", x: 2, y: 2, w: 2, h: 1 }),
  ];
  return {
    name: "Lark",
    hull: 30,
    hullMax: 30,
    reactor: 8,
    systems: systems({
      shields: [2, 2],
      engines: [2, 2],
      oxygen: [1, 1],
      medbay: [1, 0],
      weapons: [3, 2],
      pilot: [1, 1],
      sensors: [2, 2],
      doors: [1, 1],
    }),
    rooms,
    doors: addDoors(rooms),
    weapons: [
      { uid: "w-line", defId: "lineburst", charge: 0, enabled: true, autofire: false, target: null },
    ],
    ammo: 0,
    shieldNow: 1,
    shieldCharge: 0,
    cols: 4,
    rows: 3,
    kits: {},
    parts: 0,
  };
}

// INVENTED: Ada Voss, Ivo Park, and Nen Hale. Not a cruiser roster.
function starterCrew(): Crew[] {
  return [
    { id: "c-ada", name: "Ada Voss", side: "player", aboard: "player", hp: 100, maxHp: 100, room: "p-pilot", path: [], move: 0, think: 0, tone: 0 },
    { id: "c-ivo", name: "Ivo Park", side: "player", aboard: "player", hp: 100, maxHp: 100, room: "p-engines", path: [], move: 0, think: 0, tone: 1 },
    { id: "c-nen", name: "Nen Hale", side: "player", aboard: "player", hp: 100, maxHp: 100, room: "p-weapons", path: [], move: 0, think: 0, tone: 2 },
  ];
}

export function roomById(ship: Ship, id: string): Room | undefined {
  return ship.rooms.find((r) => r.id === id);
}

export function roomWith(ship: Ship, system: SysId): Room | undefined {
  return ship.rooms.find((r) => r.system === system);
}

/**
 * Wiki page "Zoltans", lead and "Race characteristics": one bar per living Zoltan
 * standing in that room. Piloting, sensors, and doors get none.
 * Cloaking, hacking, the teleporter, mind control, drones, and the clone bay are kits.
 * noteZoltanKits counts those. This function stays on the five main systems.
 */
export function zoltanBars(
  crew: readonly Pick<Crew, "kin" | "hp" | "room" | "aboard">[],
  ship: Ship,
  aboard: "player" | "enemy",
  id: SysId,
): number {
  if (!isMain(id)) return 0;
  const room = roomWith(ship, id);
  if (!room) return 0;
  return citedZoltanPower(
    crew.filter((c) => c.aboard === aboard),
    room.id,
  );
}

function mainBars(g: Game, ship: Ship, aboard: "player" | "enemy", id: SysId): number {
  return bars(ship.systems[id], zoltanBars(g.crew, ship, aboard, id));
}

function neighbors(ship: Ship, id: string): string[] {
  const out: string[] = [];
  for (const d of ship.doors) {
    if (d.b === "void") continue;
    if (d.a === id) out.push(d.b);
    else if (d.b === id) out.push(d.a);
  }
  return out;
}

function bfs(ship: Ship, from: string, to: string): string[] | null {
  if (from === to) return [];
  const q: string[] = [from];
  const prev = new Map<string, string | null>([[from, null]]);
  while (q.length) {
    const cur = q.shift()!;
    for (const n of neighbors(ship, cur)) {
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === to) {
        const path: string[] = [];
        let w: string | null = to;
        while (w && w !== from) {
          path.push(w);
          w = prev.get(w) ?? null;
        }
        path.reverse();
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

function sideCrew(g: Game, side: "player" | "enemy", aboard: "player" | "enemy"): Crew[] {
  return g.crew.filter((c) => c.side === side && c.aboard === aboard && c.hp > 0);
}

function manning(g: Game, ship: Ship, aboard: "player" | "enemy", system: SysId): boolean {
  // INFERRED: fire, oxygen at or below 5%, or a boarder cancels manning. The fetched pages do not number that.
  const r = roomWith(ship, system);
  if (!r) return false;
  // @agent:flagship. The Rebel Flagship: the artillery rooms "cannot be manned, despite containing crew".
  if (system === "weapons" && ship.flagship) return false;
  // @agent:hacking. Hacking, "Overview": a system with an attached hacking drone "cannot be manned" (extras/spike.ts).
  if (hackBlocksManning(g, ship, system)) return false;
  if (r.fire > 0 || r.o2 <= 5) return false;
  const foes = g.crew.some(
    (c) => c.aboard === aboard && sideOf(c) !== (aboard === "player" ? "player" : "enemy") && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
  if (foes) return false;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.some(
    (c) => sideOf(c) === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function manningCrew(g: Game, ship: Ship, aboard: "player" | "enemy", system: SysId): Crew | undefined {
  if (!manning(g, ship, aboard, system)) return undefined;
  const r = roomWith(ship, system);
  if (!r) return undefined;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.find(
    (c) => sideOf(c) === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function present(g: Game, ship: Ship, aboard: "player" | "enemy", system: SysId): boolean {
  const r = roomWith(ship, system);
  if (!r) return false;
  // AI-Controlled Rebel Ships: "Automated ships are unmanned." Their systems run with nobody aboard.
  if (ship.automated) return true;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.some(
    (c) => sideOf(c) === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function rankOf(c: Crew | undefined, skill: SkillName): 0 | 1 | 2 {
  if (!c) return 0;
  // Humans: -10% experience requirements (extras/lineage.ts)
  return skillRank(c.skills?.[skill] ?? 0, xpNeedFor(c, skill));
}

function bumpXp(g: Game, c: Crew | undefined, skill: SkillName, amount: number) {
  // INFERRED: callers grant 1 point or dt. The fetched pages do not number skill gain.
  if (!c || amount <= 0 || c.side !== "player") return;
  if (!c.skills) c.skills = {};
  const before = rankOf(c, skill);
  c.skills[skill] = (c.skills[skill] ?? 0) + amount;
  const after = rankOf(c, skill);
  if (after > before) log(g, `${c.name} — ${skill} rank ${after}.`);
}

function noteDodge(g: Game) {
  const room = roomWith(g.player, "pilot");
  const pilot = g.crew.find(
    (c) => c.side === "player" && c.aboard === "player" && c.room === room?.id && c.hp > 0 && c.path.length === 0,
  );
  bumpXp(g, pilot, "pilot", 1);
  bumpXp(g, manningCrew(g, g.player, "player", "engines"), "engines", 1);
}

/** Engines, manning: +5 / +7 / +10 evasion by skill rank. Same table for piloting. */
const EVADE_SKILL = [5, 7, 10];
/** Weapon Control, manning: charge time ×0.9 / ×0.85 / ×0.8. */
const WEAPON_RATE = [0.9, 0.85, 0.8];
/** Shields, manning: recharge rate ×1.1 / ×1.2 / ×1.3. */
const SHIELD_RATE = [1.1, 1.2, 1.3];

/**
 * AI-Controlled Rebel Ships: "automated ships get manning bonuses for all their systems."
 * "Only damaging the system removes the manning bonus." Ion, fire, a breach, boarding, and a latched hack do not.
 * The Flagship AI dodge is flagshipAiEvade, so this stays off while that bonus is already in extraEvade.
 */
function autoManning(ship: Ship): boolean {
  return !!ship.automated && !ship.flagship?.ai;
}

function autoSkillEvade(ship: Ship, engBars: number): number {
  if (!autoManning(ship)) return 0;
  const engines = ship.systems.engines;
  const pilot = ship.systems.pilot;
  // Unpowered engines have no table and no bonus. Ion that locks a still-undamaged system keeps the +5.
  const enginesUp = engines.level > 0 && engines.damage === 0 && (engBars > 0 || engines.ion.length > 0);
  const pilotUp = pilot.level > 0 && pilot.damage === 0;
  return (enginesUp ? EVADE_SKILL[0] : 0) + (pilotUp ? EVADE_SKILL[0] : 0);
}

/** Engines evasion table, plus manning, plus Piloting autopilot (50% at level 2, 80% at level 3, minimum 2). */
export function evasionPercent(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  // Hacking, "Overview": "Piloting/Engines: reduces base evasion to 0 ... Does not affect evasion gained from Cloak."
  if (spikeEvadeZero(g, ship)) return Math.min(100, extraEvade(g, ship, aboard));
  const eng = Math.min(8, mainBars(g, ship, aboard, "engines"));
  const pilot = ship.systems.pilot;
  // An auto-ship's ionized piloting is still manned: ion is not system damage.
  const pilotHolds = functional(pilot) || (autoManning(ship) && pilot.damage === 0 && pilot.ion.length > 0 && pilot.level > 0);
  const enginesIonKept = autoManning(ship) && eng <= 0 && ship.systems.engines.damage === 0 && ship.systems.engines.ion.length > 0 && ship.systems.engines.level > 0;
  if (eng <= 0 && !enginesIonKept) return Math.min(100, extraEvade(g, ship, aboard));
  if (!pilotHolds || !roomWith(ship, "pilot")) {
    // Damaging piloting removes only that system's bonus. Powered, undamaged engines keep theirs.
    if (autoManning(ship) && eng > 0 && ship.systems.engines.damage === 0) {
      return Math.min(100, Math.round((EVADE_TABLE[eng] ?? 0) + EVADE_SKILL[0] + extraEvade(g, ship, aboard)));
    }
    return Math.min(100, extraEvade(g, ship, aboard));
  }
  let evade = eng > 0 ? (EVADE_TABLE[eng] ?? 0) : 0;
  if (autoManning(ship)) {
    evade += autoSkillEvade(ship, eng);
    return Math.min(100, Math.round(evade + extraEvade(g, ship, aboard)));
  }
  const engCrew = manningCrew(g, ship, aboard, "engines");
  if (engCrew) evade += EVADE_SKILL[rankOf(engCrew, "engines")];
  if (present(g, ship, aboard, "pilot")) {
    const pilotCrew = manningCrew(g, ship, aboard, "pilot");
    if (pilotCrew) evade += EVADE_SKILL[rankOf(pilotCrew, "pilot")];
    return Math.min(100, Math.round(evade + extraEvade(g, ship, aboard)));
  }
  const pilotBars = pilot.level - pilot.damage;
  const bonus = extraEvade(g, ship, aboard);
  if (pilotBars >= 3) return Math.min(100, Math.max(2, Math.round(evade * 0.8)) + bonus);
  if (pilotBars >= 2) return Math.min(100, Math.max(2, Math.round(evade * 0.5)) + bonus);
  return Math.min(100, bonus);
}

/** Engines, "FTL Charge Times": unmanned table, or the manned skill row. A body in piloting is required. */
export function ftlSeconds(g: Game, ship: Ship): number | null {
  const eng = Math.min(8, mainBars(g, ship, "player", "engines"));
  if (eng <= 0) return null;
  if (!present(g, ship, "player", "pilot")) return null;
  // The player's own hack on the enemy's Engines/Piloting (ftlFrozen) stops THEIR drive, not this one; it is checked
  // in enemyEscapeStalled. Only an enemy pulse on this ship's systems stops this drive.
  // @agent:hacking. Hacking, "Overview" (Piloting/Engines): an enemy pulse "stops the FTL drive charging".
  if (hackFreezesFtl(g, ship)) return null;
  const crew = manningCrew(g, ship, "player", "engines");
  const base = crew ? FTL_SKILL[rankOf(crew, "engines")][eng] : FTL_UNMANNED[eng];
  if (base == null) return null;
  return base * ftlBoost(g);
}

/**
 * Enemy Ships, "Surrenders and escape attempts": the escape timer is fixed per event and "not affected by
 * their engines level". It is "paused while the enemy ship engines or piloting is disabled or destroyed".
 * INFERRED: a pilot seat with nobody in it also stops the charge, as it does for the player's FTL.
 * Augmentations, "FTL Augmentations": FTL Jammer doubles the time it takes them to jump.
 */
function enemyEscapeStalled(g: Game, ship: Ship): boolean {
  return mainBars(g, ship, "enemy", "engines") <= 0 || bars(ship.systems.pilot) <= 0 || !present(g, ship, "enemy", "pilot") || ftlFrozen(g);
}

function enemyEscapeStep(g: Game, h: number) {
  const ship = g.enemy;
  const plan = g.enemyEscape;
  if (!ship || !plan || plan.mode === "never") return;
  if (!plan.running && plan.mode === "hull" && !plan.rolled && (ship.hull / Math.max(1, ship.hullMax)) * 100 <= plan.threshold) {
    // Enemy Ships: hull-triggered runs are "often just a chance". One roll, the first time hull drops that low.
    plan.rolled = true;
    if (rand(g) * 100 < plan.chance) {
      plan.running = true;
      log(g, "They are powering their FTL drive to escape.");
      sfx(g, "alarm");
    }
  }
  if (!plan.running || enemyEscapeStalled(g, ship)) return;
  g.enemyFlee = Math.min(1, g.enemyFlee + h / (plan.seconds * enemyFtlScale(g)));
}

/** Rebel Fleet: after a fleeing scout or auto-ship escapes, the next advance counts twice. */
function pursuit(g: Game, advance: number): number {
  if (!g.pursuitDouble) return advance;
  g.pursuitDouble = false;
  return advance * 2;
}

/** What the target panel shows: null until the enemy is actually trying to jump away. */
export function enemyEscapeView(g: Game): { left: number; stalled: boolean } | null {
  const ship = g.enemy;
  const plan = g.enemyEscape;
  if (!ship || !plan?.running) return null;
  const total = plan.seconds * enemyFtlScale(g);
  return { left: Math.max(0, Math.ceil((1 - g.enemyFlee) * total)), stalled: enemyEscapeStalled(g, ship) };
}

export function powerMask(ship: Ship, bonus = 0): boolean[] {
  // @agent:flagship. Flagship artillery has no shared Weapons pool (wiki/flagship-systems.ts flagshipPowerMask).
  const artillery = flagshipPowerMask(ship);
  if (artillery) return artillery;
  let pool = bars(ship.systems.weapons, bonus);
  return ship.weapons.map((w) => {
    const cost = WEAPONS[w.defId]?.power ?? 1;
    if (!w.enabled) return false;
    if (pool >= cost) {
      pool -= cost;
      return true;
    }
    return false;
  });
}

function reactorUsed(ship: Ship): number {
  let n = 0;
  for (const id of ALL_SYS) {
    if (!isMain(id)) continue;
    n += ship.systems[id].power;
  }
  for (const kit of Object.values(ship.kits)) {
    if (kit) n += kit.power;
  }
  return n;
}

export function sparePower(ship: Ship): number {
  return ship.reactor + batteryBonus(ship) - reactorUsed(ship);
}

function capOf(sys: SystemState): number {
  return Math.max(0, sys.level - sys.damage - sys.ion.length);
}

export function powerUp(g: Game, id: SysId) {
  const sys = g.player.systems[id];
  if (!isMain(id)) return;
  if (sparePower(g.player) <= 0) return;
  if (sys.power >= capOf(sys)) return;
  sys.power += 1;
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  sfx(g, "click");
}

export function powerDown(g: Game, id: SysId) {
  const sys = g.player.systems[id];
  if (!isMain(id)) return;
  if (sys.power <= 0) return;
  sys.power -= 1;
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  sfx(g, "click");
}

function findDoor(ship: Ship, a: string, b: string): Door | undefined {
  return ship.doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
}

/** Door System, "Manning": a body on the console counts as one level higher, capped at 4. */
function doorLevel(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  const sys = ship.systems.doors;
  if (!functional(sys)) return 0;
  let level = Math.max(0, sys.level - sys.damage);
  if (manning(g, ship, aboard, "doors")) level += 1;
  return Math.min(4, level);
}

/** Door System, "Hits required to break a door", Normal row: level 2 is 8, level 3 is 12, level 4 is 18. Easy and Hard are not implemented. */
function blastHits(level: number): number {
  if (level >= 4) return 18;
  if (level === 3) return 12;
  if (level === 2) return 8;
  return 0;
}

export function doorLabel(ship: Ship, door: Door): string {
  const a = roomById(ship, door.a)?.title ?? "Room";
  if (door.b === "void") return `Airlock · ${a}`;
  const b = roomById(ship, door.b)?.title ?? "Room";
  return `${a} – ${b}`;
}

function coated(ship: Ship, id: string): boolean {
  return (roomById(ship, id)?.lock ?? 0) > 0;
}

/**
 * Crystal, "Crystal Lockdown": the coating lasts 12 seconds and resets blast-door health.
 * Door System, "Hits required to break a door": that table is the health being reset. No new hit count is introduced.
 * Crystal, "Crystal Lockdown": a coated door can be broken, but the page states no hit count or rate, so breaking is not applied.
 */
function coatRoom(g: Game, ship: Ship, aboard: "player" | "enemy", roomId: string) {
  const room = roomById(ship, roomId);
  if (!room) return;
  room.lock = 12;
  const level = doorLevel(g, ship, aboard);
  for (const door of ship.doors) {
    if (door.b === "void") continue;
    if (door.a !== roomId && door.b !== roomId) continue;
    door.hp = blastHits(level);
  }
}

/** Crystal, "Crystal Lockdown": Crystals coat the room they are in. The recharge is 50 seconds. */
export function lockdown(g: Game, crewId: string): boolean {
  const crew = g.crew.find((c) => c.id === crewId);
  if (!crew || crew.hp <= 0 || crew.kin !== "shard") return false;
  if ((crew.lockCool ?? 0) > 0) return false;
  const ship = crew.aboard === "player" ? g.player : g.enemy;
  if (!ship || !roomById(ship, crew.room)) return false;
  coatRoom(g, ship, crew.aboard, crew.room);
  crew.lockCool = 50;
  sfx(g, "click");
  return true;
}

/** Crystal, "Crystal Lockdown": the shortcut is P. The page does not name a target when none is selected, so none is chosen. */
export function lockdownSelected(g: Game) {
  if (!g.selected) return;
  lockdown(g, g.selected);
}

/**
 * Crystal, "Crystal Lockdown": Z opens every door at once and overrides the coating, including for a suffocation trap.
 * INFERRED: a dead door system cannot do this. The page does not say Z bypasses a broken Door System.
 */
export function openAllDoors(g: Game) {
  if (!functional(g.player.systems.doors)) {
    log(g, "Door control is dead.");
    return;
  }
  for (const door of g.player.doors) {
    door.open = true;
    if (door.b !== "void") continue;
    const room = roomById(g.player, door.a);
    if (room) room.venting = true;
  }
  sfx(g, "vent");
}

function crystalInCloneBay(c: Crew, ship: Ship | null): boolean {
  if ((c.cloneIn ?? 0) > 0) return true;
  const room = ship ? roomById(ship, c.room) : undefined;
  return room?.title === "Clone Bay";
}

/** Crystal, "Crystal Lockdown": an FTL jump recharges Lockdown instantly, unless that Crystal is in the Clone Bay. */
function rechargeLockdown(g: Game) {
  for (const c of g.crew) {
    if (c.kin !== "shard") continue;
    const ship = c.aboard === "player" ? g.player : g.enemy;
    if (crystalInCloneBay(c, ship)) continue;
    c.lockCool = 0;
  }
}

/**
 * Drone Control, Shield Overcharger: "Overcharged shields are lost when making FTL jump."
 * Only a bubble the drone created while none was present. rechargeZoltan still fills any other bubble to 5.
 * PARTIAL: layers added onto an existing bubble are not peeled off. At 5 or more layers the drone adds none,
 * so a Zoltan hull's 5 and the flagship's 12 are not raised by this drone.
 */
function dropOvercharged(ship: Ship) {
  if (!ship.zoltanOver) return;
  ship.zoltan = undefined;
  ship.zoltanOver = undefined;
}

/** Zoltan Shield, lead: an FTL jump completely recharges the bubble. It does not recharge on a timer. */
function rechargeZoltan(ship: Ship) {
  if (ship.zoltan == null) return;
  ship.zoltan = 5;
}

function tickLockdown(g: Game, dt: number) {
  for (const c of g.crew) {
    if ((c.lockCool ?? 0) <= 0) continue;
    c.lockCool = Math.max(0, (c.lockCool ?? 0) - dt);
  }
  for (const ship of [g.player, g.enemy]) {
    if (!ship) continue;
    for (const room of ship.rooms) {
      if ((room.lock ?? 0) <= 0) continue;
      room.lock = Math.max(0, (room.lock ?? 0) - dt);
    }
  }
}

export function toggleDoor(g: Game, a: string, b: string) {
  if (!functional(g.player.systems.doors)) {
    log(g, "Door control is dead.");
    return;
  }
  const door = findDoor(g.player, a, b);
  if (!door || door.stuck > 0) return;
  // Crystal, "Crystal Lockdown": coated rooms cannot be opened or closed by hand. Airlocks are not blocked.
  if (door.b !== "void" && (coated(g.player, door.a) || coated(g.player, door.b))) return;
  door.open = !door.open;
  if (door.b === "void") {
    const room = roomById(g.player, door.a);
    if (room) room.venting = door.open;
  }
  sfx(g, door.open ? "vent" : "click");
}

export function toggleVent(g: Game, roomId: string) {
  toggleDoor(g, roomId, "void");
}

export function selectCrew(g: Game, id: string) {
  g.selected = g.selected === id ? null : id;
  g.mode = "crew";
}

export function orderCrew(g: Game, crewId: string, dest: string) {
  const c = g.crew.find((x) => x.id === crewId);
  if (!c || c.side !== "player" || c.hp <= 0) return;
  // Mind Control, "Overview": "you can't give them orders, rather they are under the AI control."
  if (heldByEnemy(c)) return;
  const ship = c.aboard === "player" ? g.player : g.enemy;
  if (!ship || !roomById(ship, dest)) return;
  // Crystal, "Crystal Lockdown": the coating prevents leaving, and prevents entering.
  // A path that was already started can still finish, which is how a Crystal leaves as the coating forms.
  if (coated(ship, c.room) || coated(ship, dest)) return;
  if (c.room === dest && c.path.length === 0) {
    g.selected = null;
    return;
  }
  const path = bfs(ship, c.room, dest);
  if (!path) return;
  c.path = path;
  c.move = 0;
  g.selected = null;
  sfx(g, "click");
}

/**
 * Weapon Control, Overview: a left click or keys 1–4 activate the slot and it begins charging.
 * Clicking or pressing a slot that is already charging changes the cursor to targeting mode.
 */
export function armWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  if (!w.enabled) {
    w.enabled = true;
    g.armed = weaponUid;
    g.targeting = false;
    sfx(g, "click");
    return;
  }
  g.armed = weaponUid;
  g.targeting = true;
  sfx(g, "click");
}

export function aim(g: Game, roomId: string) {
  // Weapon Control, Overview: a target room is confirmed by a left click while the cursor is targeting.
  if (!g.targeting) return;
  if (!g.enemy || !roomById(g.enemy, roomId)) return;
  const mask = powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
  let index = g.player.weapons.findIndex((w) => w.uid === g.armed);
  if (index < 0) index = g.player.weapons.findIndex((w, i) => w.enabled && mask[i]);
  const w = g.player.weapons[index];
  if (!w) {
    log(g, "No weapon selected.");
    g.targeting = false;
    return;
  }
  g.armed = w.uid;
  w.target = roomId;
  const title = roomById(g.enemy, roomId)?.title ?? "room";
  if (mask[index] && w.charge >= 1) launch(g, "player", w);
  else {
    log(g, `${WEAPONS[w.defId]?.name ?? "Gun"} aimed at ${title}.`);
    sfx(g, "click");
  }
  // INFERRED: confirming the room leaves targeting mode. The overview does not say the cursor stays.
  g.targeting = false;
}

/**
 * Weapon Control, Overview: the right mouse button cancels targeting.
 * INVENTED: it also drops the armed gun's queued room, so a queued shot can be called off.
 */
export function cancelTargeting(g: Game) {
  if (!g.targeting) return;
  g.targeting = false;
  const w = g.player.weapons.find((x) => x.uid === g.armed);
  if (w) w.target = null;
  sfx(g, "click");
}

/** Weapon Control, Overview: a right click or Shift+1–4 depowers the weapon. It does not power it back on. */
export function depowerWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  w.enabled = false;
  g.targeting = false;
  sfx(g, "click");
}

/** Weapon Control, Overview: autofire for all weapons, or the opposite on one slot. */
export function slotAutofire(g: Game, w: WeaponInst): boolean {
  return !!g.autofireAll !== !!w.autoInvert;
}

/** Weapon Control, Overview: Ctrl+1–4 or Ctrl+left click reverses one slot against the all-weapons setting. */
export function reverseSlotAuto(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  w.autoInvert = !w.autoInvert;
  sfx(g, "click");
}

/** Weapon Control, Overview: autofire can be enabled or disabled for all weapons. */
export function toggleAutoAll(g: Game) {
  g.autofireAll = !g.autofireAll;
  sfx(g, "click");
}

export function fireReady(g: Game) {
  const mask = powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
  let any = false;
  g.player.weapons.forEach((w, i) => {
    if (!mask[i] || w.charge < 1 || !w.target) return;
    launch(g, "player", w);
    any = true;
  });
  if (!any) log(g, "Nothing is charged and aimed.");
}

export function toggleWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  w.enabled = !w.enabled;
  sfx(g, "click");
}

export function choiceDisabled(g: Game, id: string): string | null {
  // @agent:filler. Rolled prices on filler cards (refugee trades, the fuel gift, the terraformers' delay).
  const filler = fillerChoiceDisabled(g, id);
  if (filler) return filler;
  // Engi cache: Transaction 2 subtract_missiles.
  if (id === "engi-cache-trap" && g.missiles < 2) return "Need 2 missiles";
  const cited = citedChoiceDisabled(g, id);
  if (cited) return cited;
  // @agent:quests. Blue-option requirements and prices on quest cards (wiki/quests.ts).
  return questChoiceDisabled(g, id);
}

export function toggleAuto(g: Game, weaponUid: string) {
  reverseSlotAuto(g, weaponUid);
}

// INFERRED: the swipe is the aimed room plus one neighbor. Weapons, "Beams" does not give this path.
function beamRooms(ship: Ship, origin: string): string[] {
  const r = roomById(ship, origin);
  if (!r) return [origin];
  const list = neighbors(ship, origin);
  const prefer = list.find((id) => roomById(ship, id)?.system) ?? list[0];
  return prefer ? [origin, prefer] : [origin];
}

function launch(g: Game, from: "player" | "enemy", w: WeaponInst) {
  // Weapons, "Missiles" and "Bombs": one ammunition per shot.
  // INFERRED: flight 0.7s, missiles and bombs 1.35s, beams 0.32s. "Weapons timing and travel times" lists no seconds.
  const def = WEAPONS[w.defId];
  if (!def || w.charge < 1 || !w.target) return;
  const ship = from === "player" ? g.player : g.enemy;
  const targetShip = from === "player" ? g.enemy : g.player;
  if (!ship || !targetShip) return;
  if (def.ammo) {
    if (from === "player") {
      if (g.missiles <= 0) {
        // A queued shot would retry every tick, so it says so once and a one-shot target is dropped.
        if (g.log[0] !== "No missiles.") log(g, "No missiles.");
        if (!slotAutofire(g, w)) w.target = null;
        return;
      }
      if (!keepMissile(g)) g.missiles -= 1;
    } else if (ship.ammo <= 0) return;
    else ship.ammo -= 1;
  }
  w.charge = 0;
  // Ion (Weapons), Chain Ion: the shot uses this step, then the step advances. A dry missile returns above.
  const step = w.chain ?? 0;
  const ion = chainIonAmount(w.defId, step) ?? def.ion;
  const rooms = def.kind === "beam" ? beamRooms(targetShip, w.target) : [w.target];
  const shots = def.kind === "beam" ? 1 : def.shots;
  for (let i = 0; i < shots; i++) {
    g.shots.push({
      id: uid(g),
      kind: def.kind,
      from,
      damage: def.damage,
      ion,
      fireChance: def.fire,
      breachChance: def.breach,
      targetRoom: rooms[0],
      beamRooms: def.kind === "beam" ? rooms : undefined,
      defId: w.defId,
      wait: i * def.gap,
      t: 0,
      duration: def.kind === "missile" || def.kind === "bomb" ? 1.35 : def.kind === "beam" ? 0.32 : 0.7,
    });
  }
  const next = nextChainStep(w.defId, step);
  if (next != null) w.chain = next;
  // INVENTED: a manual gun fires its queued room once and then needs a new target. Autofire keeps the room.
  if (from === "player" && !slotAutofire(g, w)) w.target = null;
  const sound = def.kind === "flak" ? "laser" : def.kind === "bomb" ? "missile" : def.kind === "laser" ? "laser" : def.kind;
  sfx(g, sound);
  veilBrokenByFire(g, from, def.kind);
  if (from === "player") {
    log(g, `${def.name} away.`);
    bumpXp(g, manningCrew(g, g.player, "player", "weapons"), "weapons", 1);
  }
}

/**
 * Working bars of a kit: reactor power plus one yellow bar per living Zoltan in its room.
 * Wiki page "Zoltans": subsystems are unaffected; these kits are not subsystems.
 * The yellow bar does not lower kit.power, and it cannot exceed the undamaged levels.
 * Kits have no ion track, so ion does not remove it. Pass `bonus` to override the stamp.
 */
export function kitBars(kit: Kit | undefined, bonus?: number): number {
  if (!kit) return 0;
  const capacity = Math.max(0, kit.level - (kit.damage ?? 0));
  const green = Math.max(0, Math.min(kit.power, capacity));
  const yellow = Math.max(0, Math.min(bonus ?? kit.zoltan ?? 0, capacity));
  return Math.min(capacity, green + yellow);
}

/** Wiki page "Zoltans": one bar per living Zoltan standing in that kit's room. Writes the stamp kitBars reads. */
export function noteZoltanKits(g: Game): void {
  stampZoltanKits(g, g.player, "player");
  if (g.enemy) stampZoltanKits(g, g.enemy, "enemy");
}

function stampZoltanKits(g: Game, ship: Ship, aboard: "player" | "enemy"): void {
  if (!ship.kits || !ship.rooms) return;
  const crew = g.crew.filter((c) => c.aboard === aboard);
  for (const kit of Object.values(ship.kits)) {
    if (!kit) continue;
    const room = ship.rooms.find((r) => r.kit === kit.id);
    kit.zoltan = room ? citedZoltanPower(crew, room.id) : 0;
  }
}

/** A hit on a kit's room knocks out bars like a system hit ("Weapons: general information": damage per point). */
// exported for extras/sabotage.ts
export function hurtKit(ship: Ship, id: KitId, amount: number) {
  const kit = ship.kits[id];
  if (!kit) return;
  kit.damage = Math.min(kit.level, (kit.damage ?? 0) + amount);
  kit.power = Math.min(kit.power, kit.level - kit.damage);
}

// exported for extras/sabotage.ts
export function hurtSystem(ship: Ship, id: SysId, amount: number, shieldBonus = 0) {
  const sys = ship.systems[id];
  const roomLeft = sys.level - sys.damage;
  const applied = Math.min(amount, roomLeft);
  sys.damage += applied;
  const cap = capOf(sys);
  if (isMain(id) && sys.power > cap) sys.power = cap;
  syncShields(ship, shieldBonus);
}

/** Systems and Template:In-game tips: one power off per ion point, locked 5 seconds per point, up to 5 ion points. */
export function applyIon(ship: Ship, id: SysId, points: number, shieldBonus = 0) {
  const sys = ship.systems[id];
  for (let i = 0; i < points; i++) {
    if (sys.ion.length >= 5) break;
    sys.ion.push(5);
  }
  const cap = capOf(sys);
  if (isMain(id) && sys.power > cap) sys.power = cap;
  syncShields(ship, shieldBonus);
}

/**
 * Spend points from the green bubble. Returns null when there is nothing to spend.
 * A return of 0 means the bubble paid the whole amount.
 * Augmentations, "Zoltan Shield": it absorbs damage before standard shields and hull.
 */
function spendZoltan(ship: Ship, amount: number): number | null {
  if (ship.zoltan == null || ship.zoltan <= 0 || amount <= 0) return null;
  const used = Math.min(ship.zoltan, amount);
  ship.zoltan -= used;
  return amount - used;
}

function noteZoltan(g: Game, playerHurt: boolean) {
  const ship = playerHurt ? g.player : g.enemy;
  const left = ship?.zoltan ?? 0;
  log(g, playerHurt ? `Zoltan Shield ${left}.` : `Their Zoltan Shield ${left}.`);
  sfx(g, "shield");
  floatAt(g, "SHIELD", playerHurt ? 68 : 32, 16);
}

/**
 * Zoltan Shield, lead: beams hit the bubble in 2 ticks, doubling base damage, and room count does not change that.
 * Zoltan Shield, lead: Anti-Bio Beam, Fire Beam, and Artillery Beam deal 2 damage in total.
 * Artillery Beam is not launched as a shot. lance.ts still skips this bubble.
 */
function zoltanBeamCost(shot: Shot): number {
  if (shot.defId === "antibio" || shot.defId === "firebeam") return 2;
  return shot.damage * 2;
}

export function applyImpact(g: Game, shot: Shot) {
  const playerTarget = shot.from !== "player";
  const ship = playerTarget ? g.player : g.enemy;
  if (!ship) return;
  const aboard: "player" | "enemy" = playerTarget ? "player" : "enemy";
  if (shot.kind === "bomb") {
    // Bomb (Weapons), lead: a bomb can miss. It still does not pop shields.
    const evade = evasionPercent(g, ship, aboard);
    // Template:In-game tips: Repair Burst never misses your own ship. Healing Burst can still miss.
    const ownHull = (shot.from === "player" && ship === g.player) || (shot.from === "enemy" && ship === g.enemy);
    if (!(shot.defId === "repairburst" && ownHull) && rand(g) * 100 < evade) {
      if (playerTarget) noteDodge(g);
      log(g, playerTarget ? "Bomb missed the Lark." : "They slipped the bomb.");
      floatAt(g, "MISS", playerTarget ? 70 : 30, 20);
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    if (!r) return;
    // Augmentations, Zoltan Shield Bypass: a player bomb passes the bubble and does not spend it.
    // Enemy bombs stay blocked. The enemy has no augment list.
    const bombThrough =
      (ship.zoltan ?? 0) > 0 &&
      shot.from === "player" &&
      g.augments.includes("bypass") &&
      bypassZoltan("bomb") === "pass";
    // Zoltan Shield, lead: ion weapons deal double damage to the bubble. Ion and stun bombs carry ion and no hull damage.
    // The page does not say leftover ion reaches a system, so a hit that touches the bubble stops there.
    // With the bypass, this takes the same path as a ship that has no bubble, and still does not invent system ion.
    if ((ship.zoltan ?? 0) > 0 && !bombThrough && shot.damage <= 0 && shot.ion > 0) {
      spendZoltan(ship, shot.ion * 2);
      noteZoltan(g, playerTarget);
      return;
    }
    // Zoltan Shield, lead: Fire Bomb and Crystal Lockdown Bomb have no effect on the bubble.
    // Healing Burst and Repair Burst also leave the bubble alone, and still heal or repair the room.
    if (
      (ship.zoltan ?? 0) > 0 &&
      !bombThrough &&
      shot.damage <= 0 &&
      shot.ion <= 0 &&
      shot.defId !== "healburst" &&
      shot.defId !== "repairburst"
    ) {
      log(g, playerTarget ? "The Zoltan Shield shrugs the bomb off." : "Their Zoltan Shield shrugs the bomb off.");
      sfx(g, "shield");
      return;
    }
    if (shot.damage > 0) {
      const left = bombThrough ? null : spendZoltan(ship, shot.damage);
      if (left === 0) {
        noteZoltan(g, playerTarget);
        return;
      }
      strikeRoom(g, ship, aboard, shot.targetRoom, left == null ? shot.damage : left, shot, playerTarget);
    } else {
      // Crystal, "Crystal Lockdown": the Crystal Lockdown Bomb is identical in its coating effect.
      if (shot.defId === "lockdown") {
        coatRoom(g, ship, aboard, r.id);
        log(g, playerTarget ? `${r.title} locked down.` : `Their ${r.title} locked down.`);
        sfx(g, "click");
        return;
      }
      // Bomb (Weapons), "Healing Burst": 150 health to personnel in the room, including mind-controlled crew.
      if (shot.defId === "healburst") {
        const owner = shot.from === "player" ? "player" : "enemy";
        for (const c of g.crew) {
          if (c.aboard !== aboard || c.room !== r.id || c.hp <= 0) continue;
          if (c.side !== owner && (c.leashed ?? 0) <= 0) continue;
          c.hp = Math.min(c.maxHp, c.hp + 150);
        }
        r.flash = 0.35;
        log(g, playerTarget ? `${r.title} crew healed.` : `Their ${r.title} crew healed.`);
        sfx(g, "click");
        return;
      }
      // Bomb (Weapons), "Repair Burst": 8 bars of system damage. It does not put out fires or seal breaches.
      if (shot.defId === "repairburst") {
        if (r.system) {
          const sys = ship.systems[r.system];
          sys.damage = Math.max(0, sys.damage - 8);
          sys.fix = 0;
        }
        r.flash = 0.35;
        log(g, playerTarget ? `${r.title} repaired.` : `Their ${r.title} repaired.`);
        sfx(g, "click");
        return;
      }
      // Fire Bomb: guaranteed 1–2 fires. The page does not say how often it is 2, so the second fire is a coin flip. INFERRED.
      if (shot.fireChance > 0 && rand(g) < shot.fireChance) r.fire = Math.min(3, r.fire + 1);
      if (shot.fireChance >= 1 && rand(g) < 0.5) r.fire = Math.min(3, r.fire + 1);
      r.flash = 0.35;
      log(g, playerTarget ? `Fire in ${r.title}.` : `Fire in their ${r.title}.`);
      sfx(g, "hit");
    }
    return;
  }
  const evade = evasionPercent(g, ship, aboard);
  const missed = rand(g) * 100 < evade;

  if (shot.kind === "beam") {
    // Weapons, "Beams": a beam never misses, and each layer cuts damage by 1. This miss roll is INVENTED.
    // @agent:drones. Anti-Ship Beam Drone I: "fast and 100% accurate". A drone beam (label "drone:…", swarm.ts) skips it.
    if (missed && !shot.label?.startsWith("drone:")) {
      if (playerTarget) noteDodge(g);
      log(g, playerTarget ? "Beam missed the Lark." : "Their hull slipped the beam.");
      floatAt(g, "MISS", playerTarget ? 70 : 30, 20);
      return;
    }
    const bubble = spendZoltan(ship, zoltanBeamCost(shot));
    if (bubble != null) noteZoltan(g, playerTarget);
    if (bubble === 0) return;
    // Zoltan Shield, lead: if the bubble breaks before the swipe ends, the beam continues against regular shields or hull.
    const reduce = ship.shieldNow;
    const dmg = Math.max(0, shot.damage - reduce);
    if (dmg <= 0) {
      log(g, "Beam skids off the shields.");
      sfx(g, "shield");
      return;
    }
    for (const id of shot.beamRooms ?? [shot.targetRoom]) {
      strikeRoom(g, ship, aboard, id, dmg, shot, playerTarget);
    }
    return;
  }

  if (missed) {
    if (playerTarget) noteDodge(g);
    log(g, playerTarget ? "Shot missed the Lark." : "Enemy evasion held.");
    floatAt(g, "MISS", playerTarget ? 72 : 28, 18);
    return;
  }

  if (shot.kind === "ion") {
    // Zoltan Shield, lead: ion weapons deal double damage to the bubble.
    // The page does not say leftover ion reaches a system, so none is applied.
    const bubble = spendZoltan(ship, Math.max(0, shot.ion) * 2);
    if (bubble != null) {
      noteZoltan(g, playerTarget);
      return;
    }
  }

  let damage = shot.damage;
  // Environmental Hazards, anti-ship battery: the Zoltan Shield takes none of it. The hull does.
  const asbShot = shot.from === "env" && shot.kind === "missile";
  if (shot.kind !== "ion" && damage > 0 && !asbShot) {
    const left = spendZoltan(ship, damage);
    if (left === 0) {
      noteZoltan(g, playerTarget);
      return;
    }
    if (left != null) damage = left;
  }

  // Weapons, "Lasers": one shot drops one layer. "Missiles": ignore layers. "Beams": do not pop layers.
  // Shields: Crystal weapons and Heavy Pierce bypass 1 shield layer. Two layers still stop them.
  const pierce = citedPierce(shot.defId);
  if (shot.kind !== "missile" && ship.shieldNow > pierce) {
    ship.shieldNow -= 1;
    ship.shieldCharge = 0;
    if (playerTarget && shot.kind !== "ion") {
      bumpXp(g, manningCrew(g, g.player, "player", "shields"), "shields", 1);
    }
    sfx(g, "shield");
    floatAt(g, "SHIELD", playerTarget ? 68 : 32, 16);
    if (playerTarget) g.trauma = Math.min(1, g.trauma + 0.18);
    return;
  }
  if (shot.kind !== "missile" && pierce > 0 && ship.shieldNow > 0) ship.shieldNow = 0;

  if (shot.kind === "ion") {
    if (playerTarget && negateIon(g)) {
      log(g, "Reverse Ion Field shrugged that off.");
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    if (r?.system) {
      // @agent:flagship. A flagship artillery room ionizes only its own gun (wiki/flagship-systems.ts ionArtillery).
      if (!ionArtillery(ship, r.id, Math.max(1, shot.ion))) applyIon(ship, r.system, Math.max(1, shot.ion), zoltanBars(g.crew, ship, aboard, "shields"));
      log(g, playerTarget ? `${r.title} ionized.` : `Ion on their ${r.title}.`);
    }
    sfx(g, "ion");
    if (r) r.flash = 0.25;
    return;
  }

  strikeRoom(g, ship, aboard, shot.targetRoom, damage, shot, playerTarget);
}

/**
 * Augmentations, Crystal Vengeance: the shard flies at the enemy, ignores regular shields,
 * still faces evasion, and a defense drone can shoot it down.
 * The bullet names no room, so breach and stun are not applied. No flight time is printed, so this resolves now.
 * The Zoltan Shield page does not list the shard, so the bubble still absorbs it before hull.
 */
function looseShard(g: Game) {
  const enemy = g.enemy;
  if (!enemy) return;
  const shot = { kind: "laser" as const, from: "player" as const, defId: "vengeance" };
  if (enemyDefenseIntercept(g, shot)) {
    log(g, "Their defense drone shot the shard down.");
    return;
  }
  if (rand(g) * 100 < evasionPercent(g, enemy, "enemy")) {
    log(g, "The shard missed.");
    return;
  }
  const left = spendZoltan(enemy, VENGEANCE_SHOT.damage);
  if (left === 0) {
    noteZoltan(g, false);
    return;
  }
  const damage = left == null ? VENGEANCE_SHOT.damage : left;
  if (damage <= 0) return;
  enemy.hull = Math.max(0, enemy.hull - damage);
  log(g, `A shard hits their hull. Hull ${enemy.hull}.`);
}

function strikeRoom(
  g: Game,
  ship: Ship,
  aboard: "player" | "enemy",
  roomId: string,
  damage: number,
  shot: Shot,
  playerHurt: boolean,
) {
  const r = roomById(ship, roomId);
  if (!r || damage <= 0) return;
  if (r.kit) hurtKit(ship, r.kit, damage);
  if (r.system) {
    if (playerHurt && negateSystem(g)) log(g, "Titanium System Casing held the system.");
    // @agent:flagship. A flagship artillery room is its own system: only that gun slows (wiki/flagship-systems.ts).
    else if (!hurtArtillery(ship, r.id, damage)) hurtSystem(ship, r.system, damage, zoltanBars(g.crew, ship, aboard, "shields"));
  }
  // Bomb (Weapons) lead: bombs deal no hull damage. System damage above still lands.
  // Crew damage on a bomb is often its own figure (BOMB_GAPS). This still uses 15 per system point from Weapons, "Weapons: general information".
  if (shot.kind !== "bomb") {
    const held = playerHurt && negateHull(g);
    const before = ship.hull;
    if (!held) ship.hull = Math.max(0, ship.hull - damage);
    else log(g, "Rock Plating held the hull.");
    // Augmentations, Crystal Vengeance: 10 percent chance when the ship takes damage.
    // A shield pop and Rock Plating are not hull loss. One roll per drop.
    if (playerHurt && ship.hull < before && g.augments.includes("vengeance") && vengeanceFires(rand(g))) {
      looseShard(g);
    }
  }
  r.flash = 0.35;
  // Weapons, "Weapons: general information": each point of system damage deals 15 crew damage.
  const crewHit = citedCrewDamage(shot, damage) ?? 15 * damage;
  for (const c of g.crew) {
    if (c.aboard === aboard && c.room === roomId && c.hp > 0) c.hp -= crewHit;
  }
  // INFERRED: a hit starts one fire, stacked to 3. The fetched pages do not number that cap.
  if (shot.fireChance > 0 && rand(g) < shot.fireChance) r.fire = Math.min(3, r.fire + 1);
  if (shot.breachChance > 0 && rand(g) < shot.breachChance) r.breach += 1;
  // @agent:flagship. Stage-3 Power Surge lasers: "20% stun" (wiki/flagship-systems.ts SURGE_STUN_S, INFERRED 3 s).
  if ((shot.stunChance ?? 0) > 0 && rand(g) < (shot.stunChance ?? 0)) {
    for (const c of g.crew) {
      if (c.aboard === aboard && c.room === roomId && c.hp > 0) c.stun = Math.max(c.stun ?? 0, SURGE_STUN_S);
    }
  }
  floatAt(g, `−${damage}`, playerHurt ? 74 : 26, 30);
  sfx(g, "hit");
  if (playerHurt) {
    g.trauma = Math.min(1, g.trauma + 0.48);
    g.hitstop = Math.max(g.hitstop, 0.045);
    log(g, `${r.title} hit. Hull ${ship.hull}.`);
    if (ship.hull > 0 && ship.hull <= 10 && !g.lowHull) {
      g.lowHull = true;
      sfx(g, "alarm");
    }
  } else {
    log(g, `Their ${r.title} takes ${damage}.`);
  }
}

function chargeSide(
  g: Game,
  ship: Ship,
  from: "player" | "enemy",
  dt: number,
) {
  const mask = powerMask(ship, zoltanBars(g.crew, ship, from, "weapons"));
  const gunner = manningCrew(g, ship, from, "weapons");
  // Crew skills, Weapons skill: charge time ×0.9 / ×0.85 / ×0.8. Level 0 is already 10% faster.
  // AI-Controlled Rebel Ships: an undamaged Weapon Control keeps the untrained bonus. The Flagship's
  // artillery "cannot be manned", so that hull stays on the printed charge table.
  const weapons = ship.systems.weapons;
  const skill = ship.flagship
    ? gunner
      ? WEAPON_RATE[rankOf(gunner, "weapons")]
      : 1
    : ship.automated
      ? weapons.level > 0 && weapons.damage === 0
        ? WEAPON_RATE[0]
        : 1
      : gunner
        ? WEAPON_RATE[rankOf(gunner, "weapons")]
        : 1;
  const mult = skill / weaponBoost(g, from);
  // @agent:hacking. Hacking, "Overview" (Weapon Control): an enemy pulse drains and holds the player's weapons.
  const frozen = targetIsCloaked(g, from) || hackHoldsWeapons(g, from);
  ship.weapons.forEach((w, i) => {
    const def = WEAPONS[w.defId];
    if (!def) return;
    // Laser (Weapons): Chain Burst and Chain Vulcan "Charge time resets … if the weapon goes offline."
    // Partial charge is dropped, so the next charge is a full first step.
    // Ion (Weapons), Chain Ion: INFERRED the same reset. The section prints the ion climb, not the reset.
    // A cloak pause and a weapons-hack hold freeze the charge and keep the step. They are not "offline".
    // A flagship artillery hack (hackDrainsGun) takes that one gun offline.
    if (!mask[i] || hackDrainsGun(g, from, w.defId)) {
      if (isChainWeapon(w.defId)) {
        w.chain = 0;
        w.charge = 0;
      }
      return;
    }
    // wiki/targeting.ts: enemy aim per difficulty, including the Hard priority list.
    if (from === "enemy" && !w.target) w.target = enemyTarget(g, w);
    if (frozen) return;
    // @agent:flagship. Flagship artillery charges on the page's per-level table (wiki/flagship-weapons.ts).
    const seconds = flagshipChargeSeconds(ship, w) ?? chainChargeSeconds(w.defId, w.chain ?? 0) ?? def.charge;
    w.charge = Math.min(1, w.charge + dt / (seconds * mult));
    // Weapon Control, Overview: enemy guns always fire when charged. Player autofire is the all-weapons
    // setting, reversed per slot by Ctrl. INVENTED: a player gun aimed while charging fires the moment it is
    // ready, and launch() drops that room afterwards unless the slot is on autofire.
    // Cloaking, "Enemy AI and Cloaking": a cloaked enemy that chose to hold fire keeps its charge until the cloak ends.
    if (from === "enemy" && enemyHoldsFire(g)) return;
    if (w.charge >= 1 && w.target) {
      // wiki/targeting.ts, INFERRED: an enemy gun re-aims every volley, as it fires (a missile with no ammo keeps its room).
      if (from === "enemy" && !(def.ammo && ship.ammo <= 0)) w.target = enemyTarget(g, w);
      launch(g, from, w);
    }
  });
}

function moveCrew(g: Game, dt: number) {
  for (const c of g.crew) {
    if ((c.stun ?? 0) > 0) {
      c.stun = Math.max(0, (c.stun ?? 0) - dt);
      continue;
    }
    if (c.hp <= 0 || c.path.length === 0) continue;
    const ship = c.aboard === "player" ? g.player : g.enemy;
    const next = c.path[0];
    if (!ship) continue;
    // Crystal, "Crystal Lockdown": nobody enters a coated room.
    if (coated(ship, next)) {
      c.path = [];
      continue;
    }
    const door = findDoor(ship, c.room, next);
    // Mind Control, "Overview": "Mind-controlled crew can freely pass through blast doors". Leashed crew never break doors.
    // @agent:hacking. Hacking, "Overview": hacked doors are "locked for hostile crew, but friendly crew can pass
    // through freely" (the hacked ship's crew must break them; the hacker's walk through). extras/spike.ts.
    const hacked = !!door && hackLocksDoor(g, ship, door);
    const hostile =
      (c.leashed ?? 0) <= 0 && (hacked ? c.side === "player" : c.side !== (c.aboard === "player" ? "player" : "enemy"));
    const leaving = coated(ship, c.room);
    // Crystal, "Crystal Lockdown": the page states no rate for breaking a coated door, so a shut door is not punched through while the coating lasts.
    if (leaving && door && !door.open) continue;
    if (door && !door.open && hostile && !leaving) {
      const level = hacked ? HACKED_DOOR_LEVEL : doorLevel(g, ship, c.aboard);
      // Door System, "Hits required to break a door": the table starts at level 2. Level 1 is remote doors.
      if (door.hp <= 0) door.hp = blastHits(level);
      door.hp -= dt;
      if (door.hp > 0) continue;
      door.open = true;
      // Door System: "When broken, a door remains stuck open for 7 seconds".
      door.stuck = 7;
      door.hp = 0;
      log(g, "A door gives way.");
    }
    // INFERRED: 0.6s is the baseline walk. Crew table movement is a multiplier on that.
    // Augmentations, "Mantis Pheromones": your crew move 25% faster on your ship and while boarding.
    const pace =
      kinOf(c.kin ?? "plain").move * (c.side === "player" && g.augments.includes("pheromone") ? 1.25 : 1);
    c.move += (dt * pace) / 0.6;
    if (c.move >= 1) {
      c.room = c.path.shift()!;
      c.move = 0;
    }
  }
}

function tickDoors(ship: Ship, dt: number) {
  for (const d of ship.doors) {
    if (d.stuck <= 0) continue;
    d.stuck = Math.max(0, d.stuck - dt);
    if (d.stuck <= 0 && blastHits(Math.max(0, ship.systems.doors.level - ship.systems.doors.damage)) > 0) {
      d.open = false;
      d.hp = 0;
      if (d.b === "void") {
        const r = roomById(ship, d.a);
        if (r) r.venting = false;
      }
    }
  }
}

function armDoors(ship: Ship, level: number) {
  const hits = blastHits(level);
  for (const d of ship.doors) {
    d.stuck = 0;
    d.hp = hits;
    if (d.b === "void") {
      d.open = false;
      const r = roomById(ship, d.a);
      if (r) r.venting = false;
    }
  }
}

/**
 * Oxygen: online refill is 1.2% per second, ×4 at level 2, ×7 at level 3.
 * Unpowered rooms fall at 1.2% per second.
 * Fires die below 10% oxygen. Suffocation is still the 5% check in life().
 * INFERRED: 12% per breach, 28% through an open airlock, and 40% of the difference through an open door. The Door System page does not give airflow rates.
 */
/**
 * Template:Crew races (comparison), "Repair speed" note: "it takes 12.5 seconds for an untrained Human to
 * repair one system bar, or to repair a breach." Fix progress is crew-seconds scaled by each race's repair
 * multiplier, so a Human (×1) needs 12.5 and an Engi (×2) 6.25.
 */
export const REPAIR_SECONDS = 12.5;

/** Fire removed per second by one untrained Human: 1 (repair) × 1.2 (fire) × 1 (skill) × 8% = 0.096 of a fire. */
export const FIRE_FIGHT_SHARE = 0.096;

/**
 * One crew member's repair pace: race repair multiplier × repair skill. Skills, "Repair skill": "Level 1 (Green) | 10%
 * faster repair", "Level 2 (Gold) | 20% faster repair" (wiki/skills.ts REPAIR_SKILL_MULT), and "Repair skill and racial
 * aptitude for repairs also apply to fire-fighting". Used for systems, kit rooms, breaches, and fires.
 */
export function repairPace(c: Crew): number {
  return kinOf(c.kin ?? "plain").repair * repairSkillMult(rankOf(c, "repair"));
}

function airflow(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  const o2 = mainBars(g, ship, aboard, "oxygen");
  const mult = o2 <= 0 ? 0 : o2 === 1 ? 1 : o2 === 2 ? 4 : 7;
  for (const r of ship.rooms) {
    if (o2 > 0) r.o2 += 1.2 * mult * dt;
    else r.o2 -= 1.2 * dt;
    r.o2 -= 12 * r.breach * dt;
    // Fires: "Fires also consume oxygen (0.96% per second for each fire in a room)".
    r.o2 -= 0.96 * r.fire * dt;
  }
  for (const d of ship.doors) {
    if (!d.open) continue;
    if (d.b === "void") {
      const r = roomById(ship, d.a);
      if (r) r.o2 -= 28 * dt;
    } else {
      const a = roomById(ship, d.a);
      const b = roomById(ship, d.b);
      if (!a || !b) continue;
      const flow = (a.o2 - b.o2) * 0.4 * dt;
      a.o2 -= flow;
      b.o2 += flow;
    }
  }
  for (const r of ship.rooms) {
    r.o2 = Math.max(0, Math.min(100, r.o2));
    if (r.o2 < 10) r.fire = 0;
  }
}

/**
 * Door System: closed doors slow fire spread ×1.75. Closed blast doors (level 2+) slow it ×10.
 * Doors level 3–4 don't slow it more than level 2 (Fires, "Dealing with fires").
 */
function doorSpreadSlow(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  return doorLevel(g, ship, aboard) >= 2 ? 10 : 1.75;
}

/**
 * Template:Crew races (comparison), fire-fighting note, and Fires, "Dealing with fires": crew in the room put the
 * fire out. FIRE_FIGHT_SHARE is an untrained Human. Rockmen and Crystal scale by their printed fire-fighting bonus.
 * Repair skill applies (repairPace). Fire Suppression is not scaled.
 * Fires, lead: "2.128 damage per second for each fire in a room" to non-immune crew. The damage uses the fire left
 * after this moment's extinguishing. kin.fireTaken is 0 for a fire-immune lineage.
 */
function fightFire(r: Room, pals: Crew[], dt: number) {
  let rate = 0;
  for (const c of pals) {
    const kin = c.kin ?? "plain";
    const scale = kin === "stone" ? rockExtinguishScale() : kin === "shard" ? crystalExtinguishScale() : 1;
    rate += FIRE_FIGHT_SHARE * repairPace(c) * scale;
  }
  r.fire = Math.max(0, r.fire - rate * dt);
  for (const c of pals) c.hp -= 2.128 * r.fire * kinOf(c.kin ?? "plain").fireTaken * dt;
}

/**
 * Fires, lead: "Fires spread from tile to tile and can spread between rooms. The speed of fire spreading is randomised."
 * INFERRED: every 7s, 70% through an open door, else +0.5 fire, cap 3. The 15% oxygen gate is not on the fetched pages.
 * The external spread note the page links is not copied here. A closed door divides the tick (doorSpreadSlow).
 */
function spreadFire(g: Game, ship: Ship, r: Room, closedSlow: number, dt: number) {
  if (!(r.fire > 0 && r.o2 > 15)) return;
  const sealed = ship.doors.some((d) => !d.open && d.b !== "void" && (d.a === r.id || d.b === r.id));
  r.fireTick += dt * (sealed ? 1 / closedSlow : 1);
  if (r.fireTick <= 7) return;
  r.fireTick = 0;
  const openNeigh = ship.doors.find((d) => {
    if (!d.open || d.b === "void") return false;
    return d.a === r.id || d.b === r.id;
  });
  if (openNeigh && rand(g) < 0.7) {
    const nid = openNeigh.a === r.id ? (openNeigh.b as string) : openNeigh.a;
    const n = roomById(ship, nid);
    if (n) n.fire = Math.min(3, n.fire + 1);
  } else if (r.fire < 3) r.fire += 0.5;
}

/** Fires, lead: the same 2.128 HP/s hits boarders standing in the fire. Suffocation, when it applies, replaces this. */
function burnIntruders(r: Room, foes: Crew[], dt: number) {
  if (r.fire <= 0) return;
  for (const c of foes) c.hp -= 2.128 * r.fire * kinOf(c.kin ?? "plain").fireTaken * dt;
}

/**
 * AI-Controlled Rebel Ships: "automatically repair systems over time (at 1/3 the speed of a human)."
 * A human bar is REPAIR_SECONDS, so one bar here is 37.5 seconds.
 * "They cannot repair hull breaches, and as a consequence can never repair a breached system."
 * "Fires (one is enough) stop and reset the repairs in damaged systems."
 * INFERRED: every damaged system progresses at once, not one room at a time.
 * The Flagship AI keeps its own inferred rate in flagship-systems.ts and is not this rule.
 */
function autoRepair(ship: Ship, room: Room, dt: number) {
  if (!ship.automated || ship.flagship) return;
  const sys = room.system ? ship.systems[room.system] : undefined;
  const kit = room.kit ? ship.kits[room.kit] : undefined;
  if (room.fire > 0) {
    if (sys) sys.fix = 0;
    if (kit) kit.fix = 0;
    return;
  }
  if (room.breach > 0) return;
  const pace = dt / 3;
  if (sys && sys.damage > 0) {
    sys.fix += pace;
    if (sys.fix >= REPAIR_SECONDS) {
      sys.damage -= 1;
      sys.fix = 0;
    }
  }
  if (kit && (kit.damage ?? 0) > 0) {
    kit.fix = (kit.fix ?? 0) + pace;
    if (kit.fix >= REPAIR_SECONDS) {
      kit.damage = Math.max(0, (kit.damage ?? 0) - 1);
      kit.fix = 0;
      kit.power = kit.level - kit.damage;
    }
  }
}

function life(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  const friends: "player" | "enemy" = aboard === "player" ? "player" : "enemy";
  const closedSlow = doorSpreadSlow(g, ship, aboard);
  for (const r of ship.rooms) {
    const present = g.crew.filter((c) => c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0);
    // Mind Control, "Overview": a leashed crew member is an ally of the side holding it and "treated as an intruder"
    // by its own crew, in both directions. Medbay heals only `pals`, so "Enemy Medbays will not heal them" and
    // "your mind-controlled crew can heal in the enemy Medbay" follow from the same split.
    const withUs = (c: Crew) => sideOf(c) === friends;
    const pals = present.filter((c) => withUs(c) && (c.stun ?? 0) <= 0);
    const foes = present.filter((c) => !withUs(c));
    // @agent:flagship. A flagship artillery room's own gun state (wiki/flagship-systems.ts), else null.
    const gun = artilleryGun(ship, r.id);
    // Augmentations, "Slug Repair Gel": every breached player room, at 75% of regular crew repair speed, stacked on the same counter.
    if (aboard === "player" && r.breach > 0 && g.augments.includes("gel")) r.breachFix += 0.75 * dt;
    if (pals.length && foes.length) {
      // INFERRED: 6 damage a second while trading blows. The wiki lists crew health, not this flat rate.
      // Crew skills, Combat skill: the attacker's rank multiplies damage dealt (×1 / ×1.1 / ×1.2). Level 0 is default.
      const dps = 6;
      const dealt = (attacker: Crew) => combatSkillMult(rankOf(attacker, "combat"));
      for (const c of foes) {
        const hit = pals.reduce(
          (sum, p) => sum + (dps / foes.length) * dt * leashMult(p) * kinOf(p.kin ?? "plain").fight * dealt(p),
          0,
        );
        c.hp -= hit;
        for (const p of pals) bumpXp(g, p, "combat", dt);
      }
      for (const c of pals) {
        const incoming = foes.reduce(
          (sum, f) => sum + (dps / pals.length) * dt * leashMult(f) * kinOf(f.kin ?? "plain").fight * dealt(f),
          0,
        );
        c.hp -= incoming;
        bumpXp(g, c, "combat", dt);
      }
    } else if (r.fire > 0 && pals.length) {
      fightFire(r, pals, dt);
    } else if (pals.length && r.breach > 0 && r.system && (gun ?? ship.systems[r.system]).damage <= 0) {
      // Skills: "It takes 12.5 seconds for an untrained Human to repair one system bar, or to repair a breach"; skill speeds both.
      r.breachFix += pals.reduce((sum, c) => sum + repairPace(c), 0) * dt;
      // Skills: "sealing hull breaches provides no experience", so no bumpXp here.
    } else if (pals.length && r.kit && (ship.kits[r.kit]?.damage ?? 0) > 0 && r.o2 > 5) {
      // Same crew repair as a system room (REPAIR_SECONDS). An enemy re-powers each bar it fixes:
      // its reactor is sized to its capacity (enemy-gen.ts).
      const kit = ship.kits[r.kit]!;
      // @agent:hacking. Hacking, "Overview": "Repair speed of the system is halved" under a hacking drone (spike.ts).
      kit.fix =
        (kit.fix ?? 0) +
        pals.reduce((sum, c) => sum + repairPace(c), 0) * dt * hackRepairScale(g, ship, r.kit);
      for (const c of pals) bumpXp(g, c, "repair", dt);
      if (kit.fix >= REPAIR_SECONDS) {
        kit.damage = Math.max(0, (kit.damage ?? 0) - 1);
        kit.fix = 0;
        if (ship === g.enemy) kit.power = kit.level - kit.damage;
        log(g, `${r.title} repaired.`);
      }
    } else if (pals.length && r.system && (gun ?? ship.systems[r.system]).damage > 0 && r.o2 > 5) {
      // @agent:flagship. Artillery rooms repair their own gun ("the Flagship crew can contest your boarding and repair
      // damage to those weapons"); every other room its system.
      const sys = gun ?? ship.systems[r.system];
      // @agent:hacking. Hacking, "Overview": "Repair speed of the system is halved" under a hacking drone (spike.ts).
      sys.fix += pals.reduce((sum, c) => sum + repairPace(c), 0) * dt * hackRepairScale(g, ship, r.system);
      for (const c of pals) bumpXp(g, c, "repair", dt);
      if (sys.fix >= REPAIR_SECONDS) {
        sys.damage = Math.max(0, sys.damage - 1);
        sys.fix = 0;
        log(g, `${r.title} repaired.`);
        sfx(g, "click");
      }
    }
    // Same 12.5 s as a system bar ("or to repair a breach"). Gel uses that same counter, including in an empty room.
    if (r.breach > 0 && r.breachFix >= REPAIR_SECONDS) {
      r.breach = Math.max(0, r.breach - 1);
      r.breachFix = 0;
      log(g, `${r.title} leak sealed.`);
    }
    spreadFire(g, ship, r, closedSlow, dt);
    // Medbay: level 1 heals at 6.4 HP/s, level 2 at 9.6, level 3 at 19.2.
    // Medbay page: level 1 equals the suffocation rate, so an airless level 1 bay negates a full-rate human
    // (Oxygen: "negates the suffocation damage"). Crystals, and crew with Emergency Respirators, net-heal there.
    // Level 2 and 3 heal in an airless bay without that augment. Low oxygen does not turn the bay off.
    if (mainBars(g, ship, aboard, "medbay") > 0 && r.system === "medbay" && r.fire <= 0 && foes.length === 0) {
      const powered = mainBars(g, ship, aboard, "medbay");
      const rate = powered >= 3 ? 19.2 : powered >= 2 ? 9.6 : 6.4;
      for (const c of pals) c.hp = Math.min(c.maxHp, c.hp + rate * dt);
    }
    // Oxygen: at 5% or less, crew lose 6.4 HP per second, scaled per crew (Emergency Respirators, then kin).
    if (r.o2 <= 5) {
      for (const c of present) c.hp -= 6.4 * suffocateScale(g, c) * kinOf(c.kin ?? "plain").suffocate * dt;
    } else burnIntruders(r, foes, dt);
    autoRepair(ship, r, dt);
    r.flash = Math.max(0, r.flash - dt);
  }
}

function shieldRegen(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  const cap = maxBubbles(ship, zoltanBars(g.crew, ship, aboard, "shields"));
  if (ship.shieldNow > cap) ship.shieldNow = cap;
  // @agent:hacking. Hacking, "Overview" (Shields): no recharge while an enemy pulse discharges them (extras/spike.ts).
  if (ship.shieldNow < cap && mainBars(g, ship, aboard, "shields") >= 2 && !hackHoldsShields(g, ship)) {
    const op = manningCrew(g, ship, aboard, "shields");
    // Crew skills, Shields skill: recharge rate ×1.1 / ×1.2 / ×1.3. An undamaged auto-ship keeps the untrained ×1.1.
    const shields = ship.systems.shields;
    const rate = ship.automated && shields.level > 0 && shields.damage === 0
      ? SHIELD_RATE[0]
      : op
        ? SHIELD_RATE[rankOf(op, "shields")]
        : 1;
    const need = shieldLayerSeconds(ship.shieldNow + 1) / (rate * shieldBoost(g, aboard));
    ship.shieldCharge += dt;
    if (ship.shieldCharge >= need) {
      ship.shieldCharge = 0;
      ship.shieldNow += 1;
    }
  } else ship.shieldCharge = 0;
}

function tickIons(ship: Ship, dt: number) {
  for (const id of ALL_SYS) {
    const sys = ship.systems[id];
    if (!sys.ion.length) continue;
    sys.ion = sys.ion.map((t) => t - dt).filter((t) => t > 0.05);
  }
}

// INFERRED: rocks every 8s (1 damage, 5% breach) and artillery every 14s (1 damage, 15% fire, 10% breach).
// Those intervals are not on the fetched pages.
function environment(g: Game, dt: number) {
  if (g.asteroid) {
    g.asteroidT += dt;
    if (g.asteroidT >= 8) {
      g.asteroidT = 0;
      g.shots.push({
        id: uid(g),
        kind: "laser",
        from: "env",
        damage: 1,
        ion: 0,
        fireChance: 0,
        breachChance: 0.05,
        targetRoom: pick(g, g.player.rooms).id,
        wait: 0.2,
        t: 0,
        duration: 0.8,
        label: "Rock",
      });
      log(g, "Asteroid inbound.");
    }
  }
  if (g.asb) {
    g.asbT += dt;
    if (g.asbT >= 14) {
      g.asbT = 0;
      const asb = citedAsbShot();
      g.shots.push({
        id: uid(g),
        kind: "missile",
        from: "env",
        damage: asb.damage,
        ion: 0,
        fireChance: asb.fireChance,
        breachChance: asb.breachChance,
        // Environmental Hazards, Anti-Ship Batteries: "hitting a random room" (wiki/targeting.ts).
        targetRoom: randomRoom(g, g.player),
        wait: 0.15,
        t: 0,
        duration: 1.1,
        label: "Artillery",
      });
      log(g, "Line artillery.");
      sfx(g, "alarm");
    }
  }
}

function bossThink(g: Game, dt: number) {
  // "Global behavior": the surge exists on the second and third stage only.
  // "Power Surge": the wait is a random 20–30s. The two shots below are INVENTED; the page describes a surge, not this burst.
  // @agent:flagship. Endless missiles, surge drones in flight, and the AI takeover (wiki/flagship-systems.ts).
  if (g.enemy?.flagship) tickFlagship(g, dt);
  if (!g.enemy || g.beacons.find((b) => b.id === g.here)?.kind !== "boss") return;
  if (g.ramStage < 2) return;
  g.bossSurge -= dt;
  // "A warning sounds exactly 5 seconds before the surge begins."
  surgeWarning(g, g.enemy, g.bossSurge);
  if (g.bossSurge > 0) return;
  g.bossSurge = rollSurge(g.ramStage, rand(g)) ?? 25;
  surgeRearm(g.enemy);
  sfx(g, "alarm");
  // @agent:flagship. The two INVENTED lasers are gone: stage 2 deploys the printed surge drones, stage 3 fires
  // "7 laser shots simultaneously" or restores the Zoltan Shield every 4th surge (wiki/flagship-systems.ts).
  firePowerSurge(g, g.enemy);
}

// INVENTED: two boarders, Hook and Barb, after the timer set in startCombat.
/** Enemy boarding lives in extras/sling.ts (Crew Teleporter, "Enemy Crew Teleporter"). */
function boarders(g: Game, dt: number) {
  tickEnemyBoarding(g, dt);
}

// INVENTED: boarders pick a new system every 4–7 seconds.
function wanderBoarders(g: Game, dt: number) {
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "player" || c.hp <= 0) continue;
    c.think -= dt;
    if (c.path.length > 0 || c.think > 0) continue;
    // Crystal, "Crystal Lockdown": a new walk cannot start out of a coated room.
    if (coated(g.player, c.room)) {
      c.think = 4 + rand(g) * 3;
      continue;
    }
    const options = g.player.rooms.filter((r) => r.system && !coated(g.player, r.id));
    if (!options.length) {
      c.think = 4 + rand(g) * 3;
      continue;
    }
    const dest = pick(g, options).id;
    const path = bfs(g.player, c.room, dest);
    if (path && path.length) {
      c.path = path;
      c.move = 0;
    }
    c.think = 4 + rand(g) * 3;
  }
}

function reap(g: Game) {
  const dead = g.crew.filter((c) => c.hp <= 0);
  if (!dead.length) return;
  for (const c of dead) {
    if (noteDeath(g, c)) continue;
    // Wiki page "Zoltans", section "Race characteristics": death burst deals 15 HP to enemy crew in the same room.
    // Wiki page "Zoltans", section "Race characteristics": a drone in that room loses 7.5 HP.
    // Wiki page "Zoltans", section "Race characteristics": damage to allies while mind-controlled has no printed number, so it is not applied.
    if (c.kin === "spark") {
      for (const other of g.crew) {
        if (other.hp <= 0 || other.id === c.id) continue;
        if (other.room !== c.room || other.aboard !== c.aboard) continue;
        if (other.side === c.side) continue;
        other.hp -= 15;
      }
      zoltanBurstDrones(g, c);
    }
    if (c.side === "player") log(g, `${c.name} is gone.`);
  }
  g.crew = g.crew.filter((c) => c.hp > 0 || (c.cloneIn ?? 0) > 0);
  if (g.selected && !g.crew.some((c) => c.id === g.selected)) g.selected = null;
}

function endCheck(g: Game) {
  if (g.phase !== "combat") return;
  const live = g.crew.filter((c) => c.side === "player" && (c.hp > 0 || (c.cloneIn ?? 0) > 0));
  if (g.player.hull <= 0) {
    lose(g, "hull");
    return;
  }
  if (live.length === 0) {
    lose(g, "crew");
    return;
  }
  // Enemy Ships / Clone Bay: a manned ship is beaten when its whole crew is dead, unless its Clone Bay still holds
  // the fight ("If the enemy ship's crew is dead, the battle will continue until their Clone Bay is destroyed").
  // AI-Controlled Rebel Ships are unmanned, and the Flagship's AI takes over (The Rebel Flagship), so neither counts.
  if (g.enemy && !g.enemy.automated && g.enemy.classId) {
    const enemyAlive = g.crew.some((c) => c.side === "enemy" && c.hp > 0);
    if (!enemyAlive && !enemyCloneHolds(g)) {
      log(g, "Their crew is dead.");
      winCombat(g);
      return;
    }
  }
  if (g.enemy && g.enemy.hull <= 0) {
    const boss = g.beacons.find((b) => b.id === g.here)?.kind === "boss";
    if (boss && g.ramStage < 3) {
      advanceRam(g);
      return;
    }
    winCombat(g);
  }
}

function advanceRam(g: Game) {
  const enemy = g.enemy;
  if (!enemy) return;
  const next: 2 | 3 = g.ramStage === 1 ? 2 : 3;
  g.ramStage = next;
  // "Global behavior": hull and system damage are repaired when the next stage starts.
  for (const sys of Object.values(enemy.systems)) sys.damage = 0;
  // @agent:flagship. "At the end of the first and second stage, the Flagship will lose a part of its hull along with
  // the rooms, systems, and weapons in the corresponding location." New rooms also clear "Breach and fire".
  flagshipStage(g, enemy, next);
  citedEnemy(g, "boss", enemy, g.crew);
  // The Rebel Flagship: a high scrap reward at sector 1 value. Stage 3 is the victory path and pays none.
  const band = flagshipStageScrap(g.difficulty);
  const eligible = band[0] + irand(g, band[1] - band[0] + 1);
  const scrap = adjustScrap(g, eligible);
  addScrap(g, scrap, eligible);
  const wait = rollSurge(next, rand(g));
  g.bossSurge = wait ?? 25;
  log(g, next === 2 ? "The Flagship brings up the second hull." : "The Flagship brings up its last hull.");
}

function lose(g: Game, reason: "hull" | "crew") {
  g.phase = "defeat";
  g.outcome = g.training ? "tutorial" : reason;
  g.paused = true;
  g.picking = false;
  g.sectorMap = false;
  sfx(g, "die");
  clearSave();
}

function winCombat(g: Game) {
  const boss = g.beacons.find((b) => b.id === g.here)?.kind === "boss";
  // @agent:quests. {{Winning|deadCrew=true}}: the fight ended with their crew dead, not their hull (read before clean-up).
  const deadCrew = !!g.enemy && g.enemy.hull > 0 && !g.crew.some((c) => c.side === "enemy" && c.hp > 0);
  g.kills += 1;
  // Mind Control: an enemy hold ends with the fight.
  clearEnemyLeash(g);
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemy = null;
  g.shots = [];
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  if (boss) {
    g.phase = "victory";
    g.outcome = "victory";
    g.sectorMap = false;
    sfx(g, "win");
    clearSave();
    return;
  }
  // Rebel Fleet: the only reward for the Elite is 1 fuel, or 4 if you were already out.
  const dive = g.pending === "dive:4" ? 4 : g.pending === "dive:1" ? 1 : 0;
  if (dive) {
    g.pending = null;
    g.fuel += dive;
    g.reward = { scrap: 0, note: `${dive} fuel.` };
    g.phase = "reward";
    g.paused = true;
    sfx(g, "win");
    const taken = g.beacons.find((x) => x.id === g.here);
    if (taken) taken.resolved = true;
    return;
  }
  fightUnlock(g, g.fightEvent); // @agent:unlocks. A ship-unlocking page's fight won (Rebel shipyard: "You unlock the Federation Cruiser.").
  // @agent:quests. An event page that prints its own destroyed / crew-killed reward pays that instead of the default
  // salvage below, and may open a follow-up card (wiki/quests.ts PAGE_WINS).
  if (!g.pending && pageWin(g, g.fightEvent, deadCrew)) {
    const won = g.beacons.find((x) => x.id === g.here);
    if (won) won.resolved = true;
    g.fightEvent = null;
    return;
  }
  const band = SCRAP_MEDIUM[Math.min(7, Math.max(0, g.sector - 1))];
  // Score, s: the band counts. Scrap Recovery Arm's extra does not. Repair Arm does not reduce s.
  let eligible = band[0] + irand(g, band[1] - band[0] + 1);
  let scrap = adjustScrap(g, eligible);
  const notes: string[] = [];
  if (g.pending === "crew") {
    addCrew(g);
    notes.push("A survivor comes aboard.");
    g.pending = null;
  } else if (g.pending === "exit-clear") {
    g.pending = null;
    const beacon = g.beacons.find((x) => x.id === g.here);
    if (beacon) beacon.flag = "";
  } else if (g.pending?.startsWith("bonus:")) {
    const extra = Number(g.pending.slice(6)) || 0;
    scrap += extra;
    eligible += extra;
    g.pending = null;
  }
  // INFERRED: missile 34%, fuel 28%, weapon 16% or 12 scrap. Stores, "Resources" does not list defeat drops.
  if (rand(g) < 0.34) {
    g.missiles += 1;
    notes.push("Missile salvaged.");
  }
  if (rand(g) < 0.28) {
    g.fuel += 1;
    notes.push("Fuel siphoned.");
  }
  if (rand(g) < 0.16) {
    const owned = new Set(g.player.weapons.map((w) => w.defId));
    let options = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
    // Sectors, "Hidden Crystal Worlds", "Sector specifics": a crew-kill reward is a crystal weapon, including the Lockdown Bomb.
    // A hull kill keeps the priced pool. The 16% above stays inferred.
    if (deadCrew && g.sectorName === "Hidden Crystal Worlds") {
      const allowed = new Set<string>(CRYSTAL_SECTOR_WEAPONS);
      options = options.filter((w) => allowed.has(w.id));
    }
    if (options.length && g.player.weapons.length < 3) {
      const def = pick(g, options);
      giveWeapon(g, def.id);
      notes.push(`${def.name} mounted.`);
    } else {
      scrap += 12;
      eligible += 12;
    }
  }
  addScrap(g, scrap, eligible);
  g.reward = { scrap, note: notes.join(" ") };
  g.phase = "reward";
  g.paused = true;
  sfx(g, "win");
  const b = g.beacons.find((x) => x.id === g.here);
  if (b) b.resolved = true;
}

// INVENTED: three weapon slots.
function giveWeapon(g: Game, defId: string) {
  if (g.player.weapons.length >= 3) return;
  if (g.player.weapons.some((w) => w.defId === defId)) return;
  g.player.weapons.push({
    uid: uid(g),
    defId,
    charge: 0,
    enabled: false,
    autofire: false,
    target: null,
  });
}

// INVENTED: a fifth crew pays 15 scrap instead, and a new hire starts at 80 HP.
function addCrew(g: Game) {
  if (g.crew.filter((c) => c.side === "player").length >= 5) {
    addScrap(g, 15);
    return;
  }
  const used = new Set(g.crew.map((c) => c.name));
  const name = CREW_POOL.find((n) => !used.has(n)) ?? "Rook Vale";
  g.crew.push({
    id: uid(g),
    name,
    side: "player",
    aboard: "player",
    hp: 80,
    maxHp: 100,
    room: "p-medbay",
    path: [],
    move: 0,
    think: 0,
    tone: g.crew.length % 3,
  });
}

/**
 * Wiki page "The Rebel Flagship" sets this hull's numbers through citedEnemy.
 * MISMATCH and INVENTED: the two-row grid and the starting loadout below are placeholders that
 * citedEnemy overwrites where the page prints a value.
 * @agent:flagship. The grid is now swapped for the traced stage-1 rooms by flagshipStage before the crew boards.
 */
function makeFlagship(g: Game, boss = false): { ship: Ship; crew: Crew[] } {
  const rooms: Room[] = [
    room({ id: "e-shields", title: "Shields", system: "shields", x: 0, y: 0, w: 2, h: 1 }),
    room({ id: "e-weapons", title: "Weapons", system: "weapons", x: 2, y: 0, w: 2, h: 1 }),
    room({ id: "e-oxygen", title: "Oxygen", system: "oxygen", x: 0, y: 1, w: 1, h: 1 }),
    room({ id: "e-pilot", title: "Piloting", system: "pilot", x: 1, y: 1, w: 1, h: 1 }),
    room({ id: "e-engines", title: "Engines", system: "engines", x: 2, y: 1, w: 2, h: 1 }),
  ];
  const ship: Ship = {
    name: "Rebel Flagship",
    hull: 20,
    hullMax: 20,
    reactor: 12,
    systems: systems({ shields: [4, 4], engines: [3, 3], oxygen: [1, 1], weapons: [4, 4], pilot: [1, 1] }),
    rooms,
    doors: addDoors(rooms),
    weapons: ["lineburst", "dart"].map((defId) => enemyGun(g, defId)),
    ammo: 6,
    shieldNow: 2,
    shieldCharge: 0,
    cols: 4,
    rows: 2,
    kits: {},
    parts: 0,
  };
  // @agent:flagship. Retreat memory ("Global behavior"): a boss fight left during stage 2 or 3 resumes at that stage
  // with only the surviving crew; hull, systems, fire, and breaches come back fresh (wiki/flagship-systems.ts).
  const memo = boss ? takeFlagshipMemo(g) : null;
  if (memo) {
    flagshipStage(g, ship, memo.stage);
    const kept = resumeCrew(ship, memo);
    citedEnemy(g, "boss", ship, kept);
    return { ship, crew: kept };
  }
  // @agent:flagship. The placeholder grid above is replaced by the traced stage-1 cutaway and its systems.
  flagshipStage(g, ship, 1);
  // "The Rebel Flagship", "1st Stage" / "General": the crew is Human, one seat each (wiki/flagship-systems.ts).
  const crew: Crew[] = flagshipSeats(g.difficulty === "hard").map((roomId) => enemyCrew(g, "plain", "Human", roomId));
  citedEnemy(g, "boss", ship, crew);
  return { ship, crew };
}

/**
 * @agent:flagship. Put a Rebel Flagship stage on `ship`: the traced rooms and door bars (wiki/flagship-layout.ts,
 * Hard links on Hard), the stage's kits, drone parts, and boarding plan, then move crew aboard onto the new rooms.
 * "Global behavior": "Hull and system damage of the Rebel Flagship will be repaired on the next stage. Breach and fire
 * will also be cleared." citedEnemy then sets the printed hull, reactor, and levels.
 */
function flagshipStage(g: Game, ship: Ship, stage: 1 | 2 | 3) {
  const laid = flagshipRooms(stage, g.difficulty === "hard");
  const old = ship.rooms;
  ship.rooms = laid.rooms.map((r) => room(r));
  ship.doors = addDoors(ship.rooms, laid.marks);
  ship.doorMarks = laid.marks;
  ship.cols = laid.cols;
  ship.rows = laid.rows;
  // INFERRED: ion locks clear with the system damage.
  for (const sys of Object.values(ship.systems)) {
    sys.damage = 0;
    sys.ion = [];
    sys.fix = 0;
  }
  if (stage > 1) clearEnemyLeash(g);
  applyFlagshipSystems(ship, stage);
  if (stage > 1) carryCrew(g, old, ship);
  armDoors(ship, doorLevel(g, ship, "enemy"));
  // INFERRED: the stage-3 teleporter starts boarding 9 s in, as startCombat does for any boarding hull.
  if (stage === 3) g.boardTimer = 9;
}

/** Enemy subsystem kits at their rolled level, fully powered. The extras modules read ship.kits on either hull. */
function enemyKits(levels: Partial<Record<KitId, number>>): Ship["kits"] {
  const kits: Ship["kits"] = {};
  for (const [id, level] of Object.entries(levels) as [KitId, number][]) {
    kits[id] = { id, level, power: level, left: 0, cool: 0, target: null, on: false, aux: 0 };
  }
  return kits;
}

function enemyGun(g: Game, defId: string): WeaponInst {
  // INFERRED: enemy guns start up to 35% charged.
  return { uid: uid(g), defId, charge: rand(g) * 0.35, enabled: true, autofire: true, target: null };
}

function enemyCrew(g: Game, kin: KinId, race: string, roomId: string): Crew {
  const hp = kinOf(kin).hp;
  return { id: uid(g), name: race, side: "enemy", aboard: "enemy", hp, maxHp: hp, room: roomId, path: [], move: 0, think: 0, tone: 3, kin };
}

/**
 * Every other fight: a documented class from the faction pages (enemy-gen.ts, wiki/enemy-ships.ts).
 * "elite" is a Rebel Elite (fleet-overtaken beacons). Any other tier string draws from the sector pool.
 */
function makeEnemy(g: Game, tier: string, event?: string): { ship: Ship; crew: Crew[] } {
  // Cited event "second Rebel Flagship" (Rebel shipyard) is the flagship hull as well.
  // @agent:flagship. Only the Last Stand fight resumes a remembered stage (wiki/flagship-systems.ts takeFlagshipMemo).
  if (tier === "boss" || /flagship/i.test(tier)) return makeFlagship(g, tier === "boss");
  const ctx = { sector: g.sector, sectorName: g.sectorName, difficulty: g.difficulty };
  const r = () => rand(g);
  const picked = tier === "elite" ? { cls: pickElite(r), pirate: false } : pickEnemy(ctx, r, { ...requestFor(tier), event });
  const spec = rollEnemy(picked.cls, picked.pirate, ctx, r);
  const rooms = spec.rooms.map((x) => room(x));
  const shields = spec.systems.shields?.[1] ?? 0;
  const ship: Ship = {
    name: spec.name,
    hull: spec.hull,
    hullMax: spec.hull,
    // Decision: an enemy reactor is the size of its needed capacity (systems and subsystem kits, fully powered).
    reactor: spec.reactor,
    systems: systems(spec.systems),
    rooms,
    doors: addDoors(rooms),
    weapons: spec.weapons.map((defId) => enemyGun(g, defId)),
    ammo: spec.missiles,
    shieldNow: Math.floor(shields / 2),
    shieldCharge: 0,
    cols: spec.cols,
    rows: spec.rows,
    kits: enemyKits(spec.kits),
    // @agent:drones. Enemy Ships, "Missile and drone stocks" (enemy-gen.ts enemyParts).
    parts: spec.parts ?? 0,
    classId: spec.classId,
    faction: picked.cls.faction,
    pirate: spec.pirate,
    automated: spec.automated,
    unwired: spec.unwired,
    boards: spec.boards,
  };
  // @agent:drones. Hidden drone loadout. extras/swarm.ts deploys it on the first combat tick.
  if (ship.kits.swarm && spec.drones?.length) ship.kits.swarm.loadout = [...spec.drones];
  const crew = spec.crew.map((c) => enemyCrew(g, c.kin, c.race, c.room));
  citedEnemy(g, tier, ship, crew);
  return { ship, crew };
}

export function startCombat(g: Game, tier: string, asteroid = false, event?: string) {
  const built = makeEnemy(g, tier, event);
  // Enemy Ships, "Surrenders and escape attempts": who runs, when, and for how long. See wiki/escape.ts.
  g.enemyEscape = escapePlan(
    { tier, event, lastFuel: g.fuel <= 0, faction: built.ship.faction, pirate: built.ship.pirate },
    () => rand(g),
  );
  // @agent:surrender. Enemy Ships: "Enemies may also surrender after dropping below a hull threshold." wiki/surrender.ts.
  g.enemySurrender = surrenderPlan({ tier, event, faction: built.ship.faction, pirate: built.ship.pirate }, () => rand(g));
  // @agent:quests. The page that started this fight, for its own win reward (wiki/quests.ts pageWin).
  g.fightEvent = event ?? null;
  g.stalemate = null;
  g.enemy = built.ship;
  g.crew = g.crew.filter((c) => c.side === "player");
  // Mind Control: no hold from an earlier fight (fled or jumped away) carries into this one.
  clearEnemyLeash(g);
  g.crew.push(...built.crew);
  for (const w of g.player.weapons) {
    w.charge = 0;
    w.target = null;
  }
  g.shots = [];
  g.phase = "combat";
  g.paused = false;
  g.flee = 0;
  g.enemyFlee = 0;
  g.picking = false;
  g.manual = false;
  g.shipSheet = false;
  g.event = null;
  g.asteroid = asteroid;
  // INFERRED: first rock at 3s, artillery at 6s, boarders at 9s. First surge wait is 12s; "Power Surge" says 20–30s.
  g.asteroidT = 3;
  const here = g.beacons.find((b) => b.id === g.here);
  // Rebel Fleet: not on a nebula beacon, and never on an Easy exit. Overtaken column is the existing test.
  g.asb = citedAsb(g, here);
  g.asbT = 6;
  // INFERRED: a hull with a Crew Teleporter boards 9 seconds in.
  g.boardTimer = built.ship.boards ? 9 : 0;
  // @agent:flagship. A resumed boss fight starts at the remembered stage, with a fresh 20–30 s surge wait.
  const bossStage = built.ship.flagship?.stage ?? 1;
  g.bossSurge = tier === "boss" ? (bossStage > 1 ? (rollSurge(bossStage, rand(g)) ?? 25) : 12) : 0;
  g.ramStage = tier === "boss" ? bossStage : g.ramStage;
  g.tutorial = g.kills === 0 && g.sector === 1;
  g.time = 0;
  if (g.armed == null) g.armed = g.player.weapons.find((w) => w.enabled)?.uid ?? null;
  armDoors(g.player, doorLevel(g, g.player, "player"));
  armDoors(built.ship, doorLevel(g, built.ship, "enemy"));
  log(g, `${built.ship.name} on the scope.`);
  sfx(g, "alarm");
}

function enemyAboard(g: Game): boolean {
  return g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
}

/**
 * Destroyed cargo ship, Research station with no response, Abandoned station, Refugee comms down: boarders beam
 * aboard and no enemy ship is on the page. startCombat would delete them and put a hull on the scope.
 * Opens the crew fight only: phase combat, enemy stays null. The play view already ticks that phase.
 * `asb` is Abandoned station's planet-side battery. The first shot waits the same 6s startCombat uses; the 14s
 * interval stays the existing one.
 * INFERRED: the beacon is spent when they board, so the card does not reopen. Killing them is not a ship kill.
 * INVENTED: the log line when the last boarder dies (tickBoarding).
 */
export function beginBoarding(g: Game, asb = false) {
  if (!enemyAboard(g)) return;
  g.enemy = null;
  g.shots = [];
  g.phase = "combat";
  g.paused = false;
  g.flee = 0;
  g.enemyFlee = 0;
  g.event = null;
  g.picking = false;
  g.fightEvent = null;
  g.enemyEscape = null;
  g.enemySurrender = null;
  g.asb = asb;
  if (asb) g.asbT = 6;
  const b = g.beacons.find((x) => x.id === g.here);
  if (b && b.kind !== "boss") b.resolved = true;
  sfx(g, "alarm");
}

function link(a: Beacon, b: Beacon) {
  if (!a.links.includes(b.id)) a.links.push(b.id);
  if (!b.links.includes(a.id)) b.links.push(a.id);
}

// INVENTED: beacon kind weights.
const KINDS: Beacon["kind"][] = [
  "hostile",
  "hostile",
  "hostile",
  "hostile",
  "empty",
  "store",
  "distress",
  "event",
  "nebula",
  "cache",
];

const ONCE_SECTOR = new Set([
  "engi-home",
  "zoltan-home",
  "mantis-home",
  "rebel-stronghold",
  "rock-home",
  "slug-home",
]);

function mixSeed(seed: number, salt: number) {
  let x = (Math.imul(seed ^ salt, 0x9e3779b9) ^ (salt * 13)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  return (x ^ (x >>> 15)) >>> 0;
}

/** Sectors page: the chart from the starting sector to The Last Stand. Hidden Crystal Worlds is not on it. */
export function buildRoute(seed: number): SectorNode[] {
  const used = new Set<string>();
  const start = SECTOR_TYPES.find((s) => s.id === "civilian-start");
  const last = SECTOR_TYPES.find((s) => s.id === "last-stand");
  const nodes: SectorNode[] = [
    {
      id: "sec-0",
      name: start?.name ?? "Civilian (Starting) Sector",
      group: "civilian",
      col: 0,
      row: 1,
      links: [],
    },
  ];
  const groupOf = (group: string): SectorNode["group"] =>
    group === "hostile" || group === "nebula" ? group : "civilian";
  const poolFor = (sector: number) =>
    SECTOR_TYPES.filter((s) => {
      if (s.id === "civilian-start" || s.id === "crystal-worlds" || s.id === "last-stand") return false;
      if (s.group !== "civilian" && s.group !== "hostile" && s.group !== "nebula") return false;
      if (used.has(s.id)) return false;
      if ((s.id === "engi-home" || s.id === "zoltan-home" || s.id === "mantis-home") && sector < 3) return false;
      if ((s.id === "rebel-stronghold" || s.id === "rock-home") && sector < 5) return false;
      if ((s.id === "slug-nebula" || s.id === "slug-home") && sector < 4) return false;
      return true;
    });
  for (let sector = 2; sector <= 7; sector++) {
    const pool = poolFor(sector);
    const a = pool[mixSeed(seed, sector * 2) % pool.length];
    if (ONCE_SECTOR.has(a.id)) used.add(a.id);
    const rest = pool.filter((s) => s.id !== a.id);
    const b = rest[mixSeed(seed, sector * 2 + 1) % rest.length];
    if (ONCE_SECTOR.has(b.id)) used.add(b.id);
    const col = sector - 1;
    nodes.push({ id: `sec-${col}-a`, name: a.name, group: groupOf(a.group), col, row: 0, links: [] });
    nodes.push({ id: `sec-${col}-b`, name: b.name, group: groupOf(b.group), col, row: 2, links: [] });
  }
  nodes.push({
    id: "sec-7",
    name: last?.name ?? "The Last Stand",
    group: "last-stand",
    col: 7,
    row: 1,
    links: [],
  });
  for (let col = 0; col < 7; col++) {
    const from = nodes.filter((n) => n.col === col);
    const to = nodes.filter((n) => n.col === col + 1);
    for (const node of from) node.links = to.map((t) => t.id);
  }
  return nodes;
}

// Walk the old column map on g.seed. Later fights and stores still draw from that stream.
// The exit picket is the one roll this returns; the 6×4 grid does not roll it again.
function burnLegacyMap(g: Game): boolean {
  const last = g.sector >= 8 ? 4 : 6;
  const cols: Beacon["kind"][][] = [];
  for (let c = 0; c <= last; c++) {
    const n = c === 0 || c === last ? 1 : rand(g) < 0.5 ? 2 : 3;
    const col: Beacon["kind"][] = [];
    for (let i = 0; i < n; i++) col.push(c === 0 || c === last ? "empty" : KINDS[irand(g, KINDS.length)]);
    cols.push(col);
  }
  for (let c = 0; c < last; c++) {
    if (cols[c + 1].length < 2) continue;
    for (let i = 0; i < cols[c].length; i++) rand(g);
  }
  const picket = g.sector < 8 && rand(g) < (g.sector === 1 ? 0.45 : 0.7);
  const middles = cols.flat().slice(1, -1);
  if (!middles.some((kind) => kind === "store") && middles.length) middles[0] = "store";
  for (const kind of middles) if (kind === "event") rand(g);
  return picket;
}

// Sectors, lead: a sector contains 19 to 24 beacons.
// Technical details: the map is a 6×4 grid; each square has an 80% chance of a beacon, and a square stays
// filled once too many squares are already empty. INFERRED: "too many" is 5, because 24 − 5 = 19.
// INFERRED: an empty column gets one beacon, so the exit stays reachable. Adjacent squares (including diagonals)
// are linked. The page's 165-pixel cutoff assumes a pixel jitter this map does not have; a beacon with no
// neighbor in the next column still links to the nearest one there.
function makeMap(g: Game) {
  const seed0 = g.seed;
  const picket = burnLegacyMap(g);
  const roll = { seed: seed0 } as Game;
  const COLS = 6;
  const ROWS = 4;
  const placed: { col: number; row: number }[] = [];
  let empty = 0;
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      if (empty >= 5 || rand(roll) < 0.8) placed.push({ col, row });
      else empty += 1;
    }
  }
  for (let col = 0; col < COLS; col++) {
    if (placed.some((p) => p.col === col)) continue;
    placed.push({ col, row: 1 });
  }
  const beacons: Beacon[] = placed.map((p) => ({
    id: `s${g.sector}-c${p.col}-r${p.row}`,
    col: p.col,
    row: p.row,
    links: [],
    kind: "empty",
    visited: false,
    resolved: false,
    name: "Beacon",
    tier: "pool",
    flag: "",
    asteroid: false,
  }));
  for (let i = 0; i < beacons.length; i++) {
    for (let j = i + 1; j < beacons.length; j++) {
      const a = beacons[i];
      const b = beacons[j];
      const dc = Math.abs(a.col - b.col);
      const dr = Math.abs(a.row - b.row);
      if (dc <= 1 && dr <= 1 && dc + dr > 0) link(a, b);
    }
  }
  const inCol = (col: number) => beacons.filter((b) => b.col === col);
  for (let col = 0; col < COLS - 1; col++) {
    const here = inCol(col);
    const next = inCol(col + 1);
    for (const b of next) {
      if (here.some((a) => a.links.includes(b.id))) continue;
      const parent = [...here].sort((a, d) => Math.abs(a.row - b.row) - Math.abs(d.row - b.row))[0];
      link(parent, b);
    }
    for (const a of here) {
      if (next.some((b) => a.links.includes(b.id))) continue;
      const child = [...next].sort((b, d) => Math.abs(b.row - a.row) - Math.abs(d.row - a.row))[0];
      link(a, child);
    }
  }
  const closest = (col: number) =>
    [...inCol(col)].sort((a, b) => Math.abs(a.row - 1.5) - Math.abs(b.row - 1.5) || a.row - b.row)[0];
  const start = closest(0);
  start.kind = "start";
  start.visited = true;
  start.resolved = true;
  // INVENTED: beacon names Departure and Lane out.
  start.name = "Departure";
  const exit = closest(COLS - 1);
  if (g.sector >= 8) {
    // Sectors, "The Last Stand": sector 8 and the Flagship on the right. The column fleet here is INVENTED; the page uses random takeover.
    exit.kind = "boss";
    exit.name = "Flagship";
    exit.tier = "boss";
    g.ramId = exit.id;
    g.ramClock = 2;
  } else {
    exit.kind = "exit";
    exit.name = "Lane out";
    // INVENTED: a picket on the exit. "Exit beacon events" is EXIT_LIST, not these odds.
    // The flag is the roll burned with the old column map, so this grid does not draw it again.
    if (picket) exit.flag = "picket";
    g.ramId = null;
    g.ramClock = 2;
  }
  // INVENTED: beacon names. Kind mix below is only the placeholder; a listed sector is re-dealt by beacon-mix.ts.
  const names = ["Silt", "Hinge", "Marrow", "Kite", "Brine", "Cask", "Loom", "Vesper", "Nock", "Quarry", "Weld", "Pell"];
  let ni = 0;
  const middles = beacons.filter((b) => b !== start && b !== exit);
  for (const b of middles) b.kind = KINDS[irand(roll, KINDS.length)];
  // @agent:beacon-mix. These KINDS rolls are placeholders: the sector name is not known yet here.
  // stampCitedEvents (wiki/beacon-mix.ts) re-deals every free beacon by the Sectors page's "Beacons:" counts
  // for any listed sector type, including stores. Only an unlisted sector name keeps this mix.
  // Stores, "Guaranteed stores": the count depends on sector type. Forcing one store is INFERRED.
  if (!middles.some((b) => b.kind === "store") && middles[0]) middles[0].kind = "store";
  for (const b of middles) {
    b.name = names[ni % names.length];
    ni += 1;
    if (b.kind === "hostile" || b.kind === "event") {
      b.tier = tierFor(g, false);
    }
    if (b.kind === "event") b.asteroid = rand(roll) < 0.5;
    // INVENTED: distress ship tier.
    if (b.kind === "distress") b.tier = "pool";
  }
  // Start first, then later columns. A jump advances the fleet before the dive check, so the next
  // listed beacon has to sit ahead of the column just left.
  const ahead = middles.filter((b) => b.col > start.col).sort((a, b) => a.col - b.col || a.row - b.row);
  const same = middles.filter((b) => b.col <= start.col).sort((a, b) => a.col - b.col || a.row - b.row);
  g.beacons = [start, ...ahead, ...same, exit];
  g.here = start.id;
  g.fleet = 0;
  // INVENTED: sector name fallback.
  g.sectorName = SECTOR_NAMES[g.sector - 1] ?? "Reach";
  onNewSector(g);
}

// INVENTED: which enemy tier a sector rolls.
/** Every hostile beacon draws from the documented pool for its sector (enemy-gen.ts). */
function tierFor(_g: Game, _exit: boolean): string {
  return "pool";
}

function applyHull(g: Game, id: string, picks: CrewPick[] = []) {
  const spec = hullById(id);
  if (!spec) return;
  // Shared grid from makePlayer. Cruiser pages do not publish tile coordinates.
  const ship = makePlayer();
  ship.name = spec.name;
  ship.reactor = spec.reactor;
  ship.systems = systems(spec.systems);
  ship.weapons = spec.weapons.map((defId, i) => ({
    uid: `w-${i}`,
    defId,
    charge: 0,
    enabled: true,
    autofire: false,
    target: null,
  }));
  ship.parts = spec.parts;
  const laid = layoutFor(spec.id);
  if (laid) {
    ship.rooms = laid.rooms.map((r) => room(r));
    ship.doors = addDoors(ship.rooms, laid.marks);
    ship.doorMarks = laid.marks;
    ship.cols = laid.cols;
    ship.rows = laid.rows;
  }
  ship.kits = {};
  for (const [kitId, kit] of Object.entries(spec.kits)) {
    if (!kit) continue;
    ship.kits[kitId as KitId] = {
      id: kitId as KitId,
      level: kit.level,
      power: kit.power,
      left: 0,
      cool: 0,
      target: kit.target ?? null,
      on: kit.on ?? kit.power > 0,
      aux: 0,
    };
  }
  // Kit rooms: Systems, "Each system occupies one predetermined room specific to the ship" (layouts.ts seatKits).
  seatKits(ship);
  ship.shieldNow = Math.floor(ship.systems.shields.power / 2);
  g.player = ship;
  g.hullId = id;
  g.fuel = spec.fuel;
  g.missiles = spec.missiles;
  g.augments = [...spec.augments];
  // Augmentations, "Zoltan Shield": on arrival the ship starts with a green shield that absorbs 5 points.
  // Not an AugmentId: the page has no purchase price, and the store catalog requires one.
  if (spec.unfitted.includes("Zoltan Shield")) ship.zoltan = 5;
  g.armed = ship.weapons[0]?.uid ?? "";
  g.crew = g.crew.filter((c) => c.side !== "player");
  spec.crew.forEach((seat, i) => {
    const kin = kinOf(seat.kin);
    const pick = picks[i] ?? defaultPick(i);
    g.crew.push({
      id: `c-h${i}`,
      name: cleanName(pick.name, i),
      side: "player",
      aboard: "player",
      hp: kin.hp,
      maxHp: kin.hp,
      room: seat.room,
      path: [],
      move: 0,
      think: 0,
      tone: i % 3,
      uniform: clampUniform(pick.uniform),
      kin: seat.kin,
    });
  });
  const guns = spec.weapons.map((id) => WEAPONS[id]?.name ?? id).join(", ");
  log(g, `${spec.name} leaves the hangar.${guns ? ` ${guns}.` : ""}`);
  const pending = spec.unfitted.filter((name) => name !== "Zoltan Shield");
  if (pending.length) log(g, `Not fitted: ${pending.join(", ")}.`);
}

export function createGame(
  seed = (Date.now() ^ 0x9e3779b9) >>> 0,
  hullId?: string,
  difficulty: Difficulty = "normal",
  picks: CrewPick[] = [],
): Game {
  const g = {
    seed: seed || 1,
    uid: 10,
    phase: "map",
    paused: false,
    sector: 1,
    sectorName: SECTOR_NAMES[0],
    beacons: [],
    here: "",
    fleet: 0,
    buoyDelay: 0,
    // Score, s: initial scrap is 30 Easy, 10 Normal, 0 Hard, and it is not added to scrapCollected.
    scrap: START_SCRAP[difficulty],
    difficulty,
    fuel: 16,
    missiles: 0,
    player: makePlayer(),
    enemy: null,
    crew: starterCrew(),
    shots: [],
    log: ["Departure buoy. The fleet is still behind you. The Burst Laser II is the only weapon aboard."],
    selected: null,
    mode: "crew",
    armed: "w-line",
    targeting: false,
    autofireAll: false,
    ramId: null,
    ramClock: 2,
    augments: [],
    event: null,
    stock: null,
    reward: null,
    pending: null,
    tutorial: true,
    hint: true,
    hitstop: 0,
    trauma: 0,
    floaters: [],
    sfx: [],
    time: 0,
    asteroid: false,
    asb: false,
    asteroidT: 0,
    asbT: 0,
    boardTimer: 0,
    bossSurge: 0,
    ramStage: 1,
    flee: 0,
    enemyFlee: 0,
    picking: false,
    outcome: "",
    jumps: 0,
    kills: 0,
    scrapCollected: 0,
    beaconsVisited: 1,
    sectorMap: false,
    route: [],
    routeHere: "",
    hullId: hullId,
    training: false,
    manual: false,
    shipSheet: false,
    muted: false,
    lowHull: false,
  } as Game;
  makeMap(g);
  g.sectorName = "Civilian (Starting) Sector";
  // No wired page lists this sector name, so the stamp places nothing here.
  stampCitedEvents(g);
  g.route = buildRoute(seed || 1);
  g.routeHere = g.route[0]?.id ?? "";
  if (hullId) applyHull(g, hullId, picks);
  return g;
}

function hereBeacon(g: Game): Beacon | undefined {
  return g.beacons.find((b) => b.id === g.here);
}

export function canJumpTo(g: Game, id: string): boolean {
  const here = hereBeacon(g);
  if (!here || id === here.id) return false;
  if (here.links.includes(id)) return true;
  // Augmentations, "Adv. FTL Navigation": any beacon already visited, including one the fleet overtook.
  if (!g.augments.includes("nav")) return false;
  const dest = g.beacons.find((b) => b.id === id);
  if (!dest) return false;
  return navAllows(dest, g.fleet);
}

export function commitJump(g: Game, id: string) {
  if (!canJumpTo(g, id)) return;
  if (g.fuel < 1) {
    log(g, "No fuel.");
    sfx(g, "click");
    return;
  }
  if (g.phase === "combat" && g.flee < 1) {
    log(g, "Jump drive is still charging.");
    return;
  }
  const dest = g.beacons.find((b) => b.id === id);
  if (!dest) return;
  // Stores, "Fuel": one fuel per jump. Rebel Fleet: half only for a nebula beacon outside a nebula sector.
  g.fuel -= 1;
  g.jumps += 1;
  // Score, b: a rebel-held or about-to-be-held beacon does not count. The fleet column that would mark one is INVENTED, so this jump still counts.
  g.beaconsVisited = (g.beaconsVisited ?? 0) + 1;
  onPlayerJump(g);
  // @agent:hacking. Mind Control holds end when the Lark jumps away; cooldown resets (extras/leash.ts leashOnLeave).
  leashOnLeave(g);
  // @agent:flagship. Leaving the boss fight mid-stage: keep its stage and surviving crew (wiki/flagship-systems.ts).
  rememberFlagship(g);
  // Drone Control, Shield Overcharger: a bubble created from none is lost on jump.
  dropOvercharged(g.player);
  // Zoltan Shield, lead: an FTL jump completely recharges the bubble.
  rechargeZoltan(g.player);
  // Crystal, "Crystal Lockdown": an FTL jump recharges Lockdown unless that Crystal is in the Clone Bay.
  rechargeLockdown(g);
  if ((g.buoyDelay ?? 0) > 0) g.buoyDelay -= 1;
  else g.fleet += pursuit(g, citedFleetAdvance(g, dest));
  g.here = dest.id;
  dest.visited = true;
  g.picking = false;
  g.flee = 0;
  g.enemyFlee = 0;
  g.paused = false;
  g.pending = null;
  g.enemy = null;
  g.shots = [];
  g.crew = g.crew.filter((c) => c.side === "player");
  g.asteroid = false;
  g.asb = false;
  armDoors(g.player, doorLevel(g, g.player, "player"));
  // Rebel Fleet: a beacon the column has already taken is a Rebel Elite. Sector 8 is not this column.
  if (g.sector < 8 && dest.col < g.fleet && !dest.resolved) {
    g.pending = "dive:1";
    startCombat(g, "elite", false);
    return;
  }
  if (g.sector >= 8 && g.ramId) {
    const ram = g.beacons.find((b) => b.id === g.ramId);
    if (ram && dest.id !== ram.id) {
      g.ramClock = (g.ramClock || 2) - 1;
      if (g.ramClock <= 0) {
        stepRam(g, ram);
        g.ramClock = 2;
      }
    }
    const now = g.beacons.find((b) => b.id === g.here);
    if (now?.kind === "boss" || now?.id === g.ramId) {
      g.phase = "combat";
      startCombat(g, "boss", false);
      return;
    }
  }
  if (dest.resolved && dest.kind !== "boss") {
    g.phase = "map";
    log(g, `${dest.name} is already quiet.`);
    return;
  }
  arrive(g, dest);
}

// Sectors, "The Last Stand": the Flagship jumps every two player jumps. INFERRED: it steps to the nearest beacon. The name Wake is INVENTED.
function stepRam(g: Game, ram: Beacon) {
  const here = g.beacons.find((b) => b.id === g.here);
  if (!here) return;
  const options = ram.links
    .map((id) => g.beacons.find((b) => b.id === id))
    .filter((b): b is Beacon => !!b && b.col <= ram.col && b.id !== ram.id);
  if (!options.length) return;
  const next = [...options].sort((a, b) => {
    const da = Math.abs(a.col - here.col) + Math.abs(a.row - here.row);
    const db = Math.abs(b.col - here.col) + Math.abs(b.row - here.row);
    return da - db;
  })[0];
  ram.kind = "empty";
  ram.name = "Wake";
  ram.tier = "";
  next.kind = "boss";
  next.name = "Flagship";
  next.tier = "boss";
  next.resolved = false;
  g.ramId = next.id;
  log(g, `The Flagship jumps toward ${next.name === "Flagship" ? "your lane" : next.name}.`);
}

function arrive(g: Game, b: Beacon) {
  if (b.kind === "hostile") {
    startCombat(g, b.tier || "pool", false);
    return;
  }
  if (b.kind === "boss") {
    startCombat(g, "boss", false);
    return;
  }
  if (b.kind === "store") {
    g.stock = rollStock(g);
    g.phase = "store";
    g.paused = true;
    return;
  }
  g.phase = "event";
  g.paused = true;
  g.event = eventFor(g, b);
}

// Plain beacons run documented events: wiki/filler-events.ts (Sectors, "Fallback events", and the EventList templates).
function eventFor(g: Game, b: Beacon): Game["event"] {
  if (b.flag === "engi-cache") return engiCacheEvent();
  if (b.flag === "last-stand-repair") return lastStandRepairEvent();
  // @agent:quests. A quest marker beacon runs its page's "Quest Marker" section (wiki/quests.ts).
  const quest = questEvent(g, b);
  if (quest) return quest;
  const cited = citedEvent(g, b);
  if (cited) return cited;
  // @agent:filler. Empty, distress, items, nebula and leftover event beacons: the documented list for the slot type.
  const filler = fillerEvent(g, b);
  if (filler) return filler;
  if (b.kind === "exit") {
    // INVENTED: the exit text and the picket ("Exit beacon events" is EXIT_LIST, not wired).
    if (b.flag === "picket") {
      return {
        title: "Lane out",
        body: "A picket sits on the only clean vector out of the sector.",
        choices: [{ id: "exit-fight", label: "Push through" }],
      };
    }
    return {
      title: "Lane out",
      body: "The exit buoy is green. The next sector is already louder.",
      choices: [{ id: "exit-leave", label: "Take the lane" }],
    };
  }
  // Anything else (an unknown flag): the sector's empty beacon page, "Nothing happens."
  return emptyEvent(g);
}

// Template:Stores: resources in stores: fuel stock 3–7 at 3, missiles 2–6 at 6, drone parts 2–4 at 8.
// INVENTED: Dart is pinned in the stock. The missile price is the store price, not a Dart price.
function rollStock(g: Game): StockItem[] {
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  // Sectors, "Hidden Crystal Worlds", "Sector specifics": the shelf is crystal weapons, including the Lockdown Bomb.
  // The two-gun count below is the same as every other sector. Dart stays pinned only outside this sector.
  const crystal = g.sectorName === "Hidden Crystal Worlds";
  const guns = crystal
    ? CRYSTAL_SECTOR_WEAPONS.map((id) => WEAPONS[id]).filter((w) => w && w.price > 0 && !owned.has(w.id))
    : Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
  const fuelN = 3 + irand(g, 5);
  const missileN = 2 + irand(g, 5);
  const partN = 2 + irand(g, 3);
  const items: StockItem[] = [
    { id: "fuel", kind: "fuel", ref: "fuel", name: `Fuel ×${fuelN}`, detail: "3 scrap each.", cost: fuelN * 3, amount: fuelN },
    { id: "missiles", kind: "missiles", ref: "missiles", name: `Missiles ×${missileN}`, detail: "6 scrap each.", cost: missileN * 6, amount: missileN },
    { id: "parts", kind: "parts", ref: "parts", name: `Drone parts ×${partN}`, detail: "8 scrap each.", cost: partN * 8, amount: partN },
    {
      id: "repair",
      kind: "repair",
      ref: "repair",
      name: "Hull patch +5",
      detail: `${hullRepairPerPoint(g.sector)} scrap a point.`,
      cost: Math.min(5, g.player.hullMax - g.player.hull) * hullRepairPerPoint(g.sector),
      amount: 5,
    },
  ];
  const dart = guns.find((w) => w.id === "dart");
  const pool = dart && !owned.has("dart") ? [dart, ...guns.filter((w) => w.id !== "dart")] : guns;
  for (const def of pool.slice(0, 2)) {
    items.push({
      id: "gun-" + def.id,
      kind: "weapon",
      ref: def.id,
      name: def.name,
      detail: def.blurb,
      cost: def.price,
      amount: 1,
    });
  }
  items.push(...citedStock(g));
  const repair = items.findIndex((item) => item.kind === "repair");
  if (repair >= 0 && items[repair].cost <= 0) items.splice(repair, 1);
  return items;
}

export function buy(g: Game, id: string) {
  const item = g.stock?.find((s) => s.id === id);
  if (!item) return;
  if (g.scrap < item.cost) {
    log(g, "Not enough scrap.");
    return;
  }
  if (citedBuy(g, item)) {
    g.scrap -= item.cost;
    g.stock = (g.stock ?? []).filter((s) => s.id !== id);
    sfx(g, "click");
    log(g, `Bought ${item.name}.`);
    return;
  }
  if (item.kind === "weapon" && g.player.weapons.length >= 3) {
    log(g, "No free weapon slot.");
    return;
  }
  if (item.kind === "repair" && g.player.hull >= g.player.hullMax) return;
  g.scrap -= item.cost;
  if (item.kind === "fuel") g.fuel += item.amount;
  if (item.kind === "missiles") g.missiles += item.amount;
  if (item.kind === "parts") g.player.parts += item.amount;
  if (item.kind === "repair") {
    const gain = Math.min(item.amount, g.player.hullMax - g.player.hull);
    g.player.hull += gain;
  }
  if (item.kind === "weapon") giveWeapon(g, item.ref);
  g.stock = (g.stock ?? []).filter((s) => s.id !== id);
  sfx(g, "click");
  log(g, `Bought ${item.name}.`);
}

/** @agent:quests. A quest result that "opens a store" at this beacon (wiki/quests.ts). */
export function openStoreHere(g: Game) {
  const b = hereBeacon(g);
  if (b) {
    b.kind = "store";
    b.resolved = false;
  }
  g.event = null;
  g.stock = rollStock(g);
  g.phase = "store";
  g.paused = true;
}

export function leaveStore(g: Game) {
  const b = hereBeacon(g);
  if (b) b.resolved = true;
  g.stock = null;
  g.phase = "map";
  g.paused = false;
}

// Event card choices. The exit and picket payouts are INVENTED; plain beacons run wiki/filler-events.ts.
export function choose(g: Game, id: string) {
  // @agent:surrender. Accept or refuse an enemy's surrender offer (wiki/surrender.ts).
  if (surrenderChoose(g, id)) return;
  // @agent:filler. Choices on the documented filler cards (wiki/filler-events.ts).
  if (fillerChoose(g, id)) return;
  const b = hereBeacon(g);
  const resolve = () => {
    if (b) b.resolved = true;
    g.event = null;
    g.phase = "map";
    g.paused = false;
  };
  switch (id) {
    case "exit-fight":
      g.pending = "exit-clear";
      g.event = null;
      startCombat(g, tierFor(g, true));
      break;
    case "exit-leave":
      // Ancient device, Notes: leaving the Hidden Crystal Worlds does not open the sector chart.
      if (g.sectorName === "Hidden Crystal Worlds") {
        leaveHiddenCrystal(g);
        break;
      }
      openSectorMap(g);
      break;
    case "engi-cache-trap":
      // Wiki page "Engi cache": 2 missiles delay the Rebel Fleet for 2 turns.
      if (g.missiles < 2) return;
      g.missiles -= 2;
      g.fleet = Math.max(0, g.fleet - 2);
      log(g, "Rebel Fleet is delayed for 2 turns.");
      resolve();
      break;
    case "engi-cache-secure": {
      // Wiki page "Engi cache": medium scrap. The drone schematic is not named on the page.
      const [lo, hi] = mediumScrapBand(g.difficulty, g.sector);
      const n = lo + irand(g, hi - lo + 1);
      addScrap(g, n);
      log(g, `Medium scrap: ${n}.`);
      resolve();
      break;
    }
    case "last-stand-repair": {
      // Beacons, "Repair station beacon": 15 hull, 22–44 scrap, 5 fuel, 4 missiles, 5 drone parts, once.
      if (!b || b.flag !== "last-stand-repair" || b.resolved) return;
      g.player.hull = Math.min(g.player.hullMax, g.player.hull + 15);
      const n = 22 + irand(g, 23);
      addScrap(g, n);
      g.fuel += 5;
      g.missiles += 4;
      g.player.parts += 5;
      log(g, `Federation Repair Station: ${n} scrap.`);
      resolve();
      break;
    }
    case "ack":
      resolve();
      break;
    default:
      if (citedOwns(id)) {
        // A price the ship cannot pay leaves the panel open. An unknown id is not this branch.
        const applied = citedChoose(
          {
            g,
            resolve,
            fight: (tier, asteroid) => {
              g.event = null;
              // The event page that started the fight picks the escape rule (wiki/escape.ts).
              startCombat(g, tier, asteroid, eventSlugOf(id));
            },
            scrap: (n) => addScrap(g, n),
            note: (text) => log(g, text),
            irand: (n) => irand(g, n),
          },
          id,
        );
        // @agent:quests. A choice whose page adds a quest marker (wiki/quests.ts questAfterCited).
        if (applied) questAfterCited(g, id);
        break;
      }
      resolve();
  }
}

function openSectorMap(g: Game) {
  g.event = null;
  g.paused = false;
  g.phase = "map";
  g.sectorMap = true;
  if (!g.route?.length) {
    g.route = buildRoute(g.seed);
    g.routeHere = g.route[0]?.id ?? "";
  }
}

/** Sectors chart: only a node linked from the current one. */
export function chooseSector(g: Game, id: string) {
  if (!g.sectorMap) return;
  const here = g.route.find((n) => n.id === g.routeHere);
  if (!here?.links.includes(id)) return;
  const next = g.route.find((n) => n.id === id);
  if (!next) return;
  g.routeHere = id;
  g.sectorMap = false;
  nextSector(g, next.name);
}

/** Chart eligibility for one sector number. The crystal exit is not limited to the two linked nodes. */
function sectorPool(g: Game, sector: number): string[] {
  const used = new Set(
    (g.route ?? [])
      .map((n) => SECTOR_TYPES.find((s) => s.name === n.name)?.id)
      .filter((id): id is string => !!id && ONCE_SECTOR.has(id)),
  );
  return SECTOR_TYPES.filter((s) => {
    if (s.id === "civilian-start" || s.id === "crystal-worlds" || s.id === "last-stand") return false;
    if (s.group !== "civilian" && s.group !== "hostile" && s.group !== "nebula") return false;
    if (used.has(s.id)) return false;
    if ((s.id === "engi-home" || s.id === "zoltan-home" || s.id === "mantis-home") && sector < 3) return false;
    if ((s.id === "rebel-stronghold" || s.id === "rock-home") && sector < 5) return false;
    if ((s.id === "slug-nebula" || s.id === "slug-home") && sector < 4) return false;
    return true;
  }).map((s) => s.name);
}

/**
 * Ancient device: a Crystal crewmember jumps to the Hidden Crystal Worlds.
 * Sectors: the sector is not on the chart, the Rebels still follow, and enemy strength stays the Rock Homeworlds number.
 * The page gives 1 fuel and then spends that 1 fuel on the jump.
 */
export function enterHiddenCrystal(g: Game) {
  g.fuel += 1;
  g.fuel = Math.max(0, g.fuel - 1);
  g.player.shieldCharge = 0;
  g.jumps += 1;
  onPlayerJump(g);
  leashOnLeave(g);
  rememberFlagship(g);
  dropOvercharged(g.player);
  rechargeZoltan(g.player);
  rechargeLockdown(g);
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemy = null;
  g.shots = [];
  g.asteroid = false;
  g.asb = false;
  armDoors(g.player, doorLevel(g, g.player, "player"));
  makeMap(g);
  g.sectorName = "Hidden Crystal Worlds";
  stampEngiCache(g);
  stampCitedEvents(g);
  citedSector(g);
  placeQueuedQuests(g);
  g.beaconsVisited = (g.beaconsVisited ?? 0) + 1;
  g.phase = "map";
  g.paused = false;
  g.event = null;
  g.picking = false;
  g.flee = 0;
  g.enemyFlee = 0;
  g.pending = null;
  g.sectorMap = false;
  log(g, "Hidden Crystal Worlds.");
}

/**
 * Ancient device, Notes: the exit does not open the chart. The next sector is a random one after the Rock
 * Homeworlds number, and it may not be a sector connected to the Rock Homeworlds. Sector 8 stays The Last Stand.
 */
function leaveHiddenCrystal(g: Game) {
  if (g.sector >= 7) nextSector(g, "The Last Stand");
  else {
    const pool = sectorPool(g, g.sector + 1);
    nextSector(g, pool.length ? pool[irand(g, pool.length)] : "Civilian Sector");
  }
  const col = g.sector <= 1 ? 0 : g.sector - 1;
  const nodes = (g.route ?? []).filter((n) => n.col === col);
  const match = nodes.find((n) => n.name === g.sectorName) ?? nodes[0];
  if (match) g.routeHere = match.id;
}

function nextSector(g: Game, name?: string) {
  if (g.sector >= 8) {
    g.phase = "map";
    return;
  }
  g.sector += 1;
  g.player.shieldCharge = 0;
  if (g.sector === 8) {
    // Sectors, "The Last Stand": on entry, 10 hull repairs and 10 fuel.
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    g.fuel += 10;
    log(g, "10 hull repairs. 10 fuel.");
  }
  makeMap(g);
  if (name) g.sectorName = name;
  stampEngiCache(g);
  stampCitedEvents(g);
  citedSector(g);
  // @agent:quests. "Added a quest marker to the next sector!": placed after the sector's events (wiki/quests.ts).
  placeQueuedQuests(g);
  g.beaconsVisited = (g.beaconsVisited ?? 0) + 1;
  g.phase = "map";
  g.paused = false;
  g.event = null;
  g.sectorMap = false;
  log(g, `${g.sectorName}. The line starts over, closer than you like.`);
  sfx(g, "click");
}

export function continueReward(g: Game) {
  g.reward = null;
  g.phase = "map";
  g.paused = false;
  const b = hereBeacon(g);
  if (b?.kind === "exit" && !b.flag) {
    g.phase = "event";
    g.paused = true;
    g.event = {
      title: "Lane clear",
      body: "The picket is scrap. The exit buoy turns green.",
      choices: [{ id: "exit-leave", label: "Take the lane" }],
    };
  }
}

// Stores, "Fuel": waiting advances the rebels like a jump. INFERRED: two hull if their column has passed.
export function waitHere(g: Game) {
  if (g.phase !== "map") return;
  const b = hereBeacon(g);
  // Stores, "Fuel": waiting advances the rebels like a jump, slower in a nebula.
  if ((g.buoyDelay ?? 0) > 0) g.buoyDelay -= 1;
  else g.fleet += pursuit(g, b ? citedFleetAdvance(g, b) : 1);
  log(g, "You hold. The line advances.");
  onCradleJump(g); // Clone Bay, "Overview": waiting applies the jump heal (extras/cradle.ts)
  // Rebel Fleet: out of fuel when they take your beacon. Destroying that Elite yields 4 fuel.
  if (b && g.sector < 8 && g.fuel <= 0 && b.col < g.fleet && !b.resolved) {
    g.pending = "dive:4";
    startCombat(g, "elite", false);
    return;
  }
  if (b && b.col < g.fleet) {
    g.player.hull = Math.max(1, g.player.hull - 2);
    log(g, "Artillery walks the beacon. Hull scraped.");
    sfx(g, "hit");
    if (g.player.hull <= 10) g.lowHull = true;
  }
  sfx(g, "click");
}

export function upgrade(g: Game, id: SysId | "reactor") {
  if (id === "reactor") {
    const cost = upgradeCost("reactor", g.player.reactor);
    if (cost == null || g.scrap < cost) return;
    g.scrap -= cost;
    g.player.reactor += 1;
    sfx(g, "click");
    log(g, `Reactor ${g.player.reactor}.`);
    return;
  }
  const sys = g.player.systems[id];
  const cost = upgradeCost(id, sys.level);
  if (cost == null || g.scrap < cost || sys.level <= 0) return;
  g.scrap -= cost;
  sys.level += 1;
  if (!isMain(id)) sys.power = sys.level;
  sfx(g, "click");
  log(g, `${id} upgraded.`);
}

// Template:Stores: hull repairs in stores. Per point: 2 in sectors 1–3, 3 in 4–6, 4 in 7–8.
export function patchAll(g: Game) {
  const missing = g.player.hullMax - g.player.hull;
  const cost = missing * hullRepairPerPoint(g.sector);
  if (missing <= 0 || g.scrap < cost) return;
  g.scrap -= cost;
  g.player.hull = g.player.hullMax;
  sfx(g, "click");
}

function stepShots(g: Game, dt: number) {
  for (const shot of g.shots) {
    if (shot.wait > 0) {
      shot.wait -= dt;
      continue;
    }
    shot.t += dt / shot.duration;
    if (shot.t >= 1) {
      // Drone Control, Defense Drone: one incoming shot per cooldown, before it lands.
      if (shot.from !== "player" && swarmIntercept(g, shot)) {
        log(g, "A drone cut that shot down.");
        continue;
      }
      if (shot.from === "player" && enemyDefenseIntercept(g, shot)) {
        log(g, "Their drone cut that shot down.");
        continue;
      }
      // @agent:drones. Drone Control, Overview: drones "can be shot down by enemy fire if they are in direct line of
      // fire, or can be destroyed by colliding with asteroids". A drone that takes the shot spends it.
      if (shotHitsDrone(g, shot)) continue;
      applyImpact(g, shot);
    }
  }
  g.shots = g.shots.filter((s) => s.t < 1);
}

/**
 * Fires, lead: events start fires, and a fire spreads, consumes oxygen, and burns crew whether or not a fight is on.
 * This is the fire portion of airflow() and life() — oxygen 0.96%/s, death below 10%, extinguish, 2.128 HP/s, and
 * spreadFire — on the player ship. Melee, repair, medbay, suffocation, door venting, and the oxygen-system refill
 * stay on the combat tick. System sabotage (0.08/s) stays on that tick too (extras/sabotage.ts).
 */
function tickIdleFires(g: Game, dt: number) {
  const ship = g.player;
  if (!ship.rooms.some((r) => r.fire > 0)) return;
  const aboard = "player" as const;
  // Fires: "Fires also consume oxygen (0.96% per second for each fire in a room)".
  // Fires: fires "die out" once oxygen drops below 10%.
  for (const r of ship.rooms) {
    r.o2 -= 0.96 * r.fire * dt;
    r.o2 = Math.max(0, Math.min(100, r.o2));
    if (r.o2 < 10) r.fire = 0;
  }
  const closedSlow = doorSpreadSlow(g, ship, aboard);
  for (const r of ship.rooms) {
    const present = g.crew.filter((c) => c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0);
    const pals = present.filter((c) => sideOf(c) === aboard && (c.stun ?? 0) <= 0);
    const foes = present.filter((c) => sideOf(c) !== aboard);
    // Same priority as life(): crew who are trading blows do not also fight the fire. The blows themselves stay in life().
    if (!(pals.length && foes.length) && r.fire > 0 && pals.length) fightFire(r, pals, dt);
    spreadFire(g, ship, r, closedSlow, dt);
    if (r.o2 > 5) burnIntruders(r, foes, dt);
  }
  if (!g.crew.some((c) => c.hp <= 0)) return;
  reap(g);
  if (g.phase !== "map" && g.phase !== "event" && g.phase !== "store" && g.phase !== "reward") return;
  const live = g.crew.some((c) => c.side === "player" && (c.hp > 0 || (c.cloneIn ?? 0) > 0));
  if (!live && g.player.hull > 0) lose(g, "crew");
}

function idleShip(g: Game): boolean {
  if (g.paused) return false;
  if (g.phase === "map" || g.phase === "event" || g.phase === "store" || g.phase === "reward") return true;
  return g.phase === "combat" && !g.enemy;
}

/**
 * Player half of the combat tick with no enemy hull: airflow, doors, movement, melee and fires (life),
 * the same 0.08/s sabotage, boarders picking a new room, and the FTL spool. Repair and venting run because
 * this is a fight. The battery or an asteroid field is the only environment. No enemy guns, surrender, or winCombat.
 */
function tickBoarding(g: Game, dt: number) {
  g.time += dt;
  airflow(g, g.player, "player", dt);
  tickDoors(g.player, dt);
  moveCrew(g, dt);
  life(g, g.player, "player", dt);
  reap(g);
  noteZoltanKits(g);
  tickPlayerSabotage(g, dt);
  wanderBoarders(g, dt);
  if (g.asb || g.asteroid) environment(g, dt);
  if (g.shots.length) stepShots(g, dt);
  const spool = ftlSeconds(g, g.player);
  if (spool) g.flee = Math.min(1, g.flee + dt / spool);
  if (g.player.hull <= 0) {
    lose(g, "hull");
    return;
  }
  const live = g.crew.some((c) => c.side === "player" && (c.hp > 0 || (c.cloneIn ?? 0) > 0));
  if (!live) {
    lose(g, "crew");
    return;
  }
  if (enemyAboard(g)) return;
  g.crew = g.crew.filter((c) => c.side === "player" || (c.cloneIn ?? 0) > 0);
  g.shots = [];
  g.asb = false;
  g.phase = "map";
  g.flee = 0;
  log(g, "The boarders are dead.");
}

export function step(g: Game, dt: number) {
  g.trauma = Math.max(0, g.trauma - dt * 1.7);
  for (const f of g.floaters) f.life -= dt;
  g.floaters = g.floaters.filter((f) => f.life > 0);
  if (g.hitstop > 0) {
    g.hitstop = Math.max(0, g.hitstop - dt);
    flushSfx(g.sfx);
    return;
  }
  if (g.paused || g.phase !== "combat" || !g.enemy) {
    // @agent:hacking. A latched enemy hacking drone leaves with its ship: clear the hacked-room and door marks.
    if (g.phase !== "combat" || !g.enemy) clearEnemyHackMarks(g);
    if (g.phase !== "combat") g.targeting = false;
    // A single step never advances more than 0.05s, matching the combat body below.
    // Boarders with no enemy hull (beginBoarding) use the crew fight. A fire on the map stays in tickIdleFires.
    if (idleShip(g)) {
      const h = Math.min(dt, 0.05);
      if (g.phase === "combat" && !g.enemy && enemyAboard(g)) tickBoarding(g, h);
      else tickIdleFires(g, h);
    }
    flushSfx(g.sfx);
    return;
  }
  const h = Math.min(dt, 0.05);
  g.time += h;
  airflow(g, g.player, "player", h);
  airflow(g, g.enemy, "enemy", h);
  tickDoors(g.player, h);
  tickDoors(g.enemy, h);
  tickLockdown(g, h);
  moveCrew(g, h);
  life(g, g.player, "player", h);
  life(g, g.enemy, "enemy", h);
  reap(g);
  // Zoltans: the kit bar is whoever is standing there after movement and deaths, before the kits tick.
  noteZoltanKits(g);
  shieldRegen(g, g.player, "player", h);
  shieldRegen(g, g.enemy, "enemy", h);
  tickIons(g.player, h);
  tickIons(g.enemy, h);
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  syncShields(g.enemy, zoltanBars(g.crew, g.enemy, "enemy", "shields"));
  tickExtras(g, h);
  chargeSide(g, g.player, "player", h);
  chargeSide(g, g.enemy, "enemy", h);
  wanderBoarders(g, h);
  boarders(g, h);
  // @agent:crewai. Enemy crew aboard their own hull: stations, boarders, fires, repairs, healing (extras/crewai.ts).
  tickEnemyCrewAi(g, h);
  environment(g, h);
  bossThink(g, h);
  const spool = ftlSeconds(g, g.player);
  if (spool) g.flee = Math.min(1, g.flee + h / spool);
  // @agent:surrender. Surrender roll before the escape roll ("Enemies will never start running away if they have
  // already offered a surrender"), then the anti-stalemate clock. True means an offer opened or the fight ended.
  if (surrenderTick(g, h)) {
    flushSfx(g.sfx);
    return;
  }
  enemyEscapeStep(g, h);
  if (g.enemyFlee >= 1 && g.enemy) {
    // INFERRED: crew still on the other hull are left behind. The engines page does not say this in one line.
    g.crew = g.crew.filter((c) => c.side === "player" && c.aboard === "player");
    // @agent:hacking. INFERRED: an enemy hold ends when they jump away too (extras/leash.ts leashOnLeave).
    leashOnLeave(g);
    // Rebel Fleet: letting a charging Rebel scout or auto-ship escape doubles the pursuit for one turn.
    if (g.enemyEscape?.pursuit) {
      g.pursuitDouble = true;
      log(g, "They got away. The fleet will close in twice as fast.");
    } else log(g, "They charged FTL and left.");
    g.enemy = null;
    g.enemyEscape = null;
    g.shots = [];
    g.enemyFlee = 0;
    g.phase = "map";
    g.asteroid = false;
    g.asb = false;
    // @agent:quests. A page's {{Winning|gotaway=true}} result (wiki/quests.ts pageGotAway).
    pageGotAway(g, g.fightEvent);
  }
  stepShots(g, h);
  endCheck(g);
  flushSfx(g.sfx);
}

export function togglePause(g: Game) {
  if (g.phase !== "combat") return;
  g.paused = !g.paused;
}

export function saveGame(g: Game) {
  if (typeof localStorage === "undefined") return;
  if (g.phase === "title" || g.phase === "victory" || g.phase === "defeat") return;
  try {
    const copy = { ...g, sfx: [], floaters: [] };
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
  } catch {
    /* ignore quota */
  }
}

export function loadGame(): Game | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Game;
    if (!g || !g.player || !g.beacons) return null;
    g.sfx = [];
    g.floaters = [];
    g.manual = false;
    if (g.armed === undefined) g.armed = g.player.weapons.find((w) => w.enabled)?.uid ?? null;
    if (g.targeting == null) g.targeting = false;
    if (g.autofireAll == null) {
      g.autofireAll = false;
      for (const w of g.player.weapons) {
        if (w.autofire) w.autoInvert = true;
      }
    }
    if (g.ramId === undefined) g.ramId = null;
    if (g.enemyFlee == null) g.enemyFlee = 0;
    // Saves from before wiki/escape.ts: a fight in progress gets the default hull-triggered rule.
    if (g.enemy && g.enemyEscape === undefined) g.enemyEscape = escapePlan({ tier: "pool" }, () => rand(g));
    if (g.ramStage == null) g.ramStage = 1;
    for (const d of g.player.doors) {
      if (d.hp == null) d.hp = 0;
      if (d.stuck == null) d.stuck = 0;
    }
    if (g.difficulty !== "easy" && g.difficulty !== "normal" && g.difficulty !== "hard") g.difficulty = "normal";
    if (g.scrapCollected == null) g.scrapCollected = 0;
    if (g.beaconsVisited == null) g.beaconsVisited = g.jumps + 1;
    if (g.sectorMap == null) g.sectorMap = false;
    if (!g.route) {
      g.route = buildRoute(g.seed || 1);
      g.routeHere = g.route[0]?.id ?? "";
    }
    if (g.training == null) g.training = false;
    if (!g.augments) g.augments = [];
    if (g.player.zoltan == null && g.hullId?.startsWith("zoltan-")) g.player.zoltan = 5;
    if (!g.player.kits) g.player.kits = {};
    // Kit rooms: saves from before layouts.ts seatKits carry roomless player kits.
    seatKits(g.player);
    if (g.player.parts == null) g.player.parts = 0;
    if (g.enemy) {
      if (!g.enemy.kits) g.enemy.kits = {};
      if (g.enemy.parts == null) g.enemy.parts = 0;
      for (const d of g.enemy.doors) {
        if (d.hp == null) d.hp = 0;
        if (d.stuck == null) d.stuck = 0;
      }
    }
    for (const c of g.crew) {
      if (!c.skills) c.skills = {};
    }
    return g;
  } catch {
    return null;
  }
}

export function clearSave() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  if (typeof localStorage === "undefined") return false;
  return !!localStorage.getItem(SAVE_KEY);
}
