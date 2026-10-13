import type { SysId } from "../types.ts";

/** A pulsar pick. "cell" is the Backup Battery subsystem, which is not a SysId. */
export type PulsarId = SysId | "cell";

/**
 * Environmental Hazards, ==Pulsar==, and Zoltan Shield, lead.
 * Pirate fight near pulsar, Rebel fight near pulsar, and Lanius fight near pulsar
 * set pulsar=true on the Locations line. No other fetched page does.
 */

/** True when the cited event slug is one of those pulsar fights. */
export function eventHasPulsar(event: string | undefined): boolean {
  return !!event && event.includes("pulsar");
}

/**
 * Environmental Hazards, Pulsar: an ion pulse every 11--18 seconds.
 * INFERRED: uniform, and the printed top is not its own bucket, same as the battery.
 * INFERRED: that span is the whole cycle. The 5 second warning is the last part of it.
 */
export function pulsarCycleSeconds(roll: number): number {
  return 11 + roll * 7;
}

/** Seconds the warning leads the pulse. Environmental Hazards, Pulsar: 5 seconds beforehand. */
export const PULSAR_WARN_S = 5;

/**
 * Zoltan Shield, lead: the bubble "taking 3 or 4 ion damage".
 * INFERRED: the page does not say which, so each pulse is an even split.
 */
export function pulsarShieldSpend(roll: number): 3 | 4 {
  return roll < 0.5 ? 3 : 4;
}

/**
 * Environmental Hazards, Pulsar: ion damage = 1 + 0.5(system power), rounded down.
 * Unpowered shields are the 0-power case, which is 1.
 */
export function pulsarMainIon(power: number): number {
  return Math.floor(1 + 0.5 * Math.max(0, power));
}

export type PulsarPick = { id: PulsarId; points: number; powered: boolean };

/**
 * Environmental Hazards, Pulsar: two systems, and powered shields are always one of them.
 * The other is a different system. INFERRED: a ship with fewer than two eligible systems
 * ionizes only what it has.
 */
export function pickPulsarTargets(systems: readonly PulsarPick[], roll: () => number): PulsarPick[] {
  const pool = systems.filter((sys) => sys.points > 0);
  const shields = pool.find((sys) => sys.id === "shields" && sys.powered);
  if (shields) {
    const rest = pool.filter((sys) => sys.id !== "shields");
    if (rest.length === 0) return [shields];
    return [shields, rest[Math.floor(roll() * rest.length) % rest.length]];
  }
  if (pool.length <= 2) return pool.slice();
  const first = Math.floor(roll() * pool.length) % pool.length;
  let second = Math.floor(roll() * (pool.length - 1)) % (pool.length - 1);
  if (second >= first) second += 1;
  return [pool[first], pool[second]];
}
