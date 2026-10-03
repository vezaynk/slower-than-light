import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EVENTS_3 } from "./events-3.ts";

const titles = JSON.parse(readFileSync("/tmp/wiki-slices/events-3.json", "utf8")) as string[];

describe("events-3", () => {
  it("lists every JSON title once", () => {
    assert.equal(EVENTS_3.length, titles.length);
    assert.deepEqual(
      EVENTS_3.map((row) => row.title),
      titles,
    );
    assert.equal(new Set(EVENTS_3.map((row) => row.title)).size, titles.length);
  });

  it("keeps facts only for stated mechanics", () => {
    for (const row of EVENTS_3) {
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
