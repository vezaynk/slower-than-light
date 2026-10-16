/**
 * Per the user: a title-screen button that shows how to install the game on a phone (the Home Screen app). iPhone and
 * iPad go through Safari's Share sheet; Android browsers either offer their own install prompt (beforeinstallprompt,
 * captured here at load) or an "Install app" / "Add to Home screen" menu item. A desktop shows both phone guides.
 * Hidden once the game already runs installed. INVENTED wording.
 */
import { useEffect, useState } from "react";

const ICON = `${import.meta.env.BASE_URL}__grok/install/assets/homescreen`;

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

/** Chrome fires this once, early; keep it for the button. */
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    for (const l of listeners) l();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    for (const l of listeners) l();
  });
}

function installedApp(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!(
    nav.standalone ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

type Platform = {
  kind: "ios" | "android" | "other";
  ipad: boolean;
  ios27: boolean;
  safari: boolean;
};

function platform(): Platform {
  const ua = navigator.userAgent || "";
  const touch = navigator.maxTouchPoints || 0;
  const iphone = /iPhone|iPod/.test(ua);
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  if (iphone || ipad) {
    const os = ua.match(/(?:iPhone OS|CPU OS) (\d+)[._]/);
    const safariVer = ua.match(/Version\/(\d+)[._]/);
    const major = Math.max(
      os ? parseInt(os[1]!, 10) : 0,
      safariVer ? parseInt(safariVer[1]!, 10) : 0,
    );
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
    const safari = /Safari/.test(ua) && !otherBrowser && window.parent === window;
    return { kind: "ios", ipad, ios27: major >= 27 && !ipad, safari };
  }
  if (/Android/.test(ua)) return { kind: "android", ipad: false, ios27: false, safari: false };
  return { kind: "other", ipad: false, ios27: false, safari: false };
}

function GuideIcon({ name, label }: { name: string; label: string }) {
  return (
    <img className="install-icon" src={`${ICON}/${name}.svg`} width="22" height="22" alt={label} />
  );
}

function IosSteps({ p }: { p: Platform }) {
  const where = p.ipad ? "toolbar" : "bottom bar";
  return (
    <ol>
      {p.kind === "ios" && p.safari ? null : <li>{"Open this page in Safari."}</li>}
      {p.ios27 ? (
        <li>
          {"Tap "}
          <GuideIcon name="glass-puzzle" label="extensions" /> in the {where}
          {", then "}
          <GuideIcon name="glass-share" label={"Share"} />.
        </li>
      ) : (
        <li>
          {"Tap "}
          <GuideIcon name="glass-share" label={"Share"} /> in the {where}.
        </li>
      )}
      <li>
        {"Choose "}
        <GuideIcon name="plus" label="" />
        {" Add to Home Screen, then Add."}
      </li>
      <li>{"Open the game from its Home Screen icon and turn the phone sideways."}</li>
    </ol>
  );
}

function AndroidSteps({ canPrompt, onPrompt }: { canPrompt: boolean; onPrompt: () => void }) {
  return (
    <>
      {canPrompt ? (
        <button type="button" className="install-now" onClick={onPrompt}>
          {"Install now"}
        </button>
      ) : null}
      <ol>
        <li>{"In Chrome, tap the ⋮ menu (top right)."}</li>
        <li>{"Choose Install app, or Add to Home screen."}</li>
        <li>{"Open the game from its Home Screen icon and turn the phone sideways."}</li>
      </ol>
    </>
  );
}

export function InstallButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [canPrompt, setCanPrompt] = useState(false);
  useEffect(() => {
    setInstalled(installedApp());
    const sync = () => setCanPrompt(!!deferred);
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  if (installed) return null;
  const p = open ? platform() : null;
  const prompt = () => {
    const d = deferred;
    if (!d) return;
    void d.prompt();
    void d.userChoice.then(() => {
      deferred = null;
      setCanPrompt(false);
    });
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {"INSTALL APP"}
      </button>
      {open && p ? (
        <div className="install-guide" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="install-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="install-title">{"Install on your phone"}</h2>
            <p>
              {"Saved to the Home Screen, the game opens full screen, without the browser bars."}
            </p>
            {p.kind === "ios" ? <IosSteps p={p} /> : null}
            {p.kind === "android" ? <AndroidSteps canPrompt={canPrompt} onPrompt={prompt} /> : null}
            {p.kind === "other" ? (
              <div className="install-cols">
                <section>
                  <h3>{"iPhone / iPad"}</h3>
                  <IosSteps p={p} />
                </section>
                <section>
                  <h3>{"Android"}</h3>
                  <AndroidSteps canPrompt={canPrompt} onPrompt={prompt} />
                </section>
              </div>
            ) : null}
            {p.kind === "ios" && !p.safari ? <p className="install-url">{location.href}</p> : null}
            <button type="button" className="install-close" onClick={() => setOpen(false)}>
              {"Close"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
