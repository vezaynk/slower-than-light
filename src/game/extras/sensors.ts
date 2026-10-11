import { REPAIR_SECONDS, manning, playerSensorsOff, roomWith } from "../sim.ts";
import type { Game, Ship, SysId } from "../types.ts";

/**
 * Display percent for the level-4 line. INFERRED: rounded and clamped to 0..100.
 * That clamp is wording only. It does not change repair or sabotage.
 */
function sensorPct(fraction: number): number {
  if (!Number.isFinite(fraction)) return 0;
  return Math.max(0, Math.min(100, Math.round(fraction * 100)));
}

/**
 * Wiki sensor level: installed bars, minus damage and ion, plus one if manned.
 * Sensors "Overview": manning works 1 level above the upgrade. "System Upgrades": effect tops out at 4, and level 4 is only from manning a level-3 system.
 * INFERRED: subtract one per damage point and per ion lock, and floor at 0. Sensors never states that formula.
 * Systems, "Damaged and destroyed systems": the worked example is 2 damage lowering maximum power by 2, and "The ion damage of 1 removes 1 power."
 * INFERRED: one point of damage therefore lowers the level by 1. Sensors never states that.
 * Manning is sim.ts manning: a living crew member standing still in the room, on a console that is not blocked.
 * Systems, the paragraph above "Main systems": ionized or damaged systems cannot be manned, and fires, breaches, and intruders prevent manning. That paragraph has no heading.
 * Sensors "System Upgrades": level 4 only while level 3 is manned. An unattended level of 4 still reports 3.
 * @agent:enemy-sensors. Player-side only. Sensors "Overview": "Enemy ships do not have Sensors subsystem, but have all
 * the information about your ship and crew." No enemy decision reads this (see spike.ts enemySensorsHacked).
 */
export function sensorLevel(g: Game, ship: Ship, aboard: "player" | "enemy"): number {
  // Boarders: Humans jammed sensors: "your Sensors are disabled" until the next jump.
  if (aboard === "player" && playerSensorsOff(g)) return 0;
  const sys = ship.systems.sensors;
  let level = sys.level - sys.damage - sys.ion.length;
  // Systems, the paragraph above "Main systems": the same manning rule as every other console. Damage, ion, fire,
  // a breach, an intruder, or a room out of air blocks it, and a mind-controlled body is not this ship's crew.
  const manned = manning(g, ship, aboard, "sensors");
  if (manned) level += 1;
  // Sensors "System Upgrades": level 4 exists only while a level-3 system is manned.
  if (!manned) level = Math.min(level, 3);
  // @agent:flagship. The Rebel Flagship: "limits Sensors functionality capping them at level 2" (player's sensors).
  if (aboard === "player" && g.phase === "combat" && g.enemy?.flagship) level = Math.min(level, 2);
  return Math.max(0, Math.min(4, level));
}

/**
 * Enemy system line shown at Sensors level 4 (the caller also uses it for the one hacked system).
 * Sensors, "Overview": "Sensors level 4 additionally provide the information on enemy systems level, power usage, ion damage/cooldown, repair/sabotage progress."
 * Sensors, "System Upgrades", level 4: "(Additionally) See enemy systems level, power usage, ion damage, cooldown, repair and sabotage progress."
 * Sensors, "Overview": "Level 4 Sensors 'limitation': they do not show the remaining duration time of active Hacking, Cloaking, Mind Control, or Clone Bay progress and crew quantity in the cloning queue."
 * Those timers are not on this line.
 * INFERRED: the wiki does not print the tooltip wording. The sentence is system level, powered bars (`shownPower`), ion-point count, seconds left on each ion point, repair percent, sabotage percent.
 * INFERRED: repair percent is fix / REPAIR_SECONDS (the printed 12.5s bar). Sabotage percent is that system's room bar, 0..1, and a missing bar is 0.
 */
export function sensorSystemDetail(ship: Ship, id: SysId, label: string, shownPower: number): string {
  const sys = ship.systems[id];
  const sabotage = roomWith(ship, id)?.sabotage ?? 0;
  const repair = sensorPct(REPAIR_SECONDS > 0 ? sys.fix / REPAIR_SECONDS : 0);
  const cooldown = sys.ion.length === 0 ? "none" : sys.ion.map((s) => `${s.toFixed(1)}s`).join(" / ");
  return `${label}: level ${sys.level}, power ${shownPower} of ${sys.level}, ion ${sys.ion.length}, cooldown ${cooldown}, repair ${repair}%, sabotage ${sensorPct(sabotage)}%`;
}
