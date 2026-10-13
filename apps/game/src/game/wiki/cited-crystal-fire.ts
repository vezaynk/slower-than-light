/**
 * Wiki page "Crystal", section "Race characteristics": Fire-fighting speed: 83%.
 * life() multiplies that Crystal's share of the inferred per-crew extinguish by this scale.
 * Fire Suppression is not multiplied.
 */
export function crystalExtinguishScale(): number {
  // Fire-fighting speed: 83%
  return 0.83;
}
