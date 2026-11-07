/**
 * Builds an enemy ship from an archive blueprint (specFromHull), and finds the blueprint a fight asks for
 * (fightHull, archiveFight). Generation follows Mathchamp's rules, cited per line; anything marked INFERRED fills a gap.
 * Pure: the caller (sim makeEnemy) turns the spec into rooms, systems, doors, and crew.
 */
import "./pack/base.ts";
import {
  allHulls,
  allShipClasses,
  allShipLists,
  augmentDef,
  blueprintList,
  eventDef,
  fillerList,
  hullDef,
  sectorDef,
  shipAllegiance,
  shipEventDef,
  loadPack,
  marksFromDoors,
  shipClassBlueprint,
  warnPack,
  droneDef,
  weaponDef,
} from "@stl/pack";
import { liveTable } from "./content.ts";
import type {
  AugmentDef,
  EventEffect,
  HullCrewCount,
  HullDef,
  ShipCrewRow,
  ShipWeaponOverride,
  WeaponBlueprint,
} from "@stl/pack";
import type { KinId } from "./extras/kin.ts";
import { crewRandomIds, internalDrones } from "./blueprint-use.ts";
import { flownAs } from "./extras/flown.ts";
import { noteListPlayed } from "./played-lists.ts";
import { pirateCrewRaces, rollPirateCrew } from "./wiki/skills.ts";
import { weaponIdForName } from "./gear-look.ts";
import type { Difficulty, DoorMark, KitId, SysId } from "./types.ts";

/** A system level pair: starting level and blueprint maximum. */
export type Range = [number, number];

export type EnemySystem =
  | "shields"
  | "engines"
  | "oxygen"
  | "weapons"
  | "pilot"
  | "medbay"
  | "doors"
  | "sensors"
  | "drones"
  | "hacking"
  | "cloaking"
  | "teleporter"
  | "clonebay"
  | "mindcontrol"
  | "battery"
  | "artillery";

/** The factions a fight's wording names (requestFor) and the gap's <shipList> rows give a ship. */
export type EnemyFaction =
  | "rebel"
  | "auto"
  | "engi"
  | "mantis"
  | "slug"
  | "rock"
  | "zoltan"
  | "crystal"
  | "lanius"
  | "federation";

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
  /** Augment ids copied from an explicit hull. Absent on a class roll. */
  augments?: string[];
};

/**
 * @agent:drones. Power per enemy drone schematic, Drone Control, each schematic's "Power requirement" line.
 * A shelf blueprint's `<power>` wins. These numbers cover a missing blueprint and the enemy-only schematics.
 * The SwarmKind entries repeat DRONE_POWER in extras/swarm.ts (swarm-enemy.test.ts checks they agree).
 * Kept here so this pure module does not import swarm.ts, which imports sim.ts.
 */
const SCHEMATIC_FALLBACK: Record<string, number> = {
  /** Combat Drone Mark I: "Power requirement: 2 power". */
  COMBAT_1: 2,
  /** Combat Drone Mark II: "Power requirement: 4 power". */
  COMBAT_2: 4,
  /** Anti-Ship Beam Drone I: "Power requirement: 2 power". */
  COMBAT_BEAM: 2,
  /** Anti-Ship Beam Drone II: "Power requirement: 3 power". */
  COMBAT_BEAM_2: 3,
  /** Anti-Ship Fire Drone: "Power requirement: 3 power". */
  fire: 3,
  /** Defense Drone Mark I: "Power requirement: 2 power". */
  DEFENSE_1: 2,
  /** Defense Drone Mark II: "Power requirement: 3 power". */
  DEFENSE_2: 3,
  /** Anti-Combat Drone: "Power requirement: 1 power". */
  ANTI_DRONE: 1,
  /** Shield Overcharger: "Power requirement: 3 power". */
  DRONE_SHIELD: 3,
  /** System Repair Drone: "Power requirement: 1 power". */
  REPAIR: 1,
  /** Anti-Personnel Drone: "Power requirement: 2 power". */
  personnel: 2,
  /** Boarding Drone: "Power requirement: 3 power". */
  BOARDER: 3,
  /** Ion Intruder Drone: "Power requirement: 3 power". */
  BOARDER_ION: 3,
  /**
   * Anti-Personnel Drone. The archive blueprint is BATTLE; the sim id is personnel.
   * Same "Power requirement: 2 power".
   */
  BATTLE: 2,
  /** Defense Drone Mark II on an enemy blueprint. Same 3 power as DEFENSE_2. */
  DEFENSE_2_ENEMY: 3,
  /** Anti-Ship Fire Drone. Same 3 power as fire. */
  COMBAT_FIRE: 3,
  /** Anti-Ship Ion Drone I: "power 2". Flies as a combat drone. */
  COMBAT_ION: 2,
  /** Anti-Ship Missile Drone I: "power 2". Flies as a combat drone. */
  COMBAT_MISSILE: 2,
  /** Flagship Defense Drone Mark II. The archive costs 2 and shoots the Mark I laser. */
  BOSS_DEFENSE_2: 2,
  /** Hacking drone: "power 1". */
  DRONE_HACKING: 1,
};

/** Bars a schematic needs. personnel and the enemy Mark II read the shelf blueprint they fly as. */
export const SCHEMATIC_POWER: Record<string, number> = liveTable(
  Object.keys(SCHEMATIC_FALLBACK),
  (id) => {
    const packed = droneDef(id)?.power;
    if (packed != null) return packed;
    if (id === "personnel") return droneDef("BATTLE")?.power ?? SCHEMATIC_FALLBACK.personnel;
    if (id === "DEFENSE_2_ENEMY")
      return droneDef("DEFENSE_2")?.power ?? SCHEMATIC_FALLBACK.DEFENSE_2_ENEMY;
    return SCHEMATIC_FALLBACK[id];
  },
);

/**
 * Archive blueprint → the sim id that already flies it.
 * Power for an id missing above is that sim id's power (BATTLE → personnel).
 * The fight keeps the archive id; it does not swap in the sim id.
 */
const ARCHIVE_SIM: Record<string, string> = {
  BATTLE: "personnel",
  DEFENSE_2_ENEMY: "DEFENSE_2",
  COMBAT_FIRE: "fire",
  COMBAT_ION: "COMBAT_1",
  COMBAT_MISSILE: "COMBAT_1",
  BOSS_DEFENSE_2: "DEFENSE_1",
  DRONE_HACKING: "REPAIR",
};

function schematicPower(id: string): number {
  const direct = SCHEMATIC_POWER[id] ?? droneDef(id)?.power;
  if (direct != null) return direct;
  const sim = ARCHIVE_SIM[id] ?? flownAs(id);
  if (!sim) return Infinity;
  return SCHEMATIC_POWER[sim] ?? Infinity;
}

/**
 * A listed id appended after the draw rather than drawn: an archive alias, or a schematic the drone code does not
 * name and flies by its droneBlueprint type (extras/flown.ts flownAs), such as ftl.dat's BOARDER_BOSS.
 */
function appendedDrone(id: string): boolean {
  if (ARCHIVE_SIM[id] != null) return ENEMY_RUNNABLE.has(id);
  return !ENEMY_RUNNABLE.has(id) && flownAs(id) != null;
}

/**
 * @agent:drones. Schematics the enemy side of extras/swarm.ts can run.
 * Combat Drone Mark II fires on the orbit leg in swarm.ts (cited-combat2.ts).
 */
export const ENEMY_RUNNABLE = new Set([
  "COMBAT_1",
  "COMBAT_2",
  "COMBAT_BEAM",
  "COMBAT_BEAM_2",
  "fire",
  "DEFENSE_1",
  "DEFENSE_2",
  "ANTI_DRONE",
  "DRONE_SHIELD",
  "REPAIR",
  "personnel",
  "BATTLE",
  "BOARDER",
  "BOARDER_ION",
  "DEFENSE_2_ENEMY",
  "BOSS_DEFENSE_2",
  "COMBAT_FIRE",
  "COMBAT_ION",
  "COMBAT_MISSILE",
  "DRONE_HACKING",
]);

/** The same rule on a blueprint's own `drones` count: at least two parts per drone it fields. */
export function stockedParts(parts: number, drones: number): number {
  return Math.max(parts, drones * 2);
}

/**
 * Combat drones for Mathchamp's flag rule. "a combat drone (the type of weapon on the drone does not matter)": Combat
 * Drone I and II, the Anti-Ship Beam Drones, and the Anti-Ship Fire Drone: the five schematics under Drone Control,
 * "Combat Drones (offensive drones)".
 */
const COMBAT_DRONES = new Set(["COMBAT_1", "COMBAT_2", "COMBAT_BEAM", "COMBAT_BEAM_2", "fire"]);

/**
 * @agent:drones. Which drones this hull fields: the blueprint's droneList, at most its `count`.
 * Mathchamp, "Drone generation has the following rules": the drone "cannot use more power than is available", cannot
 * be 0 power, "If the system is at least level 4, then the drone's power must be strictly less than the total system
 * power", "must not have the same blueprint as an already installed drone", and "If either flag from the weapon
 * generator is still outstanding, the drone must be a combat drone ... and a combat drone will clear the flags." "The
 * last two conditions are soft conditions": a pick that fails them retries with the first three only.
 * Drone Control, "Drone Schematics": "Before the start of a ship fight it is impossible to know the exact drones the
 * enemy ship will deploy" — this list stays hidden; swarm.ts deploys it on the first combat tick.
 */
export function rollDrones(
  classId: string,
  level: number,
  rand: () => number,
  flagsOpen = false,
  listed?: { drones: string[]; maxDrones: number },
): string[] {
  const row = listed;
  if (!row || level <= 0) return [];
  // Archive aliases stay out of the draw so a native schematic is not dropped to make room.
  // A hull that listed one still keeps that id, appended below.
  // Unlisted ships roll a class pool. Internal crew-drones stay out of that draw.
  // A blueprint that named them keeps them.
  const blocked = listed ? undefined : internalDrones();
  const pool = row.drones.filter(
    (id) => ENEMY_RUNNABLE.has(id) && !appendedDrone(id) && !blocked?.has(id),
  );
  const out: string[] = [];
  let open = flagsOpen;
  let left = level;
  while (out.length < row.maxDrones) {
    const hard = pool.filter((id) => {
      const p = schematicPower(id);
      return p >= 1 && p <= left && (level < 4 || p < level);
    });
    const soft = hard.filter((id) => !out.includes(id) && (!open || COMBAT_DRONES.has(id)));
    const fits = soft.length ? soft : hard;
    if (!fits.length) break;
    // INFERRED: uniform among the drones that pass, as Mathchamp's weapon generator gives "equal odds for each entry".
    const id = fits[Math.floor(rand() * fits.length) % fits.length];
    out.push(id);
    left -= schematicPower(id);
    if (COMBAT_DRONES.has(id)) open = false;
  }
  if (listed) {
    for (const id of row.drones) {
      if (!appendedDrone(id) || out.includes(id)) continue;
      out.push(id);
    }
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
  drones: "drones",
  hacking: "hacking",
  cloaking: "cloaking",
  teleporter: "teleporter",
  clonebay: "clonebay",
  mindcontrol: "mind",
  battery: "battery",
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
  Human: "human",
  Engi: "engi",
  Mantis: "mantis",
  Slug: "slug",
  Rock: "rock",
  Zoltan: "energy",
  Crystal: "crystal",
  Lanius: "anaerobic",
  Ghost: "ghost",
};

/** Archive `<systemList>` ids. Mind control's tag is `mind`. */
const FROM_INSTALL: Record<string, EnemySystem> = {
  shields: "shields",
  engines: "engines",
  oxygen: "oxygen",
  weapons: "weapons",
  pilot: "pilot",
  medbay: "medbay",
  doors: "doors",
  sensors: "sensors",
  drones: "drones",
  hacking: "hacking",
  cloaking: "cloaking",
  teleporter: "teleporter",
  clonebay: "clonebay",
  mind: "mindcontrol",
  mindcontrol: "mindcontrol",
  battery: "battery",
  artillery: "artillery",
};

/** `<crewCount class>` ids. A name the class table already prints. */
const RACE_OF: Record<string, string> = {
  human: "Human",
  engi: "Engi",
  mantis: "Mantis",
  slug: "Slug",
  rock: "Rock",
  energy: "Zoltan",
  crystal: "Crystal",
  anaerobic: "Lanius",
  ghost: "Ghost",
};

/** `sectorId` is the ftl.dat sector id; `sectorName` is only for messages. */
export type PoolContext = {
  sector: number;
  sectorId: string;
  sectorName: string;
  difficulty: Difficulty;
};

/** What a fight's wording asks for: one faction, and/or a pirate (archiveFight). */
export type EnemyRequest = {
  faction?: EnemyFaction;
  pirate?: boolean;
};

const FACTION_WORDS: [RegExp, EnemyFaction][] = [
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
  const pirate = /pirate/i.test(tier)
    ? true
    : faction && faction !== "federation"
      ? false
      : undefined;
  return { faction, pirate };
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
  // INFERRED: "between 0 and 1" / "between 0 and 2" read as an integer drawn uniformly, both ends included.
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
  easy: [
    [1, 1, 1],
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 1],
    [4, 5, 2],
    [5, 6, 2],
    [6, 7, 2],
    [7, 8, 3],
  ],
  normal: [
    [1, 2, 1],
    [2, 3, 1],
    [3, 4, 1],
    [4, 5, 2],
    [5, 6, 2],
    [6, 7, 2],
    [7, 8, 3],
    [8, 9, 3],
  ],
  hard: [
    [1, 2, 2],
    [2, 3, 2],
    [3, 4, 2],
    [4, 5, 3],
    [5, 6, 3],
    [6, 7, 3],
    [7, 8, 4],
    [8, 9, 4],
  ],
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
    // INFERRED: "selected at random" read as uniform among the eligible systems.
    const ok = [...levels.keys()].filter(
      (id) => (!allowed || allowed.has(id)) && levels.get(id)! < caps.get(id)!,
    );
    if (!ok.length) break;
    const id = ok[Math.floor(rand() * ok.length) % ok.length];
    levels.set(id, levels.get(id)! + 1);
    left -= 1;
  }
  return left;
}

/**
 * Laser (Weapons), "Laser Charger (S)": "Enemies never use this weapon."
 * Missile (Weapons), Swarm Missiles and Pegasus Missile: "Enemies never use this weapon."
 */
export function enemyMayMount(id: string): boolean {
  return id !== "LASER_CHARGEGUN_PLAYER" && id !== "MISSILE_CHARGEGUN" && id !== "MISSILES_BURST";
}

/** Mathchamp's first flag: "a weapon that is either a LASER, or is a MISSILE with at most 3 shield piercing. In vanilla,
 * this is met by lasers, ions, and crystal weapons." Crystal weapons are lasers in content.ts. */
function laserFlag(id: string): boolean {
  const kind = weaponDef(id)?.kind;
  return kind === "laser" || kind === "ion";
}

/** Mathchamp's second flag: "A weapon that deals normal damage (i.e. hull damage)". Bombs never damage hull (Bomb (Weapons)). */
function hullFlag(id: string): boolean {
  const def = weaponDef(id);
  return !!def && def.damage > 0 && def.kind !== "bomb";
}

/** INFERRED: four weapon slots. Mathchamp stops at "no slots remain"; the faction pages print no slot count. */
export const ENEMY_WEAPON_SLOTS = 4;

export type ArmResult = { weapons: string[]; flags: { laser: boolean; hull: boolean } };

/** A pool entry is a display name or a blueprint id. */
function armId(name: string): string | undefined {
  const titled = weaponIdForName(name);
  if (titled && weaponDef(titled)) return titled;
  return weaponDef(name) ? name : undefined;
}

/**
 * Each seat the blueprint already counted rolls one race from the ship event's crew weights.
 * A race this game cannot spawn is dropped from the roll. Weights are normalized.
 * Returns the display races, or undefined when nothing remains to roll.
 */
export function mixCrewRaces(
  rows: readonly ShipCrewRow[],
  count: number,
  rand: () => number,
  ship: string,
): string[] | undefined {
  const usable: { race: string; prop: number }[] = [];
  for (const row of rows) {
    if (row.race.toLowerCase() === "random") {
      const races = (crewRandomIds() ?? []).flatMap((id) => {
        const race = RACE_OF[id.toLowerCase()];
        return race ? [race] : [];
      });
      if (races.length === 0) {
        warnPack(
          `${ship}: crew type "${row.race}" is not a race the game can spawn; it is dropped from the roll.`,
        );
        continue;
      }
      const share = row.prop / races.length;
      if (!(share > 0)) {
        warnPack(
          `${ship}: crew type "${row.race}" has no positive weight; it is dropped from the roll.`,
        );
        continue;
      }
      for (const race of races) usable.push({ race, prop: share });
      continue;
    }
    const race = RACE_OF[row.race];
    if (!race) {
      warnPack(
        `${ship}: crew type "${row.race}" is not a race the game can spawn; it is dropped from the roll.`,
      );
      continue;
    }
    if (!(row.prop > 0)) {
      warnPack(
        `${ship}: crew type "${row.race}" has no positive weight; it is dropped from the roll.`,
      );
      continue;
    }
    usable.push({ race, prop: row.prop });
  }
  if (count <= 0 || usable.length === 0) return undefined;
  const total = usable.reduce((sum, row) => sum + row.prop, 0);
  const races: string[] = [];
  for (let i = 0; i < count; i++) {
    let roll = rand() * total;
    let picked = usable[usable.length - 1]!.race;
    for (const row of usable) {
      roll -= row.prop;
      if (roll < 0) {
        picked = row.race;
        break;
      }
    }
    races.push(picked);
  }
  return races;
}

/** Replace the seats' races. The seat count and rooms stay. Blueprint races are not added again. */
export function applyCrewMix(
  spec: EnemySpec,
  rows: readonly ShipCrewRow[],
  rand: () => number,
  ship: string,
): void {
  const races = mixCrewRaces(rows, spec.crew.length, rand, ship);
  if (!races) return;
  spec.crew = spec.crew.map((seat, i) => {
    const race = races[i] ?? seat.race;
    return { kin: KIN_OF[race] ?? seat.kin, race, room: seat.room };
  });
}

/**
 * Mount `count` weapons from the override names.
 * Extra names past that count are a draw of that many. Blueprint guns are left off this list.
 */
export function overrideWeaponIds(
  override: ShipWeaponOverride,
  rand: () => number,
  ship: string,
): string[] {
  const known: string[] = [];
  for (const name of override.names) {
    const id = armId(name);
    if (!id) {
      warnPack(`${ship}: weaponOverride names "${name}", which is not a weapon; it is skipped.`);
      continue;
    }
    known.push(id);
  }
  if (known.length === 0 || override.count < 1) return [];
  if (known.length <= override.count) return known;
  const pool = [...known];
  const picked: string[] = [];
  while (picked.length < override.count && pool.length > 0) {
    const index = Math.floor(rand() * pool.length) % pool.length;
    const [id] = pool.splice(index, 1);
    if (id) picked.push(id);
  }
  return picked;
}

/**
 * Mathchamp: "random weapons are generated (with equal odds for each entry ...) until either all power is allocated, no
 * slots remain, or there are no eligible weapons". Each pick must:
 * - "not use more power than is available for the system";
 * - have power "strictly less than the total system power, unless it is 1 power";
 * - "If there are no weapons installed so far and the system is at least level 3, the first weapon must be at least 2 power";
 * - "use greater than (not equal to) 25% of the remaining system power";
 * - while either flag is still set, "satisfy one of the remaining flags".
 * INFERRED: a pool with nothing eligible for a level-1 system still mounts its cheapest gun, so no fight is unarmed.
 * A pool entry is a display name or a blueprint id.
 */
export function arm(
  pool: string[],
  level: number,
  rand: () => number,
  slots = ENEMY_WEAPON_SLOTS,
  /** Mount the cheapest gun when nothing is eligible. Off when guns are already mounted. */
  fallback = true,
): ArmResult {
  const ids = pool.map(armId).filter((id): id is string => !!id && enemyMayMount(id));
  const flags = { laser: true, hull: true };
  const out: string[] = [];
  let left = level;
  while (left > 0 && out.length < slots) {
    const ok = ids.filter((id) => {
      const p = weaponDef(id)!.power;
      if (p > left) return false;
      if (!(p < level || p === 1)) return false;
      if (out.length === 0 && level >= 3 && p < 2) return false;
      if (!(p > 0.25 * left)) return false;
      if (flags.laser || flags.hull)
        return (flags.laser && laserFlag(id)) || (flags.hull && hullFlag(id));
      return true;
    });
    if (!ok.length) break;
    const id = ok[Math.floor(rand() * ok.length) % ok.length];
    out.push(id);
    left -= weaponDef(id)!.power;
    if (laserFlag(id)) flags.laser = false;
    if (hullFlag(id)) flags.hull = false;
  }
  // INFERRED (see above): nothing eligible still mounts the cheapest gun.
  if (fallback && !out.length && ids.length && slots > 0) {
    const cheapest = [...ids].sort((a, b) => weaponDef(a)!.power - weaponDef(b)!.power)[0];
    out.push(cheapest);
  }
  return { weapons: out, flags };
}

/**
 * INFERRED fallback for a class with no traced interior (every class has one now; kept for test hulls).
 * Two rows, one room per installed system.
 */
function layout(installed: EnemySystem[]): { rooms: EnemyRoomSpec[]; cols: number; rows: number } {
  const big = new Set<EnemySystem>([
    "shields",
    "weapons",
    "engines",
    "medbay",
    "clonebay",
    "teleporter",
    "drones",
  ]);
  const rooms: EnemyRoomSpec[] = [];
  const rowX = [0, 0];
  installed.forEach((id, i) => {
    const y = i % 2;
    const w = big.has(id) ? 2 : 1;
    const kit = KIT[id];
    rooms.push({
      id: `e-${id}`,
      title: TITLE[id],
      system: RUN[id] ?? null,
      ...(kit ? { kit } : {}),
      x: rowX[y],
      y,
      w,
      h: 1,
    });
    rowX[y] += w;
  });
  return { rooms, cols: Math.max(rowX[0], rowX[1]), rows: 2 };
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

const STATION: EnemySystem[] = ["pilot", "weapons", "shields", "engines"];

/**
 * Mathchamp's system generation: "First, it rolls a maximum level for each system. Second, it rolls non-starting
 * systems. Finally, it upgrades systems from a limited budget." Each system is (starting level, blueprint maximum):
 * a blueprint's `power` and `max`. `optional` are the systems a blueprint marks `start="false"`.
 * Returned pilot first, so a lone crew member mans it, then the main systems.
 */
export function generateSystems(
  starting: readonly [EnemySystem, Range][],
  optional: readonly [EnemySystem, Range][],
  ctx: PoolContext,
  rand: () => number,
): [EnemySystem, number][] {
  const caps = new Map<EnemySystem, number>();
  for (const [id, r] of [...starting, ...optional]) caps.set(id, rollMaxLevel(r, ctx, rand));
  const levels = new Map<EnemySystem, number>();
  // A starting system begins at its starting level and only the budget raises it (Mathchamp: "upgrades systems from a
  // limited budget").
  for (const [id, r] of starting) levels.set(id, r[0]);
  // UPGRADE_BUDGET holds sectors 1-8, one row each. INFERRED: a sector outside 1-8 uses the nearest row.
  const row = UPGRADE_BUDGET[ctx.difficulty][Math.max(0, Math.min(7, ctx.sector - 1))];
  const defense = row[1];
  let [offense, , general] = row;
  for (const [id, r] of optional) {
    if (rand() >= optionalChance(ctx.sector, ctx.difficulty)) continue;
    // Mathchamp: installed "at its starting power". "If the optional system is weapons, drone control, or teleporter
    // (not artillery), then it reduces the remaining offensive budget by 1. Other systems reduce the general budget ...
    // 2 on Easy/Normal and 1 on Hard."
    levels.set(id, r[0]);
    if (id === "weapons" || id === "drones" || id === "teleporter") offense -= 1;
    else general -= ctx.difficulty === "hard" ? 1 : 2;
  }
  // Clone Bay: "You can have either a Clone Bay or Medbay installed, not both." INFERRED: the Clone Bay wins when both
  // rolled (no source says which the game keeps).
  if (levels.has("clonebay")) levels.delete("medbay");
  // Mathchamp: offensive, then defensive, then "any unspent power bars from the offensive or defensive budget (or ...
  // any negative budget from adding optional systems) is added to the general budget's allocation".
  const offLeft = spendBudget(levels, caps, OFFENSIVE, offense, rand);
  const defLeft = spendBudget(levels, caps, DEFENSIVE, defense, rand);
  spendBudget(levels, caps, null, general + offLeft + defLeft, rand);
  const installed: [EnemySystem, number][] = [...levels.entries()];
  const rank = (id: EnemySystem) => (STATION.includes(id) ? STATION.indexOf(id) : STATION.length);
  installed.sort((a, b) => rank(a[0]) - rank(b[0]));
  return installed;
}

/**
 * FTL ShipGenerator::CreateShip, read from the executable: the crew is `min + (max − min) × min(1, level × 0.125)`,
 * truncated. `level` is StarMap's 0-based world level (sector 1 is 0; AdvanceWorldLevel awards ACH_SECTOR_5 on level
 * 4), one lower on Easy and never below 0. A minimum of 0 is not interpolated. So a 1–3 row is 1 crew through sector 4
 * and 2 from sector 5; the maximum would only arrive in a ninth sector.
 * The game reads one crewCount per ship; no ftl.dat enemy has more than one, so each row is counted this way.
 */
export function blueprintCrew(min: number, max: number | undefined, ctx: PoolContext): number {
  if (max == null || min <= 0) return min;
  const level = genSector(ctx.sector, ctx.difficulty) - 1;
  return Math.trunc(min + (max - min) * Math.min(1, level * 0.125));
}

/**
 * Blueprint crew rows (blueprintCrew). A row with no maximum is that many of the named race. `random` draws from the
 * sector's crew races.
 * A race the game has no crew for, or a `random` row with no races to draw from, is skipped with a warning.
 */
function racesFromCounts(
  ship: string,
  rows: HullCrewCount[],
  ctx: PoolContext,
  rand: () => number,
): string[] {
  const races: string[] = [];
  const randomRaces = pirateCrewRaces(ctx.sectorId);
  for (const row of rows) {
    const n = blueprintCrew(row.amount, row.max, ctx);
    if (n <= 0) continue;
    if (row.class === "random") {
      if (randomRaces.length === 0) {
        warnPack(
          `${ship}: a random crewCount has no races to draw from in ${ctx.sectorName}; it is skipped.`,
        );
        continue;
      }
      for (let i = 0; i < n; i++) {
        races.push(randomRaces[Math.floor(rand() * randomRaces.length) % randomRaces.length]!);
      }
      continue;
    }
    const race = RACE_OF[row.class];
    if (!race) {
      warnPack(
        `${ship}: crewCount class "${row.class}" is not a race the game has crew for; it is skipped.`,
      );
      continue;
    }
    for (let i = 0; i < n; i++) races.push(race);
  }
  return races;
}

/**
 * The blueprint's guns: explicit `<weapon>` tags, and the names in its `load` list.
 * An unknown name is skipped with a warning. That matches FTL: BlueprintManager::GetWeaponBlueprint answers an unknown
 * name with a static `dummy` whose power is 0, and ShipGenerator::GetPossibleWeaponList only keeps a gun with more
 * power than a quarter of what is left, so the dummy is never picked. ftl.dat's WEAPONS_JELLY list names
 * BOMB_BREACH, which the archive never defines; that bomb is installed before the draw.
 */
function weaponNames(hull: HullDef): { fixed: string[]; pool: string[] } | undefined {
  const known = (name: string) => {
    if (weaponDef(name) || weaponIdForName(name)) return true;
    warnPack(`${hull.id}: its weaponList names "${name}", which is not a weapon; it is skipped.`);
    return false;
  };
  const fixed = hull.weapons.filter(known).map((name) => armId(name) ?? name);
  const pool = listNames(hull.id, hull.weaponLoad).filter(known);
  if (!fixed.length && !pool.length) return undefined;
  return { fixed, pool };
}

/**
 * FTL's two steps, read from the executable:
 * ShipManager::CreateArmory mounts the explicit tags in order, up to the weaponList `count`, with no power check and no
 * draw. Every explicit list in ftl.dat has `count` equal to its tags except Ghost Ship Hard, which lists four with
 * count 3, so it mounts the first three.
 * ShipGenerator::CreateShip then runs GetPossibleWeaponList on the `load` list for the slots and power left. Its flags
 * start open and only the drawn guns close them, so the explicit tags do not count toward them.
 */
function blueprintLoadout(
  hull: HullDef,
  listed: { fixed: string[]; pool: string[] },
  level: number,
  rand: () => number,
): ArmResult {
  const fixed = listed.fixed.slice(0, hull.weaponCount ?? listed.fixed.length);
  if (!listed.pool.length) return { weapons: fixed, flags: { laser: true, hull: true } };
  const used = fixed.reduce((sum, id) => sum + (weaponDef(id)?.power ?? 0), 0);
  const slots = Math.max(0, (hull.weaponSlots ?? ENEMY_WEAPON_SLOTS) - fixed.length);
  const drawn = arm(listed.pool, Math.max(0, level - used), rand, slots, fixed.length === 0);
  return { weapons: [...fixed, ...drawn.weapons], flags: drawn.flags };
}

/**
 * Advanced Edition is always on. BlueprintManager replaces a list id with `OVERRIDE_` plus that id when the
 * override list exists, and that override id is the list a draw uses. An id that is already an override is
 * left as-is, so the prefix is not applied twice.
 */
function drawnListId(id: string): string {
  noteListPlayed(id);
  if (id.startsWith("OVERRIDE_")) return id;
  const over = `OVERRIDE_${id}`;
  if (blueprintList(over)) {
    noteListPlayed(over);
    return over;
  }
  return id;
}

/** The first hull of a registry. A reloaded pack copies hulls, so the repair does not carry over. */
const repairedHulls = new WeakSet<object>();

/**
 * ftl.dat's jelly lists name BOMB_BREACH. The archive never defines that weapon.
 * Breach Bomb Mark I is the bomb the game already fires, under the missing id.
 */
function breachBomb(): WeaponBlueprint[] {
  if (weaponDef("BOMB_BREACH")) return [];
  const named =
    blueprintList("WEAPONS_JELLY")?.includes("BOMB_BREACH") === true ||
    blueprintList("OVERRIDE_WEAPONS_JELLY")?.includes("BOMB_BREACH") === true;
  if (!named) return [];
  const mark = weaponDef("BOMB_BREACH_1");
  if (mark) return [{ ...mark, id: "BOMB_BREACH", name: "Breach Bomb" }];
  return [
    {
      id: "BOMB_BREACH",
      name: "Breach Bomb",
      kind: "bomb",
      power: 1,
      charge: 9,
      shots: 1,
      gap: 0,
      damage: 1,
      ion: 0,
      fire: 0,
      breach: 1,
      ammo: true,
      price: 0,
      blurb:
        "Self-teleporting explosive designed to damage systems and causes a breach. Can target your own ship.",
      art: "BOMB_BREACH_1",
    },
  ];
}

/**
 * STARTING_AUGS names these ids. The archive leaves the blueprints commented out, so the
 * records are loaded here with those titles.
 */
function hullArmor(): AugmentDef[] {
  const names = blueprintList("STARTING_AUGS");
  if (names) noteListPlayed("STARTING_AUGS");
  if (!names) return [];
  const rows: AugmentDef[] = [];
  if (names.includes("HULL_ARMOR") && !augmentDef("HULL_ARMOR")) {
    rows.push({
      id: "HULL_ARMOR",
      name: "Reinforced Hull Plating",
      cost: 60,
      detail:
        "Superior hull armor provides a 15 percent chance to negate incoming hull damage (hit systems will still be damaged).",
    });
  }
  if (names.includes("ADV_HULL_ARMOR") && !augmentDef("ADV_HULL_ARMOR")) {
    rows.push({
      id: "ADV_HULL_ARMOR",
      name: "Advanced Hull Plating",
      cost: 100,
      detail:
        "State of the art hull armor provides a massive 25 percent chance to negate incoming hull damage (hit systems will still be damaged).",
    });
  }
  return rows;
}

/** Load list names the archive left commented out. Runs once per loaded registry. */
function repairNamedBlueprints(): void {
  const mark = allHulls()[0];
  if (mark && repairedHulls.has(mark)) return;
  const weapons = breachBomb();
  const augments = hullArmor();
  if (weapons.length > 0 || augments.length > 0) {
    loadPack(
      {
        ...(weapons.length > 0 ? { weapons } : {}),
        ...(augments.length > 0 ? { augments } : {}),
      },
      "append",
    );
  }
  if (mark) repairedHulls.add(mark);
}

/** Names in a `load` list. A load that names no blueprintList is warned about and treated as empty. */
function listNames(ship: string, load: string | undefined): string[] {
  repairNamedBlueprints();
  if (!load) return [];
  const names = blueprintList(drawnListId(load));
  if (!names) {
    warnPack(`${ship}: load="${load}" names no blueprintList; it is treated as empty.`);
    return [];
  }
  return [...names];
}

/** Engi hulls. The faction drone catalog sits beside `WEAPONS_CIRCLE` and is named `DRONES_CIRCLE`. */
function circleShip(hull: HullDef): boolean {
  return hull.layout.toLowerCase().startsWith("circle_") || hull.id.startsWith("CIRCLE_");
}

/**
 * `DRONES_CIRCLE`, or its Advanced Edition override.
 * A circle ship with no drone list of its own fields this catalog.
 * A circle ship that names a list fields the overlap, so an Engi scout's `DRONES_DEFENSE`
 * stays the defensive drones and the combat names in the catalog stay off that ship.
 * If the two lists share nothing, the ship's own list is what it fields.
 */
function circleDroneNames(hull: HullDef, listed: string[]): string[] {
  if (!circleShip(hull)) return listed;
  if (!hull.droneLoad && listed.length > 0) return listed;
  if (!blueprintList("DRONES_CIRCLE") && !blueprintList("OVERRIDE_DRONES_CIRCLE")) return listed;
  const catalog = listNames(hull.id, "DRONES_CIRCLE");
  if (!catalog.length) return listed;
  if (!hull.droneLoad) return catalog;
  const allowed = new Set(catalog);
  const kept = listed.filter((id) => allowed.has(id));
  return kept.length ? kept : listed;
}

/** Explicit drone tags, then the names in droneList load. The count caps how many are fitted. */
function droneNames(hull: HullDef): { drones: string[]; maxDrones: number } | undefined {
  const names = [
    ...(hull.drones ?? []),
    ...circleDroneNames(hull, listNames(hull.id, hull.droneLoad)),
  ];
  if (!names.length) return undefined;
  return { drones: names, maxDrones: hull.droneCount ?? names.length };
}

/**
 * The hull a fight should build instead of rolling a class.
 * A tier that is itself a hull wins. Otherwise `autoBlueprint` is a blueprintList, or a ship
 * blueprint when no list has that id. A list draw skips a hull whose minSector or maxSector
 * excludes `level`. A named ship does not. A name that is neither, and is not already
 * DEFAULT, uses the hull DEFAULT when that hull exists. `level` is
 * `genSector(sector, difficulty) - 1`. Both gates are inclusive. A hull with neither stays eligible.
 */
function hullInSector(hull: HullDef, level: number): boolean {
  if (hull.minSector != null && level < hull.minSector) return false;
  if (hull.maxSector != null && level > hull.maxSector) return false;
  return true;
}

/** The list a fight draws, including its Advanced Edition override. A ship id is not a list. */
function fightList(id: string): readonly string[] | undefined {
  const over = id.startsWith("OVERRIDE_") ? undefined : blueprintList(`OVERRIDE_${id}`);
  if (!over && !blueprintList(id)) return undefined;
  return blueprintList(drawnListId(id));
}

export function fightHull(
  tier: string,
  autoBlueprint: string | undefined,
  rand: () => number,
  level: number,
): HullDef | undefined {
  repairNamedBlueprints();
  const named = hullDef(tier);
  if (named) return named;
  if (!autoBlueprint) return undefined;
  const names = fightList(autoBlueprint);
  if (names) {
    // FTL draws only from the list's ships whose minSector..maxSector allows this sector. Drawing first and then
    // rejecting the ship sent the fight to the wiki class picker, so an ftl.dat fight met a ship ftl.dat never had.
    const hulls = names.map((id) => hullDef(id)).filter((hull): hull is HullDef => !!hull);
    if (hulls.length === 0) {
      warnPack(`blueprintList ${autoBlueprint} names no shipBlueprint; the fight rolls a class.`);
      return undefined;
    }
    const open = hulls.filter((hull) => hullInSector(hull, level));
    if (open.length === 0) {
      warnPack(
        `blueprintList ${autoBlueprint} has no ship for sector level ${level}; it draws from the whole list.`,
      );
    }
    const pool = open.length > 0 ? open : hulls;
    return pool[Math.floor(rand() * pool.length) % pool.length];
  }
  const direct = hullDef(autoBlueprint);
  if (direct) return direct;
  if (autoBlueprint !== "DEFAULT") {
    const fallback = hullDef("DEFAULT");
    if (fallback) return fallback;
  }
  warnPack(`auto_blueprint="${autoBlueprint}" names no blueprintList; the fight rolls a class.`);
  return undefined;
}

/**
 * The blueprint's systems after Mathchamp's generation (generateSystems): each system's `power` is its starting level
 * and `max` its blueprint maximum; a `start="false"` system is optional. ftl.dat's REBEL_SKINNY shields are
 * power 2, max 8, so they rise with the sector instead of staying at 2.
 */
function installedSystems(
  hull: HullDef,
  ctx: PoolContext,
  rand: () => number,
): [EnemySystem, number][] {
  const starting = new Map<EnemySystem, Range>();
  const optional = new Map<EnemySystem, Range>();
  for (const item of hull.installs ?? []) {
    if (item.power < 1) continue;
    const id = FROM_INSTALL[item.id];
    if (!id) {
      warnPack(`${hull.id}: system "${item.id}" is not a system this fight runs; it is skipped.`);
      continue;
    }
    const range: Range = [item.power, Math.max(item.power, item.max ?? item.power)];
    const into = item.start ? starting : optional;
    const prev = into.get(id);
    into.set(id, prev ? [Math.max(prev[0], range[0]), Math.max(prev[1], range[1])] : range);
  }
  for (const id of starting.keys()) optional.delete(id);
  return generateSystems([...starting], [...optional], ctx, rand);
}

/**
 * The system a blueprint room holds. With `fitted`, the one of that room's installs the generation fitted (an optional
 * system, or one of a Medbay and Clone Bay that share a room); without it, the starting install.
 */
function systemInRoom(
  hull: HullDef,
  index: number,
  fitted?: ReadonlySet<EnemySystem>,
): EnemySystem | null {
  const rows = (hull.installs ?? []).filter((row) => row.room === index && row.power >= 1);
  const ids = rows.map((row) => FROM_INSTALL[row.id]).filter((id): id is EnemySystem => !!id);
  if (fitted) return ids.find((id) => fitted.has(id)) ?? null;
  const start = rows.find((row) => row.start);
  return start ? (FROM_INSTALL[start.id] ?? null) : null;
}

function emptyHall(): { rooms: EnemyRoomSpec[]; cols: number; rows: number } {
  return {
    rooms: [{ id: "e-h0", title: "Hall", system: null, x: 0, y: 0, w: 1, h: 1 }],
    cols: 1,
    rows: 1,
  };
}

/** The blueprint's own rooms. A hull with no grid uses the same fallback as a class with no interior. */
function seatHull(
  hull: HullDef,
  installed: [EnemySystem, number][],
): { rooms: EnemyRoomSpec[]; cols: number; rows: number; marks?: DoorMark[] } {
  const ids = installed.map(([id]) => id);
  const grid = hull.grid;
  const boxes = grid?.rooms.filter((room) => room.w > 0 || room.h > 0) ?? [];
  if (!grid || boxes.length === 0) return ids.length ? layout(ids) : emptyHall();
  const have = new Set(ids);
  const taken = new Set<EnemySystem>();
  let hall = 0;
  const rooms: EnemyRoomSpec[] = boxes.map((room) => {
    const pictured = systemInRoom(hull, room.id, have);
    const system = pictured && have.has(pictured) && !taken.has(pictured) ? pictured : null;
    const box = { x: room.x, y: room.y, w: Math.max(1, room.w), h: Math.max(1, room.h) };
    if (!system) return { id: `e-h${hall++}`, title: "Hall", system: null, ...box };
    taken.add(system);
    const kit = KIT[system];
    return {
      id: `e-${system}`,
      title: TITLE[system],
      system: RUN[system] ?? null,
      ...(kit ? { kit } : {}),
      ...box,
    };
  });
  let cols = grid.cols ?? 1;
  let rows = grid.rows ?? 1;
  for (const room of rooms) {
    cols = Math.max(cols, room.x + room.w);
    rows = Math.max(rows, room.y + room.h);
  }
  for (const id of ids) {
    if (taken.has(id)) continue;
    const kit = KIT[id];
    rooms.push({
      id: `e-${id}`,
      title: TITLE[id],
      system: RUN[id] ?? null,
      ...(kit ? { kit } : {}),
      x: cols,
      y: 0,
      w: 1,
      h: 1,
    });
    cols += 1;
  }
  if (rooms.length === 0) return emptyHall();
  const marks = grid.doors.length > 0 ? marksFromDoors(grid) : undefined;
  return { rooms, cols, rows, ...(marks ? { marks } : {}) };
}

/**
 * One explicit hull: its weapons, drones, crew counts, augments, and installed systems.
 * This does not roll a class on top. An empty crew is an automated ship.
 */
/**
 * The name an enemy blueprint shows. ftl.dat's enemy ships carry no `<name>`, only `<class>` (REBEL_SKINNY is
 * "Rebel Fighter", ROCK_FIGHT_P "Pirate Fighter"), and the reader falls back to the id for a missing name.
 * Per the user: the class text, so a fight off a blueprint list is named like one off the class picker.
 */
export function hullDisplayName(hull: Pick<HullDef, "id" | "name" | "cruiser">): string {
  const name = hull.name.trim();
  if (name && name !== hull.id) return name;
  return hull.cruiser.trim() || name || hull.id;
}

/**
 * Hull by sector: the blueprint's health plus one per sector after the first, one lower on Easy. The faction
 * pages' ranges are this rule on ftl.dat's health: REBEL_SKINNY 10 is "10-17" over sectors 1-8, CIRCLE_SCOUT 7 is
 * "8-13" over sectors 2-7, ROCK_ASSAULT 12 is "17-18" in sectors 6-7, and each "(x-y on Easy)" is one lower.
 */
export function blueprintHull(hull: Pick<HullDef, "health">, ctx: PoolContext): number {
  const base = hull.health != null && hull.health > 0 ? hull.health : 1;
  // Easy is one lower in every sector, sector 1 included ("(9-16 on Easy)" for 10-17), not the clamped sector delay.
  return Math.max(1, base + ctx.sector - 1 - (ctx.difficulty === "easy" ? 1 : 0));
}

export function specFromHull(hull: HullDef, ctx: PoolContext, rand: () => number): EnemySpec {
  const installed = installedSystems(hull, ctx, rand);
  const seated = seatHull(hull, installed);
  const systems: EnemySpec["systems"] = {};
  const kits: EnemySpec["kits"] = {};
  const unwired: EnemySpec["unwired"] = [];
  let reactor = 0;
  for (const [id, level] of installed) {
    reactor += level;
    const run = RUN[id];
    const kit = KIT[id];
    if (run) systems[run] = [level, level];
    else if (kit) kits[kit] = level;
    else unwired.push({ id, level });
  }
  const races = hull.crewCounts?.length ? racesFromCounts(hull.id, hull.crewCounts, ctx, rand) : [];
  const rooms = seated.rooms;
  const stations = STATION.map((id) => `e-${id}`).filter((id) =>
    rooms.some((room) => room.id === id),
  );
  const others = rooms.map((room) => room.id).filter((id) => !stations.includes(id));
  const crew = races.map((race, i) => ({
    kin: KIN_OF[race] ?? "human",
    race,
    room: stations[i] ?? others[(i - stations.length) % Math.max(1, others.length)] ?? rooms[0]!.id,
  }));
  const listed = weaponNames(hull);
  const weaponLevel = systems.weapons?.[0] ?? 1;
  const armed = listed
    ? blueprintLoadout(hull, listed, weaponLevel, rand)
    : { weapons: [] as string[], flags: { laser: true, hull: true } };
  const spec: EnemySpec = {
    classId: hull.id,
    name: hullDisplayName(hull),
    pirate: false,
    automated: crew.length === 0,
    hull: blueprintHull(hull, ctx),
    systems,
    kits,
    unwired,
    reactor,
    rooms,
    cols: seated.cols,
    rows: seated.rows,
    ...(seated.marks ? { marks: seated.marks } : {}),
    weapons: armed.weapons,
    missiles: hull.missiles,
    crew,
    boards: installed.some(([id]) => id === "teleporter"),
    parts: hull.parts,
    drones: [],
    ...(hull.augments.length ? { augments: [...hull.augments] } : {}),
  };
  if (kits.drones) {
    spec.drones = rollDrones(
      hull.id,
      kits.drones,
      rand,
      armed.flags.laser || armed.flags.hull,
      droneNames(hull),
    );
    spec.parts = stockedParts(hull.parts, spec.drones.length);
  }
  return spec;
}

/**
 * A fight the code names by wording ("Rebel ship", "Slug pirate ship", "Fight a Mantis Bomber"), or the sector's
 * random fight ("pool"), turned into the archive ship it is. The archive is the source: the gap's <shipList> rows say
 * which list fields a faction or pirates, and a named class is the blueprint whose `<class>` name it is.
 * `list` is the blueprint list the ship came from, for its allegiance (shipAllegiance).
 */
export type ArchiveFight = { hull: HullDef; list?: string };

export function archiveFight(
  tier: string,
  ctx: PoolContext,
  rand: () => number,
): ArchiveFight | undefined {
  const level = genSector(ctx.sector, ctx.difficulty) - 1;
  if (tier !== "pool") {
    const named = namedHull(tier);
    if (named) return { hull: named };
    const want = requestFor(tier);
    if (want.faction || want.pirate != null) {
      const fight = requestedFight(want, rand, level);
      if (fight) return fight;
    }
  }
  return sectorFight(ctx, rand, level);
}

/** Any enemy blueprint, for a fight whose wording and sector name none (a warned last resort in sim makeEnemy). */
export function anyEnemyHull(rand: () => number): HullDef | undefined {
  const hulls = enemyHulls();
  return hulls.length ? hulls[Math.floor(rand() * hulls.length) % hulls.length] : undefined;
}

/** Enemy blueprints the archive lists or maps a class to. A player hull is not one. */
export function enemyHulls(): HullDef[] {
  const ids = new Set<string>();
  for (const rule of allShipLists()) for (const id of blueprintList(rule.id) ?? []) ids.add(id);
  for (const row of allShipClasses()) {
    ids.add(row.blueprint);
    if (row.pirate) ids.add(row.pirate);
  }
  return [...ids].map((id) => hullDef(id)).filter((hull): hull is HullDef => !!hull);
}

/** "Fight a Mantis Bomber": the enemy blueprint whose class name the wording holds, longest name first. */
function namedHull(tier: string): HullDef | undefined {
  const text = tier.toLowerCase();
  const pirate = /pirate/i.test(tier);
  let best: HullDef | undefined;
  for (const hull of enemyHulls()) {
    const name = hullDisplayName(hull).toLowerCase();
    if (name === hull.id.toLowerCase() || !text.includes(name)) continue;
    if (!best || name.length > hullDisplayName(best).length) best = hull;
  }
  if (!best || !pirate || shipAllegiance(best.id).pirate) return best;
  // "Slug Assault pirate ship": the class's pirate version, as the gap's <shipClass> pairs them.
  const row = allShipClasses().find((item) => item.blueprint === best!.id && item.pirate);
  return (row?.pirate ? hullDef(row.pirate) : undefined) ?? best;
}

/** A faction and/or pirate request, drawn from the list the gap's <shipList> rows give it. */
function requestedFight(
  want: EnemyRequest,
  rand: () => number,
  level: number,
): ArchiveFight | undefined {
  const rules = allShipLists();
  const own = rules.find(
    (rule) => rule.faction === want.faction && !!rule.pirate === (want.pirate === true),
  );
  // Pirates of a faction with no list of its own: the pirate list, narrowed to that faction's ships.
  const rule =
    own ??
    (want.pirate ? rules.find((item) => item.pirate && !item.faction) : undefined) ??
    (want.faction
      ? rules.find((item) => item.faction === want.faction && !item.pirate)
      : undefined);
  if (!rule) return undefined;
  const hulls = (blueprintList(rule.id) ?? [])
    .map((id) => hullDef(id))
    .filter((hull): hull is HullDef => !!hull)
    .filter(
      (hull) => own || !want.faction || shipAllegiance(hull.id, rule.id).faction === want.faction,
    );
  const hull = drawHull(hulls, level, rand);
  return hull ? { hull, list: rule.id } : undefined;
}

function drawHull(
  hulls: readonly HullDef[],
  level: number,
  rand: () => number,
): HullDef | undefined {
  if (hulls.length === 0) return undefined;
  const open = hulls.filter((hull) => hullInSector(hull, level));
  const pool = open.length > 0 ? open : hulls;
  return pool[Math.floor(rand() * pool.length) % pool.length];
}

/** Ship fights on a page and its choices: `<ship load>` effects. */
function pageFights(
  fx: readonly EventEffect[] | undefined,
  out: { tier: string; list?: string }[],
) {
  for (const row of fx ?? []) {
    if (row.k === "fight")
      out.push({ tier: row.tier, ...(row.autoBlueprint ? { list: row.autoBlueprint } : {}) });
  }
}

/**
 * The sector's random fight: one ship off the fights its own event lists hold, as a hostile beacon there would meet.
 * Each fight counts once per page that holds it.
 */
function sectorFight(
  ctx: PoolContext,
  rand: () => number,
  level: number,
): ArchiveFight | undefined {
  const fights: { tier: string; list?: string }[] = [];
  const seen = new Set<string>();
  const visit = (id: string, depth: number) => {
    if (depth > 3 || seen.has(id)) return;
    seen.add(id);
    const list = fillerList(id);
    if (list) {
      for (const entry of list.entries) visit(entry.id, depth + 1);
      return;
    }
    const page = eventDef(id);
    if (!page) return;
    pageFights(page.fx, fights);
    for (const choice of page.choices) pageFights(choice.fx, fights);
  };
  for (const quota of sectorDef(ctx.sectorId)?.quotas ?? []) visit(quota.id, 0);
  const ships = fights.filter(
    (row) => !/flagship/i.test(row.tier) && (shipEventDef(row.tier) || hullDef(row.tier)),
  );
  if (ships.length === 0) return undefined;
  const pick = ships[Math.floor(rand() * ships.length) % ships.length]!;
  const list = pick.list ?? shipEventDef(pick.tier)?.autoBlueprint;
  const hull = fightHull(pick.tier, list, rand, level);
  return hull ? { hull, ...(list ? { list } : {}) } : undefined;
}
