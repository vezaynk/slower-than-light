/**
 * Room furniture. The manning tile stays the rightmost floor cell of the top row (Door System picture: "console on the
 * right"): its operator sits on RoomSeat facing a wall display drawn in CSS (ShipView .room-screen). Oxygen, teleporter,
 * hacking, and artillery have no terminal. Medbay and Clone Bay draw their machine on the tile nobody stands on
 * (RoomProp below).
 */
import { pixelRuns } from "@/game/gear-look";

const INK: Record<string, string> = {
  c: "casing",
  d: "casing-d",
  t: "trim",
  s: "screen",
  g: "glow",
  p: "pip",
};

/**
 * Per the user: a terminal is a seat the operator sits on, shown only while the system is manned, facing a display on
 * the room's wall (ShipView .room-screen). INVENTED art: a chair facing right, toward the wall display. 16×16.
 */
const SEAT = [
  "................",
  "................",
  "................",
  "...dd...........",
  "...dt...........",
  "...dt...........",
  "...dt...........",
  "...dt...........",
  "...dtttttttttt..",
  "...dccccccccccd.",
  "...dddddddddddd.",
  "........cc......",
  "........cc......",
  "........cc......",
  ".....dddddddd...",
  "................",
];

export function RoomSeat() {
  return (
    <svg className="room-seat-art" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {pixelRuns(SEAT).map((r) => (
        <rect key={`${r.y}-${r.x}`} className={INK[r.c] ?? "casing"} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  );
}

/**
 * The machine on a medical room's blocked tile (crew-spots blockedCells). INVENTED art: a Medbay bed under a scanner
 * arm, and a Clone Bay vat with a figure inside. 16×16, drawn with the console inks.
 */
const PROP: Record<"medbay" | "cradle", string[]> = {
  medbay: [
    "................",
    "..tttttttttttt..",
    "..t..........t..",
    "..t...gggg...t..",
    "..t..........t..",
    "................",
    "................",
    ".dddddddddddddd.",
    ".dssssssppppppd.",
    ".dssssssssssssd.",
    ".dddddddddddddd.",
    "..cc........cc..",
    "..cc........cc..",
    "..cc........cc..",
    ".cccc......cccc.",
    "................",
  ],
  cradle: [
    "................",
    "....dddddddd....",
    "...dccccccccd...",
    "...cggggggggc...",
    "...cgssssssgc...",
    "...cgsssppsgc...",
    "...cgsssppsgc...",
    "...cgsspppsgc...",
    "...cgssppppgc...",
    "...cgsssppsgc...",
    "...cgsssppsgc...",
    "...cggggggggc...",
    "...dccccccccd...",
    "..dddddddddddd..",
    "..dddddddddddd..",
    "................",
  ],
};

export function RoomProp({ kind }: { kind: "medbay" | "cradle" }) {
  return (
    <svg className="room-prop-art" data-kind={kind} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
      {pixelRuns(PROP[kind]).map((r) => (
        <rect key={`${r.y}-${r.x}`} className={INK[r.c] ?? "casing"} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  );
}
