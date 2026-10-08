/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the visible viewport and letterboxed. Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 */
import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readPx(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function measure() {
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const left = vv?.offsetLeft ?? 0;
  const rawW = Math.min(vv?.width ?? window.innerWidth, window.innerWidth);
  const rawH = Math.min(vv?.height ?? window.innerHeight, window.innerHeight);
  const sat = readPx("--sat");
  const sab = readPx("--sab");
  const sal = readPx("--sal");
  const sar = readPx("--sar");
  const w = Math.max(1, rawW - sal - sar);
  const h = Math.max(1, rawH - sat - sab);
  return {
    top: top + sat,
    left: left + sal,
    w,
    h,
    fit: Math.min(w / SCREEN_W, h / SCREEN_H),
    portrait: rawH > rawW,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ReturnType<typeof measure> | null>(null);

  useBrowserLayoutEffect(() => {
    const update = () => setView(measure());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  const frame = { "--fit": view?.fit ?? 1 } as CSSProperties;
  const box = view
    ? ({ top: view.top, left: view.left, width: view.w, height: view.h } as CSSProperties)
    : undefined;
  return (
    <div className="viewport" style={box}>
      <div className={`screen${view ? " is-fit" : ""}`} style={frame}>
        {children}
      </div>
      {view?.portrait ? <p className="rotate-hint">Turn your device sideways for a larger view.</p> : null}
    </div>
  );
}
