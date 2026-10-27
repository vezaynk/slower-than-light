/**
 * Crew lineages. Numbers come from the loaded crew blueprint, after the gap overlay.
 */
import "../pack/base.ts";
import { crewDef } from "@stl/pack";

export type KinId =
  "human" | "engi" | "energy" | "mantis" | "slug" | "rock" | "anaerobic" | "crystal";

export type Kin = {
  name: string;
  hp: number;
  move: number;
  repair: number;
  fight: number;
  suffocate: number;
  fireTaken: number;
};

/** The loaded race. A missing id reads the human row. */
export function kinOf(id: KinId): Kin {
  const row = crewDef(id);
  return {
    name: row.name,
    hp: row.hp,
    move: row.move,
    repair: row.repair,
    fight: row.fight,
    suffocate: row.suffocate,
    fireTaken: row.fireTaken,
  };
}
