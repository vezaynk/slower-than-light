/**
 * Per the user: every error and warning met while playing, kept so they can be hunted down afterwards.
 * Sources: console.error and console.warn, uncaught errors, unhandled promise rejections, and pack data warnings
 * (@stl/pack warnPack). Each entry notes where in the run it happened. The log stays on this device, in
 * localStorage, so a reload or a crash does not lose it. Options › Log shows it and copies it out.
 */
import { onPackWarning } from "@stl/pack";
import { create } from "zustand";

export type LogLevel = "error" | "warn";
export type LogSource = "console" | "uncaught" | "promise" | "pack";

export type LogEntry = {
  /** Level, source, and message: a repeat bumps `count` instead of adding a row. */
  key: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  stack?: string;
  /** Where the run was the first time, e.g. "combat · sector 2 (Civilian) · beacon b7 · seed 123". */
  where: string;
  first: number;
  last: number;
  count: number;
};

type LogState = {
  entries: LogEntry[];
  /** Entries whose `last` is after this were not seen in the Log tab yet. */
  seenAt: number;
};

const STORE_KEY = "stl-play-log";
/** The oldest rows go first past this. Repeats do not count against it. */
export const LOG_CAP = 300;
const MESSAGE_CAP = 2000;
const STACK_CAP = 4000;

function readStored(): LogState {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LogState>;
      if (Array.isArray(parsed.entries)) {
        return { entries: parsed.entries.slice(-LOG_CAP), seenAt: Number(parsed.seenAt) || 0 };
      }
    }
  } catch {
    // A blocked or corrupt store starts a fresh log.
  }
  return { entries: [], seenAt: 0 };
}

export const usePlayLog = create<LogState>(() => readStored());

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveSoon(): void {
  if (saveTimer || typeof localStorage === "undefined") return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(usePlayLog.getState()));
    } catch {
      // Storage full or blocked: the log still shows for this session.
    }
  }, 250);
}

let whereNow: () => string = () => "";

/** The game names where the run is (GameApp). Kept as a callback so this module does not import the store. */
export function setLogWhere(read: () => string): void {
  whereNow = read;
}

/** Called for every sighting, repeats included, e.g. to forward it to Sentry (sentry.ts). */
export type LogReporter = (entry: LogEntry, error: Error | undefined) => void;
let reporter: LogReporter | null = null;

export function setLogReporter(next: LogReporter | null): void {
  reporter = next;
}

/** Where the run is now, as the play log writes it. */
export function logWhereNow(): string {
  return safeWhere();
}

function safeWhere(): string {
  try {
    return whereNow();
  } catch {
    return "";
  }
}

/** Adds one row, or bumps the count of the same message. Exported for tests and for code with its own catch. */
export function logProblem(
  level: LogLevel,
  source: LogSource,
  message: string,
  stack?: string,
  now = Date.now(),
  error?: Error,
): void {
  const text = message.length > MESSAGE_CAP ? `${message.slice(0, MESSAGE_CAP)}…` : message;
  const key = `${level}|${source}|${text}`;
  const { entries } = usePlayLog.getState();
  const at = entries.findIndex((entry) => entry.key === key);
  let next: LogEntry[];
  if (at >= 0) {
    const old = entries[at]!;
    next = entries.slice();
    next[at] = { ...old, count: old.count + 1, last: now };
  } else {
    const row: LogEntry = {
      key,
      level,
      source,
      message: text,
      where: safeWhere(),
      first: now,
      last: now,
      count: 1,
    };
    if (stack) row.stack = stack.length > STACK_CAP ? `${stack.slice(0, STACK_CAP)}…` : stack;
    next = [...entries, row].slice(-LOG_CAP);
  }
  usePlayLog.setState({ entries: next });
  saveSoon();
  try {
    reporter?.(next[at >= 0 ? at : next.length - 1]!, error);
  } catch {
    // A reporter that throws must not take the log down with it.
  }
}

export function clearPlayLog(): void {
  usePlayLog.setState({ entries: [], seenAt: Date.now() });
  saveSoon();
}

export function markPlayLogSeen(now = Date.now()): void {
  usePlayLog.setState({ seenAt: now });
  saveSoon();
}

/** Rows the player has not looked at yet, by level. */
export function unseenCounts(state: LogState): { error: number; warn: number } {
  let error = 0;
  let warn = 0;
  for (const entry of state.entries) {
    if (entry.last <= state.seenAt) continue;
    if (entry.level === "error") error += 1;
    else warn += 1;
  }
  return { error, warn };
}

/** Plain text for a bug report: one block per row, newest last. */
export function playLogText(entries: readonly LogEntry[]): string {
  const lines = [
    `Slower Than Light play log, ${new Date().toISOString()}`,
    typeof navigator !== "undefined" ? navigator.userAgent : "",
    "",
  ];
  for (const entry of entries) {
    const times = entry.count > 1 ? ` ×${entry.count}` : "";
    lines.push(
      `[${entry.level.toUpperCase()} ${entry.source}${times}] ${new Date(entry.first).toISOString()}`,
    );
    if (entry.where) lines.push(`  at ${entry.where}`);
    lines.push(`  ${entry.message}`);
    if (entry.stack) lines.push(...entry.stack.split("\n").map((line) => `    ${line.trim()}`));
    lines.push("");
  }
  return lines.join("\n");
}

function describe(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "string") return value;
  try {
    // JSON.stringify gives undefined, not a string, for undefined, a function, or a symbol.
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** console.error("x %s", y) and friends: substitute the format, then join the rest. */
function consoleText(args: readonly unknown[]): string {
  if (args.length === 0) return "";
  const [head, ...rest] = args;
  if (typeof head !== "string") return args.map(describe).join(" ");
  let i = 0;
  const filled = head.replace(/%[sdifoOc]/g, (token) => {
    if (i >= rest.length) return token;
    const value = rest[i++];
    return token === "%c" ? "" : describe(value);
  });
  return [filled, ...rest.slice(i).map(describe)].join(" ").trim();
}

/** "A resource failed to load", naming the element and its address when the target is one. */
function resourceFailure(target: EventTarget | null): string {
  if (!target || target === (globalThis as { window?: unknown }).window) return "Unknown error";
  const el = target as { tagName?: string; src?: string; href?: string };
  const url = el.src || el.href;
  const tag = el.tagName?.toLowerCase();
  return `A resource failed to load${tag ? ` (<${tag}>` + (url ? ` ${url})` : ")") : ""}`;
}

let installed = false;

/** Starts capturing. Safe to call more than once; the console still prints everything. */
export function installPlayLog(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = { error: console.error.bind(console), warn: console.warn.bind(console) };
  for (const level of ["error", "warn"] as const) {
    console[level] = (...args: unknown[]) => {
      original[level](...args);
      const error = args.find((arg): arg is Error => arg instanceof Error);
      logProblem(level, "console", consoleText(args), error?.stack, Date.now(), error);
    };
  }
  // Capture phase: a failed <img>/<script>/<link> load fires `error` on the element and does not bubble, so only a
  // capturing listener on window sees it.
  window.addEventListener(
    "error",
    (event) => {
      const error = event.error instanceof Error ? event.error : undefined;
      const message = error?.message || event.message || resourceFailure(event.target);
      const place = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : "";
      logProblem("error", "uncaught", `${message}${place}`, error?.stack, Date.now(), error);
    },
    true,
  );
  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    const error = reason instanceof Error ? reason : undefined;
    logProblem("error", "promise", describe(reason), error?.stack, Date.now(), error);
  });
  onPackWarning((message) => {
    original.warn(`[pack] ${message}`);
    logProblem("warn", "pack", message);
  });
}
