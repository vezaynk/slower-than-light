/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the window and letterboxed. Layout inside never sees the window size, so
 * the aspect ratio is the same on every display and the page never scrolls.
 */
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function measure() {
  return {
    fit: Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H),
    portrait: window.innerHeight > window.innerWidth,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const [view, setView] = useState<{ fit: number; portrait: boolean } | null>(null);

  useBrowserLayoutEffect(() => {
    const update = () => setView(measure());
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const style = { "--fit": view?.fit ?? 1 } as CSSProperties;
  return (
    <div className="viewport">
      <div className={`screen${view ? " is-fit" : ""}`} style={style}>
        {children}
      </div>
      {view?.portrait ? <p className="rotate-hint">Turn your device sideways for a larger view.</p> : null}
    </div>
  );
}
