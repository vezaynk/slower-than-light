/**
 * Per the user: the setup screen ("bootloader") is split from the game. The player picks and orders their game
 * files there, then launches into the title. After a first launch, later visits load the saved files and go
 * straight to the title. QUIT on the title comes back here.
 */
import { create } from "zustand";
import { loadOrder, orderKey } from "./pack/archive-list";
import { bootedOrderKey, loadBasePackXml, urlArchive } from "./pack/boot";
import {
  LAUNCHED_KEY,
  LAUNCH_NOW_KEY,
  initialStage,
  relaunchReloads,
  type LaunchStage,
} from "./launch-stage";
import { refreshTitleGame } from "./store";

type LaunchState = {
  stage: LaunchStage;
  /** Load progress, 0 to 1, while booting. */
  ratio: number;
  /** Why the last launch failed. Setup shows it above the Launch button. */
  error?: string;
};

function readFlag(storage: "local" | "session", key: string, take = false): boolean {
  try {
    const store = storage === "local" ? localStorage : sessionStorage;
    const on = store.getItem(key) != null;
    if (take) store.removeItem(key);
    return on;
  } catch {
    return false;
  }
}

function writeFlag(storage: "local" | "session", key: string): void {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, "1");
  } catch {
    /* private mode: setup simply opens again next visit */
  }
}

function startStage(): LaunchStage {
  if (typeof window === "undefined") return "setup";
  return initialStage({
    urlArchive: urlArchive() != null,
    launched: readFlag("local", LAUNCHED_KEY),
    launchNow: readFlag("session", LAUNCH_NOW_KEY, true),
  });
}

export const useLaunch = create<LaunchState>(() => ({ stage: startStage(), ratio: 0 }));

/** True once a launch has succeeded in this browser, so a reload goes straight to the title. */
export function hasLaunched(): boolean {
  return readFlag("local", LAUNCHED_KEY);
}

/** True once the pack is installed in this page, so new files need a reload to take effect. */
export function packInstalled(): boolean {
  return installed;
}

/** Set before a reload that should skip setup (a new file order, or files received from another device). */
export function launchAfterReload(): void {
  writeFlag("session", LAUNCH_NOW_KEY);
}

let loading: Promise<void> | null = null;
/** The pack finished installing in this page. A failed boot leaves it false, so Launch boots again. */
let installed = false;

/** Loads the saved files (or `?dat=`) and opens the title. A failure returns to setup with the reason. */
export function bootPack(): Promise<void> {
  loading ??= (async () => {
    useLaunch.setState({ stage: "booting", ratio: 0, error: undefined });
    try {
      await loadBasePackXml((ratio) => useLaunch.setState({ ratio }));
      installed = true;
      // The order is read when the load starts. One saved while it ran (another tab) is applied by a reload,
      // so this session opens the same files the next one will.
      if (relaunchReloads(orderKey(await loadOrder()), bootedOrderKey())) {
        launchAfterReload();
        location.reload();
        return;
      }
      writeFlag("local", LAUNCHED_KEY);
      refreshTitleGame();
      useLaunch.setState({ stage: "ready", ratio: 1 });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      useLaunch.setState({ stage: "setup", error: `The game files did not load (${reason}).` });
      loading = null;
    }
  })();
  return loading;
}

/**
 * Setup's Launch button. Before anything is loaded it boots. After QUIT, the same file order goes back to the
 * title as it is; a changed order reloads the page, because the loaded pack cannot be unloaded in place.
 */
export async function launch(): Promise<void> {
  if (!installed) return bootPack();
  if (relaunchReloads(orderKey(await loadOrder()), bootedOrderKey())) {
    launchAfterReload();
    location.reload();
    return;
  }
  useLaunch.setState({ stage: "ready", error: undefined });
}

/** QUIT on the title: back to setup. The loaded pack stays until Launch decides whether to reload. */
export function toSetup(): void {
  useLaunch.setState({ stage: "setup" });
}
