/**
 * Data the game can still run with, but that does not match what it expects: an unknown name, a missing attribute,
 * a list that names nothing. The caller skips or falls back the way the game would, and reports it here.
 * Each distinct message is reported once, so generating the same ship again does not repeat it.
 */
export type PackWarningListener = (message: string) => void;

const seen = new Set<string>();
let listener: PackWarningListener = (message) => console.warn(`[pack] ${message}`);

export function warnPack(message: string): void {
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
