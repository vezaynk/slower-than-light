/**
 * Two racial traits the kin stat block (extras/kin.ts) does not carry.
 *
 * Lanius oxygen drain.
 * Lanius, "Race characteristics": "Drains oxygen from an occupied room (at the rate of a breach)".
 * Lanius, lead: "They drain Oxygen about as fast as a hull breach in a single square."
 * Template:Crew races (comparison), Lanius row: "Drains oxygen from an occupied room".
 *
 * Human experience.
 * Humans, "Race characteristics": "-10% experience requirements", with a printed
 * "Human XP/level" column. Template:Crew races (comparison), Human row: "-10% experience requirements".
 */
import { XP_NEED } from "../content.ts";
import { BREACH_C } from "../air.ts";
import type { Crew, Game, SkillName } from "../types.ts";

/**
 * Lanius, lead: "They drain Oxygen about as fast as a hull breach in a single square." In the air model (air.ts, sim.ts
 * airflow) each living Lanius is a breach-sized hole (BREACH_C) in the room it stands in, on either hull; several
 * stack. Suffocation immunity stays in kin.ts (`suffocate: 0`).
 */
export const LANIUS_HOLE_C = BREACH_C;

/** The Lanius drain now runs inside airflow (air.ts). Kept so the existing tick order does not change. */
export function tickLanius(_g: Game, _dt: number) {}

/**
 * Humans, "Race characteristics", "Human XP/level" column, and Crew skills, Skills table parentheses:
 * Piloting 13, Engines 13, Shields 50, Weapons 58, Repair 16, Combat 7.
 * These are the printed values. A flat 0.9 × XP_NEED would give 13.5, 49.5, 58.5,
 * 16.2, 7.2, and the page rounds them inconsistently, so the table is used as printed.
 */
export const HUMAN_XP_NEED: Record<SkillName, number> = {
  pilot: 13,
  engines: 13,
  shields: 50,
  weapons: 58,
  repair: 16,
  combat: 7,
};

/**
 * Human means kin "plain" (kin.ts names that row "Human") or no kin at all
 * (types.ts: "Absent means the baseline row", which is the plain row).
 * INFERRED: absent kin counts as human.
 */
export function isHuman(c: Crew): boolean {
  return c.kin === undefined || c.kin === "plain";
}

/**
 * XP per rank for this crew member: the Human column for humans, one shared table for everyone else.
 * Crew skills, lead: "All crew races require the same amount of experience to achieve the next skill level,
 * except for humans who have slightly reduced skill points requirements."
 * The shared table's numbers in content.ts stay INFERRED.
 */
export function xpNeedFor(c: Crew, skill: SkillName): number {
  return isHuman(c) ? HUMAN_XP_NEED[skill] : XP_NEED[skill];
}
