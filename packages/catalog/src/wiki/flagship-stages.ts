/**
 * The Rebel Flagship's stages for the stand-in's BOSS_* blueprints, from wiki page "The Rebel Flagship" ("1st Stage",
 * "2nd stage", "Final stage": "General" and "Systems"). Every difficulty shares a stage's numbers, as ftl.dat's
 * blueprints do. The artillery pods are written at the page's "Weapons" system level.
 */
export type FlagshipStage = {
  health: number;
  reactor: number;
  /** System id, as a blueprint's systemList spells it, to its level. */
  systems: Record<string, number>;
  /** The artillery level of every pod on the stage. */
  artillery: number;
  missiles: number;
  parts: number;
  /**
   * The droneList, in the order Drone Control powers it. "2nd stage" / "Drones": "Combat Drone Mark I (2), Anti-Ship
   * Beam Drone I (2), Defense Drone Mark I (2), Boarding Drone (Boss) (2)". "Handling phase 2 drones": "the Boarding
   * Drone is the first drone to go down. Further damage will take the regular beam and combat drones offline ... and
   * finally the defense drone", so the defense drone is listed first and the boarding drone last.
   */
  drones?: string[];
};

export const FLAGSHIP_STAGES: Record<1 | 2 | 3, FlagshipStage> = {
  1: {
    health: 20,
    reactor: 42,
    systems: {
      pilot: 3,
      shields: 8,
      doors: 3,
      cloaking: 2,
      medbay: 3,
      engines: 2,
      oxygen: 2,
      hacking: 3,
    },
    artillery: 3,
    missiles: 10,
    parts: 10,
  },
  2: {
    health: 22,
    reactor: 44,
    systems: { pilot: 3, shields: 8, medbay: 3, engines: 3, oxygen: 2, drones: 8 },
    artillery: 3,
    missiles: 10,
    parts: 10,
    drones: ["DEFENSE_1", "COMBAT_1", "COMBAT_BEAM", "BOARDER_BOSS"],
  },
  3: {
    health: 20,
    reactor: 32,
    systems: { pilot: 3, shields: 8, teleporter: 2, medbay: 3, engines: 6, oxygen: 2, mind: 3 },
    artillery: 4,
    missiles: 10,
    parts: 10,
  },
};
