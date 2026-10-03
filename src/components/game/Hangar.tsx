/**
 * Ship bay from the hangar screenshot: RENAME, the name plate, EASY / NORMAL / HARD,
 * START, SHIP, LIST, LAYOUT, TYPE, HIDE ROOMS, Available Achievements,
 * the cutaway, the system icons, CREW, WEAPONS, DRONES, AUGMENTATIONS.
 * Score, lead formula: the lit button sets initial scrap to 30, 10, or 0. The highlight starts on EASY.
 * Advanced Edition Content stays on: every layout on the page can be selected.
 * Crew cards repeat the race counts on the layout line. INVENTED: CUSTOMIZE edits a name
 * and uniform per seat, and the run starts with exactly those crew (crew-look.ts).
 */
import { useEffect, useState } from "react";
import { WEAPONS } from "@/game/content";
import {
  NAME_MAX,
  PLAYER_UNIFORMS,
  UNIFORMS,
  defaultPicks,
  kinLabel,
  randomName,
  type CrewPick,
} from "@/game/crew-look";
import type { KinId } from "@/game/extras/kin";
import { droneKeyForName, weaponIdForName } from "@/game/gear-look";
import { hullById } from "@/game/hulls";
import { iconForName } from "@/game/icons";
import { useGame } from "@/game/store";
import type { Difficulty as RunDifficulty } from "@/game/types";
import { CRUISER_PAGES } from "@/game/wiki/layout-pages";
import { hangarSheet } from "@/game/wiki/hangar-sheet";
import { CrewSprite } from "./CrewSprite";
import { DroneArt, WeaponArt } from "./GearArt";
import { FullscreenButton } from "./FullscreenButton";
import { PixelIcon } from "./PixelIcon";
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

const RACE_KIN: Record<string, KinId> = {
  engi: "shell",
  zoltan: "spark",
  mantis: "blade",
  slug: "gel",
  rock: "stone",
  rockman: "stone",
  rockmen: "stone",
  lanius: "voidlung",
  crystal: "shard",
};

/** Seats in the order the run will place them: the hull spec when there is one, else the sheet's race line. */
function seatsOf(layoutId: string, races: string[]): KinId[] {
  const hull = hullById(layoutId);
  if (hull) return hull.crew.map((seat) => seat.kin);
  return races.map((race) => RACE_KIN[race.toLowerCase()] ?? "plain");
}

function weaponPower(name: string) {
  const id = weaponIdForName(name);
  return id ? (WEAPONS[id]?.power ?? null) : null;
}

function absentDrones(lines: string[]) {
  return lines.length === 0 || lines.every((line) => /^none \(/i.test(line));
}

function SysMark({ name }: { name: string }) {
  const icon = iconForName(name);
  return icon ? <PixelIcon name={icon} size={20} /> : <i className="hangar-sys-blank" aria-hidden="true" />;
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

  const seats = seatsOf(layout.id, sheet.crew);
  const [picks, setPicks] = useState<CrewPick[]>(() => defaultPicks(seats.length));
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    setName(sheet.defaultName);
    setRename(false);
  }, [layout.id, sheet.defaultName]);

  useEffect(() => {
    setPicks(defaultPicks(seats.length));
    setEditing(null);
  }, [layout.id, seats.length]);

  function updatePick(seat: number, patch: Partial<CrewPick>) {
    setPicks((list) => list.map((pick, i) => (i === seat ? { ...pick, ...patch } : pick)));
  }

  function stepPage(dir: number) {
    setPageIndex((index) => (index + dir + CRUISER_PAGES.length) % CRUISER_PAGES.length);
  }

  function start() {
    const chosen = name.trim() || sheet.defaultName;
    useGame.getState().newRun(layout.id, RUN_DIFFICULTY[difficulty], picks);
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
      <div className="hangar-floor" aria-hidden="true" />

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
          <FullscreenButton className="hangar-fs" />
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
            <PixelIcon name="lock" size={24} />
            <PixelIcon name="lock" size={24} />
            <PixelIcon name="lock" size={24} />
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
            {seats.map((kin, index) => {
              const pick = picks[index];
              if (!pick) return null;
              return (
                <button
                  key={`${layout.id}-${index}`}
                  type="button"
                  className={`hangar-crew-card${editing === index ? " is-on" : ""}`}
                  aria-label={`Customize ${pick.name}`}
                  aria-expanded={editing === index}
                  onClick={() => setEditing(index)}
                >
                  <CrewSprite kin={kin} uniform={UNIFORMS[pick.uniform]} size={36} />
                  <span className="hangar-crew-name">{pick.name}</span>
                  <span className="hangar-crew-race">{kinLabel(kin)}</span>
                  <span className="hangar-crew-cta">CUSTOMIZE</span>
                </button>
              );
            })}
          </div>
          {editing != null && picks[editing] ? (
            <div className="hangar-crew-layer" onClick={() => setEditing(null)}>
            <div
              className="hangar-crew-edit"
              role="dialog"
              aria-label="Customize crew"
              onClick={(event) => event.stopPropagation()}
            >
              <CrewSprite kin={seats[editing]} uniform={UNIFORMS[picks[editing].uniform]} size={56} />
              <div className="hangar-crew-fields">
                <label>
                  <span>NAME</span>
                  <input
                    value={picks[editing].name}
                    maxLength={NAME_MAX}
                    autoFocus
                    onChange={(event) => updatePick(editing, { name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") setEditing(null);
                    }}
                  />
                </label>
                <div className="hangar-swatches" role="radiogroup" aria-label="Uniform">
                  {UNIFORMS.slice(0, PLAYER_UNIFORMS).map((color, index) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={picks[editing].uniform === index}
                      aria-label={`Uniform ${index + 1}`}
                      style={{ background: color }}
                      onClick={() => updatePick(editing, { uniform: index })}
                    />
                  ))}
                </div>
                <div className="hangar-crew-actions">
                  <button type="button" onClick={() => updatePick(editing, { name: randomName() })}>
                    RANDOM
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    DONE
                  </button>
                </div>
              </div>
            </div>
            </div>
          ) : null}
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
                    {weaponIdForName(weapon) ? (
                      <WeaponArt id={weaponIdForName(weapon)!} height={26} />
                    ) : (
                      <i className="slot-gun" aria-hidden="true" />
                    )}
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
                    <DroneArt kind={droneKeyForName(drone)} height={32} />
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
