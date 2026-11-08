import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { warnPack } from "@stl/pack";
import {
  clearPlayLog,
  installPlayLog,
  logResourceFailure,
  setLogReporter,
  usePlayLog,
  type LogEntry,
} from "./play-log.ts";

const target = new EventTarget();
const listeners: {
  type: string;
  capture: boolean;
  listener: EventListenerOrEventListenerObject | null;
}[] = [];
const add = target.addEventListener.bind(target);
target.addEventListener = (type, listener, options) => {
  listeners.push({
    type,
    listener,
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

  it("logs a failed element load that reaches the capturing window listener", () => {
    // A failed <img> in the page fires a non-bubbling `error` on the element; only a capture-phase window listener
    // sees it. This stand-in window is not a DOM tree, so the listener is called with that event's shape directly.
    const row = listeners.find((item) => item.type === "error" && item.capture);
    assert.ok(row && typeof row.listener === "function");
    clearPlayLog();
    reported.length = 0;
    row.listener({
      target: { tagName: "IMG", src: "/img/x.webp" },
      message: "",
      error: null,
    } as unknown as Event);
    assert.deepEqual(
      usePlayLog.getState().entries.map((item) => [item.level, item.source, item.message]),
      [["warn", "resource", "A resource failed to load (<img> /img/x.webp)"]],
    );
    assert.equal(reported.length, 1);
  });

  it("logs a detached image's failure through logResourceFailure", () => {
    clearPlayLog();
    logResourceFailure("img", "blob:sprite");
    assert.equal(
      usePlayLog.getState().entries[0]?.message,
      "A resource failed to load (<img> blob:sprite)",
    );
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
