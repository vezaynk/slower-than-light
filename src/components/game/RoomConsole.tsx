/**
 * The station on a manning tile. The tile stays the rightmost floor cell of the
 * top row (Door System picture: "console on the right"). This graphic sits on
 * the right of that cell, at the height of the operator's tap.
 * Oxygen, medbay, clone bay, teleporter, hacking, and artillery draw nothing.
 */
import { pixelRuns } from "@/game/gear-look";
import type { SysId } from "@/game/types";

const INK: Record<string, string> = {
  c: "casing",
  d: "casing-d",
  t: "trim",
  s: "screen",
  g: "glow",
  p: "pip",
};

/** 16×16. The screen faces the crew, who stand to the left and tap right. */
const ART: Partial<Record<SysId, string[]>> = {
  pilot: [
    "................",
    "..cccccccccc....",
    "..cssssssssc....",
    "..cssssssssc....",
    "..csggggggsc....",
    "..cssssssssc....",
    "..cssssssssc....",
    "..cccccccccc....",
    "...tttttttt.....",
    "..tt......tt....",
    "..tt.cccc.tt....",
    ".....cccc.......",
    ".....cccc.......",
    "...cccccccc.....",
    "...cccccccc.....",
    "...dddddddd.....",
  ],
  engines: [
    "................",
    "..cccccccccc....",
    "..cssssssssc....",
    "..cssssssssc....",
    "..csggggggsc....",
    "..cssssssssc....",
    "..cssssssssc....",
    "..cccccccccc....",
    "..pp..pp..pp....",
    "..pp..pp..pp....",
    "...dddddddd.....",
    "...dtttttttd....",
    "...dtttttttd....",
    "...dddddddd.....",
    "................",
    "................",
  ],
  shields: [
    "................",
    ".....cccccc.....",
    "...cccccccccc...",
    "..cccccccccccc..",
    "..cccssssssccc..",
    "..ccsssssssscc..",
    "..ccssggggsscc..",
    "..ccssggggsscc..",
    "..ccsssssssscc..",
    "..cccssssssccc..",
    "..cccccccccccc..",
    "...cccccccccc...",
    ".....cccccc.....",
    "......cccc......",
    "....cccccccc....",
    "....dddddddd....",
  ],
  weapons: [
    "................",
    "..cccccccc......",
    "..cssssssc.tt...",
    "..cssssssc......",
    "..cssspssc.tt...",
    "..cggggggc......",
    "..cssssssc.tt...",
    "..cssssssc......",
    "..cccccccc......",
    "..ct.t.t.c......",
    "..cccccccc......",
    "..cccccccc......",
    "................",
    "..dddddddd......",
    "................",
    "................",
  ],
  sensors: [
    "................",
    "..cccccccccccc..",
    "..cssssssssssc..",
    "..cssssgsssssc..",
    "..cssssgsssssc..",
    "..cggggggggggc..",
    "..cssssgpssssc..",
    "..cssssgsssssc..",
    "..cssssgsssssc..",
    "..cssssssssssc..",
    "..cccccccccccc..",
    ".....cccc.......",
    ".....cccc.......",
    "...dddddddddd...",
    "................",
    "................",
  ],
  doors: [
    "..cccccccccccc..",
    "..cssssssssssc..",
    "..cgggggsssssc..",
    "..cssssssssssc..",
    "..cgggggsssssc..",
    "..cssssssssssc..",
    "..cccccccccccc..",
    ".....cccc.......",
    "..dddddddddddd..",
    "..dttttttttttd..",
    "..dddddddddddd..",
    "..dttttttttttd..",
    "..dddddddddddd..",
    "................",
    "................",
    "................",
  ],
};

export function RoomConsole({ kind, on }: { kind: SysId; on: boolean }) {
  const rows = ART[kind];
  if (!rows) return null;
  return (
    <svg
      className={"room-console-art" + (on ? " is-on" : "")}
      data-kind={kind}
      viewBox="0 0 16 16"
      overflow="visible"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixelRuns(rows).map((r) => (
        <rect key={`${r.y}-${r.x}`} className={INK[r.c] ?? "casing"} x={r.x} y={r.y} width={r.w} height={1} />
      ))}
    </svg>
  );
}
