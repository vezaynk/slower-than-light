/**
 * Per the user: a press flips a control at once. Letting go before HOLD_MS keeps the flip (a tap).
 * Holding longer puts the old value back when the key or pointer comes up.
 */
export const HOLD_MS = 280;

export type Moment = { was: boolean; held: boolean };

export function momentDown(was: boolean): Moment {
  return { was, held: false };
}

export function momentMarkHeld(m: Moment): Moment {
  return { was: m.was, held: true };
}

/** The value while the press is down. */
export function momentLive(m: Moment): boolean {
  return !m.was;
}

/** The value after release. */
export function momentUp(m: Moment): boolean {
  return m.held ? m.was : !m.was;
}
