/**
 * Wiki page "Rockmen", section "Race characteristics": Fire-fighting speed: 167%.
 * life() multiplies that Rock's share of the inferred per-crew extinguish by this scale.
 * Fire Suppression is not multiplied.
 */
export function rockExtinguishScale(): number {
  // Fire-fighting speed: 167%
  return 1.67;
}
