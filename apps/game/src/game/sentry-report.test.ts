import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogEntry } from "./play-log.ts";
import { replayOnEvent, sentryReport } from "./sentry-report.ts";

function entry(level: LogEntry["level"], source: LogEntry["source"], message: string): LogEntry {
  return {
    key: `${level}|${source}|${message}`,
    level,
    source,
    message,
    where: "",
    first: 0,
    last: 0,
    count: 1,
  };
}

describe("sentryReport", () => {
  it("sends a pack warning as a warning message, grouped by its text, not as an exception", () => {
    assert.deepEqual(sentryReport(entry("warn", "pack", '<status> system "engine"'), undefined), {
      kind: "message",
      level: "warning",
      message: '<status> system "engine"',
      fingerprint: ["pack", '<status> system "engine"'],
    });
  });

  it("sends console text as a message and a real Error as its own exception", () => {
    assert.equal(sentryReport(entry("error", "console", "boom"), undefined)?.kind, "message");
    const report = sentryReport(entry("error", "console", "boom"), new Error("boom"));
    assert.deepEqual(report, {
      kind: "exception",
      level: "error",
      fingerprint: ["console", "boom"],
    });
  });

  it("leaves uncaught errors and rejections to Sentry's own handlers", () => {
    assert.equal(sentryReport(entry("error", "uncaught", "x"), new Error("x")), null);
    assert.equal(sentryReport(entry("error", "promise", "x"), undefined), null);
  });

  it("starts an error replay for errors only, never for a warning", () => {
    assert.equal(replayOnEvent({ level: "warning" }), false);
    assert.equal(replayOnEvent({ level: "error" }), true);
    assert.equal(replayOnEvent({}), true);
  });
});
