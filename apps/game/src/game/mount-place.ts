import { ROOM_PX, type HullMount, type HullMountSlide, type HullPicture } from "@stl/pack";

/**
 * Archive pixels a gun travels along `slide` when it powers up.
 * The drawing file stores the powered point. An unpowered gun sits back,
 * opposite that direction. `no`, and a mount that omits slide, stay put.
 */
export const SLIDE_PX = 10;

/** Procedural barrel length, in archive pixels, from the rear corner to the muzzle. */
export const GUN_PX = 36;

/** `weaponPixels` art is 26 wide and 14 tall, and the barrel points right. */
export const GUN_ART = { w: 26, h: 14 };

const SLIDE: Record<HullMountSlide, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  no: { x: 0, y: 0 },
};

export type MountPose = {
  /** Rear corner, in archive pixels from the room-grid origin. */
  x: number;
  y: number;
  /** Clockwise degrees. 0 points right. -90 points up. */
  turn: number;
  /** Flip across the barrel. Top guns and bottom guns mirror. */
  flip: boolean;
};

/**
 * Where one hardpoint sits, and which way the gun points.
 * `rotate` true points right. `rotate` false points up.
 * `mirror` flips the gun across the barrel.
 */
export function mountPose(
  image: HullPicture,
  mount: HullMount,
  powered: boolean,
  offset: { x?: number; y?: number } = {},
): MountPose {
  let x = image.x + mount.x - (offset.x ?? 0);
  let y = image.y + mount.y - (offset.y ?? 0);
  const slide = mount.slide ? SLIDE[mount.slide] : undefined;
  if (!powered && slide && (slide.x !== 0 || slide.y !== 0)) {
    x -= slide.x * SLIDE_PX;
    y -= slide.y * SLIDE_PX;
  }
  return { x, y, turn: mount.rotate ? 0 : -90, flip: mount.mirror };
}

/**
 * Where a drawn shot leaves. The hardpoint is the mount.
 * `fire` and `mount` are weapon-image pixels, so the offset is fire minus mount,
 * then turned and mirrored the same way `mountPose` turns the gun.
 * Scale is screen pixels per archive pixel, applied before that turn.
 * No fire point returns undefined so the caller keeps the drawn tip.
 */
export function muzzlePoint(
  hardpoint: { x: number; y: number },
  pose: Pick<MountPose, "turn" | "flip">,
  fire: { x: number; y: number } | undefined,
  mount: { x: number; y: number },
  scale: { x: number; y: number } = { x: 1, y: 1 },
): { x: number; y: number } | undefined {
  if (!fire) return undefined;
  const dx = (fire.x - mount.x) * scale.x;
  const dy = (fire.y - mount.y) * scale.y;
  const y = pose.flip ? -dy : dy;
  const rad = (pose.turn * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: hardpoint.x + dx * cos - y * sin,
    y: hardpoint.y + dx * sin + y * cos,
  };
}

/** Screen height of the procedural gun at one grid pitch. */
export function gunHeight(pitch: number): number {
  return (GUN_ART.h / GUN_ART.w) * GUN_PX * (pitch / ROOM_PX);
}

/**
 * The image the hardpoints were measured on.
 * A loaded drawing file stores that box on the hull. Callers still pass the layout and the rooms.
 */
export function mountImage(
  _layout: string,
  picture: HullPicture | undefined,
  _rooms: readonly { x: number; y: number; w: number; h: number }[] | undefined,
): HullPicture | undefined {
  return picture;
}
