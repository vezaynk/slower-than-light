/**
 * Picks a documented enemy class for the current sector and rolls one ship from it.
 * Data: wiki/enemy-ships.ts (faction pages). Rules are cited per line; anything marked
 * INFERRED fills a gap the pages leave (they print ranges, not how a sector picks inside them).
 * Pure: the caller (sim makeEnemy) turns the spec into rooms, systems, doors, and crew.
 */
import { WEAPONS } from "./content.ts";
import type { KinId } from "./extras/kin.ts";
import { rollPirateCrew } from "./wiki/skills.ts";
import { weaponIdForName } from "./gear-look.ts";
import type { Difficulty, DoorMark, KitId, SysId } from "./types.ts";
import { enemyLayout } from "./wiki/enemy-layouts.ts";
import {
  ENEMY_CLASSES,
  ENEMY_DRONES,
  ENEMY_PARTS_BASELINE,
  ENEMY_WEAPON_POOLS,
  type EnemyClass,
  type EnemySystem,
  type Range,
} from "./wiki/enemy-ships.ts";
// @agent:sector-hostiles. Documented / derived hostile encounters per sector type.
import { sectorHostiles } from "./wiki/sector-hostiles.ts";

export type EnemyRoomSpec = {
  id: string;
  title: string;
  system: SysId | null;
  kit?: KitId;
  x: number;
  y: number;
  w: number;
  h: number;
  omit?: { x: number; y: number }[];
};

export type EnemySpec = {
  classId: string;
  name: string;
  pirate: boolean;
  automated: boolean;
  hull: number;
  /** [level, power] for systems this sim runs on an enemy hull. */
  systems: Partial<Record<SysId, [number, number]>>;
  /** Subsystem kits the extras modules run on an enemy hull, by level (drones, hacking, cloaking, …). */
  kits: Partial<Record<KitId, number>>;
  /** Installed systems with no module at all (artillery), with levels. */
  unwired: { id: EnemySystem; level: number }[];
  /** Enemy reactor: the user's rule, "generally the same size as the needed capacity". */
  reactor: number;
  rooms: EnemyRoomSpec[];
  cols: number;
  rows: number;
  /** Door bars from a traced interior. Absent on the untraced fallback. */
  marks?: DoorMark[];
  weapons: string[];
  missiles: number;
  crew: { kin: KinId; race: string; room: string }[];
  /** Crew Teleporter installed: the ship can board. */
  boards: boolean;
  /** @agent:drones. Drone parts in stock (Enemy Ships, "Missile and drone stocks"). */
  parts: number;
  /** @agent:drones. Drone schematics this hull fields this fight, in power order. Empty without Drone Control. */
  drones: string[];
};

/**
 * @agent:drones. Power per enemy drone schematic, Drone Control, each schematic's "Power requirement" line.
 * The SwarmKind entries repeat DRONE_POWER in extras/swarm.ts (swarm-enemy.test.ts checks they agree).
 * Kept here so this pure module does not import swarm.ts, which imports sim.ts.
 */
export const SCHEMATIC_POWER: Record<string, number> = {
  /** Combat Drone Mark I: "Power requirement: 2 power". */
  striker: 2,
  /** Combat Drone Mark II: "Power requirement: 4 power". */
  combat2: 4,
  /** Anti-Ship Beam Drone I: "Power requirement: 2 power". */
  beam: 2,
  /** Anti-Ship Beam Drone II: "Power requirement: 3 power". */
  beam2: 3,
  /** Anti-Ship Fire Drone: "Power requirement: 3 power". */
  fire: 3,
  /** Defense Drone Mark I: "Power requirement: 2 power". */
  ward: 2,
  /** Defense Drone Mark II: "Power requirement: 3 power". */
  ward2: 3,
  /** Anti-Combat Drone: "Power requirement: 1 power". */
  wardcut: 1,
  /** Shield Overcharger: "Power requirement: 3 power". */
  overcharger: 3,
  /** System Repair Drone: "Power requirement: 1 power". */
  patch: 1,
  /** Anti-Personnel Drone: "Power requirement: 2 power". */
  personnel: 2,
  /** Boarding Drone: "Power requirement: 3 power". */
  board: 3,
  /** Ion Intruder Drone: "Power requirement: 3 power". */
  ionintruder: 3,
};

/**
 * @agent:drones. Schematics the enemy side of extras/swarm.ts can run.
 * Combat Drone Mark II fires on the orbit leg in swarm.ts (cited-combat2.ts).
 */
export const ENEMY_RUNNABLE = new Set([
  "striker",
  "combat2",
  "beam",
  "beam2",
  "fire",
  "ward",
  "ward2",
  "wardcut",
  "overcharger",
  "patch",
  "personnel",
  "board",
  "ionintruder",
]);

/**
 * @agent:drones. Enemy Ships, "Missile and drone stocks": "the game will always give them at least double the number
 * of parts as they have drones ... Hacking does not count towards this increase".
 */
export function enemyParts(classId: string, drones: number): number {
  const base = ENEMY_DRONES[classId]?.parts ?? ENEMY_PARTS_BASELINE;
  return Math.max(base, drones * 2);
}

/**
 * Combat drones for Mathchamp's flag rule. "a combat drone (the type of weapon on the drone does not matter)": Combat
 * Drone I and II, the Anti-Ship Beam Drones, and the Anti-Ship Fire Drone.
 */
const COMBAT_DRONES = new Set(["striker", "combat2", "beam", "beam2", "fire"]);

/**
 * @agent:drones. Which drones this hull fields. Allowed schematics: Template:Enemy ships drones (ENEMY_DRONES).
 * Count cap: that row's max parts column ("# of drones ×2"), halved.
 * Mathchamp, "Drone generation has the following rules": the drone "cannot use more power than is available", cannot
 * be 0 power, "If the system is at least level 4, then the drone's power must be strictly less than the total system
 * power", "must not have the same blueprint as an already installed drone", and "If either flag from the weapon
 * generator is still outstanding, the drone must be a combat drone ... and a combat drone will clear the flags." "The
 * last two conditions are soft conditions": a pick that fails them retries with the first three only.
 * Drone Control, "Drone Schematics": "Before the start of a ship fight it is impossible to know the exact drones the
 * enemy ship will deploy" — this list stays hidden; swarm.ts deploys it on the first combat tick.
 */
export function rollDrones(classId: string, level: number, rand: () => number, flagsOpen = false): string[] {
  const row = ENEMY_DRONES[classId];
  if (!row || level <= 0) return [];
  const pool = row.drones.filter((id) => ENEMY_RUNNABLE.has(id));
  const out: string[] = [];
  let open = flagsOpen;
  let left = level;
  while (out.length < row.maxDrones) {
    const hard = pool.filter((id) => {
      const p = SCHEMATIC_POWER[id] ?? Infinity;
      return p >= 1 && p <= left && (level < 4 || p < level);
    });
    const soft = hard.filter((id) => !out.includes(id) && (!open || COMBAT_DRONES.has(id)));
    const fits = soft.length ? soft : hard;
    if (!fits.length) break;
    const id = fits[Math.floor(rand() * fits.length) % fits.length];
    out.push(id);
    left -= SCHEMATIC_POWER[id];
    if (COMBAT_DRONES.has(id)) open = false;
  }
  return out;
}

/** Systems with enemy behaviour in sim.ts. */
const RUN: Partial<Record<EnemySystem, SysId>> = {
  shields: "shields",
  engines: "engines",
  oxygen: "oxygen",
  weapons: "weapons",
  pilot: "pilot",
  medbay: "medbay",
  doors: "doors",
  sensors: "sensors",
};

/** Systems run by an extras module, keyed by that module's kit id. */
const KIT: Partial<Record<EnemySystem, KitId>> = {
  drones: "swarm",
  hacking: "spike",
  cloaking: "veil",
  teleporter: "sling",
  clonebay: "cradle",
  mindcontrol: "leash",
  battery: "cell",
};

const TITLE: Record<EnemySystem, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  weapons: "Weapons",
  pilot: "Piloting",
  medbay: "Medbay",
  doors: "Doors",
  sensors: "Sensors",
  drones: "Drones",
  hacking: "Hacking",
  cloaking: "Cloaking",
  teleporter: "Teleporter",
  clonebay: "Clone Bay",
  mindcontrol: "Mind Control",
  battery: "Battery",
  artillery: "Artillery",
};

const KIN_OF: Record<string, KinId> = {
  Human: "plain",
  Engi: "shell",
  Mantis: "blade",
  Slug: "gel",
  Rock: "stone",
  Zoltan: "spark",
  Crystal: "shard",
  Lanius: "voidlung",
};

export type PoolContext = { sector: number; sectorName: string; difficulty: Difficulty };

/**
 * What a fight asks for: any ship in the sector pool, or one faction, and/or a pirate.
 * `classId`: one ship class (wiki/enemy-ships.ts id), when the event page names it ("Fight a Mantis Bomber", "always a
 * Slug Assault class"). requestFor reads it from the fight string by class name ("Mantis Bomber", "Slug Assault pirate
 * ship") or id ("slug-assault").
 */
export type EnemyRequest = { faction?: EnemyClass["faction"]; pirate?: boolean; event?: string; classId?: string };

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const FACTION_WORDS: [RegExp, EnemyClass["faction"]][] = [
  [/auto/i, "auto"],
  [/rebel/i, "rebel"],
  [/engi/i, "engi"],
  [/mantis/i, "mantis"],
  [/slug/i, "slug"],
  [/rock/i, "rock"],
  [/zoltan/i, "zoltan"],
  [/crystal/i, "crystal"],
  [/lanius/i, "lanius"],
  [/federation/i, "federation"],
];

/** Cited events name the fight by ship ("Auto-ship", "Slug ship", "Zoltan pirate ship", "Pirate ship"). */
export function requestFor(tier: string): EnemyRequest {
  const faction = FACTION_WORDS.find(([re]) => re.test(tier))?.[1];
  // Enemy Ships, "Pirated ships": Federation ships are fought only as pirates "except for the Federation
  // deserters event", which asks for a "Federation ship". So a Federation request takes either.
  const pirate = /pirate/i.test(tier) ? true : faction && faction !== "federation" ? false : undefined;
  const classId = classIdFor(tier);
  return classId ? { faction, pirate, classId } : { faction, pirate };
}

/** Class names longest first, so "Rock Assault (Elite)" wins over "Rock Assault". */
const CLASS_NAMES = ENEMY_CLASSES.map((c) => ({ id: c.id, name: c.name.toLowerCase() })).sort((a, b) => b.name.length - a.name.length);

/** The ship class a fight string names ("Fight a Mantis Bomber"), by class name or id; undefined for "Mantis ship". */
export function classIdFor(tier: string): string | undefined {
  const t = tier.toLowerCase();
  return CLASS_NAMES.find((c) => t.includes(c.name) || t === c.id)?.id;
}

/** Enemy Ships, "Pirated ships": Engi, Lanius, and Crystal have no pirate versions; Federation is only fought as pirates. */
function canBePirate(c: EnemyClass) {
  return !!c.pirate || c.faction === "federation";
}

function fleetOnly(c: EnemyClass) {
  // Rebel Ships, Elite Fighter / Elite Assault: "at beacons overtaken by the Rebel Fleet".
  return /overtaken by the Rebel Fleet/i.test(c.where ?? "");
}

type PoolEntry = { cls: EnemyClass; pirate: boolean };

/**
 * Classes this sector's number can field, each as regular and/or pirate: each class's "Encountered in sectors" range and
 * `where` notes. An event that asks for a ship draws from this (the event page itself places that ship here).
 * Sector 1: wiki "Sectors", Civilian (Starting) Sector lists the HOSTILE_CIVILIAN and HOSTILE1 event lists,
 * whose fights are Rebel, Auto-ship, Mantis, and Pirate ships only.
 */
export function rangePool(ctx: PoolContext): PoolEntry[] {
  const out: { cls: EnemyClass; pirate: boolean }[] = [];
  for (const cls of ENEMY_CLASSES) {
    if (cls.uniqueTo || fleetOnly(cls)) continue;
    // Mathchamp: "Blueprint selection (minimum/maximum sector for blueprints) is affected by the Easy sector delay."
    const at = genSector(ctx.sector, ctx.difficulty);
    if (at < cls.sectors[0] || at > cls.sectors[1]) continue;
    const where = cls.where ?? "";
    // Federation Ships: "in Crystal Homeworlds only".
    if (/Crystal Homeworlds only/i.test(where) && !/crystal/i.test(ctx.sectorName)) continue;
    // Mantis Bomber: "normally appears in sectors 5+; in sectors 2-4 can only be encountered in the Mantis Ship-Collectors event".
    if (/normally appears in sectors 5\+/i.test(where) && ctx.sector < 5) continue;
    // Mantis ships: "in sector 8 the non-pirate version can only be encountered in the Battlefield Wreckage event".
    const regularOk = cls.faction !== "federation" && !(ctx.sector === 8 && /sector 8 the non-pirate version/i.test(where));
    const sectorOne = ctx.sector === 1;
    if (regularOk && (!sectorOne || cls.faction === "rebel" || cls.faction === "auto" || cls.faction === "mantis")) {
      out.push({ cls, pirate: false });
    }
    if (canBePirate(cls)) out.push({ cls, pirate: true });
  }
  return out;
}

function fitsRequest(e: PoolEntry, want: EnemyRequest): boolean {
  return (!want.faction || e.cls.faction === want.faction) && (want.pirate == null || e.pirate === want.pirate);
}

/**
 * @agent:sector-hostiles. Weights of a sector's random fights from its hostile encounter list (wiki/sector-hostiles.ts):
 * documented event lists for the two Civilian sectors, event-page {{Locations}} for the rest. Each event's weight is
 * split evenly over the pool entries that can field its ship. INFERRED: the faction pages give no odds between classes.
 * An entry that no listed event fields weighs 0. Null when the sector name has no list (e.g. the placeholder names).
 */
export function hostileWeights(pool: PoolEntry[], sectorName: string): number[] | null {
  const list = sectorHostiles(sectorName);
  if (!list) return null;
  const out = pool.map(() => 0);
  for (const e of list) {
    // The list's weights stay by faction: its one class-named row ("Rock Assault (Elite) ship") is a unique ship that
    // only its own event fields (pickEnemy), so a class request would drop that weight entirely.
    const asked = requestFor(e.ship);
    const want: EnemyRequest = { faction: asked.faction, pirate: asked.pirate };
    const fit = pool.flatMap((p, i) => (fitsRequest(p, want) ? [i] : []));
    for (const i of fit) out[i] += e.weight / fit.length;
  }
  return out.some((w) => w > 0) ? out : null;
}

/**
 * Classes a normal hostile beacon can field in this sector: the range pool, narrowed to the factions (and pirates) the
 * sector's hostile encounter list fights. A sector with no list keeps the whole range pool.
 */
export function enemyPool(ctx: PoolContext): PoolEntry[] {
  const pool = rangePool(ctx);
  const w = hostileWeights(pool, ctx.sectorName);
  return w ? pool.filter((_, i) => w[i] > 0) : pool;
}

/**
 * INFERRED fallback, only for a sector name with no hostile list (sector-hostiles.ts) and for a fight an event asked
 * for: a sector named for a faction favours that faction ×3.
 */
function weight(entry: { cls: EnemyClass; pirate: boolean }, sectorName: string): number {
  const name = sectorName.toLowerCase();
  if (entry.pirate) return name.includes("pirate") ? 3 : 1;
  const f = entry.cls.faction;
  if (f === "auto") return name.includes("rebel") ? 3 : 1;
  if (f === "zoltan" || f === "engi" || f === "mantis" || f === "rock" || f === "slug" || f === "rebel" || f === "crystal" || f === "lanius") {
    return name.includes(f) ? 3 : 1;
  }
  return 1;
}

export function pickEnemy(ctx: PoolContext, rand: () => number, want: EnemyRequest = {}): { cls: EnemyClass; pirate: boolean } {
  // "Ship unique to the … event": that event fields this class and no other does.
  const unique = want.event ? ENEMY_CLASSES.find((cls) => cls.uniqueTo && slug(cls.uniqueTo) === want.event) : undefined;
  if (unique) return { cls: unique, pirate: false };
  // A page that names the class ("always a Slug Assault class") gets that class. INFERRED: the page places it, so its
  // sector range and `where` notes do not apply (The Black Raven: "the only event where you fight a Slug Assault in
  // sector 4"). Pirate only when asked and the class has a pirate version; Federation classes are only pirates.
  const named = want.classId ? ENEMY_CLASSES.find((c) => c.id === want.classId) : undefined;
  if (named) return { cls: named, pirate: named.faction === "federation" || (want.pirate === true && canBePirate(named)) };
  const fits = (e: PoolEntry) => fitsRequest(e, want);
  // @agent:sector-hostiles. A fight an event asked for takes any class of that ship in range; a plain hostile beacon
  // draws from the sector's hostile encounter list.
  const requested = !!want.faction || want.pirate != null;
  let pool = requested ? rangePool(ctx).filter(fits) : enemyPool(ctx);
  if (!pool.length && (want.faction || want.pirate != null)) {
    // The event names a ship the sector line does not list for this sector. INFERRED: take that faction's
    // ships from any sector rather than swapping in a different faction.
    pool = ENEMY_CLASSES.filter((cls) => !cls.uniqueTo && !fleetOnly(cls))
      .flatMap((cls) => [
        ...(cls.faction !== "federation" || want.faction === "federation" ? [{ cls, pirate: false }] : []),
        ...(canBePirate(cls) ? [{ cls, pirate: true }] : []),
      ])
      .filter(fits);
  }
  if (!pool.length) return { cls: ENEMY_CLASSES.find((c) => c.id === "rebel-fighter")!, pirate: false };
  const weights = (!requested && hostileWeights(pool, ctx.sectorName)) || pool.map((e) => weight(e, ctx.sectorName));
  let roll = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Rebel Elites: "Elite Fighter" and "Elite Assault" (Rebel Ships). */
export function pickElite(rand: () => number): EnemyClass {
  const elites = ENEMY_CLASSES.filter(fleetOnly);
  return elites[Math.floor(rand() * elites.length) % elites.length];
}

/*
 * Enemy ship generation. Source: Mathchamp, "Details on enemy ship generation" (reddit r/ftlgame qu8kz7), linked from
 * Enemy Ships ("For technical details on enemy ship generation, see Mathchamp's Reddit post"). Quoted where used.
 * The faction pages print each system as (starting level - blueprint maximum); `cls.systems` keeps that pair.
 */

/** Mathchamp: "Blueprint selection ... is affected by the Easy sector delay", and Easy interpolation is "delayed a sector". */
export function genSector(sector: number, difficulty: Difficulty): number {
  return difficulty === "easy" ? Math.max(1, sector - 1) : sector;
}

/** Mathchamp: values are "linearly interpolated, between the minimum and maximum values ... between sector 1 and 9". */
function lerp(lo: number, hi: number, sector: number): number {
  return lo + ((hi - lo) * (sector - 1)) / 8;
}

/**
 * Mathchamp, the bonus added to each rolled maximum: "always 0 in sector 1 on Easy. In other sectors on Easy, and in
 * the first two sectors of Normal and Hard, this number is between 0 and 1, while in the later sectors of Normal and
 * Hard, this number is between 0 and 2."
 */
function levelBonus(ctx: PoolContext, rand: () => number): number {
  const top = ctx.difficulty === "easy" ? (ctx.sector === 1 ? 0 : 1) : ctx.sector <= 2 ? 1 : 2;
  return Math.floor(rand() * (top + 1));
}

/**
 * Mathchamp: "it rolls a maximum level for each system" from the interpolation (rounded down: the per-sector ranges on
 * ftl-layouts.mikehopley.org, e.g. Rebel Fighter Shields 2-8 is "3-5" in sector 3) plus the bonus, then "If the maximum
 * level with the bonus exceeds the maximum power on the blueprint, then the maximum level is reduced".
 */
export function rollMaxLevel(r: Range, ctx: PoolContext, rand: () => number): number {
  const base = Math.floor(lerp(r[0], r[1], genSector(ctx.sector, ctx.difficulty)));
  return Math.min(r[1], base + levelBonus(ctx, rand));
}

/**
 * Mathchamp: "The budget for Easy/Normal/Hard (already adjusted for easy sector delay)", by sector:
 * [offensive, defensive, general] for each difficulty.
 */
export const UPGRADE_BUDGET: Record<Difficulty, [number, number, number][]> = {
  easy: [[1, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 2], [5, 6, 2], [6, 7, 2], [7, 8, 3]],
  normal: [[1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 2], [5, 6, 2], [6, 7, 2], [7, 8, 3], [8, 9, 3]],
  hard: [[1, 2, 2], [2, 3, 2], [3, 4, 2], [4, 5, 3], [5, 6, 3], [6, 7, 3], [7, 8, 4], [8, 9, 4]],
};

/** Mathchamp: "The "offensive" budget can only be spent on weapons, drone control, teleporter, and artillery." */
const OFFENSIVE = new Set<EnemySystem>(["weapons", "drones", "teleporter", "artillery"]);
/** Mathchamp: "The "defensive" budget can only be spent on shields, engines, and cloaking." */
const DEFENSIVE = new Set<EnemySystem>(["shields", "engines", "cloaking"]);

/**
 * Mathchamp: "for each available power bar, a list of all eligible systems is generated (must be one of the designated
 * systems, must be present and below the maximum level that was rolled ...). Then one is selected at random and
 * upgraded by 1 bar ... until there are no more available bars to spend or no more valid systems to upgrade."
 * Returns the bars left over (negative stays negative).
 */
function spendBudget(
  levels: Map<EnemySystem, number>,
  caps: Map<EnemySystem, number>,
  allowed: Set<EnemySystem> | null,
  bars: number,
  rand: () => number,
): number {
  let left = bars;
  while (left > 0) {
    const ok = [...levels.keys()].filter((id) => (!allowed || allowed.has(id)) && levels.get(id)! < caps.get(id)!);
    if (!ok.length) break;
    const id = ok[Math.floor(rand() * ok.length) % ok.length];
    levels.set(id, levels.get(id)! + 1);
    left -= 1;
  }
  return left;
}

/**
 * Mathchamp: "Crew count is linearly interpolated between the minimum and maximum values between Sector 1 and Sector 9,
 * and rounded down, so you never actually see the max value". The faction pages print the largest count seen, so the
 * blueprint maximum is one above it (this matches the per-sector crew tables on ftl-layouts.mikehopley.org, e.g.
 * Mantis Scout 3-4: 3 in sectors 1-4, 4 in sectors 5-6). Easy is delayed a sector.
 */
export function crewCount(r: Range, ctx: PoolContext): number {
  if (r[1] <= 0) return 0;
  return Math.min(r[1], Math.floor(lerp(r[0], r[1] + 1, genSector(ctx.sector, ctx.difficulty))));
}

/**
 * Hull by sector. Not in Mathchamp's post. ftl-layouts.mikehopley.org prints one value per sector, rising by one each
 * sector from the low end where the class first appears (Mantis Fighter 10-16 is 10 in sector 2 and 16 in sector 8).
 * Easy uses the page's "(x-y on Easy)" pair the same way.
 */
export function hullFor(cls: EnemyClass, ctx: PoolContext): number {
  const [lo, hi] = ctx.difficulty === "easy" && cls.easyHull ? cls.easyHull : cls.hull;
  return Math.max(lo, Math.min(hi, lo + (ctx.sector - cls.sectors[0])));
}

/**
 * Laser (Weapons), "Laser Charger (S)": "Enemies never use this weapon."
 * Missile (Weapons), Swarm Missiles and Pegasus Missile: "Enemies never use this weapon."
 */
export function enemyMayMount(id: string): boolean {
  return id !== "chargers" && id !== "swarmmissiles" && id !== "pegasus";
}

/** Mathchamp's first flag: "a weapon that is either a LASER, or is a MISSILE with at most 3 shield piercing. In vanilla,
 * this is met by lasers, ions, and crystal weapons." Crystal weapons are lasers in content.ts. */
function laserFlag(id: string): boolean {
  const kind = WEAPONS[id]?.kind;
  return kind === "laser" || kind === "ion";
}

/** Mathchamp's second flag: "A weapon that deals normal damage (i.e. hull damage)". Bombs never damage hull (Bomb (Weapons)). */
function hullFlag(id: string): boolean {
  const def = WEAPONS[id];
  return !!def && def.damage > 0 && def.kind !== "bomb";
}

/** INFERRED: four weapon slots. Mathchamp stops at "no slots remain"; the faction pages print no slot count. */
export const ENEMY_WEAPON_SLOTS = 4;

export type ArmResult = { weapons: string[]; flags: { laser: boolean; hull: boolean } };

/**
 * Mathchamp: "random weapons are generated (with equal odds for each entry ...) until either all power is allocated, no
 * slots remain, or there are no eligible weapons". Each pick must:
 * - "not use more power than is available for the system";
 * - have power "strictly less than the total system power, unless it is 1 power";
 * - "If there are no weapons installed so far and the system is at least level 3, the first weapon must be at least 2 power";
 * - "use greater than (not equal to) 25% of the remaining system power";
 * - while either flag is still set, "satisfy one of the remaining flags".
 * INFERRED: a pool with nothing eligible for a level-1 system still mounts its cheapest gun, so no fight is unarmed.
 */
export function arm(pool: string[], level: number, rand: () => number): ArmResult {
  const ids = pool
    .map((n) => weaponIdForName(n))
    .filter((id): id is string => !!id && !!WEAPONS[id] && enemyMayMount(id));
  const flags = { laser: true, hull: true };
  const out: string[] = [];
  let left = level;
  while (left > 0 && out.length < ENEMY_WEAPON_SLOTS) {
    const ok = ids.filter((id) => {
      const p = WEAPONS[id].power;
      if (p > left) return false;
      if (!(p < level || p === 1)) return false;
      if (out.length === 0 && level >= 3 && p < 2) return false;
      if (!(p > 0.25 * left)) return false;
      if (flags.laser || flags.hull) return (flags.laser && laserFlag(id)) || (flags.hull && hullFlag(id));
      return true;
    });
    if (!ok.length) break;
    const id = ok[Math.floor(rand() * ok.length) % ok.length];
    out.push(id);
    left -= WEAPONS[id].power;
    if (laserFlag(id)) flags.laser = false;
    if (hullFlag(id)) flags.hull = false;
  }
  if (!out.length && ids.length) {
    const cheapest = [...ids].sort((a, b) => WEAPONS[a].power - WEAPONS[b].power)[0];
    out.push(cheapest);
  }
  return { weapons: out, flags };
}

/**
 * INFERRED fallback for a class with no traced interior (every class has one now; kept for test hulls).
 * Two rows, one room per installed system.
 */
function layout(installed: EnemySystem[]): { rooms: EnemyRoomSpec[]; cols: number; rows: number } {
  const big = new Set<EnemySystem>(["shields", "weapons", "engines", "medbay", "clonebay", "teleporter", "drones"]);
  const rooms: EnemyRoomSpec[] = [];
  const rowX = [0, 0];
  installed.forEach((id, i) => {
    const y = i % 2;
    const w = big.has(id) ? 2 : 1;
    const kit = KIT[id];
    rooms.push({ id: `e-${id}`, title: TITLE[id], system: RUN[id] ?? null, ...(kit ? { kit } : {}), x: rowX[y], y, w, h: 1 });
    rowX[y] += w;
  });
  return { rooms, cols: Math.max(rowX[0], rowX[1]), rows: 2 };
}

const STEP: Record<DoorMark["side"], [number, number]> = {
  n: [0, -1],
  e: [1, 0],
  s: [0, 1],
  w: [-1, 0],
};

/** Rooms linked by an interior bar. The largest set is the hull a crew member can walk. */
function mainComponent(rooms: { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] }[], marks: DoorMark[]): Set<number> {
  const parent = rooms.map((_, i) => i);
  const find = (a: number): number => {
    let at = a;
    while (parent[at] !== at) {
      parent[at] = parent[parent[at]];
      at = parent[at];
    }
    return at;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };
  const at = new Map<string, number>();
  const cells = new Map<number, number>();
  rooms.forEach((r, i) => {
    const skip = new Set((r.omit ?? []).map((c) => `${c.x},${c.y}`));
    let n = 0;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (skip.has(`${x},${y}`)) continue;
        at.set(`${x},${y}`, i);
        n += 1;
      }
    }
    cells.set(i, n);
  });
  for (const mark of marks) {
    const a = at.get(`${mark.x},${mark.y}`);
    if (a == null) continue;
    const [dx, dy] = STEP[mark.side];
    const b = at.get(`${mark.x + dx},${mark.y + dy}`);
    if (b == null || b === a) continue;
    union(a, b);
  }
  const count = new Map<number, { rooms: number; cells: number }>();
  for (let i = 0; i < rooms.length; i++) {
    const root = find(i);
    const row = count.get(root) ?? { rooms: 0, cells: 0 };
    row.rooms += 1;
    row.cells += cells.get(i) ?? 0;
    count.set(root, row);
  }
  let best = 0;
  let bestRooms = -1;
  let bestCells = -1;
  for (const [root, row] of count) {
    if (row.rooms > bestRooms || (row.rooms === bestRooms && row.cells > bestCells)) {
      best = root;
      bestRooms = row.rooms;
      bestCells = row.cells;
    }
  }
  const main = new Set<number>();
  for (let i = 0; i < rooms.length; i++) if (find(i) === best) main.add(i);
  return main;
}

/**
 * Seat this fight's systems into the traced boxes.
 * A room whose icon is installed keeps that system. Clone Bay and Medbay share one pictured room:
 * INFERRED, the installed one takes the other's box. An icon that did not roll becomes a hall.
 * INFERRED: a system with no icon sits in an empty hall of the largest connected interior,
 * largest hall first, then nearer the nose. A class that rolls more systems than rooms
 * gains a 1×1 past the traced columns. Pictured walls are not given extra doors.
 */
function seatTrace(
  classId: string,
  installed: EnemySystem[],
  pirate = false,
): { rooms: EnemyRoomSpec[]; cols: number; rows: number; marks: DoorMark[] } | null {
  const laid = enemyLayout(classId, pirate);
  if (!laid) return null;
  const have = new Set(installed);
  const taken = new Set<EnemySystem>();
  const claim = (pictured: EnemySystem | null): EnemySystem | null => {
    if (!pictured || taken.has(pictured)) return null;
    if (have.has(pictured)) return pictured;
    if (pictured === "medbay" && have.has("clonebay") && !have.has("medbay")) return "clonebay";
    if (pictured === "clonebay" && have.has("medbay") && !have.has("clonebay")) return "medbay";
    return null;
  };
  let hall = 0;
  const rooms: EnemyRoomSpec[] = laid.rooms.map((r) => {
    const system = claim(r.system);
    const omit = r.omit?.length ? r.omit : undefined;
    const box = { x: r.x, y: r.y, w: r.w, h: r.h, ...(omit ? { omit } : {}) };
    if (!system) return { id: `e-h${hall++}`, title: "Hall", system: null, ...box };
    taken.add(system);
    const kit = KIT[system];
    return { id: `e-${system}`, title: TITLE[system], system: RUN[system] ?? null, ...(kit ? { kit } : {}), ...box };
  });
  const main = mainComponent(rooms, laid.marks);
  const empties = rooms
    .map((room, index) => ({ room, index }))
    .filter((row) => row.room.system == null && row.room.kit == null)
    .sort((a, b) => {
      const ca = main.has(a.index) ? 0 : 1;
      const cb = main.has(b.index) ? 0 : 1;
      return ca - cb || b.room.w * b.room.h - a.room.w * a.room.h || a.room.y - b.room.y || a.room.x - b.room.x;
    });
  let at = 0;
  let cols = laid.cols;
  for (const id of installed) {
    if (taken.has(id)) continue;
    const kit = KIT[id];
    const slot = empties[at++];
    if (slot) {
      slot.room.id = `e-${id}`;
      slot.room.title = TITLE[id];
      slot.room.system = RUN[id] ?? null;
      if (kit) slot.room.kit = kit;
    } else {
      rooms.push({ id: `e-${id}`, title: TITLE[id], system: RUN[id] ?? null, ...(kit ? { kit } : {}), x: cols, y: 0, w: 1, h: 1 });
      cols += 1;
    }
    taken.add(id);
  }
  return { rooms, cols, rows: laid.rows, marks: laid.marks };
}

/**
 * Chance an optional system is fitted. Mathchamp: "Optional systems have a base chance of 20% on Normal, plus 10% per
 * sector. Hard adds an additional 10% while Easy subtracts 10%, but with the Easy sector delay it effectively subtracts
 * 20% (except on sector 1 where the chance is 10%)." Hard agrees with every optional card on ftl-layouts.mikehopley.org
 * ("30% in sector 1, +10% each sector"), which shows Hard.
 */
export function optionalChance(sector: number, difficulty: Difficulty = "normal"): number {
  const shift = difficulty === "hard" ? 0.1 : difficulty === "easy" ? -0.1 : 0;
  return Math.max(0, Math.min(1, 0.2 + 0.1 * (genSector(sector, difficulty) - 1) + shift));
}

const STATION: EnemySystem[] =["pilot", "weapons", "shields", "engines"];

export function rollEnemy(cls: EnemyClass, pirate: boolean, ctx: PoolContext, rand: () => number): EnemySpec {
  const automated = cls.faction === "auto";
  // Mathchamp: "First, it rolls a maximum level for each system. Second, it rolls non-starting systems. Finally, it
  // upgrades systems from a limited budget."
  const caps = new Map<EnemySystem, number>();
  for (const [id, r] of [...Object.entries(cls.systems), ...Object.entries(cls.optional)] as [EnemySystem, Range][]) {
    caps.set(id, rollMaxLevel(r, ctx, rand));
  }
  const levels = new Map<EnemySystem, number>();
  for (const [id, r] of Object.entries(cls.systems) as [EnemySystem, Range][]) levels.set(id, r[0]);
  const row = UPGRADE_BUDGET[ctx.difficulty][Math.max(0, Math.min(7, ctx.sector - 1))];
  const defense = row[1];
  let [offense, , general] = row;
  for (const [id, r] of Object.entries(cls.optional) as [EnemySystem, Range][]) {
    // Faction pages: "[Pirate Fighter only]" fits only the pirate version; "[Rock Investigator only]" and
    // "[Mantis Scout only]" fit only the regular one.
    const only = cls.optionalNotes?.[id];
    if (only && /pirate/i.test(only) !== pirate) continue;
    if (rand() >= optionalChance(ctx.sector, ctx.difficulty)) continue;
    // Mathchamp: installed "at its starting power". "If the optional system is weapons, drone control, or teleporter
    // (not artillery), then it reduces the remaining offensive budget by 1. Other systems reduce the general budget ...
    // 2 on Easy/Normal and 1 on Hard."
    levels.set(id, r[0]);
    if (id === "weapons" || id === "drones" || id === "teleporter") offense -= 1;
    else general -= ctx.difficulty === "hard" ? 1 : 2;
  }
  // Clone Bay: "You can have either a Clone Bay or Medbay installed, not both." The Clone Bay wins when both rolled.
  if (levels.has("clonebay")) levels.delete("medbay");
  // Mathchamp: offensive, then defensive, then "any unspent power bars from the offensive or defensive budget (or ...
  // any negative budget from adding optional systems) is added to the general budget's allocation".
  const offLeft = spendBudget(levels, caps, OFFENSIVE, offense, rand);
  const defLeft = spendBudget(levels, caps, DEFENSIVE, defense, rand);
  spendBudget(levels, caps, null, general + offLeft + defLeft, rand);
  const installed: [EnemySystem, number][] = [...levels.entries()];
  // Pilot first so a lone crew member mans it; then the main systems.
  const rank = (id: EnemySystem) => (STATION.includes(id) ? STATION.indexOf(id) : STATION.length);
  installed.sort((a, b) => rank(a[0]) - rank(b[0]));
  const systems: EnemySpec["systems"] = {};
  const unwired: EnemySpec["unwired"] = [];
  const kits: EnemySpec["kits"] = {};
  for (const [id, level] of installed) {
    const run = RUN[id];
    const kit = KIT[id];
    if (run) systems[run] = [level, level];
    else if (kit) kits[kit] = level;
    else unwired.push({ id, level });
  }
  const ids = installed.map(([id]) => id);
  const traced = seatTrace(cls.id, ids, pirate);
  const { rooms, cols, rows } = traced ?? layout(ids);
  const crewSize = crewCount(cls.crew, ctx);
  const races: string[] = [];
  if (pirate) {
    // Enemy Ships, "Pirated ships": "pirate crews are randomly chosen from the races that can be encountered in that sector".
    // The races are the Sectors page's per-sector "Crewmembers" list (wiki/skills.ts); INFERRED: any race off that list.
    races.push(...rollPirateCrew(ctx.sectorName, crewSize, rand));
  } else {
    for (const [race, lo, hi] of cls.crewMix) {
      const n = lo + Math.floor(rand() * (hi - lo + 1));
      for (let i = 0; i < n && races.length < crewSize; i++) races.push(race);
    }
    while (races.length < crewSize) races.push(cls.crewMix[0]?.[0] ?? "Human");
  }
  const stations = STATION.map((id) => `e-${id}`).filter((id) => rooms.some((r) => r.id === id));
  const others = rooms.map((r) => r.id).filter((id) => !stations.includes(id));
  const crew = races.map((race, i) => ({
    kin: KIN_OF[race] ?? "plain",
    race,
    room: stations[i] ?? others[(i - stations.length) % Math.max(1, others.length)] ?? rooms[0].id,
  }));
  const weaponLevel = systems.weapons?.[0] ?? 1;
  const armed = arm(ENEMY_WEAPON_POOLS[cls.faction] ?? [], weaponLevel, rand);
  const spec: EnemySpec = {
    classId: cls.id,
    name: pirate ? (cls.pirate ?? `Pirate ${cls.name.split(" ").slice(1).join(" ")}`) : cls.name,
    pirate,
    automated,
    hull: hullFor(cls, ctx),
    systems,
    kits,
    unwired,
    // Decision: enemy reactor equals the capacity its systems need, so every installed level is powered.
    reactor: installed.reduce((sum, [, level]) => sum + level, 0),
    rooms,
    cols,
    rows,
    ...(traced ? { marks: traced.marks } : {}),
    weapons: armed.weapons,
    missiles: cls.missiles,
    crew,
    boards: installed.some(([id]) => id === "teleporter"),
    parts: enemyParts(cls.id, 0),
    drones: [],
  };
  // @agent:drones. Mathchamp: drones are generated after weapons and see the weapon flags. Only for a hull with Drone
  // Control.
  if (kits.swarm) {
    spec.drones = rollDrones(cls.id, kits.swarm, rand, armed.flags.laser || armed.flags.hull);
    spec.parts = enemyParts(cls.id, spec.drones.length);
  }
  return spec;
}
