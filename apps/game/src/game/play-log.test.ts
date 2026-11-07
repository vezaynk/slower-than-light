import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  LOG_CAP,
  clearPlayLog,
  logProblem,
  markPlayLogSeen,
  playLogText,
  setLogWhere,
  unseenCounts,
  usePlayLog,
} from "./play-log.ts";

describe("play log", () => {
  beforeEach(() => {
    clearPlayLog();
    usePlayLog.setState({ seenAt: 0 });
    setLogWhere(() => "combat · sector 2");
  });

  it("counts a repeat on the first row instead of adding one", () => {
    logProblem("warn", "pack", "unknown weapon X", undefined, 10);
    logProblem("warn", "pack", "unknown weapon X", undefined, 20);
    logProblem("error", "uncaught", "boom", "at f()", 30);
    const { entries } = usePlayLog.getState();
    assert.equal(entries.length, 2);
    assert.equal(entries[0]!.count, 2);
    assert.equal(entries[0]!.first, 10);
    assert.equal(entries[0]!.last, 20);
    assert.equal(entries[0]!.where, "combat · sector 2");
    assert.equal(entries[1]!.stack, "at f()");
  });

  it("counts what was not seen yet, by level", () => {
    logProblem("warn", "console", "a", undefined, 10);
    logProblem("error", "console", "b", undefined, 20);
    markPlayLogSeen(15);
    assert.deepEqual(unseenCounts(usePlayLog.getState()), { error: 1, warn: 0 });
    logProblem("warn", "console", "a", undefined, 30);
    assert.deepEqual(unseenCounts(usePlayLog.getState()), { error: 1, warn: 1 });
  });

  it("keeps the newest rows past the cap", () => {
    for (let i = 0; i < LOG_CAP + 5; i++) logProblem("warn", "console", `w${i}`, undefined, i);
    const { entries } = usePlayLog.getState();
    assert.equal(entries.length, LOG_CAP);
    assert.equal(entries[0]!.message, "w5");
  });

  it("writes a text report with place, count, and stack", () => {
    logProblem("error", "promise", "lost", "Error: lost\n  at g()", 0);
    logProblem("error", "promise", "lost", "Error: lost\n  at g()", 1);
    const text = playLogText(usePlayLog.getState().entries);
    assert.match(text, /\[ERROR promise ×2\]/);
    assert.match(text, /at combat · sector 2/);
    assert.match(text, /at g\(\)/);
  });
});
