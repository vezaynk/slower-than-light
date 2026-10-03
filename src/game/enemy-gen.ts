/**
 * Picks a documented enemy class for the current sector and rolls one ship from it.
 * Data: wiki/enemy-ships.ts (faction pages). Rules are cited per line; anything marked
 * INFERRED fills a gap the pages leave (they print ranges, not how a sector picks inside them).
 * Pure: the caller (sim makeEnemy) turns the spec into rooms, systems, doors, and crew.
 */
import { WEAPONS } from "./content.ts";
import type { KinId } from "./extras/kin.ts";
import { weaponIdForName } from "./gear-look.ts";
import type { Difficulty, KitId, SysId } from "./types.ts";
import { ENEMY_CLASSES, ENEMY_WEAPON_POOLS, type EnemyClass, type EnemySystem, type Range } from "./wiki/enemy-ships.ts";

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
};

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
const KIN_NAME: Record<KinId, string> = {
  plain: "Human",
  shell: "Engi",
  blade: "Mantis",
  gel: "Slug",
  stone: "Rock",
  spark: "Zoltan",
  shard: "Crystal",
  voidlung: "Lanius",
};

export type PoolContext = { sector: number; sectorName: string; difficulty: Difficulty };

/** What a fight asks for: any ship in the sector pool, or one faction, and/or a pirate. */
export type EnemyRequest = { faction?: EnemyClass["faction"]; pirate?: boolean; event?: string };

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
  return { faction, pirate };
}

/** Enemy Ships, "Pirated ships": Engi, Lanius, and Crystal have no pirate versions; Federation is only fought as pirates. */
function canBePirate(c: EnemyClass) {
  return !!c.pirate || c.faction === "federation";
}

function fleetOnly(c: EnemyClass) {
  // Rebel Ships, Elite Fighter / Elite Assault: "at beacons overtaken by the Rebel Fleet".
  return /overtaken by the Rebel Fleet/i.test(c.where ?? "");
}

/**
 * Classes a normal hostile beacon can field in this sector, each as regular and/or pirate.
 * Sector 1: wiki "Sectors", Civilian (Starting) Sector lists the HOSTILE_CIVILIAN and HOSTILE1 event lists,
 * whose fights are Rebel, Auto-ship, Mantis, and Pirate ships only.
 */
export function enemyPool(ctx: PoolContext): { cls: EnemyClass; pirate: boolean }[] {
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

/** INFERRED: the wiki gives no faction mix per sector. A sector named for a faction favours that faction ×3. */
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
  const fits = (e: { cls: EnemyClass; pirate: boolean }) =>
    (!want.faction || e.cls.faction === want.faction) && (want.pirate == null || e.pirate === want.pirate);
  let pool = enemyPool(ctx).filter(fits);
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
  const weights = pool.map((e) => weight(e, ctx.sectorName));
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

/** Enemy weapon list from the faction pool, filling weapon power without going over. INFERRED: at most 4 guns. */
function arm(pool: string[], power: number, rand: () => number): string[] {
  const ids = pool.map((n) => weaponIdForName(n)).filter((id): id is string => !!id && !!WEAPONS[id]);
  const order = [...ids].sort(() => rand() - 0.5);
  const out: string[] = [];
  let left = power;
  for (const id of order) {
    if (out.length >= 4) break;
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
    // INFERRED: any race.
    const kins = Object.keys(KIN_NAME) as KinId[];
    for (let i = 0; i < crewCount; i++) races.push(KIN_NAME[kins[Math.floor(rand() * kins.length) % kins.length]]);
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
  return {
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
  };
}
