/** INVENTED session store for the open run. It encodes no wiki rule. */
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { noteRun } from "@stl/sim/rules/achievement-track.ts";
import { noteUnlocks } from "./unlock-store.ts"; // @agent:unlocks
import { readPinnedSeed, resolveRunSeed } from "./run-seed.ts";
import { presentAudio } from "./present-audio.ts";
import { bindCueTarget } from "@stl/sim/sfx-queue.ts";
import type { Cue } from "@stl/sim/types.ts";
import {
  createGame,
  loadGame,
  restartRun,
  saveGame,
  sealEmptyEvent,
  step,
  titleHandoff,
} from "@stl/sim/sim.ts";
import { quietPackWarnings } from "@stl/pack";
import type { CrewPick } from "@stl/sim/crew-look.ts";
import type { Difficulty, Game } from "@stl/sim/types.ts";

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
      const previous = bindCueTarget(game);
      let cues: Cue[] = [];
      try {
        cues = step(game, dt);
      } finally {
        bindCueTarget(previous);
      }
      presentAudio(game, cues);
      sealEmptyEvent(game);
      noteRun(game);
      noteUnlocks(game);
    },
    bump: () => set({ version: get().version + 1 }),
    act: (fn) => {
      const game = get().game;
      const previous = bindCueTarget(game);
      try {
        fn(game);
      } finally {
        bindCueTarget(previous);
      }
      presentAudio(game);
      sealEmptyEvent(game);
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
      // A page may pin __stlSeed before START. Otherwise the run is mixed from the clock.
      const seed = resolveRunSeed(readPinnedSeed(), Date.now());
      // Sectors, Hidden Crystal Worlds: the next hangar start reads the run the player was playing.
      const next = restartRun(prev, seed, hullId, difficulty, crew);
      noteRun(next);
      noteUnlocks(next);
      saveGame(next);
      set({ game: next, played: null, version: get().version + 1 });
    },
    restartSame: (prev) => {
      const seed = resolveRunSeed(readPinnedSeed(), Date.now());
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
function titleGame(): Game {
  const game = createGame(1);
  game.phase = "title";
  return game;
}

type Shared = { __stlStore?: UseBoundStore<StoreApi<Store>> };
const shared = import.meta.env?.DEV ? (globalThis as Shared).__stlStore : undefined;

export const useGame: UseBoundStore<StoreApi<Store>> =
  shared ??
  create<Store>((set, get) => {
    // Built at import, before setup has loaded any archive: its empty-pack fallbacks (no sectors to chart) are
    // not data problems, so they stay quiet. Launch replaces it with refreshTitleGame once the pack is in.
    const game = quietPackWarnings(() => titleGame());
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

/**
 * Launch (launch.ts) calls this once the pack is installed: the title placeholder is rebuilt on the loaded
 * sectors and ships. A run already on screen is left alone.
 */
export function refreshTitleGame(): void {
  const state = useGame.getState();
  if (state.game.phase !== "title") return;
  useGame.setState({ game: titleGame(), version: state.version + 1 });
}
