/**
 * Per the user: the Options screen, tabbed (Graphics, Sound, Keyboard), from the title screen and from the wrench
 * button in a run. Keyboard only lists the shortcuts GameApp's key handler answers; they are not configurable.
 * INVENTED layout, on the ship sheet's tab styles.
 */
import { Kicker } from "@stl/ui";
import { tx } from "@/i18n";
import { useState } from "react";
import { setSetting, useOptionsOpen, useSettings, type Settings } from "@/game/settings";
import { saveGame } from "@/game/sim";
import { useGame } from "@/game/store";
import { canForceLandscape } from "./turn";
import { CloseX } from "./CloseX";

type Tab = "exit" | "graphics" | "sound" | "keys";
const TABS: [Tab, string][] = [
  ["graphics", tx("ui.OptionsPanel.graphics")],
  ["sound", tx("ui.OptionsPanel.sound")],
  ["keys", tx("ui.OptionsPanel.keyboard")],
];
/** Per the user: opened from a run, an Exit tab comes first (and opens first). */
const GAME_TABS: [Tab, string][] = [["exit", tx("ui.OptionsPanel.exit")], ...TABS];

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
    tx("ui.OptionsPanel.general"),
    [
      [tx("ui.OptionsPanel.space"), tx("ui.OptionsPanel.pause-or-resume")],
      [tx("ui.OptionsPanel.middle-mouse"), tx("ui.OptionsPanel.pause-or-resume")],
      ["`", tx("ui.OptionsPanel.fast-forward-on-or-off")],
      ["\\", tx("ui.OptionsPanel.mute-or-unmute-sound")],
      ["J", tx("ui.OptionsPanel.open-the-beacon-chart")],
      ["O", tx("ui.OptionsPanel.open-options")],
      [tx("ui.OptionsPanel.esc"), tx("ui.OptionsPanel.close-a-menu-or-open-options")],
      ["U", tx("ui.OptionsPanel.ship-menu-upgrades")],
      ["I", tx("ui.OptionsPanel.ship-menu-inventory")],
      ["← →", tx("ui.OptionsPanel.switch-ship-menu-tabs")],
      ["−", tx("ui.OptionsPanel.larger-event-text")],
      ["=", tx("ui.OptionsPanel.smaller-event-text")],
    ],
  ],
  [
    tx("ui.OptionsPanel.weapons-and-drones"),
    [
      ["1–4", tx("ui.OptionsPanel.select-a-weapon-then-click-a")],
      [tx("ui.OptionsPanel.shift-1-4"), tx("ui.OptionsPanel.depower-that-weapon")],
      [tx("ui.OptionsPanel.ctrl-1-4"), tx("ui.OptionsPanel.flip-that-weapon-s-autofire")],
      ["5–7", tx("ui.OptionsPanel.use-drone-schematic-1-3")],
      ["V", tx("ui.OptionsPanel.toggle-autofire-for-every-weapon")],
      [tx("ui.OptionsPanel.ctrl-click"), tx("ui.OptionsPanel.aim-that-weapon-on-autofire")],
      ["C", tx("ui.OptionsPanel.activate-cloaking-in-a-fight")],
      ["T", tx("ui.OptionsPanel.teleporter-pick-an-enemy-room-to")],
      ["R", tx("ui.OptionsPanel.teleporter-bring-crew-back")],
      ["N", tx("ui.OptionsPanel.hacking-drone-in-a-fight")],
      ["M", tx("ui.OptionsPanel.mind-control-pick-a-crewmember")],
      ["B", tx("ui.OptionsPanel.activate-the-backup-battery")],
    ],
  ],
  [
    tx("ui.OptionsPanel.crew"),
    [
      ["Q", tx("ui.OptionsPanel.select-every-crew-member")],
      ["F1–F8", tx("ui.OptionsPanel.select-crew-member-1-8")],
      ["/", tx("ui.OptionsPanel.save-crew-stations")],
      [tx("ui.OptionsPanel.enter"), tx("ui.OptionsPanel.send-crew-back-to-their-stations")],
      ["P", tx("ui.OptionsPanel.crystal-lockdown-selected-crystal-crew")],
    ],
  ],
  [
    tx("ui.OptionsPanel.power"),
    [
      ["A", tx("ui.OptionsPanel.shields-one-bar")],
      ["S", tx("ui.OptionsPanel.engines-one-bar")],
      ["F", tx("ui.OptionsPanel.oxygen-one-bar")],
      ["D", tx("ui.OptionsPanel.medbay-or-clone-bay-one-bar")],
      ["G", tx("ui.OptionsPanel.teleporter-one-bar")],
      ["H", tx("ui.OptionsPanel.cloaking-one-bar")],
      ["K", tx("ui.OptionsPanel.mind-control-one-bar")],
      ["L", tx("ui.OptionsPanel.hacking-one-bar")],
      ["Y", tx("ui.OptionsPanel.artillery-one-bar")],
      ["W", tx("ui.OptionsPanel.weapons-one-bar")],
      ["E", tx("ui.OptionsPanel.drones-one-bar")],
      [tx("ui.OptionsPanel.shift-key"), tx("ui.OptionsPanel.remove-one-bar-from-that-system")],
    ],
  ],
  [
    tx("ui.OptionsPanel.doors"),
    [
      ["Z", tx("ui.OptionsPanel.open-all-doors-interior-first-then")],
      ["X", tx("ui.OptionsPanel.close-all-doors-airlocks-first-then")],
    ],
  ],
  [
    tx("ui.OptionsPanel.events"),
    [
      ["1–9", tx("ui.OptionsPanel.pick-that-answer")],
      ["1", tx("ui.OptionsPanel.continue-past-a-reward")],
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
        {value ? tx("ui.OptionsPanel.on") : tx("ui.OptionsPanel.off")}
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
  // Esc closes it through CloseX (every panel with an × answers Esc).
  return (
    <div className="overlay options-overlay" onClick={(e) => e.stopPropagation()}>
      <article className="sheet ftl-sheet ship-sheet options-sheet has-x" aria-label={tx("ui.OptionsPanel.options")}>
        <CloseX onClose={onClose} />
        <header className="ship-sheet-head">
          <Kicker as="h2">{tx("ui.OptionsPanel.options")}</Kicker>
        </header>
        <div
          className="ship-tabs"
          role="tablist"
          aria-label={tx("ui.OptionsPanel.options")}
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
                <b>{tx("ui.OptionsPanel.resume")}</b>
                <span className="mini">{tx("ui.OptionsPanel.back-to-the-game")}</span>
              </button>
              <button type="button" onClick={() => leaveRun("title")}>
                <b>{tx("ui.OptionsPanel.save-and-exit")}</b>
                <span className="mini">{tx("ui.OptionsPanel.save-this-run-and-go-to")}</span>
              </button>
              <button type="button" onClick={() => leaveRun("hangar")}>
                <b>{tx("ui.OptionsPanel.return-to-hangar")}</b>
                <span className="mini">{tx("ui.OptionsPanel.save-this-run-and-pick-a")}</span>
              </button>
            </div>
          ) : null}
          {tab === "graphics" ? (
            <div className="opt-list">
              <Toggle label={tx("ui.OptionsPanel.screen-shake")} note={tx("ui.OptionsPanel.the-ship-view-shakes-when-it")} value={s.shake} onChange={set("shake")} />
              <Toggle
                label={tx("ui.OptionsPanel.walk-targets")}
                note={tx("ui.OptionsPanel.a-faint-copy-of-each-walking")}
                value={s.ghosts}
                onChange={set("ghosts")}
              />
              <Toggle label={tx("ui.OptionsPanel.room-oxygen-bars")} note={tx("ui.OptionsPanel.the-oxygen-level-along-each-room")} value={s.roomAir} onChange={set("roomAir")} />
              <div className="opt-row">
                <span className="opt-text">
                  <b>{tx("ui.OptionsPanel.lock-to-landscape")}</b>
                  <span className="mini">
                    {landscapeOk
                      ? tx("ui.OptionsPanel.keep-the-game-sideways-however-the")
                      : tx("ui.OptionsPanel.only-in-the-installed-app-on")}
                  </span>
                </span>
                <span className="opt-choice" role="group" aria-label={tx("ui.OptionsPanel.lock-to-landscape")}>
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
              <Toggle label={tx("ui.OptionsPanel.mute")} note={tx("ui.OptionsPanel.silence-all-sound-m-toggles-it")} value={s.muted} onChange={set("muted")} />
              <Toggle
                label={tx("ui.OptionsPanel.haptics")}
                note={tx("ui.OptionsPanel.phone-vibration-for-hits-crew-losses")}
                value={s.haptics}
                onChange={set("haptics")}
              />
              <label className="opt-row">
                <span className="opt-text">
                  <b>{tx("ui.OptionsPanel.volume")}</b>
                  <span className="mini">{tx("ui.OptionsPanel.master-volume-for-every-sound")}</span>
                </span>
                <span className="opt-volume">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(s.volume * 100)}
                    aria-label={tx("ui.OptionsPanel.volume")}
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
