import { Kicker } from "@stl/ui";
import { useEffect, useState } from "react";
import { allAchievements, hullDef } from "@stl/pack";
import { earnedIds, isTracked, noteRun } from "@/game/wiki/achievement-track";
import { lifetimeOf } from "@/game/wiki/achieve-notes";
import { HULLS } from "@/game/hulls";
import {
  UNLOCKS_KEY,
  emptyUnlocks,
  isUnlockedIn,
  parseUnlocks,
  shipAchievements,
  type UnlockState,
} from "@/game/unlocks";
import { runScore } from "@/game/sim";
import { goTitle, verdictRestart } from "@/game/store";
import type { Game, SectorNode } from "@/game/types";
import { PixelIcon } from "./PixelIcon";
import { PixelHull } from "./PixelArt";
import { CloseX } from "./CloseX";
import { AchievementIcon } from "./AchievementIcon";
import "./stats.css";

const GENERAL = [
  "ACH_SECTOR_5",
  "ACH_SECTOR_8",
  "ACH_WIN_EASY",
  "ACH_WIN_NORMAL",
  "ACH_UNLOCK_ALL",
  "ACH_SCRAP",
  "ACH_SHIPS",
];
const DISTANCE = [
  "ACH_PACIFIST",
  "ACH_NO_UPGRADES",
  "ACH_NO_REPAIR",
  "ACH_NO_MISSILES",
  "ACH_NO_DRONES",
  "ACH_NO_BUYING",
  "ACH_NO_DEATH",
];

/** The three Achievements categories, over the loaded archive's achievements. */
function achGroups(): { title: string; ids: string[] }[] {
  return [
    { title: "General Progression", ids: GENERAL },
    { title: "Going the Distance", ids: DISTANCE },
    {
      title: "Skill and Equipment Feats",
      ids: allAchievements()
        .filter((row) => !row.ship && !GENERAL.includes(row.id) && !DISTANCE.includes(row.id))
        .map((row) => row.id),
    },
  ];
}

/**
 * Ship Achievements lists three names under each cruiser heading.
 * INFERRED: those names are on this screen, under the three Achievements categories.
 * The Achievements page does not put them in those categories, and this does not lock a layout.
 * The heading is the ship blueprint's class.
 */
function shipGroups(): { title: string; ids: string[] }[] {
  const groups: { title: string; ids: string[] }[] = [];
  for (const row of allAchievements()) {
    if (!row.ship) continue;
    const title = hullDef(row.ship)?.cruiser || row.ship;
    let group = groups.find((item) => item.title === title);
    if (!group) {
      group = { title, ids: [] };
      groups.push(group);
    }
    group.ids.push(row.id);
  }
  return groups;
}

function rows(ids: string[]) {
  return ids.flatMap((id) => {
    const row = allAchievements().find((item) => item.id === id);
    return row ? [row] : [];
  });
}

/** Lines whose numbers the Records tab counts toward. Achievements: "Collect 10,000 scrap", "Defeat 1000 ships". */
const SCRAP_GOAL = 10000;
const KILL_GOAL = 1000;
const HIGH_KEY = "stl-high-score";

type StatsTab = "records" | "achievements" | "ships";
type AchFilter = "all" | "earned" | "locked";
const FILTERS: [AchFilter, string][] = [
  ["all", "All"],
  ["earned", "Earned"],
  ["locked", "Locked"],
];

function savedHigh(): number {
  try {
    if (typeof localStorage === "undefined") return 0;
    return Number(localStorage.getItem(HIGH_KEY) || "0") || 0;
  } catch {
    return 0;
  }
}

function savedUnlockState(): UnlockState {
  try {
    if (typeof localStorage === "undefined") return emptyUnlocks();
    return parseUnlocks(localStorage.getItem(UNLOCKS_KEY));
  } catch {
    return emptyUnlocks();
  }
}

/** One card per cruiser, in hangar order. The PixelHull stamp is the hull id's first word (kestrel-a: kestrel). */
const CRUISERS: { cruiser: string; kind: string }[] = [];
for (const hull of HULLS) {
  if (!CRUISERS.some((item) => item.cruiser === hull.cruiser))
    CRUISERS.push({ cruiser: hull.cruiser, kind: hull.id.split("-")[0] ?? "kestrel" });
}

/**
 * Achievements screen: STATS and ACHIEVEMENTS. File:FTL Slightly Used Achievement Screen.jpg
 * Per the user: reworked onto the ship sheet's tabs (Records, Achievements, Ships), each achievement with its own icon
 * and unlock line. INVENTED layout.
 */
export function AchievementsScreen({ game, onClose }: { game: Game | null; onClose: () => void }) {
  const [tab, setTab] = useState<StatsTab>("records");
  const [filter, setFilter] = useState<AchFilter>("all");
  const [type, setType] = useState<"A" | "B" | "C">("A");
  const [earned, setEarned] = useState<string[]>([]);
  const [unlocks, setUnlocks] = useState<UnlockState>(emptyUnlocks);
  const [high, setHigh] = useState(0);
  const [life, setLife] = useState({ scrap: 0, kills: 0 });
  const finished =
    !!game && (game.phase === "victory" || game.phase === "defeat") && game.outcome !== "tutorial";
  useEffect(() => {
    if (game) noteRun(game);
    setEarned(earnedIds());
    setUnlocks(savedUnlockState());
    setHigh(savedHigh());
    // A run that has collected nothing adds nothing, so it reads the cross-game bank alone.
    setLife(lifetimeOf(game ?? ({ scrapCollected: 0, kills: 0 } as Game)));
  }, [game]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const total = allAchievements().length;
  const got = allAchievements().filter((row) => earned.includes(row.id)).length;
  const typeA = HULLS.filter((hull) => hull.layout === "A");
  const shipsOpen = HULLS.filter((hull) => isUnlockedIn(unlocks, hull.id)).length;
  const tabs: [StatsTab, string, string][] = [
    ["records", "Records", ""],
    ["achievements", "Achievements", `${got}/${total}`],
    ["ships", "Ships", `${shipsOpen}/${HULLS.length}`],
  ];
  const shown = (ids: string[]) =>
    rows(ids).filter(
      (row) => filter === "all" || (filter === "earned") === earned.includes(row.id),
    );
  return (
    <section
      className="wiki-screen ach-screen stats-sheet has-x"
      onClick={(e) => e.stopPropagation()}
      aria-label={"STATS"}
    >
      <CloseX onClose={onClose} />
      <header className="ship-sheet-head">
        <Kicker as="h2">{"STATS"}</Kicker>
        <span className="stats-progress">
          <span>
            <b>{got}</b> / {total}
          </span>
          <span className="stats-bar" aria-hidden="true">
            <i style={{ width: `${(got / total) * 100}%` }} />
          </span>
        </span>
      </header>
      <div
        className="ship-tabs"
        role="tablist"
        aria-label={"STATS"}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const ids = tabs.map(([id]) => id);
          const at = ids.indexOf(tab);
          const next = ids[(at + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length]!;
          setTab(next);
          requestAnimationFrame(() => document.getElementById(`stats-tab-${next}`)?.focus());
        }}
      >
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            id={`stats-tab-${id}`}
            type="button"
            role="tab"
            className={`ship-tab${tab === id ? " is-on" : ""}`}
            aria-selected={tab === id}
            aria-controls="stats-tab-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
          >
            <span>{label}</span>
            {count ? <i className="ship-tab-count">{count}</i> : null}
          </button>
        ))}
      </div>
      <div
        key={tab}
        className="ship-tab-panel stats-panel"
        id="stats-tab-panel"
        role="tabpanel"
        aria-labelledby={`stats-tab-${tab}`}
      >
        {tab === "records" ? (
          <>
            <section className="sheet-group">
              <h3 className="sheet-group-head">{"This Run"}</h3>
              {finished && game ? (
                <RunStats game={game} />
              ) : (
                <p className="stats-empty">{"Finish a run to see its stats here."}</p>
              )}
            </section>
            <section className="sheet-group">
              <h3 className="sheet-group-head">{"All Runs"}</h3>
              <div className="stats-tiles">
                <StatTile icon="target" value={high} label={"High score"} best={high > 0} />
                <StatTile
                  icon="scrap"
                  value={life.scrap}
                  label={"Scrap collected"}
                  goal={SCRAP_GOAL}
                  goalName={achName("rule-ten-greed-is-eternal")}
                />
                <StatTile
                  icon="ship"
                  value={life.kills}
                  label={"Ships defeated"}
                  goal={KILL_GOAL}
                  goalName={achName("warlord")}
                />
                <StatTile icon="upgrade" value={got} label={"Achievements"} goal={total} />
                <StatTile
                  icon="jump"
                  value={typeA.filter((hull) => isUnlockedIn(unlocks, hull.id)).length}
                  label={"Cruisers unlocked"}
                  goal={typeA.length}
                />
                <StatTile
                  icon="missile"
                  value={unlocks.wins.length}
                  label={"Flagship victories"}
                  best={unlocks.wins.length > 0}
                />
              </div>
            </section>
          </>
        ) : null}
        {tab === "achievements" ? (
          <>
            <div className="opt-choice stats-filter" role="group" aria-label={"ACHIEVEMENTS"}>
              {FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {[...achGroups(), ...shipGroups()].map((group) => {
              const list = shown(group.ids);
              if (!list.length) return null;
              const have = group.ids.filter((id) => earned.includes(id)).length;
              return (
                <section key={group.title} className="sheet-group">
                  <h3 className="sheet-group-head">
                    {group.title}
                    <span className="BEAM_1">
                      {have}/{group.ids.length}
                    </span>
                  </h3>
                  <AchievementCards ids={list.map((row) => row.id)} earned={earned} />
                </section>
              );
            })}
            {allAchievements().every((row) => !shown([row.id]).length) ? (
              <p className="stats-empty">
                {filter === "earned"
                  ? "No achievements earned yet."
                  : "Every achievement is earned."}
              </p>
            ) : null}
          </>
        ) : null}
        {tab === "ships" ? (
          <ShipBest type={type} onType={setType} unlocks={unlocks} earned={earned} />
        ) : null}
      </div>
    </section>
  );
}

function achName(id: string): string {
  return allAchievements().find((row) => row.id === id)?.name ?? id;
}

function StatTile({
  icon,
  value,
  label,
  goal,
  goalName,
  best = false,
}: {
  icon: Parameters<typeof PixelIcon>[0]["name"];
  value: number;
  label: string;
  goal?: number;
  goalName?: string;
  best?: boolean;
}) {
  return (
    <div className={`stats-tile${best ? " is-best" : ""}`}>
      <PixelIcon name={icon} size={32} />
      <b>
        {value.toLocaleString("en-US")}
        {goal ? <span> / {goal.toLocaleString("en-US")}</span> : null}
      </b>
      <span>{label}</span>
      {goal ? (
        <span className="stats-bar" aria-hidden="true">
          <i style={{ width: `${Math.min(100, (value / goal) * 100)}%` }} />
        </span>
      ) : null}
      {goalName ? <small>{`Counts toward ${goalName}`}</small> : null}
    </div>
  );
}

function AchievementCards({ ids, earned }: { ids: string[]; earned: string[] }) {
  return (
    <div className="ach-cards">
      {rows(ids).map((row) => {
        const on = earned.includes(row.id);
        return (
          <article key={row.id} className={on ? "ach-card is-earned" : "ach-card"}>
            <AchievementIcon id={row.id} earned={on} size={48} />
            <b className="ach-card-name">{row.name}</b>
            <p className="ach-card-text">{row.desc}</p>
            <span className="ach-card-tag">
              {on ? "Earned" : isTracked(row.id) ? "Locked" : "Not tracked yet"}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function RunStats({ game }: { game: Game }) {
  return (
    <div className="stats-tiles run-stats">
      <StatTile icon="scrap" value={game.scrapCollected ?? 0} label={"Scrap collected"} />
      <StatTile icon="jump" value={game.beaconsVisited ?? 0} label={"Beacons visited"} />
      <StatTile
        icon="ship"
        value={game.phase === "victory" ? Math.max(0, game.kills - 1) : game.kills}
        label={"Ships defeated"}
      />
      <StatTile icon="target" value={runScore(game)} label={"Score"} best />
    </div>
  );
}

/**
 * File:FTL ship unlock progression cropped.png — Main Menu: Stats, Ship Best, List.
 * Per the user: each cruiser for the chosen layout, open or locked, a Flagship win, and its three ship achievements.
 */
function ShipBest({
  type,
  onType,
  unlocks,
  earned,
}: {
  type: "A" | "B" | "C";
  onType: (type: "A" | "B" | "C") => void;
  unlocks: UnlockState;
  earned: string[];
}) {
  return (
    <section className="sheet-group">
      <h3 className="sheet-group-head">
        {"CHOOSE YOUR SHIP"}
        <span className="opt-choice">
          {(["A", "B", "C"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={type === item}
              onClick={() => onType(item)}
            >
              {"TYPE "}
              {item}
            </button>
          ))}
        </span>
      </h3>
      <div className="stats-ships">
        {CRUISERS.map(({ cruiser, kind }) => {
          const hull = HULLS.find((item) => item.cruiser === cruiser && item.layout === type);
          const open = !!hull && isUnlockedIn(unlocks, hull.id);
          const won = !!hull && unlocks.wins.includes(hull.id);
          return (
            <article
              key={cruiser}
              className={`stats-ship${open ? " is-open" : ""}${won ? " is-won" : ""}`}
            >
              <span className="stats-ship-art">
                <PixelHull kind={kind} />
                {open ? null : <PixelIcon name="lock" size={32} />}
              </span>
              <b className="stats-ship-name">{hull?.name ?? cruiser}</b>
              <span className="stats-ship-state">
                {won ? "Flagship defeated" : open ? "Unlocked" : "Locked"}
              </span>
              <span className="stats-ship-achs">
                {shipAchievements(cruiser).map((id) => (
                  <span
                    key={id}
                    title={`${achName(id)}: ${allAchievements().find((row) => row.id === id)?.desc ?? ""}`}
                  >
                    <AchievementIcon id={id} earned={earned.includes(id)} size={30} />
                  </span>
                ))}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** File:Help screen overlay.png. Opens from TUTORIAL. */
export function HelpScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <section
      className="wiki-screen help-screen"
      onClick={onContinue}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onContinue();
      }}
    >
      <div className="help-grid">
        <article>
          <h2>{"CREW CONTROL"}</h2>
          <p>{"How to give orders:"}</p>
          <p>{"Left Click or Drag to select crew."}</p>
          <p>{"Right Click to move selected crew."}</p>
          <p>
            {"Crew will automatically repair systems or fight intruders in their current room."}
          </p>
        </article>
        <div className="help-mid">
          <article>
            <h2>{"PAUSING"}</h2>
            <p className="help-paused">{"PAUSED"}</p>
            <p>{"Press SPACE to resume"}</p>
            <p>{"Press the Space Bar to pause."}</p>
            <p>{"Commands and orders can still be given while paused."}</p>
          </article>
          <article>
            <h2>{"POWER DISTRIBUTION"}</h2>
            <p>{"Adding/removing power to systems:"}</p>
            <p>{"Left Click to add power."}</p>
            <p>{"Right Click to remove power."}</p>
          </article>
        </div>
        <article>
          <h2>WEAPONS/DRONES</h2>
          <p>{"How to fire:"}</p>
          <p>{"Left click to power a weapon."}</p>
          <p>{"Left click again to activate."}</p>
          <p>{"Left click on an enemy ship to target it."}</p>
          <p>{"Left Click and drag to reorder weapons/drones."}</p>
          <p>{"If the system is damaged, the rightmost item will be depowered first."}</p>
        </article>
      </div>
    </section>
  );
}

function verdictCopy(game: Game): { title: string; body: string; score: boolean } {
  if (game.outcome === "victory") {
    return {
      title: "VICTORY!",
      body: "Congratulations! You've defeated the Rebel Flagship and ensured the victory of the Federation!",
      score: true,
    };
  }
  if (game.outcome === "tutorial") {
    return {
      title: "GAME OVER",
      body: "Somehow you've died during the introduction training exercise. Feel free to try again but this doesn't bode well for your mission.",
      score: false,
    };
  }
  if (game.outcome === "crew") {
    return {
      title: "GAME OVER",
      body: "All crew members have died. Your ship will continue to drift for eternity, or until looters destroy it.",
      score: true,
    };
  }
  if (game.outcome === "rebel") {
    return {
      title: "GAME OVER",
      body: "The Rebel Flagship is within range of the Federation Base. All is lost, they've won.",
      score: true,
    };
  }
  return {
    title: "GAME OVER",
    body: "One last explosion marks your fate as your ship is torn apart.",
    score: true,
  };
}

/** Victory.jpg, then Victory-0.jpg. Game Over uses the same button row. */
export function Verdict({ game }: { game: Game }) {
  const won = game.phase === "victory";
  const [step, setStep] = useState<"cinema" | "card">(won ? "cinema" : "card");
  const [stats, setStats] = useState(false);
  const copy = verdictCopy(game);
  const score = runScore(game);
  const [high, setHigh] = useState(false);
  useEffect(() => {
    if (!copy.score || step !== "card") return;
    const prev = Number(localStorage.getItem(HIGH_KEY) || "0");
    if (score > prev) {
      localStorage.setItem(HIGH_KEY, String(score));
      setHigh(true);
    }
  }, [copy.score, score, step]);
  // Game patches: the credits close only with Escape, not a stray key. A click still leaves them.
  useEffect(() => {
    if (step !== "cinema") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setStep("card");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);
  if (stats) return <AchievementsScreen game={game} onClose={() => setStats(false)} />;
  if (step === "cinema") {
    const names = game.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.name);
    const crew =
      names.length < 2
        ? names.join("")
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return (
      <button type="button" className="victory-cinema" onClick={() => setStep("card")}>
        <p>{"Thanks to the valiant effort of:"}</p>
        <h2>{game.player.name}</h2>
        <p>{"And her successful crew:"}</p>
        <p className="cinema-crew">{crew}</p>
        <p>
          {
            "The Rebel's flagship was destroyed, throwing their fleet into chaos and ensuring a Federation victory"
          }
        </p>
      </button>
    );
  }
  return (
    <article className="verdict">
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {copy.score ? (
        <p className="verdict-score">
          {"SCORE: "}
          {score}
        </p>
      ) : null}
      {copy.score && high ? <p className="verdict-high">{"New High Score!"}</p> : null}
      <button type="button" className="verdict-stats" onClick={() => setStats(true)}>
        {"STATS"}
      </button>
      <div className="verdict-row">
        <button type="button" onClick={() => verdictRestart(game)}>
          {"RESTART"}
        </button>
        <button type="button" onClick={() => goTitle("hangar")}>
          {"HANGAR"}
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          {"MAIN MENU"}
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          {"QUIT"}
        </button>
      </div>
    </article>
  );
}

export function sectorTone(group: SectorNode["group"]): "civilian" | "hostile" | "nebula" {
  if (group === "nebula") return "nebula";
  if (group === "hostile" || group === "last-stand") return "hostile";
  return "civilian";
}
