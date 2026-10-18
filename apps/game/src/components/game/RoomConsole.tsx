/**
 * Room furniture. The manning tile stays the rightmost floor cell of the top row (Door System picture: "console on the
 * right"): its operator sits on RoomSeat facing the monitor on the wall (WallTerminal). Oxygen, teleporter,
 * hacking, and artillery have no terminal. Medbay and Clone Bay draw their machine on the tile nobody stands on
 * (RoomProp below).
 */
import { pixelRuns } from "@/game/gear-look";

const INK: Record<string, string> = {
  c: "ink-casing",
  d: "ink-casing-d",
  t: "ink-trim",
  s: "ink-screen",
  g: "ink-glow",
  p: "ink-pip",
};

/**
 * Per the user: a terminal is a seat the operator sits on, shown only while the system is manned, facing a display on
 * the room's wall (WallTerminal). INVENTED art: a chair facing right, toward the monitor. 16×16.
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
    <svg
      className="room-seat-art"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixelRuns(SEAT).map((r) => (
        <rect
          key={`${r.y}-${r.x}`}
          className={INK[r.c] ?? "ink-casing"}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
        />
      ))}
    </svg>
  );
}

/**
 * The machine on a medical room's blocked tile (crew-spots blockedCells). INVENTED art: a Medbay bed under a scanner
 * arm, and a Clone Bay vat with a figure inside. 16×16, drawn with the console inks.
 */
const PROP: Record<"medbay" | "clonebay", string[]> = {
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
  clonebay: [
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

export function RoomProp({ kind }: { kind: "medbay" | "clonebay" }) {
  return (
    <svg
      className="room-prop-art"
      data-kind={kind}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pixelRuns(PROP[kind]).map((r) => (
        <rect
          key={`${r.y}-${r.x}`}
          className={INK[r.c] ?? "ink-casing"}
          x={r.x}
          y={r.y}
          width={r.w}
          height={1}
        />
      ))}
    </svg>
  );
}

/**
 * Per the user: the terminal's display, bolted to the room wall. Drawn for the right-hand wall (x = 16 is the wall)
 * and turned to the others in CSS (.room-terminal[data-wall]). A wall plate overlaps the room border, an arm holds a
 * monitor out toward the seat, and while manned the screen runs a readout for its system; unmanned it is black.
 * INVENTED art and animation.
 */
export function WallTerminal({ kind, on }: { kind: string; on: boolean }) {
  return (
    <svg
      className={"room-terminal-art" + (on ? " is-on" : "")}
      data-kind={kind}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <rect className="t-mount" x={15.2} y={4.4} width={2} height={7.2} />
      <rect className="t-mount-bolt" x={15.6} y={5} width={0.6} height={0.6} />
      <rect className="t-mount-bolt" x={15.6} y={10.4} width={0.6} height={0.6} />
      <rect className="t-arm" x={13.4} y={7.3} width={2} height={1.4} />
      <rect className="t-bezel" x={8} y={2.8} width={5.8} height={10.4} rx={0.4} />
      <rect className="t-screen" x={8.6} y={3.4} width={4.6} height={9.2} />
      <rect className="t-led" x={12.5} y={12.55} width={0.7} height={0.4} />
      {on ? <Readout kind={kind} /> : null}
    </svg>
  );
}

/** One animated readout per system, inside the screen (x 8.6-13.2, y 3.4-12.6). Colours come from CSS. */
function Readout({ kind }: { kind: string }) {
  switch (kind) {
    case "shields":
      return (
        <g className="t-readout">
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              className="t-ring"
              cx={10.9}
              cy={8}
              r={1.6}
              style={{ animationDelay: `${i * 0.6}s` }}
            />
          ))}
          <circle className="t-core" cx={10.9} cy={8} r={0.6} />
        </g>
      );
    case "engines":
      return (
        <g className="t-readout">
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={i}
              className="t-bar"
              x={9.1 + i * 1}
              y={6}
              width={0.7}
              height={6}
              style={{ animationDelay: `${i * -0.37}s` }}
            />
          ))}
        </g>
      );
    case "weapons":
      return (
        <g className="t-readout">
          <circle className="t-reticle" cx={10.9} cy={7.2} r={1.7} />
          <rect className="t-hair" x={10.7} y={4.6} width={0.4} height={5.2} />
          <rect className="t-hair" x={8.3} y={7} width={5.2} height={0.4} />
          <rect className="t-lock" x={10.6} y={6.9} width={0.6} height={0.6} />
          <rect className="t-charge" x={9} y={11.2} width={3.8} height={0.7} />
        </g>
      );
    case "pilot":
      return (
        <g className="t-readout">
          {[
            [9.2, 0],
            [11.8, -0.5],
            [10.4, -1.1],
            [12.4, -1.6],
            [9.8, -2.2],
          ].map(([x, d], i) => (
            <rect
              key={i}
              className="t-star"
              x={x}
              y={3.6}
              width={0.4}
              height={0.8}
              style={{ animationDelay: `${d}s` }}
            />
          ))}
          <path className="t-craft" d="M10.9 9.6 L11.9 11.6 L10.9 11.1 L9.9 11.6 Z" />
        </g>
      );
    case "sensors":
      return (
        <g className="t-readout">
          <circle className="t-scope" cx={10.9} cy={8} r={2} />
          <circle className="t-scope" cx={10.9} cy={8} r={1} />
          <rect className="t-sweep" x={10.9} y={7.85} width={2} height={0.3} />
          <rect className="t-blip" x={11.9} y={6.6} width={0.5} height={0.5} />
        </g>
      );
    default:
      return (
        <g className="t-readout">
          {[0, 1, 2].flatMap((row) =>
            [0, 1].map((col) => (
              <rect
                key={`${row}-${col}`}
                className="t-lamp"
                x={9.7 + col * 1.8}
                y={4.8 + row * 2.4}
                width={0.9}
                height={1.4}
                style={{ animationDelay: `${(row * 2 + col) * -0.41}s` }}
              />
            )),
          )}
        </g>
      );
  }
}
