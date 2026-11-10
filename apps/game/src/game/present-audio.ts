import { playArchiveAudio, playArchiveSfx } from "./archive-audio.ts";
import { playSfx, syncLoops, weaponLaunchCue } from "./audio.ts";
import { takeBed } from "@stl/sim/sfx-queue.ts";
import type { Cue, Game } from "@stl/sim/types.ts";

/** Play the cues and work loops one step recorded. Headless runs drop them. */
export function presentAudio(g: Game): void {
  const bed = takeBed(g);
  if (bed) syncLoops(bed);
  flushCues(g.sfx);
}

function flushCues(queue: Cue[]): void {
  if (typeof window === "undefined") {
    queue.length = 0;
    return;
  }
  const batch = queue.splice(0, queue.length);
  const names = new Set<string>();
  for (const cue of batch) {
    if (typeof cue === "string") {
      playArchiveSfx(cue);
      names.add(cue);
      continue;
    }
    if ("archive" in cue) {
      playArchiveAudio(cue.archive, cue.variant);
      continue;
    }
    names.add(weaponLaunchCue(cue.launch, cue.kind));
  }
  for (const name of names) playSfx(name);
}
