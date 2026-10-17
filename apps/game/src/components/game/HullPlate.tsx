import { useLayoutEffect, useRef, useState } from "react";
import { factionPaint, plateOf, type HullInk, type HullPaint } from "@/game/hull-plate";
import { gridPitch } from "./grid-pitch";
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
        placed ? { left: box.left, top: box.top, width: box.width, height: box.height } : undefined
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

function measure(el: HTMLElement, cols: number, rows: number): Box {
  const pitch = gridPitch(el, cols, rows);
  if (!pitch) return EMPTY;
  return {
    left: pitch.padL - pitch.pitchX,
    top: pitch.padT - pitch.pitchY,
    width: (cols + 2) * pitch.pitchX,
    height: (rows + 2) * pitch.pitchY,
  };
}
