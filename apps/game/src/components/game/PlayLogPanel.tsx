/**
 * Options › Log: the errors and warnings met in play (game/play-log.ts), newest first. Opening it marks them seen,
 * which clears the count on the wrench. Copy puts the whole log on the clipboard as text for a bug report.
 */
import { useEffect, useState } from "react";
import {
  clearPlayLog,
  markPlayLogSeen,
  playLogText,
  usePlayLog,
  type LogLevel,
} from "@/game/play-log";

type Filter = "all" | LogLevel;

function clock(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function PlayLogPanel() {
  const entries = usePlayLog((s) => s.entries);
  const [seenAt] = useState(() => usePlayLog.getState().seenAt);
  const [filter, setFilter] = useState<Filter>("all");
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  useEffect(() => {
    markPlayLogSeen();
    return () => markPlayLogSeen();
  }, []);
  const errors = entries.filter((e) => e.level === "error").length;
  const warns = entries.length - errors;
  const shown = entries
    .filter((e) => filter === "all" || e.level === filter)
    .slice()
    .reverse();
  async function copy() {
    try {
      await navigator.clipboard.writeText(playLogText(entries));
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }
  return (
    <div className="play-log">
      <div className="play-log-bar">
        <div className="play-log-filters" role="group" aria-label={"Show"}>
          {(
            [
              ["all", `All ${entries.length}`],
              ["error", `Errors ${errors}`],
              ["warn", `Warnings ${warns}`],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`gf-button${filter === id ? " is-on" : ""}`}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="play-log-actions">
          <button
            type="button"
            className="gf-button"
            disabled={entries.length === 0}
            onClick={() => void copy()}
          >
            {copied === "ok" ? "Copied" : copied === "fail" ? "Copy failed" : "Copy log"}
          </button>
          <button
            type="button"
            className="gf-button"
            disabled={entries.length === 0}
            onClick={() => {
              clearPlayLog();
              setCopied("");
            }}
          >
            {"Clear"}
          </button>
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="play-log-empty">
          {entries.length === 0
            ? "No errors or warnings yet. Anything the game reports while you play shows here."
            : "Nothing of this kind."}
        </p>
      ) : (
        <ol className="play-log-list">
          {shown.map((entry) => (
            <li
              key={entry.key}
              className={`play-log-row is-${entry.level}${entry.last > seenAt ? " is-new" : ""}`}
            >
              <div className="play-log-head">
                <b>{entry.level === "error" ? "ERROR" : "WARN"}</b>
                <span>{entry.source}</span>
                <span>{clock(entry.first)}</span>
                {entry.count > 1 ? (
                  <span>{`×${entry.count}, last ${clock(entry.last)}`}</span>
                ) : null}
              </div>
              <p className="play-log-msg">{entry.message}</p>
              {entry.where ? <p className="play-log-where">{entry.where}</p> : null}
              {entry.stack ? (
                <details>
                  <summary>{"Stack"}</summary>
                  <pre>{entry.stack}</pre>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
