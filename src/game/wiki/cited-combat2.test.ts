import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMBAT2 } from "./cited-combat2.ts";

describe("Combat Drone Mark II shot", () => {
  it("keeps power 4, damage 1, and a 10% fire chance", () => {
    assert.equal(COMBAT2.power, 4);
    assert.equal(COMBAT2.damage, 1);
    assert.equal(COMBAT2.fireChance, 0.1);
    assert.equal(COMBAT2.cooldown, null);
  });
});
