import { skillRank } from "../content.ts";
import { applyIon, isMain, kitBars, log, rand, sparePower, syncShields, zoltanBars } from "../sim.ts";
import { xpNeedFor } from "./lineage.ts";
import { combatSkillMult } from "../wiki/skills.ts";
import { seatKits } from "../layouts.ts";
import { SCHEMATIC_POWER } from "../enemy-gen.ts";
import type { Crew, DroneBlast, DroneUnit, Game, Kit, Room, Ship, Shot, SysId } from "../types.ts";
import { kinOf } from "./kin.ts";
import { veilBlocks } from "./veil.ts";
import { crewDroneSpeed } from "../wiki/cited-booster.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import { COMBAT2 } from "../wiki/cited-combat2.ts";
import { INTRUDER } from "../wiki/cited-intruder.ts";
import { OVERCHARGER, OVERCHARGER_PLUS } from "../wiki/cited-overcharger.ts";
import { scramblerBlocks } from "../wiki/cited-scrambler.ts";
import { flagshipDronePower } from "../wiki/flagship-systems.ts";

/**
 * Drone Control, the paragraph above "Overview": the system itself is priced at 60.
 * A store bundle with a System Repair drone is 75. Any other bundled schematic is 85.
 * The naked 60 is not what a store charges, so installSwarm still refuses.
 * There is no heading on that paragraph. "Overview" is the next heading, not its section.
 */
export const INSTALL_SCRAP: number | null = null;
export const BUNDLE_PATCH = 75;
export const BUNDLE_OTHER = 85;

/**
 * INFERRED: Drone Control, Overview says the system "Powers all of the ship's
 * drones" and lists no power cost for the system room itself. Fed bars are
 * the whole budget; this overhead stays 0.
 */
export const SYSTEM_POWER = 0;

export type SwarmKind = "ward" | "ward2" | "wardcut" | "striker" | "beam" | "board" | "patch" | "hull";

/** Per-drone power. The system overhead above is separate and is 0. INFERRED, same as SYSTEM_POWER. */
export const DRONE_POWER: Record<SwarmKind, number> = {
  /** Drone Control, Defensive Drones > Defense Drone Mark I: "Power requirement: 2 power". */
  ward: 2,
  /** Drone Control, Defense Drone Mark II: "Power requirement: 3 power". */
  ward2: 3,
  /** Drone Control, Anti-Combat Drone: "Power requirement: 1 power". */
  wardcut: 1,
  /** Drone Control, Combat Drone Mark I: "Power requirement: 2 power". */
  striker: 2,
  /** Drone Control, Combat Drones (offensive drones) > Anti-Ship Beam Drone I: "Power requirement: 2 power". */
  beam: 2,
  /** Drone Control, Boarding Drones > Boarding Drone: "Power requirement: 3 power". */
  board: 3,
  /** Drone Control, Crew Drones > System Repair Drone: "Power requirement: 1 power". */
  patch: 1,
  /** Drone Control, Defensive Drones > Hull Repair Drone: "Power requirement: 2 power". */
  hull: 2,
};

/**
 * Shot cooldown in seconds. Mark I and Mark II act when this hits 0.
 * Anti-Combat starts fully charged (0) and would use its entry after a shot.
 */
export const DRONE_COOLDOWN_S: Record<"ward" | "ward2" | "wardcut", number> = {
  /** Drone Control, Defensive Drones > Defense Drone Mark I: "Cooldown: 1000 ms". */
  ward: 1000 / 1000,
  /** Drone Control, Defense Drone Mark II: "Cooldown: 880 ms". */
  ward2: 880 / 1000,
  /** Drone Control, Anti-Combat Drone: "Cooldown: 7000 ms". */
  wardcut: 7000 / 1000,
};

/**
 * Drone Control, "Combat Drones (offensive drones)", the paragraph above "Combat Drone Mark I":
 * "Drones deal 1 hull/system damage per projectile (of the Combat Drones)".
 * The Drones page is only a redirect and does not contain this sentence.
 */
const STRIKER_DAMAGE = 1;

/** Drone Control, Combat Drone Mark I: "Laser blast has 10% chance to start fire in the hit room". */
const STRIKER_FIRE = 10 / 100;

/**
 * INFERRED: Combat Drone Mark I says the blast is "usually slower than normal
 * shield recharge" and gives no interval in seconds. 2.5 is not a wiki number.
 */
const STRIKER_INTERVAL_S = 2.5;

/**
 * INFERRED: Combat Drone Mark I lists a laser and a 10% fire chance only.
 * No ion damage and no breach chance are given, so both stay 0.
 */
const STRIKER_ION = 0;
const STRIKER_BREACH = 0;

/**
 * INVENTED: the drone page has no projectile flight time. Must be > 0 because
 * shot progress divides by duration. 0.7 matches other laser shots in this drill.
 */
const STRIKER_FLIGHT_S = 0.7;

/**
 * INFERRED: Drone Control, "Combat Drones (offensive drones)" > "Anti-Ship Beam Drone I"
 * lists "Beam speed: 3" and a beam length, not a fire interval in seconds.
 * Using that 3 as this interval is not what the 3 means.
 */
const BEAM_INTERVAL_S = 3;

/**
 * Drone Control, Combat Drones (offensive drones):
 * "1 hull/system damage ... per room crossed by the beam (of the Beam Drones, but not the Fire Drone)."
 * Anti-Ship Beam Drone I beam length is "20 (0.4 tile diagonally)".
 * INFERRED: one room per swipe. The page does not say the swipe hits one room.
 */
const BEAM_DAMAGE = 1;

/** Drone Control, Combat Drones (offensive drones) > Anti-Ship Beam Drone I: "10% chance to set a tile on fire". */
const BEAM_FIRE = 10 / 100;

/**
 * Door System, Door strength: "They make about one attack per second with slightly randomized timing."
 * Boarding Drones > Boarding Drone gives no attack interval.
 * INFERRED: a flat 1 second. The slight randomization is not applied.
 */
const BOARD_INTERVAL_S = 1;

/**
 * Drone Control, "Boarding Drones" > "Boarding Drone": health 150, and it attacks
 * crew and systems. No damage per hit is stated.
 * INFERRED: no DPS on that section, reused the fight's invented 6.
 * One attack deals that many hit points to a crew member, or that many
 * system damage bars when no enemy crew are left.
 */
const BOARD_HIT = 6;

/** Drone Control, Overview: activating a drone that is not yet deployed will "spend one drone part". */
const PART_COST = 1;

/**
 * INVENTED: fresh and in-flight combat shots have no extra windup. The page
 * does not list a travel delay separate from the fire interval.
 */
const SHOT_WAIT_S = 0;
const SHOT_T = 0;

/** Label for combat shots spawned by the current tickSwarm call. Not a wiki value. */
const READY_LABEL = "swarm-ready";
const FLOWN_LABEL = "swarm";

const KINDS: readonly SwarmKind[] = ["ward", "ward2", "wardcut", "striker", "beam", "board", "patch", "hull"];

function isKind(kind: string | null): kind is SwarmKind {
  return !!kind && (KINDS as readonly string[]).includes(kind);
}

function fedBars(kit: Kit): number {
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  return Math.max(0, kitBars(kit) - SYSTEM_POWER);
}

function powered(kit: Kit, kind: SwarmKind): boolean {
  return kit.on && fedBars(kit) >= DRONE_POWER[kind];
}

function blank(): Kit {
  return {
    id: "swarm",
    // Drone Control, the paragraph above "Overview": a store purchase "comes with 2 slots and 2 system levels."
    level: 2,
    // INVENTED: a fitted kit starts unpowered, idle, and not deployed.
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/** Buy drone control. Refuses: the paragraph above "Overview" sells a bundle, not the naked 60. */
export function installSwarm(g: Game): boolean {
  if (INSTALL_SCRAP == null || g.player.kits.swarm) return false;
  if (g.scrap < INSTALL_SCRAP) return false;
  g.scrap -= INSTALL_SCRAP;
  g.player.kits.swarm = blank();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, "Drone Control installed on the Lark.");
  return true;
}

/**
 * Drone Control, the paragraph above "Overview": 75 with a System Repair schematic, 85 otherwise.
 * Comes with 2 slots and 2 levels (blank()). The schematic is selected, not deployed;
 * deploy still spends one part.
 */
export function installSwarmBundle(g: Game, kind: "patch" | "ward" | "striker"): boolean {
  if (g.player.kits.swarm) return false;
  const cost = kind === "patch" ? BUNDLE_PATCH : BUNDLE_OTHER;
  if (g.scrap < cost) return false;
  g.scrap -= cost;
  const kit = blank();
  kit.target = kind;
  g.player.kits.swarm = kit;
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, kind === "patch" ? "Drone Control fitted, with a System Repair schematic." : "Drone Control fitted.");
  return true;
}

/**
 * Systems, "Powering and upgrading systems": one bar at a time.
 * INFERRED: power stops at the kit level, and the same step turns a bar off.
 * Drone Control does not state that step.
 */
export function toggleSwarmPower(g: Game): void {
  const kit = g.player.kits.swarm;
  if (!kit) return;
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  if (kit.power < kit.level - (kit.damage ?? 0) && sparePower(g.player) >= 1) {
    kit.power += 1;
    return;
  }
  if (kit.power > 0) kit.power -= 1;
}

function setCooldown(kit: Kit, seconds: number) {
  // cool is the remaining lockout; aux mirrors it (Kit.aux is the drone shot cadence).
  kit.cool = seconds;
  kit.aux = seconds;
}

function tickCooldown(kit: Kit, dt: number) {
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
  if (kit.aux > 0) kit.aux = Math.max(0, kit.aux - dt);
}

function ready(kit: Kit): boolean {
  return kit.cool <= 0 && kit.aux <= 0;
}

/**
 * Spend one drone part and deploy. Same kind already out does not spend again.
 * Power is not taken here; the drone acts only while fed bars cover DRONE_POWER.
 */
export function deploy(g: Game, kind: string): boolean {
  const kit = g.player.kits.swarm;
  // Combat Drone Mark II, the Ion Intruder, and both Shield Overchargers stay outside SwarmKind.
  // drones-missing.ts still lists them.
  const cited =
    kind === "combat2" || kind === "ionintruder" || kind === "overcharger" || kind === "overchargerplus";
  if (!kit || (!isKind(kind) && !cited)) return false;
  if (kit.on && kit.target === kind) return true;
  // @agent:drones. Drone Control, Overview: "If a drone is destroyed, there is a 10 second delay before it can be
  // deployed again (costing another part)." INFERRED: the player kit flies one drone, so that delay holds the whole
  // kit, whichever schematic is picked next. killPlayerDrone sets kit.lost.
  if ((kit.lost ?? 0) > 0) {
    log(g, `Drone Control is rebuilding: ${Math.ceil(kit.lost ?? 0)} s.`);
    return false;
  }
  if (g.player.parts < PART_COST) {
    log(g, "Drone Control needs a drone part.");
    return false;
  }
  g.player.parts -= PART_COST;
  kit.on = true;
  kit.target = kind;
  kit.path = [];
  kit.move = 0;
  if (kind === "ionintruder") kit.hp = INTRUDER_HP;
  else delete kit.hp;
  if (kind !== "patch") kit.room = undefined;
  // Drone Control, "Anti-Combat Drone": "Starts fully charged when first deployed".
  // Combat Drone Mark I does not say that, so the striker interval starts empty.
  // Beam and Boarding Drone give no starting charge, so those intervals start empty too.
  // Defense cooldowns also start ready.
  setCooldown(kit, 0);
  kit.left = 0;
  log(g, `Drone Control deploys ${kind}.`);
  return true;
}

function shoots(
  kind: SwarmKind,
  shot: { kind: string; from: string; defId?: string },
  defender: "player" | "enemy",
): boolean {
  if (kind !== "ward" && kind !== "ward2") return false;
  // Incoming only. The defending ship's own shots are not targets.
  if (shot.from === defender) return false;
  // Augmentations, Crystal Vengeance: defense drones can shoot the shard down.
  // The grey note calls it a neutral projectile like an asteroid. Mark I shoots asteroids, so both marks do.
  // A friendly drone does not. That shoot-down is the grey [bugged] note, and it is not implemented.
  if (shot.defId === "vengeance") return true;
  // Environmental Hazards, anti-ship battery: it cannot be shot down.
  if (shot.from === "env" && shot.kind === "missile") return false;
  // Defensive Drones > Defense Drone Mark I: missiles, hacking and boarding
  // drones, individual flak debris, and asteroids.
  if (shot.kind === "missile" || shot.kind === "flak") return true;
  if (shot.kind === "hacking" || shot.kind === "boarding") return true;
  // INFERRED: that section shoots asteroids. This drill spawns them as laser
  // shots with from "env". An explicit kind "asteroid" counts too.
  // Enemy lasers are not asteroids, so Mark I leaves those alone.
  if (shot.kind === "asteroid") return true;
  if (shot.from === "env" && shot.kind === "laser") return true;
  // Defense Drone Mark II: "also ion blasts and lasers".
  if (kind === "ward2" && (shot.kind === "laser" || shot.kind === "ion")) return true;
  return false;
}

/**
 * True when a powered defense drone is off cooldown and this shot is one it
 * shoots down. One shot per cooldown: a hit fills kit.cool and kit.aux.
 */
export function swarmIntercept(g: Game, shot: { kind: string; from: string; defId?: string; label?: string }): boolean {
  const kit = g.player.kits.swarm;
  if (!kit || !isKind(kit.target)) return false;
  const kind = kit.target;
  if (!powered(kit, kind) || !ready(kit)) return false;
  if (!shoots(kind, shot, "player")) return false;
  if (kind !== "ward" && kind !== "ward2") return false;
  setCooldown(kit, DRONE_COOLDOWN_S[kind]);
  defenseStray(g, "player", kind, shot);
  return true;
}

/**
 * Augmentations, "Defense Scrambler": enemy Defense Drone I, Defense Drone II,
 * and Anti-Combat drones cannot acquire a target. The player's own drones are
 * not this check. A blocked drone does not spend its cooldown.
 */
export function enemyDefenseIntercept(g: Game, shot: { kind: string; from: string; defId?: string; label?: string }): boolean {
  const kit = g.enemy?.kits.swarm;
  // @agent:drones. A generated enemy fields several drones (kit.drones). Hand-built kits keep the single target below.
  if (kit?.drones) return enemyUnitsIntercept(g, kit.drones, shot);
  if (!kit || !isKind(kit.target)) return false;
  const kind = kit.target;
  if (g.augments.includes("scrambler") && scramblerBlocks(kind)) return false;
  if (!powered(kit, kind) || !ready(kit)) return false;
  if (!shoots(kind, shot, "enemy")) return false;
  if (kind !== "ward" && kind !== "ward2") return false;
  setCooldown(kit, DRONE_COOLDOWN_S[kind]);
  defenseStray(g, "enemy", kind, shot);
  return true;
}

function nextId(g: Game): string {
  g.uid = (g.uid + 1) >>> 0;
  return "u" + g.uid.toString(36);
}

function enemyRoom(g: Game): string | null {
  const rooms = g.enemy?.rooms;
  if (!rooms || rooms.length === 0) return null;
  const i = Math.floor(rand(g) * rooms.length);
  return rooms[i]?.id ?? null;
}

function pushStriker(g: Game, targetRoom: string) {
  const shot: Shot = {
    id: nextId(g),
    kind: "laser",
    from: "player",
    damage: STRIKER_DAMAGE,
    ion: STRIKER_ION,
    fireChance: STRIKER_FIRE,
    breachChance: STRIKER_BREACH,
    targetRoom,
    wait: SHOT_WAIT_S,
    t: SHOT_T,
    duration: STRIKER_FLIGHT_S,
    label: READY_LABEL,
  };
  g.shots.push(shot);
}

function retireReady(g: Game) {
  for (const shot of g.shots) {
    if (shot.label === READY_LABEL) shot.label = FLOWN_LABEL;
  }
}

function tickStriker(g: Game, kit: Kit, dt: number) {
  kit.aux += dt;
  while (kit.aux >= STRIKER_INTERVAL_S) {
    const room = enemyRoom(g);
    if (!room) {
      kit.aux = STRIKER_INTERVAL_S;
      return;
    }
    kit.aux -= STRIKER_INTERVAL_S;
    pushStriker(g, room);
  }
}

function tickWardcut(g: Game, kit: Kit, dt: number) {
  // Drone Control, Anti-Combat Drone: stuns combat drones for 5 seconds,
  // with a 47.8% chance to destroy them during that stun.
  // The 7000 ms recharge (DRONE_COOLDOWN_S.wardcut) counts down while powered.
  tickCooldown(kit, dt);
  // @agent:drones. The enemy's deployed drones are the targets (playerAntiCombat, below).
  if (ready(kit)) playerAntiCombat(g, kit);
}

function tickBeam(g: Game, kit: Kit, dt: number) {
  kit.aux += dt;
  while (kit.aux >= BEAM_INTERVAL_S) {
    const enemy = g.enemy;
    if (!enemy || enemy.rooms.length === 0) {
      kit.aux = BEAM_INTERVAL_S;
      return;
    }
    kit.aux -= BEAM_INTERVAL_S;
    // Drone Control, Anti-Ship Beam Drone I: "the beam cannot penetrate shields at all".
    // Combat Drones (offensive drones): a swipe started while shields are up
    // deals no hull/system damage to that room.
    if (enemy.shieldNow > 0) continue;
    const id = enemyRoom(g);
    const room = enemy.rooms.find((r) => r.id === id);
    if (!room) continue;
    enemy.hull = Math.max(0, enemy.hull - BEAM_DAMAGE);
    if (room.system) {
      const sys = enemy.systems[room.system];
      if (sys.damage < sys.level) sys.damage += BEAM_DAMAGE;
    }
    // INFERRED: one tile per swipe. "Anti-Ship Beam Drone I" gives a 10% chance per tile
    // and a beam length of 0.4 tile. No stack cap is stated.
    if (rand(g) < BEAM_FIRE) room.fire += 1;
  }
}

function tickBoard(g: Game, kit: Kit, dt: number) {
  kit.aux += dt;
  while (kit.aux >= BOARD_INTERVAL_S) {
    const enemy = g.enemy;
    if (!enemy || enemy.rooms.length === 0) {
      kit.aux = BOARD_INTERVAL_S;
      return;
    }
    kit.aux -= BOARD_INTERVAL_S;
    // Zoltan Shield: a boarding drone is destroyed on contact and does not damage the bubble.
    // Bypass still says launch-then-destroyed. The fitted path reads that row. It is never "pass".
    if ((enemy.zoltan ?? 0) > 0) {
      const via = g.augments.includes("bypass") ? bypassZoltan("board") : "destroyed";
      if (via !== "pass") {
        kit.on = false;
        log(g, "The boarding drone breaks on their Zoltan Shield.");
        return;
      }
    }
    // Drone Control, Boarding Drones: "They ignore regular shields".
    // shieldNow is not read and is not reduced. Boarding Drones > Boarding Drone
    // boards and attacks crew and systems inside.
    const alive = g.crew.filter(
      (c) => c.side === "enemy" && c.aboard === "enemy" && c.hp > 0 && enemy.rooms.some((r) => r.id === c.room),
    );
    if (alive.length > 0) {
      const rooms = enemy.rooms.filter((r) => alive.some((c) => c.room === r.id));
      const room = rooms[Math.floor(rand(g) * rooms.length)];
      if (!room) continue;
      const inRoom = alive.filter((c) => c.room === room.id);
      const crew = inRoom[Math.floor(rand(g) * inRoom.length)];
      if (!crew) continue;
      crew.hp -= BOARD_HIT;
      continue;
    }
    const systems = enemy.rooms.filter((r) => r.system);
    const pool = systems.length > 0 ? systems : enemy.rooms;
    const room = pool[Math.floor(rand(g) * pool.length)];
    if (!room?.system) continue;
    const sys = enemy.systems[room.system];
    const roomLeft = sys.level - sys.damage;
    if (roomLeft <= 0) continue;
    sys.damage += Math.min(BOARD_HIT, roomLeft);
  }
}

function linked(ship: Ship, id: string): string[] {
  const out: string[] = [];
  for (const door of ship.doors) {
    if (door.b === "void") continue;
    if (door.a === id) out.push(door.b);
    else if (door.b === id) out.push(door.a);
  }
  return out;
}

function route(ship: Ship, from: string, to: string): string[] | null {
  if (from === to) return [];
  const queue = [from];
  const prev = new Map<string, string | null>([[from, null]]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const next of linked(ship, cur)) {
      if (prev.has(next)) continue;
      prev.set(next, cur);
      if (next === to) {
        const path: string[] = [];
        let walk: string | null = to;
        while (walk && walk !== from) {
          path.push(walk);
          walk = prev.get(walk) ?? null;
        }
        path.reverse();
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function needsRepair(ship: Ship, room: Room): boolean {
  if (room.fire > 0 || room.breach > 0) return true;
  return !!room.system && ship.systems[room.system].damage > 0;
}

/** Nearest room with a fire, a breach, or system damage. The drone stays put when it is already there. */
function repairRoom(ship: Ship, from: string): string | null {
  const here = ship.rooms.find((room) => room.id === from);
  if (here && needsRepair(ship, here)) return null;
  let best: { id: string; steps: number } | null = null;
  for (const room of ship.rooms) {
    if (!needsRepair(ship, room)) continue;
    const path = route(ship, from, room.id);
    if (!path || path.length === 0) continue;
    if (!best || path.length < best.steps) best = { id: room.id, steps: path.length };
  }
  return best?.id ?? null;
}

function tickCrewDrone(g: Game, kit: Kit, dt: number) {
  const ship = g.player;
  if (!kit.room || !ship.rooms.some((room) => room.id === kit.room)) {
    kit.room = ship.rooms[0]?.id;
    kit.path = [];
    kit.move = 0;
  }
  if (!kit.room) return;
  if (!kit.path || kit.path.length === 0) {
    const dest = repairRoom(ship, kit.room);
    if (!dest) return;
    const path = route(ship, kit.room, dest);
    if (!path || path.length === 0) return;
    kit.path = path;
  }
  // INFERRED crew walk is one room in 0.6s. Drone Reactor Booster states the crew-drone fraction of that speed.
  const pace = crewDroneSpeed(g.augments.includes("booster"));
  kit.move = (kit.move ?? 0) + (dt * pace) / 0.6;
  if (kit.move >= 1) {
    const next = kit.path.shift();
    if (next) kit.room = next;
    kit.move = 0;
  }
}

function tickPatch(g: Game, kit: Kit, dt: number) {
  // Drone Control, Crew Drones > System Repair Drone: "Repairs systems and breaches, and puts out fires, at the same speed as an Engi".
  // The page gave no seconds, so this tick applies no repair rate.
  tickCrewDrone(g, kit, dt);
}

function tickHull(): void {
  // Drone Control, Defensive Drones > Hull Repair Drone: "repairing 3-5 hull points and then self-destructs".
  // That is a total, not hull-per-second. The page gave no seconds, so this tick applies no rate.
}

function tickCombat2(kit: Kit): void {
  // Drone Control, Combat Drone Mark II: "Power requirement: 4 power".
  // The page prints no cooldown, so no shot is built. Damage and fire stay on COMBAT2 until a cooldown exists.
  // Speed 28 is movement, not a fire interval.
  if (!kit.on || kit.power < COMBAT2.power) return;
  if (COMBAT2.cooldown == null) return;
}

function systemRooms(enemy: Ship): Room[] {
  return enemy.rooms.filter((room) => room.system);
}

/**
 * Drone Control, Ion Intruder Drone: "Health: 125 HP".
 * Enemy copies already stored this on DroneUnit. The player's drone uses Kit.hp.
 */
export const INTRUDER_HP = 125;

/**
 * Drone Control, Ion Intruder Drone: "Speed: 18 (when moving through space)".
 * A space-flight figure, not seconds, and not the interior step below.
 * BOARD_FLY_S stays the invented flight window. This number is not converted into it.
 */
export const INTRUDER_SPACE_SPEED = 18;

/**
 * INFERRED: one interior room takes the same 0.6s baseline as crew movement (sim.ts moveCrew).
 * "Speed: 18 (when moving through space)" is INTRUDER_SPACE_SPEED and is not this step.
 * "Quickly breaks down doors" has no printed rate, so the walk does not spend door hp.
 * "Will skip its cooldown if it attacked a blast door or a door locked with the Lockdown effect beforehand"
 * needs that rate, so the skip does not run either.
 */
const INTRUDER_ROOM_S = 0.6;

type Walker = { room?: string; path?: string[]; move?: number };

function stepIntruderWalk(walker: Walker, dt: number) {
  if (!walker.path?.length) return;
  walker.move = (walker.move ?? 0) + dt / INTRUDER_ROOM_S;
  while (walker.move >= 1 && walker.path.length > 0) {
    const next = walker.path.shift();
    if (next) walker.room = next;
    walker.move -= 1;
  }
  if (walker.path.length === 0) walker.move = 0;
}

/** A door-linked route to a different system. No route means it stays. The page does not teleport it. */
function intruderRoute(g: Game, ship: Ship, from: string, systems: Room[]): string[] {
  const pool = systems.filter((room) => room.id !== from);
  while (pool.length > 0) {
    const dest = pool.splice(Math.floor(rand(g) * pool.length), 1)[0];
    if (!dest) break;
    const path = route(ship, from, dest.id);
    if (path && path.length > 0) return path;
  }
  return [];
}

function hurtPlayerIntruder(g: Game, kit: Kit, dt: number): boolean {
  if (!kit.room || kit.hp == null) return false;
  const foes = g.crew.filter(
    (c) => c.aboard === "enemy" && c.room === kit.room && c.hp > 0 && c.path.length === 0 && (c.stun ?? 0) <= 0 && !forPlayer(c),
  );
  if (!foes.length) return false;
  kit.hp -= foes.reduce((sum, c) => sum + MELEE_DPS * kinOf(c.kin ?? "plain").fight * crewCombat(c) * dt, 0);
  if (kit.hp > 0) return false;
  kit.hp = 0;
  kit.path = [];
  kit.move = 0;
  killPlayerDrone(g, "Crew tore your ion intruder apart.");
  return true;
}

function rollIntruderWait(g: Game): number {
  // Drone Control, Ion Intruder: "Pulse time varies between 8.2 and 10 seconds."
  // INFERRED: each wait is uniform inside that range. The page names no distribution.
  return INTRUDER.pulseMin + rand(g) * (INTRUDER.pulseMax - INTRUDER.pulseMin);
}

function pulseIntruder(g: Game, enemy: Ship, kit: Kit): void {
  const systems = systemRooms(enemy);
  if (systems.length === 0) return;
  if (!kit.room || !systems.some((room) => room.id === kit.room)) {
    kit.room = systems[Math.floor(rand(g) * systems.length)]?.id;
  }
  const room = enemy.rooms.find((item) => item.id === kit.room);
  if (room?.system) {
    const sys = enemy.systems[room.system];
    // A destroyed system is not ionized. An ionized system is still a target.
    if (sys.damage < sys.level) {
      applyIon(enemy, room.system, INTRUDER.ion);
      for (const c of g.crew) {
        if (c.side !== "enemy" || c.aboard !== "enemy" || c.room !== room.id || c.hp <= 0) continue;
        if ((c.leashed ?? 0) > 0) continue;
        c.stun = INTRUDER.stunSeconds;
      }
    }
  }
  // "then moves to a different system". The walk is stepIntruderWalk. This pulse only chooses the rooms.
  if (kit.room) kit.path = intruderRoute(g, enemy, kit.room, systems);
}

function overchargerWait(layers: number): number | null {
  // The table is only 0 through 4 existing layers. Five or more has no printed time.
  if (!Number.isInteger(layers) || layers < 0 || layers >= OVERCHARGER.waits.length) return null;
  return OVERCHARGER.waits[layers] ?? null;
}

function addOvercharge(ship: Ship): void {
  // Drone Control, Shield Overcharger: "Periodically adds 1 point of Zoltan Shield to regular shields."
  // A bubble created while none was present is the overcharged shield a jump drops.
  // An existing bubble, including a depleted 0, is not marked. Jump still recharges that one to 5.
  const born = ship.zoltan == null;
  ship.zoltan = (ship.zoltan ?? 0) + 1;
  if (born) ship.zoltanOver = true;
}

function tickOvercharger(g: Game, kit: Kit, dt: number): void {
  // Drone Control, Shield Overcharger and Shield Overcharger +.
  // Speed 5 is movement. This tick does not move the drone and does not fire.
  const need = kit.target === "overchargerplus" ? OVERCHARGER_PLUS.power : OVERCHARGER.power;
  // "Each timer resets should the drone become unpowered."
  if (!kit.on || kit.power < need) {
    kit.aux = 0;
    kit.left = 0;
    return;
  }
  const ship = g.player;
  // The wait is the layer count when this charge started. A hit during it does not pick a new time.
  if (!(kit.left > 0)) {
    const wait = overchargerWait(ship.zoltan ?? 0);
    if (wait == null) return;
    kit.left = wait;
    kit.aux = 0;
  }
  kit.aux += dt;
  while (kit.left > 0 && kit.aux >= kit.left) {
    kit.aux -= kit.left;
    addOvercharge(ship);
    const next = overchargerWait(ship.zoltan ?? 0);
    if (next == null) {
      kit.left = 0;
      kit.aux = 0;
      return;
    }
    kit.left = next;
  }
}

function tickIntruder(g: Game, kit: Kit, dt: number): void {
  if (kit.hp == null) kit.hp = INTRUDER_HP;
  if (!(kit.left > 0)) kit.left = rollIntruderWait(g);
  // Removing power does not reset the cooldown. The timer freezes: it is not zeroed and it does not advance.
  if (!kit.on || kit.power < INTRUDER.power) return;
  const enemy = g.enemy;
  if (!enemy) return;
  const systems = systemRooms(enemy);
  if (!kit.room || !systems.some((room) => room.id === kit.room)) {
    kit.room = systems[Math.floor(rand(g) * systems.length)]?.id;
    kit.path = [];
    kit.move = 0;
  }
  if (hurtPlayerIntruder(g, kit, dt)) return;
  // The walk started by the previous pulse. Speed 18 is space flight, not this step.
  if (kit.path?.length) stepIntruderWalk(kit, dt);
  kit.aux += dt;
  while (kit.aux >= kit.left) {
    pulseIntruder(g, enemy, kit);
    kit.aux -= kit.left;
    kit.left = rollIntruderWait(g);
  }
}

/**
 * Charge the deployed drone. Defense cooldowns count down on kit.cool and kit.aux.
 * A striker that reaches its interval pushes a laser onto g.shots (no module stash).
 * Timers pause while fed bars are under that drone's power.
 * INFERRED: Overview says a drone stops when the system cannot power it, and
 * Anti-Combat needs continuous power to recharge.
 */
function tickEnemyDefense(g: Game, dt: number) {
  const kit = g.enemy?.kits.swarm;
  if (!kit || !isKind(kit.target)) return;
  const kind = kit.target;
  if (kind !== "ward" && kind !== "ward2" && kind !== "wardcut") return;
  if (!powered(kit, kind)) return;
  tickCooldown(kit, dt);
}

export function tickSwarm(g: Game, dt: number) {
  retireReady(g);
  if (!(dt > 0)) return;
  tickEnemyDefense(g, dt);
  // @agent:drones. Enemy Drone Control: deploy on the first combat tick, then run every deployed drone.
  tickEnemyDrones(g, dt);
  ageBlasts(g, dt);
  const kit = g.player.kits.swarm;
  // @agent:drones. The 10 second redeploy delay after a destroyed drone (deploy). It runs whether or not bars are fed.
  if (kit && (kit.lost ?? 0) > 0) kit.lost = Math.max(0, (kit.lost ?? 0) - dt);
  if (!kit?.target) return;
  // @agent:drones. Drone Control, Anti-Combat Drone: an enemy one stunned this drone ("the 5 seconds stun").
  // An ion stun (ionHitsKit) also rolls Overview's 15% per second after the first.
  if ((kit.stun ?? 0) > 0) {
    const spent = Math.min(dt, kit.stun ?? 0);
    kit.stun = Math.max(0, (kit.stun ?? 0) - dt);
    if (kit.ionT != null) {
      const before = kit.ionT;
      kit.ionT = before + spent;
      if (ionBurnsOut(g, before, kit.ionT)) {
        killPlayerDrone(g, `Your ${unitName(kit.target)} burns out under the ion charge.`);
        return;
      }
      if (kit.stun <= 0) kit.ionT = undefined;
    }
    return;
  }
  if (kit.target === "combat2") {
    tickCombat2(kit);
    return;
  }
  if (kit.target === "ionintruder") {
    tickIntruder(g, kit, dt);
    return;
  }
  if (kit.target === "overcharger" || kit.target === "overchargerplus") {
    tickOvercharger(g, kit, dt);
    return;
  }
  if (!isKind(kit.target) || !powered(kit, kit.target)) return;
  const kind = kit.target;
  if (kind === "striker") {
    tickStriker(g, kit, dt);
    return;
  }
  if (kind === "beam") {
    tickBeam(g, kit, dt);
    return;
  }
  if (kind === "board") {
    tickBoard(g, kit, dt);
    return;
  }
  if (kind === "patch") {
    tickPatch(g, kit, dt);
    return;
  }
  if (kind === "hull") {
    tickHull();
    return;
  }
  if (kind === "wardcut") {
    tickWardcut(g, kit, dt);
    return;
  }
  tickCooldown(kit, dt);
}

/** Combat lasers that became ready on the latest tickSwarm call. */
export function swarmCombatShots(
  g: Game,
): Array<{ damage: number; fireChance: number; kind: "laser" }> {
  const out: Array<{ damage: number; fireChance: number; kind: "laser" }> = [];
  for (const shot of g.shots) {
    if (shot.label !== READY_LABEL || shot.kind !== "laser") continue;
    out.push({ damage: shot.damage, fireChance: shot.fireChance, kind: "laser" });
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────────────────
// @agent:drones. Enemy Drone Control. A generated enemy carries kit.loadout (enemy-gen.ts rollDrones) and
// deploys it here as kit.drones. The player's single-target kit above is unchanged.
// ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Drone Control, "Defensive Drones": "They also require approximately a second to acquire a target after being
 * deployed or reactivated". INFERRED: exactly 1 second, for all three defensive schematics the enemy flies.
 */
export const ACQUIRE_S = 1;

/** Drone Control, Overview: "If a drone is destroyed, there is a 10 second delay before it can be deployed again (costing another part)." */
export const REDEPLOY_S = 10;

/** Drone Control, Anti-Combat Drone: "Stuns Combat, Hacking, and Boarding drones with 47.8% chance to destroy them during the 5 seconds stun". */
export const ANTI_STUN_S = 5;
export const ANTI_KILL = 47.8 / 100;

/**
 * Drone Control, Overview: "External drones hit by an ion shot are stunned for 5 seconds for each ion damage.
 * Each second of stun after the first, they have a 15% chance to be destroyed."
 */
export const ION_STUN_PER = 5;
export const ION_KILL_PER_S = 15 / 100;

/**
 * Health lines: Boarding Drone "Health: 150 HP", Ion Intruder Drone "Health: 125 HP",
 * Anti-Personnel Drone "Health: 150 HP", System Repair Drone "Health: 25 HP".
 */
const UNIT_HP: Record<string, number> = { board: 150, ionintruder: INTRUDER_HP, personnel: 150, patch: 25 };

/**
 * INVENTED: Boarding Drone and Ion Intruder print "Speed: 18 (when moving through space)" (INTRUDER_SPACE_SPEED),
 * a movement figure, not seconds. 3 seconds of flight is the window your defense drones get to shoot one down.
 */
export const BOARD_FLY_S = 3;

/** INFERRED: mirrors sim.ts "one crew seals one system bar in 6 seconds". A boarding drone breaks one bar per 6 s of attacks. */
const BREAK_BAR_S = 6;

/** INFERRED: sim.ts life() trades blows at 6 HP per second per crew member, times that crew's combat multiplier. */
const MELEE_DPS = 6;

/** Crew skills, Combat skill: the attacker's rank multiplies damage to an onboard drone. Level 0 stays ×1. */
function crewCombat(c: Crew): number {
  return combatSkillMult(skillRank(c.skills?.combat ?? 0, xpNeedFor(c, "combat")));
}

/** INVENTED: how long a drone beam swipe takes to land. The pages give beam speed and length, not seconds. */
const DRONE_BEAM_S = 0.4;

/**
 * INFERRED: Combat Drones (offensive drones) says attack rate follows movement ("Moves faster, and consequently has a
 * higher rate of fire" on Combat Drone Mark II). Beam I is "Speed: 15", Beam II "Speed: 11", Fire Drone "Speed: 12",
 * so their swipe intervals are the Beam I interval scaled by 15/11 and 15/12.
 */
const BEAM2_INTERVAL_S = BEAM_INTERVAL_S * (15 / 11);
const FIRE_INTERVAL_S = BEAM_INTERVAL_S * (15 / 12);

/** Anti-Ship Fire Drone: "90% chance to set a tile on fire" and "Does no hull damage". */
const FIRE_DRONE_FIRE = 90 / 100;

/**
 * Combat Drones (offensive drones): "Damage to Zoltan Shields is ... 1 per beam drone swipe (2 for Beam Drone II ...)".
 * Anti-Ship Fire Drone: "Does 1 damage to a Zoltan Shield, just like the Anti-Ship Beam Drone I".
 */
const SWIPE_ZOLTAN: Record<string, number> = { beam: 1, beam2: 2, fire: 1 };

/** Fires extinguished per second by one crew member, sim.ts life() (INFERRED there). Used for the System Repair Drone. */
const EXTINGUISH = 0.45;

/** Shot label prefix for a shot fired by an enemy drone. CombatFx reads the drone id after the colon. */
export const DRONE_LABEL = "drone:";

/** Drone Control, "Combat Drones (offensive drones)": these orbit the target ship. */
const OFFENSIVE = new Set(["striker", "combat2", "beam", "beam2", "fire"]);
/** Drone Control, "Boarding Drones": Boarding Drone and Ion Intruder Drone fly to the target and breach in. */
const BOARDERS = new Set(["board", "ionintruder"]);
/** Drone Control, "Defensive Drones" the enemy flies. */
const DEFENSIVE = new Set(["ward", "ward2", "wardcut", "overcharger"]);
/** Drone Control, "Crew Drones": stay aboard their own ship. */
const CREW_DRONES = new Set(["patch", "personnel"]);

/** Where a deployed enemy drone is, for CombatFx: around the player hull, around its own hull, flying, or in a room. */
export type EnemyDroneSpot =
  | { at: "player-orbit" }
  | { at: "enemy-orbit" }
  | { at: "flying"; progress: number }
  | { at: "player-room"; room: string }
  | { at: "enemy-room"; room: string };

export function enemyDroneSpot(unit: DroneUnit): EnemyDroneSpot | null {
  if (!unit.alive) return null;
  if (OFFENSIVE.has(unit.kind)) return { at: "player-orbit" };
  if (BOARDERS.has(unit.kind)) {
    if ((unit.fly ?? 0) > 0 || !unit.room) return { at: "flying", progress: 1 - Math.max(0, unit.fly ?? 0) / BOARD_FLY_S };
    return { at: "player-room", room: unit.room };
  }
  if (CREW_DRONES.has(unit.kind)) return unit.room ? { at: "enemy-room", room: unit.room } : { at: "enemy-orbit" };
  return { at: "enemy-orbit" };
}

function unitPower(kind: string): number {
  return SCHEMATIC_POWER[kind] ?? Number.POSITIVE_INFINITY;
}

/** Fights for the player: player crew, or enemy crew under the player's mind control. Same rule as sim.ts life(). */
function forPlayer(c: Crew): boolean {
  return (c.leashed ?? 0) > 0 ? c.side === "enemy" : c.side === "player";
}

function stowed(kind: string, i: number, g: Game): DroneUnit {
  return { id: `ed-${i}-${nextId(g)}`, kind, alive: false, powered: false, aux: 0, cool: 0 };
}

function deployUnit(g: Game, enemy: Ship, unit: DroneUnit) {
  // Drone Control, Overview: activating a drone that is not deployed "will spend one drone part".
  enemy.parts -= PART_COST;
  const intruderCharge = unit.kind === "ionintruder" && (unit.left ?? 0) > 0 ? { aux: unit.aux, left: unit.left } : null;
  unit.alive = true;
  unit.powered = true;
  unit.aux = 0;
  unit.fix = 0;
  unit.stun = undefined;
  unit.ionT = undefined;
  unit.fired = undefined;
  unit.room = undefined;
  unit.path = undefined;
  unit.move = undefined;
  unit.hp = UNIT_HP[unit.kind];
  unit.fly = BOARDERS.has(unit.kind) ? BOARD_FLY_S : undefined;
  // Defensive Drones: "require approximately a second to acquire a target after being deployed".
  // Anti-Combat Drone: "Starts fully charged when first deployed", so after that second it fires at once.
  unit.cool = DEFENSIVE.has(unit.kind) ? ACQUIRE_S : 0;
  unit.left = undefined;
  // Ion Intruder Drone: "A newly deployed enemy Ion Intruder can have a full charge of the previously destroyed Ion Intruder".
  if (intruderCharge) {
    unit.aux = intruderCharge.aux;
    unit.left = intruderCharge.left;
  }
}

function killUnit(g: Game, unit: DroneUnit, why: string) {
  unit.alive = false;
  unit.powered = false;
  unit.cool = REDEPLOY_S;
  unit.stun = undefined;
  unit.ionT = undefined;
  unit.fly = undefined;
  unit.room = undefined;
  unit.path = undefined;
  unit.move = undefined;
  if (unit.kind !== "ionintruder") {
    unit.aux = 0;
    unit.left = undefined;
  }
  log(g, why);
}

/**
 * Deploy, power, and run every enemy drone. Drone Control, "Drone Schematics": "Before the start of a ship fight it
 * is impossible to know the exact drones the enemy ship will deploy, because the Drone Control system is technically
 * depowered and the drones aren't deployed yet." So nothing is deployed until the first combat tick, and that tick
 * only deploys: no drone acts on the tick it launches (INFERRED).
 * Power: Drone Control bars (kitBars) go to deployed drones in loadout order. A drone the bars no longer cover stops
 * (Overview: "The drone will stay active until it is destroyed, its system is too damaged to power it, or you
 * deactivate it"). It stays deployed, and repowering it spends no part (Overview: only a drone "not already
 * deployed" spends one). A destroyed drone waits REDEPLOY_S and then spends a part to deploy again.
 * INFERRED: the enemy always redeploys when it has the power and a part.
 */
export function tickEnemyDrones(g: Game, dt: number) {
  const enemy = g.enemy;
  const kit = enemy?.kits.swarm;
  if (!enemy || !kit?.loadout?.length) return;
  const first = !kit.drones;
  if (!kit.drones) kit.drones = kit.loadout.map((kind, i) => stowed(kind, i, g));
  const bars = kitBars(kit);
  let used = 0;
  for (const unit of kit.drones) {
    // @agent:flagship. The Rebel Flagship prints "Boarding Drone (Boss) (2)" (wiki/flagship-systems.ts).
    const need = flagshipDronePower(enemy, unit.kind) ?? unitPower(unit.kind);
    if (!unit.alive) {
      unit.powered = false;
      if (!first) unit.cool = Math.max(0, unit.cool - dt);
      if (unit.cool > 0 || used + need > bars || enemy.parts < PART_COST) continue;
      deployUnit(g, enemy, unit);
      used += need;
      kit.on = true;
      const name = unitName(unit.kind);
      log(g, `Their Drone Control launches ${/^[aeiou]/.test(name) ? "an" : "a"} ${name}.`);
      continue;
    }
    const was = unit.powered;
    unit.powered = used + need <= bars;
    if (unit.powered) used += need;
    // Defensive Drones: the acquire second also follows a reactivation.
    if (unit.powered && !was && DEFENSIVE.has(unit.kind)) unit.cool = Math.max(unit.cool, ACQUIRE_S);
    tickUnit(g, enemy, unit, dt);
  }
}

function unitName(kind: string): string {
  const names: Record<string, string> = {
    striker: "combat drone",
    combat2: "combat drone",
    beam: "beam drone",
    beam2: "beam drone",
    fire: "fire drone",
    ward: "defense drone",
    ward2: "defense drone",
    wardcut: "anti-combat drone",
    overcharger: "shield overcharger",
    patch: "repair drone",
    personnel: "anti-personnel drone",
    board: "boarding drone",
    ionintruder: "ion intruder",
    overchargerplus: "shield overcharger",
    hull: "hull repair drone",
  };
  return names[kind] ?? "drone";
}

function tickStun(g: Game, unit: DroneUnit, dt: number) {
  const left = unit.stun ?? 0;
  const spent = Math.min(dt, left);
  unit.stun = left - spent;
  if (unit.ionT != null) {
    const before = unit.ionT;
    const after = before + spent;
    unit.ionT = after;
    // Overview: "Each second of stun after the first, they have a 15% chance to be destroyed."
    for (let s = Math.floor(before) + 1; s <= Math.floor(after + 1e-9); s++) {
      if (s >= 2 && rand(g) < ION_KILL_PER_S) {
        killUnit(g, unit, `Their ${unitName(unit.kind)} burns out under the ion charge.`);
        return;
      }
    }
  }
  if ((unit.stun ?? 0) <= 0) {
    unit.stun = undefined;
    unit.ionT = undefined;
  }
}

function tickUnit(g: Game, enemy: Ship, unit: DroneUnit, dt: number) {
  unit.fired = (unit.fired ?? Number.POSITIVE_INFINITY) + dt;
  if ((unit.stun ?? 0) > 0) {
    tickStun(g, unit, dt);
    if (!unit.alive || (unit.stun ?? 0) > 0) return;
  }
  // Overview: "Crew and boarding drones can be damaged and destroyed by hostile crew". Power does not matter for that.
  if ((BOARDERS.has(unit.kind) && (unit.fly ?? 0) <= 0 && unit.room) || CREW_DRONES.has(unit.kind)) {
    const aboard = BOARDERS.has(unit.kind) ? "player" : "enemy";
    if (crewHitsDrone(g, unit, aboard, dt)) return;
  }
  if (!unit.powered) {
    // Shield Overcharger: "Each timer resets should the drone become unpowered".
    // Ion Intruder Drone: "Removing power does not reset its cooldown", so its timer just freezes.
    if (unit.kind === "overcharger") {
      unit.aux = 0;
      unit.left = undefined;
    }
    return;
  }
  switch (unit.kind) {
    case "ward":
    case "ward2":
      unit.cool = Math.max(0, unit.cool - dt);
      return;
    case "wardcut":
      unit.cool = Math.max(0, unit.cool - dt);
      if (unit.cool <= 0) enemyAntiCombat(g, unit);
      return;
    case "striker":
      tickEnemyStriker(g, unit, dt);
      return;
    case "beam":
    case "beam2":
    case "fire":
      tickEnemyBeam(g, unit, dt);
      return;
    case "overcharger":
      tickEnemyOvercharger(enemy, unit, dt);
      return;
    case "board":
    case "ionintruder":
      tickEnemyBoarder(g, unit, dt);
      return;
    case "patch":
      tickEnemyPatch(g, enemy, unit, dt);
      return;
    case "personnel":
      tickEnemyPersonnel(g, unit, dt);
      return;
  }
}

/** Returns true when the drone died. Each non-stunned crew member fighting for the player hits it at MELEE_DPS × combat. */
function crewHitsDrone(g: Game, unit: DroneUnit, aboard: "player" | "enemy", dt: number): boolean {
  if (!unit.room || unit.hp == null) return false;
  const foes = g.crew.filter(
    (c) => c.aboard === aboard && c.room === unit.room && c.hp > 0 && c.path.length === 0 && (c.stun ?? 0) <= 0 && forPlayer(c),
  );
  if (!foes.length) return false;
  unit.hp -= foes.reduce((sum, c) => sum + MELEE_DPS * kinOf(c.kin ?? "plain").fight * crewCombat(c) * dt, 0);
  if (unit.hp > 0) return false;
  killUnit(g, unit, `Crew tore their ${unitName(unit.kind)} apart.`);
  return true;
}

function randomOf<T>(g: Game, list: readonly T[]): T | undefined {
  if (!list.length) return undefined;
  return list[Math.floor(rand(g) * list.length) % list.length];
}

/** Combat Drone Mark I on the player: "Continually attacks the enemy ship with a single laser blast". Same cadence and damage as yours. */
function tickEnemyStriker(g: Game, unit: DroneUnit, dt: number) {
  unit.aux += dt;
  while (unit.aux >= STRIKER_INTERVAL_S) {
    // INFERRED: Cloaking, Overview: "weapons cannot target a cloaked ship". The drone holds its charged shot.
    const room = veilBlocks(g, "enemy") ? undefined : randomOf(g, g.player.rooms);
    if (!room) {
      unit.aux = STRIKER_INTERVAL_S;
      return;
    }
    unit.aux -= STRIKER_INTERVAL_S;
    unit.fired = 0;
    // Combat Drones (offensive drones): "orbit the enemy ship and attack it repeatedly, targeting random rooms".
    g.shots.push({
      id: nextId(g),
      kind: "laser",
      from: "enemy",
      damage: STRIKER_DAMAGE,
      ion: STRIKER_ION,
      fireChance: STRIKER_FIRE,
      breachChance: STRIKER_BREACH,
      targetRoom: room.id,
      wait: SHOT_WAIT_S,
      t: SHOT_T,
      duration: STRIKER_FLIGHT_S,
      label: DRONE_LABEL + unit.id,
    });
  }
}

function linkedRoom(g: Game, ship: Ship, id: string): string | undefined {
  return randomOf(g, linked(ship, id));
}

/**
 * Beam Drone I / II and Fire Drone on the player.
 * Anti-Ship Beam Drone I: "While fast and 100% accurate, the beam cannot penetrate shields at all".
 * Combat Drones (offensive drones): "If a Beam Drone I/II swipe was started in a room while the shields (either
 * normal or Zoltan) were up, there won't be hull/system damage to that room".
 * Anti-Ship Beam Drone II: "has a longer beam length, so it can often hit 2 rooms". INFERRED: a door-linked
 * neighbour always takes the second room.
 */
function tickEnemyBeam(g: Game, unit: DroneUnit, dt: number) {
  const interval = unit.kind === "beam2" ? BEAM2_INTERVAL_S : unit.kind === "fire" ? FIRE_INTERVAL_S : BEAM_INTERVAL_S;
  unit.aux += dt;
  while (unit.aux >= interval) {
    const ship = g.player;
    const room = veilBlocks(g, "enemy") ? undefined : randomOf(g, ship.rooms);
    if (!room) {
      unit.aux = interval;
      return;
    }
    unit.aux -= interval;
    unit.fired = 0;
    unit.room = room.id;
    if ((ship.zoltan ?? 0) > 0) {
      ship.zoltan = Math.max(0, (ship.zoltan ?? 0) - (SWIPE_ZOLTAN[unit.kind] ?? 1));
      log(g, `Their ${unitName(unit.kind)} drains the Zoltan Shield to ${ship.zoltan}.`);
      continue;
    }
    if (ship.shieldNow > 0) continue;
    if (unit.kind === "fire") {
      // Anti-Ship Fire Drone: "90% chance to set a tile on fire". INFERRED: one tile per swipe, 3 fires per room as elsewhere.
      if (rand(g) < FIRE_DRONE_FIRE) {
        room.fire = Math.min(3, room.fire + 1);
        log(g, `Their fire drone lights the ${room.title}.`);
      }
      continue;
    }
    const second = unit.kind === "beam2" ? linkedRoom(g, ship, room.id) : undefined;
    g.shots.push({
      id: nextId(g),
      kind: "beam",
      from: "enemy",
      // Combat Drones (offensive drones): "1 hull/system damage ... per room crossed by the beam".
      damage: BEAM_DAMAGE,
      ion: 0,
      // Anti-Ship Beam Drone I / II: "10% chance to set a tile on fire".
      fireChance: BEAM_FIRE,
      breachChance: 0,
      targetRoom: room.id,
      beamRooms: second ? [room.id, second] : [room.id],
      wait: 0,
      t: 0,
      duration: DRONE_BEAM_S,
      label: DRONE_LABEL + unit.id,
    });
  }
}

/** Shield Overcharger on the enemy hull: "Periodically adds 1 point of Zoltan Shield to regular shields", same table as yours. */
function tickEnemyOvercharger(enemy: Ship, unit: DroneUnit, dt: number) {
  if (!((unit.left ?? 0) > 0)) {
    const wait = overchargerWait(enemy.zoltan ?? 0);
    if (wait == null) return;
    unit.left = wait;
    unit.aux = 0;
  }
  unit.aux += dt;
  while ((unit.left ?? 0) > 0 && unit.aux >= (unit.left ?? 0)) {
    unit.aux -= unit.left ?? 0;
    addOvercharge(enemy);
    unit.fired = 0;
    const next = overchargerWait(enemy.zoltan ?? 0);
    if (next == null) {
      unit.left = undefined;
      unit.aux = 0;
      return;
    }
    unit.left = next;
  }
}

/** One system bar of damage on the player hull, with the same power cap and shield sync as a weapon hit. */
function breakPlayerBar(g: Game, id: SysId) {
  const ship = g.player;
  const sys = ship.systems[id];
  if (sys.damage >= sys.level) return;
  sys.damage += 1;
  const cap = Math.max(0, sys.level - sys.damage - sys.ion.length);
  if (isMain(id) && sys.power > cap) sys.power = cap;
  syncShields(ship, zoltanBars(g.crew, ship, "player", "shields"));
}

function playerSystemRooms(g: Game): Room[] {
  return g.player.rooms.filter((room) => room.system);
}

/**
 * Boarding Drone and Ion Intruder against the player.
 * Boarding Drones: "When deployed, Boarding Drones fly to the enemy ship, breach the hull and attack crew and systems
 * inside." "They ignore regular shields, but are destroyed when contacting a Zoltan Shield (the Zoltan Shield will be
 * unaffected)." "They can be shot down by defensive drones". "They cannot board a cloaked ship."
 * "They are unaffected by fires and low oxygen": a DroneUnit is not a Crew, so fire and air never touch it.
 */
function tickEnemyBoarder(g: Game, unit: DroneUnit, dt: number) {
  if ((unit.fly ?? 0) > 0 || !unit.room) {
    // INFERRED: against a cloaked ship the drone holds off in space until the cloak drops.
    if (veilBlocks(g, "enemy")) return;
    const hit = interceptIncomingDrone(g, "player", "boarding");
    if (hit === "down") {
      killUnit(g, unit, `Your drone shot down their ${unitName(unit.kind)}.`);
      return;
    }
    if (hit === "stun") {
      unit.stun = ANTI_STUN_S;
      return;
    }
    unit.fly = Math.max(0, (unit.fly ?? 0) - dt);
    if (unit.fly > 0) return;
    if ((g.player.zoltan ?? 0) > 0) {
      killUnit(g, unit, `Their ${unitName(unit.kind)} breaks on the Zoltan Shield.`);
      return;
    }
    // INFERRED: the page does not say where a drone breaches in. A random system room, any room if none.
    const systems = playerSystemRooms(g);
    const room = randomOf(g, systems.length ? systems : g.player.rooms);
    if (!room) return;
    unit.room = room.id;
    unit.fly = 0;
    unit.aux = unit.kind === "ionintruder" ? unit.aux : 0;
    // "breach the hull": INFERRED one breach in the landing room.
    if (room.breach < 1) room.breach = 1;
    log(g, `Their ${unitName(unit.kind)} breaches into the ${room.title}.`);
    return;
  }
  if (unit.kind === "ionintruder") tickEnemyIntruder(g, unit, dt);
  else tickEnemyBoard(g, unit, dt);
}

/** Boarding Drone: "Boards enemy ships and attacks enemy crew and systems". Attacks at the same 1 s / 6 HP as yours. */
function tickEnemyBoard(g: Game, unit: DroneUnit, dt: number) {
  unit.aux += dt;
  while (unit.aux >= BOARD_INTERVAL_S) {
    unit.aux -= BOARD_INTERVAL_S;
    const here = g.player.rooms.find((room) => room.id === unit.room);
    if (!here) return;
    const foes = g.crew.filter((c) => c.aboard === "player" && c.room === here.id && c.hp > 0 && forPlayer(c));
    const crew = randomOf(g, foes);
    if (crew) {
      crew.hp -= BOARD_HIT;
      unit.fired = 0;
      continue;
    }
    const sys = here.system ? g.player.systems[here.system] : null;
    if (here.system && sys && sys.damage < sys.level) {
      unit.fix = (unit.fix ?? 0) + BOARD_INTERVAL_S;
      unit.fired = 0;
      if (unit.fix >= BREAK_BAR_S) {
        unit.fix = 0;
        breakPlayerBar(g, here.system);
        log(g, `Their boarding drone wrecks the ${here.title}.`);
      }
      continue;
    }
    // INFERRED: nothing left here, so it moves to another working system. Room-to-room walking is not modelled.
    const next = randomOf(
      g,
      playerSystemRooms(g).filter((room) => room.id !== here.id && g.player.systems[room.system!].damage < g.player.systems[room.system!].level),
    );
    if (next) {
      unit.room = next.id;
      unit.fix = 0;
    }
  }
}

/**
 * Ion Intruder Drone on the player: "Periodically emits an ion blast that deals 3 ion damage to the system and stuns
 * enemy crew, then moves to a different system". "Will not attempt to ionise a destroyed system, but will still
 * target systems that are ionised". "Doesn't stun friendly crew affected by mind control (e.g. enemy's Ion Intruder
 * won't stun mind-controlled boarders on your ship, but will stun your mind-controlled crew)": it stuns player-side
 * crew by origin, leashed or not, and never enemy-side crew.
 */
function tickEnemyIntruder(g: Game, unit: DroneUnit, dt: number) {
  if (unit.hp == null) unit.hp = INTRUDER_HP;
  if (unit.path?.length) stepIntruderWalk(unit, dt);
  if (!((unit.left ?? 0) > 0)) unit.left = rollIntruderWait(g);
  unit.aux += dt;
  while (unit.aux >= (unit.left ?? 0)) {
    unit.aux -= unit.left ?? 0;
    unit.left = rollIntruderWait(g);
    const ship = g.player;
    const room = ship.rooms.find((item) => item.id === unit.room);
    if (room?.system) {
      const sys = ship.systems[room.system];
      if (sys.damage < sys.level) {
        applyIon(ship, room.system, INTRUDER.ion, zoltanBars(g.crew, ship, "player", "shields"));
        for (const c of g.crew) {
          if (c.side !== "player" || c.aboard !== "player" || c.room !== room.id || c.hp <= 0) continue;
          c.stun = Math.max(c.stun ?? 0, INTRUDER.stunSeconds);
        }
        unit.fired = 0;
        log(g, `Their ion intruder pulses the ${room.title}.`);
      }
    }
    // "then moves to a different system". No printed door-break rate, so door hp is left alone.
    if (unit.room) unit.path = intruderRoute(g, ship, unit.room, playerSystemRooms(g));
  }
}

/**
 * System Repair Drone aboard the enemy: "Repairs systems and breaches, and puts out fires, at the same speed as an
 * Engi". Uses the sim.ts repair counters (6 crew-seconds a bar, 8 a breach) at the Engi repair multiplier.
 * INFERRED: it goes straight to the first room needing work (fire, then breach, then system or subsystem). The
 * wiki's priority list and walking are not modelled.
 */
function tickEnemyPatch(g: Game, enemy: Ship, unit: DroneUnit, dt: number) {
  const engi = kinOf("shell").repair;
  const work = (room: Room) =>
    room.fire > 0 ||
    room.breach > 0 ||
    (!!room.system && enemy.systems[room.system].damage > 0) ||
    (!!room.kit && (enemy.kits[room.kit]?.damage ?? 0) > 0);
  const here = enemy.rooms.find((room) => room.id === unit.room);
  const room = here && work(here) ? here : enemy.rooms.find(work);
  if (!room) {
    unit.room = undefined;
    return;
  }
  unit.room = room.id;
  unit.fired = 0;
  if (room.fire > 0) {
    room.fire = Math.max(0, room.fire - EXTINGUISH * dt);
    return;
  }
  if (room.breach > 0) {
    room.breachFix += engi * dt;
    return;
  }
  if (room.system && enemy.systems[room.system].damage > 0) {
    const sys = enemy.systems[room.system];
    sys.fix += engi * dt;
    if (sys.fix >= 6) {
      sys.damage = Math.max(0, sys.damage - 1);
      sys.fix = 0;
    }
    return;
  }
  const kit = room.kit ? enemy.kits[room.kit] : undefined;
  if (kit && (kit.damage ?? 0) > 0) {
    kit.fix = (kit.fix ?? 0) + engi * dt;
    if (kit.fix >= 6) {
      kit.damage = Math.max(0, (kit.damage ?? 0) - 1);
      kit.fix = 0;
      // Same as sim.ts crew repair: an enemy re-powers each bar it fixes.
      kit.power = kit.level - kit.damage;
    }
  }
}

/**
 * Anti-Personnel Drone aboard the enemy: "Attacks intruders, dealing the same damage as an untrained Human".
 * INFERRED: sim.ts melee rate (6 HP/s for a Human), split across intruders in its room, and it goes straight to
 * the first room holding an intruder.
 */
function tickEnemyPersonnel(g: Game, unit: DroneUnit, dt: number) {
  const intruders = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0 && forPlayer(c));
  if (!intruders.length) {
    unit.room = undefined;
    return;
  }
  if (!intruders.some((c) => c.room === unit.room)) unit.room = intruders[0].room;
  const here = intruders.filter((c) => c.room === unit.room);
  for (const c of here) c.hp -= (MELEE_DPS * dt) / here.length;
  unit.fired = 0;
}

/**
 * Enemy Anti-Combat Drone: "Stuns combat drones attacking your ship" with "47.8% chance to destroy them during the
 * 5 seconds stun". Augmentations, "Defense Scrambler": an enemy Anti-Combat drone cannot acquire a target.
 * INFERRED: it only targets your orbiting combat drones (striker, beam, Mark II). Your boarding drone and Ion Intruder
 * have no flight in this sim, so it never sees them.
 */
function enemyAntiCombat(g: Game, unit: DroneUnit) {
  if (g.augments.includes("scrambler") && scramblerBlocks("wardcut")) return;
  const kit = g.player.kits.swarm;
  if (!kit?.on || !kit.target || !OFFENSIVE.has(kit.target) || (kit.stun ?? 0) > 0) return;
  // "after the first shot it needs continuous power for 7 seconds to charge the next one".
  unit.cool = DRONE_COOLDOWN_S.wardcut;
  unit.fired = 0;
  if (rand(g) < ANTI_KILL) {
    killPlayerDrone(g, "Their anti-combat drone destroyed your drone.");
    return;
  }
  kit.stun = ANTI_STUN_S;
  log(g, "Their anti-combat drone stunned your drone.");
}

/** Your Anti-Combat Drone against their combat drones and their boarding drones in flight. INFERRED: a random target. */
function playerAntiCombat(g: Game, kit: Kit) {
  const units = g.enemy?.kits.swarm?.drones ?? [];
  const targets = units.filter(
    (u) =>
      u.alive &&
      (u.stun ?? 0) <= 0 &&
      (OFFENSIVE.has(u.kind) || (BOARDERS.has(u.kind) && ((u.fly ?? 0) > 0 || !u.room))),
  );
  const target = randomOf(g, targets);
  if (!target) return;
  setCooldown(kit, DRONE_COOLDOWN_S.wardcut);
  if (rand(g) < ANTI_KILL) {
    killUnit(g, target, `Your anti-combat drone destroyed their ${unitName(target.kind)}.`);
    return;
  }
  target.stun = ANTI_STUN_S;
  target.ionT = undefined;
  log(g, `Your anti-combat drone stunned their ${unitName(target.kind)}.`);
}

/**
 * Overview: "External drones hit by an ion shot are stunned for 5 seconds for each ion damage. Each second of stun
 * after the first, they have a 15% chance to be destroyed." shotHitsDrone calls this for an ion shot that strikes an
 * enemy drone; tickStun rolls the burn-out. External means not a crew drone already aboard.
 */
export function ionHitsDrone(unit: DroneUnit, ion: number): boolean {
  if (!unit.alive || ion <= 0 || CREW_DRONES.has(unit.kind)) return false;
  if (BOARDERS.has(unit.kind) && (unit.fly ?? 0) <= 0 && unit.room) return false;
  unit.stun = Math.max(unit.stun ?? 0, ION_STUN_PER * ion);
  unit.ionT = 0;
  return true;
}

/** Enemy Defense Drone Mark I / II against an incoming player shot, for enemyDefenseIntercept. */
function enemyUnitsIntercept(
  g: Game,
  units: DroneUnit[],
  shot: { kind: string; from: string; defId?: string; label?: string },
): boolean {
  for (const unit of units) {
    if (unit.kind !== "ward" && unit.kind !== "ward2") continue;
    if (!unit.alive || !unit.powered || (unit.stun ?? 0) > 0 || unit.cool > 0) continue;
    // Augmentations, "Defense Scrambler": an enemy Defense Drone cannot acquire a target, and keeps its cooldown.
    if (g.augments.includes("scrambler") && scramblerBlocks(unit.kind)) continue;
    if (!shoots(unit.kind, shot, "enemy")) continue;
    unit.cool = DRONE_COOLDOWN_S[unit.kind];
    unit.fired = 0;
    defenseStray(g, "enemy", unit.kind, shot);
    return true;
  }
  return false;
}

/**
 * HACKING-AGENT CONTRACT. Does the defending side's drone screen stop this incoming drone right now?
 *
 *   interceptIncomingDrone(g, defender, kind) → "down" | "stun" | null
 *
 * - defender: the ship the drone is flying AT ("player" when an enemy hacking drone flies at you).
 * - kind: "hacking" or "boarding".
 * - Call once per sim tick while that drone is still in flight (before it latches on). It is cheap and safe to call
 *   every tick: a defense drone that fires spends its cooldown, so the next call waits for that cooldown.
 * - "down": destroyed. A Defense Drone Mark I or II shot it (Defense Drone Mark I: "Shoots down incoming missiles,
 *   hacking and boarding drones"), or an Anti-Combat Drone hit it and rolled the 47.8% kill.
 * - "stun": an Anti-Combat Drone hit it and it survived. The caller should hold the drone in place ANTI_STUN_S
 *   seconds ("Stuns Combat, Hacking, and Boarding drones ... during the 5 seconds stun").
 * - null: nothing fired this tick.
 * Hacking, Overview: "While travelling, the hacking drone can be targeted by defense drones and anti-combat drones".
 * The Defense Scrambler stops the enemy's drones (defender "enemy"), never yours.
 */
export function interceptIncomingDrone(g: Game, defender: "player" | "enemy", kind: "hacking" | "boarding"): "down" | "stun" | null {
  const from = defender === "player" ? "enemy" : "player";
  if (defender === "player") {
    if (swarmIntercept(g, { kind, from })) return "down";
    const kit = g.player.kits.swarm;
    if (!kit || kit.target !== "wardcut" || !powered(kit, "wardcut") || !ready(kit) || (kit.stun ?? 0) > 0) return null;
    setCooldown(kit, DRONE_COOLDOWN_S.wardcut);
    return rand(g) < ANTI_KILL ? "down" : "stun";
  }
  if (enemyDefenseIntercept(g, { kind, from })) return "down";
  const units = g.enemy?.kits.swarm?.drones ?? [];
  if (g.augments.includes("scrambler") && scramblerBlocks("wardcut")) return null;
  const cut = units.find((u) => u.kind === "wardcut" && u.alive && u.powered && (u.stun ?? 0) <= 0 && u.cool <= 0);
  if (!cut) return null;
  cut.cool = DRONE_COOLDOWN_S.wardcut;
  cut.fired = 0;
  return rand(g) < ANTI_KILL ? "down" : "stun";
}

// ───────────────────────────────────────────────────────────────────────────────────────────
// @agent:drones. Shots, asteroids, and stray defense fire against external drones.
// Drone Control, Overview: "Drones that fly around a ship can be shot down by enemy fire if they are in direct line of
// fire, or can be destroyed by colliding with asteroids. Your weapons cannot hit your own drones and your defense
// drones cannot shoot down each other with their weapons."
// Combat Drones (offensive drones): "Offensive drones orbit the enemy ship ... Offensive drones can be destroyed by
// asteroids or shots from the opposing ship, including accidental shots from the enemy defense drones targeting other
// projectiles".
// Weapons, lead: "Beams and ASB shots do not collide with anything"; bombs "teleport themselves directly into rooms".
// The sim has no flight geometry, so "in direct line of fire" is a per-drone roll as each shot lands.
// ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * INVENTED: chance one deployed external drone is in the line of a projectile crossing its orbit. Basis: a drone
 * covers a small arc of its orbit and moves (Combat Drones: "Their next position is chosen by a random angle"), and
 * the page treats a hit as an occasional accident, not the norm. 5% per drone per shot.
 */
export const LINE_OF_FIRE = 5 / 100;
/**
 * INVENTED: chance an asteroid strikes one external drone orbiting the Lark. Basis: Environmental Hazards says defense
 * drones "will often fail to hit them", so rocks sweep through the orbit; a rock is bigger than a laser, so double
 * LINE_OF_FIRE.
 */
export const ROCK_HIT = 10 / 100;
/**
 * INVENTED: chance a defense drone's shot strays into an opposing offensive drone orbiting the same hull
 * ("accidental shots from the enemy defense drones targeting other projectiles").
 */
export const DEFENSE_STRAY = 5 / 100;
/**
 * INVENTED: Combat Drones: "Defense Drone Mark II targeting the combat drone's lasers can unintentionally destroy the
 * combat drone itself, especially if the laser blast was absorbed by the shields first." The drone is right behind
 * its own laser, so three times DEFENSE_STRAY. The sim does not model the shield-absorb case separately.
 */
export const MARK2_OWN_LASER = 15 / 100;
/** INVENTED: how long a DroneBlast stays on g.droneBlasts for the fx. */
export const DRONE_BLAST_S = 1;

/**
 * External drones that orbit the player's own hull. Defensive Drones (Defense I / II, Anti-Combat, both Overchargers)
 * and Hull Repair Drone ("Moves around and outside of your ship").
 */
const HOME_ORBIT = new Set(["ward", "ward2", "wardcut", "overcharger", "overchargerplus", "hull"]);

type Orbiter = {
  side: "player" | "enemy";
  kind: string;
  at: "player-orbit" | "enemy-orbit";
  unit?: DroneUnit;
};

/** Every deployed external drone in orbit. Boarders in flight and crew drones are left out (INFERRED: no flight path). */
function orbiters(g: Game): Orbiter[] {
  const out: Orbiter[] = [];
  const kit = g.player.kits.swarm;
  if (kit?.on && kit.target && (kit.lost ?? 0) <= 0) {
    // Combat Drones: offensive drones "orbit the enemy ship". Defensive drones fly around their own.
    if (OFFENSIVE.has(kit.target)) out.push({ side: "player", kind: kit.target, at: "enemy-orbit" });
    else if (HOME_ORBIT.has(kit.target)) out.push({ side: "player", kind: kit.target, at: "player-orbit" });
  }
  for (const unit of g.enemy?.kits.swarm?.drones ?? []) {
    if (!unit.alive || CREW_DRONES.has(unit.kind) || BOARDERS.has(unit.kind)) continue;
    const spot = enemyDroneSpot(unit);
    if (spot?.at === "player-orbit" || spot?.at === "enemy-orbit") out.push({ side: "enemy", kind: unit.kind, at: spot.at, unit });
  }
  return out;
}

/** A shot a drone fired: the player's striker ("swarm-ready" / "swarm") or an enemy drone ("drone:<id>"). */
function droneShot(shot: { label?: string }): boolean {
  const label = shot.label ?? "";
  return label === READY_LABEL || label === FLOWN_LABEL || label.startsWith(DRONE_LABEL);
}

/** Overview, ion line, for the player's single drone. Same rule as ionHitsDrone. */
export function ionHitsKit(kit: Kit, ion: number): boolean {
  if (!kit.on || !kit.target || ion <= 0) return false;
  if (!OFFENSIVE.has(kit.target) && !HOME_ORBIT.has(kit.target)) return false;
  kit.stun = Math.max(kit.stun ?? 0, ION_STUN_PER * ion);
  kit.ionT = 0;
  return true;
}

/** Overview: "Each second of stun after the first, they have a 15% chance to be destroyed." True on a burn-out. */
function ionBurnsOut(g: Game, before: number, after: number): boolean {
  for (let s = Math.floor(before) + 1; s <= Math.floor(after + 1e-9); s++) {
    if (s >= 2 && rand(g) < ION_KILL_PER_S) return true;
  }
  return false;
}

/** The player's drone is destroyed: Overview's 10 second delay before it can be deployed again (deploy reads kit.lost). */
function killPlayerDrone(g: Game, why: string) {
  const kit = g.player.kits.swarm;
  if (!kit) return;
  kit.on = false;
  kit.stun = 0;
  kit.ionT = undefined;
  kit.lost = REDEPLOY_S;
  log(g, why);
}

function noteBlast(g: Game, o: Orbiter, by: DroneBlast["by"], result: DroneBlast["result"]) {
  const blast: DroneBlast = { side: o.side, kind: o.kind, at: o.at, by, result, age: 0 };
  if (o.unit) blast.unitId = o.unit.id;
  (g.droneBlasts ??= []).push(blast);
}

function ageBlasts(g: Game, dt: number) {
  if (!g.droneBlasts?.length) return;
  for (const b of g.droneBlasts) b.age += dt;
  g.droneBlasts = g.droneBlasts.filter((b) => b.age < DRONE_BLAST_S);
}

/** Destroy, or ion-stun, one orbiting drone. Returns false when an ion hit does not apply (ionHitsDrone rules). */
function strike(g: Game, o: Orbiter, by: DroneBlast["by"], ion: number): boolean {
  const name = unitName(o.kind);
  const whose = o.side === "player" ? "your" : "their";
  if (ion > 0) {
    const hit = o.unit ? ionHitsDrone(o.unit, ion) : !!g.player.kits.swarm && ionHitsKit(g.player.kits.swarm, ion);
    if (!hit) return false;
    log(g, `An ion blast stunned ${whose} ${name}.`);
    noteBlast(g, o, by, "ion");
    return true;
  }
  const why =
    by === "rock"
      ? `An asteroid smashed ${whose} ${name}.`
      : by === "defense"
        ? `A stray defense shot destroyed ${whose} ${name}.`
        : o.side === "player"
          ? `Their fire caught your ${name}.`
          : `Your fire caught their ${name}.`;
  if (o.unit) killUnit(g, o.unit, why);
  else killPlayerDrone(g, why);
  noteBlast(g, o, by, "down");
  return true;
}

/**
 * SIM CONTRACT. stepShots calls this as a projectile lands, after the defense drones had their chance and before
 * applyImpact. True means an orbiting drone took the shot: the shot is spent and does not land.
 * - Projectiles only (laser, ion, missile, flak). Beams, bombs, and ASB shots never collide (Weapons, lead).
 * - A ship's shot can hit the other side's drones only ("Your weapons cannot hit your own drones"): their defensive
 *   drones round the target hull, and their offensive drones round the firing hull, which the shot leaves through.
 *   INFERRED: a drone's own shot starts in orbit near the target, so only the target-end drones are in its way.
 * - An asteroid (from "env", label "Rock", aimed at the Lark) can hit any drone orbiting the Lark, either side
 *   ("can be destroyed by colliding with asteroids"; "Offensive drones can be destroyed by asteroids").
 * - Ion shots stun (ionHitsDrone / ionHitsKit) instead of destroying. INFERRED: kind "ion" decides, not shot.ion.
 *   Combat Drones: "a depowered drone can block ion blasts" — the stunned drone still eats the shot.
 * Rolls are made only while some drone is in the way, so a fight without drones draws no extra random numbers.
 */
export function shotHitsDrone(g: Game, shot: Shot): boolean {
  if (shot.kind === "beam" || shot.kind === "bomb") return false;
  const rock = shot.from === "env" && shot.label === "Rock";
  if (shot.from === "env" && !rock) return false;
  const target: "player" | "enemy" = shot.from === "player" ? "enemy" : "player";
  const all = orbiters(g);
  if (!all.length) return false;
  let inWay: Orbiter[];
  if (rock) inWay = all.filter((o) => o.at === "player-orbit");
  else {
    const outbound = droneShot(shot) ? null : `${shot.from}-orbit`;
    inWay = all.filter((o) => o.side === target && (o.at === `${target}-orbit` || o.at === outbound));
  }
  const chance = rock ? ROCK_HIT : LINE_OF_FIRE;
  for (const o of inWay) {
    if (rand(g) >= chance) continue;
    if (strike(g, o, rock ? "rock" : "shot", !rock && shot.kind === "ion" ? Math.max(1, shot.ion) : 0)) return true;
  }
  return false;
}

/**
 * A defense drone on `defender`'s hull just fired. Its shot may stray into an opposing offensive drone orbiting the
 * same hull (DEFENSE_STRAY), or, for a Defense Drone Mark II shooting that drone's own laser, MARK2_OWN_LASER.
 * Combat Drones (offensive drones), quoted on MARK2_OWN_LASER. "your defense drones cannot shoot down each other", so
 * only the other side's drones count.
 */
function defenseStray(g: Game, defender: "player" | "enemy", kind: string, shot: { label?: string }) {
  const victims = orbiters(g).filter((o) => o.side !== defender && o.at === `${defender}-orbit` && OFFENSIVE.has(o.kind));
  for (const o of victims) {
    const own =
      kind === "ward2" &&
      (o.unit ? shot.label === DRONE_LABEL + o.unit.id : shot.label === READY_LABEL || shot.label === FLOWN_LABEL);
    if (rand(g) >= (own ? MARK2_OWN_LASER : DEFENSE_STRAY)) continue;
    strike(g, o, "defense", 0);
    return;
  }
}

/**
 * Drone Control, Overview: "External and boarding drones are lost when jumping to a new system and have to be
 * redeployed at each new location or encounter". The System Repair drone is a crew drone and stays aboard.
 * "The drone deployment delay is not reduced nor reset during FTL jump", so kit.lost is left alone.
 * Called from extras/index.ts onPlayerJump after the Drone Recovery Arm refund.
 */
export function onJumpSwarm(g: Game) {
  const kit = g.player.kits.swarm;
  if (!kit?.on || kit.target === "patch") return;
  kit.on = false;
  kit.aux = 0;
}
