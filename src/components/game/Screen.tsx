/**
 * INVENTED: every view renders on one fixed 1280×720 screen, scaled uniformly to
 * fit the visible viewport and letterboxed. Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 * Phone controls portal into `.touch-root`, a sibling of `.screen`, so they stay
 * in device pixels when the board is scaled down.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ScreenView = {
  fit: number;
  portrait: boolean;
  /** Coarse pointer, or a 44px control on the board would draw smaller than 44 device pixels. */
  phone: boolean;
  w: number;
  h: number;
};

const ScreenContext = createContext<ScreenView | null>(null);
const SlotContext = createContext<HTMLElement | null>(null);

export function useScreenView() {
  return useContext(ScreenContext);
}

export function usePhoneLayout() {
  return useScreenView()?.phone ?? false;
}

export function useTouchSlot() {
  return useContext(SlotContext);
}

function readPx(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function measure(): ScreenView & { top: number; left: number } {
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
  const fit = Math.min(w / SCREEN_W, h / SCREEN_H);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return {
    top: top + sat,
    left: left + sal,
    w,
    h,
    fit,
    portrait: rawH > rawW,
    phone: coarse || fit < 0.999,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ReturnType<typeof measure> | null>(null);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  useBrowserLayoutEffect(() => {
    const update = () => setView(measure());
    update();
    const coarse = window.matchMedia("(pointer: coarse)");
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    coarse.addEventListener("change", update);
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
  const cls = ["viewport", phone ? "has-phone" : "", view?.portrait ? "is-portrait" : ""].filter(Boolean).join(" ");
  return (
    <ScreenContext.Provider value={view}>
      <SlotContext.Provider value={phone ? slot : null}>
        <div className={cls} style={box}>
          <div className={`screen${view ? " is-fit" : ""}`} style={frame}>
            {children}
          </div>
          <div className="touch-root" ref={setSlot} />
          {view?.portrait ? <p className="rotate-hint">Turn your device sideways for a larger view.</p> : null}
        </div>
      </SlotContext.Provider>
    </ScreenContext.Provider>
  );
}
