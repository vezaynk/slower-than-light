import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EVENTS_0 } from "./events-0.ts";

const titles = JSON.parse(readFileSync("/tmp/wiki-slices/events-0.json", "utf8")) as string[];

describe("EVENTS_0", () => {
  it("lists each slice title once", () => {
    assert.equal(EVENTS_0.length, titles.length);
    assert.deepEqual(
      new Set(EVENTS_0.map((row) => row.title)),
      new Set(titles),
    );
    assert.equal(new Set(EVENTS_0.map((row) => row.title)).size, titles.length);
  });

  it("keeps facts only for stated mechanics", () => {
    for (const row of EVENTS_0) {
      if (row.status === "mechanic") {
        for (const fact of row.facts) assert.ok(fact.length > 0);
      } else {
        assert.ok(row.status === "no-mechanic" || row.status === "blocked");
        assert.deepEqual(row.facts, []);
      }
    }
  });
});
