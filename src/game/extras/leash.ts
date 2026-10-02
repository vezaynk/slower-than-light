import { createGame, log, sparePower, startCombat } from "../sim.ts";
import type { Crew, Game, Kit } from "../types.ts";

// Combat setup stays on the sim. This module does not construct a game.
void createGame;
void startCombat;

/**
 * Mind Control wiki, "System Upgrades": level 1 cost is 75.
 * Null only if that price is absent.
 */
export const INSTALL_COST: number | null = 75;

/** Mind Control wiki, "System Upgrades": level 2 costs 30, level 3 costs 60. */
export const UPGRADE_COST: Readonly<Record<number, number>> = { 2: 30, 3: 60 };

/**
 * Mind Control wiki, "Overview": 14 seconds at Lv1, 20 at Lv2, 28 at Lv3.
 * "System Upgrades" lists the same durations.
 */
export const DURATION_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 14,
  2: 20,
  3: 28,
};

/**
 * Mind Control wiki, "System Upgrades": level 2 is +25% combat damage (1.25), level 3 is +100% (2).
 * INFERRED: level 1 is 1. The level 1 row lists no damage boost.
 */
const DAMAGE_MULT_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 1,
  2: 1.25,
  3: 2,
};

/**
 * Mind Control wiki, "Overview": if every level is ionized, the maximum cooldown is 25 seconds.
 * A normal end does not use this value. The page states no ordinary cooldown.
 */
export const ION_MAX_COOLDOWN = 25;

/** Mind Control wiki, "System Upgrades": stores the combat-damage multiplier for the crew the effect is holding. */
const damageOf = new WeakMap<Crew, number>();

function blank(): Kit {
  return {
    id: "leash",
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

function levelOf(level: number): 1 | 2 | 3 {
  if (level >= 3) return 3;
  if (level === 2) return 2;
  return 1;
}

function durationOf(level: number): number {
  return DURATION_BY_LEVEL[levelOf(level)];
}

function clearCrew(c: Crew) {
  damageOf.delete(c);
  c.leashed = 0;
  delete c.leashed;
}

/** Mind Control wiki, "System Upgrades": spends the level 1 cost of 75. */
export function installLeash(g: Game) {
  if (INSTALL_COST == null) {
    log(g, "No price on the sheet.");
    return;
  }
  if (g.player.kits.leash) {
    log(g, "The Lark already carries Mind Control.");
    return;
  }
  if (g.scrap < INSTALL_COST) {
    log(g, "Not enough scrap for Mind Control.");
    return;
  }
  g.scrap -= INSTALL_COST;
  g.player.kits.leash = blank();
  log(g, "Mind Control fitted to the Lark.");
}

/** Mind Control wiki, "System Upgrades": pays 30 to reach level 2, then 60 to reach level 3. */
export function upgradeLeash(g: Game) {
  const kit = g.player.kits.leash;
  if (!kit || kit.level >= 3) return;
  const next = kit.level + 1;
  const cost = UPGRADE_COST[next];
  if (cost == null) return;
  if (g.scrap < cost) {
    log(g, "Not enough scrap to raise Mind Control.");
    return;
  }
  g.scrap -= cost;
  kit.level = next;
  log(g, "Mind Control raised.");
}

/**
 * Mind Control wiki, "Overview": duration depends on system power level, and removing power can change it.
 * INFERRED: one reactor bar is the whole on switch. The page never states a bar count.
 */
export function toggleLeashPower(g: Game) {
  const kit = g.player.kits.leash;
  if (!kit) return;
  if (kit.power >= 1) {
    kit.power = 0;
    return;
  }
  if (sparePower(g.player) < 1) {
    log(g, "No spare power on the Lark.");
    return;
  }
  kit.power = 1;
}

/**
 * Mind Control wiki, "Overview": one enemy crewmember becomes an ally.
 * They are moved once into a room that still holds an unleashed enemy.
 * The page never states a room or a step count. Path search is not exported.
 */
export function retarget(g: Game) {
  if (!g.enemy) return;
  for (const c of g.crew) {
    if (c.aboard !== "enemy" || c.side !== "enemy" || c.hp <= 0) continue;
    if (!c.leashed || c.leashed <= 0) continue;
    const ally = g.crew.find(
      (o) =>
        o.id !== c.id &&
        o.aboard === "enemy" &&
        o.side === "enemy" &&
        o.hp > 0 &&
        !(o.leashed && o.leashed > 0),
    );
    if (!ally || ally.room === c.room) continue;
    c.room = ally.room;
    c.path = [];
    c.move = 0;
  }
}

/**
 * Mind Control wiki, "System Upgrades": control one enemy crew for that row's duration and damage boost.
 * "Overview" states the same durations (14, 20, 28 seconds).
 * The level 1 effect also says mind control can be removed from your own crew; this start only leashes an enemy.
 * Health on that table (+15 at level 2, +30 at level 3) is not written onto hp.
 */
export function startLeash(g: Game, crewId: string) {
  const kit = g.player.kits.leash;
  if (!kit) return;
  if (kit.power < 1) {
    log(g, "Mind Control has no power.");
    return;
  }
  if (kit.cool > 0 || (kit.on && kit.left > 0)) {
    log(g, "Mind Control is not ready.");
    return;
  }
  const crew = g.crew.find((c) => c.id === crewId);
  if (!crew || crew.side !== "enemy" || crew.hp <= 0) return;
  for (const other of g.crew) {
    if (other.leashed) clearCrew(other);
  }
  const duration = durationOf(kit.level);
  crew.leashed = duration;
  damageOf.set(crew, DAMAGE_MULT_BY_LEVEL[levelOf(kit.level)]);
  kit.left = duration;
  kit.on = true;
  kit.target = crew.id;
  retarget(g);
  log(g, `${crew.name} is leashed.`);
}

/**
 * Mind Control wiki, "Overview": the effect lasts the power-level duration, then ends.
 * INFERRED: cool is set to 0 when it ends. The page never states an ordinary cooldown.
 * It only states a 25 second maximum if fully ionized, and an instant reset after an FTL jump.
 */
export function tickLeash(g: Game, dt: number) {
  if (dt <= 0) return;
  for (const c of g.crew) {
    if (!c.leashed || c.leashed <= 0) continue;
    c.leashed -= dt;
    if (c.leashed <= 0) clearCrew(c);
  }
  const kit = g.player.kits.leash;
  if (!kit) return;
  if (kit.left > 0) {
    kit.left = Math.max(0, kit.left - dt);
    if (kit.left <= 0) {
      kit.on = false;
      kit.cool = 0;
      for (const c of g.crew) {
        if (c.leashed && c.leashed > 0) clearCrew(c);
      }
    }
    return;
  }
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
}

/**
 * Mind Control wiki, "System Upgrades": level 2 is +25% combat damage, level 3 is +100%, stored when the effect starts.
 * INFERRED: with no leash, or no stored multiplier, the return is 1. Level 1 lists no boost.
 * Health on the same table (+15 at level 2, +30 at level 3) is not written onto hp.
 */
export function leashedDamageBonus(c: Crew): number {
  if (!c.leashed || c.leashed <= 0) return 1;
  return damageOf.get(c) ?? 1;
}
