/**
 * Per the user: the setup screen, split from the game like a launcher. Game files (what to load, in what order) and
 * Phone (send or receive those files and the save) live here, then Launch loads them and opens the title.
 * A remembered launch skips the sheet and shows only the loading bar. INVENTED layout, on the Options sheet styles.
 */
import { Kicker } from "@stl/ui";
import { useState } from "react";
import { launch, useLaunch } from "@/game/launch";
import { GameFilesPanel } from "./GameFilesPanel";
import { PhoneHandoffPanel } from "./PhoneHandoffPanel";

type Tab = "files" | "phone";
const TABS: [Tab, string][] = [
  ["files", "Game files"],
  ["phone", "Phone"],
];

function LoadBar({ ratio, label }: { ratio: number; label: string }) {
  return (
    <div className="pack-boot">
      <p>{label}</p>
      <div
        className="pack-boot-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        aria-label={label}
      >
        <div className="pack-boot-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

/** A remembered launch, or a reload from setup: only the bar, then the title. */
export function BootScreen() {
  const ratio = useLaunch((s) => s.ratio);
  return (
    <section className="setup-boot" aria-busy="true">
      <LoadBar ratio={ratio} label={"Loading the game files"} />
    </section>
  );
}

export function SetupScreen() {
  const [tab, setTab] = useState<Tab>("files");
  const stage = useLaunch((s) => s.stage);
  const ratio = useLaunch((s) => s.ratio);
  const error = useLaunch((s) => s.error);
  const booting = stage === "booting";
  return (
    <section className="setup-screen">
      <article
        className="sheet ftl-sheet ship-sheet options-sheet setup-sheet"
        aria-label={"Setup"}
      >
        <header className="ship-sheet-head">
          <Kicker as="h2">{"Setup"}</Kicker>
        </header>
        <div
          className="ship-tabs"
          role="tablist"
          aria-label={"Setup"}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const next = tab === "files" ? "phone" : "files";
            setTab(next);
            requestAnimationFrame(() => document.getElementById(`setup-tab-${next}`)?.focus());
          }}
        >
          {TABS.map(([id, label]) => (
            <button
              key={id}
              id={`setup-tab-${id}`}
              type="button"
              role="tab"
              className={`ship-tab${tab === id ? " is-on" : ""}`}
              aria-selected={tab === id}
              aria-controls="setup-tab-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div
          className="ship-tab-panel options-panel"
          id="setup-tab-panel"
          role="tabpanel"
          aria-labelledby={`setup-tab-${tab}`}
        >
          {tab === "files" ? <GameFilesPanel /> : <PhoneHandoffPanel />}
        </div>
        <footer className="setup-launch">
          {error ? <p className="gf-alert">{error}</p> : null}
          {booting ? (
            <LoadBar ratio={ratio} label={"Loading the game files"} />
          ) : (
            <button type="button" className="gf-button is-primary" onClick={() => void launch()}>
              {"Launch"}
            </button>
          )}
        </footer>
      </article>
    </section>
  );
}
