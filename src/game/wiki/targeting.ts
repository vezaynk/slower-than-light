/**
 * Enemy weapon targeting: which player room an enemy gun (or a boss surge) aims at.
 *
 * Wiki sources, quoted:
 * - Piloting, Overview: "Having >25% evasion, when playing on Hard difficulty, puts Piloting (and Engines too) on
 *   the enemy high-priority system targeting list."
 * - Door System, Overview: "Having boarders or fires on your ship, when playing on Hard difficulty, puts Door System
 *   on the enemy high-priority system targeting list."
 * - Backup Battery, Overview: "Activating the Backup Battery, when playing on Hard difficulty, puts it on the enemy
 *   high-priority system targeting list."
 * - Cloaking, "Enemy AI and Cloaking": "If playing on Hard difficulty, your cloaking system, when not on cooldown, can
 *   become one of the priority target systems for the enemy."
 * - Cloaking, tactics: "putting some systems on the enemy targeting priority list by powering them on or other means,
 *   depending on the system - works only on Hard difficulty".
 * - Boarding: "On Hard game difficulty, when your crew is onboard enemy ship, your Teleporter system will be among the
 *   priority targets for enemy weapons."
 * - Beam (Weapons): "Enemies target beams inefficiently, starting the beam in the centre of a room." sim.ts beamRooms
 *   already starts the swipe in the aimed room, so enemy beams need nothing extra here.
 * - Cloaking: "the AI fires weapons as soon as they are ready". Environmental Hazards, Anti-Ship Batteries: the shot
 *   hits "a random room".
 * Those pages link the xftl "combat-ai" doc and a reddit post for detail; neither is in the wiki dump, so the
 * numbers below are not from them.
 *
 * Gaps:
 * - INFERRED: Easy and Normal (and Hard when the list is empty or not rolled) aim at a uniformly random player room,
 *   systems and empty rooms alike. The wiki gives no Easy/Normal rule; the list "works only on Hard difficulty", and
 *   Cloaking advises to "take hull damage on unimportant systems or empty rooms", so empty rooms do get hit.
 * - INVENTED: on Hard, a volley aims at the priority list PRIORITY_CHANCE of the time, uniformly among listed rooms.
 *   The wiki names the list but not how often it is used.
 * - INFERRED: Cloaking "when not on cooldown" also needs the cloak powered ("by powering them on").
 * - INFERRED: "boarders" are living enemy crew aboard the player hull; enemy boarding drones are not counted.
 * - INFERRED: an enemy gun picks a new room for every volley, at the moment it fires (sim.ts chargeSide). The wiki
 *   does not say when the AI re-targets.
 * - Cloaking, Backup Battery, and Crew Teleporter resolve to the player room whose `kit` matches (layouts.ts
 *   seatKits gives every installed kit a room); an entry with no such room is skipped.
 */
import type { Game, Room, Ship, SysId, WeaponInst } from "../types.ts";
import { evasionPercent, rand } from "../sim.ts";

/** INVENTED: share of Hard-difficulty volleys aimed at the priority list when it is not empty. */
export const PRIORITY_CHANCE = 0.5;
/** Piloting, Overview: "Having >25% evasion". Strictly greater. */
export const EVASION_LINE = 25;

export type PriorityEntry = "pilot" | "engines" | "doors" | "cloaking" | "battery" | "teleporter";

/** Which Hard-list entries hold right now. Order is fixed so tests can compare. */
export function priorityList(g: Game): PriorityEntry[] {
  const out: PriorityEntry[] = [];
  const ship = g.player;
  // Piloting, Overview: >25% evasion lists Piloting and Engines.
  if (evasionPercent(g, ship, "player") > EVASION_LINE) out.push("pilot", "engines");
  // Door System, Overview: boarders or fires on your ship.
  const boarders = g.crew.some((c) => c.side === "enemy" && c.aboard === "player" && c.hp > 0);
  const fires = ship.rooms.some((r) => r.fire > 0);
  if (boarders || fires) out.push("doors");
  // Cloaking, "Enemy AI and Cloaking": not on cooldown. INFERRED: and powered.
  const veil = ship.kits.veil;
  if (veil && veil.level > 0 && veil.power >= 1 && veil.cool <= 0) out.push("cloaking");
  // Backup Battery, Overview: activated (running).
  const cell = ship.kits.cell;
  if (cell && cell.on && cell.left > 0) out.push("battery");
  // Boarding: your crew onboard the enemy ship.
  if (ship.kits.sling && g.crew.some((c) => c.side === "player" && c.aboard === "enemy" && c.hp > 0)) {
    out.push("teleporter");
  }
  return out;
}

const SYS_OF: Partial<Record<PriorityEntry, SysId>> = { pilot: "pilot", engines: "engines", doors: "doors" };
const KIT_OF = { cloaking: "veil", battery: "cell", teleporter: "sling" } as const;

function roomFor(ship: Ship, entry: PriorityEntry): Room | undefined {
  const sys = SYS_OF[entry];
  if (sys) return (ship.systems[sys]?.level ?? 0) > 0 ? ship.rooms.find((r) => r.system === sys) : undefined;
  const kit = KIT_OF[entry as keyof typeof KIT_OF];
  return ship.rooms.find((r) => r.kit === kit);
}

/** Player rooms on the Hard list right now (deduplicated). Empty on Easy and Normal. */
export function priorityRooms(g: Game): string[] {
  if (g.difficulty !== "hard") return [];
  const ids: string[] = [];
  for (const e of priorityList(g)) {
    const r = roomFor(g.player, e);
    if (r && !ids.includes(r.id)) ids.push(r.id);
  }
  return ids;
}

/** Environmental Hazards, ASB: "hitting a random room". Also the INFERRED base pick for enemy guns. */
export function randomRoom(g: Game, ship: Ship): string {
  const i = Math.min(ship.rooms.length - 1, Math.floor(rand(g) * ship.rooms.length));
  return ship.rooms[i]?.id ?? ship.rooms[0].id;
}

/**
 * The player room an enemy weapon (or an unarmed enemy volley such as a boss surge, `weapon` null) aims at.
 * Hard: the priority list PRIORITY_CHANCE of the time when it has rooms; otherwise a random room.
 */
export function enemyTarget(g: Game, _weapon: WeaponInst | null): string {
  // @agent:enemy-sensors. No Sensors check: "Enemy ships ... have all the information about your ship" (Sensors wiki).
  const list = priorityRooms(g);
  if (list.length > 0 && rand(g) < PRIORITY_CHANCE) {
    return list[Math.min(list.length - 1, Math.floor(rand(g) * list.length))];
  }
  return randomRoom(g, g.player);
}
