/**
 * Full screen for the whole page. Screen.tsx rescales the 16:9 screen on resize.
 * Desktop and Android use the Fullscreen API. iPhone has no Fullscreen API for a
 * page, so the button shows how to save the app to the Home Screen.
 */
import { useEffect, useState } from "react";
import { PixelIcon } from "./PixelIcon";

const IMMERSIVE = "is-immersive";
const ICON = `${import.meta.env.BASE_URL}__grok/install/assets/homescreen`;

type Legacy = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitCancelFullScreen?: () => Promise<void> | void;
};
type LegacyEl = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
  webkitRequestFullScreen?: (options?: FullscreenOptions) => Promise<void> | void;
};
type IosGuide = { ipad: boolean; ios27: boolean; safari: boolean };

function nativeOn() {
  const d = document as Legacy;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

function immersiveOn() {
  return document.documentElement.classList.contains(IMMERSIVE);
}

function isOn() {
  return nativeOn() || immersiveOn();
}

function refit() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  });
}

/** iOS keeps the URL bar unless the page can scroll a hair, then we lock it again. */
function nudgeChrome() {
  if (window.parent !== window) return;
  const html = document.documentElement;
  const body = document.body;
  const htmlOverflow = html.style.overflow;
  const bodyOverflow = body.style.overflow;
  const bodyHeight = body.style.height;
  html.style.overflow = "auto";
  body.style.overflow = "auto";
  body.style.height = `${window.innerHeight + 80}px`;
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    window.scrollTo(0, 1);
    requestAnimationFrame(() => {
      body.style.height = bodyHeight;
      body.style.overflow = bodyOverflow;
      html.style.overflow = htmlOverflow;
      window.scrollTo(0, 0);
      refit();
    });
  });
}

async function tryNative(): Promise<boolean> {
  const root = document.documentElement as LegacyEl;
  const req =
    root.requestFullscreen?.bind(root) ??
    root.webkitRequestFullscreen?.bind(root) ??
    root.webkitRequestFullScreen?.bind(root);
  if (!req) return false;
  try {
    await req({ navigationUI: "hide" });
  } catch {
    try {
      await req();
    } catch {
      return false;
    }
  }
  return nativeOn();
}

function leaveNative() {
  const d = document as Legacy;
  const exit = d.exitFullscreen?.bind(d) ?? d.webkitExitFullscreen?.bind(d) ?? d.webkitCancelFullScreen?.bind(d);
  if (!exit) return;
  Promise.resolve(exit()).catch(() => undefined);
}

/** Home Screen steps, or null when this is not an iPhone/iPad browser tab. An installed app is not a tab. */
function installedApp() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!(
    nav.standalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function iosHomeScreen(): IosGuide | null {
  if (installedApp()) return null;
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  const iphone = /iPhone|iPod/.test(ua);
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  if (!iphone && !ipad) return null;
  const os = ua.match(/(?:iPhone OS|CPU OS) (\d+)[._]/);
  const safariVer = ua.match(/Version\/(\d+)[._]/);
  const major = Math.max(os ? parseInt(os[1], 10) : 0, safariVer ? parseInt(safariVer[1], 10) : 0);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
  const framed = window.parent !== window;
  const safari = /Safari/.test(ua) && !otherBrowser && !framed;
  return { ipad, ios27: major >= 27 && !ipad, safari };
}

export function FullscreenButton({ className = "frame-btn" }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [guide, setGuide] = useState<IosGuide | null>(null);

  useEffect(() => {
    const sync = () => setOn(isOn() || installedApp());
    sync();
    if (installedApp()) document.documentElement.classList.add(IMMERSIVE);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  function toggle() {
    const ios = iosHomeScreen();
    if (ios) {
      setGuide(ios);
      return;
    }
    if (installedApp()) {
      document.documentElement.classList.add(IMMERSIVE);
      void tryNative();
      setOn(true);
      refit();
      return;
    }
    if (isOn()) {
      document.documentElement.classList.remove(IMMERSIVE);
      if (nativeOn()) leaveNative();
      setOn(false);
      refit();
      return;
    }
    void tryNative().then((entered) => {
      if (!entered) {
        document.documentElement.classList.add(IMMERSIVE);
        nudgeChrome();
      }
      setOn(true);
      refit();
    });
  }

  const held = typeof window !== "undefined" && installedApp();
  const label = held || !on ? "Full screen" : "Exit full screen";
  const where = guide?.ipad ? "toolbar" : "bottom bar";
  return (
    <>
      <button type="button" className={className} aria-label={label} aria-pressed={on || !!guide} title={label} onClick={toggle}>
        <PixelIcon name={on ? "windowed" : "fullscreen"} size={20} />
      </button>
      {guide ? (
        <div className="fs-guide" role="presentation" onClick={() => setGuide(null)}>
          <div
            className="fs-guide-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fs-guide-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="kicker">Full screen</p>
            <h2 id="fs-guide-title">Add to Home Screen</h2>
            <p>iOS only hides the browser chrome for an app saved to the Home Screen.</p>
            <ol>
              {guide.safari ? null : <li>Open this page in Safari.</li>}
              {guide.ios27 ? (
                <li>
                  Tap <GuideIcon name="glass-puzzle" label="extensions" /> in the {where}, then{" "}
                  <GuideIcon name="glass-share" label="Share" />.
                </li>
              ) : (
                <li>
                  Tap <GuideIcon name="glass-share" label="Share" /> in the {where}.
                </li>
              )}
              <li>
                Choose <GuideIcon name="plus" label="" /> Add to Home Screen.
              </li>
            </ol>
            {guide.safari ? null : <p className="fs-guide-url">{typeof location !== "undefined" ? location.href : ""}</p>}
            <button type="button" className="btn-ghost" onClick={() => setGuide(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function GuideIcon({ name, label }: { name: string; label: string }) {
  return (
    <img className="fs-guide-icon" src={`${ICON}/${name}.svg`} width="22" height="22" alt={label} />
  );
}
