/**
 * Shield bubbles drawn around a hull. Each live layer is its own ellipse, inner first.
 * A layer still charging and a Zoltan shield take the next slots outward.
 * A tight frame compresses the stack so the outer stroke stays inside the panel.
 */
import { ROOM_PX, hullDef } from "@stl/pack";

const PAD0 = 16;
const GAP = 8;
const STROKE_ROOM = 4;
const ROOM_MIN = 12;
const ROOM_MAX = 56;

export type BubbleLayout = {
  /** Radius added to half the hull box, one per live layer, inner first. */
  live: number[];
  charge: number | null;
  zoltan: number | null;
};

/** Pixels of clear space around a hull before the frame edge clips a stroke. */
export function frameRoom(frameW: number, frameH: number, hullW: number, hullH: number): number {
  const roomX = (frameW - hullW) / 2 - 6;
  const roomY = (frameH - hullH) / 2 - 6;
  if (!Number.isFinite(roomX) || !Number.isFinite(roomY)) return ROOM_MAX;
  return Math.max(ROOM_MIN, Math.min(ROOM_MAX, roomX, roomY));
}

/**
 * The frame that clips the bubble. The hull sits in `.ship-well`; that well's parent is the sky or the target body.
 */
export function bubbleRoom(
  hullEl: Element | null,
  hull: { w: number; h: number },
  measure: (el: Element | null) => { w: number; h: number } | null,
): number {
  const well = hullEl?.parentElement ?? null;
  const frame = well?.classList.contains("ship-well") ? well.parentElement : well;
  const fr = measure(frame);
  if (!fr) return ROOM_MAX;
  return frameRoom(fr.w, fr.h, hull.w, hull.h);
}

export function bubbleLayout(
  room: number,
  layers: number,
  charging: boolean,
  zoltan: boolean,
  /** 1 on the player hull. The target panel passes its ship scale so the pad shrinks with the rooms. */
  scale = 1,
): BubbleLayout {
  const liveCount = Math.max(0, Math.floor(layers));
  const slots: Array<"live" | "charge" | "zoltan"> = [];
  for (let i = 0; i < liveCount; i++) slots.push("live");
  if (charging) slots.push("charge");
  if (zoltan) slots.push("zoltan");
  if (slots.length === 0) return { live: [], charge: null, zoltan: null };

  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const usable = Math.max(8 * s, room - STROKE_ROOM * s);
  const preferLast = (PAD0 + (slots.length - 1) * GAP) * s;
  const fit = preferLast > usable ? usable / preferLast : 1;
  const at = (i: number) => (PAD0 + i * GAP) * s * fit;

  const live: number[] = [];
  let charge: number | null = null;
  let z: number | null = null;
  slots.forEach((kind, i) => {
    const pad = at(i);
    if (kind === "live") live.push(pad);
    else if (kind === "charge") charge = pad;
    else z = pad;
  });
  return { live, charge, zoltan: z };
}

/** Radius of the regular bubble a shot just removed. `layersLeft` is the count still up. */
export function struckPad(room: number, layersLeft: number, zoltanUp: boolean, scale = 1): number {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const layout = bubbleLayout(room, Math.max(0, layersLeft) + 1, false, zoltanUp, s);
  return layout.live[layout.live.length - 1] ?? PAD0 * s;
}

/** Radius of the Zoltan bubble while it is up. */
export function zoltanPad(room: number, layers: number, charging: boolean, scale = 1): number {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return bubbleLayout(room, layers, charging, true, s).zoltan ?? PAD0 * s;
}

/** `--ship-scale` on a hull. Missing or invalid reads as 1, which is the player ship. */
export function readShipScale(el: Element | null): number {
  if (!el || typeof getComputedStyle !== "function") return 1;
  const raw = parseFloat(getComputedStyle(el).getPropertyValue("--ship-scale"));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export type ShieldOval = {
  rx: number;
  ry: number;
  /** Ellipse origin, scaled into the well. Added to the well's center. */
  dx: number;
  dy: number;
};

/**
 * CSS room grid in archive pixels. Columns and rows run from 0 through the furthest room edge.
 * One room is `ROOM_PX` archive pixels. An empty room list has no grid.
 */
export function roomGridPixels(
  rooms: readonly { x: number; y: number; w: number; h: number }[],
): { w: number; h: number } | null {
  let cols = 0;
  let rows = 0;
  for (const room of rooms) {
    if (!(room.w > 0) || !(room.h > 0)) continue;
    cols = Math.max(cols, room.x + room.w);
    rows = Math.max(rows, room.y + room.h);
  }
  if (!(cols > 0) || !(rows > 0)) return null;
  return { w: cols * ROOM_PX, h: rows * ROOM_PX };
}

/**
 * The layout ELLIPSE drawn in the hull well.
 * Diameters are archive pixels. The well is the room grid, so one archive pixel is
 * the grid pitch divided by `ROOM_PX`. The picture box is larger than that grid and is not the scale.
 * The oval's center is the image center plus the file's x and y, shifted from the room-grid center.
 * HORIZONTAL widens the radius. VERTICAL raises it. The layer pad is added after the scale.
 * `scale` is screen pixels per archive pixel. Without it, the well size stands in for the grid pitch.
 */
export function shieldOval(
  box: { w: number; h: number },
  picture: { x: number; y: number; w: number; h: number },
  ellipse: { w: number; h: number; x: number; y: number },
  pad: number,
  span: { w: number; h: number },
  horizontal?: number,
  vertical?: number,
  scale?: { x: number; y: number },
  offset?: { x?: number; y?: number },
): ShieldOval | null {
  if (!(picture.w > 0) || !(picture.h > 0) || !(span.w > 0) || !(span.h > 0)) return null;
  const sx = scale && scale.x > 0 ? scale.x : box.w / span.w;
  const sy = scale && scale.y > 0 ? scale.y : box.h / span.h;
  if (!(sx > 0) || !(sy > 0)) return null;
  const originX = picture.x - (offset?.x ?? 0);
  const originY = picture.y - (offset?.y ?? 0);
  return {
    rx: (ellipse.w / 2 + (horizontal ?? 0)) * sx + pad,
    ry: (ellipse.h / 2 + (vertical ?? 0)) * sy + pad,
    dx: (originX + picture.w / 2 + ellipse.x - span.w / 2) * sx,
    dy: (originY + picture.h / 2 + ellipse.y - span.h / 2) * sy,
  };
}

/**
 * The bubble for one hull. A layout ellipse uses the room grid. Anything else is the well plus the pad.
 * `scale` is screen pixels per archive pixel, measured from the hull's grid pitch.
 */
export function shieldRing(
  hullId: string | undefined,
  box: { w: number; h: number },
  pad: number,
  scale?: { x: number; y: number },
): ShieldOval {
  const hull = hullId ? hullDef(hullId) : undefined;
  const ellipse = hull?.grid?.ellipse;
  const picture = hull?.picture;
  const span = hull?.grid ? roomGridPixels(hull.grid.rooms) : null;
  if (ellipse && picture && span) {
    const oval = shieldOval(
      box,
      picture,
      ellipse,
      pad,
      span,
      hull.grid?.horizontal,
      hull.grid?.vertical,
      scale,
      { x: hull.grid?.x, y: hull.grid?.y },
    );
    if (oval) return oval;
  }
  return { rx: box.w / 2 + pad, ry: box.h / 2 + pad, dx: 0, dy: 0 };
}

/**
 * Where the segment from `from` to `to` first crosses into the ellipse at `center` with radii `rx`, `ry`.
 * A segment that starts inside returns `from`. One that never reaches the ellipse returns null.
 */
export function bubbleCrossing(
  from: { x: number; y: number },
  to: { x: number; y: number },
  center: { x: number; y: number },
  rx: number,
  ry: number,
): { x: number; y: number } | null {
  if (!(rx > 0) || !(ry > 0)) return null;
  const px = (from.x - center.x) / rx;
  const py = (from.y - center.y) / ry;
  const dx = (to.x - from.x) / rx;
  const dy = (to.y - from.y) / ry;
  const c = px * px + py * py - 1;
  if (c <= 0) return { x: from.x, y: from.y };
  const a = dx * dx + dy * dy;
  const b = 2 * (px * dx + py * dy);
  const disc = b * b - 4 * a * c;
  if (!(a > 0) || disc < 0) return null;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  if (s < 0 || s > 1) return null;
  return { x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s };
}
