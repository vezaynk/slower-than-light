import { useEffect, useState } from "react";
import { ACHIEVEMENTS } from "@/game/wiki/achievements";
import { earnedIds, noteRun } from "@/game/wiki/achievement-track";
import { buy, leaveStore, repairHull, runScore } from "@/game/sim";
import { citedSell, citedSellQuote } from "@/game/wiki/cited-stores";
import { goTitle, useGame, verdictRestart } from "@/game/store";
import type { Game, SectorNode } from "@/game/types";
import { WeaponArt } from "./GearArt";
import { PixelIcon } from "./PixelIcon";
import { PixelHull } from "./PixelArt";

function act(fn: (g: Game) => void) {
  useGame.getState().act(fn);
}

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
  { title: "General Progression:", ids: GENERAL },
  { title: "Going the Distance:", ids: DISTANCE },
  {
    title: "Skill and Equipment Feats:",
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
    <section className="wiki-screen ach-screen" onClick={(e) => e.stopPropagation()}>
      <header className="ach-tabs">
        <button type="button" className={tab === "stats" ? "is-on" : ""} onClick={() => setTab("stats")}>
          STATS
        </button>
        <button type="button" className={tab === "achievements" ? "is-on" : ""} onClick={() => setTab("achievements")}>
          ACHIEVEMENTS
        </button>
        <button type="button" className="wiki-close" onClick={onClose}>
          CLOSE
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
          <h3>Ship Achievements</h3>
          {SHIP_GROUPS.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <AchievementTiles ids={group.ids} earned={earned} />
            </div>
          ))}
        </div>
      ) : (
        <div className="ach-body">
          {finished && game ? <RunStats game={game} /> : <p className="store-note">Finish a run to see its stats here.</p>}
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
        Scrap collected <b>{game.scrapCollected ?? 0}</b>
      </p>
      <p>
        Beacons visited <b>{game.beaconsVisited ?? 0}</b>
      </p>
      <p>
        Ships defeated <b>{game.phase === "victory" ? Math.max(0, game.kills - 1) : game.kills}</b>
      </p>
      <p>
        SCORE <b>{runScore(game)}</b>
      </p>
    </div>
  );
}

/** File:FTL ship unlock progression cropped.png — Main Menu: Stats, Ship Best, List. */
function ShipBest({ type, onType }: { type: "A" | "B" | "C"; onType: (type: "A" | "B" | "C") => void }) {
  return (
    <div className="ship-best">
      <div className="ship-best-head">
        <p>CHOOSE YOUR SHIP</p>
        <div>
          {(["A", "B", "C"] as const).map((item) => (
            <button key={item} type="button" className={type === item ? "is-on" : ""} onClick={() => onType(item)}>
              TYPE {item}
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
          <span key={i} className="ship-card is-locked" aria-label="Locked">
            <PixelIcon name="lock" size={24} />
          </span>
        ))}
      </div>
    </div>
  );
}

const CONTROLS_1: [string, string][][] = [
  [
    ["Select Crew 1", "F1"],
    ["Select Crew 2", "F2"],
    ["Select Crew 3", "F3"],
    ["Select Crew 4", "F4"],
    ["Select Crew 5", "F5"],
    ["Select Crew 6", "F6"],
    ["Select Crew 7", "F7"],
    ["Select Crew 8", "F8"],
    ["Select All Crew", "Q"],
    ["Return to Stations", "RETURN"],
    ["Save Stations", "/"],
    ["Secret Alien Ability", "P"],
    ["Open All Doors", "Z"],
  ],
  [
    ["Close All Doors", "X"],
    ["Activate Cloaking", "C"],
    ["Teleport - Send", "T"],
    ["Teleport - Return", "R"],
    ["Start Hacking", "N"],
    ["Mind Control", "M"],
    ["Activate Battery", "B"],
    ["Drone Slot 1", "5"],
    ["Drone Slot 2", "6"],
    ["Drone Slot 3", "7"],
    ["Weapon Slot 1", "1"],
    ["Weapon Slot 2", "2"],
    ["Weapon Slot 3", "3"],
  ],
  [
    ["Weapon Slot 4", "4"],
    ["Toggle Autofire", "V"],
    ["Autofire Modifier (Hold + Aim)", "LEFT CTRL"],
    ["Pause Game", "SPACE"],
    ["FTL Jump", "J"],
    ["Open Upgrades", "U"],
    ["Open Inventory", "I"],
    ["Open Store", "...."],
    ["Open Crew Manifest", "...."],
    ["Open Options", "O"],
    ["Increase Event Font", "-"],
    ["Decrease Event Font", "="],
  ],
];

const CONTROLS_2: [string, string][][] = [
  [
    ["Power Shields", "A"],
    ["Power Engines", "S"],
    ["Power Oxygen", "F"],
    ["Power Medbay / Clone", "D"],
    ["Power Teleporter", "G"],
    ["Power Cloaking", "H"],
    ["Power Mind Control", "K"],
    ["Power Hacking", "L"],
    ["Power Artillery", "Y"],
    ["Power Weapons", "W"],
    ["Power Drones", "E"],
    ["De-Power Shields", "...."],
    ["De-Power Engines", "...."],
  ],
  [
    ["De-Power Oxygen", "...."],
    ["De-Power Medbay / Clone", "...."],
    ["De-Power Teleporter", "...."],
    ["De-Power Cloaking", "...."],
    ["De-Power Mind Control", "...."],
    ["De-Power Hacking", "...."],
    ["De-Power Artillery", "...."],
    ["De-Power Weapons", "...."],
    ["De-Power Drones", "...."],
    ["Power System 1", "...."],
    ["Power System 2", "...."],
    ["Power System 3", "...."],
    ["Power System 4", "...."],
  ],
  [
    ["Power System 5", "...."],
    ["Power System 6", "...."],
    ["Power System 7", "...."],
    ["Power System 8", "...."],
    ["De-Power System 1", "...."],
    ["De-Power System 2", "...."],
    ["De-Power System 3", "...."],
    ["De-Power System 4", "...."],
    ["De-Power System 5", "...."],
    ["De-Power System 6", "...."],
    ["De-Power System 7", "...."],
    ["De-Power System 8", "...."],
  ],
];

/** File:ConfigureControls1.png and File:ConfigureControls2.png. Reached from OPTIONS. */
export function ControlsScreen({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState<1 | 2>(1);
  const columns = page === 1 ? CONTROLS_1 : CONTROLS_2;
  return (
    <section className="wiki-screen controls-screen" onClick={(e) => e.stopPropagation()}>
      <header>
        <h2>CONFIGURE CONTROLS</h2>
        <div>
          <button type="button" className={page === 1 ? "is-on" : ""} onClick={() => setPage(1)}>
            PAGE 1
          </button>
          <button type="button" className={page === 2 ? "is-on" : ""} onClick={() => setPage(2)}>
            PAGE 2
          </button>
        </div>
      </header>
      <div className="controls-cols">
        {columns.map((col, i) => (
          <ul key={i}>
            {col.map(([label, key]) => (
              <li key={label}>
                <span>{label}</span>
                <b>{key}</b>
              </li>
            ))}
          </ul>
        ))}
      </div>
      <footer>
        <button type="button" onClick={() => setPage(1)}>
          DEFAULTS
        </button>
        <button type="button" onClick={onClose}>
          CLOSE
        </button>
      </footer>
    </section>
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
          <h2>CREW CONTROL</h2>
          <p>How to give orders:</p>
          <p>Left Click or Drag to select crew.</p>
          <p>Right Click to move selected crew.</p>
          <p>Crew will automatically repair systems or fight intruders in their current room.</p>
        </article>
        <div className="help-mid">
          <article>
            <h2>PAUSING</h2>
            <p className="help-paused">PAUSED</p>
            <p>Press SPACE to resume</p>
            <p>Press the Space Bar to pause.</p>
            <p>Commands and orders can still be given while paused.</p>
          </article>
          <article>
            <h2>POWER DISTRIBUTION</h2>
            <p>Adding/removing power to systems:</p>
            <p>Left Click to add power.</p>
            <p>Right Click to remove power.</p>
          </article>
        </div>
        <article>
          <h2>WEAPONS/DRONES</h2>
          <p>How to fire:</p>
          <p>Left click to power a weapon.</p>
          <p>Left click again to activate.</p>
          <p>Left click on an enemy ship to target it.</p>
          <p>Left Click and drag to reorder weapons/drones.</p>
          <p>If the system is damaged, the rightmost item will be depowered first.</p>
        </article>
      </div>
    </section>
  );
}

const HIGH_KEY = "stl-high-score";

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
  if (stats) return <AchievementsScreen game={game} onClose={() => setStats(false)} />;
  if (step === "cinema") {
    const names = game.crew.filter((c) => c.side === "player" && c.hp > 0).map((c) => c.name);
    const crew =
      names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return (
      <button type="button" className="victory-cinema" onClick={() => setStep("card")}>
        <p>Thanks to the valiant effort of:</p>
        <h2>{game.player.name}</h2>
        <p>And her successful crew:</p>
        <p className="cinema-crew">{crew}</p>
        <p>The Rebel's flagship was destroyed, throwing their fleet into chaos and ensuring a Federation victory</p>
      </button>
    );
  }
  return (
    <article className="verdict">
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {copy.score ? <p className="verdict-score">SCORE: {score}</p> : null}
      {copy.score && high ? <p className="verdict-high">New High Score!</p> : null}
      <button type="button" className="verdict-stats" onClick={() => setStats(true)}>
        STATS
      </button>
      <div className="verdict-row">
        <button
          type="button"
          onClick={() => verdictRestart(game)}
        >
          RESTART
        </button>
        <button type="button" onClick={() => goTitle("hangar")}>
          HANGAR
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          MAIN MENU
        </button>
        <button type="button" onClick={() => goTitle("title")}>
          QUIT
        </button>
      </div>
    </article>
  );
}

/** Crystal_Store.png: ITEMS, HIRE CREW, REPAIR, WEAPONS. SELL lists fitted weapons and augments. */
export function StoreBoard({ game }: { game: Game }) {
  const stock = game.stock ?? [];
  const items = stock.filter((item) => item.kind === "fuel" || item.kind === "missiles" || item.kind === "parts");
  const weapons = stock.filter((item) => item.kind === "weapon");
  const crew = stock.filter((item) => item.kind === "crew");
  const systems = stock.filter((item) => item.kind === "system");
  const augments = stock.filter((item) => item.kind === "augment");
  const drones = stock.filter((item) => item.kind === "drone");
  const quotes = citedSellQuote(game);
  const priced = (item: (typeof stock)[number]) => (
    <button key={item.id} type="button" onClick={() => act((g) => buy(g, item.id))}>
      <span style={{ minWidth: 0 }}>{item.name}</span>
      <b style={{ flex: "none" }}>{item.cost}</b>
    </button>
  );
  return (
    <div
      className="modal-layer"
      onClick={() => act((g) => leaveStore(g))}
    >
      <section
        className="store-board"
        style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minWidth: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2>SELL</h2>
          {quotes.length ? (
            quotes.map((quote) => (
              <button key={quote.id} type="button" onClick={() => act((g) => citedSell(g, quote.id))}>
                <span style={{ minWidth: 0 }}>{quote.name}</span>
                <b style={{ flex: "none" }}>{quote.scrap}</b>
              </button>
            ))
          ) : (
            <p className="store-note">Nothing fitted sells.</p>
          )}
        </div>
        <div>
          <h2>ITEMS</h2>
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => act((g) => buy(g, item.id))}>
              <span>
                {item.kind === "fuel" ? "Fuel" : item.kind === "missiles" ? "Missiles" : "Drone parts"} ×{item.amount}
              </span>
              <b>{item.cost}</b>
            </button>
          ))}
        </div>
        <div>
          <h2>HIRE CREW</h2>
          {crew.length ? crew.map(priced) : <p className="store-note">No one here is looking for a berth.</p>}
        </div>
        <div>
          <h2>REPAIR</h2>
          <div className="repair-row">
            <button type="button" onClick={() => act((g) => repairHull(g, "one"))}>
              FIX 1
            </button>
            <button type="button" onClick={() => act((g) => repairHull(g, "all"))}>
              FIX ALL
            </button>
            <button type="button" onClick={() => act((g) => repairHull(g, "max"))}>
              MAX
            </button>
          </div>
          <p>
            CURRENT HULL <b>{game.player.hull}</b>
          </p>
        </div>
        <div>
          <h2>WEAPONS</h2>
          <div className="weapon-row">
            {weapons.map((item) => (
              <button key={item.id} type="button" onClick={() => act((g) => buy(g, item.id))}>
                <WeaponArt id={item.ref} height={22} />
                <span>{item.name}</span>
                <b>{item.cost}</b>
              </button>
            ))}
            {weapons.length < 3
              ? Array.from({ length: 3 - weapons.length }, (_, i) => <span key={i} />)
              : null}
          </div>
        </div>
        {systems.length ? (
          <div>
            <h2>SYSTEMS</h2>
            {systems.map(priced)}
          </div>
        ) : null}
        {augments.length ? (
          <div>
            <h2>AUGMENTS</h2>
            {augments.map(priced)}
          </div>
        ) : null}
        {drones.length ? (
          <div>
            <h2>DRONES</h2>
            {drones.map(priced)}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function sectorTone(group: SectorNode["group"]): "civilian" | "hostile" | "nebula" {
  if (group === "nebula") return "nebula";
  if (group === "hostile" || group === "last-stand") return "hostile";
  return "civilian";
}
