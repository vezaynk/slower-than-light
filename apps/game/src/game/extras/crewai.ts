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
 * The numbers come from the xftl reverse-engineering notes (gitlab.com/znixian/xftl, doc/crew-ai), the doc "No Escape"
 * links: CrewAI::CheckForHealing (heal below 25%, stay until 99%), DangerRating, PrioritizeSystem, CheckForProblems
 * (the tasks), PrioritizeTask (their priorities, lower first), and AttemptToAssign (who takes each task). The wiki's
 * flee and break-out rules above are kept: the notes do not cover them.
 *
 * Out of scope here (other modules own them): crew in an enemy boarding party or away on the player hull
 * (extras/sling.ts), crew under either side's Mind Control (extras/leash.ts `sideOf`), stunned crew.
 * The Rebel Flagship gets only this generic behaviour.
 *
 * Determinism and cost: one ship-wide plan every PLAN_S seconds, no random rolls (so the seed's rand(g) stream is
 * untouched).
 */
import { interiorLinks, mayStand } from "../crew-spots.ts";
import type { Crew, CrewAiState, CrewAiTask, Game, KitId, Room, Ship, SysId } from "../types.ts";
import { bars, lockdown, truce } from "../sim.ts";
import { hackPulseOn } from "./spike.ts";
import "../pack/base.ts";
import { crewDef } from "@stl/pack";
import { sideOf } from "./leash.ts";
import { artilleryGun } from "../wiki/flagship-systems.ts";
import { airShown } from "../air.ts";

/** INFERRED: the AI re-plans twice a second. The wiki gives no think rate. */
export const PLAN_S = 0.5;

/**
 * xftl doc/crew-ai, CheckForHealing: "the crew health is <25% (non-calm ship)". This AI runs only in a fight, so the
 * ship is never calm. Staying: Boarding, "Enemy crew AI": "Once in an active healing room, a hurt AI will not leave for
 * any reason until it is fully healed." The wiki outranks xftl's 99% (UpdateCrewMember).
 */
export const HEAL_BELOW = 0.25;
export const HEAL_UNTIL = 1;

/**
 * Fires, "Fires and enemy AI": "Weakened crew - at 20% health and below - will flee from fires, if not immune." The
 * wiki outranks xftl's strict "health<20%" (DangerRating).
 */
export const FIRE_FLEE_AT = 0.2;

/**
 * xftl doc/crew-ai, DangerRating: "If health<25% and oxygen<10% it's dangerous, if we can suffocate". Boarding, "Fire
 * Bomb": "will start to leave an airless room at below 25% HP threshold."
 */
export const AIR_FLEE_BELOW = 0.25;
export const AIR_DANGER_O2 = 10;

/**
 * xftl doc/crew-ai, CheckForProblems: "A room with any number of fires (and more than 10% oxygen) gets two tasks".
 * Fires, "Fires and enemy AI": "will generally send two crew members to fight it." INFERRED: the "bonus task" the notes
 * call "quite confusing" is left out.
 */
export const FIRE_CREW = 2;

/** Stations crew return to. Matches enemy-gen.ts STATION. Refilled in manning priority order (manPriority). */
export const STATIONS: readonly SysId[] = ["pilot", "weapons", "shields", "engines"];

/** xftl doc/crew-ai, PrioritizeTask: "If a task is in a room marked as dangerous ... it gets a priority of 100." */
const DANGER_PRIORITY = 100;
/** "An idle task has priority 1000." */
const IDLE_PRIORITY = 1000;

type System = SysId | KitId;
type Job = { kind: CrewAiTask["kind"]; room: string; slots: number };

/**
 * xftl doc/crew-ai, CrewAI::PrioritizeSystem: "0: Shields / 1: Weapons, clonebay / 2: Artillery / 3: Oxygen /
 * 4: Engines, drones, piloting / 5: Cloaking, mind control, hacking / 6: Sensors, battery / 7: Doors /
 * 8: Everything else". "Medbay: 1 if it's requested (see CheckForHealing), 2 otherwise." "Teleporter: ... If ... a
 * teleport is requested, priority 1 / Otherwise, priority 3". INFERRED: this sim has no teleport request, so 3.
 */
export function systemPriority(sys: System | undefined, medbayRequested = false): number {
  switch (sys) {
    case "shields":
      return 0;
    case "weapons":
    case "clonebay":
      return 1;
    case "artillery":
      return 2;
    case "oxygen":
      return 3;
    case "engines":
    case "drones":
    case "pilot":
      return 4;
    case "cloaking":
    case "mind":
    case "hacking":
      return 5;
    case "sensors":
    case "battery":
      return 6;
    case "doors":
      return 7;
    case "medbay":
      return medbayRequested ? 1 : 2;
    case "teleporter":
      return 3;
    default:
      return 8;
  }
}

/**
 * xftl doc/crew-ai, PrioritizeTask, manning: "Piloting is 64 / Shields are 67 on hard, else 65. / Engines are 65 on
 * hard, else 67. / Weapons and artillery is 66 / Oxygen is 68 / Sensors is 69 / Doors and cloaking is 70 / Teleporter
 * is 71 / Medbay is 72 / Anything else is 1000."
 */
export function manPriority(sys: System | undefined, hard: boolean): number {
  switch (sys) {
    case "pilot":
      return 64;
    case "shields":
      return hard ? 67 : 65;
    case "engines":
      return hard ? 65 : 67;
    case "weapons":
    case "artillery":
      return 66;
    case "oxygen":
      return 68;
    case "sensors":
      return 69;
    case "doors":
    case "cloaking":
      return 70;
    case "teleporter":
      return 71;
    case "medbay":
      return 72;
    default:
      return IDLE_PRIORITY;
  }
}

/** Called once per combat tick from sim.ts step(). */
/**
 * Per the user: the crew of a ship that is no longer fighting (sim.ts truce) keep working on their own hull: stations,
 * repairs, fires, breaches, healing. With the truce on, nobody aboard counts as hostile, so no one is sent to fight.
 */
export function tickNeutralCrew(g: Game, ship: Ship, dt: number) {
  if (ship.automated) return;
  const ai = (ship.crewAi ??= { t: 0, post: {}, task: {} });
  ai.t -= dt;
  if (ai.t > 0) return;
  ai.t = PLAN_S;
  planCrew(g, ship, ai);
}

export function tickEnemyCrewAi(g: Game, dt: number) {
  const ship = g.enemy;
  if (!ship || ship.automated || g.phase !== "combat") return;
  // Before the plan, so a coat is already up when planCrew refuses to leave a locked room.
  enemyCrystalLockdown(g);
  const ai = (ship.crewAi ??= { t: 0, post: {}, task: {} });
  ai.t -= dt;
  if (ai.t > 0) return;
  ai.t = PLAN_S;
  planCrew(g, ship, ai);
}

/**
 * Crystal Ships: "Be wary of boarding or being boarded: enemy Crystal crew will use their Lockdown power against you."
 * Crystal Lockdown: the power coats the room that Crystal is standing in, for 12 seconds, then recharges for 50.
 * The page names no target room and no chance. INFERRED: a Crystal casts when it is standing still in a room it
 * shares with a living crew member of the other side. A Crystal already walking through does not cast. A room
 * that is already coated is left alone, so a second Crystal in that room keeps its charge. Stunned crew cannot
 * act (Boarding, "Stun").
 */
export function enemyCrystalLockdown(g: Game) {
  const coatedRoom = new Set<string>();
  for (const c of g.crew) {
    if (c.side !== "enemy" || !crewDef(c.kin).lockdown || c.hp <= 0) continue;
    if (sideOf(c) !== "enemy") continue;
    if ((c.stun ?? 0) > 0 || (c.lockCool ?? 0) > 0 || c.path.length > 0) continue;
    const ship = c.aboard === "player" ? g.player : g.enemy;
    if (!ship) continue;
    const key = `${c.aboard}:${c.room}`;
    if (coatedRoom.has(key) || (ship.rooms.find((r) => r.id === c.room)?.lock ?? 0) > 0) {
      coatedRoom.add(key);
      continue;
    }
    const foe = g.crew.some(
      (o) => o.id !== c.id && o.hp > 0 && o.aboard === c.aboard && o.room === c.room && sideOf(o) !== "enemy",
    );
    if (!foe) continue;
    if (lockdown(g, c.id)) coatedRoom.add(key);
  }
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

/** True when the crew member is "bad at combat": "<1x damage or <100hp" (xftl doc/crew-ai, PrioritizeTask). */
function badFighter(c: Crew): boolean {
  return crewDef(c.kin ?? "human").fight < 1 || c.maxHp < 100;
}

/** The system a room houses, for the priority tables. */
function roomSystem(ship: Ship, r: Room | undefined): System | undefined {
  if (!r) return undefined;
  if (artilleryGun(ship, r.id)) return "artillery";
  return r.system ?? r.kit;
}

/** INFERRED: "oxygen is below 25%" is the ship's average room oxygen. The notes do not say which oxygen. */
function shipOxygen(ship: Ship): number {
  return ship.rooms.length ? ship.rooms.reduce((n, r) => n + airShown(r.o2), 0) / ship.rooms.length : 100;
}

/**
 * xftl doc/crew-ai, PrioritizeTask, for this crew member. Lower is more important.
 * - A task in a room DangerRating marks dangerous: 100.
 * - Combat for a crew member bad at combat: 100, "if not all of the crew are bad at combat, and unless the
 *   combat/race override is set".
 * - "Healing tasks has priority 0."
 * - "Fire fighting and combat tasks: Use PrioritizeSystem + 16, or 24 (8+16) for rooms without a system."
 * - Hull breaches: "PrioritizeSystem + 32, or 40 (8+32) for rooms without a system."
 * - Repairs: "PrioritizeSystem + 48. The exception is that if oxygen is below 25%, repairing the oxygen system has
 *   priority 0. Also, shields is always priority 1".
 */
function taskPriority(g: Game, ship: Ship, ai: CrewAiState, crew: Crew[], c: Crew, t: CrewAiTask): number {
  const r = roomOf(ship, t.room);
  if (t.kind === "heal") return 0;
  if (r && t.kind !== "flee" && unsafe(g, ship, c, r)) return DANGER_PRIORITY;
  const sys = roomSystem(ship, r);
  const rank = systemPriority(sys, ai.hurt === true);
  switch (t.kind) {
    case "defend":
      if (badFighter(c) && !ai.overrideRace && !crew.every(badFighter)) return DANGER_PRIORITY;
      return rank + 16;
    case "fire":
      return rank + 16;
    case "breach":
      return rank + 32;
    case "repair":
      if (sys === "shields") return 1;
      if (sys === "oxygen" && shipOxygen(ship) < 25) return 0;
      return rank + 48;
    default:
      return IDLE_PRIORITY;
  }
}

/**
 * The priority of what a crew member is doing now: its task, else manning (standing at its post, a station), else
 * idle. xftl doc/crew-ai, UpdateCrewMember: "If someone else is manning the room, go into idle mode."
 */
function currentPriority(g: Game, ship: Ship, ai: CrewAiState, crew: Crew[], c: Crew): number {
  const t = ai.task[c.id];
  if (t) return taskPriority(g, ship, ai, crew, c, t);
  if (c.path.length || c.room !== ai.post[c.id]) return IDLE_PRIORITY;
  const manned = crew.some((o) => o.id !== c.id && o.room === c.room && !ai.task[o.id] && crew.indexOf(o) < crew.indexOf(c));
  if (manned) return IDLE_PRIORITY;
  return manPriority(roomSystem(ship, roomOf(ship, c.room)), g.difficulty === "hard");
}

/** One full plan. Exported for tests. */
export function planCrew(g: Game, ship: Ship, ai: CrewAiState) {
  // @agent:enemy-sensors. Never gated on their Sensors: enemies "have all the information about your ship and crew".
  const crew = aiCrew(g, ship);
  const live = new Set(crew.map((c) => c.id));
  for (const id of Object.keys(ai.task)) if (!live.has(id)) delete ai.task[id];
  // A crew member's post is the room it first stood in (enemy-gen.ts places crew on stations first).
  for (const c of crew) ai.post[c.id] ??= c.room;
  repost(g, ship, ai, crew);

  // Crystal, "Crystal Lockdown": nobody leaves a coated room. Boarding: "if the room it is in is already locked
  // down then it will fight to the death". Stunned crew cannot act (Boarding, "Stun").
  const free = crew.filter((c) => !coated(ship, c.room) && (c.stun ?? 0) <= 0);

  // 1. Heal (xftl CheckForHealing), and the wiki's hazard flight. Both outrank every job.
  // bHurtCrew: "if any crew is assigned to the healing task, or if any crew satisfy the first per-crew condition".
  ai.hurt = crew.some((c) => c.hp < c.maxHp * HEAL_BELOW);
  for (const c of free) {
    const t = ai.task[c.id];
    const med = medbayFor(g, ship, c);
    const hurt = c.hp < c.maxHp * HEAL_BELOW;
    const healing = t?.kind === "heal" && c.hp < c.maxHp * HEAL_UNTIL;
    if (med && (hurt || healing)) {
      ai.task[c.id] = { kind: "heal", room: med.id };
      ai.hurt = true;
      continue;
    }
    if (t?.kind === "heal") delete ai.task[c.id];
    const here = roomOf(ship, c.room);
    // A hacked Medbay is the break-out below (Boarding), which keeps the phase-1 Flagship's lone medbay crew.
    if (here && unsafe(g, ship, c, here, false)) {
      const to = refuge(g, ship, c);
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

  // 2. Tasks on the hull. A crew member already on a live task keeps its slot; a task that is gone frees the crew.
  const jobs = jobsOn(g, ship);
  const open = new Map(jobs.map((j) => [key(j), j.slots]));
  for (const c of free) {
    const t = ai.task[c.id];
    if (!t || t.kind === "heal" || t.kind === "flee") continue;
    const k = key(t);
    const left = open.get(k) ?? 0;
    if (left <= 0 || !roomOf(ship, t.room)) {
      delete ai.task[c.id];
      continue;
    }
    open.set(k, left - 1);
  }

  // 3. xftl doc/crew-ai, AttemptToAssign, once per open task slot, in CheckForProblems order (not sorted).
  const reach = new Map(free.map((c) => [c.id, distances(ship, c.room)]));
  let combatMissed = false;
  for (const job of jobs) {
    let left = open.get(key(job)) ?? 0;
    const task: CrewAiTask = { kind: job.kind, room: job.room };
    while (left > 0) {
      const pool = free.filter((c) => {
        const t = ai.task[c.id];
        if (t && (t.kind === "heal" || t.kind === "flee")) return false;
        if (t && key(t) === key(task)) return false;
        if (!reach.get(c.id)!.has(job.room)) return false;
        // "Exclude crewmembers whose task is more important (lower priority number) than the task to be assigned."
        return currentPriority(g, ship, ai, crew, c) >= taskPriority(g, ship, ai, crew, c, task);
      });
      // "If the crewmember's current task is combat, repair, fire-fighting, or hull-breach repair, and they're in the
      // same room as the task, assign them immediately".
      let pick = pool.find((c) => {
        const t = ai.task[c.id];
        return !!t && t.kind !== "heal" && t.kind !== "flee" && c.room === job.room;
      });
      if (!pick) {
        // "pick the crewmember whose current task has the highest priority value ... If there's a tie, pick the
        // crewmember that appears first in the crew list." Then assign only if the new task's priority is lower.
        let best: Crew | undefined;
        let bestCur = -Infinity;
        for (const c of pool) {
          const cur = currentPriority(g, ship, ai, crew, c);
          if (cur > bestCur) {
            best = c;
            bestCur = cur;
          }
        }
        if (best && taskPriority(g, ship, ai, crew, best, task) < bestCur) pick = best;
      }
      if (!pick) break;
      const was = ai.task[pick.id];
      if (was) open.set(key(was), (open.get(key(was)) ?? 0) + 1);
      ai.task[pick.id] = task;
      left -= 1;
    }
    if (left > 0 && job.kind === "defend") combatMissed = true;
    open.set(key(job), left);
  }
  // "if a combat task isn't assigned, and some of the crew are bad at combat, the combat/race override is set".
  if (combatMissed && crew.some(badFighter)) ai.overrideRace = true;

  // 4. Walk. Crew with a task go to it; idle crew go back to their post.
  for (const c of free) {
    const dest = ai.task[c.id]?.room ?? ai.post[c.id];
    if (!dest) continue;
    const target = roomOf(ship, dest);
    // An idle crew member does not walk home into a room that would hurt it, and a walk it is already on (for
    // example sling.ts sending a recalled boarder home) is left alone ("Pathing" above).
    if (!ai.task[c.id] && ((target && unsafe(g, ship, c, target)) || c.path.length)) continue;
    walk(g, ship, c, dest);
  }
}

/**
 * Every task on the hull this plan, in xftl CrewAI::CheckForProblems order: "Boarders get a single task each", "A room
 * with any number of fires (and more than 10% oxygen) gets two tasks", then "Hull breaches get a task, one per room".
 * INFERRED: the "bonus task" for breaches is left out, and system repairs (one per damaged system or subsystem room,
 * No Escape: "a damaged system counts as a separate AI crew task") come last; the notes list no repair source.
 * Hostiles are crew fighting for the player (Mind Control, "Overview": "They will be treated as an intruder by the
 * enemy crew") and the player's Ion Intruder drone, which stands in a room (extras/swarm.ts kit.room).
 * Fires, "Fires and enemy AI": a fully burning room that is also breached is left ("any kind of enemy crew will leave
 * the room till the fires die out").
 */
export function jobsOn(g: Game, ship: Ship): Job[] {
  const defend: Job[] = [];
  const fire: Job[] = [];
  const breach: Job[] = [];
  const repair: Job[] = [];
  for (const r of ship.rooms) {
    const foes = hostilesIn(g, r.id);
    if (foes > 0) defend.push({ kind: "defend", room: r.id, slots: foes });
    if (r.fire > 0 && r.o2 > 10 && !(fullFire(r) && r.breach > 0)) fire.push({ kind: "fire", room: r.id, slots: FIRE_CREW });
    if (r.breach > 0) breach.push({ kind: "breach", room: r.id, slots: 1 });
    // @agent:flagship. A flagship artillery room's own gun damage (wiki/flagship-systems.ts artilleryGun).
    const sys = artilleryGun(ship, r.id) ?? (r.system ? ship.systems[r.system] : undefined);
    const kit = r.kit ? ship.kits[r.kit] : undefined;
    if ((sys != null && sys.damage > 0) || (kit != null && (kit.damage ?? 0) > 0)) {
      repair.push({ kind: "repair", room: r.id, slots: 1 });
    }
  }
  return [...defend, ...fire, ...breach, ...repair];
}

/** Hostile units in an enemy room: crew fighting for the player, plus the player's Ion Intruder drone. */
function hostilesIn(g: Game, roomId: string): number {
  // Per the user: a neutral ship (sim.ts truce) has no hostiles aboard.
  if (truce(g)) return 0;
  let n = g.crew.filter((c) => c.aboard === "enemy" && c.room === roomId && c.hp > 0 && sideOf(c) === "player").length;
  const swarm = g.player.kits.drones;
  if (swarm?.target === "BOARDER_ION" && swarm.room === roomId) n += 1;
  return n;
}

/**
 * Stations refill (INFERRED): when no living crew is posted to a station, the crew with the least important post
 * moves its post there. Stations fill in xftl manning priority order (manPriority: pilot 64, then shields 65 and
 * engines 67, swapped on Hard, with weapons 66 between).
 */
function repost(g: Game, ship: Ship, ai: CrewAiState, crew: Crew[]) {
  const hard = g.difficulty === "hard";
  const order = [...STATIONS].sort((a, b) => manPriority(a, hard) - manPriority(b, hard));
  const rankOfRoom = (id: string) => {
    const sys = roomOf(ship, id)?.system;
    const i = sys ? order.indexOf(sys) : -1;
    return i < 0 ? order.length : i;
  };
  for (let i = 0; i < order.length; i++) {
    const station = ship.rooms.find((r) => r.system === order[i]);
    if (!station || ship.systems[order[i]].level <= 0) continue;
    if (crew.some((c) => ai.post[c.id] === station.id)) continue;
    const spare = crew
      .filter((c) => rankOfRoom(ai.post[c.id]) > i)
      .sort((a, b) => rankOfRoom(ai.post[b.id]) - rankOfRoom(ai.post[a.id]))[0];
    if (spare) ai.post[spare.id] = station.id;
  }
}

/**
 * A Medbay this crew member may walk to, or undefined. Clone Bay ships have none. xftl doc/crew-ai, CheckForHealing:
 * "the medbay is working and isn't hacked", and "the medbay room is rated as safe (see CrewAI::DangerRating)".
 * Fires: weakened crew "will also not come to an operational Medbay on fire if not immune".
 */
function medbayFor(g: Game, ship: Ship, c: Crew): Room | undefined {
  if (bars(ship.systems.medbay) <= 0) return undefined;
  const r = ship.rooms.find((x) => x.system === "medbay");
  if (!r || coated(ship, r.id)) return undefined;
  if (r.fire > 0 && !fireProof(c)) return undefined;
  if (unsafe(g, ship, c, r)) return undefined;
  return r;
}

/**
 * True when this room is dangerous for this crew member. xftl doc/crew-ai, CrewAI::DangerRating:
 * - "If a room is an airlock and an airlock door is open, it's dangerous"
 * - "If health<25% and oxygen<10% it's dangerous, if we can suffocate (ie, except lanius)"
 * - "If fireCount>0 and health<20%, it's dangerous unless we're immune to fire"
 * - "If fireCount>=4 then it's dangerous unless we're immune to fire"
 * - "This room is the medbay, and it's being hacked"
 * Fires, "Fires and enemy AI" adds: a completely burning room that is also breached is left by "any kind of enemy crew".
 */
function unsafe(g: Game, ship: Ship, c: Crew, r: Room, hackCounts = true): boolean {
  if (ship.doors.some((d) => d.open && d.b === "void" && d.a === r.id)) return true;
  if (r.o2 < AIR_DANGER_O2 && c.hp < c.maxHp * AIR_FLEE_BELOW && crewDef(c.kin ?? "human").suffocate > 0) return true;
  if (r.fire > 0) {
    if (fullFire(r) && r.breach > 0) return true;
    if (!fireProof(c) && (r.fire >= 4 || c.hp <= c.maxHp * FIRE_FLEE_AT)) return true;
  }
  if (hackCounts && r.system === "medbay" && hackPulseOn(g, ship, "medbay")) return true;
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
function refuge(g: Game, ship: Ship, c: Crew): string | undefined {
  const med = medbayFor(g, ship, c);
  const d = distances(ship, c.room);
  if (med && d.has(med.id) && !unsafe(g, ship, c, med)) return med.id;
  let best: string | undefined;
  let bestD = Infinity;
  for (const r of ship.rooms) {
    const n = d.get(r.id);
    if (n == null || n === 0 || coated(ship, r.id) || unsafe(g, ship, c, r)) continue;
    if (r.fire > 0 || r.o2 < AIR_DANGER_O2) continue;
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
  return crewDef(c.kin ?? "human").fireTaken <= 0;
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
function walk(g: Game, ship: Ship, c: Crew, dest: string) {
  if (c.room === dest) {
    if (c.path.length) {
      c.path = [];
      c.move = 0;
      delete c.via;
    }
    return;
  }
  if (c.path.length && c.path[c.path.length - 1] === dest) return;
  const room = ship.rooms.find((r) => r.id === dest);
  const hull = c.aboard === "player" ? "player" : "enemy";
  if (!room || !mayStand(room, g.crew, c.id, dest, c.aboard, hull, interiorLinks(ship.doors, dest))) return;
  const path = route(ship, c.room, dest);
  if (!path) return;
  c.path = path;
  c.move = 0;
  delete c.via;
}
