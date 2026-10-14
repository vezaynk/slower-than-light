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
  spark: 60,
  twin: 60,
  burst1: 60,
  lineburst: 60,
  burst3: 60,
  heavy: 60,
  heavypierce: 60,
  heavy2: 60,
  hullsmash: 75,
  hullsmash2: 90,
  chainlaser: 60,
  vulcan: 60,
  chargers: 60,
  charger: 60,
  charger2: 60,
  bosslaser: 60,
  // Template:Flak weapons. Advanced Flak, Flak I, Flak II, and Flak Artillery are 26.
  scatter: 26,
  advflak: 26,
  flak2: 26,
  "flak-artillery": 26,
  // Template:Ion weapons. Heavy Ion and Boss Ion are 40. The other ion rows are 30.
  needle: 30,
  ion2: 30,
  heavyion: 40,
  stunner: 30,
  ioncharger: 30,
  chainion: 30,
  bossion: 40,
  // Template:Missile weapons. Swarm is 45. The other missile rows are 35.
  leto: 35,
  artemis: 35,
  artemisEnemy: 35,
  hermes: 35,
  breachmissiles: 35,
  hullmissile: 35,
  swarmmissiles: 45,
  pegasus: 35,
  bossmissile: 35,
  // Template:Crystal weapons. Each row is 50.
  crystalburst: 50,
  crystalburst2: 50,
  heavycrystal: 50,
  heavycrystal2: 50,
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
