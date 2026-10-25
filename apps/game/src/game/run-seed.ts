/** A pinned uint32, or the usual unpinned mix of the clock. Zero is not a seed. */
export function resolveRunSeed(pinned: unknown, now: number): number {
  if (
    typeof pinned === "number" &&
    Number.isInteger(pinned) &&
    pinned >= 1 &&
    pinned <= 0xffffffff
  ) {
    return pinned;
  }
  return (now ^ 0x9e3779b9) >>> 0 || 1;
}

/** The page sets this before START. It is not the in-page `act` mutator. */
export function readPinnedSeed(): unknown {
  if (typeof window === "undefined") return undefined;
  return (window as { __stlSeed?: unknown }).__stlSeed;
}
