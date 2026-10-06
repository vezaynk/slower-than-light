/** INVENTED session store for the open run. It encodes no wiki rule. */
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { noteRun } from "./wiki/achievement-track";
import { noteUnlocks } from "./unlock-store"; // @agent:unlocks
import { createGame, loadGame, saveGame, step } from "./sim";
import type { CrewPick } from "./crew-look";
import type { Difficulty, Game } from "./types";

type Store = {
  version: number;
  game: Game;
  /** Where a finished run returns. The hangar is not a phase. */
  boot: "title" | "hangar";
  tick: (dt: number) => void;
  bump: () => void;
  act: (fn: (g: Game) => void) => void;
  newRun: (hullId?: string, difficulty?: Difficulty, crew?: CrewPick[]) => void;
  continueRun: () => boolean;
};

type Actions = Omit<Store, "version" | "game" | "boot">;

function actions(set: StoreApi<Store>["setState"], get: StoreApi<Store>["getState"]): Actions {
  return {
    tick: (dt) => {
      const game = get().game;
      step(game, dt);
      noteRun(game);
      noteUnlocks(game);
    },
    bump: () => set({ version: get().version + 1 }),
    act: (fn) => {
      const game = get().game;
      fn(game);
      noteRun(game);
      noteUnlocks(game);
      saveGame(game);
      set({ version: get().version + 1 });
    },
    newRun: (hullId?: string, difficulty: Difficulty = "normal", crew: CrewPick[] = []) => {
      const seed = (Date.now() ^ 0x9e3779b9) >>> 0 || 1;
      const next = createGame(seed, hullId, difficulty, crew);
      noteRun(next);
      noteUnlocks(next);
      saveGame(next);
      set({ game: next, version: get().version + 1 });
    },
    continueRun: () => {
      const next = loadGame();
      if (!next) return false;
      noteRun(next);
      noteUnlocks(next);
      set({ game: next, version: get().version + 1 });
      return true;
    },
  };
}

/**
 * Dev hot reload re-runs this module whenever sim.ts or anything below it changes. A second store
 * would leave the game loop ticking the old one while the screen shows a fresh, frozen one. So in dev
 * there is one store per page: a re-run keeps the run in progress and only swaps in the new actions.
 */
type Shared = { __ashwakeStore?: UseBoundStore<StoreApi<Store>> };
const shared = import.meta.env?.DEV ? (globalThis as Shared).__ashwakeStore : undefined;

export const useGame: UseBoundStore<StoreApi<Store>> =
  shared ??
  create<Store>((set, get) => {
    const game = createGame(1);
    game.phase = "title";
    return { version: 0, boot: "title", game, ...actions(set, get) };
  });

if (shared) shared.setState(actions(shared.setState, shared.getState));
if (import.meta.env?.DEV) (globalThis as Shared).__ashwakeStore = useGame;
