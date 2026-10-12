/**
 * Per the user: player options (the Options screen's Graphics and Sound tabs). Saved on this device, apart from any
 * run, so they carry from the title screen into every game. INVENTED set and defaults.
 */
import { create } from "zustand";

export type Settings = {
  /** Shake the ship view on hits. Off by default when the system asks for reduced motion. */
  shake: boolean;
  /** Faint copies of walking crew where they are headed. */
  ghosts: boolean;
  /** The oxygen bar along each room's floor. */
  roomAir: boolean;
  muted: boolean;
  /** 0 to 1. */
  volume: number;
};

const KEY = "stl-settings-v1";

function defaults(): Settings {
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return { shake: !reduced, ghosts: true, roomAir: true, muted: false, volume: 1 };
}

function load(): Settings {
  const base = defaults();
  try {
    if (typeof localStorage === "undefined") return base;
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<Settings>;
    return {
      shake: typeof saved.shake === "boolean" ? saved.shake : base.shake,
      ghosts: typeof saved.ghosts === "boolean" ? saved.ghosts : base.ghosts,
      roomAir: typeof saved.roomAir === "boolean" ? saved.roomAir : base.roomAir,
      muted: typeof saved.muted === "boolean" ? saved.muted : base.muted,
      volume: typeof saved.volume === "number" ? Math.max(0, Math.min(1, saved.volume)) : base.volume,
    };
  } catch {
    return base;
  }
}

export const useSettings = create<Settings>(() => load());

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  useSettings.setState({ [key]: value } as Pick<Settings, K>);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(useSettings.getState()));
  } catch {
    /* storage blocked or full: the choice still holds for this visit */
  }
}

/** The in-game Options panel is open (the HUD wrench). UI state, not saved. */
export const useOptionsOpen = create<{ open: boolean }>(() => ({ open: false }));
