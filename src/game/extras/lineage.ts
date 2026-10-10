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
import type { Crew, Game, SkillName } from "../types.ts";

/**
 * One hull breach, percent of a room's oxygen per second.
 * Oxygen, Overview, and Boarding, "Breach Bomb": a functioning Oxygen-3 (8.4%/s) exceeds one
 * breach with the room's doors shut, and it can take a while to refill a fully vented room.
 * Oxygen, Overview: Oxygen-2 (4.8%/s) does not; it needs adjacent rooms or a long open path.
 * The pages print no breach percent. 12%/s sits above 8.4, so a shut Oxygen-3 room still emptied.
 * 7.2 is six times the 1.2% step, inside (4.8, 8.4), and leaves Oxygen-3 a 1.2%/s surplus.
 */
export const BREACH_O2_PER_SEC = 7.2;

/** Lanius, "Race characteristics": the drain is one breach. Same number as BREACH_O2_PER_SEC. */
export const LANIUS_DRAIN_PER_SEC = BREACH_O2_PER_SEC;

/**
 * Lanius drain: each living Lanius takes one breach's worth of oxygen per second
 * from the room it is in, on whichever ship it stands (crew and boarders alike).
 * INFERRED: several Lanius in one room stack, one breach each. The pages say only
 * "Drains oxygen from an occupied room" and give the rate per Lanius as a breach.
 * INFERRED: a walking Lanius drains its current `room` too. The pages do not say
 * whether the drain pauses while moving.
 * Clamped at 0. Suffocation immunity stays in kin.ts (`suffocate: 0`).
 * Runs from tickExtras, after airflow has already clamped the rooms.
 */
export function tickLanius(g: Game, dt: number) {
  if (dt <= 0) return;
  for (const c of g.crew) {
    if (c.kin !== "voidlung" || c.hp <= 0) continue;
    const ship = c.aboard === "player" ? g.player : g.enemy;
    const room = ship?.rooms.find((r) => r.id === c.room);
    if (!room) continue;
    room.o2 = Math.max(0, room.o2 - LANIUS_DRAIN_PER_SEC * dt);
  }
}

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
