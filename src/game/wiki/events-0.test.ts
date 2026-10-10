import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENTS_0 } from "./events-0.ts";
import { wikiTitles } from "./dump/index.ts";

// The slice lists the old author kept in /tmp are gone; the titles are checked against the wiki dump instead.
const titles = EVENTS_0.map((row) => row.title);
const onWiki = new Set(wikiTitles());

describe("EVENTS_0", () => {
  it("names only real wiki articles", () => {
    for (const t of titles) assert.ok(onWiki.has(t), t);
  });

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
