import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { EVENTS_2 } from "./events-2.ts";

const titles = JSON.parse(
  readFileSync("/tmp/wiki-slices/events-2.json", "utf8"),
) as string[];

describe("EVENTS_2", () => {
  it("matches the JSON length and title set exactly once", () => {
    assert.equal(EVENTS_2.length, titles.length);
    assert.deepEqual(
      EVENTS_2.map((row) => row.title),
      titles,
    );
    assert.equal(new Set(EVENTS_2.map((row) => row.title)).size, titles.length);
  });

  it("uses only allowed statuses and fact limits", () => {
    for (const row of EVENTS_2) {
      assert.ok(
        row.status === "mechanic" ||
          row.status === "no-mechanic" ||
          row.status === "blocked",
      );
      assert.ok(row.facts.length <= 3);
      for (const fact of row.facts) {
        assert.equal(typeof fact, "string");
        assert.ok(fact.length < 140);
      }
      if (row.status !== "mechanic") assert.deepEqual(row.facts, []);
    }
  });
});
