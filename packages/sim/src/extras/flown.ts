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
const ENEMY_NAMED = new Set(["fire", "personnel", "BATTLE"]);

/** The three defense flight codes. Each one is a screen: what it shoots down, not how it looks. */
export type DefenseAs = "DEFENSE_1" | "DEFENSE_2" | "ANTI_DRONE";

const DEFENSE_CODES = new Set<string>(["DEFENSE_1", "DEFENSE_2", "ANTI_DRONE"]);

/**
 * A DEFENSE droneBlueprint's `<target>` to its screen. ftl.dat writes LASERS on DEFENSE_2 and DEFENSE_2_ENEMY (the
 * Mark II also shoots lasers and ions) and DRONES on ANTI_DRONE (it shoots drones only). DEFENSE_1 and BOSS_DEFENSE_2
 * write none: the Mark I screen of missiles, asteroids, and drones in flight.
 */
const BY_TARGET: Record<string, DefenseAs> = { LASERS: "DEFENSE_2", DRONES: "ANTI_DRONE" };

const warnedTarget = new Set<string>();

/**
 * The defense screen this schematic flies, read from its droneBlueprint: `<type>` DEFENSE, then `<target>`. FTL keys
 * the screen on those two fields, not the id, so ftl.dat's DEFENSE_2_ENEMY screens like DEFENSE_2 and BOSS_DEFENSE_2
 * ("Defense Drone Mark II" by title, no `<target>`) like DEFENSE_1. Its cooldown, gun, power, and picture stay its own.
 * An id with no blueprint, or one whose blueprint omits `<type>`, keeps the screen the code names for that id.
 * Undefined for any other drone.
 */
export function defenseAs(kind: string | null | undefined): DefenseAs | undefined {
  if (!kind) return undefined;
  const def = droneDef(kind);
  const type = def?.type?.trim().toUpperCase();
  if (!type) return DEFENSE_CODES.has(kind) ? (kind as DefenseAs) : undefined;
  if (type !== "DEFENSE") return undefined;
  const target = def?.target?.trim().toUpperCase();
  if (!target) return "DEFENSE_1";
  const as = BY_TARGET[target];
  if (as) return as;
  if (!warnedTarget.has(kind)) {
    warnedTarget.add(kind);
    warnPack(
      `droneBlueprint ${kind}: target ${def?.target} is not LASERS or DRONES; it screens like DEFENSE_1.`,
    );
  }
  return "DEFENSE_1";
}

/**
 * droneBlueprint `<type>` to the id whose flight code runs it. FTL's executable flies a drone by its type; the
 * archive picks the gun (`<weaponBlueprint>`), power, and speed. A COMBAT drone with a BEAM gun sweeps like the
 * Anti-Ship Beam Drone; any other COMBAT drone orbits and fires like Combat Drone Mark I.
 */
const BY_TYPE: Record<string, string> = {
  COMBAT: "COMBAT_1",
  BOARDER: "BOARDER",
  SHIELD: "DRONE_SHIELD",
  REPAIR: "REPAIR",
  SHIP_REPAIR: "SHIP_REPAIR",
  BATTLE: "personnel",
  HACKING: "DRONE_HACKING",
};

const warned = new Set<string>();

/** True for a Defense Drone Mark I or II screen (missiles and more), by blueprint. The Anti-Combat Drone is not one. */
export function projectileScreen(kind: string | null | undefined): boolean {
  const as = defenseAs(kind);
  return as === "DEFENSE_1" || as === "DEFENSE_2";
}

/**
 * The id swarm.ts flies this schematic as. A DEFENSE drone flies its `<target>` screen (defenseAs). Otherwise it is
 * the id itself when the drone code names it, or the flight code of its droneBlueprint `<type>`. Power and the gun
 * still come from the schematic's own blueprint.
 * Undefined, with a pack warning, for a blueprint that is missing or has a type no flight code runs.
 */
export function flownAs(kind: string): string | undefined {
  const defense = defenseAs(kind);
  if (defense) return defense;
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
