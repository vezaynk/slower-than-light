import { droneDef, warnPack, weaponDef } from "@stl/pack";

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

/** Ids the enemy side of swarm.ts names beside the player's: class-table and alias ids it flies by name. */
const ENEMY_NAMED = new Set(["fire", "personnel", "BATTLE", "DEFENSE_2_ENEMY"]);

/**
 * droneBlueprint `<type>` to the id whose flight code runs it. FTL's executable flies a drone by its type; the
 * archive picks the gun (`<weaponBlueprint>`), power, and speed. A COMBAT drone with a BEAM gun sweeps like the
 * Anti-Ship Beam Drone; any other COMBAT drone orbits and fires like Combat Drone Mark I.
 */
const BY_TYPE: Record<string, string> = {
  COMBAT: "COMBAT_1",
  DEFENSE: "DEFENSE_1",
  BOARDER: "BOARDER",
  SHIELD: "DRONE_SHIELD",
  REPAIR: "REPAIR",
  SHIP_REPAIR: "SHIP_REPAIR",
  BATTLE: "personnel",
  HACKING: "DRONE_HACKING",
};

const warned = new Set<string>();

/**
 * The id swarm.ts flies this schematic as: the id itself when the drone code names it, otherwise the flight code of
 * its droneBlueprint `<type>`. Power and the gun still come from the schematic's own blueprint.
 * Undefined, with a pack warning, for a blueprint that is missing or has a type no flight code runs.
 */
export function flownAs(kind: string): string | undefined {
  if (SWARM_KINDS.has(kind) || ALSO_FLOWN.has(kind) || ENEMY_NAMED.has(kind)) return kind;
  const def = droneDef(kind);
  const type = def?.type?.toUpperCase();
  let as = type ? BY_TYPE[type] : undefined;
  if (as === "COMBAT_1" && def?.weapon && weaponDef(def.weapon)?.kind === "beam")
    as = "COMBAT_BEAM";
  if (!as && !warned.has(kind)) {
    warned.add(kind);
    warnPack(
      def
        ? `droneBlueprint ${kind}: type ${def.type ?? "(none)"} has no flight code; the drone stays stowed.`
        : `drone ${kind}: no droneBlueprint of that name; the drone stays stowed.`,
    );
  }
  return as;
}
