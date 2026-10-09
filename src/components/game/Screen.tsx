/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the visible viewport and letterboxed. Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 * Phone controls used to portal into a sibling of `.screen`. They don't anymore:
 * on a coarse pointer the screen fills the device instead of scaling a 1280×720
 * picture, so the buttons on the board stay finger-sized.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ScreenView = {
  fit: number;
  portrait: boolean;
  /** Coarse pointer held upright: the stage is rotated so the board is landscape. */
  turned: boolean;
  /** Coarse pointer, or a 44px control on the board would draw smaller than 44 device pixels. */
  phone: boolean;
  w: number;
  h: number;
};

const ScreenContext = createContext<ScreenView | null>(null);

export function useScreenView() {
  return useContext(ScreenContext);
}

export function usePhoneLayout() {
  return useScreenView()?.phone ?? false;
}

function installedApp() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!(
    nav.standalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** Android and some installed apps honor this. iOS only honors the manifest, and only after a reinstall. */
export function lockLandscape() {
  const orientation = screen.orientation as ScreenOrientation & { lock?: (mode: string) => Promise<void> };
  const lock = orientation?.lock?.bind(orientation);
  if (!lock) return;
  void lock("landscape").catch(() => undefined);
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
  const sized = deviceSize(
    Math.min(vv?.width ?? window.innerWidth, window.innerWidth),
    Math.min(vv?.height ?? window.innerHeight, window.innerHeight),
  );
  const rawW = sized.rawW;
  const rawH = sized.rawH;
  const sat = readPx("--sat");
  const sab = readPx("--sab");
  const sal = readPx("--sal");
  const sar = readPx("--sar");
  const safeW = Math.max(1, rawW - sal - sar);
  const safeH = Math.max(1, rawH - sat - sab);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const portrait = rawH > rawW;
  // iOS will not rotate the phone for a page. Turn the stage instead.
  const turned = coarse && portrait;
  if (turned) {
    return {
      top: offsetTop + sat,
      left: offsetLeft + sal + safeW,
      w: safeH,
      h: safeW,
      fit: Math.min(safeH / SCREEN_W, safeW / SCREEN_H),
      portrait: true,
      turned: true,
      phone: true,
    };
  }
  const fit = Math.min(safeW / SCREEN_W, safeH / SCREEN_H);
  return {
    top: offsetTop + sat,
    left: offsetLeft + sal,
    w: safeW,
    h: safeH,
    fit,
    portrait,
    turned: false,
    phone: coarse || fit < 0.999,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ReturnType<typeof measure> | null>(null);

  useBrowserLayoutEffect(() => {
    const update = () => setView(measure());
    update();
    const coarse = window.matchMedia("(pointer: coarse)");
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    coarse.addEventListener("change", update);
    if (coarse.matches) lockLandscape();
    const lockOnGesture = () => {
      if (window.matchMedia("(pointer: coarse)").matches) lockLandscape();
    };
    window.addEventListener("pointerdown", lockOnGesture);
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
      coarse.removeEventListener("change", update);
      window.removeEventListener("pointerdown", lockOnGesture);
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
  const phone = view?.phone ?? false;
  const cls = ["viewport", phone ? "has-phone" : "", view?.turned ? "is-turned" : "", view?.portrait && !view.turned ? "is-portrait" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <ScreenContext.Provider value={view}>
      <div className={cls} style={box}>
        <div className={`screen${view ? " is-fit" : ""}`} style={frame}>
          {children}
        </div>
        {view?.portrait && !view.turned ? <p className="rotate-hint">Turn your device sideways for a larger view.</p> : null}
      </div>
    </ScreenContext.Provider>
  );
}
