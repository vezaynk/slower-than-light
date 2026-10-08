import { useLayoutEffect, useRef, useState } from "react";
import { factionPaint, plateOf, type HullInk, type HullPaint } from "@/game/hull-plate";
import "./hull-plate.css";

type Room = { x: number; y: number; w: number; h: number; omit?: { x: number; y: number }[] };

type Box = { left: number; top: number; width: number; height: number };

const EMPTY: Box = { left: 0, top: 0, width: 0, height: 0 };

/**
 * One viewBox unit is one grid pitch (tile + gap), so a skin cell lands on its
 * track — in the padding and the wall gap — and not shifted onto a floor tile.
 */
export function HullPlate({
  id,
  faction,
  pirate,
  facing,
  cols,
  rows,
  rooms,
}: {
  id: string;
  faction: string;
  pirate?: boolean;
  facing: "left" | "right";
  cols: number;
  rows: number;
  rooms: Room[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<Box>(EMPTY);
  useLayoutEffect(() => {
    const svg = ref.current;
    const el = svg?.parentElement;
    if (!el) return;
    const read = () => setBox(measure(el, cols, rows));
    read();
    const obs = new ResizeObserver(read);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cols, rows]);

  const paint = factionPaint(id.startsWith("flagship") ? "rebel" : faction);
  const cells = plateOf({ id, faction, pirate, facing, cols, rows, rooms });
  const placed = box.width > 0 && box.height > 0;

  return (
    <svg
      ref={ref}
      className="hull-plate"
      viewBox={`-1 -1 ${cols + 2} ${rows + 2}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={
        placed
          ? { left: box.left, top: box.top, width: box.width, height: box.height }
          : undefined
      }
    >
      {cells.map((cell) => (
        <rect
          key={`${cell.x},${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={1}
          height={1}
          fill={fillOf(cell.ink, cell.x, cell.y, paint)}
        />
      ))}
    </svg>
  );
}

function fillOf(ink: HullInk, x: number, y: number, paint: HullPaint): string {
  if (ink === "mark") return (x + y) % 2 === 0 ? paint.mark : "#1a1408";
  return paint[ink];
}

function px(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function firstTrack(template: string): number {
  const n = parseFloat(template);
  return Number.isFinite(n) ? n : 0;
}

function measure(el: HTMLElement, cols: number, rows: number): Box {
  const cs = getComputedStyle(el);
  const padL = px(cs.paddingLeft);
  const padT = px(cs.paddingTop);
  const padR = px(cs.paddingRight);
  const padB = px(cs.paddingBottom);
  const colGap = px(cs.columnGap);
  const rowGap = px(cs.rowGap);
  let tileW = firstTrack(cs.gridTemplateColumns);
  let tileH = firstTrack(cs.gridTemplateRows);
  if (!(tileW > 0) || !(tileH > 0)) {
    const innerW = el.clientWidth - padL - padR;
    const innerH = el.clientHeight - padT - padB;
    tileW = cols > 0 ? (innerW - Math.max(0, cols - 1) * colGap) / cols : 0;
    tileH = rows > 0 ? (innerH - Math.max(0, rows - 1) * rowGap) / rows : 0;
  }
  const pitchX = tileW + colGap;
  const pitchY = tileH + rowGap;
  if (!(pitchX > 0) || !(pitchY > 0)) return EMPTY;
  return {
    left: padL - pitchX,
    top: padT - pitchY,
    width: (cols + 2) * pitchX,
    height: (rows + 2) * pitchY,
  };
}
