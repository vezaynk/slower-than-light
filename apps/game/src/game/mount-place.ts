import { MOUNT_IMAGES } from "@stl/catalog/src/weapon-mounts.ts";
import {
  pictureForRooms,
  ROOM_PX,
  type HullMount,
  type HullMountSlide,
  type HullPicture,
} from "@stl/pack";

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

/** Screen height of the procedural gun at one grid pitch. */
export function gunHeight(pitch: number): number {
  return (GUN_ART.h / GUN_ART.w) * GUN_PX * (pitch / ROOM_PX);
}

function samePicture(a: HullPicture, b: HullPicture): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/**
 * The image the hardpoints were measured on.
 * A stand-in picture is the room box, so the archive image box is used.
 * A picture from a loaded drawing file is that file's own box.
 */
export function mountImage(
  layout: string,
  picture: HullPicture | undefined,
  rooms: readonly { x: number; y: number; w: number; h: number }[] | undefined,
): HullPicture | undefined {
  const archive = MOUNT_IMAGES[layout];
  const placeholder = rooms && rooms.length > 0 ? pictureForRooms(rooms) : undefined;
  if (picture && placeholder && archive && samePicture(picture, placeholder)) return archive;
  return picture ?? archive;
}
