/**
 * Environmental Hazards, ==Class-M Red Giant Star==.
 * Auto-ship fight near sun, Mantis fight near sun, Pirate fight near sun, and
 * Rock pirates fight near sun set redgiant=true on the Locations line.
 * Boarders: Humans near sun and Boarders: Rockmen near sun also set it, and they
 * are not a startCombat slug.
 *
 * Rock war vessel encounter, ==Sun Quest Marker==: the Locations / Long-Ranged
 * Scanners mark on that fight is shipdetected=ship+redgiant, so it is a
 * red-giant fight and the same flares arm. Printed: arrive dangerously close
 * to an M-class star, then fight the Rock Assault (Elite) ship (escape countdown
 * 32 seconds is not a flare number).
 * INFERRED: that fight's existing event slug is "quest-rock-sun". The wiki does not print the slug.
 */

const FLARE_EVENTS = new Set([
  "auto-ship-fight-near-sun",
  "mantis-fight-near-sun",
  "pirate-fight-near-sun",
  "rock-pirates-fight-near-sun",
  // INFERRED: Sun Quest Marker slug. The wiki prints shipdetected=ship+redgiant, not this id.
  "quest-rock-sun",
]);

/** True when the cited event slug is one of those red-giant fights. */
export function eventHasFlare(event: string | undefined): boolean {
  return !!event && FLARE_EVENTS.has(event);
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
 * Environmental Hazards, Class-M Red Giant Star: "1 or 2 of the total fires randomly allocated to each room."
 * INFERRED: one fire at a time, into a room that still has fewer than 2 from this flare.
 * Fires left over when every room already has 2 are not placed.
 */
export function placeFlareFires(count: number, rooms: number, roll: () => number): number[] {
  const placed = Array.from({ length: Math.max(0, rooms) }, () => 0);
  let left = Math.max(0, count);
  while (left > 0) {
    const open: number[] = [];
    for (let i = 0; i < placed.length; i++) if (placed[i] < 2) open.push(i);
    if (open.length === 0) break;
    const pick = open[Math.floor(roll() * open.length) % open.length];
    placed[pick] += 1;
    left -= 1;
  }
  return placed;
}

/**
 * Environmental Hazards, Class-M Red Giant Star: 33% from one fire, 66% from two.
 * The roll is 1 hull and 1 system damage, or nothing.
 */
export function flareDamagesRoom(fires: number, roll: number): boolean {
  if (fires <= 0) return false;
  if (fires === 1) return roll < 0.33;
  return roll < 0.66;
}
