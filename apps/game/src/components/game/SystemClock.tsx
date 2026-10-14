import type { CSSProperties } from "react";
import type { SystemClock } from "@/game/system-clock";

/**
 * Classes and --clock-p for the icon's existing border.
 * Empty when nothing is counting down. The border itself is the trace.
 */
export function clockRim(clock: SystemClock | null): { className: string; style?: CSSProperties } {
  if (!clock) return { className: "" };
  const pct = `${(Math.min(1, Math.max(0, clock.progress)) * 100).toFixed(2)}%`;
  return {
    className: `is-clock is-${clock.tone}`,
    style: { "--clock-p": pct } as CSSProperties,
  };
}
