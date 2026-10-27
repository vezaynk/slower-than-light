/**
 * Schematics player Drone Control can fly. Swarm owns the flight code.
 * This list stays here so a hull reader can name the ones it cannot fly
 * without importing the sim.
 */
const SWARM_KINDS = new Set([
  "DEFENSE_1",
  "DEFENSE_2",
  "ANTI_DRONE",
  "COMBAT_1",
  "COMBAT_BEAM",
  "BOARDER",
  "REPAIR",
  "SHIP_REPAIR",
]);

const ALSO_FLOWN = new Set([
  "COMBAT_2",
  "COMBAT_BEAM_2",
  "COMBAT_FIRE",
  "COMBAT_ION",
  "COMBAT_MISSILE",
  "BOARDER_ION",
  "DRONE_SHIELD",
  "DRONE_SHIELD_PLAYER",
  "BOSS_DEFENSE_2",
  "DRONE_HACKING",
]);

/** True when player Drone Control can deploy this blueprint. The Anti-Personnel Drone stays off the list. */
export function canFlyDrone(kind: string): boolean {
  return SWARM_KINDS.has(kind) || ALSO_FLOWN.has(kind);
}
