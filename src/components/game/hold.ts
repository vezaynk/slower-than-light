import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * Touch stand-in for a right-click. A still finger for ~400ms fires `onLong`.
 * Movement cancels it. The click that follows a completed hold is swallowed so
 * the left-click action does not also run. A mouse never arms a hold.
 */
const LONG_MS = 400;
const MOVE_PX = 8;

type Rec = {
  t: number;
  x: number;
  y: number;
  pid: number;
  fired: boolean;
  done: boolean;
  cleanup: () => void;
};

const holds = new WeakMap<EventTarget, Rec>();

function drop(target: EventTarget, keepFired = false) {
  const rec = holds.get(target);
  if (!rec) return;
  window.clearTimeout(rec.t);
  rec.cleanup();
  if (!keepFired || !rec.fired) holds.delete(target);
}

export function armHold(e: ReactPointerEvent<Element>, onLong: () => void) {
  if (e.pointerType !== "touch" || e.isPrimary === false) return;
  const target = e.currentTarget;
  const prev = holds.get(target);
  if (prev) {
    window.clearTimeout(prev.t);
    prev.cleanup();
    holds.delete(target);
  }
  const rec = {
    t: 0,
    x: e.clientX,
    y: e.clientY,
    pid: e.pointerId,
    fired: false,
    done: false,
    cleanup: () => {},
  } as Rec;
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== rec.pid || rec.done) return;
    if (Math.hypot(ev.clientX - rec.x, ev.clientY - rec.y) <= MOVE_PX) return;
    drop(target);
  };
  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== rec.pid) return;
    window.clearTimeout(rec.t);
    rec.cleanup();
    if (!rec.fired) holds.delete(target);
  };
  rec.cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
  rec.t = window.setTimeout(() => {
    if (rec.done) return;
    rec.done = true;
    rec.fired = true;
    onLong();
  }, LONG_MS);
  holds.set(target, rec);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

/** True when the long-press already ran, so a right-click handler must not repeat it. */
export function holdTookContext(target: EventTarget) {
  const rec = holds.get(target);
  if (!rec) return false;
  if (rec.done) return true;
  rec.done = true;
  rec.fired = true;
  window.clearTimeout(rec.t);
  return false;
}

/** True when this click belongs to a finished long-press and must not fire the left-click action. */
export function swallowHoldClick(e: ReactMouseEvent<Element>) {
  const rec = holds.get(e.currentTarget);
  if (!rec) return false;
  holds.delete(e.currentTarget);
  if (!rec.fired) return false;
  e.preventDefault();
  e.stopPropagation();
  return true;
}
