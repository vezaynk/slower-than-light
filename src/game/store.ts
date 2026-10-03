/** INVENTED session store for the open run. It encodes no wiki rule. */
import { create } from "zustand";
import { noteRun } from "./wiki/achievement-track";
import { createGame, loadGame, saveGame, step } from "./sim";
import type { Difficulty, Game } from "./types";

type Store = {
  version: number;
  game: Game;
  /** Where a finished run returns. The hangar is not a phase. */
  boot: "title" | "hangar";
  tick: (dt: number) => void;
  bump: () => void;
  act: (fn: (g: Game) => void) => void;
  newRun: (hullId?: string, difficulty?: Difficulty) => void;
  continueRun: () => boolean;
};

export const useGame = create<Store>((set, get) => {
  const game = createGame(1);
  game.phase = "title";
  return {
    version: 0,
    boot: "title",
    game,
    tick: (dt) => {
      const game = get().game;
      step(game, dt);
      noteRun(game);
    },
    bump: () => set({ version: get().version + 1 }),
    act: (fn) => {
      const game = get().game;
      fn(game);
      noteRun(game);
      saveGame(game);
      set({ version: get().version + 1 });
    },
    newRun: (hullId?: string, difficulty: Difficulty = "normal") => {
      const seed = (Date.now() ^ 0x9e3779b9) >>> 0 || 1;
      const next = createGame(seed, hullId, difficulty);
      noteRun(next);
      saveGame(next);
      set({ game: next, version: get().version + 1 });
    },
    continueRun: () => {
      const next = loadGame();
      if (!next) return false;
      noteRun(next);
      set({ game: next, version: get().version + 1 });
      return true;
    },
  };
});
