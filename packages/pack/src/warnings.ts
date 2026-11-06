/**
 * Data the game can still run with, but that does not match what it expects: an unknown name, a missing attribute,
 * a list that names nothing. The caller skips or falls back the way the game would, and reports it here.
 * Each distinct message is reported once, so generating the same ship again does not repeat it.
 */
export type PackWarningListener = (message: string) => void;

const seen = new Set<string>();
let listener: PackWarningListener = (message) => console.warn(`[pack] ${message}`);

/** Above 0 while quietPackWarnings runs: warnings are dropped and not remembered. */
let quiet = 0;

export function warnPack(message: string): void {
  if (quiet > 0) return;
  if (seen.has(message)) return;
  seen.add(message);
  listener(message);
}

/** Replaces where warnings go, and forgets what was reported. Returns a function that restores the console. */
export function onPackWarning(next: PackWarningListener): () => void {
  listener = next;
  seen.clear();
  return () => {
    listener = (message) => console.warn(`[pack] ${message}`);
    seen.clear();
  };
}

/**
 * Runs `build` with pack warnings dropped. For a placeholder built before any archive is loaded (the store's
 * title game), whose empty-pack fallbacks are not data problems. Nothing is remembered, so the same warning
 * from real data later still prints.
 */
export function quietPackWarnings<T>(build: () => T): T {
  quiet += 1;
  try {
    return build();
  } finally {
    quiet -= 1;
  }
}
