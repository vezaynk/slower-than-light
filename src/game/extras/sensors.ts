import { roomWith } from "../sim.ts";
import type { Game, Ship } from "../types.ts";

/**
 * Wiki sensor level: installed bars, minus damage and ion, plus one if manned.
 * Sensors "Overview": manning works 1 level above the upgrade. "System Upgrades": effect tops out at 4, and level 4 is only from manning a level-3 system.
 * INFERRED: subtract one per damage point and per ion lock, and floor at 0. Sensors never states that formula.
 * Systems: 1 damage lowers maximum power by 1, and 1 ion damage removes 1 power. A living crew member standing still in the room is treated as manning; the Sensors page only says "manning the console."
 * Systems: a damaged or ionized console is not manned, and fire, a breach, or an intruder blocks manning.
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
  // Systems: a damaged or ionized console cannot be manned. Fire, a breach, or an intruder also blocks it.
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
