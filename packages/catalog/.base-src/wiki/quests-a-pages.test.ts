import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXTRA_EVENTS } from "./quests-a-pages.ts";

describe("quests-a pages", () => {
  it("numbers each choice c:slug:index", () => {
    for (const ev of EXTRA_EVENTS)
      ev.choices.forEach((c, i) => assert.equal(c.id, `c:${ev.slug}:${i}`));
  });
});
