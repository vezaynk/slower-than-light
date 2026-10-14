/**
 * A dodge or a spread that misses the room does not stop the bolt.
 * It keeps the inbound speed, flies through the aim point, and leaves the camera.
 * Beams never miss. Bombs teleport, so they are not flown past.
 */

export type Pt = { x: number; y: number };

/** Pixels per second along an inbound leg of `seconds`. A zero span still moves. */
export function flightSpeed(from: Pt, to: Pt, seconds: number): number {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  return dist / Math.max(seconds, 1 / 60);
}

/**
 * Velocity that carries a miss through `aim` and onward.
 * Short of the aim point, head straight through it. Already there, keep the inbound angle.
 * A path with no real speed returns null so the caller can puff instead.
 */
export function missVelocity(
  at: Pt,
  aim: Pt,
  approachAng: number,
  speed: number,
): { vx: number; vy: number; ang: number } | null {
  if (!(speed > 8)) return null;
  const dx = aim.x - at.x;
  const dy = aim.y - at.y;
  if (Math.hypot(dx, dy) > 12) {
    const ang = Math.atan2(dy, dx);
    return { vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ang };
  }
  return { vx: Math.cos(approachAng) * speed, vy: Math.sin(approachAng) * speed, ang: approachAng };
}

/** True once `p` is `margin` pixels outside `bounds`. */
export function leftCamera(p: Pt, bounds: { x: number; y: number; w: number; h: number }, margin: number): boolean {
  return p.x < bounds.x - margin || p.y < bounds.y - margin || p.x > bounds.x + bounds.w + margin || p.y > bounds.y + bounds.h + margin;
}

/** Lasers, ions, missiles, flak, and rocks travel. Beams never miss. Bombs appear on the room. */
export function shotFliesPast(kind: "laser" | "missile" | "ion" | "beam" | "flak" | "bomb"): boolean {
  return kind !== "bomb" && kind !== "beam";
}

/** Drop a flyby this far outside its camera, past the sprite. */
export const MISS_EXIT_MARGIN = 36;

/** A flyby cannot linger when its path never leaves the camera. */
export const MISS_MAX_AGE = 4;
