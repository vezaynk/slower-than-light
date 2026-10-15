import { tx } from "../../i18n/index.ts";
import { interiorLinks, mayStand } from "../crew-spots.ts";
import { cooldownLocksPower, createGame, deselectCrew, kitBars, kitIonLocked, kitPowerDown, kitPowerUp, leaveDeprivedAir, log, noteZoltanKits, rand, sparePower, startCombat } from "../sim.ts";
import { noteAchieve } from "../wiki/achieve-notes.ts";
import { seatKits } from "../layouts.ts";
import type { Crew, Game, Kit, Ship } from "../types.ts";
import { bypassZoltan } from "../wiki/cited-bypass.ts";
import "../pack/base.ts";
import { crewDef } from "@stl/pack";
import { shipSight } from "./slug-sight.ts";

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
 * Systems, "Systems cooldown": a normal end uses the usual 20 seconds, not this maximum.
 */
export const ION_MAX_COOLDOWN = 25;

/**
 * Systems, "Systems cooldown": once the effect has worn off, the system self-ionizes.
 * "This usually last 20 seconds." A 25 second ion cooldown already on the kit is left in place.
 */
const EFFECT_COOLDOWN = 20;

function woreOff(kit: Kit) {
  if (kit.cool < EFFECT_COOLDOWN) kit.cool = EFFECT_COOLDOWN;
}

/**
 * Mind Control, Overview: "If all system levels of Mind Control get ionized, the system enters the maximum cooldown - 25 seconds."
 * The ion timers are already on the kit, one per point, capped at 5.
 * Every level is covered when that count is at least the bought level and the level is above 0.
 * INFERRED: a later ion hit that still covers every level sets that cooldown to 25 again.
 * An active hold is left running. Power is not cleared and the system is not shut down.
 */
export function ionOnLeash(kit: Kit): void {
  if (kit.level <= 0) return;
  if ((kit.ion?.length ?? 0) < kit.level) return;
  kit.cool = ION_MAX_COOLDOWN;
}

/**
 * Mind Control wiki, "System Upgrades": level 2 is "+15 Health", level 3 is "+30 Health". Level 1 lists none.
 * "Upgrades increase the mind-control duration, health and combat damage of the affected crew."
 * Template:Crew races (comparison): "Maximum health: standard value. Can be temporarily increased by Mind Control
 * level 2+." So the bonus is added to maxHp (and hp) while the hold lasts.
 */
export const HEALTH_BONUS_BY_LEVEL: Readonly<Record<number, number>> = {
  1: 0,
  2: 15,
  3: 30,
};

/**
 * The level a hold's boost was granted at, read back from the stored health bonus (Crew.leashBoost).
 * The boost lives on the crew record, so the damage multiplier survives a JSON save/load. No boost is level 1.
 */
function boostLevel(c: Crew): 1 | 2 | 3 {
  const b = c.leashBoost ?? 0;
  if (b >= HEALTH_BONUS_BY_LEVEL[3]) return 3;
  if (b >= HEALTH_BONUS_BY_LEVEL[2]) return 2;
  return 1;
}

/** Applies the level's health boost to a crew member a hold just started on. */
function grantBoost(c: Crew, level: 1 | 2 | 3) {
  dropBoost(c);
  const add = HEALTH_BONUS_BY_LEVEL[level];
  if (add <= 0) return;
  c.maxHp += add;
  c.hp += add;
  c.leashBoost = add;
}

/**
 * Mind Control wiki, "Overview": "Combat damage bonus and health boost are removed if the system level is decreased."
 * Also used when the hold ends. INFERRED (the wiki does not say what happens to hp): maxHp loses the bonus and hp is
 * only clamped to it, so damage taken while boosted comes out of the bonus first.
 */
function dropBoost(c: Crew) {
  const b = c.leashBoost ?? 0;
  delete c.leashBoost;
  if (b <= 0) return;
  c.maxHp -= b;
  c.hp = Math.min(c.hp, c.maxHp);
}

/** Strips the boost when the holding kit's level falls below the level it was granted at. */
function stripIfDropped(c: Crew, level: number) {
  if ((c.leashBoost ?? 0) > 0 && level < boostLevel(c)) dropBoost(c);
}

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

/**
 * Backup Battery, Overview: losing the bar can end an active hold early.
 * Systems, "Systems cooldown": that end is the effect wearing off, so the usual 20 second cooldown starts.
 * A 25 second ion cooldown already on the kit is left in place.
 * A hold that is already over is left alone.
 */
export function interruptLeash(g: Game, kit: Kit) {
  if (!(kit.on && kit.left > 0)) return;
  if (kitBars(kit) >= 1) return;
  kit.left = 0;
  kit.on = false;
  woreOff(kit);
  const player = kit === g.player.kits.leash;
  for (const c of g.crew) {
    if (!c.leashed || c.leashed <= 0) continue;
    if (player && c.side === "enemy") clearCrew(c);
    if (!player && c.side === "player") clearCrew(c);
  }
}

function clearCrew(c: Crew) {
  dropBoost(c);
  // INFERRED: the intruder room picked while held (sim.ts wanderIntruders) is dropped with the hold.
  delete c.intrude;
  c.leashed = 0;
  delete c.leashed;
}

function isLeashed(c: Crew): boolean {
  return (c.leashed ?? 0) > 0;
}

/**
 * Mind Control wiki, "Overview": "Turns one enemy crewmember into ally (whether on your ship or an enemy ship)."
 * The side a crew member fights for right now. A leashed crew member fights for the side that is not its own.
 * The player only leashes enemy crew and the enemy only leashes player crew, so this is symmetric.
 */
export function sideOf(c: Crew): "player" | "enemy" {
  if (!isLeashed(c)) return c.side;
  return c.side === "player" ? "enemy" : "player";
}

/** True while the enemy's Mind Control holds this player crew member. The player cannot order them. */
export function heldByEnemy(c: Crew): boolean {
  return c.side === "player" && isLeashed(c);
}

/** Mind Control wiki, "System Upgrades": spends the level 1 cost of 75. */
export function installLeash(g: Game) {
  if (INSTALL_COST == null) {
    log(g, tx("extras.leash.no-price-on-the-sheet"));
    return;
  }
  if (g.player.kits.leash) {
    log(g, tx("extras.leash.the-lark-already-carries-mind-control"));
    return;
  }
  if (g.scrap < INSTALL_COST) {
    log(g, tx("extras.leash.not-enough-scrap-for-mind-control"));
    return;
  }
  g.scrap -= INSTALL_COST;
  noteAchieve(g, { k: "upgrade" });
  g.player.kits.leash = blank();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, tx("extras.leash.mind-control-fitted-to-the-lark"));
}

/** Mind Control wiki, "System Upgrades": pays 30 to reach level 2, then 60 to reach level 3. */
export function upgradeLeash(g: Game) {
  const kit = g.player.kits.leash;
  if (!kit || kit.level >= 3) return;
  const next = kit.level + 1;
  const cost = UPGRADE_COST[next];
  if (cost == null) return;
  if (g.scrap < cost) {
    log(g, tx("extras.leash.not-enough-scrap-to-raise-mind"));
    return;
  }
  g.scrap -= cost;
  noteAchieve(g, { k: "upgrade" });
  kit.level = next;
  log(g, tx("extras.leash.mind-control-raised"));
}

/**
 * Add a bar (sim kitPowerUp); at the top, remove one, as toggleSlingPower does. The logs say why a first bar fails.
 * Mind Control wiki, "Overview": duration depends on system power level, and removing power can change it.
 */
export function toggleLeashPower(g: Game) {
  const kit = g.player.kits.leash;
  if (!kit || cooldownLocksPower(kit)) return;
  if (kitPowerUp(g, "leash")) return;
  if (kit.power >= 1) {
    kitPowerDown(g, "leash");
    return;
  }
  if (sparePower(g.player) < 1) {
    log(g, tx("extras.leash.no-spare-power-on-the-lark"));
    return;
  }
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
  if (kit.level - (kit.damage ?? 0) < 1) {
    log(g, tx("extras.leash.mind-control-is-too-damaged-to"));
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
    delete c.via;
  }
}

/**
 * Mind Control wiki, "System Upgrades": control one enemy crew for that row's duration and damage boost.
 * "Overview" states the same durations (14, 20, 28 seconds).
 * The level 1 effect also says mind control can be removed from your own crew; this start only leashes an enemy.
 * Health on that table (+15 at level 2, +30 at level 3) is added to maxHp and hp (grantBoost) for the hold.
 */
export function startLeash(g: Game, crewId: string) {
  const kit = g.player.kits.leash;
  if (!kit) return;
  noteZoltanKits(g);
  // Zoltans: Mind Control cannot be activated if it is ionized. A Zoltan bar does not clear that lock.
  if (kitIonLocked(kit)) return;
  if (kitBars(kit) < 1) {
    log(g, tx("extras.leash.mind-control-has-no-power"));
    return;
  }
  if (kit.cool > 0 || (kit.on && kit.left > 0)) {
    log(g, tx("extras.leash.mind-control-is-not-ready"));
    return;
  }
  const crew = g.crew.find((c) => c.id === crewId);
  // Mind Control wiki, "Overview": "Your crewmembers can be freed from enemy mind control (but enemies cannot
  // cancel your mind control): level 1 is enough to cancel even a level 3 mind control."
  // "System Upgrades", level 1: "remove Mind control from your crewmember".
  // INFERRED: freeing is a full use. The kit runs for its level duration, as after a normal start.
  if (crew && heldByEnemy(crew) && crew.hp > 0) {
    clearCrew(crew);
    endEnemyLeash(g);
    kit.left = durationOf(playerLevel(kit));
    kit.on = true;
    kit.target = null;
    log(g, tx("extras.leash.is-freed-from-their-mind-control", { name: crew.name }));
    return;
  }
  if (!crew || crew.side !== "enemy" || crew.hp <= 0) return;
  // Mind Control wiki, "Overview": "Slugs cannot be mind controlled." Rejected before the kit is spent.
  if (!controllable(crew)) {
    log(g, tx("extras.leash.is-a-slug-mind-control-does", { name: crew.name }));
    return;
  }
  // Mind Control, Overview: "Mind control requires view of enemy crew (Slug telepathy and Lifeform Scanners count)."
  // shipSight is that view: a living Slug, a Lifeform Scanner on the same life-sign flag, Sensors at the level that
  // shows enemy crew (manning raises it), and a hacked room.
  // "teleporting a bomb that doesn't miss a targeted room" is bombRoomOpen.
  // Enemies do not use this function. "Enemies do not require vision to use Mind Control" stays on fireEnemyLeash.
  if (!enemyCrewInView(g, crew)) {
    log(g, tx("extras.leash.mind-control-has-no-view-of"));
    return;
  }
  // Zoltan Shield: mind control does not pass the bubble. Bypass lets it through and does not spend the bubble.
  // Crew who already boarded the player are on this side of the bubble.
  if (
    crew.aboard === "enemy" &&
    (g.enemy?.zoltan ?? 0) > 0 &&
    !(g.augments.includes("bypass") && bypassZoltan("mind") === "pass")
  ) {
    log(g, tx("extras.leash.their-zoltan-shield-blocks-mind-control"));
    return;
  }
  for (const other of g.crew) {
    // Only the player's own earlier hold ends here. Crew the enemy holds stay held (freeing is the branch above).
    if (other.leashed && other.side === "enemy") clearCrew(other);
  }
  const duration = durationOf(playerLevel(kit));
  crew.leashed = duration;
  grantBoost(crew, levelOf(playerLevel(kit)));
  kit.left = duration;
  kit.on = true;
  kit.target = crew.id;
  retarget(g);
  log(g, tx("extras.leash.is-leashed", { name: crew.name }));
}

/**
 * The player kit's working level, for "Combat damage bonus and health boost are removed if the system level is
 * decreased" (Mind Control wiki, "Overview"). `base` is the powered bars (playerLevel), so removing a bar lowers the
 * level and damage (`kit.damage`, sim hurtKit) knocks levels off the bought level. Upgrades never lower `kit.level`.
 */
function mindLevel(kit: Kit, base: number): number {
  const bought = Math.max(0, kit.level - (kit.damage ?? 0));
  const z = Math.min(Math.max(0, kit.zoltan ?? 0), bought);
  const ion = kit.ion?.length ?? 0;
  if (ion <= 0 || base <= 0) return base;
  // Zoltans: "Mind Control system with a Zoltan will not shutdown if it gets ionized by external factors."
  // "system power levels not filled with zoltan power can get ionize, thus, reducing the maximum MC effect and duration".
  // Systems: one ion point removes one power. INFERRED: that point takes one level the Zoltan does not fill.
  const locked = Math.min(ion, Math.max(0, bought - z));
  return Math.max(z > 0 ? Math.min(z, base) : 0, base - locked);
}

/**
 * Mind Control, Overview: view of that enemy crew. Slug telepathy and a Lifeform Scanner are shipSight's life-sign flag.
 * INFERRED: enemy crew already aboard your ship are in view. The page does not print that case.
 */
/**
 * Rooms a player bomb opened. Mind Control, Overview: "teleporting a bomb that doesn't miss a targeted room".
 * INFERRED: the room stays open until the next fight. The page prints no duration.
 */
const bombRooms = new WeakMap<Game, Set<string>>();

export function noteBombSight(g: Game, aboard: "player" | "enemy", roomId: string): void {
  const key = `${aboard}:${roomId}`;
  const open = bombRooms.get(g);
  if (open) open.add(key);
  else bombRooms.set(g, new Set([key]));
}

export function clearBombSight(g: Game): void {
  bombRooms.delete(g);
}

function bombRoomOpen(g: Game, aboard: "player" | "enemy", roomId: string): boolean {
  return bombRooms.get(g)?.has(`${aboard}:${roomId}`) ?? false;
}

function enemyCrewInView(g: Game, crew: Crew): boolean {
  if (shipSight(g).showCrew(crew)) return true;
  if (crew.aboard === "player") return true;
  return bombRoomOpen(g, crew.aboard, crew.room);
}

function playerLevel(kit: Kit): number {
  // Mind Control, Overview: "Mind control duration depends on the system power level" and "can be manipulated by
  // decreasing or removing power from the system with Zoltans". Systems: one bar per powered level (sim kitPowerUp),
  // Zoltan bars included (kitBars). INTENTIONALLY OVERRIDING the earlier one-bar on/off inference.
  return mindLevel(kit, kitBars(kit));
}

/** INFERRED: the printed duration row for the level that remains is the new maximum. */
function capDuration(kit: Kit, level: number) {
  const cap = durationOf(level);
  if (kit.left > cap) kit.left = cap;
}

/**
 * Mind Control wiki, "Overview": the effect lasts the power-level duration, then ends.
 * Systems, "Systems cooldown": a normal end, or a power loss that ends the hold, starts the usual 20 seconds.
 * A 25 second ion cooldown already on the kit is not replaced.
 * An FTL jump resets cooldown (leashOnLeave).
 */
export function tickLeash(g: Game, dt: number) {
  if (dt <= 0) return;
  for (const c of g.crew) {
    if (!c.leashed || c.leashed <= 0) continue;
    c.leashed -= dt;
    if (c.leashed <= 0) clearCrew(c);
  }
  tickEnemyLeash(g, dt);
  const kit = g.player.kits.leash;
  if (!kit) return;
  if (kit.left > 0) {
    const level = playerLevel(kit);
    if (level <= 0) {
      kit.left = 0;
      kit.on = false;
      woreOff(kit);
      for (const c of g.crew) {
        if (c.leashed && c.leashed > 0 && c.side === "enemy") clearCrew(c);
      }
      return;
    }
    capDuration(kit, level);
    kit.left = Math.max(0, kit.left - dt);
    if (kit.left <= 0) {
      kit.on = false;
      woreOff(kit);
      for (const c of g.crew) {
        // The player's hold is on enemy crew only. Player crew held by the enemy run on the enemy's kit.
        if (c.leashed && c.leashed > 0 && c.side === "enemy") clearCrew(c);
      }
    } else {
      const held = g.crew.find((c) => c.id === kit.target);
      if (held && held.side === "enemy") {
        stripIfDropped(held, level);
        // Oxygen, Overview: mind-controlled crew leave a room at 5% O2 or less for one at 10% or more.
        leaveDeprivedAir(g, held);
      }
    }
    return;
  }
  if (kit.cool > 0) kit.cool = Math.max(0, kit.cool - dt);
}

// ---------------------------------------------------------------------------------------------
// Enemy Mind Control: the enemy's kit (enemy-gen.ts, room `e-mindcontrol`) controls player crew.
// ---------------------------------------------------------------------------------------------

/**
 * Mind Control wiki, "Overview": "Slugs cannot be mind controlled."
 * Slugs wiki page, "Race characteristics": mind-control immunity (kin id "gel", extras/kin.ts).
 */
function controllable(c: Crew): boolean {
  return !crewDef(c.kin).resistsMindControl;
}

/**
 * Mind Control wiki, "Overview": "Mind control is blocked by Zoltan Shields, unless you have Zoltan Shield Bypass".
 * Zoltan Shield (Augmentations, "Zoltan Shield"): "Until they are destroyed, Zoltan Shields prevent boarding,
 * hacking, and mind control." Bypass is "available only for player ships", so the enemy never passes the bubble.
 * Mirrors startLeash: crew aboard the player ship sit behind the player's bubble. Boarders on the enemy hull do not.
 */
function behindPlayerBubble(g: Game, c: Crew): boolean {
  return c.aboard === "player" && (g.player.zoltan ?? 0) > 0;
}

function enemyKit(g: Game): Kit | undefined {
  return g.enemy?.kits.leash;
}

/**
 * Ends the enemy's current hold without starting a cooldown.
 * A natural end and a power-loss end start the usual 20 seconds in tickEnemyLeash.
 * A player cancel (startLeash) and a fight ending (clearEnemyLeash) leave cool alone.
 * A 25 second ion cooldown already on the kit is not cleared here.
 * Crew are freed by the caller.
 */
function endEnemyLeash(g: Game) {
  const kit = enemyKit(g);
  if (!kit || !kit.on) return;
  kit.on = false;
  kit.left = 0;
  kit.target = null;
}

/**
 * Frees every player crew member from enemy mind control and ends the enemy's hold.
 * Hacking wiki (Mind Control row): "temporarily turns one random enemy into an ally, and removes enemy mind control
 * from allies." The Hacking work calls this. Also used when a fight ends, so a hold never leaks into the next one.
 * Returns how many crew were freed.
 */
export function clearEnemyLeash(g: Game): number {
  let freed = 0;
  for (const c of g.crew) {
    if (!heldByEnemy(c)) continue;
    clearCrew(c);
    freed += 1;
  }
  endEnemyLeash(g);
  return freed;
}

/**
 * @agent:hacking. Every mind-control hold ends when the two ships part (the player jumps away, or the enemy escapes).
 * Called by sim.ts before `g.enemy` is dropped, so the enemy kit's state is still reachable.
 * INFERRED: holds end on leaving. Mind Control wiki, "Overview" never says what happens to a hold across a jump; it
 * only says "Mind Control's cooldown is immediately reset by an FTL jump" (so the player kit's cooldown is cleared).
 * Without this a player crew member held by the enemy (or by the enemy's Mind Control hack, spike.ts hackHeld) stayed
 * "leashed" on the map, where tickLeash never runs, and could not be ordered until the next fight.
 */
export function leashOnLeave(g: Game) {
  clearEnemyLeash(g);
  const hack = g.enemy?.kits.spike;
  if (hack) hack.hackHeld = undefined;
  for (const c of g.crew) if (isLeashed(c)) clearCrew(c);
  const kit = g.player.kits.leash;
  if (kit) {
    kit.on = false;
    kit.left = 0;
    kit.target = null;
    kit.cool = 0;
  }
}

/**
 * Mind Control wiki, "Overview": "Enemies do not require vision to use Mind Control, and can use it even when you
 * are cloaked." INFERRED (user decision, not on the wiki): the enemy picks a random living player crew member,
 * anywhere. Slugs and crew behind the player's Zoltan Shield are skipped. Returns null when nobody can be taken.
 */
function pickEnemyTarget(g: Game): Crew | null {
  const pool = g.crew.filter(
    (c) => c.side === "player" && c.hp > 0 && !isLeashed(c) && controllable(c) && !behindPlayerBubble(g, c),
  );
  if (!pool.length) return null;
  return pool[Math.floor(rand(g) * pool.length)] ?? null;
}

/**
 * Mind Control wiki, "Overview": the hold lasts 14 / 20 / 28 seconds by "system power level", and
 * "System Upgrades" gives +25% / +100% combat damage at levels 2 / 3. The enemy's level is its working bars.
 * INFERRED timing (not on the wiki): the enemy fires as soon as it is powered and off cooldown. Basis: Cloaking
 * page, "The enemy always immediately cloaks as soon as their cloaking is not on cooldown".
 */
export function fireEnemyLeash(g: Game): boolean {
  const kit = enemyKit(g);
  if (!kit || g.phase !== "combat") return false;
  // Zoltans: an ionized Mind Control system cannot be activated.
  if (kitIonLocked(kit)) return false;
  const bars = kitBars(kit);
  if (bars < 1 || kit.cool > 0 || kit.on) return false;
  const crew = pickEnemyTarget(g);
  if (!crew) return false;
  const level = levelOf(bars);
  const duration = durationOf(level);
  crew.leashed = duration;
  grantBoost(crew, level);
  kit.on = true;
  kit.left = duration;
  kit.target = crew.id;
  crew.path = [];
  crew.move = 0;
  deselectCrew(g, crew.id);
  log(g, tx("extras.leash.is-under-their-mind-control", { name: crew.name }));
  return true;
}

/** Plain BFS over a hull's inner doors. Path search in sim.ts is not exported. */
function pathTo(ship: Ship, from: string, goal: (room: string) => boolean): string[] | null {
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const at = queue.shift()!;
    if (goal(at)) {
      const path: string[] = [];
      for (let r: string | null = at; r && r !== from; r = prev.get(r) ?? null) path.unshift(r);
      return path;
    }
    for (const d of ship.doors) {
      if (d.b === "void") continue;
      const next = d.a === at ? d.b : d.b === at ? d.a : null;
      if (!next || prev.has(next)) continue;
      prev.set(next, at);
      queue.push(next);
    }
  }
  return null;
}

/**
 * Mind Control wiki, "Overview": "Like with drones, you can't give them orders, rather they are under the AI
 * control." INFERRED: the enemy's AI walks a held player crew member to the nearest room holding a crew member of
 * its own (now hostile) side on the same hull. Walking uses sim moveCrew; held crew pass doors freely (sim.ts).
 * Per the user ("Mind controlled enemies should behave the same as boarding enemies"), and Mind Control, "Overview":
 * "They will be treated as an intruder by the enemy crew". A held crew member aboard its own (player) ship is an
 * intruder there, so sim.ts wanderIntruders runs it with the boarders' room choice and this hunt is skipped. The hunt
 * is left only for a player boarder held aboard the enemy ship, where it defends rather than intrudes.
 */
function huntFor(g: Game, c: Crew) {
  if (c.aboard === c.side) return;
  // Oxygen, Overview: mind-controlled crew leave O2-deprived rooms before they hunt.
  if (leaveDeprivedAir(g, c)) return;
  if (c.path.length > 0 || c.hp <= 0) return;
  const ship = c.aboard === "player" ? g.player : g.enemy;
  if (!ship) return;
  const prey = (room: string) =>
    g.crew.some((o) => o.id !== c.id && o.aboard === c.aboard && o.room === room && o.hp > 0 && sideOf(o) !== sideOf(c));
  if (prey(c.room)) return;
  const path = pathTo(ship, c.room, prey);
  if (!path || !path.length) return;
  const dest = path[path.length - 1]!;
  const room = ship.rooms.find((r) => r.id === dest);
  const hull = c.aboard === "player" ? "player" : "enemy";
  if (!room || !mayStand(room, g.crew, c.id, dest, c.aboard, hull, interiorLinks(ship.doors, dest))) return;
  c.path = path;
  c.move = 0;
  delete c.via;
}

/**
 * Enemy half of tickLeash. The per-crew timers are counted down in tickLeash. Here the enemy kit's own clock runs.
 * Mind Control wiki, "Overview": "Mind control duration can be manipulated by decreasing or removing power from the
 * system". INFERRED: the hold ends early once the enemy kit has no working bars (hits on `e-mindcontrol`).
 */
function tickEnemyLeash(g: Game, dt: number) {
  const kit = enemyKit(g);
  if (!kit) return;
  if (kit.on) {
    const held = g.crew.find((c) => c.id === kit.target);
    const level = mindLevel(kit, kitBars(kit));
    if (level <= 0 || kit.left <= 0 || !held || !heldByEnemy(held) || held.hp <= 0) {
      clearEnemyLeash(g);
      // Systems, "Systems cooldown": the effect wore off. A player cancel does not come through here.
      woreOff(kit);
      if (held && held.hp > 0) log(g, tx("extras.leash.shakes-off-their-mind-control", { name: held.name }));
      return;
    }
    capDuration(kit, level);
    kit.left = Math.max(0, kit.left - dt);
    if (kit.left <= 0) {
      clearEnemyLeash(g);
      woreOff(kit);
      if (held.hp > 0) log(g, tx("extras.leash.shakes-off-their-mind-control", { name: held.name }));
      return;
    }
    // "Combat damage bonus and health boost are removed if the system level is decreased": working bars are its level.
    stripIfDropped(held, level);
    huntFor(g, held);
    return;
  }
  if (kit.cool > 0) {
    kit.cool = Math.max(0, kit.cool - dt);
    return;
  }
  fireEnemyLeash(g);
}

/**
 * Mind Control wiki, "System Upgrades": level 2 is +25% combat damage, level 3 is +100%, stored when the effect starts.
 * INFERRED: with no leash, or no stored boost, the return is 1. Level 1 lists no boost.
 * The level is read from the stored health bonus (Crew.leashBoost), so the multiplier survives save/load and is
 * removed together with the health boost when the system level drops ("Overview").
 */
export function leashedDamageBonus(c: Crew): number {
  if (!c.leashed || c.leashed <= 0) return 1;
  return DAMAGE_MULT_BY_LEVEL[boostLevel(c)] ?? 1;
}
