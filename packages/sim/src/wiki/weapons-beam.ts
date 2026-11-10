/**
 * Beam swipe length and speed, read from the loaded weapon blueprint.
 * Artillery Beam is a shot label, not a blueprint. Its printed length is 500px and its speed is 13.
 */
import { weaponDef } from "@stl/pack";

/** Template:Beam weapons, Artillery Beam: length 500. The swipe is this long, not the span of the target hull. */
export const ARTILLERY_BEAM_PX = 500;

/** Drawn shot label. stepShots animates it and does not apply weapon damage; tickLance lands the cut. */
export const ARTILLERY_SHOT_LABEL = "artillery-beam";

const ARTILLERY_SPEED = 13;

/** Printed length in tiles, or null when this blueprint does not carry one. */
export function beamTileLength(defId: string | undefined): number | null {
  if (!defId || defId === ARTILLERY_SHOT_LABEL) return null;
  const tiles = weaponDef(defId)?.lengthTiles;
  return tiles == null ? null : tiles;
}

/** Printed length of the stroke, in tiles. Artillery Beam is 500px, and 45px is one tile. */
export function beamBodyTiles(defId: string | undefined): number | null {
  if (defId === ARTILLERY_SHOT_LABEL) return ARTILLERY_BEAM_PX / 45;
  return beamTileLength(defId);
}

function speedOf(defId: string): number | null {
  if (defId === ARTILLERY_SHOT_LABEL) return ARTILLERY_SPEED;
  const speed = weaponDef(defId)?.speed;
  return speed != null && speed > 0 ? speed : null;
}

/** Seconds for the printed 500px Artillery Beam swipe at speed 13. */
export function artillerySwipeSeconds(): number {
  return beamSwipeSeconds(ARTILLERY_SHOT_LABEL, ARTILLERY_BEAM_PX / 45) ?? 0;
}

/** Seconds for a swipe of `tiles` at this weapon's speed, or null when no speed is listed. */
export function beamSwipeSeconds(defId: string | undefined, tiles: number): number | null {
  if (!defId) return null;
  const speed = speedOf(defId);
  if (speed == null) return null;
  return (Math.max(0, tiles) * 45) / (speed * 16);
}
