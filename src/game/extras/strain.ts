/**
 * Wiki page "Difficulty".
 * The page has no article text and no section headings (missing title).
 * Scrap rewards: not stated.
 * Fuel: not stated.
 * Missile prices: not stated.
 * Enemy weapon charge: not stated.
 * Crew HP: not stated.
 * Fleet speed: not stated.
 * No numeric fields are encoded. Nothing here is INFERRED from other pages.
 */

export type StrainId = "calm" | "even" | "harsh";

/** Player-facing label only. The Difficulty page states no numbers. */
export type Strain = {
  name: string;
};

export const STRAIN: Record<StrainId, Strain> = {
  calm: { name: "Calm" },
  even: { name: "Even" },
  harsh: { name: "Harsh" },
};

export function strainOf(id: StrainId): Strain {
  return STRAIN[id];
}
