import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KIN_GAPS } from "./kin-gaps.ts";

const SOURCE = /^Wiki page "[^"]+", section "[^"]+"$/;

describe("KIN_GAPS", () => {
  it("has unique ids, non-empty fields, and wiki sources", () => {
    const ids = new Set<string>();
    assert.ok(KIN_GAPS.length > 0);
    for (const gap of KIN_GAPS) {
      assert.equal(ids.has(gap.id), false, gap.id);
      ids.add(gap.id);
      assert.ok(gap.id.trim().length > 0);
      assert.ok(gap.kin.trim().length > 0);
      assert.ok(gap.ability.trim().length > 0);
      assert.ok(gap.value.trim().length > 0);
      assert.match(gap.source, SOURCE);
    }
  });
});
