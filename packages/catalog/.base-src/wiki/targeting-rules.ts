import type { AiTarget } from "@stl/pack";

/**
 * xftl combat-ai, PrioritizeSystem (linked from Cloaking and Door System), checked against the developer list in
 * "Hard mode AI Targeting mechanics" (reddit r/ftlgame 7pmz3j):
 * Easy/Normal: "there's a 33%/20% (for normal/easy respectively) to pick a system to target".
 * Hard: "50%: Don't target a system, return null / 25%: Pick a random system / 25%: Pick a high-priority system".
 * The Hard list: Engines and Piloting "if ship has >25% dodge"; Oxygen "if average oxygen is <50%"; Artillery
 * "yes if < 4sec of total charge" (xftl's reading of the code; the developers' list says "Within 4 seconds of firing").
 *
 * The gap mod writes these as `<aiTarget easy normal hardRoom hardAny evasion oxygen artillery>`.
 * Swarm missile room percents are not here. They are the printed result of `<radius>` already on MISSILE_CHARGEGUN.
 */
export const AI_TARGET: Required<AiTarget> = {
  easy: 0.2,
  normal: 0.33,
  hardRoom: 0.5,
  hardAny: 0.25,
  evasion: 25,
  oxygen: 50,
  artillery: 4,
};
