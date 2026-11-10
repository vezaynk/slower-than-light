import type { ArchiveEvent, BedFlags, Cue, Game } from "./types.ts";

/**
 * Queues a game sound for the app to play after the step. sim.ts and the extras and wiki modules share this,
 * so a module that cannot import sim.ts can still make a sound. `name` is a one-shot cue name.
 */
export function queueSfx(g: Game, name: string): void {
  g.sfx.push(name);
}

/** An archive wave the tick used to play directly. The app maps the event onto a file. */
export function queueArchive(g: Game, event: ArchiveEvent, variant?: number): void {
  g.sfx.push(variant == null ? { archive: event } : { archive: event, variant });
}

/** The run whose shield-down cue `syncShields` should append. Null outside a step or an act. */
let cueTarget: Game | null = null;

/** Bind `g` and return the previous run, so a nested step can restore it. */
export function bindCueTarget(g: Game | null): Game | null {
  const previous = cueTarget;
  cueTarget = g;
  return previous;
}

/** Shields just fell. Queued on the run bound for this step or act. */
export function noteShieldsDown(): void {
  if (cueTarget) queueArchive(cueTarget, "shieldsDown");
}

/** A weapon firing. The app resolves the packed launch cue from the blueprint. */
export function queueLaunch(g: Game, id: string, kind: string | undefined): void {
  g.sfx.push(kind == null ? { launch: id } : { launch: id, kind });
}

/** The cues queued since the last call. The app plays this. A headless step drops it. */
export function takeCues(g: Game): Cue[] {
  return g.sfx.splice(0, g.sfx.length);
}

/** Loop cues a module asked for during this step. Not saved: the app reads and clears them each step. */
const heldLoops = new WeakMap<Game, Set<string>>();

/** Keeps an archive loop cue running for this step, while its work happens. */
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

const beds = new WeakMap<Game, BedFlags>();

/** Loop flags for this step. The app starts and stops the work loops from these. */
export function setBed(g: Game, flags: BedFlags): void {
  beds.set(g, flags);
}

/** The loop flags recorded since the last call, then forgets them. */
export function takeBed(g: Game): BedFlags | null {
  const flags = beds.get(g) ?? null;
  beds.delete(g);
  return flags;
}

export type { Cue };
