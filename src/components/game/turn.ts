/**
 * Per the user: forced landscape on an installed phone app. When the OS will not rotate (iOS has no orientation lock),
 * the whole page (body) is rotated by CSS. Pointer events and getBoundingClientRect stay in the physical screen's
 * coordinates, so anything that turns a pointer position into a place on the page goes through toPage / pageRect.
 * With no rotation both are the identity.
 */
export type PageTurn = 0 | 90 | 180 | 270;

let turn: PageTurn = 0;

export function pageTurn(): PageTurn {
  return turn;
}

export function setPageTurn(next: PageTurn) {
  turn = next;
}

/** Physical screen size (what clientX / clientY measure against). */
function screenSize() {
  return { W: window.innerWidth, H: window.innerHeight };
}

/** The rotated page's own size: width and height swap for a quarter turn. */
export function pageSize(): { w: number; h: number } {
  const { W, H } = screenSize();
  return turn === 90 || turn === 270 ? { w: H, h: W } : { w: W, h: H };
}

/**
 * Screen point to page point. Body transforms (styles.css .page-turn-*): 90 is rotate(90deg) translateY(-100%) from the
 * top-left corner, 270 is rotate(-90deg) translateX(-100%), 180 rotates about the centre.
 */
export function toPage(x: number, y: number): { x: number; y: number } {
  if (turn === 0) return { x, y };
  const { W, H } = screenSize();
  if (turn === 90) return { x: y, y: W - x };
  if (turn === 270) return { x: H - y, y: x };
  return { x: W - x, y: H - y };
}

/** An element's box in page coordinates (quarter turns keep boxes axis-aligned). */
export function pageRect(el: Element): { left: number; top: number; width: number; height: number; right: number; bottom: number } {
  const r = el.getBoundingClientRect();
  if (turn === 0) return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
  const a = toPage(r.left, r.top);
  const b = toPage(r.right, r.bottom);
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  return { left, top, width: right - left, height: bottom - top, right, bottom };
}

/** An installed (Home Screen) app, not a browser tab or an embedded preview. */
export function installedApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!(
    nav.standalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

/** Forced landscape applies only to an installed app on a touch screen (per the user). */
export function canForceLandscape(): boolean {
  if (typeof window === "undefined") return false;
  return installedApp() && window.matchMedia("(pointer: coarse)").matches;
}
