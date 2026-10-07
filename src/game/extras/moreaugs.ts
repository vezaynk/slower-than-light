import type { AugmentId, Game } from "../types.ts";

function fitted(g: Game, id: AugmentId): boolean {
  return g.augments.includes(id);
}

/** Augmentations, "FTL Augmentations", FTL Jammer: enemy jump time is doubled. */
export function enemyFtlScale(g: Game): number {
  return fitted(g, "jammer") ? 2 : 1;
}

/**
 * Augmentations, "Misc. Augmentations", Drone Recovery Arm:
 * non-destroyed drones are retrieved on a jump so their parts can be reused.
 * Hull Repair: the drone vanishes after 3–5 points, so jumping after 2 repairs
 * (it is still out; the shortest job is 3) returns the part and those repairs are free.
 * A drone that already broke apart is not retrieved. kit.on is that vanished state.
 * INVENTED: the page never states a part count. One part is returned.
 * INFERRED: a live Hull Repair drone with 0 or 1 repairs is the same retrieve.
 */
export function partsBack(g: Game): number {
  const kit = g.player.kits.swarm;
  const target = kit?.target;
  const deployed = typeof target === "string" && target.length > 0 && kit.on;
  if (fitted(g, "recover") && deployed && kit !== undefined && kit.power > 0) return 1;
  return 0;
}

/**
 * Augmentations, "Offensive Augmentations", Hacking Stun:
 * crew in a room during a hacking pulse are stunned for that pulse.
 */
export function hackStuns(g: Game): boolean {
  return fitted(g, "stun");
}

/**
 * Augmentations, "Crew Augmentations", Backup DNA Bank:
 * crew stay in clone storage even if the system is off or broken.
 * True if fitted. The caller will keep a clone when the cradle is dark.
 */
export function helixHolds(g: Game): boolean {
  return fitted(g, "dna");
}

/** Augmentations, "Crew Augmentations", Reconstructive Teleport: crew are fully healed by teleportation. */
export function mendOnSend(g: Game): boolean {
  return fitted(g, "mend");
}

/**
 * Augmentations, "Misc. Augmentations", Lifeform Scanner:
 * life forms are detected even when sensors do not function.
 */
export function lampSees(g: Game): boolean {
  return fitted(g, "pulseeye");
}
