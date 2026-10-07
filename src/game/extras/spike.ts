import { HACK_COAT_HITS, bars, blastHits, chargerCap, cooldownLocksPower, evasionPercent, kitBars, kitIonLocked, log, noteHackLatchedDuringLock, noteHackPulseDuringLock, noteZoltanKits, rand, roomWith, sparePower } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { WEAPONS } from "../content.ts";
import { sensorLevel } from "./sensors.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import { hackStuns } from "./moreaugs.ts";
import { clearEnemyLeash, sideOf } from "./leash.ts";
import { veilBlocks } from "./veil.ts";
import { ANTI_STUN_S, REDEPLOY_S, enemyDroneSpot, interceptIncomingDrone } from "./swarm.ts";
import type { Difficulty, Door, Game, Kit, KitId, Room, Ship, SysId, SystemState } from "../types.ts";

/** Hacking wiki, "System upgrades": level 1 cost is 80. */
export const SPIKE_COST = 80;

/**
 * Hacking wiki, "Overview" (Hacking pulse): 4, 7, or 10 seconds by power in the system.
 * "System upgrades" lists the same 4 / 7 / 10 beside levels 1 / 2 / 3.
 * INFERRED: the 0 slot is 0 seconds. The page never states a duration for an unpowered system.
 */
const PULSE_SECONDS = [0, 4, 7, 10] as const;

/**
 * Hacking wiki, "Overview" (Shields): 2 seconds to remove 1 shield layer.
 * That label also says a 4 second level-1 pulse randomly removes 1 or 2 layers; this interval is fixed.
 */
const SHIELD_DROP_SECONDS = 2;

/** Hacking wiki, "Overview" (Oxygen): drains oxygen at 6% per second. */
const OXYGEN_PER_SECOND = 6;

/** Hacking wiki, "Overview" (Medbay): 13 health per second on hostile crew in the medbay. */
const MEDBAY_HURT = 13;

/** Hacking wiki, "Overview" (Hacking pulse): 20 seconds of cooldown after the pulse finishes. */
const COOLDOWN = 20;

/**
 * Hacking wiki, "Overview" (Active effects during hacking pulse): main systems this kit can lock.
 * @agent:hack-rules. "Sensors: disable sensors." joins the list; the subsystems on that label are KIT_TARGETS.
 */
const TARGETS: readonly SysId[] = [
  "shields",
  "weapons",
  "engines",
  "pilot",
  "oxygen",
  "medbay",
  "doors",
  "sensors",
];

/**
 * The Rebel Flagship: "The Flagship's 'weapons' are artillery systems, each located in its own room."
 * Same rooms as wiki/flagship-systems.ts GUN_ROOM. Hacking one room drains that gun.
 * Hacking, "Overview": "Artillery Beam / Flak Artillery / Rebel Flagship weapons: drains charge (same effect as on weapons)."
 * Weapon Control still drains every gun on a hull that is not the flagship.
 */
const FLAGSHIP_GUN: Record<string, string> = {
  "e-ion": "bossion",
  "e-laser": "bosslaser",
  "e-missile": "bossmissile",
  "e-beam": "bossbeam",
};

function kitOf(g: Game): Kit | undefined {
  return g.player.kits.spike;
}

function running(kit: Kit): boolean {
  return kit.on && kit.left > 0;
}

/** Hacking wiki, "Overview" (Hacking pulse): the pulse length uses power currently in the system. Kits have no ion track. */
function fedBars(kit: Kit): number {
  const sys: SystemState = {
    level: kit.level,
    power: kit.power,
    damage: 0,
    ion: [],
    fix: 0,
  };
  // Zoltans: one yellow bar in this room. It does not lower kit.power. This call still ignores kit.damage.
  const base = bars(sys);
  const cap = Math.max(0, kit.level);
  const yellow = Math.min(kit.zoltan ?? 0, cap);
  return Math.min(cap, base + yellow);
}

function pulseSeconds(powered: number): number {
  const i = Math.max(0, Math.min(3, Math.floor(powered)));
  return PULSE_SECONDS[i] ?? 0;
}

/**
 * Enemy kits the player's drone may also be aimed at, when the enemy hull has one (enemy-gen.ts rooms carry `kit`).
 * @agent:hack-rules. Hacking wiki, "Overview" (Active effects during hacking pulse) lists every one of them:
 * "Hacking: ends an active hack", "Backup Battery: disables bonus power", "Drone Control: disables drones",
 * "Crew Teleporter: forcibly recalls hostile boarders", "Mind Control: temporarily turns one random enemy into an
 * ally", "Cloaking: ends an active cloak", "Clone Bay: disables the clone bay", and "Artillery Beam / Flak Artillery
 * / Rebel Flagship weapons: drains charge". Effects: applyPulse below (flak / cradle read hackPulseOn).
 */
const KIT_TARGETS: readonly KitId[] = ["spike", "cradle", "veil", "sling", "leash", "swarm", "cell", "flak", "lance"];

function isTarget(g: Game, id: string): boolean {
  // Each flagship artillery room is its own system. "weapons" would drain every gun.
  if (id === "weapons" && g.enemy?.flagship) return false;
  if (g.enemy?.flagship && FLAGSHIP_GUN[id] && g.enemy.rooms.some((room) => room.id === id)) return true;
  if ((TARGETS as readonly string[]).includes(id)) return true;
  return (KIT_TARGETS as readonly string[]).includes(id) && !!g.enemy?.kits[id as KitId];
}

/** The room the drone was aimed at: an artillery room id, or the room that houses that system. */
function aimRoom(ship: Ship, id: string): Room | undefined {
  return ship.rooms.find((room) => room.id === id) ?? roomOf(ship, id);
}

/** The room on `ship` that houses system or kit `id` (kits sit in rooms with `kit` set on enemy hulls). */
function roomOf(ship: Ship, id: string): Room | undefined {
  return ship.rooms.find((r) => r.system === id || r.kit === id);
}

/**
 * Hacking wiki, "System upgrades": spends the level 1 cost of 80 and starts at level 1.
 * That table also prices level 2 at 35 and level 3 at 60; those costs are not charged here.
 */
export function installSpike(g: Game): boolean {
  if (g.player.kits.spike) return false;
  if (g.scrap < SPIKE_COST) return false;
  g.scrap -= SPIKE_COST;
  g.player.kits.spike = {
    id: "spike",
    // Hacking wiki, "System upgrades": a fresh install is level 1. Level 2 costs 35 and level 3 costs 60 on that table; neither is charged here.
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, "Hacking installed on the Lark.");
  return true;
}

/**
 * Hacking wiki, "Overview" (Hacking pulse): duration follows how much power is in the system.
 * INFERRED: one bar is added or removed at a time, and power cannot pass the system level.
 * The page never states that step.
 */
export function toggleSpikePower(g: Game) {
  const kit = kitOf(g);
  if (!kit || cooldownLocksPower(kit)) return;
  if (kit.power < kit.level && sparePower(g.player) >= 1) {
    kit.power += 1;
    return;
  }
  if (kit.power > 0) kit.power -= 1;
}

/**
 * Hacking wiki, "Choosing your hacking target": the drone is aimed at a single system before it launches.
 * "Once the game is unpaused, this choice is permanent: you can only hack one system in a fight, unless your hacking
 * drone is somehow destroyed." So with a drone latched (Ship.hackDrone) the aim is pinned to that system; it frees
 * again when the drone is destroyed (deleted by the enemy's pulse on Hacking) or the next fight brings a new hull.
 * Returns false when the aim was refused.
 */
export function armSpike(g: Game, systemId: string): boolean {
  const kit = kitOf(g);
  if (!kit || running(kit)) return false;
  if (!isTarget(g, systemId)) return false;
  // @agent:hack-rules. A drone already in flight is committed ("this choice is permanent").
  if (g.enemy?.hackFlying != null) return false;
  const latched = g.enemy?.hackDrone;
  if (latched != null && latched !== systemId) {
    kit.target = latched;
    return false;
  }
  kit.target = systemId;
  return true;
}

/**
 * Hacking wiki, "Choosing your hacking target": launching costs one drone part, then the pulse runs.
 * "Overview" (Hacking pulse) sets the length from power in the system (4, 7, or 10 seconds).
 * "Choosing your hacking target" says the drone takes about 2–3 seconds to arrive; this launch does not wait.
 */
export function launchSpike(g: Game): boolean {
  const kit = kitOf(g);
  if (!kit || !g.enemy) return false;
  noteZoltanKits(g);
  // "this choice is permanent" (see below): a latched drone pins the target before it is checked.
  if (g.enemy.hackDrone != null && g.enemy.hackDrone !== kit.target) kit.target = g.enemy.hackDrone;
  // Zoltans: Hacking cannot be activated if it is ionized. A Zoltan bar does not clear that lock.
  if (kitIonLocked(kit)) return false;
  if (!kit.target || !isTarget(g, kit.target)) return false;
  const powered = fedBars(kit);
  if (powered < 1) return false;
  // @agent:hacking. Hacking wiki, "Choosing your hacking target": the drone "latches onto the hull and becomes
  // invulnerable", and "you can only hack one system in a fight, unless your hacking drone is somehow destroyed".
  // A drone already latched on this target pulses again without a new part (or a new Zoltan check: nothing launches).
  // "Once the game is unpaused, this choice is permanent": a latched drone pins the target (armSpike, and the pull-back
  // above), so no second drone launches while one is attached.
  const latched = g.enemy.hackDrone != null && g.enemy.hackDrone === kit.target;
  if (latched) {
    if (running(kit) || kit.cool > 0) return false;
    if (enemyPulseOn(g, ["spike"])) return false;
    const again = pulseSeconds(powered);
    if (again <= 0) return false;
    startOwnPulse(g, kit, again);
    log(g, `Hacking pulses their ${LABEL[kit.target] ?? kit.target}.`);
    return true;
  }
  // @agent:hack-rules. One drone at a time: a drone still in flight is not doubled.
  if (g.enemy.hackFlying != null) return false;
  if (g.player.parts < 1) {
    log(g, "Hacking needs a drone part.");
    return false;
  }
  if (running(kit) || kit.cool > 0) return false;
  // @agent:hack-ui. Hacking wiki, "Choosing your hacking target": "if they are cloaked, you must wait for the cloak to
  // end." No part is spent: nothing launches.
  if (veilBlocks(g, "player")) {
    log(g, "Hacking must wait for their cloak to end.");
    return false;
  }
  // @agent:hacking. INFERRED: no launch while the enemy's pulse is on this Hacking system. Hacking, "Overview"
  // (Hacking row): a pulse "ends an active hack"; the page never says whether a new one can start meanwhile.
  if (enemyPulseOn(g, ["spike"])) return false;
  const seconds = pulseSeconds(powered);
  if (seconds <= 0) return false;
  // Hacking: "Hacking drone cannot be launched at a ship with a Zoltan Shield, even with the Zoltan Shield Bypass
  // augmentation." So nothing launches and no part is spent. (A drone already flying when a shield goes up still
  // breaks on impact: arriveOwn.)
  if ((g.enemy.zoltan ?? 0) > 0) {
    log(g, "Hacking cannot launch at a Zoltan Shield.");
    return false;
  }
  g.player.parts -= 1;
  // @agent:hack-rules. Hacking wiki, "Choosing your hacking target": "This costs one drone part and takes about 2--3
  // seconds to reach the enemy ship." Same flight model as the enemy's drone (launchEnemySpike): a uniform 2..3 s roll,
  // counted down by tickOwnFlight. The pulse starts when it latches (arriveOwn).
  const fly = FLIGHT_MIN + rand(g) * FLIGHT_SPREAD;
  kit.hackFly = fly;
  kit.hackFlyTotal = fly;
  kit.stun = undefined;
  kit.on = false;
  kit.left = 0;
  kit.aux = 0;
  kit.cool = 0;
  g.enemy.hackFlying = kit.target;
  log(g, `Hacking drone away toward their ${LABEL[kit.target] ?? kit.target}.`);
  return true;
}

// ---------------------------------------------------------------------------------------------
// @agent:hack-rules. The player's paused launch queue and the drone's flight to the enemy hull.
// ---------------------------------------------------------------------------------------------

/**
 * Hacking wiki, "Choosing your hacking target": "Once the game is unpaused, this choice is permanent ... If you change
 * your mind while still paused, you can cancel the hack launch by clicking on the drone icon again."
 * A pick made while paused only aims and queues (Kit.hackQueued); no part is spent. tickSpike (which only runs
 * unpaused, sim.ts step) commits it through launchSpike. Picking another room while still paused re-aims the queue.
 * Returns false when the aim was refused (same rules as armSpike).
 */
export function queueSpike(g: Game, systemId: string): boolean {
  const kit = kitOf(g);
  if (!kit || !armSpike(g, systemId)) return false;
  kit.hackQueued = true;
  return true;
}

/** Cancels a launch queued while paused ("cancel the hack launch by clicking on the drone icon again"). */
export function cancelQueuedSpike(g: Game): boolean {
  const kit = kitOf(g);
  if (!kit?.hackQueued) return false;
  delete kit.hackQueued;
  return true;
}

/** Ends the player's flight bookkeeping (lost, latched, or the fight is gone). */
function clearOwnFlight(g: Game, kit: Kit) {
  kit.hackFly = undefined;
  kit.hackFlyTotal = undefined;
  kit.stun = undefined;
  if (g.enemy) delete g.enemy.hackFlying;
}

/**
 * Hacking wiki, "Choosing your hacking target": "If the drone is destroyed, you will be able to send another one after
 * a short delay." Same RELAUNCH_DELAY as the enemy's loseDrone. The aim frees again ("unless your hacking drone is
 * somehow destroyed").
 */
function loseOwnDrone(g: Game, kit: Kit) {
  clearOwnFlight(g, kit);
  kit.cool = RELAUNCH_DELAY;
}

/** Hacking wiki, "Overview" (Hacking pulse): starts a pulse and its at-start effects (startEnemyPulse's twin). */
function startOwnPulse(g: Game, kit: Kit, seconds: number) {
  kit.on = true;
  kit.left = seconds;
  kit.aux = 0;
  kit.cool = 0;
  const foe = g.enemy;
  if (!foe) return;
  // Crystal Lockdown: a pulse during the coating keeps normal hacked-door strength.
  if (kit.target) noteHackPulseDuringLock(foe, kit.target, g.difficulty);
  // "Cloaking: ends an active cloak". As startEnemyPulse: the cloak then cools 20 s (Cloaking, "Overview").
  const veil = foe.kits.veil;
  if (kit.target === "veil" && veil?.on) {
    veil.on = false;
    veil.left = 0;
    veil.cool = CLOAK_COOLDOWN;
  }
}

/**
 * Hacking wiki, "Choosing your hacking target": "When the drone reaches the enemy ship, it latches onto the hull and
 * becomes invulnerable." Overview: a drone launched before a Zoltan Shield went up "will be destroyed upon impact with
 * the Zoltan Shield". INFERRED: the first pulse starts on latching (the old instant launch did the same), unless the
 * enemy's pulse is on this Hacking system right now (then the icon starts it later).
 */
function arriveOwn(g: Game, kit: Kit) {
  const foe = g.enemy;
  const target = foe?.hackFlying;
  if (!foe || !target) {
    clearOwnFlight(g, kit);
    return;
  }
  if ((foe.zoltan ?? 0) > 0) {
    loseOwnDrone(g, kit);
    log(g, "Your hacking drone breaks on their Zoltan Shield.");
    return;
  }
  clearOwnFlight(g, kit);
  kit.target = target;
  foe.hackDrone = target;
  // Crystal Lockdown: a coating already on this room is what leaves 4 hits. The pulse below can cancel it.
  noteHackLatchedDuringLock(foe, target);
  log(g, `Hacking drone latches onto their ${LABEL[target] ?? target}.`);
  const seconds = pulseSeconds(fedBars(kit));
  if (seconds > 0 && !enemyPulseOn(g, ["spike"])) startOwnPulse(g, kit, seconds);
}

/**
 * Hacking wiki, "Choosing your hacking target": "While travelling, the hacking drone can be targeted by defense drones
 * and anti-combat drones" (swarm.ts interceptIncomingDrone, defender "enemy": "down" or a 5 s "stun"). "Defense drones
 * can be dodged by de-powering the hacking drone as they shoot, which freezes the hacking drone in place and causes all
 * shots to target ahead and miss." So with no power in Hacking the drone holds still and is not intercepted.
 * NOT MODELLED: "or even destroyed by random collisions" (no flight geometry).
 */
function tickOwnFlight(g: Game, kit: Kit, dt: number) {
  const foe = g.enemy;
  if (!foe || g.phase !== "combat" || foe.hackFlying == null) {
    clearOwnFlight(g, kit);
    return;
  }
  const stunned = (kit.stun ?? 0) > 0;
  if (stunned) kit.stun = Math.max(0, (kit.stun ?? 0) - dt);
  const powered = fedBars(kit) >= 1;
  const hit = powered ? interceptIncomingDrone(g, "enemy", "hacking") : null;
  if (hit === "down") {
    loseOwnDrone(g, kit);
    log(g, "Their drone shoots down your hacking drone.");
    return;
  }
  if (hit === "stun") {
    kit.stun = ANTI_STUN_S;
    log(g, "Their drone stuns your hacking drone.");
    return;
  }
  if (!powered || stunned) return;
  // Cloaking, Overview: "Hacking and Boarding drones hold their position in space.
  // They will continue their move when the cloak is over." The enemy ship is the one cloaked.
  if (veilBlocks(g, "player")) return;
  kit.hackFly = (kit.hackFly ?? 0) - dt;
  if (kit.hackFly <= 0) arriveOwn(g, kit);
}

/** Hacking wiki, "Overview" (Piloting/Engines): the pulse stops the FTL drive charging. */
export function spikeFreezesFtl(g: Game): boolean {
  const kit = kitOf(g);
  if (!kit || !running(kit)) return false;
  return kit.target === "engines" || kit.target === "pilot";
}

/**
 * Hacking wiki, "Overview" (Piloting/Engines): the pulse reduces base evasion to 0.
 * This only reports that case for the enemy ship. Cloak evasion is not separated here.
 */
export function spikeEvadeZero(g: Game, ship: Ship): boolean {
  // @agent:hacking. The enemy's pulse on the player's Engines or Piloting does the same to the player.
  if (ship === g.player) return hackFreezesFtl(g, ship);
  if (!g.enemy || ship !== g.enemy) return false;
  return spikeFreezesFtl(g);
}

function applyPulse(g: Game, kit: Kit, dt: number) {
  const enemy = g.enemy;
  if (!enemy || !kit.target) return;
  // Augmentations, "Offensive Augmentations", Hacking Stun: crew and drones in the pulsed room cannot act for the pulse.
  // Boarding, "Stun effect": anyone who enters mid-pulse is stunned for the time still left (kit.left). Not orbiting drones.
  if (hackStuns(g)) {
    const room = aimRoom(enemy, kit.target);
    if (room) {
      for (const c of g.crew) {
        if (c.aboard !== "enemy" || c.room !== room.id || c.hp <= 0) continue;
        c.stun = kit.left;
      }
      const interior = g.player.kits.swarm;
      if (
        interior?.on &&
        interior.hp != null &&
        interior.room === room.id &&
        (interior.target === "ionintruder" || interior.target === "board")
      ) {
        interior.stun = Math.max(interior.stun ?? 0, kit.left);
      }
      for (const unit of enemy.kits.swarm?.drones ?? []) {
        const spot = enemyDroneSpot(unit);
        if (!spot || spot.at !== "enemy-room" || spot.room !== room.id) continue;
        unit.stun = Math.max(unit.stun ?? 0, kit.left);
      }
    }
  }
  if (kit.target === "spike") {
    pulseTheirHacking(g, kit, dt);
    return;
  }
  if (kit.target === "shields") {
    kit.aux += dt;
    while (kit.aux >= SHIELD_DROP_SECONDS) {
      kit.aux -= SHIELD_DROP_SECONDS;
      if (enemy.shieldNow > 0) enemy.shieldNow -= 1;
    }
    return;
  }
  if (kit.target === "weapons" || FLAGSHIP_GUN[kit.target]) {
    // A flagship artillery room is one gun. "weapons" on that hull is not a shared pool, so it drains nothing.
    const only = enemy.flagship ? FLAGSHIP_GUN[kit.target] : null;
    if (enemy.flagship && !only) return;
    // Hacking wiki, "Overview" (Weapon Control), and "Rebel Flagship weapons: drains charge (same effect as on weapons)."
    drainGuns(enemy.weapons, dt, only);
    return;
  }
  if (kit.target === "oxygen") {
    for (const room of enemy.rooms) {
      room.o2 = Math.max(0, room.o2 - OXYGEN_PER_SECOND * dt);
    }
    return;
  }
  if (kit.target === "medbay") {
    const bay = roomWith(enemy, "medbay");
    if (!bay) return;
    for (const c of g.crew) {
      if (c.side !== "enemy" || c.aboard !== "enemy") continue;
      if (c.room !== bay.id || c.hp <= 0) continue;
      c.hp = Math.max(0, c.hp - MEDBAY_HURT * dt);
    }
    return;
  }
  if (kit.target === "doors") {
    // Hacking wiki, "Overview" (Door System): a Doors pulse locks every door. Level-3 health and who may walk
    // are syncOwnDoors (Boarding, "Doors"), same as the enemy hack's syncDoors. The 7 second heal is door.stuck.
    for (const door of enemy.doors) {
      if (door.b === "void" || door.stuck > 0) continue;
      door.open = false;
    }
    return;
  }
  // @agent:hack-rules. The subsystem rows of "Active effects during hacking pulse", mirrored from applyEnemyPulse.
  // Clone Bay ("disables the clone bay"): cradle.ts asks hackPulseOn. Flak Artillery ("drains charge"): flakart.ts
  // asks hackPulseOn. Sensors ("disable sensors"): enemySensorsHacked. Artillery Beam: enemy hulls fire none (lance.ts
  // runs the player's only), so a pulse on it has nothing to drain.
  switch (kit.target) {
    case "veil": {
      // "Cloaking: ends an active cloak, and prevents the enemy from entering cloak." The end is startOwnPulse; a cloak
      // started during the pulse is cancelled at once.
      // Cloaking, Overview: "Hacking pulse ends an active cloak and puts the Cloaking system on full (20 seconds) cooldown."
      const veil = enemy.kits.veil;
      if (veil?.on) {
        veil.on = false;
        veil.left = 0;
        veil.cool = CLOAK_COOLDOWN;
      }
      return;
    }
    case "cell": {
      // "Backup Battery: disables bonus power, putting the system on cooldown if active, and temporarily removes two
      // regular power bars from reactor." The drain is syncOwnPulse (Kit.drained, cell.ts cellBonus).
      // Backup Battery wiki, "Overview": 20 s cooldown (the "tap" augment is the player's, so not here).
      const cell = enemy.kits.cell;
      if (cell?.on && cell.left > 0) {
        cell.on = false;
        cell.left = 0;
        cell.aux = 0;
        cell.cool = 20;
      }
      return;
    }
    case "swarm":
      pulseTheirSwarm(g, kit, dt);
      return;
    case "leash":
      pulseTheirMind(g, kit);
      return;
    case "sling":
      pulseTheirSling(g);
      return;
    default:
      return;
  }
}

/**
 * @agent:hack-rules. Hacking wiki, "Overview" (Drone Control): "disables drones, with a chance to destroy them (higher
 * chance with higher-level hacking)"; "after a one-second delay, there's a 15% chance to destroy the drone every
 * second". Every deployed enemy drone (swarm.ts DroneUnit) is stunned for the rest of the pulse.
 * INFERRED: the 15% is rolled per drone. A destroyed drone is reset as swarm.ts killUnit does (redeploy wait 10 s).
 */
function pulseTheirSwarm(g: Game, kit: Kit, dt: number) {
  const units = g.enemy?.kits.swarm?.drones ?? [];
  const live = units.filter((u) => u.alive);
  for (const u of live) u.stun = Math.max(u.stun ?? 0, kit.left);
  const before = kit.aux;
  kit.aux += dt;
  for (let s = Math.floor(before) + 1; s <= Math.floor(kit.aux + 1e-9); s++) {
    if (s < 2) continue;
    for (const u of live) {
      if (!u.alive || rand(g) >= DRONE_KILL_PER_S) continue;
      u.alive = false;
      u.powered = false;
      u.cool = REDEPLOY_S;
      u.stun = undefined;
      u.ionT = undefined;
      u.fly = undefined;
      u.room = undefined;
      if (u.kind !== "ionintruder") {
        u.aux = 0;
        u.left = undefined;
      }
      log(g, "Your hack burns out one of their drones.");
    }
  }
}

/**
 * @agent:hack-rules. Hacking wiki, "Overview" (Mind Control): "temporarily turns one random enemy into an ally, and
 * removes enemy mind control from allies." "If the enemy mind-controlled crew dies during the disruption, then another
 * enemy crew will be mind-controlled." Mind Control, "Overview": "Slugs cannot be mind controlled." (kin "gel").
 * The removal is leash.ts clearEnemyLeash. The turned crew member is held for the pulse (kit.hackHeld; syncOwnPulse
 * frees them). INFERRED: any living enemy crew member, on either hull, as the enemy's pulseMind picks.
 */
function pulseTheirMind(g: Game, kit: Kit) {
  if (g.crew.some((c) => c.side === "player" && (c.leashed ?? 0) > 0)) clearEnemyLeash(g);
  const held = g.crew.find((c) => c.id === kit.hackHeld);
  if (held && held.hp > 0 && (held.leashed ?? 0) > 0) {
    held.leashed = kit.left;
    return;
  }
  kit.hackHeld = undefined;
  const pool = g.crew.filter((c) => c.side === "enemy" && c.hp > 0 && (c.leashed ?? 0) <= 0 && c.kin !== "gel");
  if (!pool.length) return;
  const c = pool[Math.floor(rand(g) * pool.length) % pool.length];
  c.leashed = kit.left;
  c.path = [];
  c.move = 0;
  kit.hackHeld = c.id;
  log(g, `${c.name} is turned by your hack.`);
}

/**
 * Crew Teleporter, Overview: "Retrieved crew that cannot fit in the teleporter room will be placed in adjacent room(s)."
 * INFERRED: one crew per tile. The page pairs "2-tile" rooms with "four-person" rooms and does not say "one per tile".
 * INFERRED: door-list order is the fill order. With no adjacent room they stay on the pad.
 * INFERRED: a teleporter kit with no teleporter room uses the first room on that hull.
 */
function retrievedRoom(ship: Ship, index: number): string | undefined {
  const pad = ship.rooms.find((r) => r.kit === "sling");
  const id = pad?.id ?? ship.rooms[0]?.id;
  if (!id) return undefined;
  if (!pad) return id;
  const tiles = Math.max(1, pad.w * pad.h - (pad.omit?.length ?? 0));
  if (index < tiles) return id;
  const neighbors: string[] = [];
  for (const d of ship.doors) {
    if (d.b === "void") continue;
    const other = d.a === id ? d.b : d.b === id ? d.a : "";
    if (other && ship.rooms.some((r) => r.id === other) && !neighbors.includes(other)) neighbors.push(other);
  }
  if (neighbors.length === 0) return id;
  return neighbors[Math.min(index - tiles, neighbors.length - 1)];
}

/**
 * @agent:hack-rules. Hacking wiki, "Overview" (Crew Teleporter): "forcibly recalls hostile boarders, putting the system
 * on cooldown if anyone was successfully recalled." "Does not retrieve crew from a cloaked ship." "If one of your crew
 * is mind-controlled on your ship, hacking the enemy teleporter will not send the affected crew to the enemy ship!
 * Enemies will also not be recalled in this case, unless they enter the same room as your mind-controlled crew."
 * Crew Teleporter, Overview: overflow past the teleporter room goes to an adjacent room. The hack sentence does not
 * reprint "up to 4", so this recall is not capped. Teleporter cooldown 20 / 15 / 10 s by level (slingCooldown).
 */
function pulseTheirSling(g: Game) {
  const foe = g.enemy;
  const sling = foe?.kits.sling;
  if (!foe || !sling || veilBlocks(g, "enemy")) return;
  const away = g.crew.filter((c) => c.aboard === "player" && c.hp > 0 && c.side === "enemy" && sideOf(c) === "enemy");
  if (!away.length) return;
  const heldRooms = new Set(
    g.crew.filter((c) => c.aboard === "player" && c.hp > 0 && c.side === "player" && sideOf(c) === "enemy").map((c) => c.room),
  );
  const pull = heldRooms.size ? away.filter((c) => heldRooms.has(c.room)) : away;
  if (!pull.length) return;
  if (!retrievedRoom(foe, 0)) return;
  pull.forEach((c, i) => {
    c.aboard = "enemy";
    c.room = retrievedRoom(foe, i)!;
    c.path = [];
    c.move = 0;
  });
  sling.on = false;
  sling.left = 0;
  sling.cool = slingCooldown(sling.level);
  log(g, pull.length > 1 ? "Your hack yanks their boarders home." : "Your hack yanks a boarder home.");
}

/**
 * @agent:hack-rules. Hacking wiki, "Overview" (Sensors): "disable sensors." True while the player's pulse is on the
 * enemy's Sensors.
 * @agent:enemy-sensors. FINDING: the wiki documents NO gameplay effect of an enemy's Sensors, so hacking them changes
 * nothing for the enemy and nothing here reads this flag on purpose. Sensors wiki, "Overview": "Enemy ships do not have
 * Sensors subsystem, but have all the information about your ship and crew." Cloaking wiki, "Overview": enemies "can
 * use mind control against your ship even while you are cloaked (because they don't need vision)". So enemy targeting,
 * crew AI, boarding and drones never consult their Sensors (hooks noted in wiki/targeting.ts and extras/crewai.ts).
 * What the player does get from the drone is generic to every hacked system (Hacking "Overview", passive effects):
 * "Room vision and max-level Sensors information on the system" and "Repair speed of the system is halved."
 * Pinned in extras/sensors-enemy.test.ts. NOT INVENTED: no enemy-side penalty is added.
 */
export function enemySensorsHacked(g: Game): boolean {
  return playerPulseOn(g, "sensors");
}

/**
 * @agent:hacking. The player's pulse on the enemy's Hacking system. Hacking wiki, "Overview" (Active effects):
 * "Hacking: ends an active hack, with a chance to destroy the hacking drone (higher chance with higher-level hacking)."
 * "Defences against hacking": "Hacking the enemy's hacking system cancels the active hack and has a chance to destroy
 * the hacking drone." "Overview" (Hacking pulse): drone "can only be removed if destroyed by the hacking system being
 * hacked", and the odds: "after a one-second delay, there's a 15% chance to destroy the drone every second" (39% / 62% /
 * 77% over the 4 / 7 / 10 second pulse). The drone at risk is the one the hacked Hacking system owns: the enemy's
 * drone latched on the player hull. INFERRED: a drone still in flight is not at risk (the page says "attached").
 * kit.aux is the per-second clock, as in pulseSwarm.
 */
function pulseTheirHacking(g: Game, kit: Kit, dt: number) {
  const theirs = enemyKit(g);
  if (!theirs) return;
  if (running(theirs)) {
    endEnemyPulse(g, theirs);
    log(g, "Your hack cuts their hacking pulse.");
  }
  if (!theirs.hackLatched) return;
  const before = kit.aux;
  kit.aux += dt;
  for (let s = Math.floor(before) + 1; s <= Math.floor(kit.aux + 1e-9); s++) {
    if (s >= 2 && rand(g) < DRONE_KILL_PER_S) {
      loseDrone(theirs);
      log(g, "Your hack burns out their hacking drone.");
      return;
    }
  }
}

/** True while the player's own pulse runs on enemy system or kit `id`. */
function playerPulseOn(g: Game, id: string): boolean {
  const kit = kitOf(g);
  return !!g.enemy && !!kit && running(kit) && kit.target === id;
}

/** Hacking wiki, "Overview" (Hacking pulse): counts the pulse down, then starts the 20 second cooldown. */
export function tickSpike(g: Game, dt: number) {
  if (!(dt > 0)) return;
  // @agent:hacking. The enemy's hacking runs first; the player's path below is unchanged.
  tickEnemySpike(g, dt);
  const kit = kitOf(g);
  if (!kit) return;
  // @agent:hack-rules. A launch queued while paused commits on the first unpaused tick (queueSpike).
  if (kit.hackQueued) {
    delete kit.hackQueued;
    launchSpike(g);
  }
  if (kit.hackFly != null) {
    tickOwnFlight(g, kit, dt);
    // INFERRED: a drone that latched this tick starts its pulse clock on the next one.
    if (running(kit)) {
      syncOwnPulse(g, kit);
      syncOwnDoors(g, kit);
      return;
    }
  }
  if (running(kit)) {
    const step = Math.min(dt, kit.left);
    applyPulse(g, kit, step);
    kit.left -= step;
    const rest = dt - step;
    if (kit.left <= 1e-6) {
      kit.left = 0;
      kit.on = false;
      kit.cool = COOLDOWN;
      kit.aux = 0;
    }
    if (rest > 0) kit.cool = Math.max(0, kit.cool - rest);
  } else if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
  syncOwnPulse(g, kit);
  syncOwnDoors(g, kit);
}

/**
 * @agent:hack-rules. Undoes the player's per-pulse holds once the pulse is over (ended, cut by the enemy's hack on
 * Hacking, or the fight is gone): the enemy crew member a Mind Control pulse turned, and the Backup Battery drain.
 */
function syncOwnPulse(g: Game, kit: Kit) {
  const foe = g.enemy;
  const on = !!foe && g.phase === "combat" && running(kit);
  if (kit.hackHeld && !(on && kit.target === "leash")) {
    const c = g.crew.find((x) => x.id === kit.hackHeld);
    kit.hackHeld = undefined;
    if (c && c.side === "enemy" && (c.leashed ?? 0) > 0) {
      c.leashed = 0;
      delete c.leashed;
    }
  }
  const cell = foe?.kits.cell;
  if (cell) {
    if (on && kit.target === "cell") cell.drained = DRAINED_BARS;
    else if (cell.drained != null) delete cell.drained;
  }
}

// ---------------------------------------------------------------------------------------------
// @agent:hacking. Enemy Hacking: the enemy's kit (enemy-gen.ts, room `e-hacking`) hacks the player.
// Same PULSE_SECONDS and COOLDOWN as the player's kit. State lives on g.enemy.kits.spike:
// hackFly / hackFlyTotal (drone in flight), hackLatched (drone on the hull), target (the hacked player system or
// kit id), on / left (pulse), cool (cooldown or relaunch delay), aux (shield-drop or drone-kill clock), hackHeld.
// ---------------------------------------------------------------------------------------------

/**
 * Hacking wiki, "Hacking specifics for enemy ships": "Most enemy ships have a maximum of level 2 hacking. Enemy ships
 * with level 3 hacking: Lanius Scouts, Engi Hackers, and the Flagship in phase 1." The flagship hull here has no
 * Hacking kit, so only the two class ids are listed.
 */
const ENEMY_LEVEL3 = new Set(["lanius-scout", "engi-hacker"]);
const ENEMY_MAX_LEVEL = 2;

/**
 * Hacking wiki, "Choosing your hacking target": the drone "takes about 2--3 seconds to reach the enemy ship".
 * INFERRED: a uniform roll between 2 and 3 seconds.
 */
const FLIGHT_MIN = 2;
const FLIGHT_SPREAD = 1;

/**
 * Hacking wiki, "Choosing your hacking target": "If the drone is destroyed, you will be able to send another one after
 * a short delay." INVENTED: 5 seconds. The page gives no number.
 */
const RELAUNCH_DELAY = 5;

/** Hacking wiki, "Overview": "Hacked doors are equivalent to level 3 blast doors". sim.ts moveCrew reads this. */
export const HACKED_DOOR_LEVEL = 3;

/**
 * Hacking wiki, "Overview" (Hacking pulse): "after a one-second delay, there's a 15% chance to destroy the drone every
 * second" (39% / 62% / 77% over the 4 / 7 / 10 second pulses).
 */
const DRONE_KILL_PER_S = 0.15;

/** Cloaking wiki, "Overview": the cloak ends with 4 ion damage, 20 seconds (veil.ts COOLDOWN). */
const CLOAK_COOLDOWN = 20;

/** Backup Battery wiki, "Overview": 20 seconds of cooldown, 10 with the charger augment (cell.ts, code id "tap"). */
function cellCooldown(g: Game): number {
  return g.augments?.includes("tap") ? 10 : 20;
}

/** Crew Teleporter wiki, "System Upgrades": 20 / 15 / 10 seconds at levels 1 / 2 / 3 (sling.ts cooldown). */
function slingCooldown(level: number): number {
  if (level >= 3) return 10;
  if (level === 2) return 15;
  return 20;
}

/** Player systems that live in a room, in a fixed order so the random pick is reproducible per seed. */
const PLAYER_SYSTEMS: readonly SysId[] = ["shields", "engines", "oxygen", "medbay", "weapons", "pilot", "sensors", "doors"];

const LABEL: Record<string, string> = {
  shields: "Shields",
  engines: "Engines",
  oxygen: "Oxygen",
  medbay: "Medbay",
  weapons: "Weapons",
  pilot: "Piloting",
  sensors: "Sensors",
  doors: "Doors",
  veil: "Cloaking",
  sling: "Teleporter",
  spike: "Hacking",
  swarm: "Drone Control",
  leash: "Mind Control",
  cradle: "Clone Bay",
  cell: "Backup Battery",
  lance: "Artillery Beam",
  flak: "Flak Artillery",
};

function enemyKit(g: Game): Kit | undefined {
  return g.enemy?.kits.spike;
}

/**
 * Hacking wiki, "Defences against hacking": "Destroying or ionising the enemy's hacking system will interrupt the
 * hacking effect, until their hacking system becomes operational again." Working bars come from sim.ts kitBars.
 */
function operational(kit: Kit): boolean {
  return kitBars(kit) >= 1;
}

/** True while the enemy's pulse is running on one of `ids` and their Hacking still works. */
function enemyPulseOn(g: Game, ids: readonly string[]): boolean {
  const kit = enemyKit(g);
  if (!kit || !kit.hackLatched || !running(kit) || !operational(kit)) return false;
  return !!kit.target && ids.includes(kit.target);
}

/**
 * Hacking wiki, "Choosing your hacking target": "While travelling, the hacking drone can be targeted by defense drones
 * and anti-combat drones". The player's screen is swarm.ts interceptIncomingDrone, called once per flight tick:
 * "down" destroys the drone, "stun" holds it in place ANTI_STUN_S seconds (Drone Control, Anti-Combat Drone:
 * "Stuns Combat, Hacking, and Boarding drones ... during the 5 seconds stun"), null lets it fly on.
 */
function hackDroneIntercept(g: Game): "down" | "stun" | null {
  return interceptIncomingDrone(g, "player", "hacking");
}

/** Hacking wiki, "Hacking specifics for enemy ships": level cap (see ENEMY_LEVEL3). */
function capEnemyLevel(ship: Ship, kit: Kit) {
  // @agent:flagship. "...and the Flagship in phase 1": the flagship hull (Ship.flagship) now carries a Hacking kit.
  const cap = ENEMY_LEVEL3.has(ship.classId ?? "") || ship.flagship ? 3 : ENEMY_MAX_LEVEL;
  if (kit.level <= cap) return;
  kit.level = cap;
  kit.power = Math.min(kit.power, kit.level - (kit.damage ?? 0));
}

/**
 * Hacking wiki, "Hacking specifics for enemy ships": "Enemy hacking choice of a system is completely random each time
 * they launch a hacking drone." Candidates: every player system with a room, and every fitted subsystem kit.
 * INFERRED: a kit (Cloaking, Teleporter, …) has no room on the player hulls, but is still a system the page lists.
 */
export function enemyHackTargets(g: Game): string[] {
  const out: string[] = [];
  for (const id of PLAYER_SYSTEMS) {
    const sys = g.player.systems[id];
    if (sys && sys.level > 0 && roomWith(g.player, id)) out.push(id);
  }
  for (const [id, kit] of Object.entries(g.player.kits)) {
    if (kit && kit.level > 0) out.push(id);
  }
  return out;
}

/** Augmentations, "Zoltan Shield": "Until they are destroyed, Zoltan Shields prevent boarding, hacking, and mind control." */
function playerBubble(g: Game): boolean {
  return (g.player.zoltan ?? 0) > 0;
}

/**
 * Hacking wiki, "Choosing your hacking target": "This costs one drone part and takes about 2--3 seconds to reach the
 * enemy ship." Overview: "Hacking drone cannot be launched at a ship with a Zoltan Shield" (the enemy never has the
 * player-only Zoltan Shield Bypass). "if they are cloaked, you must wait for the cloak to end."
 * INFERRED timing: launch as soon as powered, cooled, and a part is in stock. Basis: Cloaking page, "The enemy always
 * immediately cloaks as soon as their cloaking is not on cooldown".
 * Enemy Ships, "Missile and drone stocks": parts come from ship.parts ("Hacking does not count towards this increase").
 */
export function launchEnemySpike(g: Game): boolean {
  const ship = g.enemy;
  const kit = enemyKit(g);
  if (!ship || !kit || g.phase !== "combat") return false;
  // Zoltans: an ionized Hacking system cannot be activated.
  if (kitIonLocked(kit)) return false;
  if (kit.hackLatched || kit.hackFly != null || kit.cool > 0) return false;
  if (!operational(kit) || ship.parts < 1) return false;
  if (playerBubble(g) || veilBlocks(g, "enemy")) return false;
  const pool = enemyHackTargets(g);
  if (!pool.length) return false;
  kit.target = pool[Math.floor(rand(g) * pool.length) % pool.length] ?? null;
  if (!kit.target) return false;
  ship.parts -= 1;
  const fly = FLIGHT_MIN + rand(g) * FLIGHT_SPREAD;
  kit.hackFly = fly;
  kit.hackFlyTotal = fly;
  kit.on = false;
  kit.left = 0;
  kit.aux = 0;
  log(g, "They launch a hacking drone.");
  return true;
}

/** The drone is gone before it latched. "you will be able to send another one after a short delay." */
function loseDrone(kit: Kit) {
  kit.stun = undefined;
  kit.hackFly = undefined;
  kit.hackFlyTotal = undefined;
  kit.hackLatched = false;
  kit.target = null;
  kit.cool = RELAUNCH_DELAY;
}

/**
 * Hacking wiki, "Choosing your hacking target": "When the drone reaches the enemy ship, it latches onto the hull and
 * becomes invulnerable." Overview: "A hacking drone launched prior to a Zoltan Shield being up ... will be destroyed
 * upon impact with the Zoltan Shield when it goes up." Mirrors launchSpike: the bubble takes no damage.
 */
function arrive(g: Game, kit: Kit) {
  if (playerBubble(g)) {
    loseDrone(kit);
    log(g, "Their hacking drone breaks on your Zoltan Shield.");
    return;
  }
  kit.hackFly = undefined;
  kit.hackFlyTotal = undefined;
  kit.hackLatched = true;
  // Crystal Lockdown: a coating already on this room is what leaves 4 hits. The later pulse can cancel it.
  if (kit.target) noteHackLatchedDuringLock(g.player, kit.target);
  log(g, `Their hacking drone latches onto your ${LABEL[kit.target ?? ""] ?? kit.target}.`);
}

/** Hacking wiki, "Overview" (Hacking pulse): 4 / 7 / 10 seconds by the hacker's working bars. */
function startEnemyPulse(g: Game, kit: Kit) {
  const seconds = pulseSeconds(kitBars(kit));
  if (seconds <= 0) return;
  kit.on = true;
  kit.left = seconds;
  kit.aux = 0;
  // Crystal Lockdown: a pulse during the coating keeps normal hacked-door strength.
  if (kit.target) noteHackPulseDuringLock(g.player, kit.target, g.difficulty);
  // Hacking wiki, "Overview" (Cloaking): "ends an active cloak". INFERRED: the cloak then cools as it does after any
  // ended cloak (Cloaking, "Overview": 20 seconds).
  const veil = g.player.kits.veil;
  if (kit.target === "veil" && veil?.on) {
    veil.on = false;
    veil.left = 0;
    veil.cool = CLOAK_COOLDOWN;
  }
  log(g, `They hack your ${LABEL[kit.target ?? ""] ?? kit.target}.`);
}

function releaseHeld(g: Game, kit: Kit) {
  if (!kit.hackHeld) return;
  const c = g.crew.find((x) => x.id === kit.hackHeld);
  kit.hackHeld = undefined;
  if (c && c.side === "player" && (c.leashed ?? 0) > 0) {
    c.leashed = 0;
    delete c.leashed;
  }
}

function endEnemyPulse(g: Game, kit: Kit) {
  kit.left = 0;
  kit.on = false;
  kit.cool = COOLDOWN;
  kit.aux = 0;
  releaseHeld(g, kit);
}

/**
 * Zoltans: ion damage interrupts a hacking pulse and starts a cooldown equivalent to the ion damage.
 * INFERRED: one ion point is the 5 second lock applyIon already uses, so the cooldown is that many seconds per point.
 * A Zoltan in the room does not keep the pulse alive. One point ends a level 3 pulse.
 * Cloaking and Mind Control are not interrupted here.
 */
export const HACK_ION_LOCK = 5;

export function ionHitsHack(g: Game, ship: Ship, points: number): void {
  const kit = ship.kits.spike;
  if (!kit || !running(kit)) return;
  kit.left = 0;
  kit.on = false;
  kit.aux = 0;
  kit.cool = Math.max(kit.cool, Math.max(1, points) * HACK_ION_LOCK);
  if (ship === g.player) {
    if (kit.hackHeld) {
      const c = g.crew.find((x) => x.id === kit.hackHeld);
      kit.hackHeld = undefined;
      if (c && c.side === "enemy" && (c.leashed ?? 0) > 0) {
        c.leashed = 0;
        delete c.leashed;
      }
    }
    const cell = g.enemy?.kits.cell;
    if (cell?.drained != null) delete cell.drained;
    return;
  }
  releaseHeld(g, kit);
  if (g.player.kits.cell?.drained != null) delete g.player.kits.cell.drained;
}

/**
 * Hacking wiki, "Overview" (Mind Control): "temporarily turns one random enemy into an ally, and removes enemy mind
 * control from allies." From the enemy's side: one random player crew member fights for them this pulse, and the
 * player's own holds on enemy crew end. "Fails completely when used by automated ships." "If the enemy mind-controlled
 * crew dies during the disruption, then another enemy crew will be mind-controlled."
 * Mind Control, "Overview": "Slugs cannot be mind controlled." (kin "gel").
 */
function pulseMind(g: Game, kit: Kit) {
  if (g.enemy?.automated) return;
  for (const c of g.crew) {
    if (c.side === "enemy" && (c.leashed ?? 0) > 0) {
      c.leashed = 0;
      delete c.leashed;
    }
  }
  const own = g.player.kits.leash;
  if (own?.on) {
    own.on = false;
    own.left = 0;
  }
  const held = g.crew.find((c) => c.id === kit.hackHeld);
  if (held && held.hp > 0 && (held.leashed ?? 0) > 0) {
    held.leashed = kit.left;
    return;
  }
  kit.hackHeld = undefined;
  const pool = g.crew.filter((c) => c.side === "player" && c.hp > 0 && (c.leashed ?? 0) <= 0 && c.kin !== "gel");
  if (!pool.length) return;
  const c = pool[Math.floor(rand(g) * pool.length) % pool.length];
  c.leashed = kit.left;
  c.path = [];
  c.move = 0;
  if (g.selected === c.id) g.selected = null;
  kit.hackHeld = c.id;
  log(g, `${c.name} is turned by their hack.`);
}

/**
 * Hacking wiki, "Overview" (Crew Teleporter): "forcibly recalls hostile boarders, putting the system on cooldown if
 * anyone was successfully recalled." "Does not retrieve crew from a cloaked ship." "when your teleporter is hacked, it
 * will abduct enemy crew that you have mind-controlled on the enemy ship." Player crew the enemy holds stay put
 * (Mind Control: "A player cannot teleport own mind-controlled crew from the enemy ship").
 * Crew Teleporter, Overview: "Retrieved crew that cannot fit in the teleporter room will be placed in adjacent room(s)."
 * The hack sentence does not reprint "up to 4", so this recall is not capped.
 */
function pulseSling(g: Game) {
  const sling = g.player.kits.sling;
  if (!sling || veilBlocks(g, "player")) return;
  const away = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0 && sideOf(c) === "player");
  if (!away.length) return;
  if (!retrievedRoom(g.player, 0)) return;
  away.forEach((c, i) => {
    c.aboard = "player";
    c.room = retrievedRoom(g.player, i)!;
    c.path = [];
    c.move = 0;
  });
  sling.on = false;
  sling.left = 0;
  sling.cool = slingCooldown(sling.level);
  log(g, "Their hack yanks your boarders home.");
}

/**
 * Hacking wiki, "Overview" (Drone Control): "disables drones, with a chance to destroy them"; "after a one-second
 * delay, there's a 15% chance to destroy the drone every second". The deployed drone is held with swarm.ts's `stun`.
 * INFERRED: a destroyed drone is undeployed (kit.on false), so a new part is needed, as after any lost drone.
 */
function pulseSwarm(g: Game, kit: Kit, dt: number) {
  const swarm = g.player.kits.swarm;
  if (!swarm?.on) return;
  swarm.stun = Math.max(swarm.stun ?? 0, kit.left);
  const before = kit.aux;
  kit.aux += dt;
  for (let s = Math.floor(before) + 1; s <= Math.floor(kit.aux + 1e-9); s++) {
    if (s >= 2 && rand(g) < DRONE_KILL_PER_S) {
      swarm.on = false;
      swarm.stun = 0;
      log(g, "Their hack burns out your drone.");
      return;
    }
  }
}

/**
 * Hacking wiki, "Overview" (Weapon Control): drain at the weapon's own base charge speed and hold it under a full bar.
 * INFERRED: the hold is 0.99. The page says weapons cannot fire and never states 0.99.
 * `only` limits the drain to one flagship artillery gun. Null drains every listed gun.
 */
function drainGuns(weapons: Ship["weapons"], dt: number, only: string | null) {
  for (const w of weapons) {
    if (only && w.defId !== only) continue;
    // Weapon Control, Overview: stored charger charges "cannot be removed by hacking disruptions".
    // The in-progress shot is part of that store. Ordinary weapons still drain to just under a full bar.
    if (chargerCap(w.defId) != null) continue;
    const seconds = WEAPONS[w.defId]?.charge;
    if (seconds == null || seconds <= 0) continue;
    w.charge = Math.min(0.99, Math.max(0, w.charge - dt / seconds));
  }
}

/** Effects of the enemy's pulse on the player, by hacked system. Hacking wiki, "Overview" (Active effects). */
function applyEnemyPulse(g: Game, kit: Kit, dt: number) {
  const ship = g.player;
  const artillery = ship.flagship ? FLAGSHIP_GUN[kit.target ?? ""] : undefined;
  if (artillery) {
    // Rebel Flagship weapons: one artillery room, the same drain as Weapon Control, not every gun.
    drainGuns(ship.weapons, dt, artillery);
    return;
  }
  switch (kit.target) {
    case "shields":
      // "Shields: discharges shields, requiring 2 seconds to remove 1 shield layer." sim.ts shieldRegen holds the
      // recharge meanwhile (hackHoldsShields).
      kit.aux += dt;
      while (kit.aux >= SHIELD_DROP_SECONDS) {
        kit.aux -= SHIELD_DROP_SECONDS;
        if (ship.shieldNow > 0) ship.shieldNow -= 1;
      }
      return;
    case "weapons":
      // "Weapon Control: drains the charge of all weapons on the ship and prevents them from being fired";
      // "Draining speed is the same as speed as the base-level charging speed". sim.ts chargeSide stops the charge.
      // A flagship hull's guns are separate artillery. This case is the shared Weapons system, so it does not run there.
      if (ship.flagship) return;
      drainGuns(ship.weapons, dt, null);
      return;
    case "oxygen":
      // "Oxygen: drains O2 levels of ship at 6% per second."
      for (const room of ship.rooms) room.o2 = Math.max(0, room.o2 - OXYGEN_PER_SECOND * dt);
      return;
    case "medbay": {
      // "Medbay: drains the health of hostile crew in the medbay at 13 health per second. Friendly crew are unaffected."
      const bay = roomWith(ship, "medbay");
      if (!bay) return;
      for (const c of g.crew) {
        if (c.aboard !== "player" || c.room !== bay.id || c.hp <= 0 || sideOf(c) !== "player") continue;
        c.hp = Math.max(0, c.hp - MEDBAY_HURT * dt);
      }
      return;
    }
    case "veil": {
      // "Cloaking: ... prevents the enemy from entering cloak." A cloak started during the pulse is cancelled.
      // Cloaking, Overview: "Hacking pulse ends an active cloak and puts the Cloaking system on full (20 seconds) cooldown."
      const veil = ship.kits.veil;
      if (veil?.on) {
        veil.on = false;
        veil.left = 0;
        veil.cool = CLOAK_COOLDOWN;
      }
      return;
    }
    case "spike": {
      // "Hacking: ends an active hack, with a chance to destroy the hacking drone". Choosing your hacking target: "It
      // can only be destroyed if the enemy hacks your hacking system." The drone at risk is the player's, latched on
      // the enemy hull (Ship.hackDrone): 15% a second after a one-second delay, as in pulseTheirHacking.
      const own = ship.kits.spike;
      if (own && running(own)) {
        own.on = false;
        own.left = 0;
        own.aux = 0;
        own.cool = COOLDOWN;
      }
      const foe = g.enemy;
      if (!foe || foe.hackDrone == null) return;
      const before = kit.aux;
      kit.aux += dt;
      for (let s = Math.floor(before) + 1; s <= Math.floor(kit.aux + 1e-9); s++) {
        if (s >= 2 && rand(g) < DRONE_KILL_PER_S) {
          delete foe.hackDrone;
          log(g, "Their hack burns out your hacking drone.");
          return;
        }
      }
      return;
    }
    case "cell": {
      // "Backup Battery: disables bonus power, putting the system on cooldown if active". The other half, "temporarily
      // removes two regular power bars from reactor", is syncDrain (Kit.drained, read by cell.ts cellBonus).
      const cell = ship.kits.cell;
      if (cell?.on && cell.left > 0) {
        cell.on = false;
        cell.left = 0;
        cell.aux = 0;
        cell.cool = cellCooldown(g);
      }
      return;
    }
    case "swarm":
      pulseSwarm(g, kit, dt);
      return;
    case "leash":
      pulseMind(g, kit);
      return;
    case "sling":
      pulseSling(g);
      return;
    default:
      // engines / pilot: predicates below (evasion 0, FTL frozen). doors: syncDoors. cell: syncDrain.
      // Clone Bay ("disables the clone bay"): cradle.ts asks hackPulseOn. Sensors ("disable sensors"):
      // playerSensorLevel. Artillery Beam / Flak Artillery ("drains charge"): lance.ts / flakart.ts ask hackPulseOn.
      return;
  }
}

/**
 * Hacking wiki, "Overview": "Doors are locked for hostile crew, but friendly crew can pass through freely" while the
 * drone is attached and Hacking is powered (the hacked room's doors), and "Door System: locks all doors, converting
 * them into temporary enemy level 3 blast doors" during a pulse on Doors. "Hacked doors are equivalent to level 3
 * blast doors; after being broken down they will 'heal' and close automatically in 7 seconds" (sim.ts sets the 7 s
 * `stuck`; this closes the door once it runs out). Airlocks are left alone, as in the player's own Doors pulse.
 * INFERRED: hp is cleared on lock and on release, so moveCrew re-arms at level 3, except the printed
 * level-3 cell for this difficulty, or the 4-hit Crystal Lockdown mark, already written this tick.
 */
function syncDoors(g: Game, kit: Kit | undefined) {
  const ship = g.player;
  const live = !!kit && !!kit.hackLatched && operational(kit) && !!g.enemy;
  const all = live && running(kit!) && kit!.target === "doors";
  const room = live && kit!.target ? roomWith(ship, kit!.target as SysId)?.id : undefined;
  lockHackedDoors(ship, all, room, g.difficulty);
}

/**
 * Boarding, "Doors": "Doors of a hacked system room function as level 3 blast doors (regardless of the ship's door
 * system level) and allow unimpeded movement of boarders and mind-controlled crew, but block the ship's crew movement."
 * Hacking, "Overview": the lock holds while the drone is attached and Hacking is powered. A Doors pulse locks every
 * door (the enemy hack's syncDoors already does this on the player hull).
 * Boarding, "Hacking": de-powering opens those doors for that ship's crew, and powering again closes them.
 */
function syncOwnDoors(g: Game, kit: Kit) {
  const ship = g.enemy;
  if (!ship) return;
  const live =
    g.phase === "combat" && ship.hackDrone != null && kit.target != null && ship.hackDrone === kit.target && fedBars(kit) >= 1;
  const all = live && running(kit) && kit.target === "doors";
  const room = live && kit.target ? aimRoom(ship, kit.target)?.id : undefined;
  lockHackedDoors(ship, all, room, g.difficulty);
}

function lockHackedDoors(ship: Ship, all: boolean, room: string | undefined, difficulty: Difficulty = "normal") {
  for (const d of ship.doors) {
    const want = d.b !== "void" && (all || (!!room && (d.a === room || d.b === room)));
    if (want) {
      if (!d.hacked) {
        d.hacked = true;
        // INFERRED: hp is cleared so moveCrew re-arms at level 3. Crystal Lockdown writes the level-3
        // cell for this difficulty, or 4, on this same tick, before this sync; those values stay.
        if (d.hp !== blastHits(HACKED_DOOR_LEVEL, difficulty) && d.hp !== HACK_COAT_HITS) d.hp = 0;
      }
      if (d.stuck <= 0) d.open = false;
    } else if (d.hacked) {
      delete d.hacked;
      d.hp = 0;
    }
  }
}

/** Marks the player's hacked room for ShipView (Room.hacked). */
function syncRooms(g: Game, kit: Kit | undefined) {
  const room = kit?.hackLatched && kit.target ? roomWith(g.player, kit.target as SysId)?.id : undefined;
  const mark = kit && running(kit) && operational(kit) ? "pulse" : "latched";
  for (const r of g.player.rooms) {
    if (r.id === room) r.hacked = mark;
    else if (r.hacked) delete r.hacked;
  }
}

/**
 * @agent:hacking. Hacking wiki, "Overview" (Backup Battery): "temporarily removes two regular power bars from reactor".
 * Backup Battery wiki, "Overview": "Hacking a Backup Battery will cause it to shut down and drain two regular power bars
 * from the reactor." INFERRED: "temporarily" is the pulse; the bars come back when it ends or their Hacking goes down.
 */
const DRAINED_BARS = 2;

function syncDrain(g: Game, kit: Kit | undefined) {
  const cell = g.player.kits.cell;
  if (!cell) return;
  const on = !!kit && !!g.enemy && enemyPulseOn(g, ["cell"]);
  if (on) cell.drained = DRAINED_BARS;
  else if (cell.drained != null) delete cell.drained;
}

/** Clears every enemy-hack mark on the player hull. sim.ts step calls it outside combat. */
export function clearEnemyHackMarks(g: Game) {
  if (g.player.kits.cell?.drained != null) delete g.player.kits.cell.drained;
  for (const r of g.player.rooms) if (r.hacked) delete r.hacked;
  for (const d of g.player.doors) {
    if (!d.hacked) continue;
    delete d.hacked;
    d.hp = 0;
  }
}

/** Enemy half of tickSpike: launch, flight, latch, pulse, cooldown. */
export function tickEnemySpike(g: Game, dt: number) {
  const ship = g.enemy;
  const kit = ship?.kits.spike;
  if (!ship || !kit || g.phase !== "combat") {
    clearEnemyHackMarks(g);
    return;
  }
  capEnemyLevel(ship, kit);
  const live = operational(kit);
  if (kit.hackFly != null) {
    // Kit.stun (drones field) holds the flying hacking drone after an Anti-Combat hit.
    const stunned = (kit.stun ?? 0) > 0;
    if (stunned) kit.stun = Math.max(0, (kit.stun ?? 0) - dt);
    const hit = hackDroneIntercept(g);
    if (hit === "down") {
      loseDrone(kit);
      log(g, "Your drone shoots down their hacking drone.");
    } else if (hit === "stun") {
      kit.stun = ANTI_STUN_S;
      log(g, "Your drone stuns their hacking drone.");
    } else if (live && !stunned && !veilBlocks(g, "enemy")) {
      // "Defense drones can be dodged by de-powering the hacking drone ..., which freezes the hacking drone in place".
      // Cloaking, Overview: the drone also holds while the player ship it is flying to is cloaked, then continues.
      kit.hackFly -= dt;
      if (kit.hackFly <= 0) arrive(g, kit);
    }
  } else if (!kit.hackLatched) {
    if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
    else launchEnemySpike(g);
  } else if (running(kit)) {
    // INFERRED: the pulse clock keeps running while their Hacking is down; only the effect stops.
    const step = Math.min(dt, kit.left);
    if (live) applyEnemyPulse(g, kit, step);
    else releaseHeld(g, kit);
    kit.left -= step;
    if (kit.left <= 1e-6) {
      endEnemyPulse(g, kit);
      const rest = dt - step;
      if (rest > 0) kit.cool = Math.max(0, kit.cool - rest);
    }
  } else if (kit.cool > 0) {
    kit.cool = Math.max(0, kit.cool - dt);
  } else if (live && !playerPulseOn(g, "spike")) {
    // @agent:hacking. INFERRED: no new pulse while the player's pulse is on their Hacking ("ends an active hack").
    startEnemyPulse(g, kit);
  }
  syncDoors(g, kit);
  syncRooms(g, kit);
  syncDrain(g, kit);
}

/** Hacking wiki, "Overview" (Piloting/Engines): "stops the FTL drive charging". The player's ship only. */
export function hackFreezesFtl(g: Game, ship: Ship): boolean {
  return ship === g.player && enemyPulseOn(g, ["engines", "pilot"]);
}

/** Hacking wiki, "Overview" (Weapon Control): the hacked side's weapons do not charge (sim.ts chargeSide). */
export function hackHoldsWeapons(g: Game, from: "player" | "enemy"): boolean {
  if (from === "player") {
    // Flagship artillery is not one Weapons system. hackDrainsGun holds the one gun.
    if (g.player.flagship) return false;
    return enemyPulseOn(g, ["weapons"]);
  }
  // The player's own pulse on the enemy's Weapons: "drains the charge ... and prevents them from being fired".
  // Without this the enemy recharged every tick, cancelling the drain.
  // A flagship pulse names one artillery room, so this does not freeze the other guns.
  const kit = kitOf(g);
  if (!kit || !running(kit) || g.enemy?.flagship) return false;
  return kit.target === "weapons";
}

/**
 * The one flagship gun a hacking pulse is draining. Other guns on that hull keep charging.
 * Hacking, "Overview": Rebel Flagship weapons drain charge the same way Weapon Control does, per artillery room.
 */
export function hackDrainsGun(g: Game, from: "player" | "enemy", defId: string): boolean {
  const ship = from === "enemy" ? g.enemy : g.player;
  if (!ship?.flagship) return false;
  const kit = from === "enemy" ? kitOf(g) : enemyKit(g);
  if (!kit || !running(kit)) return false;
  if (from === "player" && (!kit.hackLatched || !operational(kit))) return false;
  return FLAGSHIP_GUN[kit.target ?? ""] === defId;
}

/**
 * Hacking wiki, "Overview" (Shields): "discharges shields". INFERRED: no layer recharges during that pulse, otherwise
 * a 2-second recharge would cancel the 2-second discharge (sim.ts shieldRegen).
 */
export function hackHoldsShields(g: Game, ship: Ship): boolean {
  return ship === g.player && enemyPulseOn(g, ["shields"]);
}

/** Hacking wiki, "Overview" (Cloaking): "prevents the enemy from entering cloak". For the cloak button. */
export function playerCloakHacked(g: Game): boolean {
  return enemyPulseOn(g, ["veil"]);
}

/** sim.ts moveCrew: this door is a hacked level-3 blast door (syncDoors on the player hull, syncOwnDoors on the enemy). */
export function hackLocksDoor(g: Game, ship: Ship, door: Door): boolean {
  if (!door.hacked || !g.enemy) return false;
  return ship === g.player || ship === g.enemy;
}

/**
 * Read-only view for the UI and fx: the enemy hacking drone's phase, flight progress (0..1), target and its
 * player room (null for a kit with no room), and pulse seconds left.
 */
export function enemyHackView(g: Game): {
  phase: "flying" | "latched" | "pulse";
  progress: number;
  target: string;
  label: string;
  room: string | null;
  left: number;
  cool: number;
} | null {
  const kit = enemyKit(g);
  if (!kit || !kit.target) return null;
  const room = roomWith(g.player, kit.target as SysId)?.id ?? null;
  const label = LABEL[kit.target] ?? kit.target;
  if (kit.hackFly != null) {
    const total = kit.hackFlyTotal ?? kit.hackFly;
    const progress = total > 0 ? Math.min(1, Math.max(0, 1 - kit.hackFly / total)) : 1;
    return { phase: "flying", progress, target: kit.target, label, room, left: 0, cool: kit.cool };
  }
  if (!kit.hackLatched) return null;
  const pulse = running(kit) && operational(kit);
  return { phase: pulse ? "pulse" : "latched", progress: 1, target: kit.target, label, room, left: kit.left, cool: kit.cool };
}

// ---------------------------------------------------------------------------------------------
// @agent:hacking. Shared hacking predicates for sim.ts and the other extras (both directions).
// ---------------------------------------------------------------------------------------------

/**
 * True while a hostile Hacking pulse is working on system or kit `id` of `ship`: the enemy's pulse on the player
 * hull (their Hacking must still work), or the player's pulse on the enemy hull. Hacking wiki, "Overview" (Active
 * effects during hacking pulse). Read by cradle.ts (Clone Bay), lance.ts and flakart.ts (artillery charge drain).
 */
export function hackPulseOn(g: Game, ship: Ship, id: string): boolean {
  if (ship === g.player) return enemyPulseOn(g, [id]);
  if (g.enemy && ship === g.enemy) return playerPulseOn(g, id);
  return false;
}

/**
 * The system or kit id on `ship` with a hostile hacking drone attached, or null. Hacking wiki, "Overview": "Passive
 * effects on a system with attached hacking drone" need only the drone, not power in the hacker's system.
 */
export function hackDroneOn(g: Game, ship: Ship): string | null {
  if (ship === g.player) {
    const kit = enemyKit(g);
    return kit?.hackLatched && kit.target ? kit.target : null;
  }
  if (g.enemy && ship === g.enemy) return g.enemy.hackDrone ?? null;
  return null;
}

/**
 * Hacking wiki, "Overview" (passive effects): "System cannot be manned, but automated ships still get their manning
 * bonuses." sim.ts manning() asks this. An automated hull keeps whatever its rules give it.
 */
export function hackBlocksManning(g: Game, ship: Ship, id: string): boolean {
  if (ship.automated) return false;
  return hackDroneOn(g, ship) === id;
}

/**
 * Hacking wiki, "Overview" (passive effects): "Repair speed of the system is halved." sim.ts life() scales crew
 * repair of that system (or kit) room by this. Breach repair in the room is not the system's, so it is not halved.
 * INFERRED: the room's breach is left at full speed; the page names only the system.
 */
export function hackRepairScale(g: Game, ship: Ship, id: string | undefined): number {
  if (!id) return 1;
  return hackDroneOn(g, ship) === id ? 0.5 : 1;
}

/**
 * Read-only, for the UI: the player's working Sensors level (0..4), with the hacking rules applied.
 * Hacking wiki, "Overview" (Active effects): "Sensors: disable sensors." -> 0 while the enemy's pulse is on Sensors.
 * "System cannot be manned" (passive): with their drone on Sensors the manning step is dropped, so the level is the
 * unmanned one. Sensors wiki, "Overview": "Manning the Sensors console makes the system work 1 level above"; the
 * level-4 row is "Only available when Level 3 Sensors subsystem is manned", so unmanned tops out at 3.
 * Base level comes from sensors.ts sensorLevel.
 * Sensors, "Overview": "Sensors are temporarily disabled in nebulas."
 */
export function playerSensorLevel(g: Game): number {
  const ship = g.player;
  if (!ship.systems.sensors) return 0;
  if (g.beacons.find((b) => b.id === g.here)?.kind === "nebula") return 0;
  if (g.phase === "combat" && enemyPulseOn(g, ["sensors"])) return 0;
  if (g.phase === "combat" && hackBlocksManning(g, ship, "sensors")) {
    const sys = ship.systems.sensors;
    return Math.max(0, Math.min(3, sys.level - sys.damage - sys.ion.length));
  }
  return sensorLevel(g, ship, "player");
}

/**
 * Read-only, for the UI: what the player's latched drone reveals on the enemy hull, or null with no drone.
 * Hacking wiki, "Overview" (passive effects): "Room vision and max-level Sensors information on the system."
 * -> `room` is the enemy room to reveal, `sensors` is 4 for that system.
 * "Additional passive effects if the Hacking system is powered: If the targeted system is Piloting or Engines, the ship
 * name on the top right corner is replaced with text that states the current Evasion of the enemy ship."
 * -> `evasion` is that percent while the player's Hacking has a working bar, else null.
 */
export function hackVision(g: Game): { system: string; room: string | null; sensors: 4; evasion: number | null } | null {
  const foe = g.enemy;
  const id = foe?.hackDrone;
  if (!foe || !id) return null;
  const kit = kitOf(g);
  const powered = !!kit && fedBars(kit) >= 1;
  const evasion = powered && (id === "engines" || id === "pilot") ? evasionPercent(g, foe, "enemy") : null;
  return { system: id, room: aimRoom(foe, id)?.id ?? null, sensors: 4, evasion };
}

// ---------------------------------------------------------------------------------------------
// @agent:hack-ui. Read-only helpers for the player's Hacking controls (GameApp dock orb, ShipView reticle).
// ---------------------------------------------------------------------------------------------

/**
 * Removes one bar from the player's Hacking. toggleSpikePower adds first, so the dock's "-" needs its own step.
 * Hacking wiki, "Overview": doors under the drone open for hostile crew "by removing all power from your hacking system".
 */
export function lowerSpikePower(g: Game) {
  const kit = kitOf(g);
  if (kit && kit.power > 0 && !cooldownLocksPower(kit)) kit.power -= 1;
}

/** Adds one bar when the reactor has one spare and the level allows it (the add half of toggleSpikePower). */
export function raiseSpikePower(g: Game) {
  const kit = kitOf(g);
  if (kit && !cooldownLocksPower(kit) && kit.power < kit.level && sparePower(g.player) >= 1) kit.power += 1;
}

/**
 * Hacking wiki, "Choosing your hacking target": "click on the hacking drone icon, then click an enemy system room."
 * True when enemy room `roomId` holds a system or kit this drone may be aimed at (TARGETS / KIT_TARGETS).
 */
/**
 * The system or artillery room a click on `roomId` aims at.
 * On the flagship, an artillery room aims at that room, not the shared Weapons id.
 */
export function spikeAimId(g: Game, roomId: string): string | null {
  const room = g.enemy?.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  if (g.enemy?.flagship && FLAGSHIP_GUN[room.id]) return room.id;
  const id = room.system ?? room.kit;
  return id && isTarget(g, id) ? id : null;
}

export function spikeRoomTargetable(g: Game, roomId: string): boolean {
  return spikeAimId(g, roomId) != null;
}

export type PlayerHackState =
  | "nopower" // "With power in the hacking system" not met
  | "zoltan" // "If the enemy has a Zoltan Shield, you must destroy it first"
  | "cloaked" // "if they are cloaked, you must wait for the cloak to end"
  | "noparts" // "This costs one drone part"
  | "cooldown" // "Overview" (Hacking pulse): 20 seconds cooldown
  | "pulse" // the hacking pulse is running
  | "queued" // @agent:hack-rules. picked while paused: launches on unpause, icon cancels
  | "flying" // @agent:hack-rules. drone in flight, "about 2--3 seconds to reach the enemy ship"
  | "latched" // drone attached, pulse ready
  | "ready" // no drone yet, can launch
  | "idle"; // no fight

/**
 * The player's Hacking state for the dock. Order follows launchSpike's own checks so the label matches what a click
 * would do. `room` is the enemy room the drone sits on (or is aimed at), `cost` is the drone part per launch.
 */
export function playerHackView(g: Game): {
  state: PlayerHackState;
  target: string | null;
  label: string | null;
  room: string | null;
  latched: boolean;
  left: number;
  cool: number;
  power: number;
  level: number;
  pulse: number;
  parts: number;
  cost: 1;
  /** @agent:hack-rules. Flight progress 0..1 while "flying"; stunned by an Anti-Combat Drone; frozen with no power. */
  progress: number;
  stunned: boolean;
} | null {
  const kit = kitOf(g);
  if (!kit) return null;
  const foe = g.enemy;
  const latchedId = foe?.hackDrone ?? null;
  const flyingId = foe?.hackFlying ?? null;
  const flying = flyingId != null && kit.hackFly != null;
  const total = kit.hackFlyTotal ?? kit.hackFly ?? 0;
  const progress = flying && total > 0 ? Math.min(1, Math.max(0, 1 - (kit.hackFly ?? 0) / total)) : 0;
  const target = latchedId ?? flyingId ?? kit.target ?? null;
  const room = foe && target ? (aimRoom(foe, target)?.id ?? null) : null;
  const powered = fedBars(kit);
  const base = {
    target,
    label: target ? (LABEL[target] ?? target) : null,
    room,
    latched: latchedId != null,
    left: kit.left,
    cool: kit.cool,
    power: kit.power,
    level: kit.level,
    pulse: pulseSeconds(powered),
    parts: g.player.parts,
    cost: 1 as const,
    progress,
    stunned: flying && (kit.stun ?? 0) > 0,
  };
  let state: PlayerHackState;
  if (running(kit)) state = "pulse";
  else if (!foe || g.phase !== "combat") state = "idle";
  else if (kit.hackQueued && latchedId == null) state = "queued";
  else if (flying) state = "flying";
  else if (powered < 1) state = "nopower";
  else if (kit.cool > 0) state = "cooldown";
  else if (latchedId != null) state = "latched";
  else if ((foe.zoltan ?? 0) > 0) state = "zoltan";
  else if (veilBlocks(g, "player")) state = "cloaked";
  else if (g.player.parts < 1) state = "noparts";
  else state = "ready";
  return { state, ...base };
}
