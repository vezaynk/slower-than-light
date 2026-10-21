import { ROOM_PX } from "@stl/pack";
import { GUN_ART } from "./mount-place.ts";

/**
 * Screen pixels for one archive pixel.
 * FTL draws a room at ROOM_PX (35). This board draws that room as `tile` pixels.
 */
export function archiveScale(tile: number): number {
  return tile / ROOM_PX;
}

/** One animation frame on a hull, in screen pixels. */
export function frameBox(fw: number, fh: number, tile: number): { w: number; h: number } {
  const scale = archiveScale(tile);
  return { w: fw * scale, h: fh * scale };
}

/**
 * Weapon icon in a slot.
 * The stand-in gun is `height` tall and `GUN_ART` long.
 * Archive sheets point up, so a taller frame is turned to point right,
 * and the barrel is that same length.
 */
export function weaponSlotBox(
  fw: number,
  fh: number,
  height: number,
): { w: number; h: number; turned: boolean } {
  const length = (height * GUN_ART.w) / GUN_ART.h;
  const long = Math.max(fw, fh);
  const short = Math.min(fw, fh);
  const scale = length / Math.max(1, long);
  return { w: long * scale, h: short * scale, turned: fh > fw };
}

/**
 * Archive weapon art points up: the muzzle is toward smaller y.
 * `muzzlePoint` treats +x as forward and +y as screen-down once the barrel points right.
 * A clockwise quarter turn is that mapping: image-up becomes screen-right.
 */
export function barrelPoint(
  point: { x: number; y: number },
  mount: { x: number; y: number },
): { x: number; y: number } {
  return { x: mount.y - point.y, y: point.x - mount.x };
}

/**
 * Heading for a packed shot, in radians, with 0 flying right.
 * A frame taller than it is wide points up (missiles, crystal shards), so it takes
 * the same clockwise quarter turn. A wide frame already points right (lasers).
 */
export function projectileHeading(ang: number, fw: number, fh: number): number {
  return fh > fw ? ang + Math.PI / 2 : ang;
}

/**
 * Drone sheets are about twice as wide as the craft, with the craft in the middle.
 * The icon box stays `height`; the picture is drawn at this side and clipped to the centre.
 */
export const DRONE_SHEET_FIT = 2;

export function droneIconSide(height: number): number {
  return height * DRONE_SHEET_FIT;
}
