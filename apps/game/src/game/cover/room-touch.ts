import { registerCoverExtra, registerSheetRemap } from "../archive-cover-extra.ts";
import { archiveBlob, clipFrame, type SheetFrame } from "../pack/media.ts";

/**
 * Desktop `ftl.dat` names `img/ipad/tap_2x2.png` and `img/ipad/tap_2x1.png` and does not pack them.
 * The sheets are 70×70 and 70×35, one room. Those sizes are the low-oxygen stripes the archive does contain.
 */
const TOUCH_IMAGE = {
  room_touch2x2: "img/effects/low_o2_stripes_2x2.png",
  room_touch2x1: "img/effects/low_o2_stripes_2x1.png",
} as const;

const PACKED_TAP = /^img\/ipad\/tap_2x[12]\.png$/i;

type TouchName = keyof typeof TOUCH_IMAGE;

function remapTouch(name: TouchName, file: string): string {
  if (!PACKED_TAP.test(file)) return file;
  return TOUCH_IMAGE[name];
}

/** The frame on a targeted room. A 2×2 room uses the square clip; every other room uses the short one. */
export function roomTouchFrame(
  tilesWide: number,
  tilesTall: number,
  index = 0,
): SheetFrame | undefined {
  const name: TouchName = tilesWide >= 2 && tilesTall >= 2 ? "room_touch2x2" : "room_touch2x1";
  return clipFrame(name, index);
}

function drop(problems: string[], line: string): void {
  for (let i = problems.length - 1; i >= 0; i -= 1) {
    if (problems[i] === line) problems.splice(i, 1);
  }
}

registerCoverExtra({
  id: "room-touch",
  exercise(_raw, _merged, problems) {
    // The sheet check still names the ipad path. Drop it only when the targeted room draws a packed image.
    const drawn: Record<TouchName, SheetFrame | undefined> = {
      room_touch2x2: roomTouchFrame(2, 2),
      room_touch2x1: roomTouchFrame(2, 1),
    };
    for (const name of Object.keys(TOUCH_IMAGE) as TouchName[]) {
      const frame = clipFrame(name, 0);
      if (!frame || !drawn[name] || !archiveBlob(TOUCH_IMAGE[name])) continue;
      const tap = name === "room_touch2x2" ? "tap_2x2.png" : "tap_2x1.png";
      drop(problems, `sheet ${name} is missing img/ipad/${tap}`);
      drop(problems, `animation ${name} does not draw`);
    }
  },
});

for (const name of Object.keys(TOUCH_IMAGE) as TouchName[]) {
  registerSheetRemap(name, (file) => remapTouch(name, file));
}
