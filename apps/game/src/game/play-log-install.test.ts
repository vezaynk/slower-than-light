import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { warnPack } from "@stl/pack";
import {
  clearPlayLog,
  installPlayLog,
  setLogReporter,
  usePlayLog,
  type LogEntry,
} from "./play-log.ts";

const target = new EventTarget();
const listeners: { type: string; capture: boolean }[] = [];
const add = target.addEventListener.bind(target);
target.addEventListener = (type, listener, options) => {
  listeners.push({
    type,
    capture: options === true || (typeof options === "object" && !!options?.capture),
  });
  add(type, listener, options);
};

describe("installPlayLog", () => {
  const reported: LogEntry[] = [];
  before(() => {
    (globalThis as { window?: unknown }).window = target;
    setLogReporter((row) => reported.push(row));
    installPlayLog();
  });

  it("listens for errors in the capture phase, so failed resource loads arrive", () => {
    assert.ok(listeners.some((row) => row.type === "error" && row.capture));
  });

  it("logs a promise rejected with undefined instead of throwing", () => {
    clearPlayLog();
    target.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: undefined }));
    assert.deepEqual(
      usePlayLog.getState().entries.map((row) => [row.source, row.message]),
      [["promise", "undefined"]],
    );
  });

  it("logs a pack warning and hands it to the reporter", () => {
    clearPlayLog();
    reported.length = 0;
    warnPack("play-log-install test warning");
    assert.deepEqual(
      reported.map((row) => [row.level, row.source, row.message]),
      [["warn", "pack", "play-log-install test warning"]],
    );
  });
});
