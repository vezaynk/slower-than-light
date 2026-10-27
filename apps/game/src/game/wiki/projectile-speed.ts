import "../pack/base.ts";
import { weaponDef } from "@stl/pack";
import type { WeaponKind } from "../types.ts";

/**
 * Speed column on Template:Laser weapons, Template:Flak weapons, Template:Ion weapons,
 * Template:Missile weapons, and Template:Crystal weapons.
 * The same unit as a beam: pixels per 1/16 of a second, so pixels per second are speed × 16.
 * "Weapons timing and travel times" lists no seconds.
 * INFERRED: speed 60, the common laser, keeps the 0.7s flight this sim already used.
 * Every other printed speed scales from that. seconds = 42 / speed.
 * Bombs have no speed column. They teleport, and the 1.35s delay stays.
 * Dart is an invented missile with no row, so it keeps that same 1.35s.
 */
export const LASER_FLIGHT_S = 0.7;
export const LASER_SPEED = 60;
export const BOMB_FLIGHT_S = 1.35;

/**
 * Stand-in id for Flak Artillery. A real archive names the same gun `ARTILLERY_FED_C`.
 * Template:Flak weapons prints speed 26 for that gun. Speed 60 stays 0.7s, so 26 is 42/26 seconds.
 */
const FLAK_ARTILLERY_SPEED = 26;

function positiveSpeed(defId: string): number | null {
  const weapon = weaponDef(defId);
  if (!weapon || weapon.kind === "beam" || !(weapon.speed != null && weapon.speed > 0)) return null;
  return weapon.speed;
}

/**
 * Seconds for the blueprint's `<speed>`, or null when that weapon has no projectile speed.
 * Beams carry a swipe speed and fly on their own clock. Bombs and the invented dart have none.
 * Flak Artillery keeps speed 26 when the loaded archive uses the other id, or neither blueprint.
 */
export function projectileFlightSeconds(defId: string | undefined): number | null {
  if (!defId) return null;
  const speed = flightSpeed(defId);
  if (speed == null) return null;
  return (LASER_SPEED * LASER_FLIGHT_S) / speed;
}

function flightSpeed(defId: string): number | null {
  if (defId !== "flak-artillery" && defId !== "ARTILLERY_FED_C") return positiveSpeed(defId);
  const other = defId === "flak-artillery" ? "ARTILLERY_FED_C" : "flak-artillery";
  return positiveSpeed(defId) ?? positiveSpeed(other) ?? FLAK_ARTILLERY_SPEED;
}

/** Flight for a non-beam shot. Beams use beamFlightSeconds. */
export function shotFlightSeconds(kind: WeaponKind, defId: string): number {
  if (kind === "bomb") return BOMB_FLIGHT_S;
  const printed = projectileFlightSeconds(defId);
  if (printed != null) return printed;
  if (kind === "missile") return BOMB_FLIGHT_S;
  return LASER_FLIGHT_S;
}
