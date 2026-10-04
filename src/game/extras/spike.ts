import { bars, kitBars, log, rand, roomWith, sparePower } from "../sim.ts";
import { WEAPONS } from "../content.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import { hackStuns } from "./moreaugs.ts";
import { sideOf } from "./leash.ts";
import { veilBlocks } from "./veil.ts";
import { ANTI_STUN_S, interceptIncomingDrone } from "./swarm.ts";
import type { Door, Game, Kit, Ship, SysId, SystemState } from "../types.ts";

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
 * Hacking wiki, "Overview" (Active effects during hacking pulse): systems this kit can lock.
 * That label also names artillery, Hacking, Backup Battery, Drone Control, Crew Teleporter,
 * Mind Control, Cloaking, Clone Bay, and Sensors, which are not in this list.
 */
const TARGETS: readonly SysId[] = [
  "shields",
  "weapons",
  "engines",
  "pilot",
  "oxygen",
  "medbay",
  "doors",
];

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
  return bars(sys);
}

function pulseSeconds(powered: number): number {
  const i = Math.max(0, Math.min(3, Math.floor(powered)));
  return PULSE_SECONDS[i] ?? 0;
}

function isTarget(id: string): id is SysId {
  return (TARGETS as readonly string[]).includes(id);
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
  if (!kit) return;
  if (kit.power < kit.level && sparePower(g.player) >= 1) {
    kit.power += 1;
    return;
  }
  if (kit.power > 0) kit.power -= 1;
}

/** Hacking wiki, "Choosing your hacking target": the drone is aimed at a single system before it launches. */
export function armSpike(g: Game, systemId: SysId) {
  const kit = kitOf(g);
  if (!kit || running(kit)) return;
  if (!isTarget(systemId)) return;
  kit.target = systemId;
}

/**
 * Hacking wiki, "Choosing your hacking target": launching costs one drone part, then the pulse runs.
 * "Overview" (Hacking pulse) sets the length from power in the system (4, 7, or 10 seconds).
 * "Choosing your hacking target" says the drone takes about 2–3 seconds to arrive; this launch does not wait.
 */
export function launchSpike(g: Game): boolean {
  const kit = kitOf(g);
  if (!kit || !g.enemy) return false;
  if (!kit.target || !isTarget(kit.target)) return false;
  const powered = fedBars(kit);
  if (powered < 1) return false;
  if (g.player.parts < 1) {
    log(g, "Hacking needs a drone part.");
    return false;
  }
  if (running(kit) || kit.cool > 0) return false;
  // @agent:hacking. INFERRED: no launch while the enemy's pulse is on this Hacking system. Hacking, "Overview"
  // (Hacking row): a pulse "ends an active hack"; the page never says whether a new one can start meanwhile.
  if (enemyPulseOn(g, ["spike"])) return false;
  const seconds = pulseSeconds(powered);
  if (seconds <= 0) return false;
  // Zoltan Shield: a hacking drone is destroyed on contact and does not damage the bubble.
  // Augmentations, Zoltan Shield Bypass: it still cannot be launched, and the part is not spent.
  // Without the augment the launch spends the part and the drone breaks before the pulse.
  if ((g.enemy.zoltan ?? 0) > 0) {
    if (g.augments.includes("bypass") && bypassZoltan("hack") === "destroyed") {
      log(g, "Hacking cannot launch through a Zoltan Shield.");
      return false;
    }
    g.player.parts -= 1;
    log(g, "The hacking drone breaks on their Zoltan Shield.");
    return false;
  }
  g.player.parts -= 1;
  kit.on = true;
  kit.left = seconds;
  kit.aux = 0;
  kit.cool = 0;
  log(g, `Hacking locks ${kit.target}.`);
  return true;
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
  // Augmentations, "Offensive Augmentations", Hacking Stun: crew in the pulsed room cannot act for the pulse.
  if (hackStuns(g)) {
    const room = roomWith(enemy, kit.target as SysId);
    if (room) {
      for (const c of g.crew) {
        if (c.aboard !== "enemy" || c.room !== room.id || c.hp <= 0) continue;
        c.stun = kit.left;
      }
    }
  }
  if (kit.target === "shields") {
    kit.aux += dt;
    while (kit.aux >= SHIELD_DROP_SECONDS) {
      kit.aux -= SHIELD_DROP_SECONDS;
      if (enemy.shieldNow > 0) enemy.shieldNow -= 1;
    }
    return;
  }
  if (kit.target === "weapons") {
    for (const w of enemy.weapons) {
      // Hacking wiki, "Overview" (Weapon Control): drain at the weapon's own base charge speed.
      const seconds = WEAPONS[w.defId]?.charge;
      if (seconds == null || seconds <= 0) continue;
      w.charge -= dt / seconds;
      if (w.charge < 0) w.charge = 0;
      // INFERRED: hold the bar at 0.99 so it cannot fire. The page says weapons cannot fire and never states 0.99.
      w.charge = Math.min(w.charge, 0.99);
    }
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
    // Hacking wiki, "Overview" (Door System): doors lock for the pulse. The page also says level-3 blast doors and a 7 second heal; those numbers are not used here.
    for (const door of enemy.doors) {
      if (door.b === "void" || door.stuck > 0) continue;
      door.open = false;
    }
  }
}

/** Hacking wiki, "Overview" (Hacking pulse): counts the pulse down, then starts the 20 second cooldown. */
export function tickSpike(g: Game, dt: number) {
  if (!(dt > 0)) return;
  // @agent:hacking. The enemy's hacking runs first; the player's path below is unchanged.
  tickEnemySpike(g, dt);
  const kit = kitOf(g);
  if (!kit) return;
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
    return;
  }
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
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
  const cap = ENEMY_LEVEL3.has(ship.classId ?? "") ? 3 : ENEMY_MAX_LEVEL;
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
  log(g, `Their hacking drone latches onto your ${LABEL[kit.target ?? ""] ?? kit.target}.`);
}

/** Hacking wiki, "Overview" (Hacking pulse): 4 / 7 / 10 seconds by the hacker's working bars. */
function startEnemyPulse(g: Game, kit: Kit) {
  const seconds = pulseSeconds(kitBars(kit));
  if (seconds <= 0) return;
  kit.on = true;
  kit.left = seconds;
  kit.aux = 0;
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
 * INFERRED: recalled crew land in the player's medbay room, as sling.ts recallSling does.
 */
function pulseSling(g: Game) {
  const sling = g.player.kits.sling;
  if (!sling || veilBlocks(g, "player")) return;
  const away = g.crew.filter((c) => c.aboard === "enemy" && c.hp > 0 && sideOf(c) === "player");
  if (!away.length) return;
  const land = roomWith(g.player, "medbay")?.id ?? g.player.rooms[0]?.id;
  if (!land) return;
  for (const c of away) {
    c.aboard = "player";
    c.room = land;
    c.path = [];
    c.move = 0;
  }
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

/** Effects of the enemy's pulse on the player, by hacked system. Hacking wiki, "Overview" (Active effects). */
function applyEnemyPulse(g: Game, kit: Kit, dt: number) {
  const ship = g.player;
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
      for (const w of ship.weapons) {
        const seconds = WEAPONS[w.defId]?.charge;
        if (seconds == null || seconds <= 0) continue;
        w.charge = Math.min(0.99, Math.max(0, w.charge - dt / seconds));
      }
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
      // INFERRED: that cancel costs no cooldown, as if the button had been greyed out.
      const veil = ship.kits.veil;
      if (veil?.on) {
        veil.on = false;
        veil.left = 0;
      }
      return;
    }
    case "spike": {
      // "Hacking: ends an active hack". The chance to destroy the hacking drone has no target here: the player's
      // hack spends a part per launch and leaves no persistent drone.
      const own = ship.kits.spike;
      if (own && running(own)) {
        own.on = false;
        own.left = 0;
        own.aux = 0;
        own.cool = COOLDOWN;
      }
      return;
    }
    case "cell": {
      // "Backup Battery: disables bonus power, putting the system on cooldown if active". NOT MODELLED: "temporarily
      // removes two regular power bars from reactor".
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
      // engines / pilot: predicates below (evasion 0, FTL frozen). doors: syncDoors.
      // NOT MODELLED: Clone Bay ("disables the clone bay"; cradle.ts has no hook), Sensors ("disable sensors";
      // sensors.ts sensorLevel has no caller yet), Artillery Beam / Flak Artillery ("drains charge").
      return;
  }
}

/**
 * Hacking wiki, "Overview": "Doors are locked for hostile crew, but friendly crew can pass through freely" while the
 * drone is attached and Hacking is powered (the hacked room's doors), and "Door System: locks all doors, converting
 * them into temporary enemy level 3 blast doors" during a pulse on Doors. "Hacked doors are equivalent to level 3
 * blast doors; after being broken down they will 'heal' and close automatically in 7 seconds" (sim.ts sets the 7 s
 * `stuck`; this closes the door once it runs out). Airlocks are left alone, as in the player's own Doors pulse.
 * INFERRED: hp is cleared on lock and on release, so sim.ts moveCrew re-arms it at the right level on the next hit.
 */
function syncDoors(g: Game, kit: Kit | undefined) {
  const ship = g.player;
  const live = !!kit && !!kit.hackLatched && operational(kit) && !!g.enemy;
  const all = live && running(kit!) && kit!.target === "doors";
  const room = live && kit!.target ? roomWith(ship, kit!.target as SysId)?.id : undefined;
  for (const d of ship.doors) {
    const want = d.b !== "void" && (all || (!!room && (d.a === room || d.b === room)));
    if (want) {
      if (!d.hacked) {
        d.hacked = true;
        d.hp = 0;
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

/** Clears every enemy-hack mark on the player hull. sim.ts step calls it outside combat. */
export function clearEnemyHackMarks(g: Game) {
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
    } else if (live && !stunned) {
      // "Defense drones can be dodged by de-powering the hacking drone ..., which freezes the hacking drone in place".
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
  } else if (live) {
    startEnemyPulse(g, kit);
  }
  syncDoors(g, kit);
  syncRooms(g, kit);
}

/** Hacking wiki, "Overview" (Piloting/Engines): "stops the FTL drive charging". The player's ship only. */
export function hackFreezesFtl(g: Game, ship: Ship): boolean {
  return ship === g.player && enemyPulseOn(g, ["engines", "pilot"]);
}

/** Hacking wiki, "Overview" (Weapon Control): the hacked side's weapons do not charge (sim.ts chargeSide). */
export function hackHoldsWeapons(g: Game, from: "player" | "enemy"): boolean {
  if (from === "player") return enemyPulseOn(g, ["weapons"]);
  // The player's own pulse on the enemy's Weapons: "drains the charge ... and prevents them from being fired".
  // Without this the enemy recharged every tick, cancelling the drain.
  const kit = kitOf(g);
  return !!kit && running(kit) && kit.target === "weapons";
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

/** sim.ts moveCrew: this player door is an enemy-hacked level-3 blast door (see syncDoors). */
export function hackLocksDoor(g: Game, ship: Ship, door: Door): boolean {
  return ship === g.player && !!door.hacked && !!g.enemy;
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
