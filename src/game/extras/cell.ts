import { log, sparePower, syncShields, zoltanBars } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { interruptLeash } from "./leash.ts";
import { shipInDanger } from "./sling.ts";
import { interruptVeil } from "./veil.ts";
import type { Game, Kit, Ship } from "../types.ts";

/** Wiki page "Backup Battery", section "System Upgrades": level 1 cost 35. Also the store price to fit it. */
const INSTALL_COST = 35;
/** Wiki page "Backup Battery", section "System Upgrades": level 2 cost 50. Paid to go from 1 to 2. */
const UPGRADE_COST = 50;

export function cellUpgradeCost(level: number): number | null {
  return level === 1 ? UPGRADE_COST : null;
}
/** Wiki page "Backup Battery", section "Overview": extra bars last 30 seconds. */
const ACTIVE = 30;
/** Wiki page "Backup Battery", section "Overview": 20 seconds before it can be started again. */
const COOL = 20;
/** Wiki page "Backup Battery", section "Overview": the charger augment cuts cooldown to 10 seconds. Code id stays "tap". */
const COOL_TAP = 10;
/**
 * Backup Battery, Overview: full ionization enters the maximum 25 second cooldown.
 * The page's note on whether Battery Charger shortens that 25 is an HTML to-do, so the charger does not.
 */
const ION_MAX_COOL = 25;

function makeCell(level: number): Kit {
  return {
    id: "cell",
    level,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/** Wiki page "Backup Battery", sections "Overview" and "System Upgrades": 2 bars at level 1, 4 bars at level 2. */
function barsFor(level: number): number {
  if (level >= 2) return 4;
  if (level === 1) return 2;
  return 0;
}

function coolFor(g: Game): number {
  return g.augments?.includes("tap") ? COOL_TAP : COOL;
}

function running(kit: Kit): boolean {
  return kit.on && kit.left > 0;
}

function arm(kit: Kit) {
  kit.power = 0;
  kit.on = true;
  kit.left = ACTIVE;
  kit.aux = barsFor(kit.level);
}

/** Wiki page "Backup Battery", sections "Overview" and "System Upgrades": 2 bars at level 1, 4 at level 2 while the cell is on. */
export function cellBonus(ship: Ship): number {
  const kit = ship.kits.cell;
  // @agent:hacking. Hacking wiki, "Overview" (Backup Battery): "temporarily removes two regular power bars from
  // reactor" (Kit.drained, set by spike.ts while the enemy's pulse is on it). It reaches the reactor through
  // sim.ts sparePower -> batteryBonus, so it can go negative.
  const drained = kit?.drained ?? 0;
  if (!kit?.on || !(kit.left > 0)) return drained > 0 ? -drained : 0;
  // Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars). INFERRED: a damaged level supplies the bars of the level below it.
  return barsFor(kit.level - (kit.damage ?? 0)) - drained;
}

/**
 * Backup Battery, Overview: bonus bars are allocated after the regular reactor bars.
 * INFERRED: the bars shedOverAssigned would pull first are the bonus bars.
 * The page does not name which system shows them.
 */
export function batteryPaint(ship: Ship): {
  systems: Partial<Record<"weapons" | "medbay" | "oxygen" | "engines" | "shields", number>>;
  kits: Partial<Record<string, number>>;
} {
  const systems: Partial<Record<"weapons" | "medbay" | "oxygen" | "engines" | "shields", number>> = {};
  const kits: Partial<Record<string, number>> = {};
  const bonus = Math.max(0, cellBonus(ship));
  const spare = Math.max(0, sparePower(ship));
  let left = Math.min(bonus, Math.max(0, bonus - spare));
  if (left <= 0) return { systems, kits };
  for (const other of Object.values(ship.kits)) {
    if (left <= 0) break;
    if (!other || other.id === "cell" || other.power <= 0) continue;
    const take = Math.min(other.power, left);
    kits[other.id] = take;
    left -= take;
  }
  for (const id of ["weapons", "medbay", "oxygen", "engines", "shields"] as const) {
    if (left <= 0) break;
    const power = ship.systems[id].power;
    if (power <= 0) continue;
    const take = Math.min(power, left);
    systems[id] = take;
    left -= take;
  }
  return { systems, kits };
}

/** Unassigned Backup Battery bars. They still count as bonus power. */
export function batterySpareBars(ship: Ship): number {
  return Math.min(Math.max(0, cellBonus(ship)), Math.max(0, sparePower(ship)));
}

/** How many of this system's powered bars are Backup Battery bars, from the top of the stack. */
export function batteryBarsOn(ship: Ship, id: string): number {
  const paint = batteryPaint(ship);
  if (id === "weapons" || id === "medbay" || id === "oxygen" || id === "engines" || id === "shields") {
    return paint.systems[id] ?? 0;
  }
  return paint.kits[id] ?? 0;
}

/**
 * @agent:hacking. Takes bars back off systems when a hack has shrunk the reactor below what is assigned.
 * Hacking wiki, "Overview" (Backup Battery): "removes two regular power bars from reactor". Backup Battery wiki,
 * "Overview": when bars leave, "This can cause activated systems such as Cloaking or Mind Control to deactivate".
 * INVENTED: the order (subsystem kits first, then weapons, medbay, oxygen, engines, shields). The pages give none.
 * Only runs while a drain is on, so an ordinary battery shutdown keeps its old behaviour.
 */
function shedDrained(g: Game, ship: Ship) {
  const kit = ship.kits.cell;
  if (!kit || !(kit.drained ?? 0)) return;
  let over = -sparePower(ship);
  for (const other of Object.values(ship.kits)) {
    if (over <= 0) return;
    if (!other || other.id === "cell" || other.power <= 0) continue;
    const take = Math.min(other.power, over);
    other.power -= take;
    over -= take;
    if (other.power <= 0 && other.on && (other.id === "veil" || other.id === "leash")) other.on = false;
  }
  for (const id of ["weapons", "medbay", "oxygen", "engines", "shields"] as const) {
    if (over <= 0) break;
    const sys = ship.systems[id];
    if (!sys || sys.power <= 0) continue;
    const take = Math.min(sys.power, over);
    sys.power -= take;
    over -= take;
  }
  syncShields(ship, zoltanBars(g.crew, ship, "player", "shields"));
}

/**
 * Pulls assigned bars until spare power is no longer negative.
 * Backup Battery, Overview: when the extra bars leave, they come off the reactor.
 * An active cloak or mind-control hold that loses its bar ends early.
 * INFERRED: kits lose bars before weapons, medbay, oxygen, engines, and shields.
 * The page names no order.
 * The same section: a bar locked into a system that is already cooling can still come off, and that cooldown stays.
 * Environmental Hazards, Plasma/ion Storm: arrival uses this same pull when the halved reactor is over-assigned.
 */
export function shedOverAssigned(g: Game, ship: Ship, aboard: "player" | "enemy") {
  let over = -sparePower(ship);
  if (over <= 0) return;
  for (const other of Object.values(ship.kits)) {
    if (over <= 0) break;
    if (!other || other.id === "cell" || other.power <= 0) continue;
    const take = Math.min(other.power, over);
    other.power -= take;
    over -= take;
    if (other.id === "veil") interruptVeil(other);
    if (other.id === "leash") interruptLeash(g, other);
  }
  for (const id of ["weapons", "medbay", "oxygen", "engines", "shields"] as const) {
    if (over <= 0) break;
    const sys = ship.systems[id];
    if (!sys || sys.power <= 0) continue;
    const take = Math.min(sys.power, over);
    sys.power -= take;
    over -= take;
  }
  syncShields(ship, zoltanBars(g.crew, ship, aboard, "shields"));
}

/** Wiki page "Backup Battery", section "System Upgrades": fit level 1 for 35. "Overview": no reactor energy is required, so power stays 0. */
export function installCell(g: Game) {
  if (g.player.kits.cell) return;
  if (g.scrap < INSTALL_COST) {
    log(g, "Not enough scrap.");
    return;
  }
  g.scrap -= INSTALL_COST;
  g.player.kits.cell = makeCell(1);
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  log(g, "Backup Battery fitted to the Lark.");
}

/** Wiki page "Backup Battery", section "System Upgrades": 1→2 costs 50 and supplies 4 bars. Power stays 0. */
export function upgradeCell(g: Game) {
  const kit = g.player.kits.cell;
  if (!kit || kit.level !== 1) return;
  if (g.scrap < UPGRADE_COST) {
    log(g, "Not enough scrap.");
    return;
  }
  g.scrap -= UPGRADE_COST;
  kit.level = 2;
  kit.power = 0;
  if (running(kit)) kit.aux = barsFor(2);
  log(g, "Backup Battery level 2.");
}

/**
 * Backup Battery, Overview: "Backup Battery's cooldown is immediately reset by an FTL jump."
 * Waiting is a different path and does not call this.
 */
export function cellOnJump(g: Game) {
  const kit = g.player.kits.cell;
  if (!kit || kit.cool <= 0) return;
  kit.cool = 0;
  log(g, "Backup Battery is ready.");
}

/**
 * Backup Battery, Overview: "If all system levels of the Backup Battery subsystem get ionized
 * (e.g. when a pulsar ionizes it), it will enter its maximum 25 seconds cooldown."
 * One hit whose ion is at least the subsystem level covers every level.
 * The same section: one ion does not disrupt an activated level 2 battery, and two 1-ion sources
 * at the same time do. INFERRED: the same game time is simultaneous. A later time does not add.
 * The maximum gap is an HTML to-do, so it is not a numbered window.
 */
export function ionOnCell(g: Game, kit: Kit, points: number): boolean {
  if (kit.level <= 0 || points <= 0) return false;
  let total = points;
  if (points < kit.level) {
    if (kit.ionAt === g.time) total = (kit.ionN ?? 0) + points;
    kit.ionAt = g.time;
    kit.ionN = total;
  }
  if (total < kit.level) return false;
  const wasRunning = kit.on && kit.left > 0;
  kit.left = 0;
  kit.on = false;
  kit.aux = 0;
  kit.power = 0;
  kit.cool = ION_MAX_COOL;
  delete kit.ionAt;
  delete kit.ionN;
  if (wasRunning) {
    const ship = kit === g.player.kits.cell ? g.player : g.enemy;
    if (ship) shedOverAssigned(g, ship, ship === g.player ? "player" : "enemy");
  }
  log(g, kit === g.player.kits.cell ? "Backup Battery cooling." : "Their Backup Battery cooling.");
  return true;
}

/** Wiki page "Backup Battery", section "Overview": start a 30s window if the Cell is idle and cooled. */
export function startCell(g: Game) {
  const kit = g.player.kits.cell;
  if (!kit) return;
  if (kit.cool > 0 || running(kit)) return;
  // Systems, "Damaged and destroyed systems": every level damaged is "completely unfunctional".
  if ((kit.damage ?? 0) >= kit.level) return;
  arm(kit);
  log(g, "Backup Battery online.");
}

function stepKit(g: Game, kit: Kit | undefined, dt: number, player: boolean) {
  if (!kit || dt <= 0) return;
  kit.power = 0;
  const wasRunning = running(kit);
  if (kit.left > 0) {
    kit.left -= dt;
    if (kit.left < 0) kit.left = 0;
  }
  if (kit.cool > 0) {
    kit.cool -= dt;
    if (kit.cool < 0) kit.cool = 0;
  }
  if (wasRunning && kit.left <= 0) {
    kit.left = 0;
    kit.on = false;
    kit.aux = 0;
    // Backup Battery, Overview: "If you are not IN DANGER and Backup Battery runs out, it becomes
    // instantly available again - it doesn't enter its cooldown".
    // INFERRED: that "you" is the player cell. An enemy cell still cools.
    if (player && !shipInDanger(g)) kit.cool = 0;
    else kit.cool = coolFor(g);
    const ship = player ? g.player : g.enemy;
    if (ship) shedOverAssigned(g, ship, player ? "player" : "enemy");
  }
}

/** True when assigned bars already eat the whole reactor. */
function spareLooksTight(ship: Ship): boolean {
  if (!ship.systems) return false;
  let used = 0;
  for (const id of ["shields", "engines", "oxygen", "medbay", "weapons"] as const) {
    used += ship.systems[id]?.power ?? 0;
  }
  for (const kit of Object.values(ship.kits ?? {})) {
    if (kit) used += kit.power;
  }
  return ship.reactor - used <= 0;
}

function maybeEnemy(g: Game) {
  const foe = g.enemy;
  if (!foe) return;
  const kit = foe.kits?.cell;
  if (!kit || kit.cool > 0 || running(kit)) return;
  if (!spareLooksTight(foe)) return;
  arm(kit);
}

/**
 * Wiki page "Backup Battery", section "Overview": count down 30s, then 20s (10s with the "tap" augment).
 * INVENTED: an enemy Cell starts when assigned bars already fill the reactor. The page does not describe that.
 */
export function tickCell(g: Game, dt: number) {
  stepKit(g, g.player.kits.cell, dt, true);
  shedDrained(g, g.player);
  if (!g.enemy) return;
  stepKit(g, g.enemy.kits?.cell, dt, false);
  maybeEnemy(g);
}
