/**
 * Picture variant, cursor, and the score. Fire and repair loops run from the simulation step.
 */
import { useEffect, useSyncExternalStore } from "react";
import { scorePick, syncScore } from "@/game/audio";
import { CURSOR_FILE } from "@stl/pack";
import {
  archiveGeneration,
  archiveImage,
  setImageVariant,
  subscribeArchive,
} from "@/game/pack/media";
import { useSettings } from "@/game/settings";
import { halted } from "@/game/sim";
import { useGame } from "@/game/store";

export function ArchiveBed() {
  const version = useGame((s) => s.version);
  const colorblind = useSettings((s) => s.colorblind);
  const archive = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  useEffect(() => {
    const tablet =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(pointer: coarse) and (min-width: 768px)").matches;
    const lang = typeof document !== "undefined" ? document.documentElement.lang || "en" : "en";
    setImageVariant({ colorblind, tablet, lang });
    const cursor = archive >= 0 ? archiveImage(CURSOR_FILE) : undefined;
    document.documentElement.style.setProperty(
      "--cursor-pointer",
      cursor ? `url("${cursor}") 1 1, pointer` : "pointer",
    );
    const game = useGame.getState().game;
    const pick = scorePick({
      phase: game.phase,
      sectorName: game.sectorName,
      combat: game.phase === "combat" && !!game.enemy,
    });
    syncScore({ track: pick.track, combat: pick.mode === "combat", paused: halted(game) });
  }, [version, colorblind, archive]);
  return null;
}
