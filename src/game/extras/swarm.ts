import { applyIon, log, rand, sparePower } from "../sim.ts";
import type { Game, Kit, Room, Ship, Shot } from "../types.ts";
import { crewDroneSpeed } from "../wiki/cited-booster.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import { COMBAT2 } from "../wiki/cited-combat2.ts";
import { INTRUDER } from "../wiki/cited-intruder.ts";
import { scramblerBlocks } from "../wiki/cited-scrambler.ts";

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
  return Math.max(0, kit.power - SYSTEM_POWER);
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
  if (kit.power < kit.level && sparePower(g.player) >= 1) {
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
  // Combat Drone Mark II and the Ion Intruder stay outside SwarmKind. drones-missing.ts still lists them.
  const cited = kind === "combat2" || kind === "ionintruder";
  if (!kit || (!isKind(kind) && !cited)) return false;
  if (kit.on && kit.target === kind) return true;
  if (g.player.parts < PART_COST) {
    log(g, "Drone Control needs a drone part.");
    return false;
  }
  g.player.parts -= PART_COST;
  kit.on = true;
  kit.target = kind;
  kit.path = [];
  kit.move = 0;
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
export function swarmIntercept(g: Game, shot: { kind: string; from: string; defId?: string }): boolean {
  const kit = g.player.kits.swarm;
  if (!kit || !isKind(kit.target)) return false;
  const kind = kit.target;
  if (!powered(kit, kind) || !ready(kit)) return false;
  if (!shoots(kind, shot, "player")) return false;
  if (kind !== "ward" && kind !== "ward2") return false;
  setCooldown(kit, DRONE_COOLDOWN_S[kind]);
  return true;
}

/**
 * Augmentations, "Defense Scrambler": enemy Defense Drone I, Defense Drone II,
 * and Anti-Combat drones cannot acquire a target. The player's own drones are
 * not this check. A blocked drone does not spend its cooldown.
 */
export function enemyDefenseIntercept(g: Game, shot: { kind: string; from: string; defId?: string }): boolean {
  const kit = g.enemy?.kits.swarm;
  if (!kit || !isKind(kit.target)) return false;
  const kind = kit.target;
  if (g.augments.includes("scrambler") && scramblerBlocks(kind)) return false;
  if (!powered(kit, kind) || !ready(kit)) return false;
  if (!shoots(kind, shot, "enemy")) return false;
  if (kind !== "ward" && kind !== "ward2") return false;
  setCooldown(kit, DRONE_COOLDOWN_S[kind]);
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

function tickWardcut(kit: Kit, dt: number) {
  // Drone Control, Anti-Combat Drone: stuns combat drones for 5 seconds,
  // with a 47.8% chance to destroy them during that stun.
  // Game has no enemy-drone list, so the stun itself is a no-op.
  // The 7000 ms recharge (DRONE_COOLDOWN_S.wardcut) still counts down if armed.
  tickCooldown(kit, dt);
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
  const others = systems.filter((item) => item.id !== kit.room);
  // INFERRED: "then moves to a different system" names no walk speed. The room changes when the pulse fires.
  // Speed 18, health 125, and the door-break rate are not a single usable number, so none of them run.
  if (others.length > 0) kit.room = others[Math.floor(rand(g) * others.length)]?.id;
}

function tickIntruder(g: Game, kit: Kit, dt: number): void {
  if (!(kit.left > 0)) kit.left = rollIntruderWait(g);
  // Removing power does not reset the cooldown. The timer freezes: it is not zeroed and it does not advance.
  if (!kit.on || kit.power < INTRUDER.power) return;
  const enemy = g.enemy;
  if (!enemy) return;
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
  const kit = g.player.kits.swarm;
  if (!kit?.target) return;
  if (kit.target === "combat2") {
    tickCombat2(kit);
    return;
  }
  if (kit.target === "ionintruder") {
    tickIntruder(g, kit, dt);
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
    tickWardcut(kit, dt);
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
