/**
 * INVENTED: every view renders on one 1280×720 screen (16:9). The viewport stretches
 * with the window. The screen scales by the smaller of the width ratio and the height
 * ratio, so it shrinks with either side and letterboxes on the other.
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useSettings } from "@/game/settings";
import { canForceLandscape, setPageTurn, type PageTurn } from "./turn";

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Fit the 1280×720 screen to the viewport's box. */
function paintFit(viewport: HTMLElement | null, screen: HTMLElement | null) {
  if (!viewport || !screen) return;
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  const fit = w > 0 && h > 0 ? Math.min(w / SCREEN_W, h / SCREEN_H) : 1;
  screen.style.transform = `translate(-50%, -50%) scale(${fit})`;
  screen.classList.add("is-fit");
}


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

export function Screen({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const rotate = useSettings((s) => s.rotate);

  useBrowserLayoutEffect(() => {
    const update = () => {
      // Forced landscape: Android's installed app takes a real orientation lock (the OS rotates, and the turn below
      // comes out 0); iOS has none, so the page turns by CSS. Off restores everything.
      applyTurn(wantedTurn(useSettings.getState().rotate));
      paintFit(viewportRef.current, screenRef.current);
    };
    update();
    const observed = viewportRef.current;
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

  return (
    <div className="viewport" ref={viewportRef}>
      <div className="screen" ref={screenRef}>{children}</div>
    </div>
  );
}