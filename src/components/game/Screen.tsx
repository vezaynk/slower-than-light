/**
 * INVENTED: every view renders on one 720-high screen, scaled uniformly to
 * fit the visible viewport. It is 1280 wide (16:9) and letterboxed on narrower displays; on a wider one
 * (a phone in landscape is about 19.5:9) it widens to the display's shape, up to MAX_ASPECT, so the game takes
 * the full width (per the user). Layout inside never sees the window
 * size, so the aspect ratio is the same on every display and the page never scrolls.
 * The box is the visual viewport (not window.innerHeight) so iOS browser chrome
 * does not leave the screen short or scrolled under the URL bar.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSettings } from "@/game/settings";
import { canForceLandscape, installedApp, pageTurn, setPageTurn, type PageTurn } from "./turn";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;
/** INVENTED cap: wider than 2.4:1 letterboxes again, so an ultrawide monitor does not stretch the HUD apart. */
const MAX_ASPECT = 2.4;

/** Logical screen width for a viewport: 1280, or wider to fill a wider display. */
function screenWidth(w: number, h: number): number {
  if (!(w > 0) || !(h > 0) || h > w) return SCREEN_W;
  const aspect = Math.min(MAX_ASPECT, w / h);
  return Math.max(SCREEN_W, Math.round(SCREEN_H * aspect));
}

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type ScreenView = {
  fit: number;
  /** Logical width of the screen box (SCREEN_W or wider). */
  width: number;
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

/**
 * The safe-area insets in pixels (status bar, notch, home indicator). Reading the --sat style variables back gives the
 * unresolved text "env(safe-area-inset-top, 0px)", which parsed as 0, so the game drew under the iOS status bar
 * (bug reported by the user with forced landscape). A hidden probe's padding resolves env() to real pixels.
 */
let insetProbe: HTMLDivElement | null = null;
function safeInsets(): { t: number; b: number; l: number; r: number } {
  if (!insetProbe) {
    insetProbe = document.createElement("div");
    insetProbe.setAttribute("aria-hidden", "true");
    insetProbe.style.cssText =
      "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
    document.documentElement.append(insetProbe);
  }
  const cs = getComputedStyle(insetProbe);
  const px = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  return { t: px(cs.paddingTop), b: px(cs.paddingBottom), l: px(cs.paddingLeft), r: px(cs.paddingRight) };
}

/**
 * Per the user (forced landscape): the phone's physical angle. 90 means its top (camera) is on the left, 270 on the
 * right. screen.orientation.angle where there is one, else iOS's window.orientation (-90 is 270).
 */
function deviceAngle(): number {
  const so = typeof screen !== "undefined" ? screen.orientation : undefined;
  const legacy = (window as Window & { orientation?: number }).orientation;
  const raw = typeof legacy === "number" ? legacy : (so?.angle ?? 0);
  return ((raw % 360) + 360) % 360;
}


/** The CSS turn that shows the page in the chosen landscape, given how the phone is held now. */
function wantedTurn(rotate: "off" | "left" | "right"): PageTurn {
  if (rotate === "off" || !canForceLandscape()) return 0;
  const target = rotate === "left" ? 90 : 270;
  const turn = (((target - deviceAngle()) % 360) + 360) % 360;
  return (turn === 90 || turn === 180 || turn === 270 ? turn : 0) as PageTurn;
}

/** Puts the body in the turn (styles.css .page-turn-*), with the physical size it is laid across. */
function applyTurn(turn: PageTurn) {
  setPageTurn(turn);
  const body = document.body;
  body.classList.toggle("page-turn-90", turn === 90);
  body.classList.toggle("page-turn-180", turn === 180);
  body.classList.toggle("page-turn-270", turn === 270);
  body.style.setProperty("--phys-w", `${window.innerWidth}px`);
  body.style.setProperty("--phys-h", `${window.innerHeight}px`);
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
  // Safe-area insets are physical; under a forced-landscape turn (turn.ts) each lands on a different page side.
  const turn = pageTurn();
  const phys = safeInsets();
  const sides =
    turn === 90
      ? { t: phys.r, b: phys.l, l: phys.t, r: phys.b }
      : turn === 270
        ? { t: phys.l, b: phys.r, l: phys.b, r: phys.t }
        : turn === 180
          ? { t: phys.b, b: phys.t, l: phys.r, r: phys.l }
          : phys;
  const sat = sides.t;
  const sab = sides.b;
  const sal = sides.l;
  const sar = sides.r;
  const quarter = turn === 90 || turn === 270;
  if (!pin) {
    const w = quarter ? innerH : box && box.w > 0 ? box.w : innerW;
    const h = quarter ? innerW : box && box.h > 0 ? box.h : innerH;
    return {
      top: 0,
      left: 0,
      w,
      h,
      width: screenWidth(w, h),
      fit: Math.min(w / screenWidth(w, h), h / SCREEN_H),
      portrait: h > w,
      pin: false,
    };
  }
  // A quarter turn lays the body across exactly innerWidth x innerHeight (applyTurn's --phys-w / --phys-h). The screen
  // size (deviceSize) can be taller than that when iOS keeps the status bar outside the web view, and the box then ran
  // past the body's clipped edge (bug reported by the user: the right side cut off in forced landscape).
  const physSized = quarter ? { rawW: innerW, rawH: innerH } : deviceSize(vvW, vvH);
  const sized = quarter ? { rawW: physSized.rawH, rawH: physSized.rawW } : physSized;
  const w = Math.max(1, sized.rawW - sal - sar);
  const h = Math.max(1, sized.rawH - sat - sab);
  return {
    top: (quarter ? 0 : offsetTop) + sat,
    left: (quarter ? 0 : offsetLeft) + sal,
    w,
    h,
    width: screenWidth(w, h),
    fit: Math.min(w / screenWidth(w, h), h / SCREEN_H),
    portrait: sized.rawH > sized.rawW,
    pin: true,
  };
}

export function Screen({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ReturnType<typeof measure> | null>(null);
  const rotate = useSettings((s) => s.rotate);

  useBrowserLayoutEffect(() => {
    const update = () => {
      // Forced landscape: Android's installed app takes a real orientation lock (the OS rotates, and the turn below
      // comes out 0); iOS has none, so the page turns by CSS. Off restores everything.
      applyTurn(wantedTurn(useSettings.getState().rotate));
      const el = ref.current;
      const rect = el?.getBoundingClientRect();
      const box = rect && rect.width > 0 && rect.height > 0 ? { w: rect.width, h: rect.height } : null;
      const next = measure(box);
      setView((prev) =>
        prev &&
        prev.fit === next.fit &&
        prev.width === next.width &&
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
    const orient = typeof screen !== "undefined" ? screen.orientation : undefined;
    orient?.addEventListener?.("change", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    const editable = (target: EventTarget | null) =>
      target instanceof Element && !!target.closest("input, textarea, select, .install-url");
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
      orient?.removeEventListener?.("change", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("selectstart", blockSelect);
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      window.removeEventListener("wheel", blockPinchZoom);
      document.removeEventListener("touchmove", blockMultiTouch);
    };
  }, []);

  useEffect(() => {
    const orient = (typeof screen !== "undefined" ? screen.orientation : undefined) as
      | (ScreenOrientation & { lock?: (type: string) => Promise<void>; unlock?: () => void })
      | undefined;
    if (rotate !== "off" && canForceLandscape() && orient?.lock) {
      orient.lock(rotate === "left" ? "landscape-primary" : "landscape-secondary").catch(() => undefined);
    } else if (rotate === "off") {
      try {
        orient?.unlock?.();
      } catch {
        /* nothing locked */
      }
    }
    window.dispatchEvent(new Event("resize"));
  }, [rotate]);

  const fit = view?.fit ?? 1;
  // The scale is an inline transform. A custom property used only inside scale()
  // can keep the previous matrix when the window changes.
  const frame = {
    "--fit": fit,
    width: view?.width ?? SCREEN_W,
    transform: `translate(-50%, -50%) scale(${fit})`,
  } as CSSProperties;
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