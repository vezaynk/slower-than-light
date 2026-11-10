/**
 * Environmental Hazards, ==Class-M Red Giant Star==.
 * Which fight is a sun is the archive event's `<environment type="sun">`.
 * The cycle, the fire counts, and the damage chance are not on any blueprint.
 * FTL keeps those in the executable.
 */
import { eventDef } from "@stl/pack";
import "../pack/base.ts";

/** True when this event, or the page its slug stores, carries `<environment type="sun">`. */
export function eventHasFlare(event: string | undefined): boolean {
  if (!event) return false;
  return eventDef(event)?.environment?.type === "sun";
}

/**
 * Environmental Hazards, Class-M Red Giant Star: a flare every 28-34 seconds.
 * INFERRED: uniform, and the printed top is not its own bucket, same as the battery.
 * INFERRED: that span is the whole cycle. The 5 second warning is the last part of it.
 */
export function flareCycleSeconds(roll: number): number {
  return 28 + roll * 6;
}

/** Seconds the warning leads the flare. Environmental Hazards, Class-M Red Giant Star: 5 seconds beforehand. */
export const FLARE_WARN_S = 5;

/**
 * Environmental Hazards, Class-M Red Giant Star: shields up start 1 or 2 fires.
 * Shields down start 3-6. A Zoltan Shield counts as shields up. Extra layers do not change this.
 * INFERRED: shields up is an even split. Shields down is uniform across 3, 4, 5, and 6.
 */
export function flareFireCount(shieldsUp: boolean, roll: number): number {
  if (shieldsUp) return roll < 0.5 ? 1 : 2;
  return 3 + Math.floor(roll * 4);
}

/**
 * Where a flare's fires land. xftl doc/solar-flares: "While there are more fires to start, pick a random room. Then
 * spawn either 1/2 fires (always 1 if there's only one left to spawn), and spawn it into the room." A room can be
 * picked again. Environmental Hazards prints the same "1 or 2 of the total fires randomly allocated to each room."
 * INFERRED: 1 and 2 are an even split.
 * Returns each spawn in order: the room index and its 1 or 2 fires.
 */
export function placeFlareFires(
  count: number,
  rooms: number,
  roll: () => number,
): { room: number; fires: number }[] {
  const out: { room: number; fires: number }[] = [];
  if (rooms <= 0) return out;
  let left = Math.max(0, count);
  while (left > 0) {
    const room = Math.floor(roll() * rooms) % rooms;
    const fires = left === 1 ? 1 : roll() < 0.5 ? 1 : 2;
    out.push({ room, fires });
    left -= fires;
  }
  return out;
}

/**
 * Environmental Hazards, Class-M Red Giant Star: 33% from one fire, 66% from two. xftl doc/solar-flares: "For each
 * room a fire is started in, there's a 33%/66% chance to deal a point of damage, depending on whether 1/2 fires were
 * started in that room." INFERRED: rolled once per spawn, so a room picked twice rolls twice.
 * The roll is 1 hull and 1 system damage, or nothing.
 */
export function flareDamagesRoom(fires: number, roll: number): boolean {
  if (fires <= 0) return false;
  if (fires === 1) return roll < 0.33;
  return roll < 0.66;
}
