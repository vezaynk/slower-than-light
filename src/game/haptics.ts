/**
 * Per the user: haptics. Android browsers take navigator.vibrate patterns. iOS Safari has no vibration API; from iOS 18
 * toggling a native switch control (<input type="checkbox" switch>) gives one light system tap, which is all iOS can
 * do here, and it only answers the player's own touches. The Options setting turns all of it off. INVENTED patterns.
 */
import type { Game } from "./types";
import { useSettings } from "./settings";

export type Buzz = "hold" | "step" | "shield" | "hit" | "heavy" | "crew" | "jump" | "win" | "lose";

const PATTERN: Record<Buzz, number | number[]> = {
  /** A long press took (radial menu, depower a weapon). */
  hold: 15,
  /** One power bar added or removed by a drag. */
  step: 8,
  /** Your shields stopped a shot. */
  shield: 12,
  /** Your hull lost 1 point. */
  hit: 35,
  /** Your hull lost 2 or more in one go. */
  heavy: [50, 30, 50],
  /** One of your crew died. */
  crew: [70, 50, 70],
  /** You jumped. */
  jump: [15, 60, 30],
  /** Enemy beaten. */
  win: [25, 40, 25, 40, 70],
  /** Run over. */
  lose: [200, 80, 300],
};

let lastAt = 0;

/**
 * iOS: the only haptic a web page gets is the system tap of a native switch control (<input type="checkbox" switch>,
 * iOS 18+) toggled through its label. WebKit plays it only while handling the player's own touch, and a hidden switch
 * kept on the page did nothing (bug reported by the user: no haptics on iOS). A fresh label with the switch inside,
 * added, clicked and removed in the same call, is the pattern that works there. INFERRED from that platform behaviour.
 */
function iosTap() {
  if (typeof document === "undefined") return;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.append(input);
  document.head.append(label);
  label.click();
  label.remove();
}

/** True while the browser is dispatching one of the player's touches (set by the capture listeners below). */
let inTouch = false;
/** A press-feedback buzz asked for outside a touch (the long-press timer, a drag's pointermove): played on release. */
let owedAt = 0;

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof (navigator as Navigator & { vibrate?: unknown }).vibrate === "function";
}

if (typeof window !== "undefined") {
  const enter = () => {
    inTouch = true;
    // Any handler on this event runs before the next task.
    window.setTimeout(() => {
      inTouch = false;
    }, 0);
  };
  const release = () => {
    enter();
    // iOS: a long press or a drag step that could not be felt when it happened is felt on release, if still recent.
    if (owedAt && performance.now() - owedAt < 1500 && useSettings.getState().haptics) iosTap();
    owedAt = 0;
  };
  for (const type of ["pointerdown", "click", "touchstart"]) window.addEventListener(type, enter, { capture: true, passive: true });
  for (const type of ["pointerup", "touchend"]) window.addEventListener(type, release, { capture: true, passive: true });
}

/** Buzzes that answer the player's own press. Only these can be felt on iOS (see iosTap). */
const PRESS: ReadonlySet<Buzz> = new Set(["hold", "step"]);

export function buzz(kind: Buzz) {
  if (typeof window === "undefined" || !useSettings.getState().haptics) return;
  const now = performance.now();
  // A burst of hits in one frame is one buzz. A run-ending pattern always plays.
  if (kind !== "lose" && kind !== "win" && now - lastAt < 60) return;
  lastAt = now;
  if (canVibrate()) {
    try {
      (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(PATTERN[kind]);
      return;
    } catch {
      /* blocked: fall through */
    }
  }
  // iOS has no vibration API. Game events (hits, jumps) happen outside a touch and cannot be felt there.
  if (!PRESS.has(kind)) return;
  if (inTouch) iosTap();
  else owedAt = now;
}

type Seen = { game: Game; hull: number; shields: number; crew: number; here: string; phase: Game["phase"] };
let seen: Seen | null = null;

/**
 * Per the user: game events felt on your own ship. Called after each tick; compares with the last call. A new run (a
 * new Game object) starts over without buzzing.
 */
export function watchHaptics(g: Game) {
  const crew = g.crew.filter((c) => c.side === "player" && c.hp > 0).length;
  const now: Seen = { game: g, hull: g.player.hull, shields: g.player.shieldNow, crew, here: g.here, phase: g.phase };
  const was = seen;
  seen = now;
  if (!was || was.game !== g) return;
  if (now.phase !== was.phase && (now.phase === "defeat" || now.phase === "victory")) {
    buzz(now.phase === "defeat" ? "lose" : "win");
    return;
  }
  // A fight that pays out (ship beaten, crew killed, surrender taken) opens the reward card. An escape does not.
  if (was.phase === "combat" && now.phase === "reward") buzz("win");
  if (now.here !== was.here) buzz("jump");
  if (now.crew < was.crew) buzz("crew");
  else if (now.hull < was.hull) buzz(was.hull - now.hull >= 2 ? "heavy" : "hit");
  else if (now.shields < was.shields && g.phase === "combat") buzz("shield");
}
