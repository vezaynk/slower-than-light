/**
 * INTENTIONALLY OVERRIDING SPEC: an air model written from first principles on purpose. It departs from the game, the
 * wiki (Oxygen), and the xftl notes (doc/oxygen).
 *
 * Every room holds an amount of air. Its volume is its floor tiles, and its pressure is amount / volume: the 0-100%
 * the sim stores in `room.o2` and crew breathe. Every opening moves air in proportion to the pressure difference across
 * it, flow = C * (p_from - p_to), in tile-% per second. Space is pressure 0 with no volume limit. So:
 * - a bigger room holds more air and its % changes more slowly for the same flow;
 * - a full room next to an empty one pushes 16 tile-%/s through an open door (C = 0.16), less as they converge;
 * - sealed rooms joined by open doors settle at their volume-weighted average, with no air lost;
 * - closed interior doors still seep, less at higher Door System levels.
 * Hull doors (airlocks) seal when closed. An open airlock is a very wide opening (C = 8), so its room empties in about
 * half a second. Space's pull reaches past it through open interior doors: the room one door away has exposure
 * VACUUM_REACH, and each further door keeps VACUUM_FALLOFF of that. Hull breaches pull the same way, scaled to their
 * size against an airlock (vacuumExposure). Each exposed room vents straight to space at AIRLOCK_C times its exposure (per the user: rooms connected to an open
 * airlock feel the vacuum, at least partially). A breach, or a Lanius, is a C = 0.16 hole to space.
 * Crew breathe a fixed amount (BREATH_PER_CREW); fires burn FIRE_BURN each. Every hull seeps a little air to space
 * (HULL_LEAK). A powered Oxygen system adds air to every room in proportion to its volume, so every room refills at
 * the same %: 1.8%/s at level 1 (per the user, 1.5x the xftl rate), 4.8 at level 2, 8.4 at level 3 (Oxygen; xftl doc/oxygen). An unpowered system adds nothing, so a
 * sealed ship slowly loses its air.
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
 * Exposure to space of a room one open door from an open airlock, and the share kept per further open door
 * (0.25, 0.22, 0.19, ...). Per the user: with every airlock open, a ship on level-1 Oxygen loses its air fairly
 * quickly (about a tenth of its air left at 5 s, about 5% everywhere by 20-30 s, on the playable hulls), while the
 * airlock's neighbour still vents well short of the airlock itself. The falloff is 0.88 rather than 0.8 so the faster
 * level-1 refill does not hold the deepest rooms above 5%.
 */
export const VACUUM_REACH = 0.25;
export const VACUUM_FALLOFF = 0.88;
/**
 * Oxygen system refill per tile: a base %/s and a multiplier per level (xftl doc/oxygen: "1,4,7").
 * INTENTIONALLY OVERRIDING SPEC (per the user): level 1 refills 1.5x faster, 1.8%/s, so an emptied room comes back in
 * about a minute even with crew in it. Levels 2 and 3 keep 4.8 and 8.4, so Oxygen-2 still cannot hold a room against a
 * breach and Oxygen-3 can.
 */
export const REFILL = 1.2;
export const REFILL_MULT: readonly number[] = [0, 1.5, 4, 7];
/**
 * Air one breathing crew member uses, tile-%/s: half of the base refill (per the user; it was the level-1 rate before
 * level 1 was sped up, and stays 0.6). A lone crew member
 * thins a 1-tile room by 0.6%/s and a 4-tile room by 0.15%/s.
 */
export const BREATH_PER_CREW = REFILL / 2;
/**
 * Passive seepage to space, %/s from a full room: a quarter of the base refill (per the user), 0.3. Like every other
 * opening to space it scales with the room's pressure, so it is 0.15%/s at half air.
 */
export const HULL_LEAK = REFILL / 4;
/** Air one fire burns, tile-%/s (Fires: "0.96% per second for each fire in a room", read as one tile's worth). */
export const FIRE_BURN = 0.96;

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

/**
 * A room's own opening to space, as a share of an open airlock: 1 with an airlock open, else BREACH_C / AIRLOCK_C per
 * breach or Lanius (a small hole), at most 1.
 */
function ownOpening(ship: Pick<Ship, "rooms" | "doors">, lanius?: ReadonlyMap<string, number>): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of ship.rooms) {
    const holes = r.breach + (lanius?.get(r.id) ?? 0);
    if (holes > 0) out.set(r.id, Math.min(1, (holes * BREACH_C) / AIRLOCK_C));
  }
  for (const d of ship.doors) if (d.b === "void" && d.open) out.set(d.a, 1);
  return out;
}

/**
 * How much of space's pull each room feels through open interior doors, from every room open to space: VACUUM_REACH of
 * a source's opening one door away, then VACUUM_FALLOFF of that per further open door, the strongest path winning.
 * Per the user, hull breaches pull on their neighbours too, in proportion to their size against an airlock. A room's
 * own opening is not counted here; stepAir vents that already. Rooms with no pull are left out.
 */
export function vacuumExposure(
  ship: Pick<Ship, "rooms" | "doors">,
  lanius?: ReadonlyMap<string, number>,
): Map<string, number> {
  const own = ownOpening(ship, lanius);
  const pull = new Map<string, number>();
  const passed = (id: string) => {
    const mine = own.get(id) ?? 0;
    const felt = pull.get(id) ?? 0;
    return Math.max(mine * VACUUM_REACH, felt * VACUUM_FALLOFF);
  };
  // Relax until nothing grows: every hop shrinks the pull, so this ends; ships are a few dozen rooms.
  const todo = [...own.keys()];
  while (todo.length) {
    const at = todo.shift()!;
    const next = passed(at);
    if (next <= 0) continue;
    for (const d of ship.doors) {
      if (!d.open || d.b === "void") continue;
      const other = d.a === at ? d.b : d.b === at ? d.a : null;
      if (other == null || (pull.get(other) ?? 0) >= next) continue;
      pull.set(other, next);
      todo.push(other);
    }
  }
  // A room's own opening is vented already: only pull beyond it counts, so a breach's pull bounced back through a
  // neighbour adds nothing, and a room with an open airlock gets nothing more.
  for (const [id, mine] of own) {
    const extra = (pull.get(id) ?? 0) - mine;
    if (extra > 0) pull.set(id, extra);
    else pull.delete(id);
  }
  return pull;
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
    r.o2 *= Math.exp((-HULL_LEAK / 100) * dt);
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
  // The pull of space from airlocks and breaches elsewhere, on top of each room's own opening (vented above and below).
  for (const [id, exposure] of vacuumExposure(ship, input.lanius)) {
    const r = byId.get(id);
    if (r) vent(r, AIRLOCK_C * exposure, dt);
  }
  for (const r of ship.rooms) {
    const holes = r.breach + (input.lanius.get(r.id) ?? 0);
    if (holes > 0) vent(r, BREACH_C * holes, dt);
    r.o2 = Math.max(0, Math.min(100, r.o2));
  }
}
