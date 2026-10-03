import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STORE_RULES } from "./stores.ts";

describe("store rules", () => {
  it("lists at least one rule", () => {
    assert.ok(STORE_RULES.length >= 1);
  });

  it("uses unique ids", () => {
    const ids = STORE_RULES.map((rule) => rule.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("shows every non-null value as a digit in the text", () => {
    for (const rule of STORE_RULES) {
      assert.equal(rule.text.endsWith("."), true, rule.id);
      assert.equal(rule.text.slice(0, -1).includes("."), false, rule.id);
      if (rule.value === null) {
        assert.equal(rule.value, null);
        continue;
      }
      assert.match(rule.text, new RegExp(`(?<!\\d)${rule.value}(?!\\d)`), rule.id);
    }
  });
});
