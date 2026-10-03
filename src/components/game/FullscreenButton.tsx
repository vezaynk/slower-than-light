/**
 * Toggles browser fullscreen for the whole page. Screen.tsx already rescales the 16:9 screen
 * on resize, so the game fills the display. Hidden where the browser has no fullscreen API
 * (iPhone Safari, some embedded previews).
 */
import { useEffect, useState } from "react";
import { PixelIcon } from "./PixelIcon";

type Legacy = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type LegacyEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function current() {
  const d = document as Legacy;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

export function FullscreenButton({ className = "frame-btn" }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const d = document as Legacy;
    setSupported(!!(d.fullscreenEnabled || d.webkitFullscreenEnabled));
    setOn(current());
    const sync = () => setOn(current());
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const d = document as Legacy;
    const root = document.documentElement as LegacyEl;
    // Some embeds refuse fullscreen without saying so in fullscreenEnabled. Nothing to undo then.
    const ask = current() ? (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()) : (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    Promise.resolve(ask).catch(() => undefined);
  }

  const label = on ? "Exit full screen" : "Full screen";
  return (
    <button type="button" className={className} aria-label={label} title={label} onClick={toggle}>
      <PixelIcon name={on ? "windowed" : "fullscreen"} size={20} />
    </button>
  );
}
