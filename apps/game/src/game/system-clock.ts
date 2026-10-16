import type { Kit, KitId, Ship, SysId } from "./types.ts";

/**
 * Per the user: while a system counts down (cloak, mind control, a hacking pulse, the battery,
 * ionization, a cooldown), the icon traces a circle. 0 is the start of that countdown, 1 is the end.
 * Ion points are born at 5 seconds (sim.ts applyIon). Other clocks remember the longest remaining
 * time seen for this countdown, so a cut jumps the trace forward and a longer reset starts it over.
 */
export type SystemClock = {
  progress: number;
  tone: "live" | "ion" | "cool";
};

const ION_POINT = 5;

/** Effects whose `left` is the system counting down, not a drone leg or a beam swipe. */
const LIVE_LEFT: ReadonlySet<string> = new Set(["cloaking", "mind", "hacking", "battery"]);

type Span = { total: number; last: number };
const books = new WeakMap<object, Map<string, Span>>();

function bookFor(ship: Ship): Map<string, Span> {
  let book = books.get(ship);
  if (!book) {
    book = new Map();
    books.set(ship, book);
  }
  return book;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function traced(book: Map<string, Span>, key: string, remaining: number, knownTotal?: number): number {
  const prev = book.get(key);
  let total: number;
  if (knownTotal != null && knownTotal > 0) total = knownTotal;
  else if (!prev || remaining > prev.last + 1e-4) total = remaining;
  else total = Math.max(prev.total, remaining);
  book.set(key, { total, last: remaining });
  return clamp01(1 - remaining / total);
}

/** Ionization on one system or artillery gun. The trace follows the point that lasts longest. */
export function ionClock(times: readonly number[] | undefined): SystemClock | null {
  if (!times || times.length === 0) return null;
  let max = 0;
  for (const t of times) if (t > max) max = t;
  if (!(max > 0)) return null;
  return { progress: clamp01(1 - max / ION_POINT), tone: "ion" };
}

function liveOf(kit: Kit): { remaining: number; total?: number } | null {
  if (LIVE_LEFT.has(kit.id) && kit.on && kit.left > 0) return { remaining: kit.left };
  if (kit.id === "hacking" && (kit.hackFly ?? 0) > 0) {
    const total = kit.hackFlyTotal;
    return { remaining: kit.hackFly ?? 0, total: total != null && total > 0 ? total : undefined };
  }
  return null;
}

/** The countdown drawn on this hull's system icon, or null when nothing is counting. */
export function systemClock(ship: Ship, id: string): SystemClock | null {
  const book = bookFor(ship);
  const sys = ship.systems?.[id as SysId];
  const kit = ship.kits?.[id as KitId];
  const liveKey = `${id}:live`;
  const coolKey = `${id}:cool`;

  const live = kit ? liveOf(kit) : null;
  if (!live) book.delete(liveKey);
  const coolLeft = kit && kit.cool > 0 ? kit.cool : 0;
  const coolProgress = coolLeft > 0 ? traced(book, coolKey, coolLeft) : null;
  if (!(coolLeft > 0)) book.delete(coolKey);

  if (live) return { progress: traced(book, liveKey, live.remaining, live.total), tone: "live" };
  const ion = ionClock([...(sys?.ion ?? []), ...(kit?.ion ?? [])]);
  if (ion) return ion;
  if (coolProgress != null) return { progress: coolProgress, tone: "cool" };
  return null;
}

/**
 * Enemy icon. Sensors level 4 (or the system your hack drone is on) is what reveals
 * ion, cooldown, and effect timers. The span still advances while hidden, so the
 * circle is already partway around when that information opens.
 */
export function enemySystemClock(ship: Ship, id: string, reveal: boolean): SystemClock | null {
  const clock = systemClock(ship, id);
  if (!clock || !reveal) return null;
  return clock;
}
