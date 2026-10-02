import { create } from "zustand";
import { createGame, loadGame, saveGame, step } from "./sim";
import type { Game } from "./types";

type Store = {
  version: number;
  game: Game;
  tick: (dt: number) => void;
  bump: () => void;
  act: (fn: (g: Game) => void) => void;
  newRun: (hullId?: string) => void;
  continueRun: () => boolean;
};

export const useGame = create<Store>((set, get) => {
  const game = createGame(1);
  game.phase = "title";
  return {
    version: 0,
    game,
    tick: (dt) => {
      step(get().game, dt);
    },
    bump: () => set({ version: get().version + 1 }),
    act: (fn) => {
      fn(get().game);
      saveGame(get().game);
      set({ version: get().version + 1 });
    },
    newRun: (hullId?: string) => {
      const next = hullId ? createGame((Date.now() ^ 0x9e3779b9) >>> 0 || 1, hullId) : createGame();
      saveGame(next);
      set({ game: next, version: get().version + 1 });
    },
    continueRun: () => {
      const next = loadGame();
      if (!next) return false;
      set({ game: next, version: get().version + 1 });
      return true;
    },
  };
});
