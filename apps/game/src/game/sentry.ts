/**
 * Per the user: Sentry collects the errors and warnings met in play from every device (the knyz-inc
 * "slower-than-light" project). GameApp starts it before the game renders.
 *
 * Uncaught errors and unhandled rejections reach Sentry through its own global handlers. The play log
 * (play-log.ts) forwards what those handlers do not see: console errors and warnings, and pack data warnings,
 * once per distinct message per page load, as sentry-report.ts decides. Every event carries where the run was (the play log's `where`).
 */
import * as Sentry from "@sentry/react";
import { logWhereNow, setLogReporter, type LogEntry } from "./play-log.ts";
import { replayOnEvent, sentryReport } from "./sentry-report.ts";

/** The project's public client key. It only lets a client send events, so it can ship in the bundle. */
const DEFAULT_DSN =
  "https://1c0d4e124000363aea0121150d690177@o4512388088201216.ingest.us.sentry.io/4512388113760256";

const env = import.meta.env ?? {};
/** VITE_SENTRY_DSN overrides the key; an empty value turns Sentry off. */
const dsn: string = env.VITE_SENTRY_DSN ?? DEFAULT_DSN;
const dev = !!env.DEV;

/** The native shell (Capacitor) when the web app runs inside the Android or iOS build, else "web". */
function shell(): string {
  const cap = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  try {
    return cap?.getPlatform?.() ?? "web";
  } catch {
    return "web";
  }
}

const sent = new Set<string>();

function forward(entry: LogEntry, error: Error | undefined): void {
  if (sent.has(entry.key)) return;
  const report = sentryReport(entry, error);
  if (!report) return;
  sent.add(entry.key);
  Sentry.withScope((scope) => {
    scope.setLevel(report.level);
    scope.setTag("log.source", entry.source);
    if (report.kind === "exception") {
      Sentry.captureException(error);
      return;
    }
    scope.setFingerprint(report.fingerprint);
    Sentry.captureMessage(report.message, report.level);
  });
}

let started = false;

export function startSentry(): void {
  if (started || typeof window === "undefined" || !dsn) return;
  started = true;
  Sentry.init({
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT || (dev ? "development" : "production"),
    // Set by the deploy build (pages.yml) to the commit, so an issue names the build that raised it.
    release: env.VITE_SENTRY_RELEASE || undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      // A warning does not start an error replay (sentry-report.ts replayOnEvent).
      Sentry.replayIntegration({ beforeErrorSampling: replayOnEvent }),
    ],
    // Every trace while developing; a fifth of sessions in production.
    tracesSampleRate: dev ? 1.0 : 0.2,
    // The game calls no API of its own, so no request needs trace headers.
    tracePropagationTargets: [],
    // Replays for a tenth of sessions, and for every session that hits an error.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      const where = logWhereNow();
      if (where) event.contexts = { ...event.contexts, run: { where } };
      return event;
    },
  });
  Sentry.setTag("shell", shell());
  setLogReporter(forward);
}
