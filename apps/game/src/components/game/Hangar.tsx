/**
 * Ship bay from the hangar screenshot: the name plate, EASY / NORMAL / HARD,
 * START, SHIP, LIST, LAYOUT, TYPE, Available Achievements (per the user: no HIDE ROOMS),
 * the same ship a fight draws (rooms, doors, weapons, crew), the system icons,
 * CREW, WEAPONS, DRONES, AUGMENTATIONS.
 * Score, lead formula: the lit button sets initial scrap to 30, 10, or 0. The highlight starts on EASY.
 * @agent:unlocks: every layout can be viewed; a locked one shows its unlock line and
 * START is off (unlocks.ts, unlock-store.ts). UNLOCK ALL / RESET LOCKS and ?unlockAll=1 are the developer switches.
 * Crew cards repeat the race counts on the layout line. INVENTED: CUSTOMIZE edits a name
 * and uniform per seat, and the run starts with exactly those crew (crew-look.ts).
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import "@/game/pack/base";
import { achievementDef, hullDef, shipPreviewPath, startingFit, weaponDef } from "@stl/pack";
import { ArchiveCopy } from "./ArchiveCopy";
import { archiveGeneration, archiveImage, subscribeArchive } from "@/game/pack/media";
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
import { hangarBay } from "@/game/wiki/hangar-bay";

import { factionPaint } from "@/game/hull-plate";
import { hangarLoadout } from "@/game/sim";
import type { IconName } from "@/game/icons";
import { useGame } from "@/game/store";
import type { Difficulty as RunDifficulty } from "@/game/types";
import { CRUISER_PAGES } from "@/game/wiki/layout-pages";
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

/** Seats in the order the run will place them. */
function seatsOf(layoutId: string): KinId[] {
  const hull = hullDef(layoutId);
  if (!hull) return [];
  return startingFit(hull).crew.map((seat) => seat.kin as KinId);
}

function weaponPower(id: string) {
  return weaponDef(id)?.power ?? null;
}

/** @agent:unlocks. Server render and first paint: only the start ship. The client store takes over after hydration. */
const SERVER_UNLOCKS = emptyUnlocks();

function SysMark({ icon }: { icon: IconName }) {
  return <PixelIcon name={icon} size={20} />;
}

/** True when the main pointer is a finger (phones, tablets), so focusing a field would pop up the keyboard. */
function touchFirst(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

export function Hangar({ onMenu }: { onMenu: () => void }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [letter, setLetter] = useState<Letter>("A");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [listOpen, setListOpen] = useState(false);

  const page = CRUISER_PAGES[pageIndex] ?? CRUISER_PAGES[0];
  const layout = page.layouts.find((item) => letterOf(item.heading) === letter) ?? page.layouts[0];
  const bay = hangarBay(layout.id);
  const active = letterOf(layout.heading);
  // @agent:unlocks. Ships page, "Layouts": locked layouts are shown but START is off (unlocks.ts).
  const unlocks = useSyncExternalStore(subscribeUnlocks, getUnlocks, () => SERVER_UNLOCKS);
  const locked = !isUnlockedIn(unlocks, layout.id);
  const lockRule = ruleFor(layout.id);
  const hull = hullDef(layout.id);
  const cruiser = hull?.cruiser ?? "";
  const art = useSyncExternalStore(subscribeArchive, archiveGeneration, () => 0);
  /** The archive's ship-picker portrait (ships_glow, then ships_noglow), for the LIST dialog. */
  const portraitOf = (layoutId: string | undefined): string | undefined => {
    const img = layoutId ? hullDef(layoutId)?.img : undefined;
    if (!img || art < 0) return undefined;
    return archiveImage(shipPreviewPath(img, true)) ?? archiveImage(shipPreviewPath(img, false));
  };
  const earned = new Set(unlocks === SERVER_UNLOCKS ? [] : earnedIds());
  const shipAch = shipAchievements(cruiser).flatMap((id) => {
    const row = achievementDef(id);
    return row ? [row] : [];
  });
  const allOpen = CRUISER_PAGES.every((p) => p.layouts.every((l) => isUnlockedIn(unlocks, l.id)));

  const seats = seatsOf(layout.id);
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

  // Weapon cards follow the hull's weapon list, which is the order the run mounts.
  const weapons = bay?.weapons ?? [];
  const drones = bay?.drones ?? [];
  const dronesOut = !bay?.droneSystem;
  const emptyWeapons = bay?.weaponSlots != null ? Math.max(0, bay.weaponSlots - weapons.length) : 0;
  const emptyDrones = bay?.droneSlots != null ? Math.max(0, bay.droneSlots - drones.length) : 0;
  const augments = bay?.augments ?? [];
  const emptyAugments = Math.max(0, 3 - augments.length);
  const unlockLines = bay?.unlock.length ? bay.unlock : [lockRule.quote];

  return (
    <section className="hangar">
      <div className="hangar-floor" aria-hidden="true" />
      <ArchiveCopy screen="hangar" />

      <header className="hangar-top">
        {/* Per the user: no RENAME. The ship's name only shows in the Ship menu and the victory text, so every run
            keeps its class name. Per the user: MENU takes RENAME's old spot and returns to the title screen. */}
        <button type="button" className="hangar-menu" onClick={onMenu}>
          {"MENU"}
        </button>
        <p className="hangar-name">{bay?.name ?? ""}</p>
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
          <button
            type="button"
            className="hangar-start"
            onClick={start}
            disabled={locked}
            title={locked ? "Locked" : undefined}
          >
            {"START"}
          </button>
        </div>
      </header>

      <aside className="hangar-ship">
        <p className="hangar-label">{"SHIP"}</p>
        <div className="hangar-list" role="group" aria-label={"Ship"}>
          <button type="button" aria-label={"Previous ship"} onClick={() => stepPage(-1)}>
            <i className="hangar-arrow is-prev" />
          </button>
          {/* Per the user: LIST opens every ship and layout to pick from. */}
          <button
            type="button"
            className="hangar-list-open"
            aria-haspopup="dialog"
            onClick={() => setListOpen(true)}
          >
            {"LIST"}
          </button>
          <button type="button" aria-label={"Next ship"} onClick={() => stepPage(1)}>
            <i className="hangar-arrow is-next" />
          </button>
        </div>
        <p className="hangar-label">{"LAYOUT"}</p>
        <div className="hangar-letters">
          {page.layouts.map((item) => {
            const itemLetter = letterOf(item.heading);
            const shut = !isUnlockedIn(unlocks, item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={
                  [active === itemLetter ? "is-on" : "", shut ? "is-locked" : ""]
                    .join(" ")
                    .trim() || undefined
                }
                aria-pressed={active === itemLetter}
                aria-label={`TYPE ${itemLetter}${shut ? " (locked)" : ""}`}
                onClick={() => setLetter(itemLetter)}
              >
                {"TYPE "}
                {itemLetter}
                {shut ? <PixelIcon name="lock" size={12} /> : null}
              </button>
            );
          })}
        </div>
        <div className="hangar-achieve">
          <p>{"Available Achievements:"}</p>
          <p>{"Complete 2/3 to unlock a layout!"}</p>
          <div>
            {shipAch.map((row) => (
              <span
                key={row.id}
                className={`hangar-ach${earned.has(row.id) ? " is-earned" : ""}`}
                title={`${row.name}: ${row.desc}${earned.has(row.id) ? " (earned)" : ""}`}
              >
                <PixelIcon name="lock" size={24} />
              </span>
            ))}
          </div>
        </div>
        <div className="hangar-dev" role="group" aria-label={"Developer unlocks"}>
          <button type="button" onClick={() => (allOpen ? resetUnlocks() : unlockAll())}>
            {allOpen ? "RESET LOCKS" : "UNLOCK ALL"}
          </button>
        </div>
      </aside>

      <div className={`hangar-stage${locked ? " is-locked" : ""}`}>
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
            showCrew
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
              <PixelIcon name="lock" size={20} />
              {" LOCKED"}
            </p>
            {unlockLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
        <div className="hangar-bars">
          {(bay?.systems ?? []).map((system) => (
            <span key={system.id} className="hangar-bar" title={`${system.name} (${system.level})`}>
              <SysMark icon={system.icon} />
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
          <h2>{"CREW"}</h2>
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
                  <span className="hangar-crew-cta">{"CUSTOMIZE"}</span>
                </button>
              );
            })}
          </div>
          {listOpen ? (
            <div className="hangar-crew-layer" onClick={() => setListOpen(false)}>
              <div
                className="hangar-ship-list has-x"
                role="dialog"
                aria-label={"Ships"}
                onClick={(event) => event.stopPropagation()}
              >
                <CloseX onClose={() => setListOpen(false)} />
                <p className="hangar-label">{"SHIPS"}</p>
                <ul>
                  {CRUISER_PAGES.map((cruiserPage, index) => (
                    <li key={cruiserPage.page}>
                      <span className="hangar-ship-list-hull">
                        {portraitOf(cruiserPage.layouts[0]?.id) ? (
                          <img
                            className="hangar-portrait"
                            src={portraitOf(cruiserPage.layouts[0]?.id)}
                            alt=""
                          />
                        ) : (
                          <PixelHull kind={cruiserPage.layouts[0]?.id.split("-")[0] ?? "kestrel"} />
                        )}
                      </span>
                      <span className="hangar-ship-list-name">{cruiserPage.page}</span>
                      <span className="hangar-ship-list-types">
                        {cruiserPage.layouts.map((item) => {
                          const itemLetter = letterOf(item.heading);
                          const shut = !isUnlockedIn(unlocks, item.id);
                          const here = index === pageIndex && itemLetter === active;
                          const itemName = hangarBay(item.id)?.name ?? item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={
                                [here ? "is-on" : "", shut ? "is-locked" : ""].join(" ").trim() ||
                                undefined
                              }
                              aria-pressed={here}
                              aria-label={`${itemName}, type ${itemLetter}${shut ? " (locked)" : ""}`}
                              title={itemName}
                              onClick={() => {
                                setPageIndex(index);
                                setLetter(itemLetter);
                                setListOpen(false);
                              }}
                            >
                              {"TYPE "}
                              {itemLetter}
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
                aria-label={"Customize crew"}
                onClick={(event) => event.stopPropagation()}
              >
                <CrewSprite
                  kin={seats[editing]}
                  uniform={UNIFORMS[picks[editing].uniform]}
                  size={56}
                />
                <div className="hangar-crew-fields">
                  <label>
                    <span>{"NAME"}</span>
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
                  <div className="hangar-swatches" role="radiogroup" aria-label={"Uniform"}>
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
                    <button
                      type="button"
                      onClick={() => updatePick(editing, { name: randomName() })}
                    >
                      {"RANDOM"}
                    </button>
                    <button type="button" onClick={() => setEditing(null)}>
                      {"DONE"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </section>
        <div className="hangar-mid">
          <section className="hangar-panel">
            <h2>{"WEAPONS"}</h2>
            <div className="hangar-slots">
              {weapons.map((weapon, index) => {
                const power = weaponPower(weapon.id);
                return (
                  <article
                    key={`${weapon.id}-${index}`}
                    className="hangar-slot"
                    title={weapon.name}
                  >
                    {power != null && power > 0 ? (
                      <span className="hangar-power" aria-hidden="true">
                        {Array.from({ length: power }, (_, pip) => (
                          <i key={pip} />
                        ))}
                      </span>
                    ) : (
                      <span className="hangar-power" />
                    )}
                    <WeaponArt id={weapon.id} height={26} />
                    <p>{weapon.name}</p>
                  </article>
                );
              })}
              {Array.from({ length: emptyWeapons }, (_, index) => (
                <article key={`empty-${index}`} className="hangar-slot is-empty" />
              ))}
            </div>
          </section>
          <section className="hangar-panel hangar-drones">
            <h2>{"DRONES"}</h2>
            {dronesOut ? (
              <p className="hangar-absent">{"SYSTEM NOT INSTALLED"}</p>
            ) : (
              <div className="hangar-slots">
                {drones.map((drone, index) => {
                  // hulls.ts `unfitted`: named on the layout, but this build does not fly it (The Engi Cruiser, Layout B:
                  // Anti-Personnel Drone). The card stays, dimmed, so the bay matches what the run can deploy.
                  return (
                    <article
                      key={`${drone.name}-${index}`}
                      className={`hangar-slot${drone.unfitted ? " is-unfitted" : ""}`}
                      title={
                        drone.unfitted
                          ? `${drone.name}: Named on the layout, not fitted in this build`
                          : drone.name
                      }
                    >
                      <DroneArt kind={drone.kind} height={32} />
                      <p>{drone.name}</p>
                    </article>
                  );
                })}
                {Array.from({ length: emptyDrones }, (_, index) => (
                  <article key={`drone-empty-${index}`} className="hangar-slot is-empty" />
                ))}
              </div>
            )}
          </section>
        </div>
        <section className="hangar-panel">
          <h2>{"AUGMENTATIONS"}</h2>
          <div className="hangar-augs">
            {augments.map((augment) => (
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
