/**
 * Ship bay from the hangar screenshot: RENAME, the name plate, EASY / NORMAL / HARD,
 * START, SHIP, LIST, LAYOUT, TYPE, HIDE ROOMS, Available Achievements,
 * the cutaway, the system icons, CREW, WEAPONS, DRONES, AUGMENTATIONS.
 * Score, lead formula: the lit button sets initial scrap to 30, 10, or 0. The highlight starts on EASY.
 * Advanced Edition Content stays on: every layout on the page can be selected.
 * Crew cards repeat the race counts on the layout line. They are not given names.
 */
import { useEffect, useState } from "react";
import { WEAPONS } from "@/game/content";
import { useGame } from "@/game/store";
import type { Difficulty as RunDifficulty } from "@/game/types";
import { CRUISER_PAGES } from "@/game/wiki/layout-pages";
import { hangarSheet } from "@/game/wiki/hangar-sheet";
import { PixelLayout } from "./PixelArt";

type Letter = "A" | "B" | "C";
type Difficulty = "EASY" | "NORMAL" | "HARD";

const DIFFICULTIES: Difficulty[] = ["EASY", "NORMAL", "HARD"];
const RUN_DIFFICULTY: Record<Difficulty, RunDifficulty> = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
};

function letterOf(heading: string): Letter {
  const letter = heading.replace("Layout ", "");
  if (letter === "B" || letter === "C") return letter;
  return "A";
}

function weaponPower(name: string) {
  const row = Object.values(WEAPONS).find((weapon) => weapon.name === name);
  return row ? row.power : null;
}

function absentDrones(lines: string[]) {
  return lines.length === 0 || lines.every((line) => /^none \(/i.test(line));
}

function SysMark({ name }: { name: string }) {
  const key = name.toLowerCase();
  const path =
    key.includes("shield") ? "M8 2 14 5v5c0 4-2.6 6.4-6 8-3.4-1.6-6-4-6-8V5z" :
    key.includes("engine") ? "M3 5h6l2 3H3zm0 8h8l-2-3H3zm10-5h3v2h-3z" :
    key.includes("med") ? "M7 3h2v4h4v2H9v4H7V9H3V7h4z" :
    key.includes("oxygen") || key === "o2" ? "M8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-2 5h1.2v3H6zm2.2 0H11v3H8.2z" :
    key.includes("weapon") ? "M2 8h8l2-2v4l-2-2H2z" :
    key.includes("pilot") ? "M3 11 8 3l5 8H3zm4-2h2v2H7z" :
    key.includes("sensor") ? "M8 3a5 5 0 0 1 5 5h-2a3 3 0 0 0-3-3zM8 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" :
    key.includes("door") ? "M4 2h8v12H4zm2 6h1.5v2H6z" :
    key.includes("clone") ? "M5 3h4v3H5zm2 3v2m-3 1h6v4H4z" :
    key.includes("hack") ? "M3 8h4l1-2 2 4 1-2h2" :
    key.includes("mind") ? "M8 2a4 4 0 0 0-2 7v2h4V9a4 4 0 0 0-2-7z" :
    key.includes("cloak") ? "M3 5h10v2H3zm1 3h8v2H4zm1 3h6v2H5z" :
    key.includes("drone") ? "M8 3 13 8 8 13 3 8z" :
    key.includes("tele") ? "M3 4h4v3H3zm6 5h4v3H9zM6 7l4 2" :
    key.includes("artillery") ? "M2 9h7l3-3v4l-3-1H2z" :
    "M3 3h10v10H3z";
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={path} fill="currentColor" />
    </svg>
  );
}

export function Hangar() {
  const [pageIndex, setPageIndex] = useState(0);
  const [letter, setLetter] = useState<Letter>("A");
  const [hideRooms, setHideRooms] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(() => hangarSheet(CRUISER_PAGES[0].layouts[0]).defaultName);

  const page = CRUISER_PAGES[pageIndex] ?? CRUISER_PAGES[0];
  const layout = page.layouts.find((item) => letterOf(item.heading) === letter) ?? page.layouts[0];
  const sheet = hangarSheet(layout);
  const active = letterOf(layout.heading);

  useEffect(() => {
    setName(sheet.defaultName);
    setRename(false);
  }, [layout.id, sheet.defaultName]);

  function stepPage(dir: number) {
    setPageIndex((index) => (index + dir + CRUISER_PAGES.length) % CRUISER_PAGES.length);
  }

  function start() {
    const chosen = name.trim() || sheet.defaultName;
    useGame.getState().newRun(layout.id, RUN_DIFFICULTY[difficulty]);
    if (chosen && chosen !== sheet.defaultName) {
      useGame.getState().act((game) => {
        game.player.name = chosen;
      });
    }
  }

  const droneNames = sheet.drones.filter((line) => !/^none \(/i.test(line));
  const dronesOut = absentDrones(sheet.drones);
  const emptyWeapons =
    sheet.weaponSlots != null ? Math.max(0, sheet.weaponSlots - sheet.weapons.length) : 0;
  const emptyAugments = Math.max(0, 3 - sheet.augments.length);

  return (
    <section className="hangar">
      <div className="hangar-floor" aria-hidden="true">
        <i className="bay-ship is-left" />
        <i className="bay-ship is-right" />
        <i className="bay-rail" />
      </div>

      <header className="hangar-top">
        <button type="button" onClick={() => setRename(true)}>
          RENAME
        </button>
        {rename ? (
          <input
            className="hangar-name"
            value={name}
            aria-label="RENAME"
            autoFocus
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setRename(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setRename(false);
            }}
          />
        ) : (
          <p className="hangar-name">{name}</p>
        )}
        <div className="hangar-diff">
          <div className="hangar-diff-col">
            {DIFFICULTIES.map((item) => (
              <button
                key={item}
                type="button"
                className={difficulty === item ? "is-on" : undefined}
                aria-pressed={difficulty === item}
                onClick={() => setDifficulty(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button type="button" className="hangar-start" onClick={start}>
            START
          </button>
        </div>
      </header>

      <aside className="hangar-ship">
        <p className="hangar-label">SHIP</p>
        <div className="hangar-list" role="group" aria-label="LIST">
          <button type="button" aria-label="LIST" onClick={() => stepPage(-1)}>
            <i className="hangar-arrow is-prev" />
          </button>
          <span>LIST</span>
          <button type="button" aria-label="LIST" onClick={() => stepPage(1)}>
            <i className="hangar-arrow is-next" />
          </button>
        </div>
        <p className="hangar-label">LAYOUT</p>
        <div className="hangar-letters">
          {page.layouts.map((item) => {
            const itemLetter = letterOf(item.heading);
            return (
              <button
                key={item.id}
                type="button"
                className={active === itemLetter ? "is-on" : undefined}
                aria-pressed={active === itemLetter}
                onClick={() => setLetter(itemLetter)}
              >
                TYPE {itemLetter}
              </button>
            );
          })}
        </div>
        <button type="button" aria-pressed={hideRooms} onClick={() => setHideRooms((value) => !value)}>
          HIDE ROOMS
        </button>
        <div className="hangar-achieve">
          <p>Available Achievements:</p>
          <p>Complete 2/3 to unlock a layout!</p>
          <div>
            <i />
            <i />
            <i />
          </div>
        </div>
      </aside>

      <div className={`hangar-stage${hideRooms ? " is-bare" : ""}`}>
        <PixelLayout id={layout.id} />
        <div className="hangar-bars">
          {sheet.systems.map((system) => (
            <span key={system.name} className="hangar-bar" title={`${system.name} (${system.level})`}>
              <SysMark name={system.name} />
              <span className="hangar-pips">
                {Array.from({ length: system.level }, (_, index) => (
                  <i key={index} />
                ))}
              </span>
            </span>
          ))}
        </div>
      </div>

      <footer className="hangar-bay">
        <section className="hangar-panel">
          <h2>CREW</h2>
          <div className="hangar-crew">
            {sheet.crew.map((race, index) => (
              <article key={`${race}-${index}`} className="hangar-crew-card">
                <i className={`crew-bust race-${race.toLowerCase()}`} aria-hidden="true" />
                <p>{race}</p>
                <span>CUSTOMIZE</span>
              </article>
            ))}
          </div>
        </section>
        <div className="hangar-mid">
          <section className="hangar-panel">
            <h2>WEAPONS</h2>
            <div className="hangar-slots">
              {sheet.weapons.map((weapon) => {
                const power = weaponPower(weapon);
                return (
                  <article key={weapon} className="hangar-slot">
                    {power != null && power > 0 ? (
                      <span className="hangar-power" aria-hidden="true">
                        {Array.from({ length: power }, (_, index) => (
                          <i key={index} />
                        ))}
                      </span>
                    ) : (
                      <span className="hangar-power" />
                    )}
                    <i className="slot-gun" aria-hidden="true" />
                    <p>{weapon}</p>
                  </article>
                );
              })}
              {Array.from({ length: emptyWeapons }, (_, index) => (
                <article key={`empty-${index}`} className="hangar-slot is-empty" />
              ))}
            </div>
          </section>
          <section className="hangar-panel hangar-drones">
            <h2>DRONES</h2>
            {dronesOut ? (
              <p className="hangar-absent">SYSTEM NOT INSTALLED</p>
            ) : (
              <div className="hangar-slots">
                {droneNames.map((drone) => (
                  <article key={drone} className="hangar-slot">
                    <p>{drone}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        <section className="hangar-panel">
          <h2>AUGMENTATIONS</h2>
          <div className="hangar-augs">
            {sheet.augments.map((augment) => (
              <p key={augment}>{augment}</p>
            ))}
            {Array.from({ length: emptyAugments }, (_, index) => (
              <p key={`aug-${index}`} className="is-empty" />
            ))}
          </div>
        </section>
      </footer>
    </section>
  );
}
