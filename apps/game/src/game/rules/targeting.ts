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
 * - The numbers are gap `<aiTarget easy normal hardRoom hardAny evasion oxygen artillery>` (`@stl/pack`
 *   `aiTarget`). A missing value warns and uses FTL's.
 * - INFERRED: xftl does not print the system_targets list. It is every system type here, so a system the player lacks
 *   turns that roll into a random room, as the quote above says it should.
 * - INFERRED: "Pick a random system" (Hard) draws from the systems installed on the player ship, subsystems included,
 *   since PrioritizeSystem (Hard) "loops through all the systems on the player ship".
 * - INFERRED: every "at random" pick is uniform; xftl gives no weights.
 * - Cloaking, Backup Battery, Crew Teleporter, and the other kits resolve to the player room whose `kit` matches
 *   (layouts.ts seatKits gives every installed kit a room).
 */
import type { Game, KitId, Room, Ship, SysId, WeaponInst } from "../types.ts";
import { evasionPercent, powerMask, rand, zoltanBars } from "../sim.ts";
import { airShown } from "../air.ts";
import { aiTarget, warnPack } from "@stl/pack";
import { isFlakArtillery } from "../wiki/weapons-flak-crystal.ts";

/** A player system as the AI sees it: a core system id or a kit id. */
export type TargetSystem = SysId | KitId;

/** INFERRED: system_targets is every system type (see the header). */
export const SYSTEM_TARGETS: readonly TargetSystem[] = [
  "shields",
  "engines",
  "oxygen",
  "weapons",
  "drones",
  "medbay",
  "pilot",
  "sensors",
  "doors",
  "teleporter",
  "cloaking",
  "artillery",
  "battery",
  "clonebay",
  "mind",
  "hacking",
];

const CORE = new Set<string>([
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "pilot",
  "sensors",
  "doors",
]);

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

/** combat-ai: "average oxygen". INFERRED: a plain mean over rooms (not weighted by size); a hull with no rooms reads full. */
function averageOxygen(ship: Ship): number {
  if (ship.rooms.length === 0) return 100;
  return ship.rooms.reduce((n, r) => n + airShown(r.o2), 0) / ship.rooms.length;
}

/**
 * Seconds of charge on the player artillery kit. Artillery Beam stores a 0..1 fraction of its clock.
 * A flak artillery gun stores seconds. A missing kit never lists.
 */
function artilleryCharge(g: Game): number {
  const kit = g.player.kits.artillery;
  if (!kit) return Infinity;
  if (isFlakArtillery(kit.weapon)) return kit.aux;
  // extras/lance.ts: Artillery Beam charge time is 50 / 40 / 30 / 20 seconds at level 1-4.
  const seconds = [50, 40, 30, 20][Math.max(0, Math.min(3, kit.level - 1))];
  return kit.aux * seconds;
}

/** The Hard high-priority systems that hold right now (combat-ai list). Order follows that list. */
export function priorityList(g: Game): TargetSystem[] {
  const ship = g.player;
  const kits = ship.kits ?? {};
  const out: TargetSystem[] = [];
  // combat-ai, Hard list, one line per entry. Shields: "if powered".
  // Engines, Piloting: ">25% dodge". Oxygen: "average oxygen is <50%". Gap `<aiTarget evasion oxygen>`.
  if (ship.systems.shields.power > 0) out.push("shields");
  if (evasionPercent(g, ship, "player") > aiTarget("evasion")) out.push("engines", "pilot");
  if (averageOxygen(ship) < aiTarget("oxygen")) out.push("oxygen");
  // Weapons, Drones: "if any weapon/drone is powered"; Zoltan bars count (reddit 7pmz3j, header). INFERRED: Drone
  // Control with any power counts as a powered drone.
  if (powerMask(ship, zoltanBars(g.crew, ship, "player", "weapons")).some(Boolean))
    out.push("weapons");
  if (kits.drones && kits.drones.power > 0) out.push("drones");
  // Teleporter: "if the enemy ship has any intruders", i.e. player crew aboard the enemy (Boarding: "when your crew is
  // onboard enemy ship, your Teleporter system will be among the priority targets"). Cloaking: "if not on cooldown,
  // nor active". Artillery: "< 4sec of total charge". Gap `<aiTarget artillery>`.
  if (
    kits.teleporter &&
    g.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0)
  )
    out.push("teleporter");
  if (kits.cloaking && kits.cloaking.cool <= 0 && !(kits.cloaking.on && kits.cloaking.left > 0))
    out.push("cloaking");
  if (kits.artillery && artilleryCharge(g) < aiTarget("artillery")) out.push("artillery");
  // Clonebay: "if crew is being cloned". INFERRED: a dead player crew member with a clone queued (cloneSeq).
  // Mind control: "if active". Hacking: "if drone launched (flying or landed)". Doors: "if there are any intruders or
  // fires". Backup battery: "if active". Sensors: "never", so it is not checked.
  if (kits.clonebay && g.crew.some((c) => c.side === "player" && c.hp <= 0 && c.cloneSeq != null))
    out.push("clonebay");
  if (kits.mind && kits.mind.on && kits.mind.left > 0) out.push("mind");
  if (kits.hacking && g.enemy && (g.enemy.hackDrone != null || g.enemy.hackFlying != null))
    out.push("hacking");
  if (intruders(g) || ship.rooms.some((r) => r.fire > 0)) out.push("doors");
  if (kits.battery && kits.battery.on && kits.battery.left > 0) out.push("battery");
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

/**
 * The Hard shares, gap `<aiTarget hardRoom hardAny>`. Both share one roll, so they can sum past 1.
 * INFERRED: that is malformed data. FTL's order holds: hardRoom keeps its share, hardAny gets what is left, and the
 * priority list gets none. It warns once.
 */
export function hardShares(): { hardRoom: number; hardAny: number } {
  const hardRoom = aiTarget("hardRoom");
  const hardAny = aiTarget("hardAny");
  // A little slack, so shares like 0.33 + 0.67 that round past 1 do not warn.
  if (hardRoom + hardAny <= 1 + 1e-9) return { hardRoom, hardAny };
  const left = Math.max(0, 1 - hardRoom);
  warnPack(
    `aiTarget: hardRoom="${hardRoom}" plus hardAny="${hardAny}" is more than 1; hardAny gets the ${+left.toFixed(4)} left and the Hard priority list none.`,
  );
  return { hardRoom, hardAny: left };
}

/** combat-ai, PrioritizeSystem: the player room one enemy shot aims at, or null for "a random room". */
export function prioritizeSystem(g: Game): string | null {
  const ship = g.player;
  if (g.difficulty !== "hard") {
    // Easy 20%, Normal 33%. Gap `<aiTarget easy normal>`.
    const chance = g.difficulty === "easy" ? aiTarget("easy") : aiTarget("normal");
    if (rand(g) >= chance) return null;
    // INFERRED: uniform over system_targets; an entry the player lacks returns null ("isn't present in the player ship").
    const id = pick(g, SYSTEM_TARGETS);
    return (id && systemRoom(ship, id)?.id) ?? null;
  }
  const roll = rand(g);
  // Hard: 50% no system, 25% any installed system, the rest the priority list. Gap `<aiTarget hardRoom hardAny>`.
  const { hardRoom, hardAny } = hardShares();
  if (roll < hardRoom) return null;
  const any = installedSystems(g);
  // "Pick a high-priority system at random if there is one, otherwise pick a system at random."
  const listed = roll < hardRoom + hardAny ? [] : priorityList(g);
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
