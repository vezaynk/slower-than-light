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
  ionHitsHack,
} from "./extras/spike.ts";
// Mind Control: sideOf is the side a crew member fights for (a leashed crew member fights for the other side).
import { clearBombSight, clearEnemyLeash, heldByEnemy, ionOnLeash, leashOnLeave, noteBombSight, sideOf } from "./extras/leash.ts";
import { enemyHoldsFire, veilBrokenByFire } from "./extras/veil.ts";
import { ionOnCell, shedOverAssigned, tickCell } from "./extras/cell.ts";
import { relaxSling, shipInDanger, tickEnemyBoarding } from "./extras/sling.ts";
import { tickEnemyCrewAi } from "./extras/crewai.ts";
import { enemyCloneHolds, onCradleJump } from "./extras/cradle.ts";
import { enemyFtlScale } from "./extras/moreaugs.ts";
// @agent:drones. Projectiles and asteroids striking orbiting drones (extras/swarm.ts shotHitsDrone).
import { enemyDroneSpot, hurtRoomDrones, shotHitsDrone, zoltanBurstDrones } from "./extras/swarm.ts";
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
import { roomCenter, roomsOnSegment } from "./beam-line.ts";
import { layoutFor, seatKits } from "./layouts.ts";
import { engiCacheEvent, stampEngiCache } from "./wiki/engi-cache.ts";
import { citedChoiceDisabled, citedChoose, citedEngineCap, citedEvent, citedFriendlyAsb, citedOwns, citedShieldHalf, citedSystemHalf, citedSystemOff, stampCitedEvents } from "./wiki/cited-events.ts";
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
  ionStormBeacon,
  lastStandRepairEvent,
  stormReactor,
} from "./wiki/cited-sectors.ts";
import {
  eventHasPulsar,
  pickPulsarTargets,
  PULSAR_WARN_S,
  pulsarCycleSeconds,
  pulsarMainIon,
  pulsarShieldSpend,
  type PulsarPick,
} from "./wiki/cited-pulsar.ts";
import {
  eventHasFlare,
  FLARE_WARN_S,
  flareCycleSeconds,
  flareDamagesRoom,
  flareFireCount,
  placeFlareFires,
} from "./wiki/cited-flare.ts";
import { asteroidIntervalSeconds } from "./wiki/cited-asteroid.ts";
import { CRYSTAL_SECTOR_WEAPONS, citedBuy, citedStock } from "./wiki/cited-stores.ts";
import { citedCrewDamage, citedPierce, systemlessHull } from "./wiki/cited-weapons.ts";
import { FLAK1_FAKE, FLAK1_FAKE_LABEL, flak1AimRolls, flak1Landing } from "./extras/ordnance.ts";
import { advFlakAimRolls, advFlakLanding, flak2AimRolls, flak2Landing } from "./wiki/weapons-flak-crystal.ts";
import { swarmAimRolls, swarmLanding } from "./wiki/swarm-aim.ts";
import { navAllows } from "./wiki/cited-nav.ts";
import { citedZoltanPower } from "./wiki/cited-zoltan-power.ts";
import { SECTOR_TYPES } from "./wiki/sectors.ts";
import { escapePlan, eventSlugOf, overtakenArrivalEscape } from "./wiki/escape.ts";
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
  BeamPoint,
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

export { negateIon };

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
 * bonus 0 is the reactor count this function used before.
 * settleZoltanPower is what frees reactor bars. This sum does not.
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
// Crew skills, lead: "All crew on every player ship start untrained, i.e. at skill level 0."
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
  // Systems, the paragraph above "Main systems": "fires, breaches, and intruders prevent manning as well - the only exception to this are Auto-ships, which retain manning bonus for all their (sub-)systems unless the (sub-)systems are damaged."
  // "If a system is affected by a breach but is not damaged ... it cannot be manned till the breach is sealed."
  // INFERRED: oxygen at or below 5% also prevents manning, on every ship. The fetched pages do not number that.
  const r = roomWith(ship, system);
  if (!r) return false;
  // @agent:flagship. The Rebel Flagship: the artillery rooms "cannot be manned, despite containing crew".
  if (system === "weapons" && ship.flagship) return false;
  // @agent:hacking. Hacking, "Overview": a system with an attached hacking drone "cannot be manned" (extras/spike.ts).
  if (hackBlocksManning(g, ship, system)) return false;
  // Zoltans: "The ion-lock status, preventing manning the system console, is not removed".
  // Systems, the paragraph above "Main systems": ionized systems cannot be manned. Auto-ships keep the bonus unless damaged.
  if (ship.systems[system].ion.length > 0 && !autoManning(ship)) return false;
  if (r.o2 <= 5) return false;
  if (!autoManning(ship)) {
    if (r.fire > 0 || r.breach > 0) return false;
    const foes = g.crew.some(
      (c) => c.aboard === aboard && sideOf(c) !== (aboard === "player" ? "player" : "enemy") && c.room === r.id && c.hp > 0 && c.path.length === 0,
    );
    if (foes) return false;
  }
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
  // Printed events pass 1.
  // Crew skills, lead: "all races gain experience at the same rate (per job done)".
  // Crew skills, lead: "the enemy ships crew is always untrained and cannot reach higher skill levels."
  // Crew skills, lead: "your mind-controlled crew still gains skill points by performing the tasks."
  // A leashed crew member keeps side "player", so the point still lands.
  if (!c || amount <= 0 || c.side !== "player") return;
  if (!c.skills) c.skills = {};
  const before = rankOf(c, skill);
  c.skills[skill] = (c.skills[skill] ?? 0) + amount;
  const after = rankOf(c, skill);
  if (after > before) log(g, `${c.name} — ${skill} rank ${after}.`);
}

/** Crew skills, Combat: one printed point for a killing blow or one sabotaged system level. */
export function noteCombatPoint(g: Game, c: Crew) {
  bumpXp(g, c, "combat", 1);
}

/**
 * Crew skills, Weapons: one point when a weapon fires, and one point when an artillery system fires.
 * "It doesn't matter whether it hits or misses, or whether it can do damage."
 * Crew skills, Weapons: "Volleys of multi-shot weapons such as burst lasers count as a single fire".
 * The caller grants that one point once per trigger.
 */
export function noteWeaponManning(g: Game) {
  bumpXp(g, manningCrew(g, g.player, "player", "weapons"), "weapons", 1);
}

/**
 * Crew skills, Weapons: "turning them off just after you receive the skill increment" drops the shot.
 * The point stays. INFERRED: 0.15 seconds. The page prints no duration.
 * Shorter than a beam flight (0.32s), so the shot has not landed.
 */
const MUZZLE_S = 0.15;

function skillFight(g: Game): boolean {
  // Environmental Hazards, Asteroid Field: skill only while a fight with an enemy ship is still on.
  // Crew skills, Piloting and Shields: asteroids after that fight do not train.
  return g.phase === "combat" && !!g.enemy;
}

function noteDodge(g: Game) {
  if (!skillFight(g)) return;
  // Crew skills, Piloting: "one point of experience for each projectile dodged during combat."
  // "This includes asteroids, provided you are still in combat."
  // Engines: "one point of experience for each projectile evaded." A hit grants neither.
  // "they are gained at different system consoles." The pilot's point is not the engineer's.
  // Crew skills, Piloting: "Skill is also not gained when your ship is cloaked."
  // Engines is trained the same way, with those same limits. Shields does not say this.
  const veil = g.player.kits.veil;
  if (veil && veil.on && veil.left > 0 && veil.level > 0 && kitBars(veil) >= 1) return;
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

/**
 * Pirate engine hacker: "Fight the Pirate ship with your Engines limited to level 1."
 * The page restores the system when that pirate is destroyed or disabled.
 * INFERRED: the cap is the bars evasion and the FTL charge read, and it ends when the fight ends.
 * A level already at 1 is unchanged, so that crew can still train.
 */
const engineLimit = new WeakMap<Game, number>();

export function limitPlayerEngines(g: Game, level: number): void {
  engineLimit.set(g, level);
}

function clearEngineLimit(g: Game): void {
  engineLimit.delete(g);
}

function engineBars(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  let bars = Math.min(8, mainBars(g, ship, aboard, "engines"));
  // The Engi virus: "Engines and Shields systems halved" and "rounds down against you".
  if (aboard === "player" && systemHalf.get(g)?.has("engines")) bars = Math.floor(bars / 2);
  if (aboard !== "player") return bars;
  const cap = engineLimit.get(g);
  if (cap == null) return bars;
  return Math.min(bars, cap);
}

/**
 * Auto-ship carrying shield virus: "Fight an Auto-ship with your Shields halved" and "rounds down against you".
 * Slug hacker (choice): the same cut on Shields, "Oxygen system halved", or "Weapon Control halved".
 * INFERRED: the half is the bars that system reads, and it ends when that fight ends.
 * The installed level stays. An enemy ship is not cut.
 */
type HalfId = "shields" | "oxygen" | "weapons" | "engines";
const systemHalf = new WeakMap<Game, Set<HalfId>>();
const weaponHalfShips = new WeakMap<Ship, true>();

function rememberWeaponHalf(g: Game): void {
  if (systemHalf.get(g)?.has("weapons")) weaponHalfShips.set(g.player, true);
  else weaponHalfShips.delete(g.player);
}

export function halvePlayerSystems(g: Game, ids: HalfId[]): void {
  systemHalf.set(g, new Set(ids));
  rememberWeaponHalf(g);
  if (!ids.includes("shields")) return;
  const cap = shieldCap(g, g.player, "player");
  if (g.player.shieldNow > cap) g.player.shieldNow = cap;
}

export function halvePlayerShields(g: Game): void {
  halvePlayerSystems(g, ["shields"]);
}

function clearShieldHalf(g: Game): void {
  systemHalf.delete(g);
  weaponHalfShips.delete(g.player);
}

/**
 * Slug hacker (doors): "Fight a Slug ship with your Door System offline."
 * The page restores systems when that ship is destroyed or its crew are dead.
 * INFERRED: offline is a door level of 0 and no remote open or close. The installed level stays.
 * Open flags stay as they were. The cut ends when that fight ends.
 * Slug hacker (oxygen): "Fight a Slug ship with your Oxygen system offline."
 * INFERRED: offline oxygen produces nothing, so rooms use the unpowered drain. The installed level stays.
 * A Zoltan in the room does not keep production going. The cut ends when that fight ends.
 * Slug hacker (medical): "Medbay / Clone Bay offline."
 * INFERRED: the medbay room stops healing, and the clone bay does not queue, revive, or jump-heal.
 * The installed levels stay. Copies already queued are kept. The cut ends when that fight ends.
 */
const systemOff = new WeakMap<Game, Set<"doors" | "oxygen" | "medbay" | "sensors">>();

export function shutPlayerDoors(g: Game): void {
  systemOff.set(g, new Set(["doors"]));
  for (const door of g.player.doors) {
    door.hp = 0;
    doorArmedMax.delete(door);
  }
}

export function shutPlayerOxygen(g: Game): void {
  systemOff.set(g, new Set(["oxygen"]));
}

/** Slug hacker (medical): one shutdown covers "Medbay / Clone Bay offline." */
export function shutPlayerMedical(g: Game): void {
  systemOff.set(g, new Set(["medbay"]));
}

/**
 * Boarders: Humans jammed sensors: "your Sensors are disabled."
 * Notes: functionality is not restored till you jump to another beacon.
 * The installed level stays. clearSystemOff runs on an FTL jump.
 */
export function shutPlayerSensors(g: Game): void {
  const set = systemOff.get(g) ?? new Set();
  set.add("sensors");
  systemOff.set(g, set);
}

/** The hacking counter: "Your Sensors flicker back on." */
export function restorePlayerSensors(g: Game): void {
  systemOff.get(g)?.delete("sensors");
}

export function playerSensorsOff(g: Game): boolean {
  return systemOff.get(g)?.has("sensors") ?? false;
}

function clearSystemOff(g: Game): void {
  systemOff.delete(g);
}

/**
 * Lanius fight with friendly ASB support: "Anti-Ship Battery on your side."
 * INFERRED: that battery is the Environmental Hazards shot, aimed at the other ship.
 * The event does not print a separate warning or a damage figure.
 */
const friendlyAsb = new WeakMap<Game, true>();

export function aidPlayerAsb(g: Game): void {
  friendlyAsb.set(g, true);
  g.asb = true;
  if (!(g.asbWait > 0)) armAsbClock(g, "warn");
}

function clearFriendlyAsb(g: Game): void {
  friendlyAsb.delete(g);
}

function doorsOff(g: Game, aboard: "player" | "enemy"): boolean {
  return aboard === "player" && (systemOff.get(g)?.has("doors") ?? false);
}

function oxygenOff(g: Game, aboard: "player" | "enemy"): boolean {
  return aboard === "player" && (systemOff.get(g)?.has("oxygen") ?? false);
}

/** Slug hacker (medical) reads this from the clone bay as well as the medbay room. */
export function playerMedicalOff(g: Game): boolean {
  return systemOff.get(g)?.has("medbay") ?? false;
}

function shieldCap(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  const bonus = zoltanBars(g.crew, ship, aboard, "shields");
  if (aboard !== "player" || !systemHalf.get(g)?.has("shields")) return maxBubbles(ship, bonus);
  const halved = Math.floor(bars(ship.systems.shields, bonus) / 2);
  return Math.floor(halved / 2);
}

/** Engines evasion table, plus manning, plus Piloting autopilot (50% at level 2, 80% at level 3, minimum 2). */
export function evasionPercent(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  // Hacking, "Overview": "Piloting/Engines: reduces base evasion to 0 ... Does not affect evasion gained from Cloak."
  if (spikeEvadeZero(g, ship)) return Math.min(100, extraEvade(g, ship, aboard));
  const eng = engineBars(g, ship, aboard);
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
  const eng = engineBars(g, ship, "player");
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

/**
 * One weapon or drone slot against a Zoltan pool and a reactor pool.
 * Disabled slots take nothing.
 * A full system (occupy) spends Zoltan bars from the left. A partial fill is wasted and reactor does not finish that slot.
 * A system with an empty bar (not occupy) lets Zoltan and reactor combine on the same slot.
 * A slot paid entirely by Zoltan bars stays up when ion has already removed the reactor bars.
 */
export function takePowerSlot(
  cost: number,
  enabled: boolean,
  pool: { z: number; r: number; occupy: boolean },
): boolean {
  if (!enabled || !Number.isFinite(cost)) return false;
  if (pool.occupy) {
    if (pool.z >= cost) {
      pool.z -= cost;
      return true;
    }
    if (pool.z > 0) {
      pool.z = 0;
      return false;
    }
    if (pool.r >= cost) {
      pool.r -= cost;
      return true;
    }
    return false;
  }
  if (pool.z >= cost) {
    pool.z -= cost;
    return true;
  }
  if (pool.z + pool.r >= cost) {
    pool.r -= cost - pool.z;
    pool.z = 0;
    return true;
  }
  if (pool.z > 0) {
    pool.z = 0;
    return false;
  }
  return false;
}

/** True when takePowerSlot would power the slot. Does not spend bars. */
export function powerSlotFits(cost: number, pool: { z: number; r: number; occupy: boolean }): boolean {
  if (!Number.isFinite(cost)) return false;
  if (pool.occupy) {
    if (pool.z >= cost) return true;
    if (pool.z > 0) return false;
    return pool.r >= cost;
  }
  if (pool.z >= cost) return true;
  return pool.z + pool.r >= cost;
}

export function powerMask(ship: Ship, bonus = 0): boolean[] {
  // @agent:flagship. Flagship artillery has no shared Weapons pool (wiki/flagship-systems.ts flagshipPowerMask).
  const artillery = flagshipPowerMask(ship);
  if (artillery) return artillery;
  const sys = ship.systems.weapons;
  const capacity = Math.max(0, sys.level - sys.damage);
  const ionLocked = Math.min(Math.max(0, sys.ion.length), capacity);
  const held = sys.zoltanHeld ?? 0;
  const full = sys.ion.length === 0 && capacity > 0 && bonus > 0 && sys.power + held >= capacity;
  const green = Math.max(0, Math.min(sys.power, capacity - ionLocked));
  const pool = {
    z: bonus,
    r: full ? Math.min(green, Math.max(0, capacity - bonus)) : green,
    occupy: full,
  };
  // Slug hacker (choice): "Weapon Control halved" and "rounds down against you".
  // INFERRED: the bars in this pool, Zoltan bars included, are what is halved.
  if (weaponHalfShips.has(ship)) {
    const total = Math.floor((pool.z + pool.r) / 2);
    pool.z = Math.min(pool.z, total);
    pool.r = total - pool.z;
  }
  return ship.weapons.map((w) => takePowerSlot(WEAPONS[w.defId]?.power ?? 1, w.enabled, pool));
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
  // Backup Battery, Overview: these bars can push the ship past the 25-bar reactor cap.
  // Environmental Hazards, Plasma/ion Storm: the reactor is halved, rounded up.
  // Zoltan bars sit in zoltanHeld, outside this pool. Backup Battery bars are added after the half.
  const reactor = ship.storm ? stormReactor(ship.reactor) : ship.reactor;
  return reactor + batteryBonus(ship) - reactorUsed(ship);
}

/**
 * Environmental Hazards, Plasma/ion Storm: an overtaken nebula beacon halves the reactor.
 * Power already assigned above that pool comes off on arrival. Enemy reactors are halved the same way.
 * Backup Battery bars stay in the pool. Zoltan bars are not reactor power.
 * INFERRED: removal uses the same order as a battery ending. The page names no order.
 * INFERRED: only the always-overtaken nebula case. The page does not say which other nebula beacons have a storm.
 */
export function syncIonStorm(g: Game) {
  const on = ionStormBeacon(hereBeacon(g), g.fleet);
  const was = !!g.player.storm;
  if (on) g.player.storm = true;
  else delete g.player.storm;
  if (g.enemy) {
    if (on) g.enemy.storm = true;
    else delete g.enemy.storm;
  }
  if (!on || was) return;
  shedOverAssigned(g, g.player, "player");
  if (g.enemy) shedOverAssigned(g, g.enemy, "enemy");
  // Environmental Hazards, Plasma/ion Storm: the printed beacon warning.
  log(g, "This section of the nebula is experiencing a plasma storm. Your main reactor can only function at half capacity.");
}

type ZoltanBox = {
  power: number;
  level: number;
  damage?: number;
  ion?: number[];
  zoltanHeld?: number;
};

function stampHeld(box: { zoltanHeld?: number }, held: number): void {
  if (held > 0) box.zoltanHeld = held;
  else delete box.zoltanHeld;
}

/**
 * Weapons and Drone Control, when the system is full: each Zoltan occupies a bar and
 * frees that reactor bar. Leaving a system that is no longer full puts the bars back
 * from spare. A second call with the same crew does not peel again.
 * Wiki page "Zoltans": power starts at the highest-priority module. Weapon Control:
 * leaving without spare reactor power depowers the leftmost slots.
 */
function settleDisplace(ship: Ship, box: ZoltanBox, zoltans: number): void {
  const capacity = Math.max(0, box.level - (box.damage ?? 0));
  const ion = box.ion?.length ?? 0;
  let held = box.zoltanHeld ?? 0;
  const base = box.power + held;
  const full = ion === 0 && capacity > 0 && base >= capacity && zoltans > 0;
  if (full) {
    const want = Math.min(zoltans, base);
    if (want > held) {
      const peel = Math.min(box.power, want - held);
      box.power -= peel;
      held += peel;
    }
    // Still full: a partial departure keeps the occupy stamp, so reactor is not put back into that slot.
    stampHeld(box, held);
    return;
  }
  if (held > zoltans) {
    const drop = held - zoltans;
    // Backup Battery, Overview: additional bars interact with Zoltan power just like regular power bars.
    const take = Math.min(drop, Math.max(0, sparePower(ship)));
    box.power += take;
    held = zoltans;
  }
  stampHeld(box, held);
}

/**
 * Wiki page "Zoltans": one Zoltan can fill a shield buffer. Two replace one reactor pair
 * and cannot fill only a buffer. Leaving does not put the peeled pair back.
 */
function settleShields(sys: SystemState, zoltans: number): void {
  const pairs = Math.floor(zoltans / 2) * 2;
  let held = sys.zoltanHeld ?? 0;
  const want = Math.min(pairs, sys.power + held);
  if (want > held) {
    const peel = Math.min(sys.power, want - held);
    sys.power -= peel;
    held += peel;
  }
  if (pairs < held) held = pairs;
  stampHeld(sys, held);
}

/**
 * Wiki page "Zoltans": Zoltans replace reactor power when as many stay as there are
 * power levels in Engines, Medbay, or Oxygen. Ion still on the system skips this,
 * so the remaining reactor stays and the yellow bars fill the gap. Leaving does not restore.
 */
function settleCover(sys: SystemState, zoltans: number): void {
  const capacity = Math.max(0, sys.level - sys.damage);
  const covered = capacity > 0 && zoltans >= capacity && sys.ion.length === 0;
  let held = sys.zoltanHeld ?? 0;
  if (covered) {
    const want = Math.min(zoltans, sys.power + held);
    if (want > held) {
      const peel = Math.min(sys.power, want - held);
      sys.power -= peel;
      held += peel;
    }
  }
  if (zoltans < held) held = zoltans;
  stampHeld(sys, held);
}

function zoltanCount(g: Game, ship: Ship, aboard: "player" | "enemy", roomId: string | undefined): number {
  if (!roomId) return 0;
  return citedZoltanPower(
    g.crew.filter((c) => c.aboard === aboard),
    roomId,
  );
}

/**
 * Apply the Zoltan replace rules after noteZoltanKits.
 * Shields run first so a peeled pair is spare before weapons try to restore.
 */
export function settleZoltanPower(g: Game): void {
  settleShipZoltan(g, g.player, "player");
  if (g.enemy) settleShipZoltan(g, g.enemy, "enemy");
}

function settleShipZoltan(g: Game, ship: Ship, aboard: "player" | "enemy"): void {
  const count = (id: SysId) => zoltanCount(g, ship, aboard, roomWith(ship, id)?.id);
  settleShields(ship.systems.shields, count("shields"));
  for (const id of ["engines", "medbay", "oxygen"] as const) settleCover(ship.systems[id], count(id));
  settleDisplace(ship, ship.systems.weapons, count("weapons"));
  const swarm = ship.kits.swarm;
  if (!swarm) return;
  const room = ship.rooms.find((r) => r.kit === "swarm");
  const z = room ? zoltanCount(g, ship, aboard, room.id) : (swarm.zoltan ?? 0);
  settleDisplace(ship, swarm, z);
}

function capOf(sys: SystemState): number {
  return Math.max(0, sys.level - sys.damage - sys.ion.length);
}

/**
 * Weapon Control, Overview: "When ionized or actively hacked, the weapons cannot be
 * powered or depowered manually." Any ion point counts, not only a full lock.
 * An active hack is the pulse (hackHoldsWeapons), not a drone that has only latched.
 */
export function weaponsPowerLocked(g: Game): boolean {
  return g.player.systems.weapons.ion.length > 0 || hackHoldsWeapons(g, "player");
}

export function powerUp(g: Game, id: SysId) {
  const sys = g.player.systems[id];
  if (!isMain(id)) return;
  if (id === "weapons" && weaponsPowerLocked(g)) return;
  if (sparePower(g.player) <= 0) return;
  if (sys.power >= capOf(sys)) return;
  sys.power += 1;
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  sfx(g, "click");
}

export function powerDown(g: Game, id: SysId) {
  const sys = g.player.systems[id];
  if (!isMain(id)) return;
  if (id === "weapons" && weaponsPowerLocked(g)) return;
  if (sys.power <= 0) return;
  sys.power -= 1;
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  sfx(g, "click");
}

function findDoor(ship: Ship, a: string, b: string): Door | undefined {
  return ship.doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a));
}

/** Door System, "Manning": a body on the console counts as one level higher, capped at 4. */
export function doorLevel(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  // Slug hacker (doors): "Door System offline".
  if (doorsOff(g, aboard)) return 0;
  const sys = ship.systems.doors;
  if (!functional(sys)) return 0;
  let level = Math.max(0, sys.level - sys.damage);
  if (manning(g, ship, aboard, "doors")) level += 1;
  return Math.min(4, level);
}

/**
 * Door System, "Hits required to break a door".
 * Columns are Hard, Normal, Easy. Level 2 is 6/8/12, level 3 is 10/12/16, level 4 is 15/18/20.
 * Both hulls use the run's difficulty. The table starts at level 2.
 */
const DOOR_HITS: Record<Difficulty, { 2: number; 3: number; 4: number }> = {
  hard: { 2: 6, 3: 10, 4: 15 },
  normal: { 2: 8, 3: 12, 4: 18 },
  easy: { 2: 12, 3: 16, 4: 20 },
};

export function blastHits(level: number, difficulty: Difficulty = "normal"): number {
  const row = DOOR_HITS[difficulty] ?? DOOR_HITS.normal;
  if (level >= 4) return row[4];
  if (level === 3) return row[3];
  if (level === 2) return row[2];
  return 0;
}

/**
 * Door System: "If the Door System level changes while a door is being attacked, the dealt damage is remembered
 * and the current maximum and the leftover door strength changes proportionally (e.g. on Hard difficulty level 3
 * provides 66% door strength increase over level 2)."
 * Hard samples: level 2 hit 5 times (1 left of 6) needs 1 more hit after manning to level 3 (10).
 * Level 2 hit 4 times (2 left) needs 3. Those are integer leftovers: floor(left * newMax / oldMax).
 * INFERRED: the hit count uses integer division. A partial second of punching stays on that whole-hit scale.
 * The page's third sample, level 3 hit 6 times then back to level 2, says 1 hit. This proportion is floor(4 * 6 / 10) = 2.
 */
export function scaleDoorLeft(left: number, oldMax: number, newMax: number): number {
  if (!(oldMax > 0) || !(newMax > 0) || newMax === oldMax) return left;
  return Math.floor((left * newMax) / oldMax);
}

/** Max the current door.hp was armed against. Absent means the next punch arms it. */
const doorArmedMax = new WeakMap<Door, number>();

/**
 * Crystal Lockdown: "at least 5 crew" punching from the start can break the door just before the
 * 12 second coating melts, and crew "make about one attack per second" (Door System, "Door strength").
 * INFERRED: 5 × 12 = 60 hits. The door level does not change this. One drone at two hits a second
 * does not finish inside the coating.
 */
export const COATED_DOOR_HITS = 5 * 12;

/** Punch a crystal coating. "clear" means it no longer blocks. "broke" means this punch opened the door. */
export function punchCoat(door: Door, hits: number): "held" | "broke" | "clear" {
  if (door.b === "void") return "clear";
  if (door.coat == null) door.coat = COATED_DOOR_HITS;
  if (door.coat <= 0) return "clear";
  door.coat -= hits;
  // A 12 second coat of 0.05s steps lands on a float just under 60. That last flake still breaks it.
  if (door.coat > 1e-6) return "held";
  door.coat = 0;
  door.open = true;
  door.stuck = 7;
  door.hp = 0;
  return "broke";
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
 * Crystal Lockdown: doors left when a coating that was up before the hacking drone attached melts.
 * The page prints 4, "instead of the regular 10 hits on Hard difficulty".
 * Door System, "Hits required to break a door": 10 is the Hard level-3 cell. blastHits keeps the Normal column.
 */
export const HACK_COAT_HITS = 4;

function roomForHack(ship: Ship, systemId: string): Room | undefined {
  return ship.rooms.find((room) => room.id === systemId || room.system === systemId || room.kit === systemId);
}

function doorsOf(ship: Ship, roomId: string): Door[] {
  return ship.doors.filter((door) => door.b !== "void" && (door.a === roomId || door.b === roomId));
}

/** Hacking, "Overview": a latched drone makes this room's doors level-3 blast doors. */
function hackLatchedOn(g: Game, ship: Ship, room: Room): boolean {
  const id =
    ship === g.player
      ? g.enemy?.kits.spike?.hackLatched
        ? g.enemy.kits.spike.target
        : null
      : ship === g.enemy
        ? (g.enemy.hackDrone ?? null)
        : null;
  if (!id) return false;
  return room.id === id || room.system === id || room.kit === id;
}

/**
 * Crystal, "Crystal Lockdown": the coating lasts 12 seconds and resets blast-door health.
 * Door System, "Hits required to break a door": that table is the health being reset.
 * The coating itself is COATED_DOOR_HITS, and the door level does not change it.
 * Airlocks are not coated.
 * Hacking, "Overview": lockdown "completely restores" a hacked room's doors, which are level-3
 * blast doors. Another lockdown clears the 4-hit mark and protects that health while the coating
 * lasts (punches land on the coat, not on hp).
 */
function coatRoom(g: Game, ship: Ship, aboard: "player" | "enemy", roomId: string) {
  const room = roomById(ship, roomId);
  if (!room) return;
  room.lock = 12;
  delete room.lockHack;
  const level = doorLevel(g, ship, aboard);
  const hits = hackLatchedOn(g, ship, room) ? blastHits(HACKED_DOOR_LEVEL, g.difficulty) : blastHits(level, g.difficulty);
  for (const door of doorsOf(ship, roomId)) {
    door.hp = hits;
    door.coat = COATED_DOOR_HITS;
  }
}

/**
 * Crystal Lockdown: "if a room is locked down before a hacking drone attaches to the system,
 * then the room's doors take only 4 hits to be broken after the coating disappears".
 * Hacking, "Overview", prints the same 4.
 */
export function noteHackLatchedDuringLock(ship: Ship, systemId: string) {
  const room = roomForHack(ship, systemId);
  if (!room || (room.lock ?? 0) <= 0) return;
  room.lockHack = true;
}

/**
 * Crystal Lockdown: "if a hacking drone attaches to the system and the disruption pulse is
 * activated, then the doors retain their normal strength".
 * INFERRED: the pulse has to start while the coating is still up. "Retain" is the strength
 * the coating was holding, not a repair after the 4 hits are already left.
 * Hacked doors are level 3. The printed cells are Hard 10, Normal 12, Easy 16.
 */
export function noteHackPulseDuringLock(ship: Ship, systemId: string, difficulty: Difficulty = "normal") {
  const room = roomForHack(ship, systemId);
  if (!room?.lockHack || (room.lock ?? 0) <= 0) return;
  delete room.lockHack;
  const hits = blastHits(HACKED_DOOR_LEVEL, difficulty);
  for (const door of doorsOf(ship, room.id)) {
    if (door.stuck > 0) continue;
    door.hp = hits;
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
  // Slug hacker (doors): an offline Door System cannot open every door.
  if (!functional(g.player.systems.doors) || doorsOff(g, "player")) {
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

/**
 * Crystal Lockdown: once the coating has melted, leftover coating hits go with it.
 * A coating that was up before the hacking drone attached leaves 4 hits on that room's doors.
 * A pulse during the coating, or another lockdown, already cleared that mark.
 */
function meltCoats(g: Game) {
  for (const ship of [g.player, g.enemy]) {
    if (!ship) continue;
    for (const room of ship.rooms) {
      if (!room.lockHack || (room.lock ?? 0) > 0) continue;
      delete room.lockHack;
      for (const door of doorsOf(ship, room.id)) {
        if (door.stuck > 0) continue;
        door.hp = HACK_COAT_HITS;
      }
    }
    for (const door of ship.doors) {
      if (door.b === "void" || !(door.coat != null && door.coat > 0)) continue;
      if (coated(ship, door.a) || coated(ship, door.b)) continue;
      door.coat = 0;
    }
  }
}

export function toggleDoor(g: Game, a: string, b: string) {
  // Slug hacker (doors): an offline Door System cannot open or close a door.
  if (!functional(g.player.systems.doors) || doorsOff(g, "player")) {
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
function stopTargeting(g: Game) {
  g.targeting = false;
  g.beamAnchor = null;
}

function dropQueued(w: WeaponInst) {
  w.target = null;
  w.beamLine = null;
  w.own = false;
}

export function armWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  // A fresh aim starts at the first click. An unfinished beam start does not carry over.
  g.beamAnchor = null;
  if (!w.enabled) {
    // Weapon Control, Overview: ionized or hacked weapons cannot be powered manually.
    // A slot that is already on can still be aimed.
    if (weaponsPowerLocked(g)) return;
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

export function aim(g: Game, roomId: string, point?: BeamPoint) {
  // Weapon Control, Overview: a target room is confirmed by a left click while the cursor is targeting.
  // Beam (Weapons), "Beam targeting and damage mechanics": the first click sets the start and the second click fires.
  if (!g.targeting) return;
  const enemyRoom = g.enemy ? roomById(g.enemy, roomId) : undefined;
  const ownRoom = roomById(g.player, roomId);
  if (!enemyRoom && !ownRoom) return;
  const mask = powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
  let index = g.player.weapons.findIndex((w) => w.uid === g.armed);
  if (index < 0) index = g.player.weapons.findIndex((w, i) => w.enabled && mask[i]);
  const w = g.player.weapons[index];
  if (!w) {
    log(g, "No weapon selected.");
    stopTargeting(g);
    return;
  }
  g.armed = w.uid;
  const def = WEAPONS[w.defId];
  // Bomb (Weapons), lead: "Bombs are the only weapons that can be fired at your own ship."
  if (def?.kind === "beam") {
    if (!enemyRoom || !g.enemy) return;
    aimBeam(g, w, !!mask[index], roomId, point ?? roomCenter(enemyRoom));
    return;
  }
  if (!enemyRoom && def?.kind !== "bomb") return;
  g.beamAnchor = null;
  w.beamLine = null;
  w.own = def?.kind === "bomb" && !enemyRoom;
  w.target = roomId;
  const title = (enemyRoom ?? ownRoom)?.title ?? "room";
  // Weapon Control, Overview: a hack pulse cannot fire, even with stored charger shots.
  // Ion does not block a slot that still has power.
  if (!hackHoldsWeapons(g, "player") && mask[index] && weaponReady(w)) launch(g, "player", w);
  else {
    log(g, `${WEAPONS[w.defId]?.name ?? "Gun"} aimed at ${title}.`);
    sfx(g, "click");
  }
  // INFERRED: confirming the room leaves targeting mode. The overview does not say the cursor stays.
  stopTargeting(g);
}

/**
 * Beam (Weapons), "Beam targeting and damage mechanics":
 * "The first click sets the starting point... The second click fires the beam."
 * "Even catching a room with the tiniest edge of a beam... will deal full hull and system damage."
 * The segment is the two clicks. Printed length does not shorten it.
 */
function aimBeam(g: Game, w: WeaponInst, powered: boolean, roomId: string, point: BeamPoint) {
  const enemy = g.enemy;
  if (!enemy) return;
  const name = WEAPONS[w.defId]?.name ?? "Beam";
  const anchor = g.beamAnchor;
  if (!anchor) {
    g.beamAnchor = point;
    const title = roomById(enemy, roomId)?.title ?? "room";
    log(g, `${name} start on ${title}.`);
    sfx(g, "click");
    return;
  }
  const rooms = roomsOnSegment(enemy, anchor, point);
  w.beamLine = { a: anchor, b: point };
  w.target = rooms[0] ?? roomId;
  g.beamAnchor = null;
  const titles = (rooms.length > 0 ? rooms : [w.target]).map((id) => roomById(enemy, id)?.title ?? "room");
  if (powered && w.charge >= 1 && !hackHoldsWeapons(g, "player")) launch(g, "player", w);
  else {
    log(g, `${name} aimed across ${titles.join(", ")}.`);
    sfx(g, "click");
  }
  g.targeting = false;
}

/**
 * Weapon Control, Overview: the right mouse button cancels targeting.
 * INVENTED: it also drops the armed gun's queued room, so a queued shot can be called off.
 */
export function cancelTargeting(g: Game) {
  if (!g.targeting) return;
  stopTargeting(g);
  const w = g.player.weapons.find((x) => x.uid === g.armed);
  if (w) dropQueued(w);
  sfx(g, "click");
}

/** Weapon Control, Overview: a right click or Shift+1–4 depowers the weapon. It does not power it back on. */
export function depowerWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  // Weapon Control, Overview: ionized or hacked weapons cannot be depowered manually.
  if (weaponsPowerLocked(g)) return;
  w.enabled = false;
  // Crew skills, Weapons: off just after the skill increment cancels that shot. The point stays.
  cancelMuzzle(g, w);
  stopTargeting(g);
  sfx(g, "click");
}

/**
 * Weapon Control, Overview: "Weapons order can be changed by dragging and dropping a selected weapon."
 * "When ionized, the slot positions of the weapons can be changed." A hack pulse does not block it either.
 * Slot 1 is index 0, the left end of the list.
 */
export function reorderWeapons(g: Game, from: number, to: number) {
  if (!slide(g.player.weapons, from, to)) return;
  sfx(g, "click");
}

function slide<T>(list: T[], from: number, to: number): boolean {
  if (from === to || !Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return false;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  return true;
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
  if (hackHoldsWeapons(g, "player")) {
    log(g, "Weapon Control is hacked.");
    return;
  }
  const mask = powerMask(g.player, zoltanBars(g.crew, g.player, "player", "weapons"));
  let any = false;
  g.player.weapons.forEach((w, i) => {
    if (!mask[i] || !w.target || !weaponReady(w)) return;
    launch(g, "player", w);
    any = true;
  });
  if (!any) log(g, "Nothing is charged and aimed.");
}

export function toggleWeapon(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w || weaponsPowerLocked(g)) return;
  w.enabled = !w.enabled;
  if (!w.enabled) cancelMuzzle(g, w);
  sfx(g, "click");
}

/**
 * Crew skills, Weapons: the skill point is already granted. Turning the weapon off drops the shot.
 * INFERRED: one missile comes back, because that shot did not leave. A launch spends one.
 * INFERRED: charge stays spent, and a chain step that already advanced stays advanced.
 */
function cancelMuzzle(g: Game, w: WeaponInst) {
  const ids = w.muzzleShots;
  const open = (w.muzzle ?? 0) > 0 && !!ids?.length;
  w.muzzle = 0;
  delete w.muzzleShots;
  if (!open || !ids) return;
  const keep = new Set(ids);
  let dropped = 0;
  g.shots = g.shots.filter((s) => {
    if (!keep.has(s.id) || s.t >= 1) return true;
    dropped += 1;
    return false;
  });
  const def = WEAPONS[w.defId];
  if (dropped > 0 && def?.ammo && !keepMissile(g)) g.missiles += 1;
}

function tickMuzzle(g: Game, dt: number) {
  for (const w of g.player.weapons) {
    if (!((w.muzzle ?? 0) > 0)) continue;
    w.muzzle = (w.muzzle ?? 0) - dt;
    if ((w.muzzle ?? 0) <= 0) {
      w.muzzle = 0;
      delete w.muzzleShots;
    }
  }
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

/**
 * Beam (Weapons): "Enemies target beams inefficiently, starting the beam in the centre of a room."
 * INFERRED: the rest of that swipe is one door-neighbour. The player draws a segment instead.
 */
function enemyBeamRooms(ship: Ship, origin: string): string[] {
  const r = roomById(ship, origin);
  if (!r) return [origin];
  const list = neighbors(ship, origin);
  const prefer = list.find((id) => roomById(ship, id)?.system) ?? list[0];
  return prefer ? [origin, prefer] : [origin];
}

function beamSwipe(from: "player" | "enemy", ship: Ship, w: WeaponInst): string[] {
  if (from === "player") {
    if (w.beamLine) {
      const rooms = roomsOnSegment(ship, w.beamLine.a, w.beamLine.b);
      if (rooms.length > 0) return rooms;
    }
    return w.target ? [w.target] : [];
  }
  return enemyBeamRooms(ship, w.target ?? "");
}

function launch(g: Game, from: "player" | "enemy", w: WeaponInst, volley?: number) {
  // Weapons, "Missiles" and "Bombs": one ammunition per shot.
  // INFERRED: flight 0.7s, missiles and bombs 1.35s, beams 0.32s. "Weapons timing and travel times" lists no seconds.
  const def = WEAPONS[w.defId];
  const cap = def ? chargerCap(w.defId) : null;
  if (!def || !w.target) return;
  // Weapon Control, Overview: actively hacked weapons cannot be fired, stored charges included.
  if (hackHoldsWeapons(g, from)) return;
  const count = cap == null ? (def.kind === "beam" ? 1 : def.shots) : Math.floor(volley ?? w.loaded ?? 0);
  if (cap == null) {
    if (w.charge < 1) return;
  } else if (count < 1) return;
  const ship = from === "player" ? g.player : g.enemy;
  // Bomb (Weapons), lead: a bomb may be aimed at the shooter's own hull. Every other shot goes to the other hull.
  const targetShip = from === "player" && def.kind === "bomb" && w.own ? g.player : from === "player" ? g.enemy : g.player;
  if (!ship || !targetShip) return;
  const rooms = def.kind === "beam" ? beamSwipe(from, targetShip, w) : [w.target];
  if (rooms.length === 0 || !rooms[0]) return;
  if (def.ammo) {
    if (from === "player") {
      if (g.missiles <= 0) {
        // A queued shot would retry every tick, so it says so once and a one-shot target is dropped.
        if (g.log[0] !== "No missiles.") log(g, "No missiles.");
        if (!slotAutofire(g, w)) dropQueued(w);
        return;
      }
      if (!keepMissile(g)) g.missiles -= 1;
    } else if (ship.ammo <= 0) return;
    else ship.ammo -= 1;
  }
  // A charger keeps the in-progress shot. The bank is what leaves the barrel.
  // Ion (Weapons) / Laser (Weapons): one click fires every stored shot. Autofire passes `volley` 1.
  if (cap == null) w.charge = 0;
  else if (volley == null) w.loaded = 0;
  else if ((w.loaded ?? 0) > 0) w.loaded = Math.max(0, (w.loaded ?? 0) - count);
  // Ion (Weapons), Chain Ion: the shot uses this step, then the step advances. A dry missile returns above.
  const step = w.chain ?? 0;
  const ion = chainIonAmount(w.defId, step) ?? def.ion;
  const line = def.kind === "beam" && w.beamLine ? { a: { ...w.beamLine.a }, b: { ...w.beamLine.b } } : undefined;
  const aimed = roomById(targetShip, rooms[0]);
  // Missile (Weapons), ===Swarm Missiles===: a 1x2 room scatters. A 2x2 stays. Radius 31 is not a pixel sim.
  const scatter = w.defId === "swarmmissiles" && aimed != null && swarmAimRolls(aimed);
  // Flak (Weapons), Flak Gun Mark I: 1x2 and 2x2 room odds. Radius 42 is not a pixel sim.
  const flak1 = w.defId === "scatter" && aimed != null && flak1AimRolls(aimed);
  // Flak (Weapons), Flak Gun Mark II: 1x2 and 2x2 room odds. Radius 55 is not a pixel sim. Fake flak stays unspawned.
  const flak2 = w.defId === "flak2" && aimed != null && flak2AimRolls(aimed);
  // Flak (Weapons), Adv. Flak Gun: 1x2 and 2x2 room odds. Radius 40 is not a pixel sim. Fake flak stays unspawned.
  const advFlak = w.defId === "advflak" && aimed != null && advFlakAimRolls(aimed);
  const born: string[] = [];
  if (w.defId === "scatter") {
    // Flak (Weapons), Flak Gun Mark I: Additional fake flak 3.
    // INFERRED: decoys are pushed first. A defense drone takes the first eligible shot.
    // INFERRED: a fake pellet stays on the aimed room and does not roll the 1x2 split.
    // INFERRED: flight matches the damaging pellets. The page does not print a separate time.
    for (let i = 0; i < FLAK1_FAKE; i++) {
      const id = uid(g);
      born.push(id);
      g.shots.push({
        id,
        kind: "missile",
        from,
        damage: 0,
        ion: 0,
        fireChance: 0,
        breachChance: 0,
        targetRoom: rooms[0],
        defId: w.defId,
        wait: 0,
        t: 0,
        duration: 0.7,
        label: FLAK1_FAKE_LABEL,
      });
    }
  }
  for (let i = 0; i < count; i++) {
    let targetRoom = rooms[0];
    let offRoom = false;
    if (scatter) {
      const land = swarmLanding(targetShip.rooms, rooms[0], rand(g));
      if (land.kind === "miss") offRoom = true;
      else if (land.kind === "room") targetRoom = land.roomId;
    } else if (flak1) {
      const land = flak1Landing(targetShip.rooms, rooms[0], rand(g));
      if (land.kind === "miss") offRoom = true;
      else if (land.kind === "room") targetRoom = land.roomId;
    } else if (flak2) {
      const land = flak2Landing(targetShip.rooms, rooms[0], rand(g));
      if (land.kind === "miss") offRoom = true;
      else if (land.kind === "room") targetRoom = land.roomId;
    } else if (advFlak) {
      const land = advFlakLanding(targetShip.rooms, rooms[0], rand(g));
      if (land.kind === "miss") offRoom = true;
      else if (land.kind === "room") targetRoom = land.roomId;
    }
    const id = uid(g);
    born.push(id);
    g.shots.push({
      id,
      kind: def.kind,
      from,
      damage: def.damage,
      ion,
      fireChance: def.fire,
      breachChance: def.breach,
      targetRoom,
      beamRooms: def.kind === "beam" ? rooms : undefined,
      beamLine: line,
      defId: w.defId,
      own: from === "player" && def.kind === "bomb" && w.own === true ? true : undefined,
      offRoom: offRoom ? true : undefined,
      wait: i * def.gap,
      t: 0,
      duration: def.kind === "missile" || def.kind === "bomb" ? 1.35 : def.kind === "beam" ? 0.32 : 0.7,
    });
  }
  const next = nextChainStep(w.defId, step);
  if (next != null) w.chain = next;
  // INVENTED: a manual gun fires its queued room once and then needs a new target. Autofire keeps the room.
  // INFERRED: autofire repeats the drawn beam segment. A manual beam needs a new line.
  if (from === "player" && !slotAutofire(g, w)) dropQueued(w);
  const sound = def.kind === "flak" ? "laser" : def.kind === "bomb" ? "missile" : def.kind === "laser" ? "laser" : def.kind;
  sfx(g, sound);
  veilBrokenByFire(g, from, def.kind);
  if (from === "player") {
    log(g, `${def.name} away.`);
    noteWeaponManning(g);
    // Crew skills, Weapons: the increment lands as the shot starts. Turning the gun off drops these ids.
    w.muzzle = MUZZLE_S;
    w.muzzleShots = born;
  }
}

/**
 * Working bars of a kit: reactor power plus one yellow bar per living Zoltan in its room.
 * Wiki page "Zoltans": subsystems are unaffected; these kits are not subsystems.
 * The yellow bar does not lower kit.power, and it cannot exceed the undamaged levels.
 * Ion on Cloaking, Hacking, Mind Control, and the Crew Teleporter blocks activation and does not remove this bar.
 * Pass `bonus` to override the stamp.
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

/**
 * Zoltans, lead: Cloaking, Hacking, Crew Teleporter, and Mind Control lock reactor bars
 * during the cooldown after use. Mind Control's ordinary cooldown is still 0 (leash.ts);
 * this is true only while kit.cool is actually counting, including an enemy hold's wait
 * and Hacking's relaunch wait, which share that field.
 */
const COOLDOWN_LOCK: ReadonlySet<string> = new Set(["veil", "spike", "sling", "leash"]);

export function cooldownLocksPower(kit: Kit | undefined): boolean {
  return !!kit && kit.cool > 0 && COOLDOWN_LOCK.has(kit.id);
}

/**
 * Zoltans, lead: walking a Zoltan into a cooling system turns one locked bar from reactor
 * power into Zoltan power. Leaving empties that bar, so the reactor power stays free.
 * A Zoltan already standing there when the cooldown is first seen does not swap until
 * they leave and come back. One arrival frees one bar.
 */
export function swapZoltanCooldown(g: Game): void {
  peelZoltanCooldown(g, g.player, "player");
  if (g.enemy) peelZoltanCooldown(g, g.enemy, "enemy");
}

function peelZoltanCooldown(g: Game, ship: Ship, aboard: "player" | "enemy"): void {
  if (!ship.kits || !ship.rooms) return;
  for (const kit of Object.values(ship.kits)) {
    if (!kit || !COOLDOWN_LOCK.has(kit.id)) continue;
    if (kit.cool <= 0) {
      delete kit.swap;
      continue;
    }
    const room = ship.rooms.find((r) => r.kit === kit.id);
    const here = room
      ? g.crew
          .filter((c) => c.aboard === aboard && c.kin === "spark" && c.hp > 0 && c.room === room.id)
          .map((c) => c.id)
      : [];
    if (!kit.swap) {
      kit.swap = here;
      continue;
    }
    const known = new Set(kit.swap);
    for (const id of here) {
      if (known.has(id)) continue;
      if (kit.power > 0) kit.power -= 1;
    }
    kit.swap = here;
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

/** Zoltans: Cloaking, Hacking, Mind Control, and Crew Teleporter cannot be activated while any ion point remains. */
const ACTIVATION_ION: ReadonlySet<string> = new Set(["veil", "spike", "leash", "sling"]);

export function kitIonLocked(kit: { ion?: number[] } | undefined): boolean {
  return (kit?.ion?.length ?? 0) > 0;
}

function ionOnActivationKit(ship: Ship, kitId: string | undefined, points: number) {
  if (!kitId || !ACTIVATION_ION.has(kitId)) return;
  const kit = ship.kits[kitId as KitId];
  if (!kit) return;
  // Same 5 seconds per point, up to 5, as applyIon. The page does not print a second duration.
  if (!kit.ion) kit.ion = [];
  for (let i = 0; i < points; i++) {
    if (kit.ion.length >= 5) break;
    kit.ion.push(5);
  }
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
 * Beam (Weapons), "Beams vs Zoltan Shields": the first instance is at 33% of the path,
 * the second at 80%. Beams that do no hull damage do 1 per instance.
 * Artillery Beam is not launched as a shot. lance.ts still skips this bubble.
 */
const ZOLTAN_BEAM_FIRST = 0.33;
const ZOLTAN_BEAM_SECOND = 0.8;

function zoltanBeamInstance(shot: Shot): number {
  if (shot.damage <= 0) return 1;
  return shot.damage;
}

/**
 * Beam (Weapons), "Beams vs Zoltan Shields": Beam Drone 1 and Fire Drone have no second tick.
 * INFERRED: those two are defId "beam" or "fire", or a drone label that names fire or beam1.
 * A drone label that does not name the kind still takes both ticks. swarm.ts spends the bubble
 * on a drone swipe before this shot is built, so that path is not a second specification.
 */
function zoltanBeamTicks(shot: Shot): number {
  if (shot.defId === "beam" || shot.defId === "fire") return 1;
  const label = shot.label ?? "";
  if (/drone:.*(fire|beam1|beam-1)/i.test(label)) return 1;
  if (label.startsWith("drone:") && shot.fireChance >= 0.9) return 1;
  return 2;
}

/**
 * INFERRED: each room in the swipe is an equal slice of the path, in order.
 * The page does not print a pixel clock. A room the beam has already left takes nothing.
 * A room the beam is still inside, or enters later, takes the normal hit.
 */
function roomsAfterZoltanBreak(rooms: string[], brokeAt: number): string[] {
  const n = rooms.length;
  if (n === 0) return rooms;
  return rooms.filter((_, i) => (i + 1) / n > brokeAt);
}

/** Bomb (Weapons), Stun Bomb: "stuns all enemy and player crew and drones in affected room for 15 seconds." */
const STUN_BOMB_S = 15;

/** Boarding, "Stun effect": "Ion Stunner (5 seconds stun)" on crew and drones in the room. */
const ION_STUNNER_S = 5;

function stunRoom(g: Game, roomId: string, aboard: "player" | "enemy", seconds: number) {
  for (const c of g.crew) {
    if (c.aboard !== aboard || c.room !== roomId || c.hp <= 0) continue;
    c.stun = Math.max(c.stun ?? 0, seconds);
  }
  // A beam drone stores the last room it swiped. That drone is still in orbit, so the room stun skips it.
  const playerKit = g.player.kits.swarm;
  if (playerKit?.on && playerKit.hp != null && playerKit.room === roomId) {
    const onEnemy = playerKit.target === "ionintruder" || playerKit.target === "board";
    if ((aboard === "enemy") === onEnemy) playerKit.stun = Math.max(playerKit.stun ?? 0, seconds);
  }
  for (const unit of g.enemy?.kits.swarm?.drones ?? []) {
    if (!unit.alive || unit.room !== roomId) continue;
    const spot = enemyDroneSpot(unit);
    if (aboard === "player" && spot?.at !== "player-room") continue;
    if (aboard === "enemy" && spot?.at !== "enemy-room") continue;
    unit.stun = Math.max(unit.stun ?? 0, seconds);
  }
}

function stunBombRoom(g: Game, roomId: string, aboard: "player" | "enemy") {
  stunRoom(g, roomId, aboard, STUN_BOMB_S);
}

export function applyImpact(g: Game, shot: Shot) {
  // Bomb (Weapons), lead: a bomb aimed at your own ship hits that hull. Every other shot hits the other one.
  const ownBomb = shot.kind === "bomb" && shot.own === true;
  // Environmental Hazards, Asteroid Field: the same rock also strikes the enemy ship.
  const playerTarget =
    shot.at === "enemy" ? false : shot.at === "player" ? true : ownBomb ? shot.from === "player" : shot.from !== "player";
  const ship = playerTarget ? g.player : g.enemy;
  if (!ship) return;
  // Missile (Weapons), ===Swarm Missiles===: a long-side tile with no room is not a hit.
  // INFERRED: that miss does not roll evasion and does not spend a Zoltan Shield.
  if (shot.offRoom) {
    log(g, playerTarget ? "The swarm missed the Lark." : "The swarm slipped past the room.");
    floatAt(g, "MISS", playerTarget ? 72 : 28, 18);
    return;
  }
  const aboard: "player" | "enemy" = playerTarget ? "player" : "enemy";
  if (shot.kind === "bomb") {
    // Bomb (Weapons), lead: "Bombs can miss, but not when targeting your own ship."
    // Template:In-game tips, Repair Bomb: "Bombs never miss when targeting your own ship."
    // Template:In-game tips, Heal Bomb: a Healing Burst can still miss the enemy ship.
    const evade = evasionPercent(g, ship, aboard);
    const ownHull = ownBomb && playerTarget === (shot.from === "player");
    if (!ownHull && rand(g) * 100 < evade) {
      if (playerTarget) noteDodge(g);
      log(g, playerTarget ? "Bomb missed the Lark." : "They slipped the bomb.");
      floatAt(g, "MISS", playerTarget ? 70 : 30, 20);
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    if (!r) return;
    // Mind Control, Overview: "teleporting a bomb that doesn't miss a targeted room".
    // INFERRED: only the player's bomb, and the room stays open for this fight.
    // A Zoltan Shield that then stops the payload is not a miss. An enemy bomb does not open a room.
    if (shot.from === "player") noteBombSight(g, aboard, r.id);
    // Augmentations, Zoltan Shield Bypass: a player bomb passes the bubble and does not spend it.
    // Enemy bombs stay blocked. The enemy has no augment list.
    const bombThrough =
      (ship.zoltan ?? 0) > 0 &&
      shot.from === "player" &&
      g.augments.includes("bypass") &&
      bypassZoltan("bomb") === "pass";
    // Zoltan Shield, lead: ion weapons deal double damage to the bubble. Ion and stun bombs carry ion and no hull damage.
    // The page does not say leftover ion reaches a system, so a hit that touches the bubble stops there.
    // With the bypass, Bomb (Weapons), Ion Bomb, still puts its ion on the room's system.
    // Augmentations, Reverse Ion Field: ion protection also covers a Zoltan Shield.
    // Zoltan Shield, lead: the pass-through bug names an ion projectile, so a resisted ion bomb stops.
    if ((ship.zoltan ?? 0) > 0 && !bombThrough && shot.damage <= 0 && shot.ion > 0) {
      if (playerTarget && negateIon(g)) {
        log(g, "Reverse Ion Field shrugged that off.");
        return;
      }
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
      // Bomb (Weapons), Ion Bomb: system damage 0, and 4 ion to the targeted system or subsystem.
      // Crew damage is 0. "Low chance to stun" prints no percent, so that stun is not rolled.
      // Bomb (Weapons), Stun Bomb: 1 ion, and every crew member and drone in the room is stunned for 15 seconds.
      if ((shot.defId === "ionbomb" || shot.defId === "stunbomb") && shot.ion > 0) {
        // INFERRED: Reverse Ion Field negates the ion. The Stun Bomb's 15 second stun is printed beside it, so it still lands.
        const held = playerTarget && negateIon(g);
        if (held) log(g, "Reverse Ion Field shrugged that off.");
        else {
          if (r.kit === "spike") ionHitsHack(g, ship, Math.max(1, shot.ion));
          // Zoltans: those four systems cannot be activated if they are ionized. An active cloak or hold is not ended here.
          ionOnActivationKit(ship, r.kit, Math.max(1, shot.ion));
          // Mind Control, Overview: ion that covers every level starts the 25s cooldown. The hold stays up.
          if (r.kit === "leash" && ship.kits.leash) ionOnLeash(ship.kits.leash);
          // Backup Battery, Overview: ion that covers every level starts the 25s cooldown.
          if (r.kit === "cell" && ship.kits.cell) ionOnCell(g, ship.kits.cell, Math.max(1, shot.ion));
          if (r.system) {
            if (!ionArtillery(ship, r.id, Math.max(1, shot.ion))) {
              applyIon(ship, r.system, Math.max(1, shot.ion), zoltanBars(g.crew, ship, aboard, "shields"));
            }
            log(g, playerTarget ? `${r.title} ionized.` : `Ion on their ${r.title}.`);
          }
        }
        if (shot.defId === "stunbomb") stunBombRoom(g, r.id, aboard);
        r.flash = 0.25;
        sfx(g, "ion");
        return;
      }
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
    // Beam (Weapons), "Beams vs Zoltan Shields": up to two instances, at 33% and 80% of the path.
    // Room count does not change the instance. Zoltan Shield, lead: Hull Beam's systemless rooms do not raise it.
    // If the bubble breaks while the beam is still firing, the rest of the path is a normal swipe.
    const rooms = shot.beamRooms ?? [shot.targetRoom];
    let openRooms = rooms;
    if ((ship.zoltan ?? 0) > 0) {
      const instance = zoltanBeamInstance(shot);
      const marks = zoltanBeamTicks(shot) === 1 ? [ZOLTAN_BEAM_FIRST] : [ZOLTAN_BEAM_FIRST, ZOLTAN_BEAM_SECOND];
      let brokeAt: number | null = null;
      for (const at of marks) {
        if ((ship.zoltan ?? 0) <= 0) break;
        spendZoltan(ship, instance);
        noteZoltan(g, playerTarget);
        if ((ship.zoltan ?? 0) <= 0) {
          brokeAt = at;
          break;
        }
      }
      if (brokeAt == null) return;
      openRooms = roomsAfterZoltanBreak(rooms, brokeAt);
      if (openRooms.length === 0) return;
    }
    // Zoltan Shield, lead: if the bubble breaks before the swipe ends, the beam continues against regular shields or hull.
    // Beam (Weapons), "Beam targeting and damage mechanics": each shield layer cuts the room's damage by 1, and the beam does not pop a layer.
    // Hull Beam's systemless 2 is cut the same way, per room. A system room at 1 damage still skids off one layer.
    const reduce = ship.shieldNow;
    // Fires: "Fire beams can be blocked by a regular shield barrier (1 is enough)".
    // Beam (Weapons): "even one shield layer is enough to block most beam weapons."
    // Anti-Bio and Fire Beam print damage "-". One regular layer blocks the fire roll and the 60 HP.
    // Zoltan Shield damage is already spent above. Regular layers are not popped.
    // A damage number, even 1, is still cut by each layer below.
    const dashed = shot.damage <= 0;
    if (dashed && reduce > 0) {
      log(g, "Beam skids off the shields.");
      sfx(g, "shield");
      return;
    }
    let landed = false;
    for (const id of openRooms) {
      const room = roomById(ship, id);
      if (!room) continue;
      const system = dashed ? 0 : Math.max(0, shot.damage - reduce);
      const hull = dashed ? 0 : roomHull(shot, room, system, reduce);
      const roomEffect = dashed && (citedCrewDamage(shot, 0) != null || shot.fireChance > 0);
      if (system <= 0 && hull <= 0 && !roomEffect) continue;
      landed = true;
      strikeRoom(g, ship, aboard, id, system, shot, playerTarget, hull);
    }
    if (!landed) {
      log(g, "Beam skids off the shields.");
      sfx(g, "shield");
    }
    return;
  }

  if (missed) {
    if (playerTarget) noteDodge(g);
    log(g, playerTarget ? "Shot missed the Lark." : "Enemy evasion held.");
    floatAt(g, "MISS", playerTarget ? 72 : 28, 18);
    return;
  }

  // Zoltan Shield, lead: a resisted ion projectile still hits the room when no regular shield bubble is up.
  let ionPassthrough = false;
  if (shot.kind === "ion") {
    // Zoltan Shield, lead: ion weapons deal double damage to the bubble.
    // The page does not say leftover ion reaches a system, so none is applied.
    // Augmentations, Reverse Ion Field: one roll covers the bubble. Two copies always hold.
    const bubbleUp = (ship.zoltan ?? 0) > 0 && shot.ion > 0;
    if (bubbleUp && playerTarget && negateIon(g)) {
      if (ship.shieldNow > 0) {
        log(g, "Reverse Ion Field shrugged that off.");
        return;
      }
      ionPassthrough = true;
    }
    if (!ionPassthrough) {
      const bubble = spendZoltan(ship, Math.max(0, shot.ion) * 2);
      if (bubble != null) {
        noteZoltan(g, playerTarget);
        return;
      }
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
    if (shot.kind === "ion") {
      // Crew skills, Shields: "Ion projectiles, when blocked by shields, ionize the Shields system,
      // preventing manning the system and getting the skill points." The aimed room stays clear.
      applyIon(ship, "shields", Math.max(1, shot.ion), zoltanBars(g.crew, ship, aboard, "shields"));
      // Ion (Weapons), Ion Stunner: "this includes crew in the shields room if the shields themselves were hit".
      // The Ion Stunner still stuns the Shields room.
      if (shot.defId === "stunner") {
        const shields = roomWith(ship, "shields");
        if (shields) stunRoom(g, shields.id, aboard, ION_STUNNER_S);
      }
    } else if (playerTarget && skillFight(g)) {
      // Crew skills, Shields: "one point of experience for every projectile that hits your shield bubble and depletes it".
      // "asteroids will not provide training unless you are still in combat." A rock during the fight still does.
      bumpXp(g, manningCrew(g, g.player, "player", "shields"), "shields", 1);
    }
    sfx(g, "shield");
    floatAt(g, "SHIELD", playerTarget ? 68 : 32, 16);
    if (playerTarget) g.trauma = Math.min(1, g.trauma + 0.18);
    return;
  }
  if (shot.kind !== "missile" && pierce > 0 && ship.shieldNow > 0) ship.shieldNow = 0;

  if (shot.kind === "ion") {
    if (playerTarget && !ionPassthrough && negateIon(g)) {
      log(g, "Reverse Ion Field shrugged that off.");
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    // Zoltans: ion damage interrupts Hacking. The cooldown matches the ion damage.
    // A room that only houses the kit still counts. An active cloak or mind-control hold is not ended here.
    // Zoltans: Cloaking, Hacking, Mind Control, and Crew Teleporter cannot be activated if they are ionized.
    if (r?.kit === "spike") ionHitsHack(g, ship, Math.max(1, shot.ion));
    if (r) ionOnActivationKit(ship, r.kit, Math.max(1, shot.ion));
    // Mind Control, Overview: ion that covers every level starts the 25s cooldown. The hold stays up.
    if (r?.kit === "leash" && ship.kits.leash) ionOnLeash(ship.kits.leash);
    // Backup Battery, Overview: ion that covers every level starts the 25s cooldown.
    if (r?.kit === "cell" && ship.kits.cell) ionOnCell(g, ship.kits.cell, Math.max(1, shot.ion));
    if (r?.system) {
      // @agent:flagship. A flagship artillery room ionizes only its own gun (wiki/flagship-systems.ts ionArtillery).
      if (!ionArtillery(ship, r.id, Math.max(1, shot.ion))) applyIon(ship, r.system, Math.max(1, shot.ion), zoltanBars(g.crew, ship, aboard, "shields"));
      log(g, playerTarget ? `${r.title} ionized.` : `Ion on their ${r.title}.`);
    }
    // Boarding, "Stun effect": the Ion Stunner stuns crew and drones in the room for 5 seconds.
    // A shield bubble already returned above, so that room stays clear, as with any other ion.
    if (shot.defId === "stunner" && r) stunRoom(g, r.id, aboard, ION_STUNNER_S);
    sfx(g, "ion");
    if (r) r.flash = 0.25;
    return;
  }

  const struck = roomById(ship, shot.targetRoom);
  // A Zoltan leftover is already reduced. The empty-room figure replaces hull only when the system-room figure is intact.
  const hull =
    struck && systemlessHull(shot.defId) != null && damage === shot.damage
      ? roomHull(shot, struck, damage, 0)
      : damage;
  strikeRoom(g, ship, aboard, shot.targetRoom, damage, shot, playerTarget, hull);
}

/**
 * Hull damage for one room.
 * systemDamage is the system-room figure after shield reduction (beams) or after a Zoltan leftover (other shots).
 * shieldCut is how many shield layers already came off a beam. Other shots pass 0; a shield still up stops them earlier.
 * A system or kit room keeps systemDamage. A systemless room uses the printed hull figure, cut by shieldCut for a beam.
 * A Zoltan leftover (systemDamage !== shot.damage, and not a beam) is not raised again.
 */
function roomHull(shot: Shot, room: Room, systemDamage: number, shieldCut: number): number {
  const listed = systemlessHull(shot.defId);
  if (listed == null || room.system != null || room.kit) return systemDamage;
  if (shot.kind === "beam") return Math.max(0, listed - shieldCut);
  if (systemDamage !== shot.damage) return systemDamage;
  return listed;
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
  // Augmentations, Crystal Vengeance, grey note: a friendly defense drone can shoot the shard down.
  // INFERRED: that drone orbits this hull, so it is offered the shard before the enemy's drone.
  // Friendly projectiles are not given a meeting point. No flight time is printed, so the shard still resolves now.
  if (swarmIntercept(g, shot)) {
    log(g, "Your defense drone shot the shard down.");
    return;
  }
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
  hullDamage = damage,
) {
  const r = roomById(ship, roomId);
  const hull = hullDamage;
  // A damage dash still reaches the room: Anti-Bio's crew HP, or a Fire Beam's fire roll.
  const dashed = shot.kind === "beam" && shot.damage <= 0 && (citedCrewDamage(shot, 0) != null || shot.fireChance > 0);
  if (!r || (damage <= 0 && hull <= 0 && !dashed)) return;
  if (damage > 0) {
    if (r.kit) hurtKit(ship, r.kit, damage);
    if (r.system) {
      if (playerHurt && negateSystem(g)) log(g, "Titanium System Casing held the system.");
      // @agent:flagship. A flagship artillery room is its own system: only that gun slows (wiki/flagship-systems.ts).
      else if (!hurtArtillery(ship, r.id, damage)) hurtSystem(ship, r.system, damage, zoltanBars(g.crew, ship, aboard, "shields"));
    }
  }
  // Bomb (Weapons) lead: bombs deal no hull damage. System damage above still lands.
  // Crew damage on a bomb is often its own figure (BOMB_GAPS). This still uses 15 per system point from Weapons, "Weapons: general information".
  if (shot.kind !== "bomb" && hull > 0) {
    const held = playerHurt && negateHull(g);
    const before = ship.hull;
    if (!held) ship.hull = Math.max(0, ship.hull - hull);
    else log(g, "Rock Plating held the hull.");
    // Augmentations, Crystal Vengeance: 10 percent chance when the ship takes damage.
    // A shield pop and Rock Plating are not hull loss. One roll per drop.
    if (playerHurt && ship.hull < before && g.augments.includes("vengeance") && vengeanceFires(rand(g))) {
      looseShard(g);
    }
  }
  r.flash = 0.35;
  // Weapons, "Weapons: general information": each point of system damage deals 15 crew damage.
  // Laser (Weapons), "Types of lasers": Hull Laser crew damage is not increased on a systemless room, so this uses `damage`, not hull.
  // A beam's printed crew HP still applies when the room takes hull and the shield cut the system figure to 0.
  // INFERRED: that room was hit. The beam page's crew line is not "per point of system damage".
  const printed = citedCrewDamage(shot, damage);
  const crewHit = printed != null ? printed : 15 * Math.max(0, damage);
  for (const c of g.crew) {
    if (c.aboard === aboard && c.room === roomId && c.hp > 0) c.hp -= crewHit;
  }
  // Weapons, "Weapons: general information": on-board drones take half of that crew damage.
  hurtRoomDrones(g, aboard, roomId, crewHit);
  // INFERRED: a hit starts one fire, stacked to 3. The fetched pages do not number that cap.
  // Laser (Weapons), "Types of lasers": Heavy Lasers roll the 30% fire chance first,
  // then the 30% breach chance only if that roll started no fire.
  // INFERRED: the gate is defId heavy, heavy2, and heavypierce. Other weapons still roll both.
  // A surge laser is hard-coded to 21% breach and has no defId, so it is not this gate.
  // INFERRED: "no fires started" is the fire roll missing, not the room's existing fire count.
  const heavyLaser = shot.defId === "heavy" || shot.defId === "heavy2" || shot.defId === "heavypierce";
  let fireStarted = false;
  if (shot.fireChance > 0 && rand(g) < shot.fireChance) {
    r.fire = Math.min(3, r.fire + 1);
    fireStarted = true;
  }
  if (shot.breachChance > 0 && !(heavyLaser && fireStarted) && rand(g) < shot.breachChance) r.breach += 1;
  // @agent:flagship. Stage-3 Power Surge lasers: "20% stun" (wiki/flagship-systems.ts SURGE_STUN_S, INFERRED 3 s).
  if ((shot.stunChance ?? 0) > 0 && rand(g) < (shot.stunChance ?? 0)) {
    for (const c of g.crew) {
      if (c.aboard === aboard && c.room === roomId && c.hp > 0) c.stun = Math.max(c.stun ?? 0, SURGE_STUN_S);
    }
  }
  const shown = hull > 0 ? hull : damage;
  floatAt(g, `−${shown}`, playerHurt ? 74 : 26, 30);
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
    log(g, `Their ${r.title} takes ${shown}.`);
  }
}

/**
 * Ion Charger, the three Laser Chargers, and Swarm Missiles.
 * `shots` on the def is the bank, not one volley of a normal gun.
 * Missile (Weapons), Swarm Missiles: "7 seconds per shot" and "Shots: 1-3".
 */
const CHARGER_IDS = new Set(["ioncharger", "chargers", "charger", "charger2", "swarmmissiles"]);

/** Bank size for a charger, or null when this gun fires its whole volley from one bar. */
export function chargerCap(defId: string): number | null {
  if (!CHARGER_IDS.has(defId)) return null;
  const n = WEAPONS[defId]?.shots ?? 0;
  return n > 0 ? n : null;
}

/**
 * Bar shown in the dock and on the enemy charge row.
 * A charger fills by stored shots plus the shot in progress. A full bank reads as a full bar.
 */
export function weaponChargeShown(w: WeaponInst): number {
  const cap = chargerCap(w.defId);
  const charge = Math.max(0, w.charge);
  if (cap == null) return Math.min(1, charge);
  const loaded = Math.max(0, w.loaded ?? 0);
  const filling = loaded < cap ? Math.min(1, charge) : 0;
  return Math.min(1, (loaded + filling) / cap);
}

/** Move finished charger time into the bank. A full bank drops leftover progress. */
function absorbCharger(w: WeaponInst, max: number) {
  let loaded = w.loaded ?? 0;
  while (w.charge >= 1 && loaded < max) {
    w.charge -= 1;
    loaded += 1;
  }
  if (loaded >= max) w.charge = 0;
  w.loaded = loaded;
}

/** True when a click or autofire tick may fire. Settles a finished charger shot into the bank first. */
function weaponReady(w: WeaponInst): boolean {
  const max = chargerCap(w.defId);
  if (max == null) return w.charge >= 1;
  absorbCharger(w, max);
  return (w.loaded ?? 0) >= 1;
}

/**
 * Ion (Weapons), Ion Charger, and Laser (Weapons), Laser Charger / (S) / Mark II.
 * Missile (Weapons), Swarm Missiles uses the same bank: 7 seconds per stored shot, up to 3.
 * Each shot takes `def.charge` seconds. Manual aim fires the whole bank.
 * A Swarm volley spends one missile, whether the bank is 1 or 3.
 * Autofire, and every enemy gun, fires one finished shot and does not bank.
 * Swarm autofire spends one missile for that shot. It does not dump a stored bank as one volley.
 * INFERRED: one stored Swarm shot leaves per tick. The page does not print a same-tick dump.
 * Losing power does not empty the bank. A cloak pause or a weapons hack holds it.
 * The Swarm page does not print the offline keep. It follows the charger bank.
 */
function tickCharger(
  g: Game,
  ship: Ship,
  from: "player" | "enemy",
  w: WeaponInst,
  i: number,
  def: (typeof WEAPONS)[string],
  mask: boolean[],
  frozen: boolean,
  mult: number,
  dt: number,
) {
  const max = chargerCap(w.defId);
  if (max == null) return;
  // Not a chain: going offline keeps the bank and the shot in progress.
  if (!mask[i] || hackDrainsGun(g, from, w.defId)) return;
  if (from === "enemy" && !w.target) w.target = enemyTarget(g, w);
  if (frozen) return;
  if ((w.loaded ?? 0) < max && def.charge > 0) w.charge += dt / (def.charge * mult);
  // Cloaking: a cloaked enemy that holds fire keeps the charge. For a charger that means the bank grows.
  if (from === "enemy" && enemyHoldsFire(g)) {
    absorbCharger(w, max);
    return;
  }
  const auto = from === "enemy" || slotAutofire(g, w);
  if (!auto) {
    absorbCharger(w, max);
    if (w.target && (w.loaded ?? 0) > 0) launch(g, from, w);
    return;
  }
  // Missile (Weapons), Swarm Missiles: autofire "will fire a charge as soon as it is gained."
  // That charge is its own volley and spends one missile. A stored bank is not one volley.
  // INFERRED: one stored shot per tick. No target holds a single finished shot and does not bank.
  if (w.defId === "swarmmissiles") {
    if (!w.target) {
      if (w.charge >= 1) w.charge = 1;
      return;
    }
    const have = from === "player" ? g.missiles : ship.ammo;
    if (have <= 0) {
      // A dry magazine keeps the finished shots. It does not grow past the bank.
      if ((w.loaded ?? 0) < max) absorbCharger(w, max);
      else w.charge = 0;
      return;
    }
    if ((w.loaded ?? 0) > 0) {
      launch(g, from, w, 1);
      return;
    }
    if (w.charge >= 1) {
      w.charge -= 1;
      const before = g.shots.length;
      launch(g, from, w, 1);
      if (g.shots.length === before) w.charge += 1;
    }
    return;
  }
  // A bank already stored (autofire just turned on, or a cloak hold) leaves as one volley.
  if ((w.loaded ?? 0) > 0 && w.target) {
    if (from === "enemy" && !(def.ammo && ship.ammo <= 0)) w.target = enemyTarget(g, w);
    launch(g, from, w);
  }
  while (w.charge >= 1 && w.target) {
    if (from === "enemy" && !(def.ammo && ship.ammo <= 0)) w.target = enemyTarget(g, w);
    if (!w.target) break;
    w.charge -= 1;
    const before = g.shots.length;
    launch(g, from, w, 1);
    if (g.shots.length === before) break;
  }
  // No target: hold one finished shot in the bar. Do not start a bank.
  if (!w.target && w.charge >= 1) w.charge = 1;
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
  // "fully trained crew reduce charge time by 20% ... a Basic Laser improves from 10 seconds to 8 seconds."
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
  // Cloaking, "Overview": "Weapons and artillery systems stop charging and cannot target a cloaked ship.
  // However, if your crew or boarding drone or mind-controlled enemy crew is onboard the enemy ship,
  // you will be able to target and fire your charged weapons."
  const crewAboard =
    from === "player" &&
    g.crew.some(
      (c) =>
        c.hp > 0 &&
        c.aboard === "enemy" &&
        (c.side === "player" || (c.side === "enemy" && (c.leashed ?? 0) > 0)),
    );
  const drone = from === "player" ? g.player.kits.swarm : undefined;
  const ionAboard =
    !!drone?.on &&
    drone.target === "ionintruder" &&
    typeof drone.room === "string" &&
    drone.room.length > 0;
  // Cloaking, "Overview": fire only if the boarding drone "is onboard the enemy ship".
  // Same page: "Hacking and Boarding drones hold their position in space."
  // A powered Boarding Drone with no room is still in space.
  const boardAboard =
    !!drone?.on &&
    drone.target === "board" &&
    typeof drone.room === "string" &&
    drone.room.length > 0;
  const presence = crewAboard || ionAboard || boardAboard;
  ship.weapons.forEach((w, i) => {
    const def = WEAPONS[w.defId];
    if (!def) return;
    if (chargerCap(w.defId) != null) {
      tickCharger(g, ship, from, w, i, def, mask, frozen, mult, dt);
      return;
    }
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
    if (frozen) {
      // Charging stays stopped (no dt). A weapons hack still blocks the shot. Chargers already returned.
      if (
        from === "player" &&
        targetIsCloaked(g, from) &&
        !hackHoldsWeapons(g, from) &&
        presence &&
        w.charge >= 1 &&
        w.target
      ) {
        launch(g, from, w);
      }
      return;
    }
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
    // Boarding, "Doors": a hacked room's doors block that ship's crew and let boarders and mind-controlled crew through.
    // Hacking, "Overview": "locked for hostile crew, but friendly crew can pass through freely."
    const shipSide = c.aboard === "player" ? "player" : "enemy";
    const ownCrew = c.side === shipSide;
    const hacked = !!door && hackLocksDoor(g, ship, door);
    const hostile = (c.leashed ?? 0) <= 0 && (hacked ? ownCrew : !ownCrew);
    // Coat hits stay up through this tick after the 12 seconds hit 0, so the last punches still land.
    const coatShut = !!door && door.b !== "void" && !door.open && (door.coat ?? 0) > 0;
    const leaving = coated(ship, c.room) || coatShut;
    // Crystal Lockdown: a shut coated door is punched at the crew's one attack per second.
    // Airlocks are not coated. Entering a coated room is refused above, before this punch.
    if (leaving && door && !door.open && door.b !== "void") {
      const result = punchCoat(door, dt);
      if (result === "broke") log(g, "A door gives way.");
      if (result === "held") continue;
    } else if (leaving && door && !door.open) continue;
    if (door && !door.open && hostile && !leaving) {
      const level = hacked ? HACKED_DOOR_LEVEL : doorLevel(g, ship, c.aboard);
      // Door System, "Hits required to break a door": the table starts at level 2. Level 1 is remote doors.
      const max = blastHits(level, g.difficulty);
      if (door.hp <= 0) {
        door.hp = max;
        if (max > 0) doorArmedMax.set(door, max);
      } else if (max > 0) {
        const armed = doorArmedMax.get(door);
        if (armed == null) doorArmedMax.set(door, max);
        else if (armed !== max) {
          door.hp = scaleDoorLeft(door.hp, armed, max);
          doorArmedMax.set(door, max);
        }
      }
      door.hp -= dt;
      if (door.hp > 0) continue;
      door.open = true;
      // Door System: "When broken, a door remains stuck open for 7 seconds".
      door.stuck = 7;
      door.hp = 0;
      doorArmedMax.delete(door);
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

function armDoors(ship: Ship, level: number, difficulty: Difficulty = "normal") {
  const hits = blastHits(level, difficulty);
  for (const room of ship.rooms) if (room.lockHack) delete room.lockHack;
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
 * INFERRED: 12% per breach, and 40% of the difference through an open door. The Door System page does not give airflow rates.
 * Oxygen, Overview: an open airlock instantly drains the O2 in the room it is opened in, and quickly drains
 * connected rooms through opened doors. More airlocks drain farther rooms quicker. That drain surpasses
 * several Lanius and breaches. The page prints no percent for the connected-room drain.
 * INFERRED: the airlock room is set to 0 after the open-door share, so a neighbor cannot refill it this tick.
 * That share is what moves oxygen toward each emptied room. No extra percent is added. Holding another
 * airlock room at 0 is what reaches a farther room sooner.
 */
/**
 * Template:Crew races (comparison), "Repair speed" note, and Crew skills, Repair skill: "It takes 12.5 seconds
 * for an untrained Human to repair one system bar, or to repair a breach." Fix progress is crew-seconds scaled by each race's repair
 * multiplier, so a Human (×1) needs 12.5 and an Engi (×2) 6.25.
 */
export const REPAIR_SECONDS = 12.5;

/** Fire removed per second by one untrained Human: 1 (repair) × 1.2 (fire) × 1 (skill) × 8% = 0.096 of a fire. */
export const FIRE_FIGHT_SHARE = 0.096;

/**
 * One crew member's repair pace: race repair multiplier × repair skill.
 * Crew skills, lead: "Engi can finish repairs faster" and "Mantis complete the repairs slower."
 * Skills, "Repair skill": "Level 1 (Green) | 10%
 * faster repair", "Level 2 (Gold) | 20% faster repair" (wiki/skills.ts REPAIR_SKILL_MULT), and "Repair skill and racial
 * aptitude for repairs also apply to fire-fighting". Used for systems, kit rooms, breaches, and fires.
 */
export function repairPace(c: Crew): number {
  return kinOf(c.kin ?? "plain").repair * repairSkillMult(rankOf(c, "repair"));
}

/**
 * Fires, "Dealing with fires", and Venting: a fire begins to die out once oxygen drops below 10%.
 * "How long it takes for a fire or fires to die out is determined by a timer, ranging from 5 to 14 seconds."
 * "The timer is affected by the number of adjacent fires ... and is governed by the formula: (5 - <number of adjacent fires>) * 0.48."
 * No adjacent fires burn out from 2.08s (5 / 2.4) to 5.83s (14 / 2.4). Four adjacent fires reach 29.17s (14 / 0.48).
 * INFERRED: the 5–14 timer is a whole number of seconds, inclusive, rolled once when oxygen first falls below 10%.
 * INFERRED: progress advances by (5 - n) * 0.48 each second, so a later change in n changes the remaining time.
 * INFERRED: n is clamped to 0..4. The page's worked maximum is 4, and a larger n would make the divisor 0 or negative.
 * INFERRED: n counts other whole fires in this room, plus whole fires in rooms that share a door. Per-tile fires are not stored.
 * INFERRED: a room with any fire counts as at least one. Oxygen back at 10% or more cancels the timer.
 */
type FireStarve = { budget: number; progress: number };
const fireStarve = new WeakMap<Room, FireStarve>();

export function fireStarveSeconds(timer: number, adjacent: number): number {
  const n = Math.max(0, Math.min(4, Math.floor(adjacent)));
  return timer / ((5 - n) * 0.48);
}

function wholeFires(fire: number): number {
  if (!(fire > 0)) return 0;
  return Math.max(1, Math.floor(fire));
}

/** Door-connected fires around this room, not counting one fire of its own. See starveFire. */
export function adjacentFires(ship: Ship, room: Room): number {
  let n = Math.max(0, wholeFires(room.fire) - 1);
  const seen = new Set<string>();
  for (const d of ship.doors) {
    if (d.b === "void") continue;
    const other = d.a === room.id ? d.b : d.b === room.id ? d.a : "";
    if (!other || seen.has(other)) continue;
    seen.add(other);
    const next = roomById(ship, other);
    if (next) n += wholeFires(next.fire);
  }
  return n;
}

function starveFire(g: Game, ship: Ship, room: Room, dt: number) {
  if (!(room.fire > 0) || room.o2 >= 10) {
    fireStarve.delete(room);
    return;
  }
  let state = fireStarve.get(room);
  if (!state) {
    state = { budget: 5 + Math.floor(rand(g) * 10), progress: 0 };
    fireStarve.set(room, state);
  }
  const n = Math.min(4, adjacentFires(ship, room));
  state.progress += (5 - n) * 0.48 * dt;
  if (state.progress >= state.budget) {
    room.fire = 0;
    fireStarve.delete(room);
  }
}

function airflow(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  let o2 = mainBars(g, ship, aboard, "oxygen");
  // Slug hacker (choice): "Oxygen system halved" and "rounds down against you".
  if (aboard === "player" && systemHalf.get(g)?.has("oxygen")) o2 = Math.floor(o2 / 2);
  // Slug hacker (oxygen): "Oxygen system offline". Production is none, so the unpowered drain below applies.
  if (oxygenOff(g, aboard)) o2 = 0;
  const mult = o2 <= 0 ? 0 : o2 === 1 ? 1 : o2 === 2 ? 4 : 7;
  for (const r of ship.rooms) {
    if (o2 > 0) r.o2 += 1.2 * mult * dt;
    else r.o2 -= 1.2 * dt;
    r.o2 -= 12 * r.breach * dt;
    // Fires: "Fires also consume oxygen (0.96% per second for each fire in a room)".
    r.o2 -= 0.96 * r.fire * dt;
  }
  const vented: Room[] = [];
  for (const d of ship.doors) {
    if (!d.open) continue;
    if (d.b === "void") {
      const r = roomById(ship, d.a);
      // Oxygen, Overview: "an airlock instantly drains the O2 in the room it is opened in".
      if (r) vented.push(r);
    } else {
      const a = roomById(ship, d.a);
      const b = roomById(ship, d.b);
      if (!a || !b) continue;
      const flow = (a.o2 - b.o2) * 0.4 * dt;
      a.o2 -= flow;
      b.o2 += flow;
    }
  }
  for (const r of vented) r.o2 = 0;
  for (const r of ship.rooms) {
    r.o2 = Math.max(0, Math.min(100, r.o2));
    starveFire(g, ship, r, dt);
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
 * Crew skills, Repair skill: Rocks have a hidden 1.67 multiplier, and Crystals a 0.83 multiplier.
 * "Repair skill and racial aptitude for repairs also apply to fire-fighting." Repair skill applies (repairPace).
 * Fire Suppression is not scaled.
 * Fires, lead: "2.128 damage per second for each fire in a room" to non-immune crew. The damage uses the fire left
 * after this moment's extinguishing. kin.fireTaken is 0 for a fire-immune lineage.
 */
function fightFire(r: Room, pals: Crew[], dt: number) {
  // Crew skills, lead: "putting out fires" does not grant experience. No bumpXp on this path.
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
 * The Flagship AI uses this same 37.5 s pace in flagship-systems.ts and is not this function.
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
      // Crew skills, lead: "Mantis can kill faster" and "Engi are slow killers." kin.fight is that rate.
      const dealt = (attacker: Crew) => combatSkillMult(rankOf(attacker, "combat"));
      for (const c of foes) {
        const before = c.hp;
        const hit = pals.reduce(
          (sum, p) => sum + (dps / foes.length) * dt * leashMult(p) * kinOf(p.kin ?? "plain").fight * dealt(p),
          0,
        );
        c.hp -= hit;
        // Crew skills, Combat: "one point of experience for dealing the killing blow to hostile crew".
        // "killing cloned crew or destroying onboard drones doesn't grant experience."
        // Drones are not in this crew loop, so breaking one grants nothing.
        // INFERRED: every attacker still striking on that tick counts as the blow. The page names one final hit,
        // and this sim has no per-crew swing order.
        if (before > 0 && c.hp <= 0 && !c.cloned) for (const p of pals) noteCombatPoint(g, p);
      }
      for (const c of pals) {
        const before = c.hp;
        const incoming = foes.reduce(
          (sum, f) => sum + (dps / pals.length) * dt * leashMult(f) * kinOf(f.kin ?? "plain").fight * dealt(f),
          0,
        );
        c.hp -= incoming;
        if (before > 0 && c.hp <= 0 && !c.cloned) for (const f of foes) noteCombatPoint(g, f);
      }
    } else if (r.fire > 0 && pals.length) {
      fightFire(r, pals, dt);
    } else if (pals.length && r.breach > 0 && r.system && (gun ?? ship.systems[r.system]).damage <= 0) {
      // Crew skills, Repair skill: "or to repair a breach" takes the same 12.5 seconds as one system bar. Skill speeds both.
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
      if (kit.fix >= REPAIR_SECONDS) {
        kit.damage = Math.max(0, (kit.damage ?? 0) - 1);
        kit.fix = 0;
        if (ship === g.enemy) kit.power = kit.level - kit.damage;
        // Crew skills, Repair skill: "one point of experience for completing the repairs of one system or
        // subsystem level", "granted to the crew who performs the finishing repair animation." A partial bar grants none.
        // INFERRED: each crew still in the room on that tick receives the point. The page names one finisher and
        // tells helpers to leave, and it does not say the others get nothing if they stay.
        for (const c of pals) bumpXp(g, c, "repair", 1);
        log(g, `${r.title} repaired.`);
      }
    } else if (pals.length && r.system && (gun ?? ship.systems[r.system]).damage > 0 && r.o2 > 5) {
      // @agent:flagship. Artillery rooms repair their own gun ("the Flagship crew can contest your boarding and repair
      // damage to those weapons"); every other room its system.
      const sys = gun ?? ship.systems[r.system];
      // @agent:hacking. Hacking, "Overview": "Repair speed of the system is halved" under a hacking drone (spike.ts).
      sys.fix += pals.reduce((sum, c) => sum + repairPace(c), 0) * dt * hackRepairScale(g, ship, r.system);
      if (sys.fix >= REPAIR_SECONDS) {
        sys.damage = Math.max(0, sys.damage - 1);
        sys.fix = 0;
        // Same one point as a kit bar, including a subsystem (pilot, sensors, doors) on this room.
        for (const c of pals) bumpXp(g, c, "repair", 1);
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
    // Slug hacker (medical): "Medbay / Clone Bay offline". The enemy medbay still heals.
    if (
      mainBars(g, ship, aboard, "medbay") > 0 &&
      r.system === "medbay" &&
      r.fire <= 0 &&
      foes.length === 0 &&
      !(aboard === "player" && playerMedicalOff(g))
    ) {
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
  const cap = shieldCap(g, ship, aboard);
  if (ship.shieldNow > cap) ship.shieldNow = cap;
  // @agent:hacking. Hacking, "Overview" (Shields): no recharge while an enemy pulse discharges them (extras/spike.ts).
  if (ship.shieldNow < cap && mainBars(g, ship, aboard, "shields") >= 2 && !hackHoldsShields(g, ship)) {
    const op = manningCrew(g, ship, aboard, "shields");
    // Crew skills, Shields skill: recharge rate ×1.1 / ×1.2 / ×1.3. An undamaged auto-ship keeps the untrained ×1.1.
    // "with fully trained crew, recharge time is divided by 1.3 -- so a 2 seconds recharge is reduced to 1.54 seconds."
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
  if (!ship.kits) return;
  for (const id of ACTIVATION_ION) {
    const kit = ship.kits[id as KitId];
    if (!kit?.ion?.length) continue;
    const left = kit.ion.map((t) => t - dt).filter((t) => t > 0.05);
    if (left.length) kit.ion = left;
    else delete kit.ion;
  }
}

// Asteroid breach stays 0.05 and fire stays 0. The interval is cited-asteroid.ts. Those seconds are INFERRED.
// Environmental Hazards, ==Anti-Ship Battery (ASB)==: a warning 15--20 seconds after the battle starts,
// then the real shot 5--10 seconds later. The cycle repeats until escape.
// INFERRED: each span is uniform. rand() is [0, 1), so the printed top is not its own bucket.
// Cosmetic fake projectiles have no count on the page, so they are not drawn.
function armAsbClock(g: Game, phase: "warn" | "shot") {
  g.asbPhase = phase;
  g.asbT = 0;
  g.asbWait = phase === "warn" ? 15 + rand(g) * 5 : 5 + rand(g) * 5;
}

function armPulsar(g: Game) {
  g.pulsarT = 0;
  g.pulsarWarned = false;
  g.pulsarWait = pulsarCycleSeconds(rand(g));
}

/**
 * Environmental Hazards, Pulsar: main systems use 1 + 0.5(power), rounded down.
 * Power includes a Zoltan bar. Subsystems use their level. Door System, Manning:
 * a body counts as one level higher, so a level-2 door with a body is the page's
 * "level 3 doors ... take 3". Pilot and sensors have no printed manning level.
 */
export function pulsarSystemIon(g: Game, ship: Ship, aboard: "player" | "enemy", id: SysId): number {
  const sys = ship.systems[id];
  if (sys.level <= 0) return 0;
  if (!isMain(id)) {
    if (id === "doors") return doorLevel(g, ship, aboard);
    return Math.max(0, sys.level - sys.damage);
  }
  return pulsarMainIon(bars(sys, zoltanBars(g.crew, ship, aboard, id)));
}

function pulsarShieldsPowered(g: Game, ship: Ship, aboard: "player" | "enemy"): boolean {
  return bars(ship.systems.shields, zoltanBars(g.crew, ship, aboard, "shields")) > 0;
}

/** One pulsar pulse against both hulls. Zoltan Shield, lead, and Environmental Hazards, Pulsar. */
export function applyPulsarPulse(g: Game) {
  hitPulsar(g, g.player, "player");
  if (g.enemy) hitPulsar(g, g.enemy, "enemy");
}

function hitPulsar(g: Game, ship: Ship, aboard: "player" | "enemy") {
  const installed = ship.systems.shields.level > 0;
  const bubble = ship.zoltan ?? 0;
  // Environmental Hazards, Pulsar: Reverse Ion Field acts against the entire pulse.
  // Two or zero systems are ionized, never one. A resisted pulse does not spend the Zoltan Shield.
  // Player augments only. The enemy has no augment list.
  if (aboard === "player" && negateIon(g)) {
    log(g, "Reverse Ion Field shrugged that off.");
    return;
  }
  // Zoltan Shield, lead: one layer blocks the pulse. A ship with no Shields system ignores the bubble.
  if (installed && bubble > 0) {
    const spend = pulsarShieldSpend(rand(g));
    ship.zoltan = Math.max(0, bubble - spend);
    log(
      g,
      aboard === "player"
        ? `The pulsar drains the Zoltan Shield to ${ship.zoltan}.`
        : `The pulsar drains their Zoltan Shield to ${ship.zoltan}.`,
    );
    return;
  }
  // Environmental Hazards, Pulsar: subsystems take ion according to their level.
  // Backup Battery, Overview: a pulsar is one way that subsystem gets ionized.
  // INFERRED: damage lowers the figure the same way an un-manned subsystem does.
  const pool: PulsarPick[] = ALL_SYS.map((id) => ({
    id,
    points: pulsarSystemIon(g, ship, aboard, id),
    powered: id === "shields" && pulsarShieldsPowered(g, ship, aboard),
  }));
  const cell = ship.kits.cell;
  if (cell && cell.level > 0) {
    const points = Math.max(0, cell.level - (cell.damage ?? 0));
    if (points > 0) pool.push({ id: "cell", points, powered: false });
  }
  const picks = pickPulsarTargets(pool, () => rand(g));
  if (picks.length === 0) return;
  const bonus = zoltanBars(g.crew, ship, aboard, "shields");
  for (const hit of picks) {
    if (hit.id === "cell") {
      if (cell) ionOnCell(g, cell, hit.points);
      continue;
    }
    applyIon(ship, hit.id, hit.points, bonus);
  }
  const names = picks
    .map((hit) => {
      if (hit.id === "cell") return ship.rooms.find((r) => r.kit === "cell")?.title ?? "Backup Battery";
      return roomWith(ship, hit.id)?.title ?? hit.id;
    })
    .join(" and ");
  log(g, aboard === "player" ? `The pulsar ionizes ${names}.` : `The pulsar ionizes their ${names}.`);
}

function tickPulsar(g: Game, dt: number) {
  if (!g.pulsar) return;
  if (!((g.pulsarWait ?? 0) > 0)) armPulsar(g);
  g.pulsarT = (g.pulsarT ?? 0) + dt;
  const wait = g.pulsarWait ?? 0;
  if (!g.pulsarWarned && g.pulsarT >= wait - PULSAR_WARN_S) {
    g.pulsarWarned = true;
    // Environmental Hazards, Pulsar: the danger line is the warning.
    log(g, "Periodic waves of electromagnetic energy will disrupt your systems.");
    sfx(g, "alarm");
  }
  if (g.pulsarT >= wait) {
    applyPulsarPulse(g);
    armPulsar(g);
  }
}

function armFlare(g: Game) {
  g.flareT = 0;
  g.flareWarned = false;
  g.flareWait = flareCycleSeconds(rand(g));
}

function flareShieldsUp(ship: Ship): boolean {
  // Environmental Hazards, Class-M Red Giant Star: a Zoltan Shield counts as shields up.
  // Extra layers do not change the fire count, and the page does not spend the bubble.
  return ship.shieldNow > 0 || (ship.zoltan ?? 0) > 0;
}

function flareHull(g: Game, ship: Ship, playerHurt: boolean) {
  const held = playerHurt && negateHull(g);
  const before = ship.hull;
  if (!held) ship.hull = Math.max(0, ship.hull - 1);
  else log(g, "Rock Plating held the hull.");
  if (playerHurt && ship.hull < before && g.augments.includes("vengeance") && vengeanceFires(rand(g))) looseShard(g);
}

function flareOne(g: Game, ship: Ship, aboard: "player" | "enemy") {
  const count = flareFireCount(flareShieldsUp(ship), rand(g));
  const placed = placeFlareFires(count, ship.rooms.length, () => rand(g));
  let rooms = 0;
  for (let i = 0; i < ship.rooms.length; i++) {
    const n = placed[i] ?? 0;
    if (n <= 0) continue;
    const room = ship.rooms[i];
    if (!room) continue;
    rooms += 1;
    // INFERRED: fires still stack to the same cap of 3 used for weapon hits.
    room.fire = Math.min(3, room.fire + n);
    if (!flareDamagesRoom(n, rand(g))) continue;
    const playerHurt = aboard === "player";
    if ((room.system || room.kit) && playerHurt && negateSystem(g)) {
      log(g, "Titanium System Casing held the system.");
    } else {
      if (room.system) hurtSystem(ship, room.system, 1, zoltanBars(g.crew, ship, aboard, "shields"));
      if (room.kit) hurtKit(ship, room.kit, 1);
    }
    // The page names hull and system damage. It does not name crew damage.
    flareHull(g, ship, playerHurt);
  }
  if (rooms > 0) {
    log(
      g,
      aboard === "player"
        ? `A solar flare lights ${rooms} rooms. Hull ${ship.hull}.`
        : `A solar flare lights ${rooms} of their rooms.`,
    );
  }
}

/** One solar flare against both hulls. Environmental Hazards, Class-M Red Giant Star. */
export function applyFlarePulse(g: Game) {
  flareOne(g, g.player, "player");
  if (g.enemy) flareOne(g, g.enemy, "enemy");
}

function tickFlare(g: Game, dt: number) {
  if (!g.flare) return;
  if (!((g.flareWait ?? 0) > 0)) armFlare(g);
  g.flareT = (g.flareT ?? 0) + dt;
  const wait = g.flareWait ?? 0;
  if (!g.flareWarned && g.flareT >= wait - FLARE_WARN_S) {
    g.flareWarned = true;
    // Environmental Hazards, Class-M Red Giant Star: the danger line is the warning.
    log(g, "Solar flares will light the ship on fire. Shields will reduce the effect.");
    sfx(g, "alarm");
  }
  if (g.flareT >= wait) {
    applyFlarePulse(g);
    armFlare(g);
  }
}

function tickLingeringAsteroids(g: Game, dt: number) {
  // Shields, Overview: the bubble still restores. The hazard page does not stop that after the fight.
  shieldRegen(g, g.player, "player", dt);
  environment(g, dt);
  if (g.shots.length) stepShots(g, dt);
  if (g.player.hull <= 0) lose(g, "hull");
}

function armAsteroid(g: Game) {
  g.asteroidT = 0;
  // Environmental Hazards, Asteroid Field: the wait follows this ship's shield system level.
  // Ion or an empty power bar does not change that level, so a downed shield does not slow the rocks.
  g.asteroidWait = asteroidIntervalSeconds(g.player.systems.shields.level, rand(g));
}

function environment(g: Game, dt: number) {
  if (g.asteroid) {
    if (!(g.asteroidWait > 0)) armAsteroid(g);
    g.asteroidT += dt;
    if (g.asteroidT >= (g.asteroidWait ?? 0)) {
      // Environmental Hazards, Asteroid Field: the rock strikes this ship, and the enemy ship the same way.
      // The 0.05 breach and no fire are the existing roll. This sentence does not print a new one.
      const rock = (ship: Ship, at: "player" | "enemy") => {
        g.shots.push({
          id: uid(g),
          kind: "laser",
          from: "env",
          at,
          damage: 1,
          ion: 0,
          fireChance: 0,
          breachChance: 0.05,
          targetRoom: pick(g, ship.rooms).id,
          wait: 0.2,
          t: 0,
          duration: 0.8,
          label: "Rock",
        });
      };
      rock(g.player, "player");
      if (g.enemy) rock(g.enemy, "enemy");
      log(g, "Asteroid inbound.");
      armAsteroid(g);
    }
  }
  if (g.asb) {
    // A save from before the phase clock has no wait. Arming here still rolls only while the battery is on.
    if (!(g.asbWait > 0)) armAsbClock(g, "warn");
    g.asbT += dt;
    if (g.asbT >= g.asbWait) {
      if (g.asbPhase !== "shot") {
        // INFERRED: the page prints these two lines beside the hazard art. Which one is the
        // 15--20s warning is not stated. A hull already on the scope uses the fleet line.
        // Lanius fight with friendly ASB support: the ally line is INFERRED. The event does not print it.
        log(
          g,
          friendlyAsb.has(g)
            ? "The planetary battery is aiming at the other ship."
            : g.enemy
              ? "The Fleet's Anti-Ship Batteries are targeting you."
              : "Planet-side anti-ship batteries are detected in this system.",
        );
        sfx(g, "alarm");
        armAsbClock(g, "shot");
      } else {
        const asb = citedAsbShot();
        // Lanius fight with friendly ASB support: the same shot hits the other ship.
        const helping = friendlyAsb.has(g) && !!g.enemy;
        const hull = helping ? g.enemy : g.player;
        if (hull) {
          g.shots.push({
            id: uid(g),
            kind: "missile",
            from: "env",
            damage: asb.damage,
            ion: 0,
            fireChance: asb.fireChance,
            breachChance: asb.breachChance,
            // Environmental Hazards, Anti-Ship Batteries: "hitting a random room" (wiki/targeting.ts).
            targetRoom: randomRoom(g, hull),
            ...(helping ? { at: "enemy" as const } : {}),
            wait: 0.15,
            t: 0,
            duration: 1.1,
            label: "Artillery",
          });
        }
        log(g, "Line artillery.");
        sfx(g, "alarm");
        armAsbClock(g, "warn");
      }
    }
  }
  tickPulsar(g, dt);
  tickFlare(g, dt);
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
    // "No damage to allies, if the exploding Zoltan was mind-controlled."
    // The holder's crew are those allies. The page does not name the Zoltan's own crew as a new target.
    // Wiki page "Zoltans", section "Race characteristics": a drone in that room loses 7.5 HP.
    if (c.kin === "spark") {
      const leashed = (c.leashed ?? 0) > 0;
      for (const other of g.crew) {
        if (other.hp <= 0 || other.id === c.id) continue;
        if (other.room !== c.room || other.aboard !== c.aboard) continue;
        if (other.side === c.side) continue;
        if (leashed && sideOf(other) === sideOf(c)) continue;
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
  // Pirate engine hacker: the system is restored once that ship is destroyed or disabled.
  clearEngineLimit(g);
  // Auto-ship carrying shield virus: the half is only for that fight.
  clearShieldHalf(g);
  clearSystemOff(g);
  clearFriendlyAsb(g);
  const boss = g.beacons.find((b) => b.id === g.here)?.kind === "boss";
  // @agent:quests. {{Winning|deadCrew=true}}: the fight ended with their crew dead, not their hull (read before clean-up).
  const deadCrew = !!g.enemy && g.enemy.hull > 0 && !g.crew.some((c) => c.side === "enemy" && c.hp > 0);
  g.kills += 1;
  // Mind Control: an enemy hold ends with the fight.
  clearEnemyLeash(g);
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemy = null;
  g.shots = [];
  // Environmental Hazards, Asteroid Field: the rocks keep coming after the battle. A jump leaves the beacon.
  g.asb = false;
  g.pulsar = false;
  g.flare = false;
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
  armDoors(ship, doorLevel(g, ship, "enemy"), g.difficulty);
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
    // Traced interiors pass the orange bars. The two picture-less classes leave marks unset.
    doors: addDoors(rooms, spec.marks),
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
  if (spec.marks) ship.doorMarks = spec.marks;
  // @agent:drones. Hidden drone loadout. extras/swarm.ts deploys it on the first combat tick.
  if (ship.kits.swarm && spec.drones?.length) ship.kits.swarm.loadout = [...spec.drones];
  const crew = spec.crew.map((c) => enemyCrew(g, c.kin, c.race, c.room));
  citedEnemy(g, tier, ship, crew);
  return { ship, crew };
}

export function startCombat(g: Game, tier: string, asteroid = false, event?: string) {
  // A later fight does not keep the pirate's engine cap. The choice sets it again after this returns.
  clearEngineLimit(g);
  // A later fight does not keep the shield-virus half. The choice sets it again after this returns.
  clearShieldHalf(g);
  clearSystemOff(g);
  clearFriendlyAsb(g);
  // Mind Control, Overview: a bomb that lands opens that room. INFERRED: the next fight starts with those rooms closed.
  clearBombSight(g);
  const built = makeEnemy(g, tier, event);
  // Enemy Ships, "Surrenders and escape attempts": who runs, when, and for how long. See wiki/escape.ts.
  g.enemyEscape = escapePlan(
    { tier, event, lastFuel: g.fuel <= 0, faction: built.ship.faction, pirate: built.ship.pirate },
    () => rand(g),
  );
  const arrived = hereBeacon(g);
  // Environmental Hazards, Anti-Ship Battery: last fuel into an overtaken nebula or its exit. The Elite runs at 90s.
  // dive:1 is the jump into the fleet. A waiting dive is dive:4 and is not this sentence.
  if (
    g.pending === "dive:1" &&
    g.fuel <= 0 &&
    arrived &&
    arrived.col < g.fleet &&
    (arrived.kind === "nebula" || arrived.kind === "exit")
  ) {
    g.enemyEscape = overtakenArrivalEscape();
  }
  // @agent:surrender. Enemy Ships: "Enemies may also surrender after dropping below a hull threshold." wiki/surrender.ts.
  g.enemySurrender = surrenderPlan({ tier, event, faction: built.ship.faction, pirate: built.ship.pirate }, () => rand(g));
  // @agent:quests. The page that started this fight, for its own win reward (wiki/quests.ts pageWin).
  g.fightEvent = event ?? null;
  // Boarders: Humans (Abandoned): the last fight's faction. INFERRED: kept until the next fight.
  g.lastFaction = built.ship.faction;
  g.stalemate = null;
  g.enemy = built.ship;
  if (g.player.storm) {
    g.enemy.storm = true;
    shedOverAssigned(g, g.enemy, "enemy");
  }
  g.crew = g.crew.filter((c) => c.side === "player");
  // Mind Control: no hold from an earlier fight (fled or jumped away) carries into this one.
  clearEnemyLeash(g);
  g.crew.push(...built.crew);
  for (const w of g.player.weapons) {
    w.charge = 0;
    w.target = null;
    w.beamLine = null;
  }
  g.beamAnchor = null;
  g.targeting = false;
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
  // Environmental Hazards, Asteroid Field: the first gap is the same random, shield-scaled interval.
  // INFERRED: boarders at 9s. First surge wait is 12s; "Power Surge" says 20–30s.
  g.asteroidT = 0;
  g.asteroidWait = 0;
  if (g.asteroid) armAsteroid(g);
  const here = g.beacons.find((b) => b.id === g.here);
  // Rebel Fleet: not on a nebula beacon, and never on an Easy exit. Overtaken column is the existing test.
  // Environmental Hazards: the warning roll happens only when the battery is actually armed.
  g.asb = citedAsb(g, here);
  g.asbPhase = "warn";
  g.asbT = 0;
  g.asbWait = 0;
  if (g.asb) armAsbClock(g, "warn");
  // Pirate / Rebel / Lanius fight near pulsar: Locations pulsar=true. Other fights stay quiet.
  g.pulsar = eventHasPulsar(event);
  g.pulsarT = 0;
  g.pulsarWarned = false;
  g.pulsarWait = 0;
  if (g.pulsar) armPulsar(g);
  // Auto-ship / Mantis / Pirate / Rock pirates fight near sun: Locations redgiant=true.
  g.flare = eventHasFlare(event);
  g.flareT = 0;
  g.flareWarned = false;
  g.flareWait = 0;
  if (g.flare) armFlare(g);
  // INFERRED: a hull with a Crew Teleporter boards 9 seconds in.
  g.boardTimer = built.ship.boards ? 9 : 0;
  // @agent:flagship. A resumed boss fight starts at the remembered stage, with a fresh 20–30 s surge wait.
  const bossStage = built.ship.flagship?.stage ?? 1;
  g.bossSurge = tier === "boss" ? (bossStage > 1 ? (rollSurge(bossStage, rand(g)) ?? 25) : 12) : 0;
  g.ramStage = tier === "boss" ? bossStage : g.ramStage;
  g.tutorial = g.kills === 0 && g.sector === 1;
  g.time = 0;
  if (g.armed == null) g.armed = g.player.weapons.find((w) => w.enabled)?.uid ?? null;
  armDoors(g.player, doorLevel(g, g.player, "player"), g.difficulty);
  armDoors(built.ship, doorLevel(g, built.ship, "enemy"), g.difficulty);
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
 * `asb` is Abandoned station's planet-side battery. Environmental Hazards: warning 15–20s after the
 * fight starts, then the real shot 5–10s later. The roll happens only when that battery is on.
 * `flare` is a Locations redgiant=true with no ship (Boarders: Humans near sun). The clock is armFlare.
 * INFERRED: the beacon is spent when they board, so the card does not reopen. Killing them is not a ship kill.
 * INVENTED: the log line when the last boarder dies (tickBoarding).
 */
export function beginBoarding(g: Game, asb = false, flare = false) {
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
  g.asbPhase = "warn";
  g.asbT = 0;
  g.asbWait = 0;
  if (asb) armAsbClock(g, "warn");
  g.pulsar = false;
  g.flare = false;
  // Boarders: Humans near sun: redgiant=true, LRSmap=noship+redgiant. No new flare numbers.
  if (flare) {
    g.flare = true;
    armFlare(g);
  }
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

type SectorColour = "civilian" | "hostile" | "nebula";

// Sectors lead, before the colour-coding paragraph: 48% green, 32% red, 20% purple.
// INFERRED: green is the Civilian group, red is Hostile, and purple is Nebula.
// The page names those three groups and those three colours and does not print the pairing.
function sectorColour(unit: number): SectorColour {
  if (unit < 0.48) return "civilian";
  if (unit < 0.48 + 0.32) return "hostile";
  return "nebula";
}

// INFERRED: if the rolled colour has no eligible sector, pick uniformly from the remaining eligible names.
// The page does not say what happens then.
function colourBag<T extends { group: string }>(pool: readonly T[], colour: SectorColour): readonly T[] {
  const bag = pool.filter((entry) => entry.group === colour);
  return bag.length > 0 ? bag : pool;
}

/**
 * Sectors lead: colour first, then a uniform sector of that colour.
 * One extra rand(g) versus a single irand over the whole list. The index is irand(g, bag.length).
 */
function colouredName(g: Game, names: readonly string[]): string {
  const colour = sectorColour(rand(g));
  const pool = names.map((name) => ({
    name,
    group: SECTOR_TYPES.find((sector) => sector.name === name)?.group ?? "",
  }));
  const choices = colourBag(pool, colour);
  return choices[irand(g, choices.length)].name;
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
    // INVENTED: independent mixSeed salts. The page does not print a seed formula.
    // Colour and index stay on the seed, and this chart does not touch the game RNG.
    const take = (slot: number, skip?: string) => {
      // The other node in this column is already chosen. A repeatable sector stays eligible later, not twice here.
      const pool = poolFor(sector).filter((s) => s.id !== skip);
      const colourSalt = sector * 4 + slot * 2;
      const colour = sectorColour(mixSeed(seed, colourSalt) / 4294967296);
      const choices = colourBag(pool, colour);
      return choices[mixSeed(seed, colourSalt + 1) % choices.length];
    };
    const a = take(0);
    if (ONCE_SECTOR.has(a.id)) used.add(a.id);
    const b = take(1, a.id);
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
    beamAnchor: null,
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
    asteroidWait: 0,
    asbT: 0,
    asbPhase: "warn",
    asbWait: 0,
    pulsar: false,
    pulsarT: 0,
    pulsarWait: 0,
    pulsarWarned: false,
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
  // INFERRED: jumping away restores the engines. The page prints the restore on a win.
  clearEngineLimit(g);
  // INFERRED: jumping away ends the shield-virus half. The page only prints the half for that fight.
  clearShieldHalf(g);
  clearSystemOff(g);
  clearFriendlyAsb(g);
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
  g.pulsar = false;
  g.flare = false;
  armDoors(g.player, doorLevel(g, g.player, "player"), g.difficulty);
  // Environmental Hazards: an overtaken nebula beacon carries an ion storm into the fight or the event.
  // The departing enemy is already gone, so only this hull sheds here. startCombat halves the new one.
  syncIonStorm(g);
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
      // Sectors, Hidden Crystal Worlds: a restart from that sector does not open the Sector Map.
      if (g.crystalRestart && g.sector === 1) {
        g.crystalRestart = false;
        blindSectorTwo(g);
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
              // Pirate engine hacker: "Engines limited to level 1." After startCombat, which clears the cap.
              const cap = citedEngineCap(id);
              if (cap != null) limitPlayerEngines(g, cap);
              // Auto-ship carrying shield virus: "your Shields halved". After startCombat, which clears the half.
              if (citedShieldHalf(id)) halvePlayerShields(g);
              // Slug hacker (choice): Shields, Oxygen, or Weapon Control, each halved. After startCombat clears it.
              const halves = citedSystemHalf(id);
              if (halves) halvePlayerSystems(g, halves);
              // Slug hacker (doors): "Door System offline". After startCombat, which clears it.
              // Slug hacker (oxygen): "Oxygen system offline".
              const offline = citedSystemOff(id);
              if (offline?.includes("doors")) shutPlayerDoors(g);
              if (offline?.includes("oxygen")) shutPlayerOxygen(g);
              // Slug hacker (medical): "Medbay / Clone Bay offline". The two slug boarders spawn in citedChoose after this fight.
              if (offline?.includes("medbay")) shutPlayerMedical(g);
              // Lanius fight with friendly ASB support: "Anti-Ship Battery on your side."
              if (citedFriendlyAsb(id)) aidPlayerAsb(g);
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
  clearEngineLimit(g);
  // INFERRED: leaving for the Hidden Crystal Worlds ends the shield-virus half.
  clearShieldHalf(g);
  clearSystemOff(g);
  clearFriendlyAsb(g);
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
  g.pulsar = false;
  g.flare = false;
  armDoors(g.player, doorLevel(g, g.player, "player"), g.difficulty);
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
 * Sectors, Hidden Crystal Worlds: "Bug: restarting the game while staying in the Crystal sector will start
 * the game in a Civilian sector without option to open the Sector Map at the exit beacon when pressing the
 * "Next Sector" button on the Beacon Map, thus preventing the choice of a sector to jump to: the next sector
 * 2 is chosen randomly by the game."
 * A restart that is not in that sector leaves the new run alone.
 */
export function dropCrystalRestart(prev: Game, next: Game): void {
  if (prev.sectorName !== "Hidden Crystal Worlds") return;
  next.sectorName = "Civilian Sector";
  // INFERRED: the starting-sector beacons are cleared so this map is the Civilian sector's list. The page does not say to keep both.
  for (const b of next.beacons) {
    if (b.kind === "start" || b.kind === "exit" || b.kind === "boss") continue;
    b.flag = "";
    b.quest = undefined;
    b.kind = "empty";
    b.resolved = false;
    b.visited = false;
  }
  next.crystalRestart = true;
  stampCitedEvents(next);
}

/**
 * Sectors, Hidden Crystal Worlds. The verdict RESTART and the next hangar start both call this
 * with the run the player was playing.
 */
export function restartRun(
  prev: Game,
  seed: number,
  hullId?: string,
  difficulty: Difficulty = "normal",
  picks: CrewPick[] = [],
): Game {
  const next = createGame(seed || 1, hullId, difficulty, picks);
  dropCrystalRestart(prev, next);
  return next;
}

/**
 * The title screen is a placeholder. The run the player was playing stays for restartRun.
 * A screen that is already the title is not that run.
 * INVENTED: the page names no remembered run. The title placeholder is not the crystal sector.
 */
export function titleHandoff(playedRun: Game): { played: Game | null; title: Game } {
  const title = createGame(1);
  title.phase = "title";
  return { played: playedRun.phase === "title" ? null : playedRun, title };
}

/**
 * Sectors, Hidden Crystal Worlds: sector 2 is chosen randomly, and the Sector Map does not open.
 * INFERRED: an empty pool, which this sector number does not have, stays a Civilian sector.
 * INFERRED: the route marker moves to a same-name node in the arrived column, else the first node there. The page does not say where it sits.
 */
function blindSectorTwo(g: Game) {
  const pool = sectorPool(g, g.sector + 1);
  // One extra rand(g): the colour, then irand(g, bag.length) on that colour's bag.
  nextSector(g, pool.length ? colouredName(g, pool) : "Civilian Sector");
  const col = g.sector <= 1 ? 0 : g.sector - 1;
  const nodes = (g.route ?? []).filter((n) => n.col === col);
  const match = nodes.find((n) => n.name === g.sectorName) ?? nodes[0];
  if (match) g.routeHere = match.id;
}

/**
 * Ancient device, Notes: the exit does not open the chart. The next sector is a random one after the Rock
 * Homeworlds number, and it may not be a sector connected to the Rock Homeworlds. Sector 8 stays The Last Stand.
 */
function leaveHiddenCrystal(g: Game) {
  if (g.sector >= 7) nextSector(g, "The Last Stand");
  else {
    const pool = sectorPool(g, g.sector + 1);
    // One extra rand(g): the colour, then irand(g, bag.length) on that colour's bag.
    nextSector(g, pool.length ? colouredName(g, pool) : "Civilian Sector");
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
  const wasPast = !!b && b.col < g.fleet;
  if ((g.buoyDelay ?? 0) > 0) g.buoyDelay -= 1;
  else g.fleet += pursuit(g, b ? citedFleetAdvance(g, b) : 1);
  // Environmental Hazards, Anti-Ship Battery: waiting out of fuel when the fleet overtakes a nebula removes that environment.
  // A fueled wait keeps the ion storm. A jump is a different path and does not clear it.
  if (b && !wasPast && b.col < g.fleet && g.fuel <= 0 && b.kind === "nebula") b.cleared = true;
  syncIonStorm(g);
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
  // Ship, Reactor power: the upgrade menu is available when the ship is not IN DANGER.
  // Environmental Hazards: a solar flare, an asteroid field, a pulsar, or an enemy anti-ship battery keeps it closed.
  // Backup Battery: combat and boarders are that same screen. A nebula or an ion storm is not, with no fight and no boarders.
  if (shipInDanger(g)) return;
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
      // Environmental Hazards, Asteroid Field: a rock aimed at the enemy is their incoming shot.
      const rockAtEnemy = shot.from === "env" && shot.label === "Rock" && shot.at === "enemy";
      if (!rockAtEnemy && shot.from !== "player" && swarmIntercept(g, shot)) {
        log(g, "A drone cut that shot down.");
        continue;
      }
      if ((shot.from === "player" || rockAtEnemy) && enemyDefenseIntercept(g, shot)) {
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
 * This is the fire portion of airflow() and life() — oxygen 0.96%/s, the die-out timer below 10%, extinguish, 2.128 HP/s, and
 * spreadFire — on the player ship. Melee, repair, medbay, suffocation, door venting, and the oxygen-system refill
 * stay on the combat tick. System sabotage (0.08/s) stays on that tick too (extras/sabotage.ts).
 */
function tickIdleFires(g: Game, dt: number) {
  const ship = g.player;
  if (!ship.rooms.some((r) => r.fire > 0)) return;
  const aboard = "player" as const;
  // Fires: "Fires also consume oxygen (0.96% per second for each fire in a room)".
  // Fires, "Dealing with fires": fires begin to die out once oxygen drops below 10%.
  for (const r of ship.rooms) {
    r.o2 -= 0.96 * r.fire * dt;
    r.o2 = Math.max(0, Math.min(100, r.o2));
    starveFire(g, ship, r, dt);
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
 * this is a fight. The battery, an asteroid field, a pulsar, or a red-giant flare is the environment.
 * No enemy guns, surrender, or winCombat.
 */
function tickBoarding(g: Game, dt: number) {
  g.time += dt;
  airflow(g, g.player, "player", dt);
  tickDoors(g.player, dt);
  moveCrew(g, dt);
  life(g, g.player, "player", dt);
  reap(g);
  noteZoltanKits(g);
  settleZoltanPower(g);
  swapZoltanCooldown(g);
  tickPlayerSabotage(g, dt);
  wanderBoarders(g, dt);
  if (g.asb || g.asteroid || g.pulsar || g.flare) environment(g, dt);
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
  // Environmental Hazards: IN DANGER prevents opening the ship info screen.
  // INFERRED: a screen already open closes when that danger starts. The page does not say it stays up.
  if (shipInDanger(g)) g.shipSheet = false;
  // Crew Teleporter, Overview: the cooldown is already gone once the ship is not in danger.
  relaxSling(g);
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
    if (g.phase !== "combat") stopTargeting(g);
    // A single step never advances more than 0.05s, matching the combat body below.
    // Boarders with no enemy hull (beginBoarding) use the crew fight. A fire on the map stays in tickIdleFires.
    if (idleShip(g)) {
      const h = Math.min(dt, 0.05);
      if (g.phase === "combat" && !g.enemy && enemyAboard(g)) tickBoarding(g, h);
      else {
        tickIdleFires(g, h);
        // Backup Battery, Overview: the window can run out once the fight is over.
        // INFERRED: those 30 seconds keep counting on the map. A fight still ticks the cell in tickExtras.
        if (g.phase !== "combat") tickCell(g, h);
        // Environmental Hazards, Asteroid Field: the field stays after the enemy is gone, until the jump.
        if (g.phase !== "combat" && g.asteroid) tickLingeringAsteroids(g, h);
      }
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
  settleZoltanPower(g);
  shieldRegen(g, g.player, "player", h);
  shieldRegen(g, g.enemy, "enemy", h);
  tickIons(g.player, h);
  tickIons(g.enemy, h);
  syncShields(g.player, zoltanBars(g.crew, g.player, "player", "shields"));
  syncShields(g.enemy, zoltanBars(g.crew, g.enemy, "enemy", "shields"));
  tickExtras(g, h);
  // Zoltans, lead: the cooldown is running before a Zoltan who just arrived replaces a locked bar.
  swapZoltanCooldown(g);
  // Crystal Lockdown: crew and drones already punched this tick. A melted room drops leftover coating hits.
  meltCoats(g);
  // Crew skills, Weapons: the cancel window is game time, so a pause holds it.
  tickMuzzle(g, h);
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
    // INFERRED: their escape ends the engine cap. The page prints the restore on a win.
    clearEngineLimit(g);
    // INFERRED: their escape ends the shield-virus half. The page only prints the half for that fight.
    clearShieldHalf(g);
    clearSystemOff(g);
    clearFriendlyAsb(g);
    g.shots = [];
    g.enemyFlee = 0;
    g.phase = "map";
    // Environmental Hazards, Asteroid Field: an escape does not stop the field. A jump does.
    g.asb = false;
    g.pulsar = false;
    g.flare = false;
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
    if (g.beamAnchor == null) g.beamAnchor = null;
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
