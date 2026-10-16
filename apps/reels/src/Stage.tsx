import { useEffect, useMemo, useRef, useState, type RefObject, type SyntheticEvent } from "react";
import type { Take } from "./catalog.ts";
import { scenarioById, scenarios } from "./scenarios.ts";

type Catalog = { takes: Take[] };

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function optionLabel(take: Take): string {
  const bits = [take.label || take.id];
  if (take.sha) bits.push(take.sha.slice(0, 7));
  if (take.dirty) bits.push("dirty");
  if (!take.ok) bits.push("failed");
  return bits.join(" · ");
}

function scenarioFromUrl(): string {
  const id = new URLSearchParams(location.search).get("scenario") ?? "";
  return scenarioById(id)?.id ?? "";
}

export function Stage() {
  const [takes, setTakes] = useState<Take[] | null>(null);
  const [scenarioId, setScenarioId] = useState(scenarioFromUrl);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);
  const scrubbing = useRef(false);
  const toggleRef = useRef<() => void>(() => {});

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/catalog", { signal: controller.signal })
      .then((response) => response.json() as Promise<Catalog>)
      .then((body) => setTakes(body.takes ?? []))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTakes([]);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (scenarioId || !takes) return;
    setScenarioId(takes[0]?.scenario || scenarios[0]?.id || "");
  }, [scenarioId, takes]);

  const mine = useMemo(
    () => (takes ?? []).filter((take) => take.scenario === scenarioId),
    [takes, scenarioId],
  );

  useEffect(() => {
    if (!takes || !scenarioId) return;
    const list = takes.filter((take) => take.scenario === scenarioId);
    setRightId(list[0]?.id ?? "");
    setLeftId(list[1]?.id ?? "");
    setTime(0);
    setDuration(0);
    setPlaying(false);
  }, [scenarioId, takes]);

  function videos(): HTMLVideoElement[] {
    return [leftRef.current, rightRef.current].filter((node): node is HTMLVideoElement => !!node);
  }

  function measure() {
    const lengths = videos()
      .map((video) => video.duration)
      .filter((length) => Number.isFinite(length));
    setDuration(lengths.length ? Math.max(...lengths) : 0);
  }

  toggleRef.current = () => {
    const nodes = videos();
    if (!nodes.length) return;
    if (nodes.some((video) => !video.paused)) {
      for (const video of nodes) video.pause();
      return;
    }
    void Promise.all(nodes.map((video) => video.play()));
  };

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== " " || event.repeat) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      event.preventDefault();
      toggleRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setTime(0);
    for (const video of [leftRef.current, rightRef.current]) {
      if (video) video.currentTime = 0;
    }
  }, [leftId, rightId]);

  function seek(value: number) {
    setTime(value);
    for (const video of videos()) video.currentTime = value;
  }

  function onTime(event: SyntheticEvent<HTMLVideoElement>) {
    if (scrubbing.current) return;
    const source = event.currentTarget;
    const active = [rightRef.current, leftRef.current].find((video) => video && !video.paused && !video.ended);
    const leader = rightRef.current ?? leftRef.current;
    if (active && source !== active) return;
    if (!active && source !== leader) return;
    const next = source.currentTime;
    setTime(next);
    const other = source === rightRef.current ? leftRef.current : rightRef.current;
    if (other && !other.ended && Math.abs(other.currentTime - next) > 0.35) other.currentTime = next;
  }

  function chooseScenario(id: string) {
    const query = new URLSearchParams(location.search);
    query.set("scenario", id);
    history.replaceState(null, "", `?${query}`);
    setScenarioId(id);
  }

  const scenario = scenarioById(scenarioId);
  const left = mine.find((take) => take.id === leftId) ?? null;
  const right = mine.find((take) => take.id === rightId) ?? null;
  const ready = takes !== null && scenarioId !== "";

  return (
    <div className="reels">
      <header className="topbar">
        <h1>REELS</h1>
        <p>Play two takes of the same scenario together and scrub them as one.</p>
      </header>
      <div className="layout">
        <aside className="rail">
          <p className="rail-label">SCENARIOS</p>
          {scenarios.map((item) => {
            const count = (takes ?? []).filter((take) => take.scenario === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                className={item.id === scenarioId ? "scenario is-on" : "scenario"}
                onClick={() => chooseScenario(item.id)}
              >
                <strong>{item.title}</strong>
                <span>
                  {item.summary} {count === 1 ? "1 take." : `${count} takes.`}
                </span>
              </button>
            );
          })}
          <p className="rail-foot">
            Record the selected scenario with{" "}
            <code>pnpm --filter @stl/reels record {scenarioId || "flagship"}</code>. A branch name and
            commit name the take, so a pull request can sit beside master.
          </p>
        </aside>
        <main className="stage">
          {!ready ? <p className="loading">Loading takes.</p> : null}
          {ready && mine.length === 0 ? (
            <p className="empty">
              No {scenario?.title ?? scenarioId} takes yet. Run{" "}
              <code>pnpm --filter @stl/reels record {scenarioId}</code>. Combat is{" "}
              <code>pnpm --filter @stl/reels record combat</code>.
            </p>
          ) : null}
          {ready && mine.length > 0 ? (
            <>
              <div className="transport">
                <button type="button" onClick={() => toggleRef.current()}>
                  {playing ? "Pause" : "Play"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.05}
                  value={Math.min(time, duration || 0)}
                  aria-label="Scrub both takes"
                  onPointerDown={() => {
                    scrubbing.current = true;
                  }}
                  onPointerUp={() => {
                    scrubbing.current = false;
                  }}
                  onChange={(event) => seek(Number(event.target.value))}
                />
                <span className="clock">
                  {formatClock(time)} / {formatClock(duration)}
                </span>
              </div>
              <div className="compare">
                <Pane
                  kicker="Earlier"
                  take={left}
                  takes={mine}
                  selected={leftId}
                  onSelect={setLeftId}
                  videoRef={leftRef}
                  onTime={onTime}
                  onReady={measure}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    if (videos().every((video) => video.paused)) setPlaying(false);
                  }}
                />
                <Pane
                  kicker="Later"
                  take={right}
                  takes={mine}
                  selected={rightId}
                  onSelect={setRightId}
                  videoRef={rightRef}
                  onTime={onTime}
                  onReady={measure}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    if (videos().every((video) => video.paused)) setPlaying(false);
                  }}
                />
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Pane({
  kicker,
  take,
  takes,
  selected,
  onSelect,
  videoRef,
  onTime,
  onReady,
  onPlay,
  onPause,
}: {
  kicker: string;
  take: Take | null;
  takes: Take[];
  selected: string;
  onSelect: (id: string) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  onTime: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onReady: () => void;
  onPlay: () => void;
  onPause: () => void;
}) {
  return (
    <section className="pane">
      <header className="pane-head">
        <span className="pane-kicker">{kicker}</span>
        <select aria-label={`${kicker} take`} value={selected} onChange={(event) => onSelect(event.target.value)}>
          <option value="">None</option>
          {takes.map((item) => (
            <option key={item.id} value={item.id}>
              {optionLabel(item)}
            </option>
          ))}
        </select>
      </header>
      {take ? (
        <>
          <video
            key={`${take.scenario}/${take.id}`}
            ref={videoRef}
            src={take.video}
            preload="metadata"
            playsInline
            onLoadedMetadata={onReady}
            onDurationChange={onReady}
            onTimeUpdate={onTime}
            onPlay={onPlay}
            onPause={onPause}
          />
          <p className="take-meta">
            <span>{take.branch || "no branch"}</span>
            {take.sha ? <span>{take.sha.slice(0, 7)}</span> : null}
            {take.dirty ? <span className="mark">dirty</span> : null}
            {!take.ok ? <span className="mark is-bad">failed</span> : null}
            <span>{formatWhen(take.recordedAt)}</span>
            <span>{formatBytes(take.bytes)}</span>
            {take.replay ? <span>DOM replay saved</span> : null}
          </p>
        </>
      ) : (
        <p className="pane-empty">
          No earlier take. Record this scenario again on the branch you want to compare.
        </p>
      )}
    </section>
  );
}
