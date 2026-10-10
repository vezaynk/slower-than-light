import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENTS_2 } from "./events-2.ts";
import { wikiTitles } from "./dump/index.ts";

// The slice lists the old author kept in /tmp are gone; the titles are checked against the wiki dump instead.
const titles = EVENTS_2.map((row) => row.title);
const onWiki = new Set(wikiTitles());

describe("EVENTS_2", () => {
  it("names only real wiki articles", () => {
    for (const t of titles) assert.ok(onWiki.has(t), t);
  });

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
