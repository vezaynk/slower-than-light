/** INVENTED session store for the open run. It encodes no wiki rule. */
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { noteRun } from "./wiki/achievement-track.ts";
import { noteUnlocks } from "./unlock-store.ts"; // @agent:unlocks
import { createGame, loadGame, restartRun, saveGame, step, titleHandoff } from "./sim.ts";
import type { CrewPick } from "./crew-look.ts";
import type { Difficulty, Game } from "./types.ts";

type Store = {
  version: number;
  game: Game;
  /** The run the player was playing. The title placeholder is not that run. */
  played: Game | null;
  /** Where a finished run returns. The hangar is not a phase. */
  boot: "title" | "hangar";
  tick: (dt: number) => void;
  bump: () => void;
  act: (fn: (g: Game) => void) => void;
  toTitle: (boot: "title" | "hangar") => void;
  newRun: (hullId?: string, difficulty?: Difficulty, crew?: CrewPick[]) => void;
  restartSame: (prev: Game) => void;
  continueRun: () => boolean;
};

type Actions = Omit<Store, "version" | "game" | "played" | "boot">;

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
    toTitle: (boot) => {
      const handoff = titleHandoff(get().game);
      set({
        game: handoff.title,
        played: handoff.played ?? get().played ?? null,
        boot,
        version: get().version + 1,
      });
    },
    newRun: (hullId?: string, difficulty: Difficulty = "normal", crew: CrewPick[] = []) => {
      const prev = get().played ?? get().game;
      const seed = (Date.now() ^ 0x9e3779b9) >>> 0 || 1;
      // Sectors, Hidden Crystal Worlds: the next hangar start reads the run the player was playing.
      const next = restartRun(prev, seed, hullId, difficulty, crew);
      noteRun(next);
      noteUnlocks(next);
      saveGame(next);
      set({ game: next, played: null, version: get().version + 1 });
    },
    restartSame: (prev) => {
      const seed = (Date.now() ^ 0x9e3779b9) >>> 0 || 1;
      // Sectors, Hidden Crystal Worlds: verdict RESTART reads the run on screen.
      const next = restartRun(prev, seed, prev.hullId, prev.difficulty);
      noteRun(next);
      noteUnlocks(next);
      saveGame(next);
      set({ game: next, played: null, version: get().version + 1 });
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
type Shared = { __stlStore?: UseBoundStore<StoreApi<Store>> };
const shared = import.meta.env?.DEV ? (globalThis as Shared).__stlStore : undefined;

export const useGame: UseBoundStore<StoreApi<Store>> =
  shared ??
  create<Store>((set, get) => {
    const game = createGame(1);
    game.phase = "title";
    return { version: 0, boot: "title", game, played: null, ...actions(set, get) };
  });

if (shared) shared.setState(actions(shared.setState, shared.getState));
if (import.meta.env?.DEV) (globalThis as Shared).__stlStore = useGame;

/**
 * Verdict RESTART. WikiViews calls this with the run still on screen.
 * Sectors, Hidden Crystal Worlds: newRun applies dropCrystalRestart to that run, not the title placeholder.
 */
export function verdictRestart(game: Game): void {
  const onScreen = game.phase === "title" ? (useGame.getState().played ?? game) : game;
  useGame.setState({
    game: onScreen,
    played: onScreen.phase === "title" ? null : onScreen,
  });
  useGame.getState().newRun(onScreen.hullId, onScreen.difficulty);
}

/**
 * Verdict HANGAR, MAIN MENU, and QUIT. WikiViews calls this.
 * The run on screen is kept before the title placeholder replaces it, so the next hangar start
 * (newRun) still applies dropCrystalRestart to a Hidden Crystal Worlds game-over.
 * INVENTED: the page names no remembered run. The title placeholder is not the crystal sector.
 */
export function goTitle(boot: "title" | "hangar"): void {
  const onScreen = useGame.getState().game;
  if (onScreen.phase !== "title") useGame.setState({ played: onScreen });
  useGame.getState().toTitle(boot);
}
