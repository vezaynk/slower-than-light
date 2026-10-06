import { log, sparePower, syncShields, zoltanBars } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import type { Game, Kit, Ship } from "../types.ts";

/** Wiki page "Backup Battery", section "System Upgrades": level 1 cost 35. Also the store price to fit it. */
const INSTALL_COST = 35;
/** Wiki page "Backup Battery", section "System Upgrades": level 2 cost 50. Paid to go from 1 to 2. */
const UPGRADE_COST = 50;
/** Wiki page "Backup Battery", section "Overview": extra bars last 30 seconds. */
const ACTIVE = 30;
/** Wiki page "Backup Battery", section "Overview": 20 seconds before it can be started again. */
const COOL = 20;
/** Wiki page "Backup Battery", section "Overview": the charger augment cuts cooldown to 10 seconds. Code id stays "tap". */
const COOL_TAP = 10;

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

function stepKit(g: Game, kit: Kit | undefined, dt: number) {
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
    kit.cool = coolFor(g);
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
  stepKit(g, g.player.kits.cell, dt);
  shedDrained(g, g.player);
  if (!g.enemy) return;
  stepKit(g, g.enemy.kits?.cell, dt);
  maybeEnemy(g);
}
