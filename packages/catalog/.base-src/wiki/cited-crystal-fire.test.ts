import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crystalExtinguishScale } from "./cited-crystal-fire.ts";

describe("crystal extinguish scale", () => {
  it("returns 0.83", () => {
    assert.equal(crystalExtinguishScale(), 0.83);
  });
});
