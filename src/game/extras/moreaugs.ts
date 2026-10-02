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
 * "destroyed" is not tracked, so this refunds any still-powered deployed drone.
 * INVENTED: the page never states a part count. One part is returned.
 */
export function partsBack(g: Game): number {
  const kit = g.player.kits.swarm;
  const target = kit?.target;
  const deployed = typeof target === "string" && target.length > 0;
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
