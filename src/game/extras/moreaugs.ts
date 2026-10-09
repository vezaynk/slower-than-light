import type { AugmentId, Game } from "../types.ts";

function fitted(g: Game, id: AugmentId): boolean {
  return g.augments.includes(id);
}

/** Augmentations, "FTL Augmentations", FTL Jammer: enemy jump time is doubled. */
export function enemyFtlScale(g: Game): number {
  return fitted(g, "jammer") ? 2 : 1;
}

/**
 * Augmentations, "Misc. Augmentations", Drone Recovery Arm.
 * Combat drones (Drone Control, Combat Drones): recovered after the ship fight.
 * Defense drones, including Hull Repair (Defensive Drones): recovered when the jump starts.
 * "Does not recover Boarding Drones, Ion Intruders, or hacking drones."
 * Crew drones are not external (Drone Control: they stay aboard). A hacking drone is the spike kit, not this target.
 * Hull Repair vanishes after 3–5 points, so jumping after 2 repairs (still out; the shortest job is 3) returns the part.
 * A drone that already broke apart is not retrieved. kit.on is that vanished state.
 * INVENTED: the page never states a part count. One part is returned.
 * INFERRED: a live Hull Repair drone with 0 or 1 repairs is the same retrieve.
 * INFERRED: a jump while phase is combat and the enemy ship is still there is a flee, so a combat drone is not returned.
 * Any other jump is after that fight. The same jump clears the drone, so the part is not paid twice.
 */
const RECOVER_COMBAT = new Set(["striker", "combat2", "beam", "beam2", "fire"]);
const RECOVER_DEFENSE = new Set(["ward", "ward2", "wardcut", "overcharger", "overchargerplus", "hull"]);

export function partsBack(g: Game): number {
  const kit = g.player.kits.swarm;
  const target = kit?.target;
  const deployed = typeof target === "string" && target.length > 0 && kit.on;
  if (!fitted(g, "recover") || !deployed || kit === undefined || kit.power <= 0 || !target) return 0;
  if (RECOVER_DEFENSE.has(target)) return 1;
  if (RECOVER_COMBAT.has(target) && !(g.phase === "combat" && g.enemy)) return 1;
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
