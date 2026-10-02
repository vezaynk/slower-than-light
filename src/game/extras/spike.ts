import { bars, log, roomWith, sparePower } from "../sim.ts";
import { WEAPONS } from "../content.ts";
import { hackStuns } from "./moreaugs.ts";
import type { Game, Kit, Ship, SysId, SystemState } from "../types.ts";

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

/** Hacking wiki, "Overview": the drone is aimed at a single system before it launches. */
export function armSpike(g: Game, systemId: SysId) {
  const kit = kitOf(g);
  if (!kit || running(kit)) return;
  if (!isTarget(systemId)) return;
  kit.target = systemId;
}

/**
 * Hacking wiki, "Overview": launching costs one drone part, then the pulse runs.
 * "Overview" (Hacking pulse) sets the length from power in the system (4, 7, or 10 seconds).
 * The same heading says the drone takes about 2–3 seconds to arrive; this launch does not wait.
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
  const seconds = pulseSeconds(powered);
  if (seconds <= 0) return false;
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
