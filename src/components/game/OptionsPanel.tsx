/**
 * Per the user: the Options screen, tabbed (Graphics, Sound, Keyboard), from the title screen and from the wrench
 * button in a run. Keyboard only lists the shortcuts GameApp's key handler answers; they are not configurable.
 * INVENTED layout, on the ship sheet's tab styles.
 */
import { useEffect, useState } from "react";
import { setSetting, useOptionsOpen, useSettings, type Settings } from "@/game/settings";
import { saveGame } from "@/game/sim";
import { useGame } from "@/game/store";
import { canForceLandscape } from "./turn";
import { CloseX } from "./CloseX";

type Tab = "exit" | "graphics" | "sound" | "keys";
const TABS: [Tab, string][] = [
  ["graphics", "Graphics"],
  ["sound", "Sound"],
  ["keys", "Keyboard"],
];
/** Per the user: opened from a run, an Exit tab comes first (and opens first). */
const GAME_TABS: [Tab, string][] = [["exit", "Exit"], ...TABS];

/** Leave the run for the title or the hangar. The run is saved first, so CONTINUE picks it up. */
function leaveRun(boot: "title" | "hangar") {
  // The panel closes with the run, or CONTINUE would bring it straight back.
  useOptionsOpen.setState({ open: false });
  const store = useGame.getState();
  store.act((g) => {
    g.menuHold = false;
  });
  saveGame(store.game);
  store.toTitle(boot);
}

/** Mirrors GameApp onKey (and the room menu's Esc, the ship sheet's arrows). Keep the two in step. */
const KEYS: [string, [string, string][]][] = [
  [
    "General",
    [
      ["Space", "Pause or resume"],
      ["M", "Mute or unmute sound"],
      ["U", "Ship menu: Upgrades"],
      ["I", "Ship menu: Inventory"],
      ["← →", "Switch ship menu tabs"],
      ["Esc", "Close the room menu"],
    ],
  ],
  [
    "Weapons and drones",
    [
      ["1–4", "Select a weapon, then click a room to aim"],
      ["Shift + 1–4", "Depower that weapon"],
      ["Ctrl + 1–4", "Flip that weapon's autofire"],
      ["5–7", "Use drone schematic 1–3"],
      ["C", "Activate cloaking (in a fight)"],
      ["T", "Teleporter: pick an enemy room to send crew to"],
      ["R", "Teleporter: bring crew back"],
      ["H", "Hacking drone (in a fight)"],
    ],
  ],
  [
    "Crew",
    [
      ["Q", "Select every crew member"],
      ["F1–F8", "Select crew member 1–8"],
      ["/", "Save crew stations"],
      ["Enter", "Send crew back to their stations"],
      ["P", "Crystal Lockdown (selected Crystal crew)"],
    ],
  ],
  [
    "Doors",
    [
      ["Z", "Open all doors (interior first, then airlocks)"],
      ["X", "Close all doors (airlocks first, then interior)"],
    ],
  ],
  [
    "Events",
    [
      ["1–9", "Pick that answer"],
      ["1", "Continue past a reward"],
    ],
  ],
];

function Toggle({ label, note, value, onChange }: { label: string; note: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="opt-row">
      <span className="opt-text">
        <b>{label}</b>
        <span className="mini">{note}</span>
      </span>
      <button type="button" role="switch" aria-checked={value} className={`opt-switch${value ? " is-on" : ""}`} onClick={() => onChange(!value)}>
        {value ? "ON" : "OFF"}
      </button>
    </label>
  );
}

export function OptionsPanel({ onClose, inGame = false }: { onClose: () => void; inGame?: boolean }) {
  const tabs = inGame ? GAME_TABS : TABS;
  const [tab, setTab] = useState<Tab>(inGame ? "exit" : "graphics");
  const landscapeOk = canForceLandscape();
  const s = useSettings();
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => setSetting(key, value);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="overlay options-overlay" onClick={(e) => e.stopPropagation()}>
      <article className="sheet ftl-sheet ship-sheet options-sheet has-x" aria-label="Options">
        <CloseX onClose={onClose} />
        <header className="ship-sheet-head">
          <h2 className="kicker">Options</h2>
        </header>
        <div
          className="ship-tabs"
          role="tablist"
          aria-label="Options"
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const ids = tabs.map(([id]) => id);
            const focused = ids.indexOf((e.target as HTMLElement).id.replace("opt-tab-", "") as Tab);
            const at = focused >= 0 ? focused : ids.indexOf(tab);
            const next = ids[(at + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length]!;
            setTab(next);
            requestAnimationFrame(() => document.getElementById(`opt-tab-${next}`)?.focus());
          }}
        >
          {tabs.map(([id, label]) => (
            <button
              key={id}
              id={`opt-tab-${id}`}
              type="button"
              role="tab"
              className={`ship-tab${tab === id ? " is-on" : ""}`}
              aria-selected={tab === id}
              aria-controls="opt-tab-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="ship-tab-panel options-panel" id="opt-tab-panel" role="tabpanel" aria-labelledby={`opt-tab-${tab}`}>
          {tab === "exit" ? (
            <div className="opt-exit">
              <button type="button" className="is-primary" onClick={onClose}>
                <b>Resume</b>
                <span className="mini">Back to the game.</span>
              </button>
              <button type="button" onClick={() => leaveRun("title")}>
                <b>Save and exit</b>
                <span className="mini">Save this run and go to the title screen. CONTINUE picks it up.</span>
              </button>
              <button type="button" onClick={() => leaveRun("hangar")}>
                <b>Return to hangar</b>
                <span className="mini">Save this run and pick a ship for a new one. Starting a new run replaces the save.</span>
              </button>
            </div>
          ) : null}
          {tab === "graphics" ? (
            <div className="opt-list">
              <Toggle label="Screen shake" note="The ship view shakes when it is hit." value={s.shake} onChange={set("shake")} />
              <Toggle
                label="Walk targets"
                note="A faint copy of each walking crew member where they are headed."
                value={s.ghosts}
                onChange={set("ghosts")}
              />
              <Toggle label="Room oxygen bars" note="The oxygen level along each room's floor." value={s.roomAir} onChange={set("roomAir")} />
              <div className="opt-row">
                <span className="opt-text">
                  <b>Lock to landscape</b>
                  <span className="mini">
                    {landscapeOk
                      ? "Keep the game sideways however the phone is held, with the phone's top on this side."
                      : "Only in the installed app on a phone (INSTALL APP on the title screen)."}
                  </span>
                </span>
                <span className="opt-choice" role="group" aria-label="Lock to landscape">
                  {(
                    [
                      ["off", "Off"],
                      ["left", "Top on the left"],
                      ["right", "Top on the right"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={s.rotate === value}
                      disabled={!landscapeOk && value !== "off"}
                      onClick={() => setSetting("rotate", value)}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </div>
            </div>
          ) : null}
          {tab === "sound" ? (
            <div className="opt-list">
              <Toggle label="Mute" note="Silence all sound. M toggles it in a game." value={s.muted} onChange={set("muted")} />
              <Toggle
                label="Haptics"
                note="Phone vibration for hits, crew losses, jumps, wins and long presses. iPhone gives one light tap, for your own presses only."
                value={s.haptics}
                onChange={set("haptics")}
              />
              <label className="opt-row">
                <span className="opt-text">
                  <b>Volume</b>
                  <span className="mini">Master volume for every sound.</span>
                </span>
                <span className="opt-volume">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(s.volume * 100)}
                    aria-label="Volume"
                    disabled={s.muted}
                    onChange={(e) => setSetting("volume", Number(e.target.value) / 100)}
                  />
                  <b>{Math.round(s.volume * 100)}%</b>
                </span>
              </label>
            </div>
          ) : null}
          {tab === "keys" ? (
            <div className="opt-keys">
              {KEYS.map(([group, rows]) => (
                <section key={group} className="opt-key-group">
                  <h3 className="sheet-group-head">{group}</h3>
                  <dl>
                    {rows.map(([key, what]) => (
                      <div key={key + what} className="opt-key-row">
                        <dt>
                          <kbd>{key}</kbd>
                        </dt>
                        <dd>{what}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
