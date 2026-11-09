/**
 * Per the user: the setup screen ("bootloader") comes before the game. These are its stage rules, apart from
 * the loading itself (launch.ts) so they run in tests without the bundled archive.
 */

export type LaunchStage = "setup" | "booting" | "ready";

/** localStorage: set after the first successful launch, so later visits skip setup (per the user). */
export const LAUNCHED_KEY = "stl-setup-launched";
/** sessionStorage: set right before a reload that should land on the title, read once. */
export const LAUNCH_NOW_KEY = "stl-launch-now";

export type StageInputs = {
  /** `?dat=` names the archive, so there is nothing to pick. */
  urlArchive: boolean;
  /** A launch has succeeded in this browser before. */
  launched: boolean;
  /** The page was reloaded from setup to apply a new file order. */
  launchNow: boolean;
};

/** Where a fresh page starts: setup on a first visit, otherwise straight to loading the saved files. */
export function initialStage(inputs: StageInputs): LaunchStage {
  if (inputs.urlArchive || inputs.launched || inputs.launchNow) return "booting";
  return "setup";
}

/**
 * The opening control's words. The server HTML and the first client paint are setup, so they
 * say "Launch". After mount, a browser that already launched (or was opened with ?dat=) is
 * booting and says "Loading the game files".
 */
export function openingControlLabel(stage: LaunchStage): "Launch" | "Loading the game files" {
  return stage === "booting" ? "Loading the game files" : "Launch";
}

/**
 * Launching again from setup after QUIT. The running pack cannot be unloaded, so a changed file order reloads
 * the page. The same order (or a `?dat=` boot, which ignores the list) goes back to the title as it is.
 */
export function relaunchReloads(savedKey: string, bootedKey: string | undefined): boolean {
  if (bootedKey === undefined) return false;
  if (bootedKey === "url") return false;
  return savedKey !== bootedKey;
}
