import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mediaFile, readCatalog } from "./catalog.ts";

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "reels-"));
}

test("lists a take that has a video and skips an empty folder", () => {
  const root = tempRoot();
  const ready = path.join(root, "flagship", "master-abc1234");
  const empty = path.join(root, "flagship", "no-video");
  fs.mkdirSync(ready, { recursive: true });
  fs.mkdirSync(empty, { recursive: true });
  fs.writeFileSync(path.join(ready, "video.webm"), "webm");
  fs.writeFileSync(path.join(ready, "replay.json"), "[]");
  fs.writeFileSync(
    path.join(ready, "meta.json"),
    JSON.stringify({
      label: "master-abc1234",
      branch: "master",
      sha: "abc1234fff",
      dirty: false,
      ok: true,
      recordedAt: "2026-10-15T18:00:00.000Z",
    }),
  );
  const takes = readCatalog(root);
  assert.equal(takes.length, 1);
  assert.equal(takes[0]?.scenario, "flagship");
  assert.equal(takes[0]?.sha, "abc1234fff");
  assert.equal(takes[0]?.replay, true);
  assert.equal(takes[0]?.video, "/media/flagship/master-abc1234/video.webm");
});

test("sorts newer takes first", () => {
  const root = tempRoot();
  for (const [id, recordedAt] of [
    ["older", "2026-10-01T00:00:00.000Z"],
    ["newer", "2026-10-15T00:00:00.000Z"],
  ] as const) {
    const dir = path.join(root, "combat", id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "video.webm"), "webm");
    fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ recordedAt, ok: true }));
  }
  const takes = readCatalog(root);
  assert.deepEqual(takes.map((take) => take.id), ["newer", "older"]);
});

test("media paths stay inside the recordings root", () => {
  const root = "/tmp/reels-root";
  assert.equal(
    mediaFile(root, "/media/flagship/master-abc/video.webm"),
    path.join(root, "flagship", "master-abc", "video.webm"),
  );
  assert.equal(mediaFile(root, "/media/flagship/../../game/video.webm"), null);
  assert.equal(mediaFile(root, "/media/flagship/video.webm"), null);
});
