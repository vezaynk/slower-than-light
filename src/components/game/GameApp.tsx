import { useEffect, useState } from "react";
import {
  Compass,
  Crosshair,
  DoorOpen,
  Eye,
  Gauge,
  HeartPulse,
  Minus,
  Pause,
  Play,
  Plus,
  Shield,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import { resumeAudio, setMuted, unlockAudio } from "@/game/audio";
import {
  SYS_LABEL,
  WEAPONS,
  upgradeBlurb,
  upgradeCost,
} from "@/game/content";
import { CATALOG } from "@/game/extras/augments";
import { installCell, startCell } from "@/game/extras/cell";
import { kinOf } from "@/game/extras/kin";
import { HULLS } from "@/game/hulls";
import {
  aim,
  armWeapon,
  bars,
  buy,
  canJumpTo,
  choiceDisabled,
  choose,
  commitJump,
  continueReward,
  createGame,
  doorLabel,
  enemySpoolSeconds,
  evasionPercent,
  fireReady,
  ftlSeconds,
  hasSave,
  isMain,
  leaveStore,
  maxBubbles,
  orderCrew,
  patchAll,
  powerDown,
  powerUp,
  saveGame,
  selectCrew,
  sparePower,
  toggleAuto,
  toggleDoor,
  togglePause,
  toggleWeapon,
  upgrade,
  waitHere,
} from "@/game/sim";
import { useGame } from "@/game/store";
import type { Beacon, Game, KitId, SysId } from "@/game/types";
import { ShipView } from "./ShipView";

const ICONS: Record<SysId, typeof Shield> = {
  shields: Shield,
  engines: Gauge,
  oxygen: Wind,
  medbay: HeartPulse,
  weapons: Crosshair,
  pilot: Compass,
  sensors: Eye,
  doors: DoorOpen,
};

const SYS_ORDER: SysId[] = [
  "shields",
  "engines",
  "oxygen",
  "medbay",
  "weapons",
  "pilot",
  "sensors",
  "doors",
];

const KIT_LABEL: Record<KitId, string> = {
  veil: "Cloaking",
  sling: "Teleporter",
  spike: "Hacking",
  swarm: "Drone Control",
  leash: "Mind Control",
  cradle: "Clone Bay",
  cell: "Backup Battery",
  lance: "Artillery Beam",
  flak: "Flak Artillery",
};

function act(fn: (g: Game) => void) {
  unlockAudio();
  useGame.getState().act(fn);
}

export function GameApp() {
  const version = useGame((s) => s.version);
  const game = useGame.getState().game;
  void version;
  const [saveReady, setSaveReady] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setSaveReady(hasSave());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      act((g) => togglePause(g));
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    const w = window as unknown as {
      __ashwake?: { game: () => Game; act: (fn: (g: Game) => void) => void };
    };
    w.__ashwake = {
      game: () => useGame.getState().game,
      act: (fn) => useGame.getState().act(fn),
    };
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let ui = 0;
    let saveAcc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      saveAcc += dt;
      const g = useGame.getState().game;
      const live = g.phase === "combat" && !g.paused;
      let steps = 0;
      while (acc >= 1 / 30 && steps < 4) {
        useGame.getState().tick(1 / 30);
        acc -= 1 / 30;
        steps += 1;
      }
      if (!live) acc = 0;
      if (live && now - ui > 80) {
        ui = now;
        useGame.getState().bump();
      }
      if (saveAcc > 2) {
        saveAcc = 0;
        saveGame(useGame.getState().game);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const shake = reduced ? 0 : game.trauma * game.trauma;
  const ox = shake ? Math.sin(game.time * 40) * 7 * shake : 0;
  const oy = shake ? Math.cos(game.time * 33) * 5 * shake : 0;

  return (
    <div className="deck">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Ashwake</span>
          <span className="brand-sub">{game.phase === "title" ? "Beacon drill" : game.sectorName}</span>
        </div>
        <div className="top-actions">
          {game.phase === "combat" ? (
            <button
              type="button"
              className="icon-btn"
              aria-label={game.paused ? "Resume" : "Pause"}
              aria-pressed={game.paused}
              onClick={() => act((g) => togglePause(g))}
            >
              {game.paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            aria-label={game.muted ? "Unmute" : "Mute"}
            onClick={() =>
              act((g) => {
                g.muted = !g.muted;
                setMuted(g.muted);
              })
            }
          >
            {game.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {game.phase !== "title" ? <ResourceBar game={game} /> : null}

      <div className="stage" style={shake ? { transform: `translate(${ox}px, ${oy}px)` } : undefined}>
        {game.phase === "title" ? <TitleScreen saveReady={saveReady} /> : null}
        {game.phase === "map" || game.picking ? <MapScreen game={game} /> : null}
        {game.phase === "combat" && !game.picking ? <CombatScreen game={game} /> : null}
        {game.phase === "event" && game.event ? <EventScreen game={game} /> : null}
        {game.phase === "store" ? <StoreScreen game={game} /> : null}
        {game.phase === "reward" && game.reward ? (
          <article className="panel card">
            <p className="kicker">Salvage</p>
            <h2>+{game.reward.scrap} scrap</h2>
            {game.reward.note ? <p>{game.reward.note}</p> : <p>The buoy is quiet.</p>}
            <button type="button" className="btn-primary" onClick={() => act((g) => continueReward(g))}>
              Back to the chart
            </button>
          </article>
        ) : null}
        {game.phase === "victory" || game.phase === "defeat" ? <EndScreen game={game} /> : null}
      </div>

      {game.manual ? <Manual onClose={() => act((g) => { g.manual = false; })} /> : null}
      {game.shipSheet ? <ShipSheet game={game} /> : null}
    </div>
  );
}

function ResourceBar({ game }: { game: Game }) {
  const evade = evasionPercent(game, game.player, "player");
  const bubbles = game.player.shieldNow;
  const cap = maxBubbles(game.player);
  return (
    <div className="resources">
      <div className="hull-readout">
        <span>Hull {game.player.hull}</span>
        <div className="hull-track">
          <span style={{ width: `${(game.player.hull / game.player.hullMax) * 100}%` }} />
        </div>
      </div>
      <span>Scrap {game.scrap}</span>
      <span>Fuel {game.fuel}</span>
      <span>Missiles {game.missiles}</span>
      <span>Evade {evade}%</span>
      <span className="pips" aria-label={`${bubbles} shields`}>
        {Array.from({ length: Math.max(cap, bubbles, 1) }, (_, i) => (
          <i key={i} className={i < bubbles ? "on" : ""} />
        ))}
      </span>
    </div>
  );
}

function TitleScreen({ saveReady }: { saveReady: boolean }) {
  const [hangar, setHangar] = useState(false);
  if (hangar) return <Hangar onBack={() => setHangar(false)} />;
  return (
    <section className="title">
      <p className="kicker">Courier drill</p>
      <h1>Ashwake</h1>
      <p className="lede">Keep the air in. Spend the shots. Stay ahead of the fleet.</p>
      <div className="title-ship" aria-hidden="true">
        <span>Engines</span>
        <span>Shields</span>
        <span>Oxygen</span>
        <span>Medbay</span>
        <span>Pilot</span>
        <span>Doors</span>
        <span>Sensors</span>
        <span>Weapons</span>
      </div>
      <div className="title-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            unlockAudio();
            setHangar(true);
          }}
        >
          Cast off
        </button>
        {saveReady ? (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              unlockAudio();
              useGame.getState().continueRun();
            }}
          >
            Continue
          </button>
        ) : null}
        <button type="button" className="btn-ghost" onClick={() => act((g) => { g.manual = true; })}>
          Ship manual
        </button>
      </div>
      <p className="fine">An original drill. Not affiliated with Subset Games.</p>
    </section>
  );
}

function HullMark({ cruiser }: { cruiser: string }) {
  const kind = cruiser.startsWith("Engi")
    ? "ring"
    : cruiser.startsWith("Federation") || cruiser.startsWith("Rock")
      ? "block"
      : cruiser.startsWith("Zoltan")
        ? "diamond"
        : cruiser.startsWith("Slug")
          ? "wave"
          : cruiser.startsWith("Stealth")
            ? "thin"
            : "bar";
  return (
    <svg className="hull-mark" viewBox="0 0 64 36" aria-hidden="true">
      {kind === "ring" ? (
        <circle cx="32" cy="18" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
      ) : null}
      {kind === "block" ? <rect x="14" y="8" width="36" height="20" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "bar" ? <path d="M8 18h34l8-8v16l-8-8H8z" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "diamond" ? <path d="M32 4l14 14-14 14L18 18z" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "wave" ? <path d="M6 18h8l4-8 4 16 4-16 4 16 4-8h16" fill="none" stroke="currentColor" strokeWidth="3" /> : null}
      {kind === "thin" ? <path d="M4 16h56v4H4z" fill="currentColor" /> : null}
    </svg>
  );
}

function Hangar({ onBack }: { onBack: () => void }) {
  const [pick, setPick] = useState(HULLS[0]?.id ?? "kestrel-a");
  const hull = HULLS.find((h) => h.id === pick) ?? HULLS[0];
  if (!hull) return null;
  const guns = hull.weapons.map((id) => WEAPONS[id]?.name ?? id);
  const crew = hull.crew.map((c) => kinOf(c.kin).name);
  return (
    <section className="hangar">
      <p className="kicker">Hangar</p>
      <h1>Choose a ship</h1>
      <p className="lede">
        Loadouts are the cruiser pages. The marks are original. The wiki pictures are not in this build.
      </p>
      <div className="hull-list">
        {HULLS.map((h) => (
          <button
            key={h.id}
            type="button"
            className={h.id === hull.id ? "is-on" : ""}
            onClick={() => setPick(h.id)}
          >
            <HullMark cruiser={h.cruiser} />
            <span>
              <strong>{h.name}</strong>
              <em>
                {h.cruiser} {h.layout}
              </em>
            </span>
          </button>
        ))}
      </div>
      <article className="card hull-card">
        <p>{hull.quote}</p>
        <p>
          Reactor {hull.reactor}. Fuel {hull.fuel}. Missiles {hull.missiles}. Drone parts {hull.parts}.
        </p>
        <p>Crew: {crew.join(", ") || "none"}.</p>
        <p>Weapons: {guns.join(", ") || "none"}.</p>
        <p className="fine">{hull.unlock}</p>
        {hull.unfitted.length ? <p className="fine">On the page, not fitted here: {hull.unfitted.join(", ")}.</p> : null}
        <p className="fine">
          Room tiles are the shared grid. {hull.source} does not list coordinates.
        </p>
      </article>
      <div className="title-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            unlockAudio();
            useGame.getState().newRun(hull.id);
          }}
        >
          Launch {hull.name}
        </button>
        <button type="button" className="btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  );
}

function beaconPos(b: Beacon) {
  return { x: b.col * 76 + 8, y: b.row * 64 + 12 };
}

function MapScreen({ game }: { game: Game }) {
  const maxCol = game.beacons.reduce((m, b) => Math.max(m, b.col), 0);
  const here = game.beacons.find((b) => b.id === game.here);
  return (
    <section className="map-wrap">
      <div className="map-head">
        <div>
          <p className="kicker">Sector {game.sector} of 8</p>
          <h2>{game.sectorName}</h2>
        </div>
        <div className="map-actions">
          <button type="button" className="btn-ghost" onClick={() => act((g) => { g.shipSheet = true; })}>
            Ship
          </button>
          {game.phase === "map" ? (
            <button type="button" className="btn-ghost" onClick={() => act((g) => waitHere(g))}>
              Wait
            </button>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => act((g) => { g.picking = false; })}>
              Close chart
            </button>
          )}
        </div>
      </div>
      {game.hint && game.phase === "map" ? (
        <p className="banner">
          {game.sector >= 8
            ? "The Flagship sits on a beacon and jumps every two of yours. Land on it, or let it land on you."
            : "One fuel a jump. The fleet creeps in from the left. Reach the lane out before it swallows you."}
          <button type="button" onClick={() => act((g) => { g.hint = false; })}>
            Got it
          </button>
        </p>
      ) : null}
      <div className="map-scroll">
        <div className="map" style={{ width: `${(maxCol + 1) * 76 + 36}px` }}>
          <div className="fleet" style={{ width: `${Math.max(0, game.fleet) * 76}px` }}>
            <span>The fleet</span>
          </div>
          <svg className="links">
            {game.beacons.flatMap((b) =>
              b.links
                .filter((id) => id > b.id)
                .map((id) => {
                  const other = game.beacons.find((n) => n.id === id);
                  if (!other) return null;
                  const p = beaconPos(b);
                  const q = beaconPos(other);
                  return (
                    <line key={`${b.id}-${id}`} x1={p.x + 37} y1={p.y + 28} x2={q.x + 37} y2={q.y + 28} />
                  );
                }),
            )}
          </svg>
          {game.beacons.map((b) => {
            const pos = beaconPos(b);
            const linked = here?.links.includes(b.id) ?? false;
            const swallowed = b.col < game.fleet && b.id !== game.here;
            return (
              <button
                key={b.id}
                type="button"
                className={`beacon${b.id === game.here ? " is-here" : ""}${linked ? " is-linked" : ""}${swallowed ? " is-over" : ""}`}
                style={{ left: pos.x, top: pos.y }}
                disabled={!linked || (game.phase === "combat" && game.flee < 1)}
                onClick={() => act((g) => commitJump(g, b.id))}
              >
                <strong>{b.name}</strong>
                <em>{b.kind}</em>
              </button>
            );
          })}
        </div>
      </div>
      <p className="log-line">{game.log[0]}</p>
    </section>
  );
}

function CombatScreen({ game }: { game: Game }) {
  const spool = ftlSeconds(game, game.player);
  const foeSpool = enemySpoolSeconds(game);
  const crew = game.crew.filter((c) => c.side === "player" && c.hp > 0);
  return (
    <section className="combat">
      <div className="fight-head">
        <div>
          <p className="kicker">{game.enemy?.name ?? "Contact"}</p>
          <p className="mini">
            Their jump {foeSpool == null ? "—" : `${Math.round(game.enemyFlee * foeSpool)}s`}
          </p>
        </div>
        <div className="map-actions">
          <button type="button" className="btn-ghost" onClick={() => act((g) => { g.shipSheet = true; })}>
            Ship
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={game.flee < 1}
            onClick={() => act((g) => { g.picking = true; })}
          >
            {game.flee < 1 ? `FTL ${Math.round(game.flee * 100)}%` : "Jump"}
          </button>
        </div>
      </div>
      {game.tutorial ? (
        <p className="banner">Arm a weapon, then tap their room. Space pauses.</p>
      ) : null}
      <div className="ship-slot foe-slot">
        {game.enemy ? (
          <ShipView
            ship={game.enemy}
            crew={game.crew}
            aboard="enemy"
            showCrew
            selectedId={null}
            ventMode={false}
            targetable
            onRoom={(id) => act((g) => aim(g, id))}
            onCrew={() => undefined}
          />
        ) : null}
      </div>
      <div className="bolts" aria-hidden="true">
        {game.shots.map((s) => (
          <i key={s.id} className={`bolt bolt-${s.kind}`} />
        ))}
      </div>
      <div className="ship-slot">
        <ShipView
          ship={game.player}
          crew={game.crew}
          aboard="player"
          showCrew
          selectedId={game.selected}
          ventMode={game.mode === "vent"}
          targetable={false}
          onRoom={(id) => {
            if (game.selected) act((g) => orderCrew(g, game.selected!, id));
          }}
          onCrew={(id) => act((g) => selectCrew(g, id))}
        />
      </div>
      {game.mode === "vent" ? (
        <div className="door-list">
          {game.player.doors.map((d) => (
            <button key={`${d.a}-${d.b}`} type="button" onClick={() => act((g) => toggleDoor(g, d.a, d.b))}>
              {doorLabel(game.player, d)}
              <em>{d.open ? "Open" : "Shut"}</em>
            </button>
          ))}
        </div>
      ) : null}
      <div className="weapon-bar">
        <div className="gun-row">
          {game.player.weapons.map((w) => {
            const def = WEAPONS[w.defId];
            return (
              <button
                key={w.uid}
                type="button"
                className={`gun${w.enabled ? "" : " is-off"}${game.armed === w.uid ? " is-armed" : ""}`}
                onClick={() => act((g) => armWeapon(g, w.uid))}
              >
                <span className="gun-top">
                  <strong className="gun-name">{def?.name ?? w.defId}</strong>
                </span>
                <span className="charge">
                  <span style={{ width: `${Math.round(w.charge * 100)}%` }} />
                </span>
                <span className="gun-meta">{def ? `${def.power} power` : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="fire-row">
          <button type="button" className="btn-primary" onClick={() => act((g) => fireReady(g))}>
            Fire
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const uid = game.armed ?? game.player.weapons[0]?.uid;
              if (uid) act((g) => toggleAuto(g, uid));
            }}
          >
            Autofire
          </button>
          <button
            type="button"
            className="btn-ghost"
            aria-pressed={game.mode === "vent"}
            onClick={() => act((g) => { g.mode = g.mode === "vent" ? "crew" : "vent"; })}
          >
            Doors
          </button>
        </div>
      </div>
      <div className="crew-line">
        {crew.map((c) => (
          <button key={c.id} type="button" onClick={() => act((g) => selectCrew(g, c.id))}>
            <i className={`token tone-${c.tone} ${c.id === game.selected ? "is-selected" : ""}`}>{c.name.slice(0, 1)}</i>
            <span>
              {c.name}
              <em>
                {kinOf(c.kin ?? "plain").name} {c.hp}
              </em>
            </span>
          </button>
        ))}
      </div>
      <p className="log-line">{game.log[0]}</p>
      <p className="fine">
        {spool == null ? "FTL needs a pilot or engines." : `FTL ${Math.round(spool)}s at this engine power.`}
      </p>
    </section>
  );
}

function EventScreen({ game }: { game: Game }) {
  const event = game.event;
  if (!event) return null;
  return (
    <article className="panel card">
      <p className="kicker">Beacon</p>
      <h2>{event.title}</h2>
      <p>{event.body}</p>
      <div className="stack">
        {event.choices.map((c) => {
          const why = choiceDisabled(game, c.id);
          return (
            <button key={c.id} type="button" className="btn-ghost" disabled={!!why} onClick={() => act((g) => choose(g, c.id))}>
              {c.label}
              {why ? ` (${why})` : ""}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function StoreScreen({ game }: { game: Game }) {
  return (
    <section className="panel">
      <p className="kicker">Store</p>
      <h2>Scrap {game.scrap}</h2>
      <div className="stack">
        {(game.stock ?? []).map((item) => (
          <button key={item.id} type="button" className="shop" onClick={() => act((g) => buy(g, item.id))}>
            <span>
              <strong>{item.name}</strong>
              <em>{item.detail}</em>
            </span>
            <b>{item.cost}</b>
          </button>
        ))}
        <button type="button" className="btn-primary" onClick={() => act((g) => leaveStore(g))}>
          Leave
        </button>
      </div>
    </section>
  );
}

function EndScreen({ game }: { game: Game }) {
  const won = game.phase === "victory";
  return (
    <article className="panel card">
      <h2>{won ? "You are through" : `${game.player.name} is gone`}</h2>
      <p>{game.outcome || game.log[0]}</p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          const next = createGame();
          next.phase = "title";
          useGame.setState((s) => ({ game: next, version: s.version + 1 }));
        }}
      >
        Back to the hangar
      </button>
    </article>
  );
}

function Manual({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay">
      <article className="sheet manual">
        <p className="kicker">Manual</p>
        <div className="manual-body">
          <h3>Getting out</h3>
          <ul>
            <li>Fuel starts at 16. Every jump, including a retreat, burns 1. A store sells fuel. Scrap starts at 10.</li>
            <li>The hangar launches the cruiser layouts whose wiki pages listed a loadout. Pictures from those pages are not used.</li>
            <li>Sector 8 is the Flagship. It moves every two of your jumps.</li>
          </ul>
        </div>
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      </article>
    </div>
  );
}

function ShipSheet({ game }: { game: Game }) {
  const free = sparePower(game.player);
  return (
    <div className="overlay">
      <article className="sheet">
        <p className="kicker">{game.player.name}</p>
        <p className="mini">Power {free} free</p>
        <button type="button" className="btn-ghost" onClick={() => act((g) => { g.shipSheet = false; })}>
          Close
        </button>
        <div className="crew-line">
          {game.crew
            .filter((c) => c.side === "player" && c.hp > 0)
            .map((c) => (
              <span key={c.id}>
                <i className={`token tone-${c.tone}`}>{c.name.slice(0, 1)}</i>
                {c.name} {c.hp} hp
              </span>
            ))}
        </div>
        <button type="button" className="btn-ghost" onClick={() => act((g) => patchAll(g))}>
          Patch hull ({upgradeCost("shields", 1) ? "2 scrap a point" : "scrap"})
        </button>
        <div className="systems">
          <PowerRow
            name={`Reactor · ${game.player.reactor}`}
            blurb="One more bar in the pool."
            level={game.player.reactor}
            power={game.player.reactor}
            max={game.player.reactor}
            cost={upgradeCost("reactor", game.player.reactor)}
            onUp={() => act((g) => upgrade(g, "reactor"))}
            onDown={null}
            onPlus={null}
          />
          {SYS_ORDER.map((id) => {
            const sys = game.player.systems[id];
            const Icon = ICONS[id];
            const cost = upgradeCost(id, sys.level);
            return (
              <PowerRow
                key={id}
                name={`${SYS_LABEL[id]} · ${sys.level}`}
                blurb={upgradeBlurb(id, sys.level)}
                level={sys.level}
                power={isMain(id) ? sys.power : sys.level}
                max={Math.max(0, sys.level - sys.damage - sys.ion.length)}
                cost={cost}
                icon={Icon}
                onUp={cost != null ? () => act((g) => upgrade(g, id)) : null}
                onDown={isMain(id) ? () => act((g) => powerDown(g, id)) : null}
                onPlus={isMain(id) ? () => act((g) => powerUp(g, id)) : null}
              />
            );
          })}
        </div>
        <div className="systems">
          {(Object.keys(KIT_LABEL) as KitId[]).map((id) => {
            const kit = game.player.kits[id];
            if (!kit) return null;
            return (
              <p key={id} className="power-row">
                <span className="power-name">
                  {KIT_LABEL[id]} · {kit.level}
                </span>
                <span className="mini">{kit.power > 0 ? `${kit.power} power` : "unpowered"}</span>
              </p>
            );
          })}
          {game.augments.map((id) => (
            <p key={id} className="mini">
              {CATALOG.find((row) => row.id === id)?.name ?? id}
            </p>
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={() => act((g) => installCell(g))}>
          Buy Backup Battery
        </button>
        <button type="button" className="btn-ghost" onClick={() => act((g) => startCell(g))}>
          Start battery
        </button>
      </article>
    </div>
  );
}

function PowerRow({
  name,
  blurb,
  power,
  max,
  cost,
  onUp,
  onDown,
  onPlus,
}: {
  name: string;
  blurb: string;
  level: number;
  power: number;
  max: number;
  cost: number | null;
  icon?: typeof Shield;
  onUp: (() => void) | null;
  onDown: (() => void) | null;
  onPlus: (() => void) | null;
}) {
  return (
    <div className="power-row">
      <span className="power-name">{name}</span>
      <span className="bars" aria-hidden="true">
        {Array.from({ length: Math.max(max, power, 1) }, (_, i) => (
          <i key={i} className={i < power ? "on" : ""} />
        ))}
      </span>
      <span className="mini">{blurb}</span>
      <span className="mode-row">
        {onDown ? (
          <button type="button" className="icon-btn" aria-label={`Less ${name}`} onClick={onDown}>
            <Minus size={14} />
          </button>
        ) : null}
        {onPlus ? (
          <button type="button" className="icon-btn" aria-label={`More ${name}`} onClick={onPlus}>
            <Plus size={14} />
          </button>
        ) : null}
        {onUp ? (
          <button type="button" className="text-btn" onClick={onUp}>
            {cost}
          </button>
        ) : null}
      </span>
    </div>
  );
}
