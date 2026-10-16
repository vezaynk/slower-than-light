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

/** Printed projectile speed for each fitted weapon id. */
export const PROJECTILE_SPEED: Record<string, number> = {
  // Template:Laser weapons. Hull Laser I is 75 and Hull Laser II is 90. The rest of the laser rows are 60.
  LASER_BURST_1: 60,
  LASER_BURST_2: 60,
  LASER_BURST_2_A: 60,
  LASER_BURST_3: 60,
  LASER_BURST_5: 60,
  LASER_HEAVY_1: 60,
  LASER_HEAVY_1_SP: 60,
  LASER_HEAVY_2: 60,
  LASER_HULL_1: 75,
  LASER_HULL_2: 90,
  LASER_CHAINGUN: 60,
  LASER_CHAINGUN_2: 60,
  LASER_CHARGEGUN_PLAYER: 60,
  LASER_CHARGEGUN: 60,
  LASER_CHARGEGUN_2: 60,
  ARTILLERY_BOSS_1: 60,
  // Template:Flak weapons. Advanced Flak, Flak I, Flak II, and Flak Artillery are 26.
  SHOTGUN: 26,
  SHOTGUN_PLAYER: 26,
  SHOTGUN_2: 26,
  "flak-artillery": 26,
  // Template:Ion weapons. Heavy Ion and Boss Ion are 40. The other ion rows are 30.
  ION_1: 30,
  ION_4: 30,
  ION_2: 40,
  ION_STUN: 30,
  ION_CHARGEGUN: 30,
  ION_CHAINGUN: 30,
  ARTILLERY_BOSS_4: 40,
  // Template:Missile weapons. Swarm is 45. The other missile rows are 35.
  MISSILES_1: 35,
  MISSILES_2_PLAYER: 35,
  MISSILES_2: 35,
  MISSILES_3: 35,
  MISSILES_BREACH: 35,
  MISSILES_HULL: 35,
  MISSILE_CHARGEGUN: 45,
  MISSILES_BURST: 35,
  ARTILLERY_BOSS_2: 35,
  // Template:Crystal weapons. Each row is 50.
  CRYSTAL_BURST_1: 50,
  CRYSTAL_BURST_2: 50,
  CRYSTAL_HEAVY_1: 50,
  CRYSTAL_HEAVY_2: 50,
};

/** Seconds for a printed speed, or null when this id has no speed cell. */
export function projectileFlightSeconds(defId: string | undefined): number | null {
  if (!defId || !Object.prototype.hasOwnProperty.call(PROJECTILE_SPEED, defId)) return null;
  const speed = PROJECTILE_SPEED[defId];
  if (!(speed > 0)) return null;
  return (LASER_SPEED * LASER_FLIGHT_S) / speed;
}

/** Flight for a non-beam shot. Beams use beamFlightSeconds. */
export function shotFlightSeconds(kind: WeaponKind, defId: string): number {
  if (kind === "bomb") return BOMB_FLIGHT_S;
  const printed = projectileFlightSeconds(defId);
  if (printed != null) return printed;
  if (kind === "missile") return BOMB_FLIGHT_S;
  return LASER_FLIGHT_S;
}
