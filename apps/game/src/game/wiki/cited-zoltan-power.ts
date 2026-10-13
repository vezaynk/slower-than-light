import type { Crew } from "../types.ts";

/**
 * Wiki page "Zoltans", section "Race characteristics": adds 1 power bar to an
 * occupied system. Each living spark whose room id is that system room
 * contributes this 1. Does not write reactor power.
 */
const POWER_BAR = 1;

export function citedZoltanPower(
  crew: readonly Pick<Crew, "kin" | "hp" | "room">[],
  systemRoom: string,
): number {
  let bars = 0;
  for (const member of crew) {
    if (member.kin !== "spark" || member.hp <= 0 || member.room !== systemRoom) continue;
    bars += POWER_BAR;
  }
  return bars;
}
