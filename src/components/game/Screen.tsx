/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the visible viewport and letterboxed. Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ScreenView = {
  fit: number;
  portrait: boolean;
  /** Visual viewport is offset from the window, so the box is pinned in pixels. */
  pin: boolean;
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

function measure(box: { w: number; h: number } | null): ScreenView & { top: number; left: number } {
  const vv = window.visualViewport;
  const innerW = window.innerWidth;
  const innerH = window.innerHeight;
  const vvW = vv?.width ?? innerW;
  const vvH = vv?.height ?? innerH;
  const offsetTop = vv?.offsetTop ?? 0;
  const offsetLeft = vv?.offsetLeft ?? 0;
  // A home-screen app, or iOS chrome, is not the layout viewport. Pin the box.
  // A normal window leaves the box to CSS (top/right/bottom/left), which tracks the window.
  const installed = window.parent === window && installedApp();
  const pin =
    installed ||
    Math.abs(offsetTop) > 0.5 ||
    Math.abs(offsetLeft) > 0.5 ||
    Math.abs(vvW - innerW) > 1 ||
    Math.abs(vvH - innerH) > 1;
  const sat = readPx("--sat");
  const sab = readPx("--sab");
  const sal = readPx("--sal");
  const sar = readPx("--sar");
  if (!pin) {
    const w = box && box.w > 0 ? box.w : innerW;
    const h = box && box.h > 0 ? box.h : innerH;
    return {
      top: 0,
      left: 0,
      w,
      h,
      fit: Math.min(w / SCREEN_W, h / SCREEN_H),
      portrait: h > w,
      pin: false,
    };
  }
  const sized = deviceSize(vvW, vvH);
  const w = Math.max(1, sized.rawW - sal - sar);
  const h = Math.max(1, sized.rawH - sat - sab);
  return {
    top: offsetTop + sat,
    left: offsetLeft + sal,
    w,
    h,
    fit: Math.min(w / SCREEN_W, h / SCREEN_H),
    portrait: sized.rawH > sized.rawW,
    pin: true,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ReturnType<typeof measure> | null>(null);

  useBrowserLayoutEffect(() => {
    const update = () => {
      const el = ref.current;
      const rect = el?.getBoundingClientRect();
      const box = rect && rect.width > 0 && rect.height > 0 ? { w: rect.width, h: rect.height } : null;
      const next = measure(box);
      setView((prev) =>
        prev &&
        prev.fit === next.fit &&
        prev.w === next.w &&
        prev.h === next.h &&
        prev.pin === next.pin &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.portrait === next.portrait
          ? prev
          : next,
      );
    };
    update();
    const observed = ref.current;
    const obs = new ResizeObserver(update);
    if (observed) obs.observe(observed);
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
      obs.disconnect();
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

  const fit = view?.fit ?? 1;
  // The scale is an inline transform. A custom property used only inside scale()
  // can keep the previous matrix when the window changes.
  const frame = { "--fit": fit, transform: `translate(-50%, -50%) scale(${fit})` } as CSSProperties;
  const box = view?.pin
    ? ({ top: view.top, left: view.left, width: view.w, height: view.h } as CSSProperties)
    : undefined;
  return (
    <ScreenContext.Provider value={view}>
      <div className="viewport" ref={ref} style={box}>
        <div className={`screen${view ? " is-fit" : ""}`} style={frame}>
          {children}
        </div>
      </div>
    </ScreenContext.Provider>
  );
}