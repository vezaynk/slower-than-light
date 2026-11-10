import { weaponDef } from "@stl/pack";
import { beamSwipeSeconds, beamTileLength } from "../wiki/weapons-beam.ts";

/** Aiming length. A blueprint length wins. Artillery stays off this path. */
export function aimedBeamTiles(defId: string | undefined): number | null {
  const packed = defId ? weaponDef(defId)?.lengthTiles : undefined;
  if (packed != null) return packed;
  return beamTileLength(defId);
}

/**
 * Seconds for a swipe of `tiles`. A blueprint speed uses the same formula as
 * beamSwipeSeconds: 45 pixels a tile, speed × 16 pixels a second.
 */
export function packBeamSeconds(defId: string | undefined, tiles: number): number | null {
  if (defId === "artillery-beam") return beamSwipeSeconds(defId, tiles);
  const speed = defId ? weaponDef(defId)?.speed : undefined;
  if (speed != null) {
    if (!(speed > 0)) return null;
    return (Math.max(0, tiles) * 45) / (speed * 16);
  }
  return beamSwipeSeconds(defId, tiles);
}
