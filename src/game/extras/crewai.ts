/**
 * @agent:crewai. Enemy crew AI: what enemy crew do aboard their own hull during a fight.
 *
 * Wiki page "Boarding", section "Enemy crew AI": "Enemy crew will be assigned a task, and once assigned often do
 * not change what they are doing. The priorities appear to be;
 *   # Heal - The enemy AI will stop fighting and go heal if it can, the only exception being if the room it is in
 *     is already locked down then it will fight to the death. Once in an active healing room, a hurt AI will not
 *     leave for any reason until it is fully healed.
 *   # Defend/Repair the shield room - Unless actively healing in the Medbay, the AI will always drop what it is
 *     doing and go and defend or repair the shield room.
 *   # Pathing - if the AI has decided to move somewhere, then it will often not change its mind until it gets
 *     there (the exploitable exception to this being mentioned above)."
 *
 * Wiki page "Fires", section "Fires and enemy AI":
 *   "Enemy treats fire as a high-priority task, and will generally send two crew members to fight it. However,
 *   repairing Shields is more important for enemy crew AI ... than putting out fires in any other room (or dealing
 *   with boarders) and at least 1 crewmember is assigned to repairing Shields (while there are other tasks to
 *   perform, i.e. boarders, breaches, fires, etc)."
 *   "If a 2x2 room is completely filled with fire ..., enemy crew will give up and leave the room (except for
 *   Rockmen). However, if this room is also breached, then any kind of enemy crew will leave the room till the
 *   fires die out (the same applies to a 2x1 room)."
 *   "Weakened crew - at 20% health and below - will flee from fires, if not immune. They will also not come to an
 *   operational Medbay on fire if not immune".
 * Wiki page "Boarding", section "Fire Bomb": "Enemy crew will start to run out of the room with fires at below 20% HP
 *   threshold, and will start to leave an airless room at below 25% HP threshold."
 * Wiki page "No Escape": "a damaged system counts as a separate AI crew task and the Shields system usually has the
 *   highest repair priority". (It links an external xftl "crew-ai" doc; the wiki quotes no more of it.)
 * Wiki page "Achievements" (boarding drone kills): "Four of the enemy crew will come to fight you while the 5th
 *   fights the drone" (4 boarders plus 1 drone drew 4 + 1 defenders): one defender per hostile unit.
 * Wiki page "AI-Controlled Rebel Ships": "Automated ships are unmanned." Nothing runs on them.
 *
 * Out of scope here (other modules own them): crew in an enemy boarding party or away on the player hull
 * (extras/sling.ts), crew under either side's Mind Control (extras/leash.ts `sideOf`), stunned crew.
 * The Rebel Flagship gets only this generic behaviour.
 *
 * Determinism and cost: one ship-wide plan every PLAN_S seconds, no random rolls (so the seed's rand(g) stream is
 * untouched), one BFS per crew member per plan over a hull of at most ~20 rooms.
 */
import type { Crew, CrewAiState, CrewAiTask, Game, Room, Ship, SysId } from "../types.ts";
import { bars } from "../sim.ts";
import { hackPulseOn } from "./spike.ts";
import { kinOf } from "./kin.ts";
import { sideOf } from "./leash.ts";
import { artilleryGun } from "../wiki/flagship-systems.ts";

/** INFERRED: the AI re-plans twice a second. The wiki gives no think rate. */
export const PLAN_S = 0.5;

/**
 * INFERRED: a crew member goes to heal below 25% health. "Boarding" gives "go heal if it can" with no number;
 * 25% is the wiki's line for the enemy recalling hurt boarders (Crew Teleporter, "below 25% HP").
 */
export const HEAL_BELOW = 0.25;

/** Fires, "Fires and enemy AI": "Weakened crew - at 20% health and below - will flee from fires, if not immune." */
export const FIRE_FLEE_AT = 0.2;

/** Boarding, "Fire Bomb": "will start to leave an airless room at below 25% HP threshold." */
export const AIR_FLEE_BELOW = 0.25;

/** Fires, "Fires and enemy AI": "will generally send two crew members to fight it." */
export const FIRE_CREW = 2;

/**
 * Stations crew return to. Matches enemy-gen.ts STATION (pilot first so a lone crew member flies the ship).
 * Order is the refill order when a station's crew dies (INFERRED).
 */
export const STATIONS: readonly SysId[] = ["pilot", "weapons", "shields", "engines"];

/**
 * Repair order. "No Escape": "the Shields system usually has the highest repair priority". The rest is INFERRED:
 * flying and shooting first, then life support, then the rest.
 */
export const REPAIR_ORDER: readonly SysId[] = ["shields", "pilot", "weapons", "engines", "oxygen", "medbay", "doors", "sensors"];

/** Task rank, lower first. Shields first (Fires, "Fires and enemy AI"). Defend before fire before repair is INFERRED. */
const RANK: Record<CrewAiTask["kind"], number> = { heal: -2, flee: -1, shields: 0, defend: 1, fire: 2, repair: 3 };

type Job = { kind: CrewAiTask["kind"]; room: string; slots: number; rank: number };

/** Called once per combat tick from sim.ts step(). */
export function tickEnemyCrewAi(g: Game, dt: number) {
  const ship = g.enemy;
  if (!ship || ship.automated || g.phase !== "combat") return;
  const ai = (ship.crewAi ??= { t: 0, post: {}, task: {} });
  ai.t -= dt;
  if (ai.t > 0) return;
  ai.t = PLAN_S;
  planCrew(g, ship, ai);
}

/** Enemy crew this AI drives right now: alive, aboard their own hull, own side, not boarding, not mind-controlled. */
export function aiCrew(g: Game, ship: Ship): Crew[] {
  const busy = new Set([...(ship.boarding?.party ?? []), ...(ship.boarding?.away ?? [])]);
  return g.crew.filter(
    (c) =>
      c.side === "enemy" &&
      c.aboard === "enemy" &&
      c.hp > 0 &&
      sideOf(c) === "enemy" &&
      !busy.has(c.id) &&
      ship.rooms.some((r) => r.id === c.room),
  );
}

/** One full plan. Exported for tests. */
export function planCrew(g: Game, ship: Ship, ai: CrewAiState) {
  // @agent:enemy-sensors. Never gated on their Sensors: enemies "have all the information about your ship and crew".
  const crew = aiCrew(g, ship);
  const live = new Set(crew.map((c) => c.id));
  for (const id of Object.keys(ai.task)) if (!live.has(id)) delete ai.task[id];
  // A crew member's post is the room it first stood in (enemy-gen.ts places crew on stations first).
  for (const c of crew) ai.post[c.id] ??= c.room;
  repost(ship, ai, crew);

  // Crystal, "Crystal Lockdown": nobody leaves a coated room. Boarding: "if the room it is in is already locked
  // down then it will fight to the death". Stunned crew cannot act (Boarding, "Stun").
  const free = crew.filter((c) => !coated(ship, c.room) && (c.stun ?? 0) <= 0);

  // 1. Heal, and hazard flight. Both outrank every job.
  for (const c of free) {
    const t = ai.task[c.id];
    const med = medbayFor(ship, c);
    const hurt = c.hp < c.maxHp * HEAL_BELOW;
    // "Once in an active healing room, a hurt AI will not leave for any reason until it is fully healed."
    const healing = t?.kind === "heal" || (c.room === med?.id && c.path.length === 0);
    if (med && (hurt || (healing && c.hp < c.maxHp))) {
      ai.task[c.id] = { kind: "heal", room: med.id };
      continue;
    }
    if (t?.kind === "heal") delete ai.task[c.id];
    const here = roomOf(ship, c.room);
    if (here && unsafe(ship, c, here)) {
      const to = refuge(ship, c);
      if (to) ai.task[c.id] = { kind: "flee", room: to };
      continue;
    }
    if (t?.kind === "flee") delete ai.task[c.id];
  }

  // Boarding, "Hacking" / Medbay hacking use cases: "Enemy will try to break out of the room, rather than fight."
  // A lockdown already on the room keeps them (they are not in `free`). "1 medbay crew on the phase 1 Flagship will fight no matter what."
  // INFERRED: the way out is the nearest other room. The page does not name it.
  const bay = ship.rooms.find((r) => r.system === "medbay");
  if (bay && hackPulseOn(g, ship, "medbay")) {
    const inside = crew.filter((c) => c.room === bay.id);
    const holds = ship.flagship?.stage === 1 && inside.length === 1;
    if (!holds) {
      for (const c of free) {
        if (c.room !== bay.id) continue;
        const to = breakOut(ship, bay.id);
        if (to) ai.task[c.id] = { kind: "flee", room: to };
      }
    }
  }

  // 2. Jobs on the hull, and which assigned crew still have a live one ("once assigned often do not change").
  const jobs = jobsOn(g, ship);
  const open = new Map(jobs.map((j) => [key(j), j.slots]));
  for (const c of free) {
    const t = ai.task[c.id];
    if (!t || t.kind === "heal" || t.kind === "flee") continue;
    const k = key(t);
    const left = open.get(k) ?? 0;
    const target = roomOf(ship, t.room);
    if (left <= 0 || !target || unsafe(ship, c, target)) {
      delete ai.task[c.id];
      continue;
    }
    open.set(k, left - 1);
  }

  // 3. Fill open slots, best job first, nearest crew first. Shields may pull crew off any other job
  // ("Unless actively healing in the Medbay, the AI will always drop what it is doing").
  const dist = new Map(free.map((c) => [c.id, distances(ship, c.room)]));
  for (const job of jobs) {
    let left = open.get(key(job)) ?? 0;
    if (left <= 0) continue;
    const target = roomOf(ship, job.room);
    if (!target || coated(ship, job.room)) continue;
    const pool = free
      .filter((c) => {
        const t = ai.task[c.id];
        if (t && (t.kind === "heal" || t.kind === "flee")) return false;
        if (t && !(job.kind === "shields" && t.kind !== "shields")) return false;
        if (!dist.get(c.id)!.has(job.room)) return false;
        return !unsafe(ship, c, target);
      })
      .sort((a, b) => dist.get(a.id)!.get(job.room)! - dist.get(b.id)!.get(job.room)!);
    for (const c of pool) {
      if (left <= 0) break;
      const was = ai.task[c.id];
      if (was) open.set(key(was), (open.get(key(was)) ?? 0) + 1);
      ai.task[c.id] = { kind: job.kind, room: job.room };
      left -= 1;
    }
    open.set(key(job), left);
  }

  // 4. Walk. Crew with a task go to it; idle crew go back to their post.
  for (const c of free) {
    const dest = ai.task[c.id]?.room ?? ai.post[c.id];
    if (!dest) continue;
    const target = roomOf(ship, dest);
    // An idle crew member does not walk home into a room that would hurt it, and a walk it is already on (for
    // example sling.ts sending a recalled boarder home) is left alone ("Pathing" above).
    if (!ai.task[c.id] && ((target && unsafe(ship, c, target)) || c.path.length)) continue;
    walk(ship, c, dest);
  }
}

/**
 * Every job on the hull this plan, best first.
 * - shields: anything wrong in the shield room (boarders, fire, damage, breach). Slots: one per hostile, two for a
 *   fire, one for repair. Fires: "at least 1 crewmember is assigned to repairing Shields".
 * - defend: one crew per hostile unit in the room (Achievements quote above). Hostiles are crew fighting for the
 *   player (Mind Control, "Overview": "They will be treated as an intruder by the enemy crew") and the player's
 *   Ion Intruder drone, which stands in a room (extras/swarm.ts kit.room).
 * - fire: FIRE_CREW per burning room. A fully burning room that is also breached is skipped ("any kind of enemy
 *   crew will leave the room till the fires die out").
 * - repair: one per room with a damaged system or subsystem, or a breach ("a damaged system counts as a separate
 *   AI crew task"). Ordered by REPAIR_ORDER; breach-only and subsystem rooms after systems (INFERRED).
 */
export function jobsOn(g: Game, ship: Ship): Job[] {
  const jobs: Job[] = [];
  const shieldsRoom = ship.rooms.find((r) => r.system === "shields");
  for (const r of ship.rooms) {
    const foes = hostilesIn(g, r.id);
    const burning = r.fire > 0 && !(fullFire(r) && r.breach > 0);
    // @agent:flagship. A flagship artillery room's own gun damage (wiki/flagship-systems.ts artilleryGun).
    const sys = artilleryGun(ship, r.id) ?? (r.system ? ship.systems[r.system] : undefined);
    const kit = r.kit ? ship.kits[r.kit] : undefined;
    const broken = (sys != null && sys.damage > 0) || (kit != null && (kit.damage ?? 0) > 0);
    const fix = broken || r.breach > 0;
    if (r === shieldsRoom) {
      const slots = foes + (burning ? FIRE_CREW : 0) + (fix ? 1 : 0);
      if (slots > 0) jobs.push({ kind: "shields", room: r.id, slots, rank: RANK.shields });
      continue;
    }
    if (foes > 0) jobs.push({ kind: "defend", room: r.id, slots: foes, rank: RANK.defend });
    if (burning) jobs.push({ kind: "fire", room: r.id, slots: FIRE_CREW, rank: RANK.fire });
    if (fix) {
      const order = sys && sys.damage > 0 && r.system ? REPAIR_ORDER.indexOf(r.system) : REPAIR_ORDER.length;
      jobs.push({ kind: "repair", room: r.id, slots: 1, rank: RANK.repair + (order + 1) / 100 });
    }
  }
  return jobs.sort((a, b) => a.rank - b.rank);
}

/** Hostile units in an enemy room: crew fighting for the player, plus the player's Ion Intruder drone. */
function hostilesIn(g: Game, roomId: string): number {
  let n = g.crew.filter((c) => c.aboard === "enemy" && c.room === roomId && c.hp > 0 && sideOf(c) === "player").length;
  const swarm = g.player.kits.swarm;
  if (swarm?.target === "ionintruder" && swarm.room === roomId) n += 1;
  return n;
}

/**
 * Stations refill (INFERRED): when no living crew is posted to a station, the crew with the least important post
 * (a non-station room first, then the lowest station in STATIONS order below it) moves its post there.
 */
function repost(ship: Ship, ai: CrewAiState, crew: Crew[]) {
  const rankOfRoom = (id: string) => {
    const sys = roomOf(ship, id)?.system;
    const i = sys ? STATIONS.indexOf(sys) : -1;
    return i < 0 ? STATIONS.length : i;
  };
  for (let i = 0; i < STATIONS.length; i++) {
    const station = ship.rooms.find((r) => r.system === STATIONS[i]);
    if (!station || ship.systems[STATIONS[i]].level <= 0) continue;
    if (crew.some((c) => ai.post[c.id] === station.id)) continue;
    const spare = crew
      .filter((c) => rankOfRoom(ai.post[c.id]) > i)
      .sort((a, b) => rankOfRoom(ai.post[b.id]) - rankOfRoom(ai.post[a.id]))[0];
    if (spare) ai.post[spare.id] = station.id;
  }
}

/** A working Medbay this crew member may walk to, or undefined. Clone Bay ships have none. */
function medbayFor(ship: Ship, c: Crew): Room | undefined {
  if (bars(ship.systems.medbay) <= 0) return undefined;
  const r = ship.rooms.find((x) => x.system === "medbay");
  if (!r || coated(ship, r.id) || r.o2 <= 5) return undefined;
  // Fires: weakened crew "will also not come to an operational Medbay on fire if not immune".
  if (r.fire > 0 && !fireProof(c)) return undefined;
  if (fullFire(r) && r.breach > 0) return undefined;
  return r;
}

/** True when this crew member should not stay in (or walk into) this room. */
function unsafe(_ship: Ship, c: Crew, r: Room): boolean {
  if (r.fire > 0) {
    // Fires: "If a 2x2 room is completely filled with fire ..., enemy crew will give up and leave the room (except
    // for Rockmen). However, if this room is also breached, then any kind of enemy crew will leave the room".
    if (fullFire(r) && r.breach > 0) return true;
    if (!fireProof(c) && (fullFire(r, 4) || c.hp <= c.maxHp * FIRE_FLEE_AT)) return true;
  }
  // Boarding, "Fire Bomb": "will start to leave an airless room at below 25% HP threshold." INFERRED: 5% oxygen is
  // airless (sim.ts suffocation line); crew that do not suffocate (Lanius) stay.
  if (r.o2 <= 5 && c.hp < c.maxHp * AIR_FLEE_BELOW && kinOf(c.kin ?? "plain").suffocate > 0) return true;
  return false;
}

/** Nearest room other than the pulsed medbay. Boarding names the break-out and not the destination. */
function breakOut(ship: Ship, bayId: string): string | undefined {
  const d = distances(ship, bayId);
  let best: string | undefined;
  let bestD = Infinity;
  for (const r of ship.rooms) {
    if (r.id === bayId) continue;
    const n = d.get(r.id);
    if (n == null || n === 0 || coated(ship, r.id)) continue;
    if (n < bestD) {
      best = r.id;
      bestD = n;
    }
  }
  return best;
}

/** The nearest room that is safe for this crew member: a usable Medbay first, else any safe room. */
function refuge(ship: Ship, c: Crew): string | undefined {
  const med = medbayFor(ship, c);
  const d = distances(ship, c.room);
  if (med && d.has(med.id) && !unsafe(ship, c, med)) return med.id;
  let best: string | undefined;
  let bestD = Infinity;
  for (const r of ship.rooms) {
    const n = d.get(r.id);
    if (n == null || n === 0 || coated(ship, r.id) || unsafe(ship, c, r)) continue;
    if (r.fire > 0 || r.o2 <= 5) continue;
    if (n < bestD) {
      best = r.id;
      bestD = n;
    }
  }
  return best;
}

/**
 * Fires, "Fires and enemy AI": "all four tiles have a flame" on a 2x2, and a breached 2x1 is the same.
 * A room is full when the fire count reaches its floor tiles. `minTiles` is 4 for the plain give-up
 * and 2 when a breach makes a 2x1 count. A one-tile room never counts (the wiki names no 1x1 case).
 */
function fullFire(r: Room, minTiles = 2): boolean {
  const tiles = r.w * r.h - (r.omit?.length ?? 0);
  return tiles >= minTiles && r.fire >= tiles;
}

/** Rockmen (and any lineage that takes no fire damage) are immune. */
function fireProof(c: Crew): boolean {
  return kinOf(c.kin ?? "plain").fireTaken <= 0;
}

function coated(ship: Ship, id: string): boolean {
  return (roomOf(ship, id)?.lock ?? 0) > 0;
}

function roomOf(ship: Ship, id: string): Room | undefined {
  return ship.rooms.find((r) => r.id === id);
}

function key(t: { kind: string; room: string }): string {
  return `${t.kind}@${t.room}`;
}

/** BFS step counts over interior doors (the same graph sim.ts orderCrew walks). Coated rooms cannot be entered. */
function distances(ship: Ship, from: string): Map<string, number> {
  const out = new Map<string, number>([[from, 0]]);
  const q = [from];
  while (q.length) {
    const at = q.shift()!;
    for (const d of ship.doors) {
      if (d.b === "void") continue;
      const n = d.a === at ? d.b : d.b === at ? d.a : null;
      if (!n || out.has(n) || coated(ship, n)) continue;
      out.set(n, out.get(at)! + 1);
      q.push(n);
    }
  }
  return out;
}

/** Room path for sim.ts moveCrew (c.path, excluding the start room). Null when unreachable. */
function route(ship: Ship, from: string, to: string): string[] | null {
  if (from === to) return [];
  const prev = new Map<string, string | null>([[from, null]]);
  const q = [from];
  while (q.length) {
    const at = q.shift()!;
    for (const d of ship.doors) {
      if (d.b === "void") continue;
      const n = d.a === at ? d.b : d.b === at ? d.a : null;
      if (!n || prev.has(n) || coated(ship, n)) continue;
      prev.set(n, at);
      if (n === to) {
        const path: string[] = [];
        for (let w: string | null = to; w && w !== from; w = prev.get(w) ?? null) path.unshift(w);
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

/**
 * Point a crew member at a room through sim.ts moveCrew. A walk already headed there is left alone
 * (Boarding: "if the AI has decided to move somewhere, then it will often not change its mind until it gets there").
 */
function walk(ship: Ship, c: Crew, dest: string) {
  if (c.room === dest) {
    if (c.path.length) {
      c.path = [];
      c.move = 0;
    }
    return;
  }
  if (c.path.length && c.path[c.path.length - 1] === dest) return;
  const path = route(ship, c.room, dest);
  if (!path) return;
  c.path = path;
  c.move = 0;
}
