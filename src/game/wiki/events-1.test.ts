import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EVENTS_1 } from "./events-1.ts";

const titles = JSON.parse(readFileSync("/tmp/wiki-slices/events-1.json", "utf8")) as string[];

describe("EVENTS_1", () => {
  it("lists each slice title once", () => {
    assert.equal(EVENTS_1.length, titles.length);
    assert.deepEqual(
      EVENTS_1.map((row) => row.title),
      titles,
    );
    assert.equal(new Set(EVENTS_1.map((row) => row.title)).size, titles.length);
  });

  it("keeps facts only for stated mechanics", () => {
    for (const row of EVENTS_1) {
      assert.ok(row.facts.length <= 3);
      for (const fact of row.facts) {
        assert.ok(fact.length > 0);
        assert.ok(fact.length < 140);
      }
      if (row.status === "mechanic") {
        assert.ok(row.facts.length > 0);
      } else {
        assert.ok(row.status === "no-mechanic" || row.status === "blocked");
        assert.deepEqual(row.facts, []);
      }
    }
  });
});
