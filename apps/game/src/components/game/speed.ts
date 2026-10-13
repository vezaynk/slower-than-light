/**
 * Per the user: fast forward speeds up everything, animations included. The sim runs more ticks per frame
 * (GameApp loop); the canvas effects scale their frame time by animSpeed(); CSS animations and transitions get the same
 * playbackRate (applyCssSpeed). INVENTED speed: twice as fast. Not saved; a new page starts at 1x.
 */
import { create } from "zustand";

export const FAST_SPEED = 2;

export const useFast = create<{ on: boolean }>(() => ({ on: false }));

/** How fast animations play right now. */
export function animSpeed(): number {
  return useFast.getState().on ? FAST_SPEED : 1;
}

/** Sets every running CSS animation and transition on the page to the current speed. Cheap; call it often. */
export function applyCssSpeed() {
  if (typeof document === "undefined" || typeof document.getAnimations !== "function") return;
  const rate = animSpeed();
  for (const a of document.getAnimations()) if (a.playbackRate !== rate) a.playbackRate = rate;
}
