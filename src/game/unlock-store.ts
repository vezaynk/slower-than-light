/**
 * @agent:unlocks. Storage side of the ship unlock system (unlocks.ts holds the pure rules).
 * Keeps the unlock state in localStorage under "stl:unlocks", across runs. Every access is wrapped in try/catch;
 * a blocked or full storage keeps the in-memory copy for this session.
 *
 * Developer switch: "?unlockAll=1" on the page URL unlocks every layout (and persists it), the same as the
 * hangar's UNLOCK ALL button. "?unlockAll=0" puts the hangar back to the start state.
 */
import { earnedIds } from "./wiki/achievement-track.ts";
import type { Game } from "./types.ts";
import {
  UNLOCKS_KEY,
  allUnlocks,
  deriveUnlocks,
  emptyUnlocks,
  isUnlockedIn,
  parseUnlocks,
  type UnlockState,
} from "./unlocks.ts";

let memory: UnlockState | null = null;
const listeners = new Set<() => void>();

function urlFlag(): string | null {
  try {
    if (typeof location === "undefined") return null;
    return new URLSearchParams(location.search).get("unlockAll");
  } catch {
    return null;
  }
}

function write(next: UnlockState) {
  memory = next;
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(UNLOCKS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full. The in-memory copy holds this session.
  }
  for (const fn of listeners) fn();
}

export function getUnlocks(): UnlockState {
  if (memory) return memory;
  let raw: string | null = null;
  try {
    if (typeof localStorage !== "undefined") raw = localStorage.getItem(UNLOCKS_KEY);
  } catch {
    raw = null;
  }
  memory = parseUnlocks(raw);
  const flag = urlFlag();
  if (flag === "1") write(allUnlocks(memory));
  else if (flag === "0") write(emptyUnlocks());
  return memory;
}

export function isUnlocked(hullId: string): boolean {
  return isUnlockedIn(getUnlocks(), hullId);
}

/** Store hook: after a step or action, fold this run's progress into the saved state. Returns hull ids newly unlocked. */
export function noteUnlocks(g: Game): string[] {
  const prev = getUnlocks();
  const next = deriveUnlocks(prev, g, earnedIds());
  if (next === prev) return [];
  write(next);
  return next.ships.filter((id) => !prev.ships.includes(id));
}

/** Developer control: every layout selectable. Flagship wins are kept. */
export function unlockAll(): void {
  write(allUnlocks(getUnlocks()));
}

/** Developer control: back to the start state (Kestrel A only). */
export function resetUnlocks(): void {
  write(emptyUnlocks());
}

export function subscribeUnlocks(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test hook: drop the in-memory copy so the next read uses localStorage. */
export function resetUnlockMemory(): void {
  memory = null;
}
