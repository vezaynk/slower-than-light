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
import type { Difficulty, KitId, SysId } from "./types.ts";
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

export type EnemyRoomSpec = { id: string; title: string; system: SysId | null; kit?: KitId; x: number; y: number; w: number; h: number };

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
 * @agent:drones. Which drones this hull fields. Allowed schematics: Template:Enemy ships drones (ENEMY_DRONES).
 * Count cap: that row's max parts column ("# of drones ×2"), halved.
 * INFERRED: the wiki does not say how an enemy picks among its allowed schematics. Each slot draws uniformly from
 * the runnable schematics that still fit the Drone Control level, until the cap or nothing fits. Repeats allowed.
 * Drone Control, "Drone Schematics": "Before the start of a ship fight it is impossible to know the exact drones the
 * enemy ship will deploy" — this list stays hidden; swarm.ts deploys it on the first combat tick.
 */
export function rollDrones(classId: string, level: number, rand: () => number): string[] {
  const row = ENEMY_DRONES[classId];
  if (!row || level <= 0) return [];
  const pool = row.drones.filter((id) => ENEMY_RUNNABLE.has(id));
  const out: string[] = [];
  let left = level;
  while (out.length < row.maxDrones) {
    const fits = pool.filter((id) => (SCHEMATIC_POWER[id] ?? Infinity) <= left);
    if (!fits.length) break;
    const id = fits[Math.floor(rand() * fits.length) % fits.length];
    out.push(id);
    left -= SCHEMATIC_POWER[id];
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
    if (ctx.sector < cls.sectors[0] || ctx.sector > cls.sectors[1]) continue;
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

/**
 * INFERRED: Enemy Ships says ships "become more powerful with each new sector" but prints only the
 * overall range. A value is placed by sector (1 → low end, 8 → high end), give or take one.
 */
function roll(r: Range, sector: number, rand: () => number): number {
  const [lo, hi] = r;
  const t = Math.min(1, Math.max(0, (sector - 1) / 7));
  const v = Math.round(lo + (hi - lo) * t + (rand() * 2 - 1));
  return Math.max(lo, Math.min(hi, v));
}

/** Laser (Weapons), "Laser Charger (S)": "Enemies never use this weapon." */
export function enemyMayMount(id: string): boolean {
  return id !== "chargers";
}

/** Enemy weapon list from the faction pool, filling weapon power without going over. INFERRED: at most 4 guns. */
function arm(pool: string[], power: number, rand: () => number): string[] {
  const ids = pool
    .map((n) => weaponIdForName(n))
    .filter((id): id is string => !!id && !!WEAPONS[id] && enemyMayMount(id));
  const order = [...ids].sort(() => rand() - 0.5);
  const out: string[] = [];
  let left = power;
  for (const id of order) {
    if (out.length >= 4) break;
    if (!enemyMayMount(id)) continue;
    const cost = WEAPONS[id].power;
    if (cost <= left) {
      out.push(id);
      left -= cost;
    }
  }
  if (!out.length && ids.length) {
    const cheapest = [...ids].sort((a, b) => WEAPONS[a].power - WEAPONS[b].power)[0];
    out.push(cheapest);
  }
  return out;
}

/** INFERRED layout: the pages show layouts only as pictures. Two rows of rooms, one per installed system. */
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

const STATION: EnemySystem[] = ["pilot", "weapons", "shields", "engines"];

export function rollEnemy(cls: EnemyClass, pirate: boolean, ctx: PoolContext, rand: () => number): EnemySpec {
  const automated = cls.faction === "auto";
  const installed: [EnemySystem, number][] = [];
  for (const [id, r] of Object.entries(cls.systems) as [EnemySystem, Range][]) installed.push([id, roll(r, ctx.sector, rand)]);
  for (const [id, r] of Object.entries(cls.optional) as [EnemySystem, Range][]) {
    const only = cls.optionalNotes?.[id];
    // Rebel Ships: "[Pirate Fighter only]" and similar notes.
    if (only && /pirate/i.test(only) && !pirate) continue;
    // INFERRED: an optional system is fitted half the time.
    if (rand() < 0.5) installed.push([id, roll(r, ctx.sector, rand)]);
  }
  // Clone Bay: "You can have either a Clone Bay or Medbay installed, not both." The Clone Bay wins when both rolled.
  if (installed.some(([id]) => id === "clonebay")) {
    const at = installed.findIndex(([id]) => id === "medbay");
    if (at >= 0) installed.splice(at, 1);
  }
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
  const { rooms, cols, rows } = layout(installed.map(([id]) => id));
  const hullRange = ctx.difficulty === "easy" && cls.easyHull ? cls.easyHull : cls.hull;
  const crewCount = roll(cls.crew, ctx.sector, rand);
  const races: string[] = [];
  if (pirate) {
    // Enemy Ships, "Pirated ships": "pirate crews are randomly chosen from the races that can be encountered in that sector".
    // The races are the Sectors page's per-sector "Crewmembers" list (wiki/skills.ts); INFERRED: any race off that list.
    races.push(...rollPirateCrew(ctx.sectorName, crewCount, rand));
  } else {
    for (const [race, lo, hi] of cls.crewMix) {
      const n = lo + Math.floor(rand() * (hi - lo + 1));
      for (let i = 0; i < n && races.length < crewCount; i++) races.push(race);
    }
    while (races.length < crewCount) races.push(cls.crewMix[0]?.[0] ?? "Human");
  }
  const stations = STATION.map((id) => `e-${id}`).filter((id) => rooms.some((r) => r.id === id));
  const others = rooms.map((r) => r.id).filter((id) => !stations.includes(id));
  const crew = races.map((race, i) => ({
    kin: KIN_OF[race] ?? "plain",
    race,
    room: stations[i] ?? others[(i - stations.length) % Math.max(1, others.length)] ?? rooms[0].id,
  }));
  const weaponLevel = systems.weapons?.[0] ?? 1;
  const spec: EnemySpec = {
    classId: cls.id,
    name: pirate ? (cls.pirate ?? `Pirate ${cls.name.split(" ").slice(1).join(" ")}`) : cls.name,
    pirate,
    automated,
    hull: roll(hullRange, ctx.sector, rand),
    systems,
    kits,
    unwired,
    // Decision: enemy reactor equals the capacity its systems need, so every installed level is powered.
    reactor: installed.reduce((sum, [, level]) => sum + level, 0),
    rooms,
    cols,
    rows,
    weapons: arm(ENEMY_WEAPON_POOLS[cls.faction] ?? [], weaponLevel, rand),
    missiles: cls.missiles,
    crew,
    boards: installed.some(([id]) => id === "teleporter"),
    parts: enemyParts(cls.id, 0),
    drones: [],
  };
  // @agent:drones. Rolled after every other roll, and only for a hull with Drone Control, so the rest of the spec
  // draws the same numbers it did before drones existed.
  if (kits.swarm) {
    spec.drones = rollDrones(cls.id, kits.swarm, rand);
    spec.parts = enemyParts(cls.id, spec.drones.length);
  }
  return spec;
}
