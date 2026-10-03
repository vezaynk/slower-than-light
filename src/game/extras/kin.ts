/**
 * Crew lineages. Stat block is wiki page "Crew", section "Crew races comparison"
 * (that section transcludes the crew-races table), plus wiki page "Oxygen",
 * section "Overview", and the lead of wiki page "Fires".
 * The 2.128 line sits above "Dealing with fires"; Fires gives it no heading.
 * Wiki titles appear in comments only. `name` is the player-facing label.
 *
 * Oxygen, "Overview": suffocation starts at 5% O2 or less and deals 6.4 HP
 * per second. `suffocate` is the multiplier on that rate (1 = full rate).
 * Fires, lead paragraph: each fire deals 2.128 damage per second to non-immune
 * crew. `fireTaken` is the multiplier on that rate (1 = full rate).
 * Repair, combat, and movement are the comparison-table multipliers (human row = ×1).
 * A printed ×1 is stored as 1. Suffocate 1 and fireTaken 1 mean the full Oxygen or Fires rate;
 * those pages do not print that 1. INFERRED as the encoding only.
 * Rock fire immunity and Lanius suffocation immunity are stored as 0. The pages do not print 0.
 * INFERRED as the encoding only.
 */

export type KinId =
  | "plain"
  | "shell"
  | "spark"
  | "blade"
  | "gel"
  | "stone"
  | "voidlung"
  | "shard";

export type Kin = {
  name: string;
  hp: number;
  move: number;
  repair: number;
  fight: number;
  suffocate: number;
  fireTaken: number;
};

/**
 * plain — wiki page "Humans", lead: common and uninteresting, with no notable weaknesses.
 * Humans, "Race characteristics": -10% experience, which is not one of these fields.
 * Crew, "Crew races comparison": health 100, repair ×1, combat ×1, movement ×1.
 *
 * shell — wiki page "Engi", "Race characteristics": repair 200% (×2), combat 50% (×0.5).
 * The paragraph above that heading says they can still suffocate, so suffocate stays 1.
 * Crew, "Crew races comparison": health 100, movement ×1.
 *
 * spark — wiki page "Zoltans", "Race characteristics": health 70.
 * The death burst of 15 HP is on that list and on the comparison row, and is not one of these fields.
 * Crew, "Crew races comparison": repair, combat, and movement are ×1.
 *
 * blade — wiki page "Mantis", "Race characteristics": repair 50%, combat 150%, movement 120%.
 * Crew, "Crew races comparison": health 100.
 *
 * gel — wiki page "Slugs", "Race characteristics": mind-control immunity and room vision,
 * which are not these fields.
 * Crew, "Crew races comparison": the slug row matches the human row on every field here.
 *
 * stone — wiki page "Rockmen", "Race characteristics": health 150, movement 50%, immune to fire.
 * Fire-fighting 167% on that list is extinguish speed, not damage taken, so it is not `fireTaken`.
 * Immune to fire, so fireTaken is 0 (encoding note above).
 * The paragraph above "Race characteristics" says they take longer to suffocate;
 * that is the extra health, not a separate rate, so suffocate stays 1.
 * Crew, "Crew races comparison": repair ×1, combat ×1. Health 150 and movement ×0.5 match.
 *
 * voidlung — wiki page "Lanius", "Race characteristics": immune to suffocation,
 * drains a room at the rate of a breach. That drain is not a damage-taken stat.
 * Crew, "Crew races comparison": health 100, repair ×1, combat ×1.
 * Movement is cited on the field below.
 *
 * shard — wiki page "Crystal", "Race characteristics": health 125, movement 80%,
 * suffocation damage -50%. Fire-fighting 83% on that list is extinguish speed, not damage taken.
 * Crew, "Crew races comparison": repair ×1, combat ×1. Health, movement ×0.8, and the
 * suffocation cut match the Crystal page.
 */
export const KIN: Record<KinId, Kin> = {
  plain: {
    name: "Human",
    hp: 100,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
  },
  shell: {
    name: "Engi",
    hp: 100,
    move: 1,
    repair: 2,
    fight: 0.5,
    suffocate: 1,
    fireTaken: 1,
  },
  spark: {
    name: "Zoltan",
    hp: 70,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
  },
  blade: {
    name: "Mantis",
    hp: 100,
    move: 1.2,
    repair: 0.5,
    fight: 1.5,
    suffocate: 1,
    fireTaken: 1,
  },
  gel: {
    name: "Slug",
    hp: 100,
    move: 1,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 1,
  },
  stone: {
    name: "Rock",
    hp: 150,
    move: 0.5,
    repair: 1,
    fight: 1,
    suffocate: 1,
    fireTaken: 0,
  },
  voidlung: {
    name: "Lanius",
    hp: 100,
    // Crew, "Crew races comparison": movement ×0.85. Lanius, "Race characteristics": 85%.
    // INFERRED against an in-game tooltip: that column's footnote says the speed
    // is not specified in-game and was measured by testing crew speed.
    move: 0.85,
    repair: 1,
    fight: 1,
    suffocate: 0,
    fireTaken: 1,
  },
  shard: {
    name: "Crystal",
    hp: 125,
    move: 0.8,
    repair: 1,
    fight: 1,
    suffocate: 0.5,
    fireTaken: 1,
  },
};

export function kinOf(id: KinId): Kin {
  return KIN[id];
}
