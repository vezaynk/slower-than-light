import { playArchiveSfx } from "./archive-audio.ts";
import type { Game } from "./types.ts";

/**
 * Queues a game sound for the next audio flush (audio.ts flushSfx). sim.ts and the extras and wiki modules share
 * this, so a module that cannot import sim.ts can still make a sound. `name` is a game sound (audio.ts SFX_CUES)
 * or an archive cue name.
 */
export function queueSfx(g: Game, name: string): void {
  playArchiveSfx(name);
  g.sfx.push(name);
}

/** Loop cues a module asked for during this step. Not saved: syncBed reads and clears them each step. */
const heldLoops = new WeakMap<Game, Set<string>>();

/** Keeps an archive loop cue (audio.ts LOOP_CUES) running for this step, while its work happens. */
export function holdLoopCue(g: Game, name: string): void {
  let held = heldLoops.get(g);
  if (!held) heldLoops.set(g, (held = new Set()));
  held.add(name);
}

/** The loop cues held since the last call, then forgets them. */
export function takeHeldLoops(g: Game): ReadonlySet<string> {
  const held = heldLoops.get(g) ?? new Set<string>();
  heldLoops.delete(g);
  return held;
}
