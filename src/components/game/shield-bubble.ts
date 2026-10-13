/**
 * Shield bubbles drawn around a hull. Each live layer is its own ellipse, inner first.
 * A layer still charging and a Zoltan shield take the next slots outward.
 * A tight frame compresses the stack so the outer stroke stays inside the panel.
 */

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

export function bubbleLayout(room: number, layers: number, charging: boolean, zoltan: boolean): BubbleLayout {
  const liveCount = Math.max(0, Math.floor(layers));
  const slots: Array<"live" | "charge" | "zoltan"> = [];
  for (let i = 0; i < liveCount; i++) slots.push("live");
  if (charging) slots.push("charge");
  if (zoltan) slots.push("zoltan");
  if (slots.length === 0) return { live: [], charge: null, zoltan: null };

  const usable = Math.max(8, room - STROKE_ROOM);
  const preferLast = PAD0 + (slots.length - 1) * GAP;
  const scale = preferLast > usable ? usable / preferLast : 1;
  const at = (i: number) => (PAD0 + i * GAP) * scale;

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
export function struckPad(room: number, layersLeft: number, zoltanUp: boolean): number {
  const layout = bubbleLayout(room, Math.max(0, layersLeft) + 1, false, zoltanUp);
  return layout.live[layout.live.length - 1] ?? PAD0;
}

/** Radius of the Zoltan bubble while it is up. */
export function zoltanPad(room: number, layers: number, charging: boolean): number {
  return bubbleLayout(room, layers, charging, true).zoltan ?? PAD0;
}
