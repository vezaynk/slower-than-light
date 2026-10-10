/**
 * Enemy weapon targeting: which player room an enemy shot (or a boss surge) aims at.
 *
 * Source: the xftl reverse-engineering notes the wiki links from Cloaking and Door System
 * (gitlab.com/znixian/xftl, doc/combat-ai, CombatAI::UpdateWeapons and CombatAI::PrioritizeSystem), checked against
 * the developer list in "Hard mode AI Targeting mechanics" (reddit r/ftlgame 7pmz3j, linked from Guides and tips as
 * "officially confirmed by the devs"). Quoted:
 * - UpdateWeapons: "Pick the number of target rooms - this is one for each projectile that will be fired ... For each
 *   shot, call PrioritizeSystem to pick a system to fire at, or chose a random room if it returns null."
 * - PrioritizeSystem, Easy/Normal: "there's a 33%/20% (for normal/easy respectively) to pick a system to target from the
 *   system_targets list. Otherwise it returns null and a random room is selected ... If the selected target isn't
 *   present in the player ship, this function also returns null".
 * - PrioritizeSystem, Hard: "50%: Don't target a system, return null (a random room is picked) / 25%: Pick a random
 *   system / 25%: Pick a high-priority system at random if there is one, otherwise pick a system at random."
 * - The Hard list (xftl, per system): "Shields: if powered; Engines, Piloting: if ship has >25% dodge; Oxygen: if
 *   average oxygen is <50%; Weapons, Drones: if any weapon/drone is powered; Teleporter: if the enemy ship has any
 *   intruders; Cloaking: if not on cooldown, nor active; Artillery: yes if < 4sec of total charge; Clonebay: if crew is
 *   being cloned; Mind control: if active; Hacking: if drone launched (flying or landed); Doors: if there are any
 *   intruders or fires; Sensors: never; Backup battery: if active".
 * - The reddit tests agree: "Shields and Weapons don't appear to be prioritized when they're not powered", "Cloaking,
 *   when not on cooldown, appears to be prioritized regardless of power status", and "A single level of Zoltan power
 *   appears to be enough to count as being powered".
 * - Artillery: xftl reads the code as "charging for less than four seconds" and calls it faulty; the developers' list
 *   says "Within 4 seconds of firing". This follows the code, as xftl read it.
 * - Beam (Weapons): "Enemies target beams inefficiently, starting the beam in the centre of a room."
 *
 * Gaps:
 * - INFERRED: xftl does not print the system_targets list. It is every system type here, so a system the player lacks
 *   turns that roll into a random room, as the quote above says it should.
 * - "Pick a random system" (Hard) draws from the systems installed on the player ship, subsystems included.
 * - Cloaking, Backup Battery, Crew Teleporter, and the other kits resolve to the player room whose `kit` matches
 *   (layouts.ts seatKits gives every installed kit a room).
 */
import type { Game, KitId, Room, Ship, SysId, WeaponInst } from "../types.ts";
import { evasionPercent, powerMask, rand, zoltanBars } from "../sim.ts";

/** combat-ai, PrioritizeSystem: chance an Easy / Normal shot picks from system_targets. */
export const SYSTEM_CHANCE = { easy: 0.2, normal: 0.33 } as const;
/** combat-ai, PrioritizeSystem (Hard): share of shots that pick no system, and that pick any system. The rest pick the list. */
export const HARD_RANDOM_ROOM = 0.5;
export const HARD_ANY_SYSTEM = 0.25;
/** combat-ai: Engines and Piloting are listed at ">25% dodge". Strictly greater. */
export const EVASION_LINE = 25;
/** combat-ai: Oxygen is listed when "average oxygen is <50%". */
export const OXYGEN_LINE = 50;
/** combat-ai: Artillery is listed with "< 4sec of total charge". */
export const ARTILLERY_LINE = 4;

/** A player system as the AI sees it: a core system id or a kit id. */
export type TargetSystem = SysId | KitId;

/** INFERRED: system_targets is every system type (see the header). */
export const SYSTEM_TARGETS: readonly TargetSystem[] = [
  "shields",
  "engines",
  "oxygen",
  "weapons",
  "swarm",
  "medbay",
  "pilot",
  "sensors",
  "doors",
  "sling",
  "veil",
  "lance",
  "flak",
  "cell",
  "cradle",
  "leash",
  "spike",
];

const CORE = new Set<string>(["shields", "engines", "oxygen", "medbay", "weapons", "pilot", "sensors", "doors"]);

/** The player room holding that system, or undefined when it is not installed. */
export function systemRoom(ship: Ship, id: TargetSystem): Room | undefined {
  if (CORE.has(id)) {
    const sys = ship.systems[id as SysId];
    return (sys?.level ?? 0) > 0 ? ship.rooms.find((r) => r.system === id) : undefined;
  }
  const kit = ship.kits?.[id as KitId];
  return kit && kit.level > 0 ? ship.rooms.find((r) => r.kit === id) : undefined;
}

/** Systems installed on the player ship that have a room. */
export function installedSystems(g: Game): TargetSystem[] {
  return SYSTEM_TARGETS.filter((id) => systemRoom(g.player, id));
}

function intruders(g: Game): boolean {
  return g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
}

function averageOxygen(ship: Ship): number {
  if (ship.rooms.length === 0) return 100;
  return ship.rooms.reduce((n, r) => n + r.o2, 0) / ship.rooms.length;
}

/** Seconds of charge on a player artillery kit (lance stores a 0..1 fraction, flak stores seconds). */
function artilleryCharge(g: Game, id: "lance" | "flak"): number {
  const kit = g.player.kits[id];
  if (!kit) return Infinity;
  if (id === "flak") return kit.aux;
  // extras/lance.ts: Artillery Beam charge time is 50 / 40 / 30 / 20 seconds at level 1-4.
  const seconds = [50, 40, 30, 20][Math.max(0, Math.min(3, kit.level - 1))];
  return kit.aux * seconds;
}

/** The Hard high-priority systems that hold right now (combat-ai list). Order follows that list. */
export function priorityList(g: Game): TargetSystem[] {
  const ship = g.player;
  const kits = ship.kits ?? {};
  const out: TargetSystem[] = [];
  if (ship.systems.shields.power > 0) out.push("shields");
  if (evasionPercent(g, ship, "player") > EVASION_LINE) out.push("engines", "pilot");
  if (averageOxygen(ship) < OXYGEN_LINE) out.push("oxygen");
  if (powerMask(ship, zoltanBars(g.crew, ship, "player", "weapons")).some(Boolean)) out.push("weapons");
  if (kits.swarm && kits.swarm.power > 0) out.push("swarm");
  if (kits.sling && g.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0)) out.push("sling");
  if (kits.veil && kits.veil.cool <= 0 && !(kits.veil.on && kits.veil.left > 0)) out.push("veil");
  for (const id of ["lance", "flak"] as const) if (kits[id] && artilleryCharge(g, id) < ARTILLERY_LINE) out.push(id);
  if (kits.cradle && g.crew.some((c) => c.side === "player" && c.hp <= 0 && c.cloneSeq != null)) out.push("cradle");
  if (kits.leash && kits.leash.on && kits.leash.left > 0) out.push("leash");
  if (kits.spike && g.enemy && (g.enemy.hackDrone != null || g.enemy.hackFlying != null)) out.push("spike");
  if (intruders(g) || ship.rooms.some((r) => r.fire > 0)) out.push("doors");
  if (kits.cell && kits.cell.on && kits.cell.left > 0) out.push("cell");
  return out.filter((id) => systemRoom(ship, id));
}

/** Player rooms on the Hard list right now (deduplicated). Empty on Easy and Normal. */
export function priorityRooms(g: Game): string[] {
  if (g.difficulty !== "hard") return [];
  const ids: string[] = [];
  for (const id of priorityList(g)) {
    const r = systemRoom(g.player, id);
    if (r && !ids.includes(r.id)) ids.push(r.id);
  }
  return ids;
}

function pick<T>(g: Game, list: readonly T[]): T | undefined {
  if (list.length === 0) return undefined;
  return list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
}

/** combat-ai, PrioritizeSystem: the player room one enemy shot aims at, or null for "a random room". */
export function prioritizeSystem(g: Game): string | null {
  const ship = g.player;
  if (g.difficulty !== "hard") {
    const chance = g.difficulty === "easy" ? SYSTEM_CHANCE.easy : SYSTEM_CHANCE.normal;
    if (rand(g) >= chance) return null;
    const id = pick(g, SYSTEM_TARGETS);
    return (id && systemRoom(ship, id)?.id) ?? null;
  }
  const roll = rand(g);
  if (roll < HARD_RANDOM_ROOM) return null;
  const any = installedSystems(g);
  const listed = roll < HARD_RANDOM_ROOM + HARD_ANY_SYSTEM ? [] : priorityList(g);
  const id = pick(g, listed.length > 0 ? listed : any);
  return (id && systemRoom(ship, id)?.id) ?? null;
}

/** Environmental Hazards, ASB: "hitting a random room". Also the room a null PrioritizeSystem falls back to. */
export function randomRoom(g: Game, ship: Ship): string {
  const i = Math.min(ship.rooms.length - 1, Math.floor(rand(g) * ship.rooms.length));
  return ship.rooms[i]?.id ?? ship.rooms[0].id;
}

/**
 * The player room one enemy projectile (or an unarmed enemy volley such as a boss surge, `weapon` null) aims at.
 * combat-ai, UpdateWeapons: PrioritizeSystem first, a random room when it returns null. Called once per shot.
 */
export function enemyTarget(g: Game, _weapon: WeaponInst | null): string {
  // @agent:enemy-sensors. No Sensors check: "Enemy ships ... have all the information about your ship" (Sensors wiki).
  return prioritizeSystem(g) ?? randomRoom(g, g.player);
}
