/**
 * Ship bay from the hangar screenshot: the name plate, EASY / NORMAL / HARD,
 * START, SHIP, LIST, LAYOUT, TYPE, HIDE ROOMS, Available Achievements,
 * the same ship a fight draws (rooms, doors, weapons, crew), the system icons,
 * CREW, WEAPONS, DRONES, AUGMENTATIONS.
 * Score, lead formula: the lit button sets initial scrap to 30, 10, or 0. The highlight starts on EASY.
 * @agent:unlocks: every layout can be viewed; a locked one shows its unlock line and
 * START is off (unlocks.ts, unlock-store.ts). UNLOCK ALL / RESET LOCKS and ?unlockAll=1 are the developer switches.
 * Crew cards repeat the race counts on the layout line. INVENTED: CUSTOMIZE edits a name
 * and uniform per seat, and the run starts with exactly those crew (crew-look.ts).
 */
import { tx } from "@/i18n";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { factionPaint } from "@/game/hull-plate";
import { hangarLoadout } from "@/game/sim";
import { iconForName } from "@/game/icons";
import { useGame } from "@/game/store";
import type { Difficulty as RunDifficulty } from "@/game/types";
import { CRUISER_PAGES } from "@/game/wiki/layout-pages";
import { hangarSheet } from "@/game/wiki/hangar-sheet";
import { ACHIEVEMENTS } from "@/game/wiki/achievements";
import { earnedIds } from "@/game/wiki/achievement-track";
import { getUnlocks, resetUnlocks, subscribeUnlocks, unlockAll } from "@/game/unlock-store";
import { emptyUnlocks, isUnlockedIn, ruleFor, shipAchievements } from "@/game/unlocks";
import { CrewSprite } from "./CrewSprite";
import { DroneArt, WeaponArt } from "./GearArt";
import { CloseX } from "./CloseX";
import { PixelHull } from "./PixelArt";
import { PixelIcon } from "./PixelIcon";
import { ShipView } from "./ShipView";

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

/** @agent:unlocks. Server render and first paint: only the start ship. The client store takes over after hydration. */
const SERVER_UNLOCKS = emptyUnlocks();

function SysMark({ name }: { name: string }) {
  const icon = iconForName(name);
  return icon ? <PixelIcon name={icon} size={20} /> : <i className="hangar-sys-blank" aria-hidden="true" />;
}

/** True when the main pointer is a finger (phones, tablets), so focusing a field would pop up the keyboard. */
function touchFirst(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function Hangar({ onMenu }: { onMenu: () => void }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [letter, setLetter] = useState<Letter>("A");
  const [hideRooms, setHideRooms] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [listOpen, setListOpen] = useState(false);

  const page = CRUISER_PAGES[pageIndex] ?? CRUISER_PAGES[0];
  const layout = page.layouts.find((item) => letterOf(item.heading) === letter) ?? page.layouts[0];
  const sheet = hangarSheet(layout);
  const active = letterOf(layout.heading);
  // @agent:unlocks. Ships page, "Layouts": locked layouts are shown but START is off (unlocks.ts).
  const unlocks = useSyncExternalStore(subscribeUnlocks, getUnlocks, () => SERVER_UNLOCKS);
  const locked = !isUnlockedIn(unlocks, layout.id);
  const lockRule = ruleFor(layout.id);
  const cruiser = hullById(layout.id)?.cruiser ?? "";
  const earned = new Set(unlocks === SERVER_UNLOCKS ? [] : earnedIds());
  const shipAch = shipAchievements(cruiser).map((id) => ACHIEVEMENTS.find((row) => row.id === id)!);
  const allOpen = CRUISER_PAGES.every((p) => p.layouts.every((l) => isUnlockedIn(unlocks, l.id)));

  const seats = seatsOf(layout.id, sheet.crew);
  const [picks, setPicks] = useState<CrewPick[]>(() => defaultPicks(seats.length));
  const [editing, setEditing] = useState<number | null>(null);
  const preview = useMemo(() => hangarLoadout(layout.id, picks), [layout.id, picks]);

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
    if (locked) return;
    useGame.getState().newRun(layout.id, RUN_DIFFICULTY[difficulty], picks);
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
        {/* Per the user: no RENAME. The ship's name only shows in the Ship menu and the victory text, so every run
            keeps its class name. Per the user: MENU takes RENAME's old spot and returns to the title screen. */}
        <button type="button" className="hangar-menu" onClick={onMenu}>
          {tx("ui.Hangar.menu")}
        </button>
        <p className="hangar-name">{sheet.defaultName}</p>
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
          <button type="button" className="hangar-start" onClick={start} disabled={locked} title={locked ? tx("ui.Hangar.locked") : undefined}>
            {tx("ui.Hangar.start")}
          </button>
        </div>
      </header>

      <aside className="hangar-ship">
        <p className="hangar-label">{tx("ui.Hangar.ship")}</p>
        <div className="hangar-list" role="group" aria-label={tx("ui.Hangar.ship-2")}>
          <button type="button" aria-label={tx("ui.Hangar.previous-ship")} onClick={() => stepPage(-1)}>
            <i className="hangar-arrow is-prev" />
          </button>
          {/* Per the user: LIST opens every ship and layout to pick from. */}
          <button type="button" className="hangar-list-open" aria-haspopup="dialog" onClick={() => setListOpen(true)}>
            {tx("ui.Hangar.list")}
          </button>
          <button type="button" aria-label={tx("ui.Hangar.next-ship")} onClick={() => stepPage(1)}>
            <i className="hangar-arrow is-next" />
          </button>
        </div>
        <p className="hangar-label">{tx("ui.Hangar.layout")}</p>
        <div className="hangar-letters">
          {page.layouts.map((item) => {
            const itemLetter = letterOf(item.heading);
            const shut = !isUnlockedIn(unlocks, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={[active === itemLetter ? "is-on" : "", shut ? "is-locked" : ""].join(" ").trim() || undefined}
                aria-pressed={active === itemLetter}
                aria-label={tx("ui.Hangar.type", { itemLetter: itemLetter, v: shut ? " (locked)" : "" })}
                onClick={() => setLetter(itemLetter)}
              >
                {tx("ui.Hangar.type-2")}{itemLetter}
                {shut ? <PixelIcon name="lock" size={12} /> : null}
              </button>
            );
          })}
        </div>
        <button type="button" aria-pressed={hideRooms} onClick={() => setHideRooms((value) => !value)}>
          {tx("ui.Hangar.hide-rooms")}
        </button>
        <div className="hangar-achieve">
          <p>{tx("ui.Hangar.available-achievements")}</p>
          <p>{tx("ui.Hangar.complete-2-3-to-unlock-a")}</p>
          <div>
            {shipAch.map((row) => (
              <span
                key={row.id}
                className={`hangar-ach${earned.has(row.id) ? " is-earned" : ""}`}
                title={`${row.name}: ${row.requirement}${earned.has(row.id) ? " (earned)" : ""}`}
              >
                <PixelIcon name="lock" size={24} />
              </span>
            ))}
          </div>
        </div>
        <div className="hangar-dev" role="group" aria-label={tx("ui.Hangar.developer-unlocks")}>
          <button type="button" onClick={() => (allOpen ? resetUnlocks() : unlockAll())}>
            {allOpen ? tx("ui.Hangar.reset-locks") : tx("ui.Hangar.unlock-all")}
          </button>
        </div>
      </aside>

      <div className={`hangar-stage${hideRooms ? " is-bare" : ""}${locked ? " is-locked" : ""}`}>
        <div
          className="hangar-figure"
          style={{
            ["--cols" as string]: preview.ship.cols,
            ["--rows" as string]: preview.ship.rows,
            ["--hull-body" as string]: factionPaint(layout.id.split("-")[0]).skin,
          }}
        >
          <ShipView
            ship={preview.ship}
            crew={preview.crew}
            aboard="player"
            showCrew={!hideRooms}
            selectedId={null}
            ventMode={false}
            targetable={false}
            onRoom={() => {}}
            onCrew={() => {}}
            plateId={layout.id}
            faction={layout.id.split("-")[0]}
            facing="right"
          />
        </div>
        {locked ? (
          <div className="hangar-locked" role="note">
            <p className="hangar-locked-title">
              <PixelIcon name="lock" size={20} />{tx("ui.Hangar.locked-2")}
            </p>
            {(sheet.unlock.length ? sheet.unlock : [lockRule.quote]).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
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
          <h2>{tx("ui.Hangar.crew")}</h2>
          <div className="hangar-crew">
            {seats.map((kin, index) => {
              const pick = picks[index];
              if (!pick) return null;
              return (
                <button
                  key={`${layout.id}-${index}`}
                  type="button"
                  className={`hangar-crew-card${editing === index ? " is-on" : ""}`}
                  aria-label={tx("ui.Hangar.customize", { name: pick.name })}
                  aria-expanded={editing === index}
                  onClick={() => setEditing(index)}
                >
                  <CrewSprite kin={kin} uniform={UNIFORMS[pick.uniform]} size={36} />
                  <span className="hangar-crew-name">{pick.name}</span>
                  <span className="hangar-crew-race">{kinLabel(kin)}</span>
                  <span className="hangar-crew-cta">{tx("ui.Hangar.customize-2")}</span>
                </button>
              );
            })}
          </div>
          {listOpen ? (
            <div className="hangar-crew-layer" onClick={() => setListOpen(false)}>
              <div
                className="hangar-ship-list has-x"
                role="dialog"
                aria-label={tx("ui.Hangar.ships")}
                onClick={(event) => event.stopPropagation()}
              >
                <CloseX onClose={() => setListOpen(false)} />
                <p className="hangar-label">{tx("ui.Hangar.ships-2")}</p>
                <ul>
                  {CRUISER_PAGES.map((cruiserPage, index) => (
                    <li key={cruiserPage.page}>
                      <span className="hangar-ship-list-hull">
                        <PixelHull kind={cruiserPage.layouts[0]?.id.split("-")[0] ?? "kestrel"} />
                      </span>
                      <span className="hangar-ship-list-name">{cruiserPage.page}</span>
                      <span className="hangar-ship-list-types">
                        {cruiserPage.layouts.map((item) => {
                          const itemLetter = letterOf(item.heading);
                          const shut = !isUnlockedIn(unlocks, item.id);
                          const here = index === pageIndex && itemLetter === active;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={[here ? "is-on" : "", shut ? "is-locked" : ""].join(" ").trim() || undefined}
                              aria-pressed={here}
                              aria-label={tx("ui.Hangar.type-3", { defaultName: hangarSheet(item).defaultName, itemLetter: itemLetter, v: shut ? " (locked)" : "" })}
                              title={hangarSheet(item).defaultName}
                              onClick={() => {
                                setPageIndex(index);
                                setLetter(itemLetter);
                                setListOpen(false);
                              }}
                            >
                              {tx("ui.Hangar.type-2")}{itemLetter}
                              {shut ? <PixelIcon name="lock" size={12} /> : null}
                            </button>
                          );
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {editing != null && picks[editing] ? (
            <div className="hangar-crew-layer" onClick={() => setEditing(null)}>
            <div
              className="hangar-crew-edit"
              role="dialog"
              aria-label={tx("ui.Hangar.customize-crew")}
              onClick={(event) => event.stopPropagation()}
            >
              <CrewSprite kin={seats[editing]} uniform={UNIFORMS[picks[editing].uniform]} size={56} />
              <div className="hangar-crew-fields">
                <label>
                  <span>{tx("ui.Hangar.name")}</span>
                  {/* Per the user: no autofocus on touch, where it would raise the keyboard over the dialog. */}
                  <input
                    value={picks[editing].name}
                    maxLength={NAME_MAX}
                    autoFocus={!touchFirst()}
                    onChange={(event) => updatePick(editing, { name: event.target.value })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === "Escape") setEditing(null);
                    }}
                  />
                </label>
                <div className="hangar-swatches" role="radiogroup" aria-label={tx("ui.Hangar.uniform")}>
                  {UNIFORMS.slice(0, PLAYER_UNIFORMS).map((color, index) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={picks[editing].uniform === index}
                      aria-label={tx("ui.Hangar.uniform-2", { v: index + 1 })}
                      style={{ background: color }}
                      onClick={() => updatePick(editing, { uniform: index })}
                    />
                  ))}
                </div>
                <div className="hangar-crew-actions">
                  <button type="button" onClick={() => updatePick(editing, { name: randomName() })}>
                    {tx("ui.Hangar.random")}
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    {tx("ui.Hangar.done")}
                  </button>
                </div>
              </div>
            </div>
            </div>
          ) : null}
        </section>
        <div className="hangar-mid">
          <section className="hangar-panel">
            <h2>{tx("ui.Hangar.weapons")}</h2>
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
            <h2>{tx("ui.Hangar.drones")}</h2>
            {dronesOut ? (
              <p className="hangar-absent">{tx("ui.Hangar.system-not-installed")}</p>
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
          <h2>{tx("ui.Hangar.augmentations")}</h2>
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
