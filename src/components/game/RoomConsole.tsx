/**
 * The station on a manning tile. The tile stays the rightmost floor cell of the
 * top row (Door System picture: "console on the right"). This graphic sits on
 * the right of that cell, at the height of the operator's tap.
 * Oxygen, teleporter, hacking, and artillery draw nothing. Medbay and Clone Bay draw their machine on the tile nobody
 * stands on (RoomProp below).
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
