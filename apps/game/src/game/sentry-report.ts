/**
 * How a play-log entry goes to Sentry (sentry.ts), kept free of the SDK so tests can check it.
 *
 * - An entry with a real Error object goes as that exception: its stack is the code that failed.
 * - Anything else (console text, a pack warning) goes as a message at its own level. A synthetic Error would carry
 *   sentry.ts as its stack and, being an exception, would make Replay flush a session recording.
 * - Every report is grouped by source and message, so one pack warning is one issue however often it repeats.
 */
import type { LogEntry } from "./play-log.ts";

export type SentryReport =
  | { kind: "exception"; level: "error" | "warning"; fingerprint: string[] }
  | { kind: "message"; level: "error" | "warning"; message: string; fingerprint: string[] };

/** Sources Sentry's own global handlers already capture. */
const SENTRY_SEES = new Set<string>(["uncaught", "promise"]);

export function sentryReport(entry: LogEntry, error: Error | undefined): SentryReport | null {
  if (SENTRY_SEES.has(entry.source)) return null;
  const level = entry.level === "error" ? "error" : "warning";
  const fingerprint = [entry.source, entry.message];
  if (error) return { kind: "exception", level, fingerprint };
  return { kind: "message", level, message: entry.message, fingerprint };
}

/**
 * Replay's error sampling (replaysOnErrorSampleRate) runs for every event it sees, whatever its level. A warning is
 * not worth a session recording: every ftl.dat load raises one.
 */
export function replayOnEvent(event: { level?: string }): boolean {
  return event.level !== "warning";
}
