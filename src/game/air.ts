/**
 * Air loss and air sharing, from the xftl reverse-engineering notes (gitlab.com/znixian/xftl, doc/oxygen):
 * - OxygenSystem::ComputeAirLoss: "The base air loss ... for airlock doors is 16%/sec per open airlock door, and for
 *   hull breaches it's 8%/sec per breach." It is "called for hull breaches (and anaerobic crew, which are equivalent)".
 *   "It drains the oxygen from the relevant room, and from all adjacent rooms ... the air loss rate is computed as 0.75
 *   to the power of it's distance from the room with the breach/open airlock".
 * - OxygenSystem::RedistributeOxygen: "Any two rooms with a path of open doors between them is part of a single chunk
 *   ... Find the average oxygen level in a chunk, and for each room therein find the difference of it's oxygen vs the
 *   average, and change the level by 8% of that per second."
 * INFERRED: the distance map follows open interior doors, the same paths as a chunk. The notes' tactics ("close all but
 * one ... of the doors around the breached room ... by opening nearby doors you're loosing more air") need that.
 * Pure: no sim import, so lineage.ts can use it too.
 */
import type { Ship } from "./types.ts";

/** ComputeAirLoss base rates, percent of a room's air per second. */
export const BREACH_AIR_LOSS = 8;
export const AIRLOCK_AIR_LOSS = 16;
/** ComputeAirLoss falloff per room of distance. */
export const AIR_LOSS_FALLOFF = 0.75;
/** RedistributeOxygen: share of the gap to the chunk average closed per second. */
export const AIR_SHARE_PER_SEC = 0.08;

/** Rooms joined to `from` by open interior doors, with their distance in rooms. */
function openDistances(ship: Ship, from: string): Map<string, number> {
  const dist = new Map<string, number>([[from, 0]]);
  const todo = [from];
  while (todo.length) {
    const at = todo.shift()!;
    for (const d of ship.doors) {
      if (!d.open || d.b === "void") continue;
      const next = d.a === at ? d.b : d.b === at ? d.a : null;
      if (next == null || dist.has(next)) continue;
      dist.set(next, dist.get(at)! + 1);
      todo.push(next);
    }
  }
  return dist;
}

/** ComputeAirLoss: drain `perSecond` from room `from`, and 0.75^distance of it from each room open to it. */
export function airLoss(ship: Ship, from: string, perSecond: number, dt: number): void {
  if (!(perSecond > 0) || !(dt > 0)) return;
  for (const [id, d] of openDistances(ship, from)) {
    const r = ship.rooms.find((x) => x.id === id);
    if (r) r.o2 = Math.max(0, r.o2 - perSecond * AIR_LOSS_FALLOFF ** d * dt);
  }
}

/** RedistributeOxygen: each room moves 8%/s of its gap toward the average of its open-door chunk. */
export function shareAir(ship: Ship, dt: number): void {
  const seen = new Set<string>();
  for (const r of ship.rooms) {
    if (seen.has(r.id)) continue;
    const chunk = [...openDistances(ship, r.id).keys()]
      .map((id) => ship.rooms.find((x) => x.id === id))
      .filter((x) => x != null);
    for (const x of chunk) seen.add(x.id);
    if (chunk.length < 2) continue;
    const avg = chunk.reduce((n, x) => n + x.o2, 0) / chunk.length;
    const k = Math.min(1, AIR_SHARE_PER_SEC * dt);
    for (const x of chunk) x.o2 += (avg - x.o2) * k;
  }
}
