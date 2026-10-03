import { roomWith } from "../sim.ts";
import type { Game, Ship } from "../types.ts";

/**
 * Wiki sensor level: installed bars, minus damage and ion, plus one if manned.
 * Sensors "Overview": manning works 1 level above the upgrade. "System Upgrades": effect tops out at 4, and level 4 is only from manning a level-3 system.
 * INFERRED: subtract one per damage point and per ion lock, and floor at 0. Sensors never states that formula.
 * Systems, "Damaged and destroyed systems": the worked example is 2 damage lowering maximum power by 2, and "The ion damage of 1 removes 1 power."
 * INFERRED: one point of damage therefore lowers the level by 1. Sensors never states that.
 * INFERRED: a living crew member standing still in the room counts as manning. Sensors, "Overview" only says "manning the console."
 * Systems, the paragraph above "Main systems": ionized or damaged systems cannot be manned, and fires, breaches, and intruders prevent manning. That paragraph has no heading.
 * Sensors "System Upgrades": level 4 only while level 3 is manned. An unattended level of 4 still reports 3.
 */
export function sensorLevel(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  const sys = ship.systems.sensors;
  let level = sys.level - sys.damage - sys.ion.length;
  const room = roomWith(ship, "sensors");
  const friends = aboard;
  const intruder = room
    ? g.crew.some(
        (c) => c.aboard === aboard && c.side !== friends && c.hp > 0 && c.room === room.id,
      )
    : false;
  // Systems, the paragraph above "Main systems": a damaged or ionized console cannot be manned. Fire, a breach, or an intruder also blocks it.
  const blocked = sys.damage > 0 || sys.ion.length > 0 || !room || room.fire > 0 || room.breach > 0 || intruder;
  const manned =
    !blocked &&
    g.crew.some(
      (c) =>
        c.side === aboard &&
        c.aboard === aboard &&
        c.hp > 0 &&
        c.path.length === 0 &&
        c.room === room.id,
    );
  if (manned) level += 1;
  // Sensors "System Upgrades": level 4 exists only while a level-3 system is manned.
  if (!manned) level = Math.min(level, 3);
  return Math.max(0, Math.min(4, level));
}
