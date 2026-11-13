import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rockExtinguishScale } from "./cited-rock-fire.ts";

describe("rock extinguish scale", () => {
  it("returns 1.67", () => {
    assert.equal(rockExtinguishScale(), 1.67);
  });
});
