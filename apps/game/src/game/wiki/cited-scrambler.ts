/**
 * Augmentations, "Defense Scrambler":
 * "Affects only Defense Drone I and II and Anti-Combat Drone."
 * Those three are SwarmKind "DEFENSE_1", "DEFENSE_2", and "ANTI_DRONE".
 * The section names no other drone. This does not check that the augment is installed.
 */
const BLOCKED = new Set(["DEFENSE_1", "DEFENSE_2", "ANTI_DRONE"]);

export function scramblerBlocks(kind: string): boolean {
  return BLOCKED.has(kind);
}
