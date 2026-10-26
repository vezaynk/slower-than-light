import { augmentDef } from "@stl/pack";
import type { AugmentId, Game } from "../types.ts";

function fitted(g: Game, id: AugmentId): boolean {
  return g.augments.includes(id);
}

/** Augmentations, "FTL Augmentations", FTL Jammer: enemy jump time is doubled. */
export function enemyFtlScale(g: Game): number {
  if (!fitted(g, "FTL_JAMMER")) return 1;
  return augmentDef("FTL_JAMMER")?.value ?? 2;
}

/**
 * Augmentations, "Misc. Augmentations", Drone Recovery Arm.
 * Combat drones (Drone Control, Combat Drones): recovered after the ship fight.
 * Defense drones, including Hull Repair (Defensive Drones): recovered when the jump starts.
 * "Does not recover Boarding Drones, Ion Intruders, or hacking drones."
 * Crew drones are not external (Drone Control: they stay aboard). A hacking drone is the spike kit, not this target.
 * Hull Repair vanishes after 3–5 points, so jumping after 2 repairs (still out; the shortest job is 3) returns the part.
 * A drone that already broke apart is not retrieved. kit.on is that vanished state.
 * One part per drone: Augmentations, "Drone Recovery Arm": "Non-destroyed drones will be retrieved when jumping, allowing
 * their parts to be reused", and Drone Control: "Each deployment requires a drone part".
 * INFERRED: a live Hull Repair drone with 0 or 1 repairs is the same retrieve.
 * INFERRED: a jump while phase is combat and the enemy ship is still there is a flee, so a combat drone is not returned.
 * Any other jump is after that fight. The same jump clears the drone, so the part is not paid twice.
 */
const RECOVER_COMBAT = new Set(["COMBAT_1", "COMBAT_2", "COMBAT_BEAM", "COMBAT_BEAM_2", "fire"]);
const RECOVER_DEFENSE = new Set([
  "DEFENSE_1",
  "DEFENSE_2",
  "ANTI_DRONE",
  "DRONE_SHIELD",
  "DRONE_SHIELD_PLAYER",
  "SHIP_REPAIR",
]);

export function partsBack(g: Game): number {
  const kit = g.player.kits.drones;
  const target = kit?.target;
  const deployed = typeof target === "string" && target.length > 0 && !!kit?.on;
  if (!fitted(g, "DRONE_RECOVERY") || !deployed || kit === undefined || kit.power <= 0 || !target)
    return 0;
  if (RECOVER_DEFENSE.has(target)) return 1;
  if (RECOVER_COMBAT.has(target) && !(g.phase === "combat" && g.enemy)) return 1;
  return 0;
}

/**
 * Augmentations, "Offensive Augmentations", Hacking Stun:
 * crew in a room during a hacking pulse are stunned for that pulse.
 */
export function hackStuns(g: Game): boolean {
  return fitted(g, "HACKING_STUN");
}

/**
 * Augmentations, "Crew Augmentations", Backup DNA Bank:
 * crew stay in clone storage even if the system is off or broken.
 * True if fitted. The caller will keep a clone when the cradle is dark.
 */
export function helixHolds(g: Game): boolean {
  return fitted(g, "BACKUP_DNA");
}

/** Augmentations, "Crew Augmentations", Reconstructive Teleport: crew are fully healed by teleportation. */
export function mendOnSend(g: Game): boolean {
  return fitted(g, "TELEPORT_HEAL");
}

/**
 * Augmentations, "Misc. Augmentations", Lifeform Scanner:
 * life forms are detected even when sensors do not function.
 */
export function lampSees(g: Game): boolean {
  return fitted(g, "LIFE_SCANNER");
}
