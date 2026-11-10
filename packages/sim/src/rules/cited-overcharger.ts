/**
 * Wiki page "Drone Control", sections "Shield Overcharger" and "Shield Overcharger +".
 * The caller in swarm.ts adds one Zoltan Shield point when a printed wait finishes.
 * No wait is printed for 5 or more existing layers.
 * "Speed: 5" is the same flight figure as Defense Drone Mark I and the Anti-Combat Drone.
 * INFERRED: that figure is not seconds. This drone never leaves its orbit and never fires,
 * so the number does not change the printed waits. Shield Overcharger + is "Totally identical"
 * apart from power, so it uses the same speed.
 * SwarmKind is not extended. Neither schematic is stocked as the plus: the plus is not a blueprint.
 * Shield Overcharger + prints "Sells for: 30 (cannot be bought or found)."
 * A fitted copy quotes that 30. A copy in cargo that is not fielded quotes the same 30.
 * The schematic is not stocked.
 *
 * Numbers:
 * - power is the droneBlueprint `<power>` (`droneDef`). The plus has no blueprint, so 2 is the fallback.
 * - speed is `<speed>` on DRONE_SHIELD. It is not a layer wait.
 * - the five waits are gap `<overchargerWaits layer0…layer4>` (`overchargerLayerSeconds`).
 */
import { droneDef, overchargerLayerSeconds, warnPack } from "@stl/pack";

/** FTL's power when the blueprint omits `<power>`. The plus is not in the archive. */
const FTL_POWER = { DRONE_SHIELD: 3, DRONE_SHIELD_PLAYER: 2 } as const;

/** Bars the schematic needs. The blueprint's `<power>` wins. A missing blueprint warns and uses FTL's. */
export function overchargerPower(id: "DRONE_SHIELD" | "DRONE_SHIELD_PLAYER"): number {
  const packed = droneDef(id)?.power;
  if (packed != null && packed > 0) return packed;
  const fallback = FTL_POWER[id];
  warnPack(`No droneBlueprint ${id} <power> is loaded; FTL's ${fallback} is used.`);
  return fallback;
}

/**
 * Drone Control, Shield Overcharger: "Speed: 5". The droneBlueprint `<speed>`. Not a layer wait.
 * Shield Overcharger + prints the same 5 and has no blueprint of its own, so it reads this one.
 */
export function overchargerSpeed(): number {
  const packed = droneDef("DRONE_SHIELD")?.speed;
  if (packed != null && packed > 0) return packed;
  warnPack("No droneBlueprint DRONE_SHIELD <speed> is loaded; FTL's 5 is used.");
  return 5;
}

/**
 * Seconds for `layers` existing layers, or null when the table has no row (5 or more).
 * Gap `<overchargerWaits>`. "Each timer resets should the drone become unpowered" is the caller.
 */
export function overchargerWait(layers: number): number | null {
  return overchargerLayerSeconds(layers) ?? null;
}

/**
 * "Sells for: 30 (cannot be bought or found)." Not a store row.
 * A fitted drone quotes it. A cargo copy that is not fielded quotes the same 30.
 * FTL sells a drone for half its blueprint cost. This schematic is not in the archive, so the
 * printed 30 stays the quote rather than a gap number or a duplicated cost.
 */
export const OVERCHARGER_PLUS_SELL = 30;
