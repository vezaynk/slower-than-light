/**
 * Augmentations, "Defense Scrambler":
 * "Affects only Defense Drone I and II and Anti-Combat Drone."
 * Those three are SwarmKind "ward", "ward2", and "wardcut".
 * The section names no other drone. This does not check that the augment is installed.
 */
const BLOCKED = new Set(["ward", "ward2", "wardcut"]);

export function scramblerBlocks(kind: string): boolean {
  return BLOCKED.has(kind);
}
