import { rand } from "../sim.ts";
import { seatKits } from "../layouts.ts";
import { hackPulseOn } from "./spike.ts";
import type { Game, Kit, Shot, Ship } from "../types.ts";

/**
 * Charge lives on the hull's flak kit (aux is seconds toward the next burst).
 * Flak Artillery, Overview: pre-installed, not a store item.
 */
type FlakLevel = 1 | 2 | 3 | 4;

/** Flak Artillery, System Upgrades: charge time. */
export const CHARGE_SECONDS: Record<FlakLevel, number> = {
  // Flak Artillery, System Upgrades: level 1, 50 sec
  1: 50,
  // Flak Artillery, System Upgrades: level 2, 40 sec
  2: 40,
  // Flak Artillery, System Upgrades: level 3, 30 sec
  3: 30,
  // Flak Artillery, System Upgrades: level 4, 20 sec
  4: 20,
};

/**
 * Flak Artillery, System Upgrades: cost to reach that level from the one below.
 * Level 1 is a dash on that table (no purchase into the row).
 */
export const UPGRADE_COSTS: Record<2 | 3 | 4, number> = {
  // Flak Artillery, System Upgrades: level 2 costs 30
  2: 30,
  // Flak Artillery, System Upgrades: level 3 costs 50
  3: 50,
  // Flak Artillery, System Upgrades: level 4 costs 80
  4: 80,
};

/**
 * Not sold.
 * Flak Artillery, Overview: pre-installed only.
 * Wiki page "Flak (Weapons)", section "Flak weapons table": Price N/A.
 * Wiki page "Flak Artillery", section "System Upgrades": purchase cost is a dash.
 * armFlak therefore spends no scrap.
 */
export const SOLD_IN_STORES = false;

/**
 * Flak Artillery, Overview: "Automatically fires a 7-flak burst".
 * Wiki page "Flak (Weapons)", section "List of Flak weapons": Shots 7.
 * Wiki page "Flak (Weapons)", section "List of Flak weapons": Additional fake flak 7.
 * Wiki page "Flak (Weapons)", section "Understanding flak accuracy": fake flak cannot deal damage.
 * INFERRED: only those 7 damaging shots are pushed. The page does not say to omit the fake pellets.
 */
export const PROJECTILES = 7;

/**
 * Flak Artillery, Overview: "does one damage to room that it hits."
 * Wiki page "Flak (Weapons)", section "List of Flak weapons": Damage per shot 1.
 */
export const DAMAGE = 1;

/**
 * Wiki page "Flak (Weapons)", section "Flak weapons table": Power 1-4*.
 * Wiki page "Systems", section "Main systems": "More power means faster cooldown."
 * INFERRED: bars accepted equal the level, and that level's System Upgrades
 * charge time is the cooldown. Reactor bars are not taken off the hull.
 */
export const POWER_BARS: Record<FlakLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

/**
 * INFERRED: 0.7s flight, same as the host's other non-missile projectiles.
 * Wiki page "Flak (Weapons)", section "Flak weapons table": speed 26, which is not a second count.
 */
const FLIGHT_SECONDS = 0.7;

function blank(level: FlakLevel): Kit {
  return { id: "flak", level, power: 0, left: 0, cool: 0, target: null, on: true, aux: 0 };
}

export function chargeFlakSeconds(level: FlakLevel): number {
  return CHARGE_SECONDS[level];
}

/** Install at a level without a store. Flak Artillery, Overview: not sold. The kit is the slot. */
export function armFlak(g: Game, level: FlakLevel): void {
  g.player.kits.flak = blank(level);
  seatKits(g.player); // Kit room (layouts.ts): a fitted system takes its hull's room.
}

function tickShip(g: Game, ship: Ship, from: "player" | "enemy", dt: number): void {
  const kit = ship.kits.flak;
  if (!kit || !kit.on) return;
  const other = from === "player" ? g.enemy : g.player;
  const seconds = chargeFlakSeconds(kit.level as FlakLevel);
  // Systems, "Damaged and destroyed systems": "A system with all its levels damaged is considered destroyed, i.e.
  // completely unfunctional". Flak Artillery, Overview: "Powering off drains charge quickly". INFERRED: a destroyed
  // flak drains like a powered-off one, a full charge in 2 seconds (as lance.ts).
  if ((kit.damage ?? 0) >= kit.level) {
    kit.aux = Math.max(0, kit.aux - (dt * seconds) / 2);
    return;
  }
  // @agent:hacking. Hacking wiki, "Overview" (Active effects): "Artillery Beam / Flak Artillery / Rebel Flagship
  // weapons: drains charge (same effect as on weapons)"; on weapons "Draining speed is the same as speed as the
  // base-level charging speed". aux is seconds of charge, so it loses one second per second of pulse.
  if (hackPulseOn(g, ship, "flak")) {
    kit.aux = Math.max(0, kit.aux - dt);
    return;
  }
  kit.aux += dt;
  if (kit.aux < seconds) return;
  const rooms = other?.rooms ?? [];
  if (rooms.length === 0) {
    kit.aux = seconds;
    return;
  }
  kit.aux = 0;
  const targets = spreadRooms(g, rooms, PROJECTILES);
  for (let i = 0; i < PROJECTILES; i++) {
    const shot: Shot = {
      id: nextId(g),
      kind: "flak",
      from,
      damage: DAMAGE,
      ion: 0,
      fireChance: 0,
      breachChance: 0,
      targetRoom: targets[i],
      wait: 0,
      t: 0,
      duration: FLIGHT_SECONDS,
    };
    g.shots.push(shot);
  }
}

/**
 * Spools every fitted flak kit. At a full charge, pushes 7 shots of 1 damage.
 * Flak Artillery, Overview: fires when charge is complete, each shot at a room.
 */
export function tickFlak(g: Game, dt: number): void {
  if (!(dt > 0)) return;
  if (g.paused || g.phase !== "combat") return;
  tickShip(g, g.player, "player", dt);
  if (g.enemy) tickShip(g, g.enemy, "enemy", dt);
}

/**
 * Flak Artillery, Overview: each shot is targeted at a random room.
 * INFERRED: a shuffled round-robin spreads the seven across the enemy hull
 * instead of stacking them. Pixel radius is not simulated.
 * Wiki page "Flak (Weapons)", section "Flak weapons table": radius 35*.
 */
function spreadRooms(g: Game, rooms: { id: string }[], count: number): string[] {
  const ids = rooms.map((room) => room.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  const out: string[] = [];
  for (let n = 0; n < count; n++) out.push(ids[n % ids.length]);
  return out;
}

function nextId(g: Game): string {
  // INVENTED: share the host id counter so shot ids stay unique.
  g.uid = (g.uid + 1) >>> 0;
  return "u" + g.uid.toString(36);
}
