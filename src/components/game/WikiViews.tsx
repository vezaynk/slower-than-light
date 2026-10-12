import { tx } from "@/i18n";
import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/game/wiki/achievements";
import { earnedIds, noteRun } from "@/game/wiki/achievement-track";
import { runScore } from "@/game/sim";
import { goTitle, verdictRestart } from "@/game/store";
import type { Game, SectorNode } from "@/game/types";
import { PixelIcon } from "./PixelIcon";
import { PixelHull } from "./PixelArt";
import { CloseX } from "./CloseX";

const GENERAL = [
  "just-getting-started",
  "federation-base-in-range",
  "federation-victory-easy",
  "federation-victory-normal",
  "your-own-fleet",
  "rule-ten-greed-is-eternal",
  "warlord",
];
const DISTANCE = [
  "coming-in-for-my-pacifism-run",
  "i-dont-need-no-stinkin-upgrades",
  "on-a-wing-and-a-prayer",
  "ballistophobia",
  "technophobia",
  "living-off-the-land",
  "no-redshirts-here",
];

const ACH_GROUPS: { title: string; ids: string[] }[] = [
  { title: tx("ui.WikiViews.general-progression"), ids: GENERAL },
  { title: tx("ui.WikiViews.going-the-distance"), ids: DISTANCE },
  {
    title: tx("ui.WikiViews.skill-and-equipment-feats"),
    ids: ACHIEVEMENTS.filter((row) => !row.ship && !GENERAL.includes(row.id) && !DISTANCE.includes(row.id)).map((row) => row.id),
  },
];

/**
 * Ship Achievements lists three names under each cruiser heading.
 * INFERRED: those names are on this screen, under the three Achievements categories.
 * The Achievements page does not put them in those categories, and this does not lock a layout.
 */
const SHIP_GROUPS: { title: string; ids: string[] }[] = [];
for (const row of ACHIEVEMENTS) {
  if (!row.ship) continue;
  let group = SHIP_GROUPS.find((item) => item.title === row.ship);
  if (!group) {
    group = { title: row.ship, ids: [] };
    SHIP_GROUPS.push(group);
  }
  group.ids.push(row.id);
}

function rows(ids: string[]) {
  return ids.flatMap((id) => {
    const row = ACHIEVEMENTS.find((item) => item.id === id);
    return row ? [row] : [];
  });
}

/** Achievements screen: STATS and ACHIEVEMENTS. File:FTL Slightly Used Achievement Screen.jpg */
export function AchievementsScreen({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"stats" | "achievements">(game && (game.phase === "victory" || game.phase === "defeat") ? "stats" : "stats");
  const [type, setType] = useState<"A" | "B" | "C">("A");
  const [earned, setEarned] = useState<string[]>([]);
  const finished = !!game && (game.phase === "victory" || game.phase === "defeat") && game.outcome !== "tutorial";
  useEffect(() => {
    if (game) noteRun(game);
    setEarned(earnedIds());
  }, [game]);
  return (
    <section className="wiki-screen ach-screen has-x" onClick={(e) => e.stopPropagation()}>
      <CloseX onClose={onClose} />
      <header className="ach-tabs">
        <button type="button" className={tab === "stats" ? "is-on" : ""} onClick={() => setTab("stats")}>
          {tx("ui.WikiViews.stats")}
        </button>
        <button type="button" className={tab === "achievements" ? "is-on" : ""} onClick={() => setTab("achievements")}>
          {tx("ui.WikiViews.achievements")}
        </button>
      </header>
      {tab === "achievements" ? (
        <div className="ach-body">
          {ACH_GROUPS.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <AchievementTiles ids={group.ids} earned={earned} />
            </div>
          ))}
          <h3>{tx("ui.WikiViews.ship-achievements")}</h3>
          {SHIP_GROUPS.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <AchievementTiles ids={group.ids} earned={earned} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ach-body">
          {finished && game ? <RunStats game={game} /> : <p className="store-note">{tx("ui.WikiViews.finish-a-run-to-see-its")}</p>}
          <ShipBest type={type} onType={setType} />
        </div>
      )}
    </section>
  );
}

function AchievementTiles({ ids, earned }: { ids: string[]; earned: string[] }) {
  return (
    <div className="ach-row">
      {rows(ids).map((row) => {
        const on = earned.includes(row.id);
        return (
          <span key={row.id} className={on ? "ach-slot is-earned" : "ach-slot"} title={row.requirement}>
            <i />
            <b>{row.name}</b>
          </span>
        );
      })}
    </div>
  );
}

function RunStats({ game }: { game: Game }) {
  return (
    <div className="run-stats">
      <p>
        {tx("ui.WikiViews.scrap-collected")}<b>{game.scrapCollected ?? 0}</b>
      </p>
      <p>
        {tx("ui.WikiViews.beacons-visited")}<b>{game.beaconsVisited ?? 0}</b>
      </p>
      <p>
        {tx("ui.WikiViews.ships-defeated")}<b>{game.phase === "victory" ? Math.max(0, game.kills - 1) : game.kills}</b>
      </p>
      <p>
        {tx("ui.WikiViews.score")}<b>{runScore(game)}</b>
      </p>
    </div>
  );
}

/** File:FTL ship unlock progression cropped.png — Main Menu: Stats, Ship Best, List. */
function ShipBest({ type, onType }: { type: "A" | "B" | "C"; onType: (type: "A" | "B" | "C") => void }) {
  return (
    <div className="ship-best">
      <div className="ship-best-head">
        <p>{tx("ui.WikiViews.choose-your-ship")}</p>
        <div>
          {(["A", "B", "C"] as const).map((item) => (
            <button key={item} type="button" className={type === item ? "is-on" : ""} onClick={() => onType(item)}>
              {tx("ui.WikiViews.type")}{item}
            </button>
          ))}
        </div>
      </div>
      <div className="ship-best-grid">
        <span className="ship-card is-open">
          <PixelHull kind="kestrel" />
          <i>1 2 3</i>
        </span>
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className="ship-card is-locked" aria-label={tx("ui.WikiViews.locked")}>
            <PixelIcon name="lock" size={24} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** File:Help screen overlay.png. Opens from TUTORIAL. */
export function HelpScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="wiki-screen help-screen" onClick={onContinue} role="button" tabIndex={0} onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") onContinue();
    }}>
      <div className="help-grid">
        <article>
          <h2>{tx("ui.WikiViews.crew-control")}</h2>
          <p>{tx("ui.WikiViews.how-to-give-orders")}</p>
          <p>{tx("ui.WikiViews.left-click-or-drag-to-select")}</p>
          <p>{tx("ui.WikiViews.right-click-to-move-selected-crew")}</p>
          <p>{tx("ui.WikiViews.crew-will-automatically-repair-systems-or")}</p>
        </article>
        <div className="help-mid">
          <article>
            <h2>{tx("ui.WikiViews.pausing")}</h2>
            <p className="help-paused">{tx("ui.WikiViews.paused")}</p>
            <p>{tx("ui.WikiViews.press-space-to-resume")}</p>
            <p>{tx("ui.WikiViews.press-the-space-bar-to-pause")}</p>
            <p>{tx("ui.WikiViews.commands-and-orders-can-still-be")}</p>
          </article>
          <article>
            <h2>{tx("ui.WikiViews.power-distribution")}</h2>
            <p>{tx("ui.WikiViews.adding-removing-power-to-systems")}</p>
            <p>{tx("ui.WikiViews.left-click-to-add-power")}</p>
            <p>{tx("ui.WikiViews.right-click-to-remove-power")}</p>
          </article>
        </div>
        <article>
          <h2>WEAPONS/DRONES</h2>
          <p>{tx("ui.WikiViews.how-to-fire")}</p>
          <p>{tx("ui.WikiViews.left-click-to-power-a-weapon")}</p>
          <p>{tx("ui.WikiViews.left-click-again-to-activate")}</p>
          <p>{tx("ui.WikiViews.left-click-on-an-enemy-ship")}</p>
          <p>{tx("ui.WikiViews.left-click-and-drag-to-reorder")}</p>
          <p>{tx("ui.WikiViews.if-the-system-is-damaged-the")}</p>
        </article>
      </div>
    </section>
  );
}

const HIGH_KEY = "stl-high-score";

function verdictCopy(game: Game): { title: string; body: string; score: boolean } {
  if (game.outcome === "victory") {
    return {
      title: tx("ui.WikiViews.victory"),
      body: tx("ui.WikiViews.congratulations-you-ve-defeated-the-rebel"),
      score: true,
    };
  }
  if (game.outcome === "tutorial") {
    return {
      title: tx("ui.WikiViews.game-over"),
      body: tx("ui.WikiViews.somehow-you-ve-died-during-the"),
      score: false,
    };
  }
  if (game.outcome === "crew") {
    return {
      title: tx("ui.WikiViews.game-over"),
      body: tx("ui.WikiViews.all-crew-members-have-died-your"),
      score: true,
    };
  }
  if (game.outcome === "rebel") {
    return {
      title: tx("ui.WikiViews.game-over"),
      body: tx("ui.WikiViews.the-rebel-flagship-is-within-range"),
      score: true,
    };
  }
  return {
    title: tx("ui.WikiViews.game-over"),
    body: tx("ui.WikiViews.one-last-explosion-marks-your-fate"),
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
  if (stats) return <AchievementsScreen game={game} onClose={() => setStats(false)} />;
  if (step === "cinema") {
    const names = game.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.name);
    const crew =
      names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return (
      <button type="button" className="victory-cinema" onClick={() => setStep("card")}>
        <p>{tx("ui.WikiViews.thanks-to-the-valiant-effort-of")}</p>
        <h2>{game.player.name}</h2>
        <p>{tx("ui.WikiViews.and-her-successful-crew")}</p>
        <p className="cinema-crew">{crew}</p>
        <p>{tx("ui.WikiViews.the-rebel-s-flagship-was-destroyed")}</p>
      </button>
    );
  }
  return (
    <article className="verdict">
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {copy.score ? <p className="verdict-score">{tx("ui.WikiViews.score-2")}{score}</p> : null}
      {copy.score && high ? <p className="verdict-high">{tx("ui.WikiViews.new-high-score")}</p> : null}
      <button type="button" className="verdict-stats" onClick={() => setStats(true)}>
        {tx("ui.WikiViews.stats")}
      </button>
      <div className="verdict-row">
        <button
          type="button"
          onClick={() => verdictRestart(game)}
        >
          {tx("ui.WikiViews.restart")}
        </button>
        <button type="button" onClick={() => goTitle("hangar")}>
          {tx("ui.WikiViews.hangar")}
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          {tx("ui.WikiViews.main-menu")}
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          {tx("ui.WikiViews.quit")}
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
