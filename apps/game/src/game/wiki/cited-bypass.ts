/**
 * Augmentations, section "Zoltan Shield Bypass".
 * "Allows crew/bomb teleportation and mind control to work through Zoltan Shields."
 * "Hacking drones still cannot be launched and will be destroyed if it comes into contact with a Zoltan Shield".
 * "Boarding drones can be launched but will be destroyed upon contact with a Zoltan Shield."
 * Purchase price 55 is id "bypass" on AugmentId and in the catalog. Callers check that it is installed.
 * This table does not check whether the augment is installed and does not spend shield points.
 */
export type BypassKind = "crew" | "bomb" | "mind" | "hack" | "board";

const BYPASS = {
  crew: "pass",
  bomb: "pass",
  mind: "pass",
  hack: "destroyed",
  board: "launch-then-destroyed",
} as const satisfies Record<BypassKind, "pass" | "destroyed" | "launch-then-destroyed">;

export function bypassZoltan(kind: BypassKind): "pass" | "destroyed" | "launch-then-destroyed" {
  return BYPASS[kind];
}
