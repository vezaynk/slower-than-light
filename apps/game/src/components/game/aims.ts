import { create } from "zustand";

/** UI-only aim modes. They are not part of the saved run. */
export const useHackAim = create<{ on: boolean }>(() => ({ on: false }));
export const useSlingAim = create<{ on: boolean }>(() => ({ on: false }));
export const useLeashAim = create<{ on: boolean }>(() => ({ on: false }));

export function setHackAim(on: boolean) {
  if (useHackAim.getState().on !== on) useHackAim.setState({ on });
}

export function setSlingAim(on: boolean) {
  if (useSlingAim.getState().on !== on) useSlingAim.setState({ on });
}

export function setLeashAim(on: boolean) {
  if (useLeashAim.getState().on !== on) useLeashAim.setState({ on });
}

export function clearAims() {
  setHackAim(false);
  setSlingAim(false);
  setLeashAim(false);
}
