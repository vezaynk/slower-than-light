import type { SystemClock } from "@/game/system-clock";

const R = 13;
const LAP = 2 * Math.PI * R;

/** A circle traced clockwise from the top. Empty at the start of the countdown, closed at the end. */
export function SystemClockRing({ clock }: { clock: SystemClock | null }) {
  if (!clock) return null;
  const drawn = LAP * Math.min(1, Math.max(0, clock.progress));
  return (
    <svg className={`sys-clock is-${clock.tone}`} viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r={R}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={LAP}
        strokeDashoffset={LAP - drawn}
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}
