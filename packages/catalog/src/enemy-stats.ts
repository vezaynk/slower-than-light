/**
 * The stand-in's enemy blueprints, filled in from the faction pages (wiki/enemy-classes.ts) the way ftl.dat's are:
 * each system's starting level and maximum, optional systems as `start="false"`, base health, crew count, missiles,
 * the faction's gun list and the class's drone list. The game generates the ship from these as FTL does (Mathchamp's
 * rules, game enemy-gen.ts), so the faction pages' per-sector ranges come back out:
 *
 * - A system printed "(a-b)" is `power="a" max="b"`. An optional system is the same with `start="false"`.
 * - Hull printed "lo-hi" from sector `s` is `health = lo - (s - 1)`: the game adds one per sector after the first.
 * - Crew printed "lo-hi" is `crewCount amount="lo" max="hi + 1"`: FTL never reaches the maximum by sector 8.
 * - Pirate versions draw their crew at random from the sector (`class="random"`), as ftl.dat's `_P` ships do.
 * - No `minSector`/`maxSector`: the pages' "Encountered in sectors" is where the events place a ship, not a blueprint
 *   limit. ftl.dat uses those tags only to stagger ships within one list (JELLY_BUTTON to 4, JELLY_TRUFFLE from 4).
 *
 * Several classes share one blueprint (Rebel Fighter and Rebel Invader are both REBEL_SKINNY); the base class's row
 * fills it.
 */
import type { BlueprintListDef, HullCrewCount } from "@stl/pack";
import { WEAPONS } from "./content.ts";
import { ENEMY_BLUEPRINTS } from "./enemy-blueprints.ts";
import { CITED_DRONES, DRONE_GUNS } from "./wiki/drone-catalog.ts";
import {
  ENEMY_CLASSES,
  ENEMY_DRONES,
  ENEMY_PARTS_BASELINE,
  ENEMY_WEAPON_POOLS,
  type EnemyClass,
  type Range,
} from "./wiki/enemy-classes.ts";

/** The faction's gun list, named as ftl.dat names its own (WEAPONS_REBEL). */
const WEAPON_LIST: Record<EnemyClass["faction"], string> = {
  rebel: "WEAPONS_REBEL",
  auto: "WEAPONS_AUTO",
  engi: "WEAPONS_CIRCLE",
  mantis: "WEAPONS_MANTIS",
  slug: "WEAPONS_JELLY",
  rock: "WEAPONS_ROCK",
  zoltan: "WEAPONS_ZOLTAN",
  crystal: "WEAPONS_CRYSTAL",
  lanius: "WEAPONS_LANIUS",
  federation: "WEAPONS_FED",
};

/** Faction-page spellings that are not a catalog weapon's own name. */
const WEAPON_ALIASES: Record<string, string> = {
  "heavy laser i": "LASER_HEAVY_1",
  "burst laser mark ii": "LASER_BURST_3",
  "heavy laser mark i": "LASER_HEAVY_1",
  "ion blast mark ii": "ION_4",
  "flak gun i": "SHOTGUN",
  "flak gun ii": "SHOTGUN_2",
};

/** Drone pool keys that are not a drone blueprint id. A key with no stand-in drone is left off the list. */
const DRONE_ALIASES: Record<string, string | null> = {
  beam: "COMBAT_BEAM",
  // BATTLE is an archive alias the game always appends after the drone draw (game enemy-gen.ts rollDrones), past the
  // power the draw allows, so the stand-in leaves the Anti-Personnel Drone off its enemy lists.
  personnel: null,
  // The Anti-Ship Fire Drone has no blueprint in the stand-in.
  fire: null,
};

function normal(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(x\d+\)/g, "")
    .replace(/\(enemy\)/g, "")
    .replace(/\bmk\.?\s*/g, "mark ")
    .replace(/\bmark (i+)\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const WEAPON_BY_NAME = new Map<string, string>();
for (const row of [...Object.values(WEAPONS), ...DRONE_GUNS]) {
  WEAPON_BY_NAME.set(normal(row.name), row.id);
}

function weaponId(name: string): string {
  const key = normal(name);
  const id = WEAPON_ALIASES[name.toLowerCase().trim()] ?? WEAPON_BY_NAME.get(key);
  if (!id)
    throw new Error(
      `faction gun "${name}" is not a catalog weapon (enemy-stats.ts WEAPON_ALIASES)`,
    );
  return id;
}

const DRONE_IDS = new Set(CITED_DRONES.map((row) => row.ref));

function droneId(key: string): string | null {
  if (key in DRONE_ALIASES) return DRONE_ALIASES[key]!;
  if (!DRONE_IDS.has(key))
    throw new Error(`enemy drone "${key}" is not a catalog drone (enemy-stats.ts)`);
  return key;
}

/** Faction-page system names as a blueprint's systemList spells them. */
const INSTALL_ID: Record<string, string> = { mindcontrol: "mindcontrol" };

/** `<crewCount class>` for a faction page's race. */
const CREW_CLASS: Record<string, string> = {
  Human: "human",
  Engi: "engi",
  Mantis: "mantis",
  Slug: "slug",
  Rock: "rock",
  Zoltan: "energy",
  Crystal: "crystal",
  Lanius: "anaerobic",
};

const CLASS_BY_ID = new Map(ENEMY_CLASSES.map((row) => [row.id, row]));

/**
 * The class row and pirate flag for one enemy blueprint. The first ENEMY_BLUEPRINTS row naming it wins: the base class
 * (Mantis Fighter for MANTIS_FIGHTER), whose name ftl.dat gives the blueprint, rather than its Advanced Edition variant.
 */
function classFor(blueprint: string): { cls: EnemyClass; pirate: boolean } | undefined {
  for (const row of ENEMY_BLUEPRINTS) {
    const pirate = row.pirateBlueprint === blueprint;
    if (row.blueprint !== blueprint && !pirate) continue;
    const cls = CLASS_BY_ID.get(row.classId);
    if (cls) return { cls, pirate };
  }
  return undefined;
}

export type EnemyStats = {
  cruiser: string;
  health: number;
  missiles: number;
  parts: number;
  crewCounts: HullCrewCount[];
  /** By system id: [starting level, maximum] and whether it is fitted at the start. */
  systems: Map<string, { range: Range; start: boolean }>;
  weaponLoad: string;
  droneLoad?: string;
  droneCount?: number;
};

/** The pirate version's name: "Pirate Fighter" for Rebel Fighter, unless the page prints one. */
function pirateName(cls: EnemyClass): string {
  return cls.pirate ?? `Pirate ${cls.name.split(" ").slice(1).join(" ")}`;
}

export function enemyStats(blueprint: string): EnemyStats | undefined {
  const found = classFor(blueprint);
  if (!found) return undefined;
  const { cls, pirate } = found;
  const systems = new Map<string, { range: Range; start: boolean }>();
  for (const [id, range] of Object.entries(cls.systems) as [string, Range][]) {
    systems.set(INSTALL_ID[id] ?? id, { range, start: true });
  }
  for (const [id, range] of Object.entries(cls.optional) as [string, Range][]) {
    const only = cls.optionalNotes?.[id as keyof EnemyClass["optional"]];
    if (only && /pirate/i.test(only) !== pirate) continue;
    if (!systems.has(id)) systems.set(INSTALL_ID[id] ?? id, { range, start: false });
  }
  const crewCounts: HullCrewCount[] = [];
  if (cls.crew[1] > 0) {
    const race = pirate ? "random" : CREW_CLASS[cls.crewMix[0]?.[0] ?? "Human"];
    if (!race) throw new Error(`${cls.id}: crew race ${cls.crewMix[0]?.[0]} has no crew class`);
    crewCounts.push({ amount: cls.crew[0], max: cls.crew[1] + 1, class: race });
  }
  const drones = ENEMY_DRONES[cls.id];
  const stats: EnemyStats = {
    cruiser: pirate ? pirateName(cls) : cls.name,
    health: Math.max(1, cls.hull[0] - (cls.sectors[0] - 1)),
    missiles: cls.missiles,
    parts: drones?.parts ?? ENEMY_PARTS_BASELINE,
    crewCounts,
    systems,
    weaponLoad: WEAPON_LIST[cls.faction],
  };
  if (drones) {
    stats.droneLoad = `DRONES_${blueprint}`;
    stats.droneCount = drones.maxDrones;
  }
  return stats;
}

/** The faction gun lists and each drone-flying blueprint's drone list. */
export function enemyGearLists(blueprints: readonly string[]): BlueprintListDef[] {
  const lists: BlueprintListDef[] = Object.entries(WEAPON_LIST).map(([faction, id]) => ({
    id,
    names: [...new Set((ENEMY_WEAPON_POOLS[faction as EnemyClass["faction"]] ?? []).map(weaponId))],
  }));
  for (const blueprint of blueprints) {
    const found = classFor(blueprint);
    const pool = found ? ENEMY_DRONES[found.cls.id] : undefined;
    if (!pool) continue;
    const names = [...new Set(pool.drones.map(droneId).filter((id): id is string => !!id))];
    lists.push({ id: `DRONES_${blueprint}`, names });
  }
  return lists;
}
