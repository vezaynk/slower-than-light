import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INTRUDER } from "./cited-intruder.ts";

describe("Ion Intruder pulse", () => {
  it("records power, ion, and stun", () => {
    assert.equal(INTRUDER.power, 3);
    assert.equal(INTRUDER.ion, 3);
    assert.equal(INTRUDER.stunSeconds, 6);
  });

  it("keeps the pulse a range", () => {
    assert.equal(INTRUDER.pulseMin, 8.2);
    assert.equal(INTRUDER.pulseMax, 10);
    assert.notEqual(INTRUDER.pulseMin, INTRUDER.pulseMax);
    assert.ok(INTRUDER.pulseMax > INTRUDER.pulseMin);
    assert.equal("pulse" in INTRUDER, false);
    assert.equal("cooldown" in INTRUDER, false);
    assert.deepEqual(Object.keys(INTRUDER), [
      "power",
      "ion",
      "stunSeconds",
      "pulseMin",
      "pulseMax",
    ]);
  });
});
