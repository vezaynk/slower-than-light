/**
 * Crew lineages. Stat block is the races comparison on wiki page "Crew",
 * plus the shared damage rates on wiki pages "Oxygen" and "Fires".
 * Wiki titles appear in comments only. `name` is the player-facing label.
 *
 * Wiki page "Oxygen": suffocation starts at 5% O2 or less and deals 6.4 HP
 * per second. `suffocate` is the multiplier on that rate (1 = full rate).
 * Wiki page "Fires": each fire deals 2.128 damage per second to non-immune
 * crew. `fireTaken` is the multiplier on that rate (1 = full rate).
 * Repair, combat, and movement are the table multipliers (human row = 1).
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
 * plain — wiki page "Humans".
 * The Humans page calls them common and uninteresting, with no notable weaknesses.
 * The Crew table gives them no special health, repair, combat, movement, suffocation,
 * or fire stat: every multiplier is the baseline. The only numeric perk on that row
 * is -10% experience, which is not one of these fields.
 *
 * shell — wiki page "Engi". Repair ×2, combat ×0.5, movement ×1, health 100.
 * The Engi page says they can still suffocate, so suffocate stays 1.
 *
 * spark — wiki page "Zoltans". Health 70. Repair, combat, and movement are ×1.
 * The death burst of 15 HP is on the Crew row and is not one of these fields.
 *
 * blade — wiki page "Mantis". Repair 50%, combat 150%, movement 120%, health 100.
 *
 * gel — wiki page "Slugs". The Crew table matches the human row on every field here.
 * Mind-control immunity and room vision are on that row and are not these fields.
 *
 * stone — wiki page "Rockmen". Health 150, movement 50%, immune to fire.
 * Repair and combat are ×1 on the Crew table. The Rockmen page says they take longer
 * to suffocate; that is the extra health, not a separate rate, so suffocate stays 1.
 * Fire-fighting 167% is extinguish speed, not damage taken, so it is not `fireTaken`.
 *
 * voidlung — wiki page "Lanius". Immune to suffocation. Health 100.
 * Repair and combat are ×1. They drain a room's oxygen at the rate of a breach;
 * that drain is not a damage-taken stat.
 *
 * shard — wiki page "Crystal". Health 125, movement 80%, suffocation damage -50%.
 * Repair and combat are ×1. Fire-fighting 83% is extinguish speed, not damage taken.
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
    // INFERRED: Crew table prints movement ×0.85, but footnote 5 says the
    // speed is not specified in-game and was measured by testing crew speed.
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
