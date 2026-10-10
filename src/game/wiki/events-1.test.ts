import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENTS_1 } from "./events-1.ts";
import { wikiTitles } from "./dump/index.ts";

// The slice lists the old author kept in /tmp are gone; the titles are checked against the wiki dump instead.
const titles = EVENTS_1.map((row) => row.title);
const onWiki = new Set(wikiTitles());

describe("EVENTS_1", () => {
  it("names only real wiki articles", () => {
    for (const t of titles) assert.ok(onWiki.has(t), t);
  });

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
