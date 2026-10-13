import { useId, useLayoutEffect, useRef, useState } from "react";
import { bubbleLayout, frameRoom } from "./shield-bubble";

/**
 * Concentric shield bubbles around one hull. One blue ellipse per live layer, a filling
 * arc for the layer still charging, and a green ellipse for a Zoltan shield.
 */
export function ShieldField({
  layers,
  charge,
  zoltan,
}: {
  layers: number;
  /** 0 to 1 while the next layer is charging, otherwise null. */
  charge: number | null;
  zoltan: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const gradId = `shield-${useId().replace(/:/g, "")}`;
  const [box, setBox] = useState({ w: 0, h: 0, room: 56 });

  useLayoutEffect(() => {
    const svg = ref.current;
    const well = svg?.parentElement;
    const frame = well?.parentElement;
    if (!svg || !well || !frame) return;
    const read = () => {
      const w = well.offsetWidth;
      const h = well.offsetHeight;
      const room = frameRoom(frame.clientWidth, frame.clientHeight, w, h);
      setBox((prev) => (prev.w === w && prev.h === h && prev.room === room ? prev : { w, h, room }));
    };
    read();
    const obs = new ResizeObserver(read);
    obs.observe(well);
    obs.observe(frame);
    return () => obs.disconnect();
  }, []);

  const layout = bubbleLayout(box.room, layers, charge != null, zoltan > 0);
  const visible = box.w > 1 && box.h > 1 && (layout.live.length > 0 || layout.charge != null || layout.zoltan != null);
  const out =
    Math.max(layout.live[layout.live.length - 1] ?? 0, layout.charge ?? 0, layout.zoltan ?? 0, 0) + 8;
  const vw = Math.max(1, box.w + out * 2);
  const vh = Math.max(1, box.h + out * 2);
  const cx = box.w / 2 + out;
  const cy = box.h / 2 + out;
  const fill = charge == null ? 0 : Math.max(0, Math.min(1, charge));
  const outer = layout.live.length - 1;

  return (
    <svg
      ref={ref}
      className="shield-field"
      aria-hidden="true"
      viewBox={`0 0 ${vw} ${vh}`}
      width={visible ? vw : 0}
      height={visible ? vh : 0}
    >
      {visible && layout.live.length > 0 ? (
        <defs>
          <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
            <stop offset="62%" stopColor="#6cc4ff" stopOpacity="0" />
            <stop offset="100%" stopColor="#6cc4ff" stopOpacity="0.22" />
          </radialGradient>
        </defs>
      ) : null}
      {visible
        ? layout.live.map((pad, i) => {
            const edge = i === outer;
            return (
              <ellipse
                key={`live-${i}`}
                cx={cx}
                cy={cy}
                rx={box.w / 2 + pad}
                ry={box.h / 2 + pad}
                fill={edge ? `url(#${gradId})` : "none"}
                stroke={edge ? "#c8ecff" : "#6cc4ff"}
                strokeOpacity={edge ? 0.95 : 0.55 + (i / layout.live.length) * 0.25}
                strokeWidth={edge ? 2.4 : 1.6}
              />
            );
          })
        : null}
      {visible && outer >= 0 ? (
        <ellipse
          className="shield-sheen"
          cx={cx}
          cy={cy}
          rx={box.w / 2 + layout.live[outer]!}
          ry={box.h / 2 + layout.live[outer]!}
          fill="none"
          stroke="#f4fbff"
          strokeWidth="2.4"
          pathLength={100}
          strokeDasharray="9 91"
          strokeLinecap="round"
        />
      ) : null}
      {visible && layout.charge != null ? (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={box.w / 2 + layout.charge}
            ry={box.h / 2 + layout.charge}
            fill="none"
            stroke="#6cc4ff"
            strokeOpacity={0.28}
            strokeWidth="1.4"
            strokeDasharray="4 6"
          />
          <ellipse
            className="shield-charge-arc"
            cx={cx}
            cy={cy}
            rx={box.w / 2 + layout.charge}
            ry={box.h / 2 + layout.charge}
            fill="none"
            stroke="#e7f6ff"
            strokeOpacity={0.45 + 0.55 * fill}
            strokeWidth="2.2"
            pathLength={100}
            strokeDasharray={`${Math.max(6, fill * 100)} ${Math.max(0, 100 - fill * 100)}`}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {visible && layout.zoltan != null ? (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={box.w / 2 + layout.zoltan}
            ry={box.h / 2 + layout.zoltan}
            fill="rgba(62, 229, 106, 0.07)"
            stroke="#3ee56a"
            strokeOpacity="0.4"
            strokeWidth="7"
          />
          <ellipse
            cx={cx}
            cy={cy}
            rx={box.w / 2 + layout.zoltan}
            ry={box.h / 2 + layout.zoltan}
            fill="none"
            stroke="#d8ffe6"
            strokeWidth="2.2"
          />
        </>
      ) : null}
    </svg>
  );
}
