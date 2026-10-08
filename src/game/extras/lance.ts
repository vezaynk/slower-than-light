import type { Door, Game, Room, Ship } from "../types.ts";
import { seatKits } from "../layouts.ts";
import { kitBars, log, noteWeaponManning, rand, sparePower } from "../sim.ts";
import { hackPulseOn } from "./spike.ts";

/** Shown wherever the kit is named. Artillery Beam, "Overview". */
export const DISPLAY_NAME = "Artillery Beam";

/**
 * Artillery Beam "Overview": pre-installed, not a store item. "System Upgrades" level 1 cost is "-".
 * INFERRED: null, so installLance spends no scrap. The page gives no purchase price.
 */
export const INSTALL_COST: number | null = null;

/** Artillery Beam "System Upgrades" charge time: level 1 = 50 sec, 2 = 40, 3 = 30, 4 = 20. */
export const CHARGE_SECONDS: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
  4: 20,
};

/**
 * Artillery Beam "System Upgrades" cost: level 2 = 30, 3 = 50, 4 = 80 scrap.
 * Level 1 on that table is "-", so it has no row here.
 */
export const UPGRADE_COSTS: Record<number, number> = {
  2: 30,
  3: 50,
  4: 80,
};

/**
 * Template:Beam weapons, Artillery Beam row: power {{tooltip|1-4*|Artillery system with a maximum of 4 system levels}}.
 * Systems, "Damaged and destroyed systems": a hit lowers the system's maximum power until repaired (sim.ts kitBars).
 */
function powerCap(kit: { level: number; damage?: number }): number {
  const level = Math.max(0, Math.min(4, kit.level));
  return Math.max(0, level - (kit.damage ?? 0));
}

function chargeSeconds(level: number): number {
  const lv = Math.min(4, Math.max(1, Math.floor(level)));
  return CHARGE_SECONDS[lv] ?? CHARGE_SECONDS[1];
}

function blankKit() {
  return {
    id: "lance" as const,
    level: 1,
    power: 0,
    left: 0,
    cool: 0,
    target: null,
    on: false,
    aux: 0,
  };
}

/**
 * Mount the cutter. Free when INSTALL_COST is null; otherwise scrap must cover it.
 * Artillery Beam "System Upgrades": a fresh kit is level 1, whose cost is "-".
 * MISMATCH: code fits it on any ship. Wiki "Overview" says it is pre-installed only on Federation A and B.
 */
export function installLance(g: Game): boolean {
  if (g.player.kits.lance) return false;
  if (INSTALL_COST != null) {
    if (g.scrap < INSTALL_COST) return false;
    g.scrap -= INSTALL_COST;
  }
  g.player.kits.lance = blankKit();
  seatKits(g.player); // Kit room (layouts.ts): a bought system takes its hull's room.
  return true;
}

/**
 * One reactor bar at a time, up to powerCap. Unpowered charge does not advance.
 * Artillery Beam "Overview": no console, so it cannot be manned to shorten the charge.
 * "Overview": powering off drains the charge. The page says "quickly" and gives no seconds, so a full bar empties in 2s. INFERRED.
 */
export function raiseLancePower(g: Game): void {
  const kit = g.player.kits.lance;
  if (!kit || kit.power >= powerCap(kit) || sparePower(g.player) < 1) return;
  kit.power += 1;
  kit.on = true;
}

export function lowerLancePower(g: Game): void {
  const kit = g.player.kits.lance;
  if (!kit || kit.power <= 0) return;
  kit.power -= 1;
  kit.on = kit.power > 0;
}

export function toggleLancePower(g: Game): void {
  const kit = g.player.kits.lance;
  if (!kit) return;
  if (kit.power < powerCap(kit) && sparePower(g.player) >= 1) {
    raiseLancePower(g);
    return;
  }
  lowerLancePower(g);
}

/** MISMATCH: code stores a chosen enemy room. Artillery Beam "Overview" says the beam swipe cannot be controlled. */
export function aimLance(g: Game, roomId: string): void {
  const kit = g.player.kits.lance;
  const enemy = g.enemy;
  if (!kit || !enemy) return;
  if (!enemy.rooms.some((r) => r.id === roomId)) return;
  kit.target = roomId;
}

function linkedRoom(door: Door, id: string): string | null {
  if (door.b === "void") return null;
  if (door.a === id) return door.b;
  if (door.b === id) return door.a;
  return null;
}

/**
 * Aimed room, plus one door-neighbor when the door list shows one (a system room if a door links one).
 * INVENTED: that two-room cap. Artillery Beam "Overview" says 1 damage per room hit and does not count rooms.
 * MISMATCH: code has at most two rooms. Beam (Weapon) "Artillery Beam" says beam length 500.
 */
function cutLine(ship: Ship, origin: string): Room[] {
  const first = ship.rooms.find((r) => r.id === origin);
  if (!first) return [];
  let fallback: Room | undefined;
  for (const door of ship.doors) {
    const otherId = linkedRoom(door, origin);
    if (!otherId) continue;
    const other = ship.rooms.find((r) => r.id === otherId);
    if (!other) continue;
    if (!fallback) fallback = other;
    if (other.system) return [first, other];
  }
  return fallback ? [first, fallback] : [first];
}

/**
 * Artillery Beam "Overview": 1 hull damage and 1 system damage per room, and a 10% fire chance.
 * MISMATCH: code rolls 10% once per room. Wiki "Overview" says 10% in each tile it passes.
 * Fires, "Fires and enemy AI": the stack stops at 4, one flame per tile of a 2x2.
 */
function nick(g: Game, ship: Ship, room: Room): void {
  ship.hull -= 1;
  if (ship.hull < 0) ship.hull = 0;
  if (room.system) {
    const sys = ship.systems[room.system];
    if (sys.damage < sys.level) sys.damage += 1;
  }
  if (rand(g) < 0.1) room.fire = Math.min(4, room.fire + 1);
}

/**
 * Charges on the power-level clock. Zero bars drain.
 * Beam (Weapons), Artillery Beam: "More power means faster cooldown."
 * "Charge time (depends on the system power level): 50s for level 1, reduced by 10 seconds
 * for each level above 1 to a minimum of 20s for level 4."
 * Working bars are kitBars: reactor power plus a Zoltan bar already stamped on the kit.
 * The Zoltan bar counts as a power level and does not change kit.power.
 * On completion, hull and system damage are applied directly so shield layers are neither popped nor subtracted.
 * Artillery Beam "Overview": the beam pierces regular shields.
 * Artillery Beam "Overview": a full charge fires on its own. The swipe still cannot be aimed; a room is chosen when the bar fills.
 * "Overview": powering off drains charge. INFERRED: a full bar empties in 2 seconds.
 * MISMATCH: no Zoltan Shield damage. "Overview" says 1 damage per each of the 2 ticks. This drill has no such shield.
 * @agent:hacking. Under an enemy Hacking pulse on this kit the charge runs backwards at its own charge speed.
 * Artillery Beam "Overview": "Hacking disruption reduces the charge progress only by 4-7-10 seconds." Hacking wiki,
 * "Overview" (Active effects): "Artillery Beam / Flak Artillery / Rebel Flagship weapons: drains charge (same effect as
 * on weapons)", and on weapons "Draining speed is the same as speed as the base-level charging speed".
 */
export function tickLance(g: Game, dt: number): void {
  const kit = g.player.kits.lance;
  if (!kit || !(dt > 0)) return;
  const fed = kitBars(kit);
  if (fed < 1) {
    kit.aux = Math.max(0, kit.aux - dt / 2);
    return;
  }
  if (g.paused || g.phase !== "combat" || !g.enemy) return;

  // Beam (Weapons), Artillery Beam: the clock is the filled power level, not the installed level.
  const seconds = chargeSeconds(fed);
  if (hackPulseOn(g, g.player, "lance")) {
    kit.aux = Math.max(0, kit.aux - dt / seconds);
    return;
  }
  if (kit.aux < 1) kit.aux = Math.min(1, kit.aux + dt / seconds);
  if (kit.aux < 1) return;
  if (!kit.target) {
    const rooms = g.enemy.rooms;
    if (rooms.length === 0) return;
    const pick = rooms[Math.floor(rand(g) * rooms.length)];
    kit.target = pick?.id ?? null;
  }
  if (!kit.target) return;

  const enemy = g.enemy;
  const rooms = cutLine(enemy, kit.target);
  if (rooms.length === 0) return;

  const shieldNow = enemy.shieldNow;
  for (const room of rooms) nick(g, enemy, room);
  enemy.shieldNow = shieldNow;
  kit.aux = 0;
  // Crew skills, Weapons: one point when an artillery system fires. The swipe is one fire.
  noteWeaponManning(g);
  log(g, `${DISPLAY_NAME} cuts ${enemy.name}.`);
}
