import { flushSfx } from "./audio.ts";
import {
  CREW_POOL,
  EVADE_TABLE,
  FTL_SKILL,
  FTL_UNMANNED,
  SCRAP_MEDIUM,
  SECTOR_NAMES,
  WEAPONS,
  XP_NEED,
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
  weaponBoost,
  keepMissile,
  leashMult,
  swarmIntercept,
  onNewSector,
} from "./extras/index.ts";
import { spikeEvadeZero } from "./extras/spike.ts";
import { veilBrokenByFire } from "./extras/veil.ts";
import { enemyFtlScale } from "./extras/moreaugs.ts";
import { stageHull, rollSurge } from "./extras/ram.ts";
import { kinOf } from "./extras/kin.ts";
import { hullById } from "./hulls.ts";
import { layoutFor } from "./layouts.ts";
import type {
  Beacon,
  Crew,
  Door,
  Game,
  KitId,
  Room,
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

const SAVE_KEY = "ashwake-save-v1";

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

export function isMain(id: SysId): boolean {
  return (
    id === "shields" ||
    id === "engines" ||
    id === "oxygen" ||
    id === "medbay" ||
    id === "weapons"
  );
}

export function bars(sys: SystemState): number {
  return Math.max(0, Math.min(sys.power, sys.level - sys.damage - sys.ion.length));
}

export function functional(sys: SystemState): boolean {
  return sys.level - sys.damage - sys.ion.length > 0;
}

export function maxBubbles(ship: Ship): number {
  return Math.floor(bars(ship.systems.shields) / 2);
}

export function syncShields(ship: Ship) {
  const cap = maxBubbles(ship);
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

function addDoors(rooms: Room[]): Door[] {
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
  const r = roomWith(ship, system);
  if (!r) return false;
  if (r.fire > 0 || r.o2 <= 5) return false;
  const foes = g.crew.some(
    (c) => c.aboard === aboard && c.side !== (aboard === "player" ? "player" : "enemy") && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
  if (foes) return false;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.some(
    (c) => c.side === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function manningCrew(g: Game, ship: Ship, aboard: "player" | "enemy", system: SysId): Crew | undefined {
  if (!manning(g, ship, aboard, system)) return undefined;
  const r = roomWith(ship, system);
  if (!r) return undefined;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.find(
    (c) => c.side === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function present(g: Game, ship: Ship, aboard: "player" | "enemy", system: SysId): boolean {
  const r = roomWith(ship, system);
  if (!r) return false;
  const friends = aboard === "player" ? "player" : "enemy";
  return g.crew.some(
    (c) => c.side === friends && c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0,
  );
}

function rankOf(c: Crew | undefined, skill: SkillName): 0 | 1 | 2 {
  if (!c) return 0;
  return skillRank(c.skills?.[skill] ?? 0, XP_NEED[skill]);
}

function bumpXp(g: Game, c: Crew | undefined, skill: SkillName, amount: number) {
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

/** Engines evasion table, plus manning, plus Piloting autopilot (50% at level 2, 80% at level 3, minimum 2). */
export function evasionPercent(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  if (spikeEvadeZero(g, ship)) return 0;
  const eng = Math.min(8, bars(ship.systems.engines));
  if (eng <= 0) return Math.min(100, extraEvade(g, ship, aboard));
  const pilot = ship.systems.pilot;
  if (!functional(pilot) || !roomWith(ship, "pilot")) return Math.min(100, extraEvade(g, ship, aboard));
  let evade = EVADE_TABLE[eng] ?? 0;
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
  const eng = Math.min(8, bars(ship.systems.engines));
  if (eng <= 0) return null;
  if (!present(g, ship, "player", "pilot")) return null;
  if (ftlFrozen(g)) return null;
  const crew = manningCrew(g, ship, "player", "engines");
  const base = crew ? FTL_SKILL[rankOf(crew, "engines")][eng] : FTL_UNMANNED[eng];
  if (base == null) return null;
  return base * ftlBoost(g);
}

/** Engines, "FTL Charge Times", for the other hull. Augmentations, "FTL Augmentations", FTL Jammer doubles that time. */
export function enemySpoolSeconds(g: Game): number | null {
  const ship = g.enemy;
  if (!ship) return null;
  const eng = Math.min(8, bars(ship.systems.engines));
  if (eng <= 0) return null;
  if (!present(g, ship, "enemy", "pilot")) return null;
  if (ftlFrozen(g)) return null;
  const crew = manningCrew(g, ship, "enemy", "engines");
  const base = crew ? FTL_SKILL[rankOf(crew, "engines")][eng] : FTL_UNMANNED[eng];
  if (base == null) return null;
  return base * enemyFtlScale(g);
}

export function powerMask(ship: Ship): boolean[] {
  let pool = bars(ship.systems.weapons);
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
  syncShields(g.player);
  sfx(g, "click");
}

export function powerDown(g: Game, id: SysId) {
  const sys = g.player.systems[id];
  if (!isMain(id)) return;
  if (sys.power <= 0) return;
  sys.power -= 1;
  syncShields(g.player);
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

export function toggleDoor(g: Game, a: string, b: string) {
  if (!functional(g.player.systems.doors)) {
    log(g, "Door control is dead.");
    return;
  }
  const door = findDoor(g.player, a, b);
  if (!door || door.stuck > 0) return;
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
  const ship = c.aboard === "player" ? g.player : g.enemy;
  if (!ship || !roomById(ship, dest)) return;
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

export function armWeapon(g: Game, weaponUid: string) {
  g.armed = weaponUid;
  sfx(g, "click");
}

export function aim(g: Game, roomId: string) {
  if (!g.enemy || !roomById(g.enemy, roomId)) return;
  const mask = powerMask(g.player);
  let index = g.player.weapons.findIndex((w) => w.uid === g.armed);
  if (index < 0) index = g.player.weapons.findIndex((w, i) => w.enabled && mask[i]);
  const w = g.player.weapons[index];
  if (!w) {
    log(g, "No weapon selected.");
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
}

export function fireReady(g: Game) {
  const mask = powerMask(g.player);
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
  if (id === "asteroid-skirt" && g.fuel < 1) return "Need 1 fuel";
  if (id === "deserter-pay" && g.scrap < 15) return "Need 15 scrap";
  return null;
}

export function toggleAuto(g: Game, weaponUid: string) {
  const w = g.player.weapons.find((x) => x.uid === weaponUid);
  if (!w) return;
  w.autofire = !w.autofire;
  sfx(g, "click");
}

function beamRooms(ship: Ship, origin: string): string[] {
  const r = roomById(ship, origin);
  if (!r) return [origin];
  const list = neighbors(ship, origin);
  const prefer = list.find((id) => roomById(ship, id)?.system) ?? list[0];
  return prefer ? [origin, prefer] : [origin];
}

function launch(g: Game, from: "player" | "enemy", w: WeaponInst) {
  const def = WEAPONS[w.defId];
  if (!def || w.charge < 1 || !w.target) return;
  const ship = from === "player" ? g.player : g.enemy;
  const targetShip = from === "player" ? g.enemy : g.player;
  if (!ship || !targetShip) return;
  if (def.ammo) {
    if (from === "player") {
      if (g.missiles <= 0) {
        log(g, "No missiles.");
        return;
      }
      if (!keepMissile(g)) g.missiles -= 1;
    } else if (ship.ammo <= 0) return;
    else ship.ammo -= 1;
  }
  w.charge = 0;
  const rooms = def.kind === "beam" ? beamRooms(targetShip, w.target) : [w.target];
  const shots = def.kind === "beam" ? 1 : def.shots;
  for (let i = 0; i < shots; i++) {
    g.shots.push({
      id: uid(g),
      kind: def.kind,
      from,
      damage: def.damage,
      ion: def.ion,
      fireChance: def.fire,
      breachChance: def.breach,
      targetRoom: rooms[0],
      beamRooms: def.kind === "beam" ? rooms : undefined,
      wait: i * def.gap,
      t: 0,
      duration: def.kind === "missile" || def.kind === "bomb" ? 1.35 : def.kind === "beam" ? 0.32 : 0.7,
    });
  }
  const sound = def.kind === "flak" ? "laser" : def.kind === "bomb" ? "missile" : def.kind === "laser" ? "laser" : def.kind;
  sfx(g, sound);
  veilBrokenByFire(g, from, def.kind);
  if (from === "player") {
    log(g, `${def.name} away.`);
    bumpXp(g, manningCrew(g, g.player, "player", "weapons"), "weapons", 1);
  }
}

function hurtSystem(ship: Ship, id: SysId, amount: number) {
  const sys = ship.systems[id];
  const roomLeft = sys.level - sys.damage;
  const applied = Math.min(amount, roomLeft);
  sys.damage += applied;
  const cap = capOf(sys);
  if (isMain(id) && sys.power > cap) sys.power = cap;
  syncShields(ship);
}

/** Ions: each point locks one bar for 5 seconds, stacking to five. */
function applyIon(ship: Ship, id: SysId, points: number) {
  const sys = ship.systems[id];
  for (let i = 0; i < points; i++) {
    if (sys.ion.length >= 5) break;
    sys.ion.push(5);
  }
  const cap = capOf(sys);
  if (isMain(id) && sys.power > cap) sys.power = cap;
  syncShields(ship);
}

export function applyImpact(g: Game, shot: Shot) {
  const playerTarget = shot.from !== "player";
  const ship = playerTarget ? g.player : g.enemy;
  if (!ship) return;
  const aboard: "player" | "enemy" = playerTarget ? "player" : "enemy";
  if (shot.kind === "bomb") {
    // Bomb (Weapons), lead: a bomb can miss. It still does not pop shields.
    const evade = evasionPercent(g, ship, aboard);
    if (rand(g) * 100 < evade) {
      if (playerTarget) noteDodge(g);
      log(g, playerTarget ? "Bomb missed the Lark." : "They slipped the bomb.");
      floatAt(g, "MISS", playerTarget ? 70 : 30, 20);
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    if (!r) return;
    if (shot.damage > 0) strikeRoom(g, ship, aboard, shot.targetRoom, shot.damage, shot, playerTarget);
    else {
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
    if (missed) {
      if (playerTarget) noteDodge(g);
      log(g, playerTarget ? "Beam missed the Lark." : "Their hull slipped the beam.");
      floatAt(g, "MISS", playerTarget ? 70 : 30, 20);
      return;
    }
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

  // Shields: one layer blocks one projectile. Missiles ignore layers. Beams are handled above and do not pop layers.
  if (shot.kind !== "missile" && ship.shieldNow > 0) {
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

  if (shot.kind === "ion") {
    if (playerTarget && negateIon(g)) {
      log(g, "Reverse Ion Field shrugged that off.");
      return;
    }
    const r = roomById(ship, shot.targetRoom);
    if (r?.system) {
      applyIon(ship, r.system, Math.max(1, shot.ion));
      log(g, playerTarget ? `${r.title} ionized.` : `Ion on their ${r.title}.`);
    }
    sfx(g, "ion");
    if (r) r.flash = 0.25;
    return;
  }

  strikeRoom(g, ship, aboard, shot.targetRoom, shot.damage, shot, playerTarget);
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
  if (r.system) {
    if (playerHurt && negateSystem(g)) log(g, "Titanium System Casing held the system.");
    else hurtSystem(ship, r.system, damage);
  }
  const held = playerHurt && negateHull(g);
  if (!held) ship.hull = Math.max(0, ship.hull - damage);
  else log(g, "Rock Plating held the hull.");
  r.flash = 0.35;
  for (const c of g.crew) {
    if (c.aboard === aboard && c.room === roomId && c.hp > 0) c.hp -= 15 * damage;
  }
  if (shot.fireChance > 0 && rand(g) < shot.fireChance) r.fire = Math.min(3, r.fire + 1);
  if (shot.breachChance > 0 && rand(g) < shot.breachChance) r.breach += 1;
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

function weightedRoom(g: Game, ship: Ship): string {
  const weights = ship.rooms.map((r) => {
    if (r.system === "weapons" || r.system === "shields") return 6;
    if (r.system === "pilot") return 4;
    if (r.system === "engines") return 3;
    if (r.system === "oxygen") return 2;
    return 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand(g) * total;
  for (let i = 0; i < ship.rooms.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return ship.rooms[i].id;
  }
  return ship.rooms[0].id;
}

function chargeSide(
  g: Game,
  ship: Ship,
  from: "player" | "enemy",
  dt: number,
) {
  const mask = powerMask(ship);
  const gunner = manningCrew(g, ship, from, "weapons");
  const mult = (gunner ? WEAPON_RATE[rankOf(gunner, "weapons")] : 1) / weaponBoost(g, from);
  const frozen = targetIsCloaked(g, from);
  ship.weapons.forEach((w, i) => {
    const def = WEAPONS[w.defId];
    if (!def || !mask[i]) return;
    if (from === "enemy" && !w.target) w.target = weightedRoom(g, g.player);
    if (frozen) return;
    w.charge = Math.min(1, w.charge + dt / (def.charge * mult));
    const auto = from === "enemy" || w.autofire;
    if (auto && w.charge >= 1 && w.target) launch(g, from, w);
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
    const door = ship ? findDoor(ship, c.room, next) : undefined;
    const hostile = c.side !== (c.aboard === "player" ? "player" : "enemy");
    if (door && !door.open && hostile && ship) {
      const level = doorLevel(g, ship, c.aboard);
      if (door.hp <= 0) door.hp = blastHits(level) || 8;
      door.hp -= dt;
      if (door.hp > 0) continue;
      door.open = true;
      // Door System: "When broken, a door remains stuck open for 7 seconds".
      door.stuck = 7;
      door.hp = 0;
      log(g, "A door gives way.");
    }
    // INFERRED: 0.6s is the baseline walk. Crew table movement is a multiplier on that.
    const pace = kinOf(c.kin ?? "plain").move;
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
 * INFERRED: 12% per breach and 1% per fire, and 28% through an open airlock. The Door System page does not give airflow rates.
 */
function airflow(ship: Ship, dt: number) {
  const o2 = bars(ship.systems.oxygen);
  const mult = o2 <= 0 ? 0 : o2 === 1 ? 1 : o2 === 2 ? 4 : 7;
  for (const r of ship.rooms) {
    if (o2 > 0) r.o2 += 1.2 * mult * dt;
    else r.o2 -= 1.2 * dt;
    r.o2 -= 12 * r.breach * dt;
    r.o2 -= 1 * r.fire * dt;
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

function life(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  const friends: "player" | "enemy" = aboard === "player" ? "player" : "enemy";
  const doorLv = doorLevel(g, ship, aboard);
  // Door System: closed doors slow fire spread ×1.75. Closed blast doors (level 2+) slow it ×10.
  const closedSlow = doorLv >= 2 ? 10 : 1.75;
  for (const r of ship.rooms) {
    const present = g.crew.filter((c) => c.aboard === aboard && c.room === r.id && c.hp > 0 && c.path.length === 0);
    const withUs = (c: Crew) => ((c.leashed ?? 0) > 0 ? aboard === "player" : c.side === friends);
    const pals = present.filter((c) => withUs(c) && (c.stun ?? 0) <= 0);
    const foes = present.filter((c) => !withUs(c));
    if (pals.length && foes.length) {
      // INFERRED: 6 damage a second while trading blows. The wiki lists crew health, not this flat rate.
      const dps = 6;
      for (const c of foes) {
        const hit = pals.reduce(
          (sum, p) => sum + (dps / foes.length) * dt * leashMult(p) * kinOf(p.kin ?? "plain").fight,
          0,
        );
        c.hp -= hit;
        for (const p of pals) bumpXp(g, p, "combat", dt);
      }
      for (const c of pals) {
        const rank = rankOf(c, "combat");
        const incoming = foes.reduce(
          (sum, f) => sum + (dps / pals.length) * dt * (1 + 0.1 * rank) * leashMult(f) * kinOf(f.kin ?? "plain").fight,
          0,
        );
        c.hp -= incoming;
        bumpXp(g, c, "combat", dt);
      }
    } else if (r.fire > 0 && pals.length) {
      r.fire = Math.max(0, r.fire - pals.length * 0.45 * dt);
      // Fires: 2.128 HP per second per fire. kin.fireTaken is 0 for a fire-immune lineage.
      for (const c of pals) c.hp -= 2.128 * r.fire * kinOf(c.kin ?? "plain").fireTaken * dt;
    } else if (pals.length && r.breach > 0 && r.system && ship.systems[r.system].damage <= 0) {
      r.breachFix += pals.reduce((sum, c) => sum + kinOf(c.kin ?? "plain").repair, 0) * dt;
      for (const c of pals) bumpXp(g, c, "repair", dt);
      // INFERRED: one crew seals one breach in 8 seconds.
      if (r.breachFix >= 8) {
        r.breach = Math.max(0, r.breach - 1);
        r.breachFix = 0;
        log(g, `${r.title} leak sealed.`);
      }
    } else if (pals.length && r.system && ship.systems[r.system].damage > 0 && r.o2 > 5) {
      const sys = ship.systems[r.system];
      sys.fix += pals.reduce((sum, c) => sum + kinOf(c.kin ?? "plain").repair, 0) * dt;
      for (const c of pals) bumpXp(g, c, "repair", dt);
      // INFERRED: one crew seals one system bar in 6 seconds.
      if (sys.fix >= 6) {
        sys.damage = Math.max(0, sys.damage - 1);
        sys.fix = 0;
        log(g, `${r.title} repaired.`);
        sfx(g, "click");
      }
    }
    if (r.fire > 0 && r.o2 > 15) {
      const sealed = ship.doors.some((d) => !d.open && d.b !== "void" && (d.a === r.id || d.b === r.id));
      r.fireTick += dt * (sealed ? 1 / closedSlow : 1);
      if (r.fireTick > 7) {
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
    }
    // Medbay: level 1 heals at the suffocation rate, 6.4 HP/s. Level 2 is 9.6. Level 3 is 19.2.
    if (bars(ship.systems.medbay) > 0 && r.system === "medbay" && r.fire <= 0 && foes.length === 0 && r.o2 > 5) {
      const powered = bars(ship.systems.medbay);
      const rate = powered >= 3 ? 19.2 : powered >= 2 ? 9.6 : 6.4;
      for (const c of pals) c.hp = Math.min(c.maxHp, c.hp + rate * dt);
    }
    // Oxygen: at 5% or less, crew lose 6.4 HP per second.
    if (r.o2 <= 5) {
      for (const c of present) c.hp -= 6.4 * suffocateScale(g, aboard) * kinOf(c.kin ?? "plain").suffocate * dt;
    } else if (r.fire > 0) {
      for (const c of foes) c.hp -= 2.128 * r.fire * kinOf(c.kin ?? "plain").fireTaken * dt;
    }
    r.flash = Math.max(0, r.flash - dt);
  }
}

function shieldRegen(g: Game, ship: Ship, aboard: "player" | "enemy", dt: number) {
  const cap = maxBubbles(ship);
  if (ship.shieldNow > cap) ship.shieldNow = cap;
  if (ship.shieldNow < cap && bars(ship.systems.shields) >= 2) {
    const op = manningCrew(g, ship, aboard, "shields");
    const rate = op ? SHIELD_RATE[rankOf(op, "shields")] : 1;
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
      g.shots.push({
        id: uid(g),
        kind: "missile",
        from: "env",
        damage: 1,
        ion: 0,
        fireChance: 0.15,
        breachChance: 0.1,
        targetRoom: weightedRoom(g, g.player),
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
  if (!g.enemy || g.beacons.find((b) => b.id === g.here)?.kind !== "boss") return;
  if (g.ramStage < 2) return;
  g.bossSurge -= dt;
  if (g.bossSurge > 0) return;
  g.bossSurge = rollSurge(g.ramStage, rand(g)) ?? 25;
  log(g, "Power surge.");
  sfx(g, "alarm");
  for (let i = 0; i < 2; i++) {
    g.shots.push({
      id: uid(g),
      kind: "laser",
      from: "enemy",
      damage: 1,
      ion: 0,
      fireChance: 0.1,
      breachChance: 0,
      targetRoom: weightedRoom(g, g.player),
      wait: 0.4 + i * 0.35,
      t: 0,
      duration: 0.7,
      label: "Surge",
    });
  }
}

function boarders(g: Game, dt: number) {
  if (g.boardTimer <= 0) return;
  g.boardTimer -= dt;
  if (g.boardTimer > 0) return;
  g.boardTimer = 0;
  const names = ["Hook", "Barb"];
  for (let i = 0; i < 2; i++) {
    const dest = pick(g, g.player.rooms).id;
    g.crew.push({
      id: uid(g),
      name: names[i],
      side: "enemy",
      aboard: "player",
      hp: 100,
      maxHp: 100,
      room: dest,
      path: [],
      move: 0,
      think: 2,
      tone: 3,
    });
  }
  log(g, "Boarders on the hull.");
  sfx(g, "alarm");
}

function wanderBoarders(g: Game, dt: number) {
  for (const c of g.crew) {
    if (c.side !== "enemy" || c.aboard !== "player" || c.hp <= 0) continue;
    c.think -= dt;
    if (c.path.length > 0 || c.think > 0) continue;
    const options = g.player.rooms.filter((r) => r.system);
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
    if (c.side === "player") log(g, `${c.name} is gone.`);
  }
  g.crew = g.crew.filter((c) => c.hp > 0 || (c.cloneIn ?? 0) > 0);
  if (g.selected && !g.crew.some((c) => c.id === g.selected)) g.selected = null;
}

function endCheck(g: Game) {
  if (g.phase !== "combat") return;
  const live = g.crew.filter((c) => c.side === "player" && (c.hp > 0 || (c.cloneIn ?? 0) > 0));
  if (g.player.hull <= 0) {
    lose(g, "The hull opens. The line does not slow down.");
    return;
  }
  if (live.length === 0) {
    lose(g, "No one left to hold the chair. The Lark drifts.");
    return;
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
  const hull = stageHull(next);
  enemy.hullMax = hull;
  enemy.hull = hull;
  for (const sys of Object.values(enemy.systems)) sys.damage = 0;
  const wait = rollSurge(next, rand(g));
  g.bossSurge = wait ?? 25;
  log(g, next === 2 ? "The Flagship brings up the second hull." : "The Flagship brings up its last hull.");
}

function lose(g: Game, text: string) {
  g.phase = "defeat";
  g.outcome = text;
  g.paused = true;
  g.picking = false;
  sfx(g, "die");
  clearSave();
}

function winCombat(g: Game) {
  const boss = g.beacons.find((b) => b.id === g.here)?.kind === "boss";
  g.kills += 1;
  g.crew = g.crew.filter((c) => c.side === "player");
  g.enemy = null;
  g.shots = [];
  g.asteroid = false;
  g.asb = false;
  g.boardTimer = 0;
  if (boss) {
    g.phase = "victory";
    g.outcome = "The Flagship breaks up. Beyond it, the gate is just quiet.";
    sfx(g, "win");
    clearSave();
    return;
  }
  const band = SCRAP_MEDIUM[Math.min(7, Math.max(0, g.sector - 1))];
  let scrap = band[0] + irand(g, band[1] - band[0] + 1);
  scrap = adjustScrap(g, scrap);
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
    g.pending = null;
  }
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
    const options = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
    if (options.length && g.player.weapons.length < 3) {
      const def = pick(g, options);
      giveWeapon(g, def.id);
      notes.push(`${def.name} mounted.`);
    } else scrap += 12;
  }
  g.scrap += scrap;
  g.reward = { scrap, note: notes.join(" ") };
  g.phase = "reward";
  g.paused = true;
  sfx(g, "win");
  const b = g.beacons.find((x) => x.id === g.here);
  if (b) b.resolved = true;
}

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

function addCrew(g: Game) {
  if (g.crew.filter((c) => c.side === "player").length >= 5) {
    g.scrap += 15;
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

function makeEnemy(g: Game, tier: string): { ship: Ship; crew: Crew[] } {
  const boss = tier === "boss";
  const rooms: Room[] = boss
    ? [
        room({ id: "e-shields", title: "Shields", system: "shields", x: 0, y: 0, w: 2, h: 1 }),
        room({ id: "e-weapons", title: "Weapons", system: "weapons", x: 2, y: 0, w: 2, h: 1 }),
        room({ id: "e-oxygen", title: "Oxygen", system: "oxygen", x: 0, y: 1, w: 1, h: 1 }),
        room({ id: "e-pilot", title: "Piloting", system: "pilot", x: 1, y: 1, w: 1, h: 1 }),
        room({ id: "e-engines", title: "Engines", system: "engines", x: 2, y: 1, w: 2, h: 1 }),
      ]
    : [
        room({ id: "e-shields", title: "Shields", system: "shields", x: 0, y: 0, w: 2, h: 1 }),
        room({ id: "e-pilot", title: "Piloting", system: "pilot", x: 2, y: 0, w: 1, h: 1 }),
        room({ id: "e-weapons", title: "Weapons", system: "weapons", x: 0, y: 1, w: 1, h: 1 }),
        room({ id: "e-engines", title: "Engines", system: "engines", x: 1, y: 1, w: 1, h: 1 }),
        room({ id: "e-oxygen", title: "Oxygen", system: "oxygen", x: 2, y: 1, w: 1, h: 1 }),
      ];
  const loadout: Record<string, { hull: number; shield: number; eng: number; wep: number; guns: string[]; ammo: number; name: string }> = {
    scout: { hull: 6, shield: 2, eng: 1, wep: 1, guns: ["spark"], ammo: 0, name: "Cinder picket" },
    fighter: { hull: 8, shield: 2, eng: 2, wep: 1, guns: ["twin"], ammo: 0, name: "Margin cutter" },
    rocket: { hull: 9, shield: 2, eng: 2, wep: 2, guns: ["spark", "dart"], ammo: 4, name: "Ash barge" },
    boarder: { hull: 7, shield: 2, eng: 2, wep: 1, guns: ["spark"], ammo: 0, name: "Hullhook" },
    ace: { hull: 11, shield: 4, eng: 3, wep: 3, guns: ["twin", "spark"], ammo: 0, name: "Gate hunter" },
    boss: { hull: 20, shield: 4, eng: 3, wep: 4, guns: ["lineburst", "dart"], ammo: 6, name: "Flagship" },
  };
  const spec = loadout[tier] ?? loadout.scout;
  const shieldPower = spec.shield;
  const ship: Ship = {
    name: spec.name,
    hull: spec.hull,
    hullMax: spec.hull,
    reactor: shieldPower + spec.eng + 1 + spec.wep,
    systems: systems({
      shields: [spec.shield, shieldPower],
      engines: [spec.eng, spec.eng],
      oxygen: [1, 1],
      weapons: [Math.max(spec.wep, 1), spec.wep],
      pilot: [1, 1],
    }),
    rooms,
    doors: addDoors(rooms),
    weapons: spec.guns.map((defId) => ({
      uid: uid(g),
      defId,
      charge: rand(g) * 0.35,
      enabled: true,
      autofire: true,
      target: null,
    })),
    ammo: spec.ammo,
    shieldNow: Math.floor(shieldPower / 2),
    shieldCharge: 0,
    cols: boss ? 4 : 3,
    rows: 2,
    kits: {},
    parts: 0,
  };
  const crew: Crew[] = [
    { id: uid(g), name: "Pilot", side: "enemy", aboard: "enemy", hp: 100, maxHp: 100, room: "e-pilot", path: [], move: 0, think: 0, tone: 3 },
    { id: uid(g), name: "Gunner", side: "enemy", aboard: "enemy", hp: 100, maxHp: 100, room: "e-weapons", path: [], move: 0, think: 0, tone: 3 },
  ];
  if (spec.shield > 0) {
    crew.push({
      id: uid(g),
      name: "Warden",
      side: "enemy",
      aboard: "enemy",
      hp: 100,
      maxHp: 100,
      room: "e-shields",
      path: [],
      move: 0,
      think: 0,
      tone: 3,
    });
  }
  return { ship, crew };
}

export function startCombat(g: Game, tier: string, asteroid = false) {
  const built = makeEnemy(g, tier);
  g.enemy = built.ship;
  g.crew = g.crew.filter((c) => c.side === "player");
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
  g.asteroidT = 3;
  const here = g.beacons.find((b) => b.id === g.here);
  g.asb = !!here && here.col < g.fleet;
  g.asbT = 6;
  g.boardTimer = tier === "boarder" ? 9 : 0;
  g.bossSurge = tier === "boss" ? 12 : 0;
  g.ramStage = tier === "boss" ? 1 : g.ramStage;
  g.tutorial = g.kills === 0 && g.sector === 1;
  g.time = 0;
  if (g.armed == null) g.armed = g.player.weapons.find((w) => w.enabled)?.uid ?? null;
  armDoors(g.player, doorLevel(g, g.player, "player"));
  armDoors(built.ship, doorLevel(g, built.ship, "enemy"));
  log(g, `${built.ship.name} on the scope.`);
  sfx(g, "alarm");
}

function link(a: Beacon, b: Beacon) {
  if (!a.links.includes(b.id)) a.links.push(b.id);
  if (!b.links.includes(a.id)) b.links.push(a.id);
}

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

function makeMap(g: Game) {
  const last = g.sector >= 8 ? 4 : 6;
  const cols: Beacon[][] = [];
  for (let c = 0; c <= last; c++) {
    const n = c === 0 || c === last ? 1 : rand(g) < 0.5 ? 2 : 3;
    const col: Beacon[] = [];
    for (let i = 0; i < n; i++) {
      const row = n === 1 ? 1 : n === 2 ? (i === 0 ? 0 : 2) : i;
      const kind = c === 0 || c === last ? "empty" : KINDS[irand(g, KINDS.length)];
      col.push({
        id: `s${g.sector}-c${c}-n${i}`,
        col: c,
        row,
        links: [],
        kind,
        visited: false,
        resolved: false,
        name: "Beacon",
        tier: "scout",
        flag: "",
        asteroid: false,
      });
    }
    cols.push(col);
  }
  for (let c = 0; c < last; c++) {
    for (const b of cols[c]) {
      const next = [...cols[c + 1]].sort((a, d) => Math.abs(a.row - b.row) - Math.abs(d.row - b.row));
      link(b, next[0]);
      if (next[1] && rand(g) < 0.7) link(b, next[1]);
    }
    for (const n of cols[c + 1]) {
      if (!cols[c].some((b) => b.links.includes(n.id))) {
        const parent = [...cols[c]].sort((a, d) => Math.abs(a.row - n.row) - Math.abs(d.row - n.row))[0];
        link(parent, n);
      }
    }
  }
  const start = cols[0][0];
  start.kind = "start";
  start.visited = true;
  start.resolved = true;
  start.name = "Departure";
  const exit = cols[last][0];
  if (g.sector >= 8) {
    exit.kind = "boss";
    exit.name = "Flagship";
    exit.tier = "boss";
    g.ramId = exit.id;
    g.ramClock = 2;
  } else {
    exit.kind = "exit";
    exit.name = "Lane out";
    if (rand(g) < (g.sector === 1 ? 0.45 : 0.7)) exit.flag = "picket";
    g.ramId = null;
    g.ramClock = 2;
  }
  const names = ["Silt", "Hinge", "Marrow", "Kite", "Brine", "Cask", "Loom", "Vesper", "Nock", "Quarry", "Weld", "Pell"];
  let ni = 0;
  const middles = cols.flat().filter((b) => b !== start && b !== exit);
  if (!middles.some((b) => b.kind === "store") && middles[0]) middles[0].kind = "store";
  for (const b of middles) {
    b.name = names[ni % names.length];
    ni += 1;
    if (b.kind === "hostile" || b.kind === "event") {
      b.tier = tierFor(g, false);
    }
    if (b.kind === "event") b.asteroid = rand(g) < 0.5;
    if (b.kind === "distress") b.tier = g.sector <= 2 ? "fighter" : "rocket";
  }
  g.beacons = cols.flat();
  g.here = start.id;
  g.fleet = 0;
  g.sectorName = SECTOR_NAMES[g.sector - 1] ?? "Reach";
  onNewSector(g);
}

function tierFor(g: Game, exit: boolean): string {
  const s = g.sector;
  if (exit) return s <= 2 ? "fighter" : s <= 4 ? "rocket" : "ace";
  if (s <= 1) return rand(g) < 0.65 ? "scout" : "fighter";
  if (s === 2) return pick(g, ["fighter", "rocket"] as const);
  if (s <= 4) return pick(g, ["rocket", "boarder", "fighter"] as const);
  if (s <= 6) return pick(g, ["ace", "rocket", "boarder"] as const);
  return pick(g, ["ace", "ace", "rocket"] as const);
}

function applyHull(g: Game, id: string) {
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
    ship.doors = addDoors(ship.rooms);
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
  ship.shieldNow = Math.floor(ship.systems.shields.power / 2);
  g.player = ship;
  g.fuel = spec.fuel;
  g.missiles = spec.missiles;
  g.augments = [...spec.augments];
  g.armed = ship.weapons[0]?.uid ?? "";
  g.crew = g.crew.filter((c) => c.side !== "player");
  spec.crew.forEach((seat, i) => {
    const kin = kinOf(seat.kin);
    g.crew.push({
      id: `c-h${i}`,
      name: CREW_POOL[i % CREW_POOL.length] ?? "Crew",
      side: "player",
      aboard: "player",
      hp: kin.hp,
      maxHp: kin.hp,
      room: seat.room,
      path: [],
      move: 0,
      think: 0,
      tone: i % 3,
      kin: seat.kin,
    });
  });
  const guns = spec.weapons.map((id) => WEAPONS[id]?.name ?? id).join(", ");
  log(g, `${spec.name} leaves the hangar.${guns ? ` ${guns}.` : ""}`);
  if (spec.unfitted.length) log(g, `Not fitted: ${spec.unfitted.join(", ")}.`);
}

export function createGame(seed = (Date.now() ^ 0x9e3779b9) >>> 0, hullId?: string): Game {
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
    scrap: 10,
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
    manual: false,
    shipSheet: false,
    muted: false,
    lowHull: false,
  } as Game;
  makeMap(g);
  if (hullId) applyHull(g, hullId);
  return g;
}

function hereBeacon(g: Game): Beacon | undefined {
  return g.beacons.find((b) => b.id === g.here);
}

export function canJumpTo(g: Game, id: string): boolean {
  const here = hereBeacon(g);
  if (!here) return false;
  return here.links.includes(id);
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
  g.fuel -= 1;
  g.jumps += 1;
  onPlayerJump(g);
  g.fleet += dest.kind === "nebula" ? 0.5 : 1;
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
    startCombat(g, b.tier || "scout", false);
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

function eventFor(g: Game, b: Beacon): Game["event"] {
  if (b.kind === "empty" || b.kind === "start") {
    return {
      title: b.name,
      body: "The buoy answers with static and nothing else. A little scrap in the cradle.",
      choices: [{ id: "empty-take", label: "Pocket it and go" }],
    };
  }
  if (b.kind === "cache") {
    return {
      title: "Fuel cache",
      body: "A bladder of reaction mass, still sealed, lashed to the buoy.",
      choices: [{ id: "cache-take", label: "Take three fuel" }],
    };
  }
  if (b.kind === "distress") {
    return {
      title: "Mayday",
      body: "A tug is drifting with the hatch open. Someone is still on the circuit, voice thin.",
      choices: [
        { id: "distress-help", label: "Close and help" },
        { id: "distress-skip", label: "Leave them. Keep two fuel from the sling." },
      ],
    };
  }
  if (b.kind === "nebula") {
    return {
      title: "Dust well",
      body: "The nebula eats range. The line moves slower in here. Sensors paint ghosts.",
      choices: [
        { id: "nebula-drift", label: "Drift through" },
        { id: "nebula-ping", label: "Ping the shadow" },
      ],
    };
  }
  if (b.kind === "exit") {
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
  if (b.asteroid) {
    return {
      title: "Rock field",
      body: "Stones tick the shield frequency. Something armed is using them as cover.",
      choices: [
        { id: "asteroid-push", label: "Push in" },
        { id: "asteroid-skirt", label: g.fuel > 0 ? "Skirt it (1 fuel)" : "No fuel to skirt" },
      ],
    };
  }
  if (rand(g) < 0.5) {
    return {
      title: "Split wreck",
      body: "A hull torn down the keel. The near compartments look empty. The far ones do not.",
      choices: [
        { id: "wreck-strip", label: "Strip the near plating" },
        { id: "wreck-deep", label: "Cut deeper" },
      ],
    };
  }
  return {
    title: "Deserter buoy",
    body: "A voice offers a crate of missiles and no questions. The price is scrap. The other option is boarding them.",
    choices: [
      { id: "deserter-pay", label: "Pay 15 scrap for 3 missiles" },
      { id: "deserter-fight", label: "Take the crate" },
    ],
  };
}

function rollStock(g: Game): StockItem[] {
  const owned = new Set(g.player.weapons.map((w) => w.defId));
  const guns = Object.values(WEAPONS).filter((w) => w.price > 0 && !owned.has(w.id));
  const items: StockItem[] = [
    { id: "fuel", kind: "fuel", ref: "fuel", name: "Fuel ×3", detail: "Three jumps. Three scrap each.", cost: 9, amount: 3 },
    { id: "missiles", kind: "missiles", ref: "missiles", name: "Missiles ×3", detail: "Feed for the Dart.", cost: 12, amount: 3 },
    {
      id: "repair",
      kind: "repair",
      ref: "repair",
      name: "Hull patch +5",
      detail: "Two scrap a point.",
      cost: Math.min(10, (g.player.hullMax - g.player.hull) * 2, 5 * 2),
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
  if (items[2].cost <= 0) items.splice(2, 1);
  return items;
}

export function buy(g: Game, id: string) {
  const item = g.stock?.find((s) => s.id === id);
  if (!item) return;
  if (g.scrap < item.cost) {
    log(g, "Not enough scrap.");
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
  if (item.kind === "repair") {
    const gain = Math.min(item.amount, g.player.hullMax - g.player.hull);
    g.player.hull += gain;
  }
  if (item.kind === "weapon") giveWeapon(g, item.ref);
  g.stock = (g.stock ?? []).filter((s) => s.id !== id);
  sfx(g, "click");
  log(g, `Bought ${item.name}.`);
}

export function leaveStore(g: Game) {
  const b = hereBeacon(g);
  if (b) b.resolved = true;
  g.stock = null;
  g.phase = "map";
  g.paused = false;
}

export function choose(g: Game, id: string) {
  const b = hereBeacon(g);
  const resolve = () => {
    if (b) b.resolved = true;
    g.event = null;
    g.phase = "map";
    g.paused = false;
  };
  switch (id) {
    case "empty-take":
      g.scrap += 4;
      resolve();
      break;
    case "cache-take":
      g.fuel += 3;
      log(g, "Fuel bladder aboard.");
      resolve();
      break;
    case "distress-skip":
      g.fuel += 2;
      resolve();
      break;
    case "distress-help":
      g.pending = "crew";
      if (b) b.resolved = false;
      g.event = null;
      startCombat(g, b?.tier || "fighter");
      break;
    case "nebula-drift":
      g.scrap += 5;
      resolve();
      break;
    case "nebula-ping":
      if (rand(g) < 0.55) {
        g.pending = "bonus:12";
        g.event = null;
        startCombat(g, "fighter");
      } else {
        g.scrap += 8;
        log(g, "Just a reflection.");
        resolve();
      }
      break;
    case "asteroid-push":
      g.event = null;
      startCombat(g, b?.tier || "fighter", true);
      break;
    case "asteroid-skirt":
      if (g.fuel < 1) return;
      g.fuel -= 1;
      log(g, "You burn fuel around the field.");
      resolve();
      break;
    case "wreck-strip":
      g.scrap += 12;
      resolve();
      break;
    case "wreck-deep":
      if (rand(g) < 0.5) {
        g.scrap += 22;
        g.fuel += 1;
        g.event = {
          title: "Deep cache",
          body: "Behind the ribs: scrap, and a fuel line that still holds pressure.",
          choices: [{ id: "ack", label: "Haul it out" }],
        };
      } else {
        g.event = null;
        startCombat(g, "scout");
      }
      break;
    case "deserter-pay":
      if (g.scrap < 15) {
        log(g, "Not enough scrap.");
        return;
      }
      g.scrap -= 15;
      g.missiles += 3;
      resolve();
      break;
    case "deserter-fight":
      g.pending = "bonus:10";
      g.event = null;
      startCombat(g, "rocket");
      break;
    case "exit-fight":
      g.pending = "exit-clear";
      g.event = null;
      startCombat(g, tierFor(g, true));
      break;
    case "exit-leave":
      nextSector(g);
      break;
    case "ack":
      resolve();
      break;
    default:
      resolve();
  }
}

function nextSector(g: Game) {
  if (g.sector >= 8) {
    g.phase = "map";
    return;
  }
  g.sector += 1;
  g.player.shieldCharge = 0;
  if (g.sector === 8) {
    g.player.hull = Math.min(g.player.hullMax, g.player.hull + 10);
    g.missiles += 10;
    log(g, "Gate patch: hull and ten missiles.");
  }
  makeMap(g);
  g.phase = "map";
  g.paused = false;
  g.event = null;
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

export function waitHere(g: Game) {
  if (g.phase !== "map") return;
  g.fleet += 1;
  log(g, "You hold. The line advances.");
  const b = hereBeacon(g);
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

export function patchAll(g: Game) {
  const missing = g.player.hullMax - g.player.hull;
  const cost = missing * 2;
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
      applyImpact(g, shot);
    }
  }
  g.shots = g.shots.filter((s) => s.t < 1);
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
    flushSfx(g.sfx);
    return;
  }
  const h = Math.min(dt, 0.05);
  g.time += h;
  airflow(g.player, h);
  airflow(g.enemy, h);
  tickDoors(g.player, h);
  tickDoors(g.enemy, h);
  moveCrew(g, h);
  life(g, g.player, "player", h);
  life(g, g.enemy, "enemy", h);
  reap(g);
  shieldRegen(g, g.player, "player", h);
  shieldRegen(g, g.enemy, "enemy", h);
  tickIons(g.player, h);
  tickIons(g.enemy, h);
  syncShields(g.player);
  syncShields(g.enemy);
  tickExtras(g, h);
  chargeSide(g, g.player, "player", h);
  chargeSide(g, g.enemy, "enemy", h);
  wanderBoarders(g, h);
  boarders(g, h);
  environment(g, h);
  bossThink(g, h);
  const spool = ftlSeconds(g, g.player);
  if (spool) g.flee = Math.min(1, g.flee + h / spool);
  const theirs = enemySpoolSeconds(g);
  if (theirs) g.enemyFlee = Math.min(1, g.enemyFlee + h / theirs);
  if (g.enemyFlee >= 1 && g.enemy) {
    // INFERRED: crew still on the other hull are left behind. The engines page does not say this in one line.
    g.crew = g.crew.filter((c) => c.side === "player" && c.aboard === "player");
    g.enemy = null;
    g.shots = [];
    g.enemyFlee = 0;
    g.phase = "map";
    g.asteroid = false;
    g.asb = false;
    log(g, "They charged FTL and left.");
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
    if (g.ramId === undefined) g.ramId = null;
    if (g.enemyFlee == null) g.enemyFlee = 0;
    if (g.ramStage == null) g.ramStage = 1;
    for (const d of g.player.doors) {
      if (d.hp == null) d.hp = 0;
      if (d.stuck == null) d.stuck = 0;
    }
    if (!g.augments) g.augments = [];
    if (!g.player.kits) g.player.kits = {};
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
