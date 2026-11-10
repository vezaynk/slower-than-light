import "../pack/base.ts";
import { crewDef } from "@stl/pack";
import type { Crew } from "../types.ts";

/**
 * Wiki page "Zoltans", section "Race characteristics": adds 1 power bar to an
 * occupied system. Each living crew member whose definition has bonusPower
 * contributes that many bars. A Zoltan is bonusPower 1. Does not write reactor power.
 */
export function citedZoltanPower(
  crew: readonly Pick<Crew, "kin" | "hp" | "room">[],
  systemRoom: string,
): number {
  let bars = 0;
  for (const member of crew) {
    if (member.hp <= 0 || member.room !== systemRoom) continue;
    const bonus = crewDef(member.kin).bonusPower;
    if (bonus > 0) bars += bonus;
  }
  return bars;
}
