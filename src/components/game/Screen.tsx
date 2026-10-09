/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the visible viewport and letterboxed. Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ScreenView = {
  fit: number;
  portrait: boolean;
  w: number;
  h: number;
};

const ScreenContext = createContext<ScreenView | null>(null);

export function useScreenView() {
  return useContext(ScreenContext);
}

function installedApp() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!(
    nav.standalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function deviceSize(rawW: number, rawH: number) {
  // An iframe must stay inside the preview. A home-screen app can draw under the status bar.
  if (window.parent !== window || !installedApp()) return { rawW, rawH };
  const sw = screen.width;
  const sh = screen.height;
  if (!(sw > 0) || !(sh > 0)) return { rawW, rawH };
  const screenPortrait = sh >= sw;
  const viewPortrait = rawH >= rawW;
  if (screenPortrait === viewPortrait) return { rawW: Math.max(rawW, sw), rawH: Math.max(rawH, sh) };
  return { rawW: Math.max(rawW, sh), rawH: Math.max(rawH, sw) };
}

function readPx(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function measure(): ScreenView & { top: number; left: number } {
  const vv = window.visualViewport;
  const offsetTop = vv?.offsetTop ?? 0;
  const offsetLeft = vv?.offsetLeft ?? 0;
  // Firefox keeps a classic scrollbar. innerWidth includes that bar, so a fixed box sized to it
  // sticks out and the bar comes back. clientWidth is the space beside the bar.
  const docW = document.documentElement.clientWidth;
  const docH = document.documentElement.clientHeight;
  const sized = deviceSize(
    Math.min(vv?.width ?? window.innerWidth, window.innerWidth, docW > 0 ? docW : window.innerWidth),
    Math.min(vv?.height ?? window.innerHeight, window.innerHeight, docH > 0 ? docH : window.innerHeight),
  );
  const rawW = sized.rawW;
  const rawH = sized.rawH;
  const sat = readPx("--sat");
  const sab = readPx("--sab");
  const sal = readPx("--sal");
  const sar = readPx("--sar");
  const w = Math.max(1, rawW - sal - sar);
  const h = Math.max(1, rawH - sat - sab);
  return {
    top: offsetTop + sat,
    left: offsetLeft + sal,
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
    const editable = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("input, textarea, select, .fs-guide-url");
    const blockSelect = (event: Event) => {
      if (editable(event.target)) return;
      event.preventDefault();
    };
    const blockGesture = (event: Event) => {
      event.preventDefault();
    };
    const blockPinchZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    const blockMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    document.addEventListener("selectstart", blockSelect);
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    window.addEventListener("wheel", blockPinchZoom, { passive: false });
    document.addEventListener("touchmove", blockMultiTouch, { passive: false });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      window.removeEventListener("wheel", blockPinchZoom);
      document.removeEventListener("touchmove", blockMultiTouch);
    };
  }, []);

  const frame = { "--fit": view?.fit ?? 1 } as CSSProperties;
  const box = view
    ? ({ top: view.top, left: view.left, width: view.w, height: view.h } as CSSProperties)
    : undefined;
  return (
    <ScreenContext.Provider value={view}>
      <div className="viewport" style={box}>
        <div className={`screen${view ? " is-fit" : ""}`} style={frame}>
          {children}
        </div>
      </div>
    </ScreenContext.Provider>
  );
}