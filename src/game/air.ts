/**
 * INVENTED air model, written from first principles on purpose (it departs from the game and from the xftl notes).
 *
 * Every room holds an amount of air. Its volume is its floor tiles, and its pressure is amount / volume: the 0-100%
 * the sim stores in `room.o2` and crew breathe. Every opening moves air in proportion to the pressure difference across
 * it, flow = C * (p_from - p_to), in tile-% per second. Space is pressure 0 with no volume limit. So:
 * - a bigger room holds more air and its % changes more slowly for the same flow;
 * - a full room next to an empty one pushes 16 tile-%/s through an open door (C = 0.16), less as they converge;
 * - sealed rooms joined by open doors settle at their volume-weighted average, with no air lost;
 * - closed interior doors still seep, less at higher Door System levels.
 * Hull doors (airlocks) seal when closed. An open airlock is a very wide opening (C = 8), so its room empties in about
 * half a second and then pulls on its neighbours through their doors. A breach, or a Lanius, is a C = 0.16 hole to
 * space.
 * Crew breathe a fixed amount (BREATH_PER_CREW); fires burn FIRE_BURN each. A powered Oxygen system adds air to every
 * room in proportion to its volume, so every room refills at the same %: 1.2%/s, x4 at level 2, x7 at level 3
 * (Oxygen; xftl doc/oxygen). An unpowered system adds nothing; only breathing, fire, and holes take air.
 *
 * Each opening is applied as the exact two-sided exchange over the tick, so a wide opening cannot overshoot and air is
 * conserved between rooms. Pure: no sim import.
 */
import type { Room, Ship } from "./types.ts";

/** Open interior door: 16 tile-%/s from a full room into an empty one. */
export const OPEN_DOOR_C = 0.16;
/** Closed interior door seepage, by Door System level 0 (none or broken) to 4. Level 4 is effectively sealed. */
export const CLOSED_DOOR_C: readonly number[] = [0.032, 0.016, 0.005, 0.002, 0.001];
/** One hull breach, or one Lanius, as a hole to space. A 2-tile room loses 8%/s through one when full. */
export const BREACH_C = 0.16;
/** An open airlock: a 2-tile room empties in about half a second. */
export const AIRLOCK_C = 8;
/**
 * Air one breathing crew member uses, tile-%/s. Level-1 Oxygen (1.2%/s per tile) just covers one crew member in a
 * 1-tile room; two crowded into one slowly thin it. A sealed, unpowered ship loses air only to breathing.
 */
export const BREATH_PER_CREW = 1;
/** Air one fire burns, tile-%/s (Fires: "0.96% per second for each fire in a room", read as one tile's worth). */
export const FIRE_BURN = 0.96;
/** Oxygen system refill per tile, %/s at level 1, and the level multipliers (xftl doc/oxygen: "1,4,7"). */
export const REFILL = 1.2;
export const REFILL_MULT: readonly number[] = [0, 1, 4, 7];

/** Floor tiles: the room's rectangle less its omitted cells. */
export function volume(r: Pick<Room, "w" | "h" | "omit">): number {
  return Math.max(1, r.w * r.h - (r.omit?.length ?? 0));
}

export type AirInputs = {
  /** Oxygen system bars feeding production (0 = none). */
  o2Bars: number;
  /** Door System level for closed-door seepage, 0-4. */
  doorLevel: number;
  /** Breathing crew per room id. */
  breathers: ReadonlyMap<string, number>;
  /** Lanius per room id (each a breach-sized hole). */
  lanius: ReadonlyMap<string, number>;
};

/** Air moves between two rooms toward their shared pressure, exactly over dt. */
function exchange(a: Room, b: Room, c: number, dt: number) {
  const va = volume(a);
  const vb = volume(b);
  const eq = (a.o2 * va + b.o2 * vb) / (va + vb);
  const k = 1 - Math.exp(-c * dt * (1 / va + 1 / vb));
  a.o2 += (eq - a.o2) * k;
  b.o2 += (eq - b.o2) * k;
}

/** Air leaves a room to space, exactly over dt. */
function vent(r: Room, c: number, dt: number) {
  r.o2 *= Math.exp((-c * dt) / volume(r));
}

/** One tick of air on a hull. Fire starvation and suffocation read the result. */
export function stepAir(ship: Ship, input: AirInputs, dt: number): void {
  if (!(dt > 0)) return;
  const refill = REFILL * (REFILL_MULT[Math.min(3, Math.max(0, input.o2Bars))] ?? 0);
  for (const r of ship.rooms) {
    const v = volume(r);
    r.o2 += refill * dt;
    r.o2 -= ((input.breathers.get(r.id) ?? 0) * BREATH_PER_CREW * dt) / v;
    r.o2 -= (r.fire * FIRE_BURN * dt) / v;
    r.o2 = Math.max(0, Math.min(100, r.o2));
  }
  const byId = new Map(ship.rooms.map((r) => [r.id, r]));
  const closed = CLOSED_DOOR_C[Math.min(4, Math.max(0, Math.floor(input.doorLevel)))];
  for (const d of ship.doors) {
    const a = byId.get(d.a);
    if (!a) continue;
    if (d.b === "void") {
      if (d.open) vent(a, AIRLOCK_C, dt);
      continue;
    }
    const b = byId.get(d.b);
    if (b) exchange(a, b, d.open ? OPEN_DOOR_C : closed, dt);
  }
  for (const r of ship.rooms) {
    const holes = r.breach + (input.lanius.get(r.id) ?? 0);
    if (holes > 0) vent(r, BREACH_C * holes, dt);
    r.o2 = Math.max(0, Math.min(100, r.o2));
  }
}
